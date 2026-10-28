import { realpath } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { readLocalCorpus, readLocalDocument } from "./local/corpus.mjs";
import { searchLocal } from "./local/retrieval.mjs";
import { LocalError } from "./local/errors.mjs";
import { writeLocalIndex } from "./local/output.mjs";

const DEFAULT_API_URL = "http://127.0.0.1:3000";
const MAX_RESPONSE_BYTES = 4 * 1024 * 1024;
const VALUE_FLAGS = new Set(["--root", "--output", "--limit", "--qmd-collection", "--workspace"]);
const BOOLEAN_FLAGS = new Set(["--include-raw", "--help"]);
const HELP = {
  commands: [
    "local index --root DIR [--include-raw] [--output FILE]",
    "local search QUERY --root DIR [--include-raw] [--limit 1..100] [--qmd-collection NAME]",
    "local get RELATIVEPATH --root DIR [--include-raw]",
    "health", "workspaces", "search QUERY [--workspace ID]", "get WORKSPACE PATH",
    "raw upload WORKSPACE FILENAME CONTENT", "sync WORKSPACE", "cleanup WORKSPACE [OBJECTIVE]"
  ],
  local: "An explicit checkout root is required. Local commands do not use the remote API or its token. Index exports must be outside the checkout.",
  remoteEnvironment: ["VAFS_API_URL", "VAFS_TOKEN"],
  notes: ["Output is JSON. Use -- before positional text that begins with a dash."]
};

class CliError extends Error {
  constructor(code, status) {
    super(code);
    this.code = code;
    this.status = status;
  }
}

/** Importing this module does not run a command or modify process state. */
export async function runCli(args, context) {
  let local = false;
  try {
    const parsed = parse(args);
    const [command, subcommand] = parsed.words;
    const output = value => context.stdout(`${JSON.stringify(value, null, 2)}\n`);
    if (!parsed.words.length || command === "help" || parsed.flags.has("--help")) {
      if (parsed.flags.size && [...parsed.flags.keys()].some(flag => flag !== "--help")) throw new CliError("cli_unsupported_flag");
      if (command && command !== "help" && !["local", "health", "workspaces", "search", "get", "raw", "sync", "cleanup"].includes(command)) throw new CliError("cli_unknown_command");
      if ((command === "local" && subcommand && !["index", "search", "get"].includes(subcommand))
        || (command === "raw" && subcommand && subcommand !== "upload")) throw new CliError("cli_unknown_command");
      if (["help", "health", "workspaces"].includes(command) && parsed.words.length > 1) throw new CliError("cli_unexpected_argument");
      output(HELP);
      return 0;
    }
    if (command === "local") {
      local = true;
      const allowed = subcommand === "index" ? ["--root", "--include-raw", "--output"]
        : subcommand === "search" ? ["--root", "--include-raw", "--limit", "--qmd-collection"]
          : subcommand === "get" ? ["--root", "--include-raw"] : null;
      if (!allowed) throw new CliError("cli_unknown_command");
      permitted(parsed.flags, allowed);
      const root = parsed.flags.get("--root");
      if (!root) throw new LocalError("local_root_required");
      const includeRaw = parsed.flags.has("--include-raw");
      const words = parsed.words.slice(2);
      if (subcommand === "index") {
        if (words.length) throw new CliError("cli_unexpected_argument");
        const corpus = await readLocalCorpus(root, { includeRaw });
        const documents = corpus.documents.map(({ path, title, description, date, dateSource, modifiedAt, contentHash, bytes, section, folder }) =>
          ({ path, title, description, date, dateSource, modifiedAt, contentHash, bytes, section, folder }));
        const index = {
          schemaVersion: "vafs-local-index-v1", source: { kind: "local_checkout", rootId: corpus.rootId }, documents,
          meta: { documents: documents.length, bytes: documents.reduce((sum, document) => sum + document.bytes, 0) },
          skipped: corpus.skipped
        };
        if (parsed.flags.has("--output")) await writeLocalIndex(await outsideOutput(corpus.root, parsed.flags.get("--output")), index);
        output(index);
      } else if (subcommand === "get") {
        if (words.length !== 1 || !words[0]) throw new CliError("cli_path_required");
        output({ schemaVersion: "vafs-local-page-v1", data: await readLocalDocument(root, words[0], { includeRaw }) });
      } else {
        const query = queryFrom(words);
        const limitValue = parsed.flags.get("--limit");
        if (limitValue !== undefined && !/^(?:[1-9]|[1-9][0-9]|100)$/.test(limitValue)) throw new LocalError("local_limit_invalid");
        output(await searchLocal({ root, query, includeRaw, limit: limitValue === undefined ? 20 : Number(limitValue),
          ...(parsed.flags.has("--qmd-collection") ? { qmdCollection: parsed.flags.get("--qmd-collection") } : {}) }));
      }
      return 0;
    }

    // Remote settings are intentionally accessed only after the complete local branch.
    const operation = remoteOperation(parsed);
    const env = context.env ?? process.env;
    const endpoint = remoteEndpoint(env.VAFS_API_URL ?? DEFAULT_API_URL);
    output(await remoteRequest(endpoint, env.VAFS_TOKEN, operation));
    return 0;
  } catch (error) {
    const failure = error instanceof LocalError ? { error: error.code }
      : error instanceof CliError ? { error: error.code, ...(error.status === undefined ? {} : { status: error.status }) }
        : { error: local ? "local_failed" : "cli_failed" };
    context.stderr(`${JSON.stringify(failure, null, 2)}\n`);
    return 1;
  }
}

