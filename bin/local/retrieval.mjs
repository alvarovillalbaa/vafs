import { realpath } from "node:fs/promises";
import { homedir } from "node:os";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { readLocalCorpus } from "./corpus.mjs";
import { LocalError } from "./errors.mjs";
import { runLocalCommand } from "./process.mjs";

const DEADLINE_MS = 30_000;
const MAX_MATCHES = 8;
const MAX_EXCERPT = 240;
const compare = (left, right) => left < right ? -1 : left > right ? 1 : 0;
const fail = code => { throw new LocalError(code); };
const utf8 = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });

function queryInput(value) {
  if (typeof value !== "string" || !value.trim() || value.includes("\0")
    || Buffer.byteLength(value, "utf8") > 1024 || Buffer.from(value, "utf8").toString("utf8") !== value) fail("local_query_invalid");
  const query = value.trim(), supplied = query.split(/\s+/u);
  if (supplied.length > 32) fail("local_query_invalid");
  return { query, terms: [...new Set(supplied)] };
}

function collectionInput(value, query) {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !value || value.trim() !== value || value.startsWith("-")
    || /[\u0000-\u001f\u007f]/u.test(value) || Buffer.byteLength(value) > 1024
    || Buffer.from(value, "utf8").toString("utf8") !== value) fail("local_qmd_collection_invalid");
  // QMD's positional query parser is not given a flag-like leading argument.
  if (query.startsWith("-")) fail("local_query_invalid");
  return value;
}

function fieldHits(value, terms) {
  if (typeof value !== "string") return 0;
  const field = value.toLowerCase();
  return [...new Set(terms.map(term => term.toLowerCase()))].reduce((hits, term) => hits + Number(field.includes(term)), 0);
}

function metadataRank(documents, terms) {
  return documents.map(document => ({ document, value:
    fieldHits(document.title, terms) * 6 + fieldHits(document.path, terms) * 4
    + fieldHits(document.description, terms) * 3 + fieldHits(document.date, terms) * 2
    + fieldHits(document.folder?.title, terms) * 2 + fieldHits(document.folder?.description, terms)
    + fieldHits(document.folder?.date, terms) + fieldHits(document.folder?.path, terms)
  })).filter(row => row.value > 0)
    .sort((left, right) => right.value - left.value || compare(left.document.path, right.document.path))
    .map(row => row.document.path);
}

function lineStarts(buffer) {
  const starts = [0];
  for (let index = 0; index < buffer.length; index++) if (buffer[index] === 10) starts.push(index + 1);
  return starts;
}

function excerpt(line, start, end) {
  const before = Array.from(utf8.decode(line.subarray(0, start))).length;
  const matched = Array.from(utf8.decode(line.subarray(start, end))).length;
  const points = Array.from(utf8.decode(line).replace(/[\r\n]+$/, ""));
  const from = Math.max(0, before - Math.floor((MAX_EXCERPT - Math.min(matched, MAX_EXCERPT)) / 2));
  return points.slice(from, from + MAX_EXCERPT).join("");
}

function rgMatches(output, document) {
  const buffer = Buffer.from(document.content, "utf8"), starts = lineStarts(buffer), matches = [], seen = new Set();
  try {
    if (buffer.length !== document.bytes) fail("local_rg_invalid_output");
    for (const line of utf8.decode(output).split("\n")) {
      if (!line.trim()) continue;
      const message = JSON.parse(line);
      if (!message || typeof message !== "object" || Array.isArray(message)) fail("local_rg_invalid_output");
      if (["begin", "end", "summary"].includes(message.type)) continue;
      if (message.type !== "match") fail("local_rg_invalid_output");
      const data = message.data;
      if (!data || !Number.isSafeInteger(data.line_number) || data.line_number < 1 || data.line_number > starts.length
        || !Number.isSafeInteger(data.absolute_offset) || starts[data.line_number - 1] !== data.absolute_offset
        || typeof data.lines?.text !== "string" || !Array.isArray(data.submatches)) fail("local_rg_invalid_output");
      const from = data.absolute_offset, to = starts[data.line_number] ?? buffer.length;
      const contentLine = buffer.subarray(from, to);
      if (!Buffer.from(data.lines.text, "utf8").equals(contentLine)) fail("local_rg_invalid_output");
      for (const found of data.submatches) {
        if (!found || !Number.isSafeInteger(found.start) || !Number.isSafeInteger(found.end)
          || found.start < 0 || found.end <= found.start || found.end > contentLine.length
          || typeof found.match?.text !== "string") fail("local_rg_invalid_output");
        const matched = utf8.decode(contentLine.subarray(found.start, found.end));
        if (matched !== found.match.text) fail("local_rg_invalid_output");
        const byteStart = from + found.start, byteEnd = from + found.end, key = `${byteStart}:${byteEnd}`;
        if (!seen.has(key)) {
          seen.add(key);
          if (matches.length < MAX_MATCHES) matches.push({
            line: data.line_number, byteStart, byteEnd, text: matched,
            excerpt: excerpt(contentLine, found.start, found.end)
          });
        }
      }
    }
  } catch { fail("local_rg_invalid_output"); }
  return matches.sort((left, right) => left.byteStart - right.byteStart || left.byteEnd - right.byteEnd);
}

