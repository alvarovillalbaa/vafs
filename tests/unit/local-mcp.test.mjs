import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { EventEmitter } from "node:events";
import { lstat, mkdir, mkdtemp, readFile, realpath, rename, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PassThrough, Writable } from "node:stream";
import { createLocalMcpServer, runLocalMcp } from "../../bin/local/mcp.mjs";
import { LocalError } from "../../bin/local/errors.mjs";

// Authored only. Actual reader cases require existing rg and disposable files.
// Protocol/ownership cases use trusted JS seams; no HTTP, QMD or private corpus.
const MODERN = "2026-07-28", LEGACY = "2025-11-25";
const VERSION = "io.modelcontextprotocol/protocolVersion";
const CAPABILITIES = "io.modelcontextprotocol/clientCapabilities";
const CLIENT = "io.modelcontextprotocol/clientInfo";
const SERVER = "io.modelcontextprotocol/serverInfo";
const hash = value => createHash("sha256").update(value).digest("hex");
const topic = "\uFEFF---\r\ntitle: Authored page\r\ndescription: Literal fixture text\r\ndate: 2026-10-30\r\n---\r\n# Topic\r\nCafé 🌊 literal needle text.\r\n";
const meta = () => ({ [VERSION]: MODERN, [CAPABILITIES]: {}, [CLIENT]: { name: "authored-client", version: "1" } });
const modern = (id, method, params = {}) => ({ jsonrpc: "2.0", id, method, params: { ...params, _meta: meta() } });
const call = (id, name, args = {}) => modern(id, "tools/call", { name, arguments: args });
const initialize = id => ({ jsonrpc: "2.0", id, method: "initialize", params: {
  protocolVersion: LEGACY, capabilities: {}, clientInfo: { name: "authored-client", version: "1" },
} });
const initialized = { jsonrpc: "2.0", method: "notifications/initialized", params: {} };
const cancelled = requestId => ({ jsonrpc: "2.0", method: "notifications/cancelled", params: { requestId } });

function document(content = topic) {
  return { path: "knowledge/topic.md", title: "Authored page", description: "Literal fixture text",
    date: "2026-10-30", dateSource: "frontmatter", modifiedAt: "2026-10-30T00:00:00.000Z",
    content, contentHash: hash(content), bytes: Buffer.byteLength(content), section: "knowledge", folder: null };
}
function corpus(root, content = topic) {
  return { root, rootId: hash(root), documents: [document(content)], skipped: [] };
}
function searchResult(root, query = "needle") {
  return { schemaVersion: "vafs-local-search-v1", query, source: { kind: "local_checkout", rootId: hash(root) },
    data: [], meta: { documents: 1, bytes: Buffer.byteLength(topic), legs: { metadata: { status: "ok" }, rg: { status: "ok" }, qmd: { status: "disabled" } } }, skipped: [] };
}
function data(response, schema) {
  assert.equal(response?.jsonrpc, "2.0");
  assert.equal(response.result?.isError, false);
  assert.equal(response.result.content?.[0]?.type, "text");
  assert.deepEqual(JSON.parse(response.result.content[0].text), response.result.structuredContent);
  if (schema) assert.equal(response.result.structuredContent.schemaVersion, schema);
  return response.result.structuredContent;
}
function toolError(response, code) {
  assert.equal(response?.jsonrpc, "2.0");
  assert.equal(response.result?.isError, true);
  const value = response.result.structuredContent;
  assert.match(value.error, /^local_[a-z0-9_]+$/);
  if (code) assert.equal(value.error, code);
  assert.deepEqual(JSON.parse(response.result.content[0].text), value);
  return value.error;
}
function rpcError(response, code) {
  assert.equal(response?.jsonrpc, "2.0");
  assert.equal(response.error?.code, code);
  assert.equal(Object.hasOwn(response, "result"), false);
}
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
async function bounded(promise, message = "Authored fixture did not reach its observable boundary") {
  let timer;
  try { return await Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(message)), 2_000); })]); }
  finally { clearTimeout(timer); }
}
async function fixture(operation) {
  const directory = await realpath(await mkdtemp(join(tmpdir(), "vafs-local-mcp-authored-")));
  const identity = await lstat(directory), root = join(directory, "checkout");
  try {
    await mkdir(join(root, "knowledge"), { recursive: true });
    await mkdir(join(root, "raw"));
    await writeFile(join(root, "BRAIN.md"), "# Authored brain\nDisposable operator-selected checkout.\n");
    await writeFile(join(root, "knowledge", "topic.md"), topic);
    await writeFile(join(root, "raw", "intake.md"), "# Raw\nAUTHORED_RAW_NEEDLE\n");
    await writeFile(join(root, ".gitignore"), "ignored.md\n");
    await writeFile(join(root, "ignored.md"), "AUTHORED_IGNORED_NEEDLE\n");
    await writeFile(join(root, ".hidden.md"), "AUTHORED_HIDDEN_NEEDLE\n");
    await operation({ directory, root });
  } finally {
    const current = await lstat(directory);
    assert.equal(current.isSymbolicLink(), false);
    assert.equal(current.dev, identity.dev); assert.equal(current.ino, identity.ino);
    await rm(directory, { recursive: true });
  }
}
async function serverAt(root, options, operation) {
  const server = await createLocalMcpServer(root, options);
  try { return await operation(server); }
  finally { server.close(); }
}

