// Q02: one persistent real stdio MCP process backed by admitted QMD keyword search.
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { createInterface } from "node:readline";
import { gzipSync, gunzipSync } from "node:zlib";

const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const need = (value, label) => { if (!value) throw new Error(label); };
const capture = bytes => ({ bytes: bytes.length, sha256: sha(bytes), gzipBase64: gzipSync(bytes).toString("base64"), complete: true });
const root = process.env.VAFS_MCP_QMD_FIXTURE_ROOT, source = process.env.VAFS_MCP_QMD_SOURCE_ROOT;
const query = "vafsmcpquartzharbor20261113";
const page = (title, body) => `---\ntitle: "${title}"\ndescription: "Authored local MCP fixture."\ndate: 2026-11-13\n---\n# ${title}\n\n${body}\n`;
const files = {
  "selected/README.md": "# Authored collection\nNeutral handbook.\n",
  "selected/knowledge/current.md": page("Current sail note", `Mañana 東京 café: ${query} remains current.`),
  "selected/knowledge/stale.md": page("Cached archive note", `Éclair 東京: ${query} was indexed.`),
  "selected/knowledge/removed.md": page("Removed ledger note", `${query} was indexed for deletion.`),
  "selected/raw/private.md": `# Raw\n${query} AUTHORED_RAW_SENTINEL\n`,
  "foreign.md": `# Foreign\n${query} AUTHORED_FOREIGN_SENTINEL\n`,
};
const revised = page("Revised archive note", "Révisé 東京: only fresh authored prose remains.");
const report = { schemaVersion: 1, identity: "Q02", sourceCommit: process.env.SOURCE_COMMIT, passed: false,
  commands: [], wireRequests: [], snapshots: [], errors: [], cleanup: {} };
