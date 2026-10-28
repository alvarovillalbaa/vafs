import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile, rm, stat, access, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { runCli } from "../../bin/cli.mjs";

// Authored only. Local cases use disposable authored files and real allowlisted
// retrieval processes; remote cases mock fetch and contact no HTTP server.
const execute = promisify(execFile);
const offlineEnv = () => new Proxy({}, { get() { throw new Error("private_env_access_forbidden"); } });
const jsonResponse = (value, status = 200, headers = {}) => new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json", ...headers } });

async function capture(args, env = offlineEnv()) {
  let stdout = "", stderr = "";
  const code = await runCli(args, { stdout: text => { stdout += text; }, stderr: text => { stderr += text; }, env });
  return { code, stdout, stderr, data: stdout ? JSON.parse(stdout) : null, error: stderr ? JSON.parse(stderr) : null };
}
async function fixture(operation) {
  const directory = await mkdtemp(join(tmpdir(), "vafs-local-cli-")), root = join(directory, "checkout");
  const topic = "---\ntitle: Needle topic\ndescription: Authored CLI evidence\ndate: 2026-10-28\n---\n# Needle\nneedle needle search words\n";
  try {
    await mkdir(join(root, "knowledge"), { recursive: true }); await mkdir(join(root, "raw"));
    await writeFile(join(root, "BRAIN.md"), "# Brain\nAuthored reader fixture.\n");
    await writeFile(join(root, "knowledge", "topic.md"), topic);
    await writeFile(join(root, "raw", "intake.md"), "# Raw intake\nprivate raw needle\n");
    await operation({ directory, root, topic });
  } finally { await rm(directory, { recursive: true, force: true }); }
}

test("local index is offline and emits metadata with relative paths and a stable root identity", async t => {
  const fetch = t.mock.method(globalThis, "fetch", () => { throw new Error("private_network_forbidden"); });
  await fixture(async ({ root, topic }) => {
    const result = await capture(["local", "index", "--root", root]);
    assert.equal(result.code, 0); assert.equal(result.stderr, "");
    assert.equal(result.data.schemaVersion, "vafs-local-index-v1");
    assert.deepEqual(Object.keys(result.data.source).sort(), ["kind", "rootId"]);
    assert.equal(result.data.source.kind, "local_checkout"); assert.match(result.data.source.rootId, /^[a-f0-9]{64}$/);
    assert.ok(result.data.documents.some(document => document.path === "knowledge/topic.md"));
    assert.ok(result.data.documents.every(document => !Object.hasOwn(document, "content") && !document.path.startsWith("/")));
    assert.equal(result.data.meta.documents, result.data.documents.length);
    assert.equal(result.data.meta.bytes, result.data.documents.reduce((sum, document) => sum + document.bytes, 0));
    assert.ok(!result.stdout.includes(root)); assert.ok(!result.stdout.includes(topic));
    const repeated = await capture(["local", "index", "--root", root]);
    assert.deepEqual(repeated.data, result.data);
  });
  assert.equal(fetch.mock.callCount(), 0);
});

test("local get returns exact source bytes and canonical relative document metadata", async t => {
  t.mock.method(globalThis, "fetch", () => { throw new Error("private_network_forbidden"); });
  await fixture(async ({ root, topic }) => {
    const result = await capture(["local", "get", "knowledge/topic.md", "--root", root]);
    assert.equal(result.code, 0); assert.equal(result.data.schemaVersion, "vafs-local-page-v1");
    assert.equal(result.data.data.path, "knowledge/topic.md"); assert.equal(result.data.data.content, topic);
    assert.equal(result.data.data.bytes, Buffer.byteLength(topic)); assert.match(result.data.data.contentHash, /^[a-f0-9]{64}$/);
    assert.equal(result.data.data.dateSource, "frontmatter"); assert.ok(!result.stdout.includes(root));
  });
});

test("local search retains every repeated query token and applies the explicit limit", async t => {
  const fetch = t.mock.method(globalThis, "fetch", () => { throw new Error("private_network_forbidden"); });
  await fixture(async ({ root }) => {
    const result = await capture(["local", "search", "needle", "--root", root, "needle", "--limit", "1"]);
    assert.equal(result.code, 0); assert.equal(result.data.schemaVersion, "vafs-local-search-v1");
    assert.equal(result.data.query, "needle needle"); assert.equal(result.data.data.length, 1);
    assert.equal(result.data.data[0].path, "knowledge/topic.md"); assert.ok(!result.stdout.includes(root));
  });
  assert.equal(fetch.mock.callCount(), 0);
});