class Collector extends Writable {
  text = "";
  lines = [];
  _write(chunk, _encoding, callback) {
    this.text += chunk.toString("utf8");
    this.lines = this.text.split("\n").filter(Boolean);
    this.emit("captured"); callback();
  }
  async untilLines(count) {
    if (this.lines.length >= count) return;
    const reached = deferred();
    const observe = () => { if (this.lines.length >= count) reached.resolve(); };
    this.on("captured", observe);
    try { observe(); await bounded(reached.promise); }
    finally { this.removeListener("captured", observe); }
  }
}
function transport(root, output = new Collector()) {
  const input = new PassThrough(), controller = new AbortController();
  let stderr = "";
  const completion = runLocalMcp(["--root", root], { input, output, stderr: text => { stderr += text; }, signal: controller.signal });
  return { input, output, completion, controller, stderr: () => stderr,
    async stop() { controller.abort(); input.destroy(); await bounded(completion); } };
}
const frame = value => Buffer.from(JSON.stringify(value) + "\n");

test("local MCP requires an explicit directory before invoking any trusted reader seam", async () => {
  let calls = 0;
  const options = { readCorpus: async () => { calls += 1; return {}; } };
  for (const root of [undefined, null, "", "   ", "bad\0root"]) {
    await assert.rejects(createLocalMcpServer(root, options), error => /^local_root_/.test(error.message));
  }
  await fixture(async ({ root }) => {
    await assert.rejects(createLocalMcpServer(join(root, "BRAIN.md"), options), /local_root_invalid/);
    await assert.rejects(createLocalMcpServer(join(root, "missing"), options), /local_root_invalid/);
  });
  assert.equal(calls, 0);
});

test("local MCP canonicalizes an explicit startup alias and passes only that root to readers", async () => fixture(async ({ directory, root }) => {
  const alias = join(directory, "selected-alias"); await symlink(root, alias, "dir");
  let received;
  await serverAt(alias, { readCorpus: async (selected, options) => { received = { selected, options }; return corpus(root); } }, async server => {
    data(await server.handle(call(1, "vafs_local_index")), "vafs-local-index-v1");
  });
  assert.equal(received.selected, root); assert.equal(received.options.includeRaw, false);
  assert.ok(received.options.signal instanceof AbortSignal);
}));

test("local MCP modern discovery advertises complete supported versions and read-only capabilities without legacy initialization", async () => fixture(async ({ root }) => {
  await serverAt(root, {}, async server => {
    const response = await server.handle(modern("discover", "server/discover"));
    assert.equal(response.id, "discover"); assert.equal(response.result.resultType, "complete");
    assert.deepEqual(response.result.supportedVersions, [MODERN, LEGACY]);
    assert.deepEqual(response.result.capabilities, { tools: {} });
    assert.deepEqual(response.result._meta[SERVER], { name: "vafs-local", version: "0.1.0" });
    assert.match(response.result.instructions, /untrusted source data/);
  });
}));