function parse(args) {
  if (!Array.isArray(args) || args.some(value => typeof value !== "string")) throw new CliError("cli_arguments_invalid");
  const words = [], flags = new Map();
  let positional = false;
  for (let index = 0; index < args.length; index++) {
    const token = args[index];
    if (!positional && token === "--") { positional = true; continue; }
    if (positional || !token.startsWith("-")) { words.push(token); continue; }
    const flag = token === "-h" ? "--help" : token;
    if (!VALUE_FLAGS.has(flag) && !BOOLEAN_FLAGS.has(flag)) throw new CliError("cli_unknown_flag");
    if (flags.has(flag)) throw new CliError("cli_duplicate_flag");
    if (BOOLEAN_FLAGS.has(flag)) { flags.set(flag, true); continue; }
    const value = args[++index];
    if (!value || value.startsWith("--") || value === "-h") throw new CliError("cli_flag_value_required");
    flags.set(flag, value);
  }
  return { words, flags };
}

function permitted(flags, allowed) {
  if ([...flags.keys()].some(flag => !allowed.includes(flag))) throw new CliError("cli_unsupported_flag");
}
function queryFrom(words) {
  const query = words.join(" ");
  if (!query.trim()) throw new CliError("cli_query_required");
  return query;
}

async function outsideOutput(root, output) {
  let target;
  try {
    const requested = resolve(output);
    target = join(await realpath(dirname(requested)), basename(requested));
  } catch { throw new LocalError("local_index_write_failed"); }
  const offset = relative(root, target);
  if (!offset || (!isAbsolute(offset) && offset !== ".." && !offset.startsWith(`..${sep}`))) throw new LocalError("local_index_location_invalid");
  return target;
}

function remoteOperation({ words, flags }) {
  const [command, subcommand] = words;
  permitted(flags, command === "search" ? ["--workspace"] : []);
  if (command === "health" || command === "workspaces") {
    if (words.length !== 1) throw new CliError("cli_unexpected_argument");
    return { path: `/api/v1/${command}`, method: "GET" };
  }
  if (command === "search") {
    const params = new URLSearchParams({ q: queryFrom(words.slice(1)) });
    if (flags.has("--workspace")) params.set("workspaceId", flags.get("--workspace"));
    return { path: `/api/v1/search?${params}`, method: "GET" };
  }
  if (command === "get") {
    if (words.length < 3 || !subcommand || !words.slice(2).join(" ")) throw new CliError("cli_path_required");
    return { path: `/api/v1/files?${new URLSearchParams({ workspaceId: subcommand, path: words.slice(2).join(" ") })}`, method: "GET" };
  }
  if (command === "raw" && subcommand === "upload") {
    if (words.length < 5 || !words[2] || !words[3]) throw new CliError("cli_upload_arguments_required");
    return { path: "/api/v1/raw", method: "POST", data: { workspaceId: words[2], filename: words[3], content: words.slice(4).join(" ") } };
  }
  if (command === "sync") {
    if (words.length !== 2 || !subcommand) throw new CliError("cli_workspace_required");
    return { path: "/api/v1/sync", method: "POST", data: { workspaceId: subcommand } };
  }
  if (command === "cleanup") {
    if (!subcommand) throw new CliError("cli_workspace_required");
    return { path: "/api/v1/cleanup-runs", method: "POST", data: { workspaceId: subcommand, ...(words.slice(2).join(" ") ? { objective: words.slice(2).join(" ") } : {}) } };
  }
  throw new CliError("cli_unknown_command");
}

function remoteEndpoint(value) {
  try {
    if (typeof value !== "string" || value.length > 4096 || !/^https?:\/\//i.test(value) || /[\\\u0000-\u0020\u007f]/.test(value)) throw new Error();
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol) || !url.hostname || url.username || url.password
      || url.href.includes("?") || url.href.includes("#") || /^https?:\/\/[^/]*@/i.test(value)) throw new Error();
    return url.href.replace(/\/+$/, "");
  } catch { throw new CliError("cli_remote_endpoint_invalid"); }
}

async function remoteRequest(endpoint, token, operation) {
  const signal = AbortSignal.timeout(30_000);
  try {
    const body = operation.data === undefined ? undefined : JSON.stringify(operation.data);
    const response = await fetch(`${endpoint}${operation.path}`, { method: operation.method, body, redirect: "error", signal,
      headers: { accept: "application/json", ...(body === undefined ? {} : { "content-type": "application/json" }), ...(token ? { authorization: `Bearer ${token}` } : {}) } });
    if (!response.ok) {
      await response.body?.cancel().catch(() => undefined);
      throw new CliError("cli_remote_http_error", response.status);
    }
    return await remoteJson(response);
  } catch (error) {
    if (signal.aborted) throw new CliError("cli_remote_timeout");
    if (error instanceof CliError) throw error;
    throw new CliError("cli_remote_unavailable");
  }
}

async function remoteJson(response) {
  const fail = code => { throw new CliError(code); };
  if (response.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase() !== "application/json") {
    await response.body?.cancel().catch(() => undefined);
    fail("cli_remote_json_invalid");
  }
  const declared = response.headers.get("content-length");
  if (declared && /^\d+$/.test(declared) && Number(declared) > MAX_RESPONSE_BYTES) {
    await response.body?.cancel().catch(() => undefined);
    fail("cli_remote_response_limit");
  }
  const reader = response.body?.getReader();
  if (!reader) fail("cli_remote_json_invalid");
  const chunks = []; let size = 0;
  try {
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > MAX_RESPONSE_BYTES) { await reader.cancel().catch(() => undefined); fail("cli_remote_response_limit"); }
      chunks.push(chunk.value);
    }
    const buffer = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { buffer.set(chunk, offset); offset += chunk.byteLength; }
    try { return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(buffer)); }
    catch { return fail("cli_remote_json_invalid"); }
  } finally { reader.releaseLock(); }
}