function processFailure(error, leg) {
  if (error?.code === "local_process_missing") fail(leg === "qmd" ? "local_qmd_unavailable" : "local_rg_unavailable");
  if (error?.code === "local_process_failed") fail(leg === "qmd" ? "local_qmd_failed" : "local_rg_failed");
  throw error;
}

async function grepDocuments(documents, terms, context) {
  const results = new Map();
  let cursor = 0, failure;
  const workers = Array.from({ length: Math.min(8, documents.length) }, async () => {
    while (cursor < documents.length && !context.signal.aborted) {
      const document = documents[cursor++];
      try {
        const { stdout } = await runLocalCommand("rg", [
          "--json", "--no-config", "--encoding", "none", "--text", "--line-number", "--fixed-strings", "--ignore-case",
          "--max-count", String(MAX_MATCHES), ...terms.flatMap(term => ["-e", term]), "--", "-"
        ], {
          cwd: context.root, input: Buffer.from(document.content, "utf8"), signal: context.signal,
          timeoutMs: context.remaining(), maxOutputBytes: 2 * 1024 * 1024, allowExitCodes: [0, 1]
        }).catch(error => processFailure(error, "rg"));
        results.set(document.path, rgMatches(stdout, document));
      } catch (error) {
        if (!failure) { failure = error; context.stop(); }
        return;
      }
    }
  });
  await Promise.allSettled(workers);
  if (failure) throw failure;
  context.check();
  return results;
}

function relativeCandidate(root, candidate) {
  const path = relative(root, candidate);
  return path && !isAbsolute(path) && path !== ".." && !path.startsWith(`..${sep}`) ? path.split(sep).join("/") : null;
}

async function qmdRank(collection, query, limit, corpus, context, skipped) {
  if (collection === undefined) return [];
  let qmdCwd;
  try { qmdCwd = await realpath(homedir()); }
  catch { fail("local_qmd_failed"); }
  const { stdout } = await runLocalCommand("qmd", [
    "search", query, "-c", collection, "--json", "-n", String(Math.max(20, limit)), "--full-path"
  ], {
    cwd: qmdCwd, signal: context.signal, timeoutMs: context.remaining(), maxOutputBytes: 2 * 1024 * 1024
  }).catch(error => processFailure(error, "qmd"));
  let rows;
  try { rows = JSON.parse(utf8.decode(stdout)); }
  catch { fail("local_qmd_invalid_output"); }
  if (!Array.isArray(rows) || rows.length > 100) fail("local_qmd_invalid_output");
  const inventory = new Map(corpus.documents.map(document => [resolve(corpus.root, ...document.path.split("/")), document.path]));
  const results = [], seen = new Set();
  for (const row of rows) {
    context.check();
    if (!row || typeof row !== "object" || Array.isArray(row) || typeof row.file !== "string") fail("local_qmd_invalid_output");
    // QMD 86d2365 src/cli/qmd.ts renderFullPath emits './' beneath its cwd.
    if ((!isAbsolute(row.file) && !row.file.startsWith("./")) || row.file.includes("\0")) {
      skipped.push({ path: "", reason: "local_path_invalid" });
      continue;
    }
    const candidate = resolve(qmdCwd, row.file), path = relativeCandidate(corpus.root, candidate);
    if (path === null) { skipped.push({ path: "", reason: "local_path_outside_root" }); continue; }
    let actual;
    try { actual = await realpath(candidate); }
    catch { skipped.push({ path, reason: "local_file_unavailable" }); continue; }
    // The selected inventory, not QMD's cached title/snippet/score, owns returned content and provenance.
    if (actual !== candidate || !inventory.has(actual)) {
      skipped.push({ path, reason: relativeCandidate(corpus.root, actual) === null ? "local_path_outside_root" : "local_path_invalid" });
      continue;
    }
    const selected = inventory.get(actual);
    if (!seen.has(selected)) { seen.add(selected); results.push(selected); }
  }
  return results;
}