test("local MCP lists exactly three tools whose schemas cannot select roots raw intake QMD or writes", async () => fixture(async ({ root }) => {
  await serverAt(root, {}, async server => {
    const tools = (await server.handle(modern(1, "tools/list"))).result.tools;
    assert.deepEqual(tools.map(tool => tool.name).sort(), ["vafs_local_get_page", "vafs_local_index", "vafs_local_search"]);
    for (const tool of tools) {
      assert.equal(tool.annotations.readOnlyHint, true); assert.equal(tool.annotations.destructiveHint, false);
      assert.equal(tool.inputSchema.additionalProperties, false);
      assert.ok(Object.keys(tool.inputSchema.properties).every(key => ["query", "limit", "path"].includes(key)));
    }
  });
}));

test("local MCP legacy initialization requires a valid initialized notification before tool use", async () => fixture(async ({ root }) => {
  await serverAt(root, {}, async server => {
    rpcError(await server.handle({ jsonrpc: "2.0", id: 1, method: "tools/list" }), -32602);
    assert.equal((await server.handle(initialize(2))).result.protocolVersion, LEGACY);
    for (const bad of [
      { ...initialized, result: {} }, { ...initialized, error: {} },
      { ...initialized, params: { _meta: "invalid" } }, { ...initialized, params: { extra: true } },
    ]) {
      assert.equal(await server.handle(bad), undefined);
      rpcError(await server.handle({ jsonrpc: "2.0", id: 3, method: "tools/list" }), -32602);
    }
    assert.equal(await server.handle(initialized), undefined);
    assert.equal((await server.handle({ jsonrpc: "2.0", id: 4, method: "tools/list" })).result.tools.length, 3);
  });
}));

test("local MCP ping works before initialization and ordinary notifications never receive responses", async () => fixture(async ({ root }) => {
  await serverAt(root, {}, async server => {
    assert.deepEqual(await server.handle({ jsonrpc: "2.0", id: 0, method: "ping" }), { jsonrpc: "2.0", id: 0, result: {} });
    assert.equal(await server.handle({ jsonrpc: "2.0", method: "notifications/unknown", params: {} }), undefined);
    assert.equal(await server.handle(cancelled("no-active-request")), undefined);
  });
}));

test("local MCP rejects malformed JSON-RPC envelopes without inventing a successful tool result", async () => fixture(async ({ root }) => {
  await serverAt(root, {}, async server => {
    for (const request of [null, [], {}, { jsonrpc: "1.0", id: 1, method: "ping" },
      { jsonrpc: "2.0", id: 1, method: 2 }, { jsonrpc: "2.0", id: null, method: "ping" },
      { jsonrpc: "2.0", id: 1, method: "ping", result: {} }]) rpcError(await server.handle(request), -32600);
  });
}));

test("local MCP unknown request methods return Method not found independently of legacy state", async () => fixture(async ({ root }) => {
  await serverAt(root, {}, async server => { rpcError(await server.handle(modern(1, "auth/request")), -32601); });
}));

test("local MCP unsupported modern versions return supported and requested protocol data", async () => fixture(async ({ root }) => {
  await serverAt(root, {}, async server => {
    const request = modern(1, "server/discover"); request.params._meta[VERSION] = "2099-01-01";
    const response = await server.handle(request); rpcError(response, -32022);
    assert.deepEqual(response.error.data, { supported: [MODERN, LEGACY], requested: "2099-01-01" });
  });
}));

test("local MCP malformed or partial modern metadata cannot borrow an initialized legacy session", async () => fixture(async ({ root }) => {
  await serverAt(root, {}, async server => {
    await server.handle(initialize(1)); await server.handle(initialized);
    for (const bad of [null, [], { [VERSION]: MODERN }, { [CAPABILITIES]: {} }, { [CLIENT]: { name: "only" } },
      { [VERSION]: MODERN, [CAPABILITIES]: [] }, { [VERSION]: MODERN, [CAPABILITIES]: {}, [CLIENT]: { name: "missing-version" } }]) {
      rpcError(await server.handle({ jsonrpc: "2.0", id: 2, method: "tools/list", params: { _meta: bad } }), -32602);
    }
  });
}));