test("raw documents remain opt-in for index and get", async () => {
  await fixture(async ({ root }) => {
    const ordinary = await capture(["local", "index", "--root", root]);
    assert.ok(!ordinary.data.documents.some(document => document.path.startsWith("raw/")));
    const included = await capture(["local", "index", "--root", root, "--include-raw"]);
    assert.ok(included.data.documents.some(document => document.path === "raw/intake.md"));
    const refused = await capture(["local", "get", "raw/intake.md", "--root", root]);
    assert.equal(refused.code, 1); assert.match(refused.error.error, /^local_/);
    assert.ok(!refused.stderr.includes("private raw"));
    const allowed = await capture(["local", "get", "raw/intake.md", "--root", root, "--include-raw"]);
    assert.equal(allowed.code, 0); assert.equal(allowed.data.data.path, "raw/intake.md");
  });
});

test("local root is mandatory and argument errors never consult remote settings", async t => {
  const fetch = t.mock.method(globalThis, "fetch", () => { throw new Error("private_network_forbidden"); });
  for (const args of [["local", "index"], ["local", "search", "private-query"], ["local", "get", "private-path"]]) {
    const result = await capture(args);
    assert.equal(result.code, 1); assert.deepEqual(result.error, { error: "local_root_required" });
    assert.equal(result.stdout, ""); assert.ok(!result.stderr.includes("private-query")); assert.ok(!result.stderr.includes("private-path"));
  }
  assert.equal(fetch.mock.callCount(), 0);
});

test("sequential flag parsing rejects unknown, repeated, missing and command-inapplicable flags", async () => {
  const cases = [
    [["local", "index", "--unknown-private"], "cli_unknown_flag"],
    [["local", "index", "--root", "private-root", "--root", "private-root"], "cli_duplicate_flag"],
    [["local", "index", "--root"], "cli_flag_value_required"],
    [["local", "get", "page.md", "--root", "private-root", "--output", "private-file"], "cli_unsupported_flag"],
    [["local", "index", "--root", "private-root", "extra-private"], "cli_unexpected_argument"]
  ];
  for (const [args, error] of cases) {
    const result = await capture(args);
    assert.equal(result.code, 1); assert.deepEqual(result.error, { error }); assert.equal(result.stdout, "");
    assert.ok(!result.stderr.includes("private"));
  }
});

test("local limit rejects noncanonical or out-of-range values before retrieval", async () => {
  for (const limit of ["0", "101", "-1", "01", "NaN"]) {
    const result = await capture(["local", "search", "private-query", "--root", "private-root", "--limit", limit]);
    assert.equal(result.code, 1); assert.deepEqual(result.error, { error: "local_limit_invalid" }); assert.ok(!result.stderr.includes("private"));
  }
});

test("local get rejects traversal and symlink documents without disclosing outside content", async () => {
  await fixture(async ({ directory, root }) => {
    await writeFile(join(directory, "outside.md"), "private-outside-source");
    await symlink(join(directory, "outside.md"), join(root, "knowledge", "outside.md"));
    for (const path of ["../outside.md", "knowledge/outside.md"]) {
      const result = await capture(["local", "get", path, "--root", root]);
      assert.equal(result.code, 1); assert.match(result.error.error, /^local_/);
      assert.ok(!result.stderr.includes("private-outside-source")); assert.ok(!result.stderr.includes(directory));
    }
  });
});

test("explicit index export is private, outside the checkout, stable and never overwrites different data", async () => {
  await fixture(async ({ directory, root }) => {
    const output = join(directory, "index.json");
    const first = await capture(["local", "index", "--root", root, "--output", output]);
    assert.equal(first.code, 0); assert.deepEqual(JSON.parse(await readFile(output, "utf8")), first.data);
    assert.equal((await stat(output)).mode & 0o777, 0o600);
    const repeated = await capture(["local", "index", "--root", root, "--output", output]);
    assert.equal(repeated.code, 0); assert.deepEqual(repeated.data, first.data);
    await writeFile(output, "private-existing-export");
    const refused = await capture(["local", "index", "--root", root, "--output", output]);
    assert.equal(refused.code, 1); assert.deepEqual(refused.error, { error: "local_index_exists" });
    assert.equal(await readFile(output, "utf8"), "private-existing-export"); assert.ok(!refused.stderr.includes("private-existing-export"));
  });
});