function fuse(documents, legs, matches, limit) {
  const ranked = new Map(), byPath = new Map(documents.map(document => [document.path, document]));
  for (const [mode, paths] of legs) paths.forEach((path, index) => {
    const row = ranked.get(path) ?? { value: 0, modes: new Set() };
    row.value += 1 / (60 + index + 1);
    row.modes.add(mode);
    ranked.set(path, row);
  });
  return [...ranked].map(([path, row]) => ({ path, row, score: Number(row.value.toFixed(12)) }))
    .sort((left, right) => right.score - left.score || compare(left.path, right.path)).slice(0, limit)
    .map(({ path, row, score }) => {
      const document = byPath.get(path);
      return {
        path, title: document.title, description: document.description, date: document.date, dateSource: document.dateSource,
        modifiedAt: document.modifiedAt, section: document.section, contentHash: document.contentHash,
        bytes: document.bytes, score, modes: ["metadata", "grep", "qmd"].filter(mode => row.modes.has(mode)),
        matches: matches.get(path) ?? [], folder: document.folder === null ? null : { ...document.folder }
      };
    });
}

/** Literal local-file bridge only. QMD contributes stale-index candidates, never authoritative file text. */
export async function searchLocal({ root, query: suppliedQuery, includeRaw = false, limit = 20, qmdCollection, signal } = {}) {
  const { query, terms } = queryInput(suppliedQuery), collection = collectionInput(qmdCollection, query);
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) fail("local_limit_invalid");
  if (typeof includeRaw !== "boolean") fail("local_query_invalid");
  const controller = new AbortController(), started = performance.now();
  let expired = false, combined;
  try { combined = signal === undefined ? controller.signal : AbortSignal.any([signal, controller.signal]); }
  catch { fail("local_query_invalid"); }
  const timer = setTimeout(() => { expired = true; controller.abort(); }, DEADLINE_MS);
  const check = () => {
    if (signal?.aborted) fail("local_request_cancelled");
    if (expired || performance.now() - started >= DEADLINE_MS) fail("local_process_timeout");
    if (combined.aborted) fail("local_request_cancelled");
  };
  try {
    check();
    const corpus = await readLocalCorpus(root, { includeRaw, signal: combined });
    check();
    const indexedAt = new Date().toISOString(), skipped = corpus.skipped.map(row => ({ ...row }));
    const context = {
      root: corpus.root, signal: combined, check, stop: () => controller.abort(),
      remaining: () => { check(); return Math.max(1, Math.ceil(DEADLINE_MS - (performance.now() - started))); }
    };
    const matches = await grepDocuments(corpus.documents, terms, context);
    const grep = [...matches].filter(([, found]) => found.length).sort((left, right) => right[1].length - left[1].length || compare(left[0], right[0])).map(([path]) => path);
    const qmd = await qmdRank(collection, query, limit, corpus, context, skipped);
    const data = fuse(corpus.documents, [["metadata", metadataRank(corpus.documents, terms)], ["grep", grep], ["qmd", qmd]], matches, limit);
    check();
    return {
      schemaVersion: "vafs-local-search-v1", query, source: { kind: "local_checkout", rootId: corpus.rootId },
      data,
      meta: {
        documents: corpus.documents.length, bytes: corpus.documents.reduce((total, document) => total + document.bytes, 0), indexedAt,
        legs: { metadata: { status: "ok" }, rg: { status: "ok" }, qmd: collection === undefined ? { status: "disabled" } : { status: "ok", collection } }
      },
      skipped: skipped.sort((left, right) => compare(left.path, right.path) || compare(left.reason, right.reason))
    };
  } catch (error) {
    if (signal?.aborted) fail("local_request_cancelled");
    if (expired || performance.now() - started >= DEADLINE_MS) fail("local_process_timeout");
    if (error instanceof LocalError) throw error;
    fail("local_failed");
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
}