test("local MCP rejects per-call root raw QMD workspace and export overrides before invoking readers", async () => fixture(async ({ root }) => {
  let calls = 0;
  await serverAt(root, { readCorpus: async () => { calls += 1; return corpus(root); }, search: async () => { calls += 1; return searchResult(root); } }, async server => {
    for (const args of [{ root: "/unselected" }, { includeRaw: true }, { qmdCollection: "outside" }, { workspaceId: "hosted" }, { output: "export.json" }]) {
      rpcError(await server.handle(call(1, "vafs_local_index", args)), -32602);
      rpcError(await server.handle(call(2, "vafs_local_search", { query: "needle", ...args })), -32602);
    }
  });
  assert.equal(calls, 0);
}));

test("local MCP actual metadata indexing is offline excludes raw and ignored files and changes no source bytes", async t => fixture(async ({ root }) => {
  const network = t.mock.method(globalThis, "fetch", () => { throw new Error("Authored network boundary must not be used"); });
  const before = await readFile(join(root, "knowledge", "topic.md"));
  await serverAt(root, {}, async server => {
    const index = data(await server.handle(call(1, "vafs_local_index")), "vafs-local-index-v1");
    assert.deepEqual(index.documents.map(entry => entry.path), ["BRAIN.md", "knowledge/topic.md"]);
    assert.equal(index.source.kind, "local_checkout"); assert.equal(index.source.rootId, hash(root));
    assert.equal(index.meta.documents, 2);
    assert.ok(index.documents.every(entry => !Object.hasOwn(entry, "content") && !entry.path.startsWith("/")));
    assert.equal(index.documents.find(entry => entry.path === "knowledge/topic.md").contentHash, hash(before));
    assert.equal(JSON.stringify(index).includes(root), false);
  });
  assert.deepEqual(await readFile(join(root, "knowledge", "topic.md")), before);
  assert.equal(network.mock.callCount(), 0);
}));

test("local MCP actual page reads retain exact BOM CRLF Unicode bytes and their independent SHA-256", async () => fixture(async ({ root }) => {
  await serverAt(root, {}, async server => {
    const page = data(await server.handle(call(1, "vafs_local_get_page", { path: "knowledge/topic.md" })), "vafs-local-page-v1").data;
    assert.equal(page.path, "knowledge/topic.md"); assert.equal(page.content, topic);
    assert.equal(page.contentHash, hash(Buffer.from(topic))); assert.equal(page.bytes, Buffer.byteLength(topic));
    assert.equal(page.dateSource, "frontmatter");
  });
}));

test("local MCP actual ripgrep search preserves byte offsets current hashes and the disabled QMD leg", async () => fixture(async ({ root }) => {
  await serverAt(root, {}, async server => {
    const result = data(await server.handle(call(1, "vafs_local_search", { query: "needle", limit: 1 })), "vafs-local-search-v1");
    assert.equal(result.query, "needle"); assert.equal(result.data.length, 1);
    assert.equal(result.data[0].path, "knowledge/topic.md"); assert.equal(result.data[0].contentHash, hash(topic));
    assert.ok(result.data[0].modes.includes("grep")); assert.deepEqual(result.meta.legs.qmd, { status: "disabled" });
    assert.ok(result.data[0].matches.length > 0);
    for (const match of result.data[0].matches) assert.equal(Buffer.from(topic).subarray(match.byteStart, match.byteEnd).toString("utf8"), match.text);
  });
}));

test("local MCP repeated page calls read current vetted bytes instead of serving an earlier snapshot", async () => fixture(async ({ root }) => {
  await serverAt(root, {}, async server => {
    const first = data(await server.handle(call(1, "vafs_local_get_page", { path: "knowledge/topic.md" }))).data;
    const changed = "# Changed authored page\nNew literal bytes.\n";
    await writeFile(join(root, "knowledge", "topic.md"), changed);
    const second = data(await server.handle(call(2, "vafs_local_get_page", { path: "knowledge/topic.md" }))).data;
    assert.equal(second.content, changed); assert.equal(second.contentHash, hash(changed));
    assert.notEqual(second.contentHash, first.contentHash);
  });
}));