test("index output cannot write into the source checkout directly or through a parent symlink", async () => {
  await fixture(async ({ directory, root }) => {
    const alias = join(directory, "source-alias"); await symlink(root, alias, "dir");
    for (const output of [join(root, "index.json"), join(alias, "index.json")]) {
      const result = await capture(["local", "index", "--root", root, "--output", output]);
      assert.equal(result.code, 1); assert.deepEqual(result.error, { error: "local_index_location_invalid" });
    }
    await assert.rejects(access(join(root, "index.json")));
    const missing = await capture(["local", "index", "--root", root, "--output", join(directory, "missing", "index.json")]);
    assert.equal(missing.code, 1); assert.deepEqual(missing.error, { error: "local_index_write_failed" });
  });
});

test("remote health and workspace routes retain GET and bearer behavior without real HTTP", async t => {
  const requests = [];
  t.mock.method(globalThis, "fetch", async (url, options) => { requests.push({ url, options }); return jsonResponse({ data: [] }); });
  for (const command of ["health", "workspaces"]) assert.equal((await capture([command], { VAFS_API_URL: "https://fixture.invalid/", VAFS_TOKEN: "fixture-only-token" })).code, 0);
  assert.deepEqual(requests.map(request => request.url), ["https://fixture.invalid/api/v1/health", "https://fixture.invalid/api/v1/workspaces"]);
  for (const { options } of requests) { assert.equal(options.method, "GET"); assert.equal(options.headers.authorization, "Bearer fixture-only-token"); assert.equal(options.redirect, "error"); assert.ok(options.signal instanceof AbortSignal); }
});

test("remote search preserves the first query token and tokens equal to a workspace flag value", async t => {
  let requested;
  t.mock.method(globalThis, "fetch", async url => { requested = new URL(url); return jsonResponse({ data: [] }); });
  const result = await capture(["search", "workspace", "first", "--workspace", "workspace", "workspace"], { VAFS_API_URL: "https://fixture.invalid" });
  assert.equal(result.code, 0); assert.equal(requested.pathname, "/api/v1/search");
  assert.equal(requested.searchParams.get("q"), "workspace first workspace"); assert.equal(requested.searchParams.get("workspaceId"), "workspace");
});

test("remote get, raw upload, sync and cleanup preserve their HTTP payload surfaces", async t => {
  const requests = [];
  t.mock.method(globalThis, "fetch", async (url, options) => { requests.push({ url: new URL(url), method: options.method, data: options.body === undefined ? undefined : JSON.parse(options.body) }); return jsonResponse({ ok: true }); });
  const env = { VAFS_API_URL: "https://fixture.invalid" };
  for (const args of [["get", "workspace", "knowledge/a", "page.md"], ["raw", "upload", "workspace", "intake.md", "first", "second"], ["sync", "workspace"], ["cleanup", "workspace", "Review", "notes"], ["cleanup", "workspace"]]) assert.equal((await capture(args, env)).code, 0);
  assert.equal(requests[0].method, "GET"); assert.equal(requests[0].url.pathname, "/api/v1/files"); assert.equal(requests[0].url.searchParams.get("path"), "knowledge/a page.md"); assert.equal(requests[0].url.searchParams.get("workspaceId"), "workspace");
  assert.deepEqual(requests.slice(1).map(({ url, method, data }) => ({ path: url.pathname, method, data })), [
    { path: "/api/v1/raw", method: "POST", data: { workspaceId: "workspace", filename: "intake.md", content: "first second" } },
    { path: "/api/v1/sync", method: "POST", data: { workspaceId: "workspace" } },
    { path: "/api/v1/cleanup-runs", method: "POST", data: { workspaceId: "workspace", objective: "Review notes" } },
    { path: "/api/v1/cleanup-runs", method: "POST", data: { workspaceId: "workspace" } }
  ]);
});

test("remote failures return nonzero fixed errors without raw server bodies or tokens", async t => {
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => { calls += 1; return jsonResponse({ error: "private-body-and-token" }, 403); });
  const result = await capture(["health"], { VAFS_API_URL: "https://fixture.invalid", VAFS_TOKEN: "private-body-and-token" });
  assert.equal(result.code, 1); assert.equal(result.stdout, ""); assert.deepEqual(result.error, { error: "cli_remote_http_error", status: 403 });
  assert.ok(!result.stderr.includes("private-body-and-token")); assert.equal(calls, 1);
});