const children = [];
let server, serverDone, rpcId = 0, streamError, ordinal = 0;
const pending = new Map();
const groupAbsent = pid => { try { process.kill(-pid, 0); return false; } catch (e) { if (e.code === "ESRCH") return true; throw e; } };
const traceFile = path.join(process.env.XDG_CACHE_HOME, "mcp-qmd-originals.jsonl");
const traces = () => fs.readFileSync(traceFile, "utf8").split("\n").filter(Boolean).map(line => JSON.parse(line));
function snapshot(label) {
  const rows = {};
  for (const name of Object.keys(files).sort()) {
    if (fs.existsSync(path.join(root, name))) {
      const bytes = fs.readFileSync(path.join(root, name));
      rows[name] = { bytes: bytes.length, sha256: sha(bytes) };
    }
  }
  report.snapshots.push({ label, files: rows });
}
async function start(label, executable, args) {
  const row = { label, executable, args, startedAt: Date.now() };
  report.commands.push(row);
  const stdout = [], stderr = [];
  const child = spawn(executable, args, { cwd: fs.realpathSync(process.env.HOME), env: process.env, detached: true, stdio: ["pipe", "pipe", "pipe"] });
  children.push(child); row.pid = child.pid;
  let size = 0;
  for (const [channel, chunks] of [[child.stdout, stdout], [child.stderr, stderr]]) channel.on("data", bytes => {
    size += bytes.length;
    if (size > 1024 * 1024) { row.outputLimit = true; process.kill(-child.pid, "SIGKILL"); }
    else chunks.push(bytes);
  });
  const done = new Promise((resolve, reject) => {
    child.once("error", error => { row.spawnError = error.code; reject(error); });
    child.once("close", (code, signal) => {
      row.exitCode = code; row.signal = signal; row.finishedAt = Date.now(); row.closed = true;
      row.stdout = capture(Buffer.concat(stdout)); row.stderr = capture(Buffer.concat(stderr));
      row.groupAbsent = groupAbsent(child.pid);
      resolve(row);
    });
  });
  return { child, done, row };
}
async function command(label, args) {
  const { child, done } = await start(label, "qmd", args);
  child.stdin.end();
  const row = await done;
  need(row.exitCode === 0 && row.signal === null && row.groupAbsent && !row.outputLimit, "native_command_failed");
  return gunzipSync(Buffer.from(row.stdout.gzipBase64, "base64"));
}
function rpc(method, params = {}) {
  need(!streamError, "mcp_wire_error");
  const request = { jsonrpc: "2.0", id: ++rpcId, method, params };
  report.wireRequests.push(request);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { pending.delete(request.id); reject(new Error("mcp_response_timeout")); }, 35000);
    pending.set(request.id, { resolve: value => { clearTimeout(timer); resolve(value); }, reject: error => { clearTimeout(timer); reject(error); } });
    server.stdin.write(JSON.stringify(request) + "\n", error => { if (error) pending.get(request.id)?.reject(error); });
  });
}
function checkData(response, changed, collection) {
  need(!response.error && response.result?.isError === false, "mcp_search_failed");
  const value = response.result.structuredContent;
  need(JSON.stringify(JSON.parse(response.result.content[0].text)) === JSON.stringify(value), "mcp_content_mismatch");
  const names = ["knowledge/current.md", "knowledge/stale.md", ...(changed ? [] : ["knowledge/removed.md"])];
  need(value.schemaVersion === "vafs-local-search-v1" && value.query === query && value.source.rootId === sha(path.join(root, "selected")), "search_envelope");
  need(value.meta.legs.qmd.status === "ok" && value.meta.legs.qmd.collection === collection && value.meta.legs.rg.status === "ok", "actual_qmd_leg");
  need(JSON.stringify(value.data.map(row => row.path).sort()) === JSON.stringify(names.sort()), "eligible_candidate_membership");
  for (const row of value.data) {
    const body = Buffer.from(changed && row.path === "knowledge/stale.md" ? revised : files["selected/" + row.path]);
    need(row.contentHash === sha(body) && row.bytes === body.length && row.modes.includes("qmd"), "current_file_authority");
    if (changed && row.path === "knowledge/stale.md") need(row.title === "Revised archive note" && row.modes.length === 1 && row.matches.length === 0, "stale_rank_fresh_metadata");
    else {
      const at = body.indexOf(query);
      need(row.modes.includes("grep") && row.matches.length === 1 && row.matches[0].byteStart === at
        && row.matches[0].byteEnd === at + Buffer.byteLength(query) && row.matches[0].text === query, "actual_utf8_grep_provenance");
    }
  }
  const text = JSON.stringify(value);
  need(!text.includes("AUTHORED_RAW_SENTINEL") && !text.includes("AUTHORED_FOREIGN_SENTINEL"), "excluded_content_leak");
  return value;
}
try {
  need(process.platform === "linux" && process.version === "v26.13.0" && path.isAbsolute(root ?? "") && path.isAbsolute(source ?? ""), "owned_environment_required");
  need(fs.readdirSync(root).length === 0 && traces().length === 0, "fresh_owned_fixture_required");
  for (const [name, text] of Object.entries(files)) {
    const target = path.join(root, name); fs.mkdirSync(path.dirname(target), { recursive: true, mode: 0o700 });
    fs.writeFileSync(target, text, { flag: "wx", mode: 0o600 });
  }
  snapshot("before_index");
  const collection = "vafs-mcp-q02-" + process.env.VAFS_MCP_QMD_NONCE.slice(0, 12);
  report.collection = collection;
  await command("collection_add", ["collection", "add", root, "--name", collection, "--mask", "**/*.md"]);
  const baseline = JSON.parse(await command("native_baseline", ["search", query, "-c", collection, "--json", "-n", "20", "--full-path"]));
  need(Array.isArray(baseline) && baseline.length === 5, "real_index_control"); report.nativeBaseline = baseline;
  const started = await start("persistent_mcp", process.execPath, [path.join(source, "bin/vafs-local-mcp.mjs"), "--root", path.join(root, "selected"), "--qmd-collection", collection]);
  server = started.child; serverDone = started.done;
  const lines = createInterface({ input: server.stdout, crlfDelay: Infinity });
  lines.on("line", line => {
    try {
      const response = JSON.parse(line), entry = pending.get(response.id);
      need(entry && response.jsonrpc === "2.0", "unexpected_mcp_frame");
      pending.delete(response.id); entry.resolve(response);
    } catch (error) { streamError = error.message; for (const entry of pending.values()) entry.reject(error); pending.clear(); }
  });
  const initialized = await rpc("initialize", { protocolVersion: "2025-11-25", capabilities: {}, clientInfo: { name: "authored-qmd-profile", version: "1" } });
  need(initialized.result.protocolVersion === "2025-11-25" && initialized.result.instructions.includes("QMD keyword index contributes candidates"), "configured_profile_discovery");
  server.stdin.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized", params: {} }) + "\n");
  const tools = await rpc("tools/list");
  need(tools.result.tools.find(t => t.name === "vafs_local_search").inputSchema.additionalProperties === false, "strict_tool_schema");
  const before = traces().length;
  for (const extra of [{ qmdCollection: "other" }, { root: "/other" }, { includeRaw: true }, { qmdExecutable: "/other/qmd" }]) {
    const rejected = await rpc("tools/call", { name: "vafs_local_search", arguments: { query, ...extra } });
    need(rejected.error?.code === -32602, "client_override_not_rejected");
  }
  need(traces().length === before, "rejected_request_invoked_qmd");
  report.baseline = checkData(await rpc("tools/call", { name: "vafs_local_search", arguments: { query } }), false, collection);
  fs.writeFileSync(path.join(root, "selected/knowledge/stale.md"), revised);
  fs.unlinkSync(path.join(root, "selected/knowledge/removed.md")); snapshot("after_intentional_edit_and_delete");
  const stale = JSON.parse(await command("native_stale", ["search", query, "-c", collection, "--json", "-n", "20", "--full-path"]));
  need(stale.length === 5 && stale.some(row => row.title === "Cached archive note"), "stale_real_index_control"); report.nativeStale = stale;
  report.afterMutation = checkData(await rpc("tools/call", { name: "vafs_local_search", arguments: { query } }), true, collection);
  server.stdin.end(); const closed = await serverDone;
  need(closed.exitCode === 0 && closed.signal === null && closed.groupAbsent && !streamError && pending.size === 0, "persistent_mcp_close");
  report.qmdOriginals = traces();
  need(report.qmdOriginals.length === 5 && report.qmdOriginals.every(row => row.exitCode === 0 && row.signal === null && row.error === null
    && row.stdout.complete && row.stderr.complete && groupAbsent(row.wrapperPid)), "real_qmd_original_closure");
  need(JSON.stringify(report.qmdOriginals[2].argv) === JSON.stringify(["search", query, "-c", collection, "--json", "-n", "20", "--full-path"])
    && JSON.stringify(report.qmdOriginals[4].argv) === JSON.stringify(report.qmdOriginals[2].argv), "actual_mcp_native_dispatch");
  report.passed = true;
} catch (error) { report.errors.push(error.message); }
finally {
  if (server && server.exitCode === null) {
    server.stdin.end();
    await Promise.race([serverDone, new Promise(resolve => setTimeout(resolve, 5000))]);
  }
  report.cleanup.groups = children.filter(child => child.pid).map(child => ({ pid: child.pid, closed: child.exitCode !== null || child.signalCode !== null, absent: groupAbsent(child.pid) }));
  if (report.cleanup.groups.some(row => !row.closed || !row.absent)) report.passed = false;
  try { report.qmdOriginals = traces(); } catch (error) { report.errors.push(error.message); report.passed = false; }
  if (report.errors.length) report.passed = false;
  process.stdout.write("VAFS_MCP_QMD_RESULT=" + JSON.stringify(report) + "\n");
  process.exitCode = report.passed ? 0 : 1;
}