test("local MCP page eligibility rejects traversal absolute raw ignored hidden and symlink paths without disclosing outside content", async () => fixture(async ({ directory, root }) => {
  const outside = join(directory, "outside.md"); await writeFile(outside, "AUTHORED_OUTSIDE_SECRET");
  await symlink(outside, join(root, "knowledge", "linked.md"));
  await serverAt(root, {}, async server => {
    for (const path of ["../outside.md", outside, "raw/intake.md", "ignored.md", ".hidden.md", "knowledge/linked.md"]) {
      const response = await server.handle(call(1, "vafs_local_get_page", { path })); toolError(response);
      assert.equal(JSON.stringify(response).includes("AUTHORED_OUTSIDE_SECRET"), false);
      assert.equal(JSON.stringify(response).includes(directory), false);
    }
  });
}));

test("local MCP tool names argument types and result limits reject invalid params before dispatch", async () => fixture(async ({ root }) => {
  let calls = 0;
  await serverAt(root, { readCorpus: async () => { calls += 1; return corpus(root); }, readDocument: async () => { calls += 1; return document(); }, search: async () => { calls += 1; return searchResult(root); } }, async server => {
    for (const request of [call(1, "vafs_trigger_sync"), call(2, "vafs_local_get_page", {}), call(3, "vafs_local_get_page", { path: 42 }),
      call(4, "vafs_local_search", { query: 42 }), call(5, "vafs_local_search", { query: "" }),
      call(6, "vafs_local_search", { query: "needle", limit: "1" }), call(7, "vafs_local_search", { query: "needle", limit: 0 }),
      call(8, "vafs_local_search", { query: "needle", limit: 101 }), call(9, "vafs_local_search", { query: "needle", limit: 1.5 }),
      { jsonrpc: "2.0", id: 10, method: "ping", params: null },
      modern(11, "tools/call", { name: "vafs_local_index", arguments: null })]) rpcError(await server.handle(request), -32602);
  });
  assert.equal(calls, 0);
}));

test("local MCP known operational failures preserve only finite codes in text and structured content", async () => fixture(async ({ root }) => {
  await serverAt(root, { readDocument: async () => { throw new LocalError("local_file_unavailable"); } }, async server => {
    toolError(await server.handle(call(1, "vafs_local_get_page", { path: "knowledge/topic.md" })), "local_file_unavailable");
  });
}));

test("local MCP unexpected operational errors never expose paths queries or thrown private details", async () => fixture(async ({ root }) => {
  await serverAt(root, { search: async () => { throw new Error("AUTHORED_PRIVATE_EXCEPTION /private/fixture token"); } }, async server => {
    const response = await server.handle(call(1, "vafs_local_search", { query: "AUTHORED_QUERY" }));
    toolError(response, "local_failed");
    assert.equal(JSON.stringify(response).includes("AUTHORED_PRIVATE_EXCEPTION"), false);
    assert.equal(JSON.stringify(response).includes("AUTHORED_QUERY"), false);
  });
}));

test("local MCP over-budget responses fail as finite errors rather than truncating a result", async () => fixture(async ({ root }) => {
  const oversized = corpus(root); oversized.documents[0].description = "x".repeat(4 * 1024 * 1024 + 1_024);
  await serverAt(root, { readCorpus: async () => oversized }, async server => {
    const response = await server.handle(call(1, "vafs_local_index")); toolError(response, "local_mcp_response_limit");
    assert.ok(Buffer.byteLength(JSON.stringify(response)) < 1_024);
  });
}));

test("local MCP one active retrieval fences another tool with an explicit busy result", async () => fixture(async ({ root }) => {
  const entered = deferred(), release = deferred();
  await serverAt(root, { search: async () => { entered.resolve(); return release.promise; } }, async server => {
    const active = server.handle(call("active", "vafs_local_search", { query: "needle" }));
    try {
      await bounded(entered.promise);
      toolError(await server.handle(call("second", "vafs_local_index")), "local_mcp_busy");
      release.resolve(searchResult(root)); data(await bounded(active), "vafs-local-search-v1");
    } finally { release.resolve(searchResult(root)); server.close(); await active; }
  });
}));