test("invalid remote URLs, JSON, oversized bodies and transport failures stay bounded and safe", async t => {
  let calls = 0;
  const fetch = t.mock.method(globalThis, "fetch", async () => { calls += 1; throw new Error("private-network-error"); });
  for (const endpoint of ["relative", "https://user:private@fixture.invalid", "https://fixture.invalid/?private", "https://fixture.invalid/#private"]) {
    const result = await capture(["health"], { VAFS_API_URL: endpoint });
    assert.equal(result.code, 1); assert.deepEqual(result.error, { error: "cli_remote_endpoint_invalid" }); assert.ok(!result.stderr.includes("private"));
  }
  assert.equal(calls, 0);
  const disconnected = await capture(["health"], { VAFS_API_URL: "https://fixture.invalid" });
  assert.deepEqual(disconnected.error, { error: "cli_remote_unavailable" }); assert.ok(!disconnected.stderr.includes("private-network-error"));
  fetch.mock.mockImplementation(async () => new Response("{private", { headers: { "content-type": "application/json" } }));
  assert.deepEqual((await capture(["health"], { VAFS_API_URL: "https://fixture.invalid" })).error, { error: "cli_remote_json_invalid" });
  fetch.mock.mockImplementation(async () => jsonResponse({}, 200, { "content-length": String(4 * 1024 * 1024 + 1) }));
  assert.deepEqual((await capture(["health"], { VAFS_API_URL: "https://fixture.invalid" })).error, { error: "cli_remote_response_limit" });
  let sent = 0, cancelled = 0;
  const chunk = new Uint8Array(1024 * 1024);
  const stream = new ReadableStream({ pull(controller) { if (sent++ < 5) controller.enqueue(chunk); else controller.close(); }, cancel() { cancelled += 1; } }, { highWaterMark: 0 });
  fetch.mock.mockImplementation(async () => new Response(stream, { headers: { "content-type": "application/json" } }));
  assert.deepEqual((await capture(["health"], { VAFS_API_URL: "https://fixture.invalid" })).error, { error: "cli_remote_response_limit" });
  assert.equal(cancelled, 1);
  const deadline = new AbortController();
  const timeout = t.mock.method(AbortSignal, "timeout", () => deadline.signal);
  fetch.mock.mockImplementation((_url, options) => new Promise((_resolve, reject) => options.signal.addEventListener("abort", () => reject(new Error("private-timeout-error")), { once: true })));
  const pending = capture(["health"], { VAFS_API_URL: "https://fixture.invalid" }); deadline.abort();
  assert.deepEqual((await pending).error, { error: "cli_remote_timeout" });
  assert.equal(timeout.mock.calls[0].arguments[0], 30000);
});

test("help, unknown commands and literal dash query text have explicit JSON outcomes", async t => {
  const help = await capture([]); assert.equal(help.code, 0); assert.ok(help.data.commands.some(command => command.startsWith("local index")));
  const unknown = await capture(["private-unknown-command"]); assert.equal(unknown.code, 1); assert.deepEqual(unknown.error, { error: "cli_unknown_command" }); assert.ok(!unknown.stderr.includes("private-unknown-command"));
  assert.equal((await capture([""])).code, 1);
  assert.deepEqual((await capture(["local", "private-unknown-command", "--help"])).error, { error: "cli_unknown_command" });
  let query;
  t.mock.method(globalThis, "fetch", async url => { query = new URL(url).searchParams.get("q"); return jsonResponse({ data: [] }); });
  const literal = await capture(["search", "--workspace", "workspace", "--", "--literal", "needle"], { VAFS_API_URL: "https://fixture.invalid" });
  assert.equal(literal.code, 0); assert.equal(query, "--literal needle");
});

test("native entry executes a local get with unusable remote credentials and no loader", async () => {
  await fixture(async ({ root, topic }) => {
    const entry = fileURLToPath(new URL("../../bin/vafs.mjs", import.meta.url));
    const env = { ...process.env, VAFS_API_URL: "not-a-url", VAFS_TOKEN: "private-unused-token" };
    delete env.NODE_OPTIONS; delete env.NODE_PATH;
    const result = await execute(process.execPath, [entry, "local", "get", "knowledge/topic.md", "--root", root], { env, timeout: 20_000, maxBuffer: 4 * 1024 * 1024 });
    const output = JSON.parse(result.stdout);
    assert.equal(output.data.content, topic); assert.equal(output.schemaVersion, "vafs-local-page-v1"); assert.equal(result.stderr, "");
    assert.ok(!result.stdout.includes(root)); assert.ok(!result.stdout.includes("private-unused-token"));
  });
});
