import test, { beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { constants } from "node:fs";
import { access, chmod, mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { homedir, tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { setTimeout as pause } from "node:timers/promises";
import { searchLocal } from "../../bin/local/retrieval.mjs";

// Authored T2 checks, not executed. Real rg is required; fake QMD scripts prove only this adapter protocol.
let fixture;
const hash = value => createHash("sha256").update(value).digest("hex");
const rejectsCode = (promise, code) => assert.rejects(promise, error => error?.code === code);

async function executable(name) {
  for (const directory of (process.env.PATH ?? "").split(delimiter)) {
    if (!directory) continue;
    const candidate = join(directory, name);
    try { await access(candidate, constants.X_OK); return await realpath(candidate); } catch { /* Try the next explicit PATH entry. */ }
  }
  throw new Error(`authored_check_requires_${name}`);
}

beforeEach(async () => {
  const rg = await executable("rg"), directory = await realpath(await mkdtemp(join(tmpdir(), "vafs-retrieval-")));
  const root = join(directory, "afs"), bin = join(directory, "bin");
  await mkdir(root); await mkdir(bin);
  await symlink(process.execPath, join(bin, "node"));
  await symlink(rg, join(bin, "rg"));
  fixture = { directory, root, bin, rg, path: process.env.PATH };
  process.env.PATH = bin;
});

afterEach(async () => {
  if (!fixture) return;
  if (fixture.path === undefined) delete process.env.PATH; else process.env.PATH = fixture.path;
  await rm(fixture.directory, { recursive: true, force: true });
  fixture = undefined;
});

async function document(path, content) {
  const target = join(fixture.root, ...path.split("/"));
  await mkdir(join(target, ".."), { recursive: true });
  await writeFile(target, content);
  return target;
}

async function script(name, source) {
  const target = join(fixture.bin, name);
  await rm(target, { force: true });
  await writeFile(target, `#!/usr/bin/env node\n${source}\n`, { mode: 0o755 });
  await chmod(target, 0o755);
}

async function qmdRows(rows, captured) {
  await script("qmd", `${captured ? `require('node:fs').writeFileSync(${JSON.stringify(captured)}, JSON.stringify({args:process.argv.slice(2),cwd:process.cwd(),privateKey:process.env.OPENAI_API_KEY,trust:process.env.QMD_TRUST_LOCAL_CONFIG}));` : ""}
process.stdout.write(${JSON.stringify(JSON.stringify(rows))});`);
}

test("real rg matches bind original UTF-8 BOM and CRLF bytes with current content hashes", async () => {
  const content = "\uFEFF# Notes\r\nCafé 🌊 needle İ.\r\n", bytes = Buffer.from(content);
  await document("knowledge/notes.md", content);
  const result = await searchLocal({ root: fixture.root, query: "needle" });
  assert.equal(result.schemaVersion, "vafs-local-search-v1");
  assert.deepEqual(result.source, { kind: "local_checkout", rootId: hash(fixture.root) });
  assert.equal(result.data.length, 1);
  const found = result.data[0];
  assert.equal(found.contentHash, hash(bytes)); assert.equal(found.bytes, bytes.length);
  assert.equal(found.dateSource, "filesystem"); assert.equal(found.folder, null);
  assert.deepEqual(found.matches.map(({ line, byteStart, byteEnd, text }) => ({ line, byteStart, byteEnd, text })), [
    { line: 2, byteStart: bytes.indexOf("needle"), byteEnd: bytes.indexOf("needle") + 6, text: "needle" }
  ]);
  assert.equal(found.matches[0].excerpt, "Café 🌊 needle İ.");
  assert.equal(JSON.stringify(result).includes(fixture.root), false);
  assert.equal(result.meta.documents, 1); assert.equal(result.meta.bytes, bytes.length);
  assert.match(result.meta.indexedAt, /^\d{4}-\d{2}-\d{2}T/);
  const unicode = await searchLocal({ root: fixture.root, query: "İ" });
  assert.equal(unicode.data[0].matches[0].text, "İ", "rg receives the original Unicode literal, not JavaScript full lowercase");
});

test("folder titles descriptions and explicit dates contribute metadata without fabricated grep matches", async () => {
  await document("knowledge/README.md", "---\ntitle: Orion programme\ndescription: Orbital handoff\ndate: 2026-10-20\n---\n# Directory\n");
  await document("knowledge/sub/page.md", "# Ordinary page\nUnrelated body.\n");
  const result = await searchLocal({ root: fixture.root, query: "Orion" });
  const nested = result.data.find(row => row.path === "knowledge/sub/page.md");
  assert.ok(nested);
  assert.deepEqual(nested.modes, ["metadata"]); assert.deepEqual(nested.matches, []);
  assert.deepEqual(nested.folder, { path: "knowledge", title: "Orion programme", description: "Orbital handoff", date: "2026-10-20" });
  const dated = await searchLocal({ root: fixture.root, query: "2026-10-20" });
  assert.ok(dated.data.some(row => row.path === "knowledge/sub/page.md"));
});

test("raw documents are excluded by default and included only by explicit selection", async () => {
  await document("knowledge/public.md", "# Public\nneedle\n");
  await document("raw/private.md", "# Raw\nneedle\n");
  const normal = await searchLocal({ root: fixture.root, query: "needle" });
  assert.deepEqual(normal.data.map(row => row.path), ["knowledge/public.md"]);
  const expanded = await searchLocal({ root: fixture.root, query: "needle", includeRaw: true });
  assert.deepEqual(expanded.data.map(row => row.path).sort(), ["knowledge/public.md", "raw/private.md"]);
  assert.equal(expanded.meta.documents, 2);
});

test("literal metacharacters leading dashes and shell-looking text remain literal rg terms", async () => {
  await document("knowledge/literal.md", "# Literal\n[x] -needle $(touch PWNED)\n");
  await document("knowledge/other.md", "# Other\nxxxxxxxx\n");
  for (const query of ["[x]", "-needle", "$(touch PWNED)"]) {
    const result = await searchLocal({ root: fixture.root, query });
    assert.deepEqual(result.data.map(row => row.path), ["knowledge/literal.md"]);
    assert.ok(result.data[0].modes.includes("grep"));
  }
  await assert.rejects(access(join(fixture.root, "PWNED")));
});

test("RRF60 combines opposite leg ranks and resolves equal scores by stable relative path", async () => {
  await document("knowledge/b.md", "# Different\nneedle needle needle\n");
  await document("knowledge/a.md", "# needle\nOther prose.\nneedle\n");
  const first = await searchLocal({ root: fixture.root, query: "needle" });
  const again = await searchLocal({ root: fixture.root, query: "needle" });
  assert.deepEqual(first.data.map(row => row.path), ["knowledge/a.md", "knowledge/b.md"]);
  assert.equal(first.data[0].score, Number((1 / 61 + 1 / 62).toFixed(12)));
  assert.equal(first.data[0].score, first.data[1].score);
  assert.deepEqual(first.data, again.data);
  assert.deepEqual((await searchLocal({ root: fixture.root, query: "needle", limit: 1 })).data, first.data.slice(0, 1));
});

test("query UTF-8 term and result limits fail before corpus or subprocess access", async () => {
  for (const query of ["", " \t\n", "x\0y", "\ud800", "é".repeat(513), Array.from({ length: 33 }, (_, index) => `term${index}`).join(" ")]) {
    await rejectsCode(searchLocal({ root: "/missing-owned-fixture", query }), "local_query_invalid");
  }
  for (const limit of [0, 101, 1.5, NaN, "20", null]) await rejectsCode(searchLocal({ root: fixture.root, query: "needle", limit }), "local_limit_invalid");
  await document("knowledge/a.md", "# Page\nneedle\n");
  assert.equal((await searchLocal({ root: fixture.root, query: "x".repeat(1024), limit: 100 })).data.length, 0);
});

test("one document returns no more than eight byte-checked matches with bounded excerpts", async () => {
  const content = `# Page\n${("x".repeat(300) + " needle " + "y".repeat(300) + "\n").repeat(20)}`;
  await document("knowledge/a.md", content);
  const result = await searchLocal({ root: fixture.root, query: "needle" });
  const bytes = Buffer.from(content), matches = result.data[0].matches;
  assert.equal(matches.length, 8);
  for (const match of matches) {
    assert.equal(bytes.subarray(match.byteStart, match.byteEnd).toString("utf8"), match.text);
    assert.ok(Array.from(match.excerpt).length <= 240);
    assert.ok(match.excerpt.includes("needle"));
  }
});

test("QMD stays disabled unless a collection is explicitly requested", async () => {
  const touched = join(fixture.directory, "qmd-called");
  await script("qmd", `require('node:fs').writeFileSync(${JSON.stringify(touched)},'called');process.exit(7);`);
  await document("knowledge/a.md", "# Page\nneedle\n");
  const oldHome = process.env.HOME;
  let result;
  try {
    process.env.HOME = join(fixture.directory, "missing-home");
    result = await searchLocal({ root: fixture.root, query: "needle" });
  } finally {
    if (oldHome === undefined) delete process.env.HOME; else process.env.HOME = oldHome;
  }
  assert.deepEqual(result.meta.legs.qmd, { status: "disabled" });
  await assert.rejects(access(touched));
});

test("scripted QMD contributes vetted candidates while stale and cross-root paths are reported", async () => {
  const content = "# Current title\nActual current body.\n", selected = await document("knowledge/a.md", content);
  const hidden = await document("raw/excluded.md", "# Private raw\nPRIVATE_RAW_FIXTURE\n");
  const outside = join(fixture.directory, "outside.md"); await writeFile(outside, "OUTSIDE_FIXTURE");
  await qmdRows([
    { file: "./afs/knowledge/a.md", title: "CACHED_TITLE", snippet: "CACHED_SNIPPET", score: 1000 },
    { file: selected, score: 950 }, { file: "afs/knowledge/a.md", score: 925 },
    { file: "qmd://notes/deleted.md", score: 900 }, { file: outside, score: 800 },
    { file: join(fixture.root, "knowledge/missing.md"), score: 700 }, { file: hidden, score: 600 }
  ]);
  const homeAlias = join(fixture.directory, "home-alias");
  await symlink(fixture.directory, homeAlias, "dir");
  const oldHome = process.env.HOME;
  let result;
  try {
    process.env.HOME = homeAlias;
    result = await searchLocal({ root: fixture.root, query: "quartz", qmdCollection: "notes" });
  } finally {
    if (oldHome === undefined) delete process.env.HOME; else process.env.HOME = oldHome;
  }
  assert.equal(result.data.length, 1); assert.deepEqual(result.data[0].modes, ["qmd"]);
  assert.equal(result.data[0].title, "Current title"); assert.equal(result.data[0].contentHash, hash(content));
  assert.deepEqual(result.data[0].matches, []);
  assert.equal(result.skipped.length, 5);
  assert.equal(result.skipped.filter(row => row.path === "" && row.reason === "local_path_invalid").length, 2);
  assert.ok(result.skipped.some(row => row.reason === "local_path_outside_root"));
  for (const privateValue of ["CACHED_TITLE", "CACHED_SNIPPET", "PRIVATE_RAW_FIXTURE", "OUTSIDE_FIXTURE", outside]) assert.equal(JSON.stringify(result).includes(privateValue), false);
});

test("QMD invocation uses only BM25 search and the operator home with sanitized environment", async () => {
  const selected = await document("knowledge/a.md", "# Page\nCurrent content.\n"), captured = join(fixture.directory, "qmd-args.json");
  await qmdRows([{ file: selected, score: 1 }], captured);
  const oldKey = process.env.OPENAI_API_KEY, oldTrust = process.env.QMD_TRUST_LOCAL_CONFIG;
  process.env.OPENAI_API_KEY = "PRIVATE_PROVIDER_FIXTURE"; process.env.QMD_TRUST_LOCAL_CONFIG = "1";
  try {
    const result = await searchLocal({ root: fixture.root, query: "needle", qmdCollection: "notes", limit: 25 });
    const call = JSON.parse(await readFile(captured, "utf8"));
    assert.deepEqual(call.args, ["search", "needle", "-c", "notes", "--json", "-n", "25", "--full-path"]);
    assert.equal(call.cwd, await realpath(homedir())); assert.notEqual(call.cwd, fixture.root);
    assert.equal(call.privateKey, undefined); assert.equal(call.trust, undefined);
    assert.deepEqual(result.meta.legs.qmd, { status: "ok", collection: "notes" });
  } finally {
    if (oldKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = oldKey;
    if (oldTrust === undefined) delete process.env.QMD_TRUST_LOCAL_CONFIG; else process.env.QMD_TRUST_LOCAL_CONFIG = oldTrust;
  }
});

test("a requested missing QMD binary fails visibly instead of fabricating a ranking leg", async () => {
  await document("knowledge/a.md", "# Page\nneedle\n");
  await rejectsCode(searchLocal({ root: fixture.root, query: "needle", qmdCollection: "notes" }), "local_qmd_unavailable");
  const oldHome = process.env.HOME;
  try {
    process.env.HOME = join(fixture.directory, "missing-home");
    await rejectsCode(searchLocal({ root: fixture.root, query: "needle", qmdCollection: "notes" }), "local_qmd_failed");
  } finally {
    if (oldHome === undefined) delete process.env.HOME; else process.env.HOME = oldHome;
  }
});

test("malformed scripted QMD JSON and result records fail with one controlled protocol error", async () => {
  await document("knowledge/a.md", "# Page\nneedle\n");
  for (const output of ["not-json", "{}", '[{"file":23}]']) {
    await script("qmd", `process.stdout.write(${JSON.stringify(output)});`);
    await rejectsCode(searchLocal({ root: fixture.root, query: "needle", qmdCollection: "notes" }), "local_qmd_invalid_output");
  }
});

test("flag-like queries are refused only for explicit QMD and invalid collections are controlled", async () => {
  await document("knowledge/a.md", "# Page\n-needle\n");
  assert.equal((await searchLocal({ root: fixture.root, query: "-needle" })).data.length, 1);
  await rejectsCode(searchLocal({ root: fixture.root, query: "-needle", qmdCollection: "notes" }), "local_query_invalid");
  for (const collection of ["", " notes", "-notes", "a\0b", 1]) await rejectsCode(searchLocal({ root: fixture.root, query: "needle", qmdCollection: collection }), "local_qmd_collection_invalid");
});

test("pre-cancelled requests stop before reading a missing corpus", async () => {
  const controller = new AbortController(); controller.abort(new Error("PRIVATE_ABORT_FIXTURE"));
  await rejectsCode(searchLocal({ root: "/missing-owned-fixture", query: "needle", signal: controller.signal }), "local_request_cancelled");
});

test("caller cancellation kills the owned scripted QMD child and returns a safe cancellation", async () => {
  await document("knowledge/a.md", "# Page\nneedle\n");
  const started = join(fixture.directory, "qmd-started.json");
  await script("qmd", `require('node:fs').writeFileSync(${JSON.stringify(started)},JSON.stringify({pid:process.pid}));setInterval(()=>{},1000);`);
  const controller = new AbortController(), result = searchLocal({ root: fixture.root, query: "needle", qmdCollection: "notes", signal: controller.signal });
  const rejected = rejectsCode(result, "local_request_cancelled");
  let child;
  try {
    const until = Date.now() + 5000;
    while (!child && Date.now() < until) { try { child = JSON.parse(await readFile(started, "utf8")); } catch { await pause(10); } }
    assert.ok(child, "the authored QMD child starts before cancellation");
    controller.abort(new Error("PRIVATE_ABORT_FIXTURE"));
    await rejected;
    assert.throws(() => process.kill(child.pid, 0), error => error.code === "ESRCH");
  } finally { controller.abort(); await rejected; }
});

test("rg match offsets are checked against the vetted bytes rather than trusted from subprocess JSON", async () => {
  const content = "# Page\nneedle\n"; await document("knowledge/a.md", content);
  const forged = { type: "match", data: { line_number: 2, absolute_offset: 7, lines: { text: "needle\n" }, submatches: [{ start: 0, end: 6, match: { text: "forged" } }] } };
  await script("rg", `const {spawnSync}=require('node:child_process');if(process.argv.includes('--files')){const result=spawnSync(${JSON.stringify(fixture.rg)},process.argv.slice(2),{stdio:'inherit'});process.exit(result.status??2);}process.stdout.write(${JSON.stringify(JSON.stringify(forged) + "\n")});`);
  await rejectsCode(searchLocal({ root: fixture.root, query: "needle" }), "local_rg_invalid_output");
});