test("local MCP cancellation notifications abort their own retrieval and send no reply", async () => fixture(async ({ root }) => {
  const entered = deferred(), release = deferred(); let signal;
  await serverAt(root, { search: async options => { signal = options.signal; entered.resolve(); return release.promise; } }, async server => {
    const active = server.handle(call("owned", "vafs_local_search", { query: "needle" }));
    try {
      await bounded(entered.promise);
      assert.equal(await server.handle(cancelled("owned")), undefined); assert.equal(signal.aborted, true);
      assert.equal(await bounded(active), undefined);
    } finally { release.resolve(searchResult(root)); server.close(); await active; }
  });
}));

test("local MCP stale cancellation cannot abort a different active request", async () => fixture(async ({ root }) => {
  const entered = deferred(), release = deferred(); let signal;
  await serverAt(root, { search: async options => { signal = options.signal; entered.resolve(); return release.promise; } }, async server => {
    const active = server.handle(call("new", "vafs_local_search", { query: "needle" }));
    try {
      await bounded(entered.promise); assert.equal(await server.handle(cancelled("old")), undefined);
      assert.equal(signal.aborted, false); release.resolve(searchResult(root)); data(await bounded(active));
    } finally { release.resolve(searchResult(root)); server.close(); await active; }
  });
}));

test("local MCP close aborts active work suppresses late results and ignores later requests", async () => fixture(async ({ root }) => {
  const entered = deferred(), release = deferred(); let signal;
  await serverAt(root, { search: async options => { signal = options.signal; entered.resolve(); return release.promise; } }, async server => {
    const active = server.handle(call("closing", "vafs_local_search", { query: "needle" }));
    try {
      await bounded(entered.promise); server.close(); assert.equal(signal.aborted, true);
      assert.equal(await bounded(active), undefined);
      assert.equal(await server.handle(modern(2, "ping")), undefined);
    } finally { release.resolve(searchResult(root)); await active; }
  });
}));

test("local MCP rejects root directory replacement before another reader can enter", async () => fixture(async ({ directory, root }) => {
  let entered = 0;
  await serverAt(root, { readCorpus: async () => { entered += 1; return corpus(root); } }, async server => {
    await rename(root, join(directory, "original-checkout")); await mkdir(root);
    await writeFile(join(root, "replacement.md"), "AUTHORED_REPLACEMENT_CONTENT");
    const response = await server.handle(call(1, "vafs_local_index")); toolError(response, "local_root_invalid");
    assert.equal(entered, 0); assert.equal(JSON.stringify(response).includes("AUTHORED_REPLACEMENT_CONTENT"), false);
  });
}));

test("local MCP rechecks root identity after a pending read before publishing captured content", async () => fixture(async ({ directory, root }) => {
  const entered = deferred(), release = deferred();
  await serverAt(root, { readCorpus: async () => { entered.resolve(); return release.promise; } }, async server => {
    const active = server.handle(call(1, "vafs_local_index"));
    try {
      await bounded(entered.promise); await rename(root, join(directory, "original-checkout")); await mkdir(root);
      release.resolve(corpus(root)); toolError(await bounded(active), "local_root_invalid");
    } finally { release.resolve(corpus(root)); server.close(); await active; }
  });
}));

test("local MCP transport emits protocol-only complete modern responses and no notification acknowledgement", async () => fixture(async ({ root }) => {
  const running = transport(root);
  try {
    running.input.write(Buffer.concat([frame(modern("discover", "server/discover")), frame(initialized), frame(modern("ping", "ping"))]));
    await running.output.untilLines(2);
    const responses = running.output.lines.map(line => JSON.parse(line));
    assert.deepEqual(responses.map(value => value.id).sort(), ["discover", "ping"]);
    assert.ok(responses.every(value => value.jsonrpc === "2.0" && value.result.resultType === "complete"));
    running.input.end(); assert.equal(await bounded(running.completion), 0); assert.equal(running.stderr(), "");
  } finally { await running.stop(); }
}));

test("local MCP transport rejects malformed JSON and UTF-8 frames but remains usable", async () => fixture(async ({ root }) => {
  const running = transport(root);
  try {
    running.input.write(Buffer.concat([Buffer.from("{not-json}\n"), Buffer.from([0xc3, 0x28, 0x0a]), frame(modern("after-errors", "ping"))]));
    await running.output.untilLines(3);
    const responses = running.output.lines.map(line => JSON.parse(line));
    assert.equal(responses.filter(value => value.error?.code === -32700).length, 2);
    assert.equal(responses.find(value => value.id === "after-errors").result.resultType, "complete");
    running.input.end(); assert.equal(await bounded(running.completion), 0);
  } finally { await running.stop(); }
}));

