import test from "node:test";
import assert from "node:assert/strict";
import { lstat, mkdtemp, realpath, rm } from "node:fs/promises";
import { isAbsolute, join } from "node:path";
import { PassThrough } from "node:stream";
import { createLocalMcpServer, runLocalMcp } from "../../bin/local/mcp.mjs";

// T2: new startup/profile plumbing only; search seams do not qualify real QMD.
const VERSION = "io.modelcontextprotocol/protocolVersion";
const CAPABILITIES = "io.modelcontextprotocol/clientCapabilities";
const request = (id, method, params = {}) => ({ jsonrpc: "2.0", id, method,
  params: { ...params, _meta: { [VERSION]: "2026-07-28", [CAPABILITIES]: {} } } });
const call = (id, args) => request(id, "tools/call", { name: "vafs_local_search", arguments: args });
const emptySearch = () => ({ schemaVersion: "vafs-local-search-v1", data: [], meta: { legs: { qmd: { status: "disabled" } } } });

async function fixture(operation) {
  const parent = process.env.VAFS_MCP_QMD_TEST_ROOT;
  assert.ok(typeof parent === "string" && isAbsolute(parent), "CI must supply its owned fixture parent");
  const root = await realpath(await mkdtemp(join(parent, "profile-")));
  const before = await lstat(root);
  try { await operation(root); }
  finally {
    const after = await lstat(root);
    assert.equal(after.isSymbolicLink(), false);
    assert.equal(after.dev, before.dev); assert.equal(after.ino, before.ino); assert.equal(after.uid, before.uid);
    await rm(root, { recursive: true });
  }
}

async function using(root, options, operation) {
  const server = await createLocalMcpServer(root, options);
  try { await operation(server); }
  finally { server.close(); }
}

test("MCP QMD profile keeps default discovery and search delegation disabled", { timeout: 5000 }, async () => fixture(async root => {
  const calls = [];
  await using(root, { search: async input => { calls.push(input); return emptySearch(); } }, async server => {
    const discovery = await server.handle(request(1, "server/discover"));
    assert.match(discovery.result.instructions, /Raw intake and QMD are disabled/);
    const tools = await server.handle(request(2, "tools/list"));
    assert.doesNotMatch(tools.result.tools.find(t => t.name === "vafs_local_search").description, /operator-configured QMD/);
    const result = await server.handle(call(3, { query: "authored" }));
    assert.equal(result.result.isError, false);
    assert.equal(calls.length, 1); assert.equal(Object.hasOwn(calls[0], "qmdCollection"), false);
    assert.equal(calls[0].includeRaw, false); assert.equal(calls[0].root, root);
  });
}));

test("MCP QMD profile captures the operator collection before options change", { timeout: 5000 }, async () => fixture(async root => {
  const calls = [], options = { qmdCollection: "authored-library", search: async input => { calls.push(input); return emptySearch(); } };
  await using(root, options, async server => {
    options.qmdCollection = "different-library";
    await server.handle(call(1, { query: "authored", limit: 7 }));
    assert.equal(calls[0].qmdCollection, "authored-library"); assert.equal(calls[0].limit, 7);
    assert.equal(calls[0].root, root); assert.equal(calls[0].includeRaw, false);
    assert.ok(calls[0].signal instanceof AbortSignal);
  });
}));

test("MCP QMD profile announces keyword candidates and fresh-file authority", { timeout: 5000 }, async () => fixture(async root => {
  await using(root, { qmdCollection: "authored-library" }, async server => {
    const legacy = await server.handle({ jsonrpc: "2.0", id: 1, method: "initialize", params: {
      protocolVersion: "2025-11-25", capabilities: {}, clientInfo: { name: "authored-profile", version: "1" },
    } });
    const modern = await server.handle(request(2, "server/discover"));
    assert.equal(legacy.result.instructions, modern.result.instructions);
    assert.match(modern.result.instructions, /Raw intake is disabled/);
    assert.match(modern.result.instructions, /QMD keyword index contributes candidates/);
    assert.match(modern.result.instructions, /index rank can be stale/);
    assert.match(modern.result.instructions, /No model, hosted identity/);
    const tools = await server.handle(request(3, "tools/list"));
    const search = tools.result.tools.find(t => t.name === "vafs_local_search");
    assert.match(search.description, /operator-configured QMD keyword index/);
    assert.deepEqual(Object.keys(search.inputSchema.properties).sort(), ["limit", "query"]);
    assert.equal(search.inputSchema.additionalProperties, false);
  });
}));

test("MCP QMD profile rejects malformed startup collections before retrieval", { timeout: 5000 }, async () => fixture(async root => {
  for (const qmdCollection of ["", " leading", "trailing ", "-flag", "line\nfeed", "nul\0", "\ud800", "x".repeat(1025), 42, false, null, {}]) {
    await assert.rejects(createLocalMcpServer(root, { qmdCollection }), error => error.code === "local_qmd_collection_invalid");
  }
}));

test("MCP QMD profile refuses client collection executable root and raw overrides", { timeout: 5000 }, async () => fixture(async root => {
  let calls = 0;
  await using(root, { qmdCollection: "authored-library", search: async () => { calls++; return emptySearch(); } }, async server => {
    let id = 0;
    for (const extra of [{ qmdCollection: "other" }, { qmdExecutable: "/other/qmd" }, { root: "/other" }, { includeRaw: true }]) {
      const result = await server.handle(call(++id, { query: "authored", ...extra }));
      assert.equal(result.error.code, -32602);
    }
    assert.equal(calls, 0);
  });
}));

test("MCP QMD profile leaves index and page reads on the original read-only options", { timeout: 5000 }, async () => fixture(async root => {
  const calls = [];
  await using(root, { qmdCollection: "authored-library",
    readCorpus: async (selected, options) => { calls.push({ selected, options }); return { rootId: "authored", documents: [], skipped: [] }; },
    readDocument: async (selected, path, options) => { calls.push({ selected, path, options }); return { path, content: "authored" }; },
  }, async server => {
    for (const [id, name, args] of [[1, "vafs_local_index", {}], [2, "vafs_local_get_page", { path: "knowledge/authored.md" }]]) {
      const result = await server.handle(request(id, "tools/call", { name, arguments: args }));
      assert.equal(result.result.isError, false);
    }
    assert.equal(calls.length, 2);
    for (const row of calls) {
      assert.equal(row.selected, root); assert.equal(row.options.includeRaw, false);
      assert.equal(Object.hasOwn(row.options, "qmdCollection"), false);
    }
  });
}));

test("MCP QMD entrypoint accepts only the explicit optional startup pair", { timeout: 5000 }, async () => fixture(async root => {
  for (const args of [["--root", root], ["--root", root, "--qmd-collection", "authored-library"]]) {
    const input = new PassThrough(), output = new PassThrough(); let diagnostics = "";
    input.end();
    assert.equal(await runLocalMcp(args, { input, output, stderr: text => { diagnostics += text; } }), 0);
    assert.equal(diagnostics, ""); input.destroy(); output.destroy();
  }
  for (const args of [["--root", root, "--qmd-collection"], ["--root", root, "--qmd-collection", undefined],
    ["--root", root, "--qmd-collection", ""], ["--root", root, "--qmd-collection", "-flag"],
    ["--qmd-collection", "authored-library", "--root", root], ["--root", root, "--raw", "true"],
    ["--root", root, "--qmd-collection", "one", "--qmd-collection", "two"]]) {
    let diagnostics = "";
    assert.equal(await runLocalMcp(args, { stderr: text => { diagnostics += text; } }), 1);
    assert.deepEqual(JSON.parse(diagnostics), { error: "local_mcp_arguments_invalid" });
  }
}));

test("MCP QMD profile closes the configured search through its existing abort signal", { timeout: 5000 }, async () => fixture(async root => {
  let started;
  const entered = new Promise(resolve => { started = resolve; });
  const server = await createLocalMcpServer(root, { qmdCollection: "authored-library", search: input => new Promise(resolve => {
    assert.equal(input.qmdCollection, "authored-library");
    input.signal.addEventListener("abort", () => resolve(emptySearch()), { once: true }); started();
  }) });
  try {
    const result = server.handle(call(1, { query: "authored" }));
    await entered; server.close(); assert.equal(await result, undefined);
  } finally { server.close(); }
}));