test("local MCP transport terminates oversized request frames with finite failure and no echoed payload", async () => fixture(async ({ root }) => {
  const running = transport(root);
  try {
    running.input.write(Buffer.concat([Buffer.alloc(64 * 1024 + 1, 120), Buffer.from("\n")]));
    assert.equal(await bounded(running.completion), 1);
    assert.deepEqual(JSON.parse(running.stderr().trim()), { error: "local_mcp_frame_limit" });
    assert.ok(running.output.text.length < 1_024);
    assert.ok(running.output.lines.some(line => JSON.parse(line).error?.code === -32600));
  } finally { await running.stop(); }
}));

test("local MCP transport reports an incomplete EOF frame instead of executing it", async () => fixture(async ({ root }) => {
  const running = transport(root);
  try {
    running.input.end(Buffer.from('{"jsonrpc":"2.0","id":1,"method":"ping"}'));
    assert.equal(await bounded(running.completion), 1);
    assert.equal(running.output.lines.length, 1); rpcError(JSON.parse(running.output.lines[0]), -32700);
  } finally { await running.stop(); }
}));

test("local MCP EOF closes a buffered retrieval without publishing a tool result", async () => fixture(async ({ root }) => {
  const running = transport(root);
  try {
    running.input.end(frame(call("buffered", "vafs_local_index")));
    assert.equal(await bounded(running.completion), 0);
    assert.equal(running.output.lines.some(line => JSON.parse(line).result?.structuredContent?.schemaVersion === "vafs-local-index-v1"), false);
  } finally { await running.stop(); }
}));

test("local MCP transport limits outstanding handler writes and resumes only after an owned write settles", async () => fixture(async ({ root }) => {
  class HeldOutput extends EventEmitter {
    callbacks = []; texts = []; four = deferred(); five = deferred();
    write(text, callback) { this.texts.push(text); this.callbacks.push(callback); if (this.texts.length === 4) this.four.resolve(); if (this.texts.length === 5) this.five.resolve(); return false; }
    destroy() { for (const callback of this.callbacks.splice(0)) callback(); }
  }
  const output = new HeldOutput(), running = transport(root, output);
  try {
    running.input.write(Buffer.concat([1, 2, 3, 4, 5].map(id => frame(modern(id, "ping")))));
    await bounded(output.four.promise); assert.equal(output.texts.length, 4);
    output.callbacks.shift()(); await bounded(output.five.promise); assert.equal(output.texts.length, 5);
    output.destroy(); running.input.end(); assert.equal(await bounded(running.completion), 0);
    assert.ok(output.texts.every(text => JSON.parse(text).result.resultType === "complete"));
  } finally { output.destroy(); await running.stop(); }
}));

test("local MCP CLI rejects missing duplicate and capability-expanding startup arguments without a protocol response", async () => {
  for (const args of [[], ["--root"], ["--root", ""], ["--root", "fixture", "--root", "other"],
    ["--root", "fixture", "--include-raw"], ["--root", "fixture", "--qmd-collection", "notes"]]) {
    const input = new PassThrough(), output = new Collector(); let stderr = "";
    const code = await runLocalMcp(args, { input, output, stderr: text => { stderr += text; } });
    assert.equal(code, 1); assert.equal(output.text, "");
    assert.deepEqual(JSON.parse(stderr.trim()), { error: "local_mcp_arguments_invalid" });
    input.destroy(); output.destroy();
  }
});

test("local MCP output failure closes the transport with a finite nonzero outcome", async () => fixture(async ({ root }) => {
  const output = new Writable({ write(_chunk, _encoding, callback) { callback(new Error("AUTHORED_OUTPUT_FAILURE")); } });
  const running = transport(root, output);
  try {
    running.input.write(frame(modern(1, "ping")));
    assert.equal(await bounded(running.completion), 1);
    assert.equal(running.stderr().includes("AUTHORED_OUTPUT_FAILURE"), false);
  } finally { await running.stop(); }
}));
