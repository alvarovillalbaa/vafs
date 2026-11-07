#!/usr/bin/env node
// Tier 2: authored disposable files, real Inspector CLI and real vAFS stdio/rg.
// No protocol mock, product helper substitution, private corpus or model call.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { isDeepStrictEqual } from 'node:util';

const BASE = '743e6afe2b1722189f73c3d39a71b8783efdbc18';
const INSPECTOR_SOURCE = '4d3464cb3a6dde609d7b5ac24c440b947eb40f23';
const TITLE = 'official Inspector legacy stdio discovery and retrieval preserve eligible UTF-8 provenance';
const SOURCE_FILES = ['bin/vafs-local-mcp.mjs', ...['mcp', 'corpus', 'retrieval', 'process', 'errors', 'output'].map(name => `bin/local/${name}.mjs`)];
const TOOLS = ['vafs_local_index', 'vafs_local_search', 'vafs_local_get_page'];
const QUERY = 'lighthouse-éclair';
const PAGE = '---\ntitle: "Authored UTF-8 note"\ndescription: "Owned integration fixture."\ndate: 2026-11-07\n---\n# Authored UTF-8 note\n\nMañana, 東京 and café stay byte-exact.\nA literal lighthouse-éclair marker lives here.\n';
const FIXTURES = {
  'README.md': '# Inspector fixture\n\nOwned metadata only.\n',
  'knowledge/reader.md': PAGE,
  'raw/private-note.md': '# Excluded raw fixture\n\nlighthouse-éclair raw-private-sentinel-only\n',
};
const STREAM_LIMIT = 65536, ZIP_LIMIT = 32768, ALL_ZIP_LIMIT = 131072, REPORT_LIMIT = 524288;
const sha = value => createHash('sha256').update(value).digest('hex');
const need = (value, code) => { if (!value) throw new Error(code); };
const finite = error => /^[a-z][a-z0-9_]{0,100}$/.test(error?.message ?? '') ? error.message : 'client_check_failed';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const inside = (parent, child) => child.startsWith(parent + path.sep);
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const report = {
  schemaVersion: 1, sourceCommit: process.env.SOURCE_COMMIT ?? null, canonicalBaseCommit: BASE,
  inspectorSourceReference: { tag: '2.14.0', commit: INSPECTOR_SOURCE,
    qualification: 'Pinned source documentation; installed npm bytes are independently attributed by the outer runner.' },
  status: 'failed', case: { id: 'I01', title: TITLE, accepted: false, error: 'unrun', observations: {} },
  commands: [], errors: [], cleanup: { passed: false, fixtureUnchanged: false, fixtureRemoved: false,
    activeChildren: null, ownedProcessesRemaining: null, uncertain: false, signalsSent: false, failures: [] },
  limits: { workSeconds: 240, cleanupSeconds: 60, stdoutSeconds: 2, cliSeconds: 35,
    streamBytes: STREAM_LIMIT, streamGzipBytes: ZIP_LIMIT, allStreamsGzipBytes: ALL_ZIP_LIMIT, reportBytes: REPORT_LIMIT },
  proofLimits: [
    'One authored integration journey uses five separate real Inspector connect/disconnect invocations, not one persistent client session.',
    'Legacy stdio only. No QMD, hosted API, Next server, browser, account, model, native client registration or full MCP conformance is exercised.',
    'The fixture is authored disposable Markdown, not a personal corpus. Raw exclusion does not establish hosted access control.',
    'CLI output and tool envelopes are original observations. Source, package integrity and full export/Git guards belong to the outer runner.',
    'Scoped Linux ownership observations and group absence do not inventory unrelated host processes. Any harness termination fails acceptance.',
  ],
};
const workEnd = Date.now() + 240000;
let cleanupEnd, root, identity, markerIdentity, nonce, source, packageRoot, fixture, fixtureIdentity, config, clientConfig, env;
let sourceBefore, fixtureBefore, configBefore, clientConfigBefore, totalZip = 0, interrupted = false;
const active = new Set(), observed = new Map(), ancestors = new Map(), handlers = new Map();
for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  const handler = () => { interrupted = true; };
  handlers.set(signal, handler); process.on(signal, handler);
}
function read(file, maximum = 1048576) {
  const before = fs.lstatSync(file);
  need(before.isFile() && !before.isSymbolicLink() && before.size <= maximum, 'file_type_or_bound');
  const fd = fs.openSync(file, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
  try {
    const opened = fs.fstatSync(fd); need(opened.dev === before.dev && opened.ino === before.ino, 'file_identity_changed');
    const bytes = fs.readFileSync(fd), after = fs.fstatSync(fd);
    need(after.dev === before.dev && after.ino === before.ino && after.size === before.size && after.mtimeMs === before.mtimeMs
      && after.ctimeMs === before.ctimeMs && bytes.length === before.size, 'file_changed'); return bytes;
  } finally { fs.closeSync(fd); }
}
function owner() {
  const current = fs.lstatSync(root), marker = fs.lstatSync(path.join(root, '.owner'));
  need(current.isDirectory() && !current.isSymbolicLink() && current.uid === process.getuid() && (current.mode & 0o777) === 0o700
    && current.dev === identity.dev && current.ino === identity.ino && fs.realpathSync(root) === root, 'root_identity_changed');
  need(marker.isFile() && !marker.isSymbolicLink() && marker.uid === process.getuid() && (marker.mode & 0o777) === 0o600
    && marker.dev === markerIdentity.dev && marker.ino === markerIdentity.ino && marker.size === 32
    && read(path.join(root, '.owner'), 32).toString() === nonce, 'root_nonce_changed');
}
function vector(base, names) {
  return names.map(name => {
    const file = path.join(base, name);
    for (let parent = path.dirname(file); parent !== base; parent = path.dirname(parent)) {
      const item = fs.lstatSync(parent); need(item.isDirectory() && !item.isSymbolicLink() && inside(base, parent), 'file_ancestor_changed');
    }
    const bytes = read(file), item = fs.lstatSync(file);
    return { path: name, bytes: bytes.length, sha256: sha(bytes), mode: item.mode & 0o777, dev: item.dev, ino: item.ino };
  });
}
function fixtureGuard() {
  owner(); const info = fs.lstatSync(fixture);
  need(info.isDirectory() && !info.isSymbolicLink() && info.uid === process.getuid() && (info.mode & 0o777) === 0o700
    && info.dev === fixtureIdentity.dev && info.ino === fixtureIdentity.ino, 'fixture_identity_changed');
  const expected = ['README.md', 'knowledge', 'raw'];
  need(isDeepStrictEqual(fs.readdirSync(fixture).sort(), expected)
    && isDeepStrictEqual(fs.readdirSync(path.join(fixture, 'knowledge')), ['reader.md'])
    && isDeepStrictEqual(fs.readdirSync(path.join(fixture, 'raw')), ['private-note.md']), 'fixture_membership_changed');
  need(isDeepStrictEqual(vector(fixture, Object.keys(FIXTURES)), fixtureBefore), 'fixture_bytes_changed');
}
function procRead(file, maximum) {
  const fd = fs.openSync(file, 'r');
  try { const bytes = Buffer.alloc(maximum + 1), count = fs.readSync(fd, bytes, 0, bytes.length, 0); need(count <= maximum, 'proc_read_bound'); return bytes.subarray(0, count); }
  finally { fs.closeSync(fd); }
}
function processInfo(pid) {
  const base = `/proc/${pid}`, stat = fs.statSync(base);
  if (stat.uid !== process.getuid()) return null;
  const raw = procRead(path.join(base, 'stat'), 8192).toString(), end = raw.lastIndexOf(')');
  need(end > 0, 'proc_stat_shape'); const fields = raw.slice(end + 2).trim().split(/\s+/);
  need(fields.length >= 20 && /^\d+$/.test(fields[19]) && /^\d+$/.test(fields[1]) && /^\d+$/.test(fields[2]), 'proc_stat_shape');
  let args = [], cwd = '';
  try { args = procRead(path.join(base, 'cmdline'), 65536).toString().split('\0').filter(Boolean); cwd = fs.readlinkSync(path.join(base, 'cwd')); }
  catch (error) { if (fields[0] !== 'Z') throw error; }
  const after = procRead(path.join(base, 'stat'), 8192).toString(), close = after.lastIndexOf(')');
  need(close > 0 && after.slice(close + 2).trim().split(/\s+/)[19] === fields[19], 'proc_identity_changed');
  return { pid, uid: stat.uid, ppid: Number(fields[1]), pgid: Number(fields[2]), starttime: fields[19], state: fields[0],
    owned: cwd === root || inside(root, cwd) || args.some(arg => arg === root || inside(root, arg)),
    executable: args[0] ? path.basename(args[0]).slice(0, 80) : 'unavailable' };
}
function scan() {
  const names = fs.readdirSync('/proc').filter(value => /^\d+$/.test(value)); need(names.length <= 8192, 'proc_inventory_bound');
  const rows = [];
  for (const name of names) {
    const pid = Number(name); if (pid === process.pid) continue;
    try {
      const item = processInfo(pid); if (!item || ancestors.get(pid) === item.starttime) continue;
      const key = `${pid}:${item.starttime}`;
      if (!item.owned && !observed.has(key)) continue;
      if (!observed.has(key)) observed.set(key, { ...item, firstSeenAt: Date.now() });
      need(observed.size <= 64, 'owned_process_inventory_bound'); rows.push(item);
    } catch (error) {
      if (error.code === 'ENOENT' || error.code === 'ESRCH') continue;
      if ([...observed.values()].some(item => item.pid === pid)) report.cleanup.uncertain = true;
    }
  }
  return rows;
}
function groupAbsent(pgid) {
  try { process.kill(-pgid, 0); return false; } catch (error) { return error.code === 'ESRCH' ? true : null; }
}
function signalRows(rows, signal) {
  for (const item of rows) {
    try {
      const fresh = processInfo(item.pid);
      if (!fresh) continue;
      need(fresh.uid === item.uid && fresh.starttime === item.starttime && fresh.owned, 'signal_identity_unverified');
      process.kill(item.pid, signal); report.cleanup.signalsSent = true;
      (report.cleanup.signals ??= []).push({ pid: item.pid, starttime: item.starttime, signal });
    } catch (error) { if (error.code !== 'ENOENT' && error.code !== 'ESRCH') report.cleanup.uncertain = true; }
  }
}
function refresh(control) {
  const row = control.row;
  row.exitObservedAndReaped = control.exited; row.closeObserved = control.closed; row.pipesEOF = [...control.eof]; row.descriptorsClosed = [...control.pipeClosed];
  row.originalProcessGroupAbsent = control.child.pid ? groupAbsent(control.child.pid) : null;
  row.released = control.exited && control.closed && control.eof.every(Boolean) && control.pipeClosed.every(Boolean)
    && row.originalProcessGroupAbsent === true && !row.forcedDrain;
  if (row.released) active.delete(control);
}
function capture(bytes, observedBytes, observedSha256, complete) {
  const zip = gzipSync(bytes); totalZip += zip.length;
  return { encoding: 'gzip-base64', bytes: bytes.length, sha256: sha(bytes), compressedBytes: zip.length,
    data: zip.toString('base64'), observedBytes, observedSha256, complete };
}
async function cli(label, method, extra = []) {
  owner(); fixtureGuard(); need(!interrupted && workEnd - Date.now() >= 35000, 'cli_window_unavailable');
  const launcher = path.join(packageRoot, 'clients/launcher/build/index.js');
  const args = [launcher, '--cli', '--config', config, '--server', 'vafs-integration', '--protocol-era', 'legacy', '--method', method, '--format', 'json', ...extra];
  const started = Date.now(), child = spawn(process.execPath, args, { cwd: fixture, env, detached: true, shell: false, stdio: ['ignore', 'pipe', 'pipe'] });
  const row = { label, method, startedAt: started, exitCode: null, signal: null, stopReason: null, forcedDrain: false, streams: [], accepted: false };
  report.commands.push(row);
  const control = { child, row, exited: false, closed: false, eof: [false, false], pipeClosed: [false, false] }; active.add(control);
  const chunks = [[], []], counts = [0, 0], kept = [0, 0], hashes = [createHash('sha256'), createHash('sha256')], streamErrors = [false, false];
  let stoppedAt = null, killed = false, lastScan = 0, leaderClosedAt = null, captureFinished = false;
  const stop = code => { if (!row.stopReason) { row.stopReason = code; stoppedAt = Date.now(); signalRows(scan(), 'SIGTERM'); } };
  child.once('error', () => { row.stopReason = 'spawn_failed'; stoppedAt ??= Date.now(); });
  child.once('exit', (code, signal) => { control.exited = true; row.exitCode = code; row.signal = signal; });
  child.once('close', () => { control.closed = true; });
  [child.stdout, child.stderr].forEach((stream, index) => {
    stream.once('end', () => { control.eof[index] = true; }); stream.once('close', () => { control.pipeClosed[index] = true; });
    stream.once('error', () => { streamErrors[index] = true; });
    stream.on('data', bytes => {
      if (captureFinished) return;
      counts[index] += bytes.length; hashes[index].update(bytes);
      const part = bytes.subarray(0, Math.max(0, STREAM_LIMIT - kept[index])); chunks[index].push(part); kept[index] += part.length;
      if (counts[index] > STREAM_LIMIT) stop('output_limit');
    });
  });
  while (true) {
    const now = Date.now(); if (now - lastScan >= 50) { scan(); lastScan = now; }
    refresh(control); if (row.released) break;
    if (interrupted) stop('interrupted');
    if (now - started >= 25000 || now >= workEnd) stop('cli_deadline');
    if (control.closed && leaderClosedAt === null) leaderClosedAt = now;
    if (leaderClosedAt !== null && now - leaderClosedAt >= 2000 && row.originalProcessGroupAbsent !== true) stop('cli_group_remaining');
    if (stoppedAt !== null && now - stoppedAt >= 3000 && !killed) { killed = true; signalRows(scan(), 'SIGKILL'); }
    if (now - started >= 35000) {
      row.forcedDrain = !control.closed || !control.eof.every(Boolean) || !control.pipeClosed.every(Boolean);
      if (row.forcedDrain) { child.stdout.destroy(); child.stderr.destroy(); } break;
    }
    await sleep(25);
  }
  refresh(control); captureFinished = true; const output = chunks.map(parts => Buffer.concat(parts));
  row.durationMs = Date.now() - started;
  row.streams = output.map((bytes, index) => ({ name: index ? 'stderr' : 'stdout', ...capture(bytes, counts[index], hashes[index].digest('hex'),
    control.eof[index] && control.pipeClosed[index] && counts[index] === bytes.length && !streamErrors[index] && !row.forcedDrain) }));
  try { row.json = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(output[0])); }
  catch { row.jsonError = 'stdout_not_single_utf8_json'; }
  need(row.streams.every(item => item.compressedBytes <= ZIP_LIMIT) && totalZip <= ALL_ZIP_LIMIT, 'capture_gzip_limit');
  row.accepted = row.exitCode === 0 && row.signal === null && row.stopReason === null && row.released && row.streams.every(item => item.complete)
    && !report.cleanup.signalsSent && !report.cleanup.uncertain;
  need(row.accepted, label + '_cli_failed'); need(!row.jsonError && record(row.json) && Object.keys(row.json).length === 1 && record(row.json.result), label + '_json_invalid');
  return row.json.result;
}
function envelope(result, schema) {
  need(result.isError === false && record(result.structuredContent) && result.structuredContent.schemaVersion === schema
    && Array.isArray(result.content) && result.content.length === 1 && result.content[0].type === 'text'
    && typeof result.content[0].text === 'string', 'tool_envelope_invalid');
  need(isDeepStrictEqual(JSON.parse(result.content[0].text), result.structuredContent), 'tool_envelope_text_mismatch'); return result.structuredContent;
}
try {
  need(process.platform === 'linux' && process.version === 'v26.13.0' && process.env.CI === 'true'
    && /^[a-f0-9]{40}$/.test(report.sourceCommit ?? ''), 'approved_ci_profile_required');
  need(typeof process.env.HOME === 'string' && path.isAbsolute(process.env.HOME), 'original_home_required');
  root = fs.realpathSync(process.env.VAFS_INSPECTOR_RUN_ROOT ?? ''); nonce = process.env.VAFS_INSPECTOR_NONCE;
  need(root === process.env.VAFS_INSPECTOR_RUN_ROOT && /^[a-f0-9]{32}$/.test(nonce ?? ''), 'root_scope_invalid');
  identity = fs.lstatSync(root); markerIdentity = fs.lstatSync(path.join(root, '.owner')); owner();
  source = fs.realpathSync(process.env.VAFS_INSPECTOR_SOURCE_ROOT ?? ''); packageRoot = fs.realpathSync(process.env.VAFS_INSPECTOR_PACKAGE_ROOT ?? '');
  need(inside(root, source) && inside(root, packageRoot), 'source_or_package_outside_owned_root');
  const packageBytes = read(path.join(packageRoot, 'package.json'), 65536), pkg = JSON.parse(packageBytes);
  need(pkg.name === '@modelcontextprotocol/inspector' && pkg.version === '2.14.0', 'inspector_version_mismatch');
  const launcher = path.join(packageRoot, 'clients/launcher/build/index.js');
  report.runtime = { node: process.version, inspector: pkg.version, packageJsonSha256: sha(packageBytes), launcherSha256: sha(read(launcher, 4194304)) };
  sourceBefore = vector(source, SOURCE_FILES); report.sourceFiles = sourceBefore;
  for (let pid = process.ppid, depth = 0; pid > 1 && depth < 64; depth++) {
    const item = processInfo(pid); if (!item) break; ancestors.set(pid, item.starttime); pid = item.ppid;
  }
  need(scan().length === 0, 'owned_processes_preexisting');
  const work = path.join(root, 'inspector-client'); fs.mkdirSync(work, { mode: 0o700 });
  fixture = path.join(work, 'corpus'); fs.mkdirSync(fixture, { mode: 0o700 }); fixtureIdentity = fs.lstatSync(fixture);
  for (const name of ['knowledge', 'raw']) fs.mkdirSync(path.join(fixture, name), { mode: 0o700 });
  for (const [name, text] of Object.entries(FIXTURES)) fs.writeFileSync(path.join(fixture, name), text, { flag: 'wx', mode: 0o600 });
  fixtureBefore = vector(fixture, Object.keys(FIXTURES)); report.fixtureFiles = fixtureBefore;
  const state = path.join(work, 'state'); fs.mkdirSync(state, { mode: 0o700 });
  clientConfig = path.join(state, 'client.json'); fs.writeFileSync(clientConfig, '{}\n', { flag: 'wx', mode: 0o600 }); clientConfigBefore = sha(read(clientConfig));
  const nodeBin = path.dirname(process.execPath), inheritedPaths = String(process.env.PATH ?? '').split(path.delimiter);
  const toolPaths = inheritedPaths.filter(dir => path.isAbsolute(dir) && (dir === nodeBin || inside(root, dir) || ['/usr/local/bin', '/usr/bin', '/bin'].includes(dir)));
  const filesystem = { PATH: [...new Set([nodeBin, ...toolPaths, '/usr/local/bin', '/usr/bin', '/bin'])].join(path.delimiter), HOME: process.env.HOME,
    LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8', TZ: 'UTC', TMPDIR: path.join(root, 'tmp'), TMP: path.join(root, 'tmp'), TEMP: path.join(root, 'tmp'),
    XDG_CONFIG_HOME: path.join(root, 'config'), XDG_DATA_HOME: path.join(root, 'data'), XDG_STATE_HOME: path.join(root, 'state'), XDG_CACHE_HOME: path.join(root, 'cache') };
  for (const name of ['tmp', 'config', 'data', 'state', 'cache']) {
    const item = fs.lstatSync(path.join(root, name)); need(item.isDirectory() && !item.isSymbolicLink() && item.uid === process.getuid(), 'owned_runtime_directory_required');
  }
  env = { ...filesystem, CI: 'true', NO_COLOR: '1', NODE_COMPILE_CACHE: path.join(root, 'cache', 'node'), MCP_STORAGE_DIR: state,
    MCP_INSPECTOR_OAUTH_STATE_PATH: path.join(state, 'oauth.json'), MCP_CLIENT_CONFIG_PATH: clientConfig,
    MCP_INSPECTOR_SECRET_FILE: path.join(state, 'secrets.json'), MCP_INSPECTOR_SECRET_STORE: 'memory', MCP_INSPECTOR_PERSIST_TOKENS: 'none', MCP_AUTO_OPEN_ENABLED: 'false' };
  config = path.join(work, 'mcp.json');
  fs.writeFileSync(config, JSON.stringify({ mcpServers: { 'vafs-integration': { type: 'stdio', protocolEra: 'legacy', command: process.execPath,
    args: [path.join(source, 'bin/vafs-local-mcp.mjs'), '--root', fixture], cwd: fixture, env: filesystem, connectionTimeout: 10000, requestTimeout: 10000 } } }) + '\n', { flag: 'wx', mode: 0o600 });
  configBefore = sha(read(config)); report.configuration = { readOnly: true, sha256: configBefore, mode: fs.lstatSync(config).mode & 0o777,
    transport: 'stdio', protocolEra: 'legacy', secretStore: 'memory', automaticBrowserOpen: false, inheritedHome: true,
    clientEnvironmentKeys: Object.keys(env).sort(), serverEnvironmentKeys: Object.keys(filesystem).sort() };
  const init = await cli('initialize', 'initialize');
  need(init.protocolVersion === '2025-11-25' && isDeepStrictEqual(init.serverInfo, { name: 'vafs-local', version: '0.1.0' })
    && isDeepStrictEqual(init.capabilities, { tools: {} }), 'initialize_identity_mismatch');
  report.case.observations.initialization = { protocolVersion: init.protocolVersion, serverInfo: init.serverInfo, capabilities: init.capabilities };
  const listed = await cli('tools_list', 'tools/list');
  need(Array.isArray(listed.tools) && isDeepStrictEqual(listed.tools.map(tool => tool.name), TOOLS)
    && listed.tools.every(tool => tool.inputSchema?.type === 'object' && tool.inputSchema.additionalProperties === false
      && tool.annotations?.readOnlyHint === true && tool.annotations.destructiveHint === false && tool.annotations.openWorldHint === false), 'tool_discovery_mismatch');
  report.case.observations.tools = listed.tools.map(tool => tool.name);
  const index = envelope(await cli('index', 'tools/call', ['--tool-name', TOOLS[0], '--tool-args-json', '{}']), 'vafs-local-index-v1');
  const paths = ['README.md', 'knowledge/reader.md'], eligibleBytes = paths.reduce((sum, name) => sum + Buffer.byteLength(FIXTURES[name]), 0), rootId = sha(fixture);
  need(index.source?.kind === 'local_checkout' && index.source.rootId === rootId && Array.isArray(index.documents)
    && isDeepStrictEqual(index.documents.map(item => item.path), paths) && index.meta?.documents === 2 && index.meta.bytes === eligibleBytes
    && Array.isArray(index.skipped) && index.skipped.length === 0, 'index_membership_mismatch');
  for (const item of index.documents) need(!Object.hasOwn(item, 'content') && item.bytes === Buffer.byteLength(FIXTURES[item.path]) && item.contentHash === sha(FIXTURES[item.path]), 'index_provenance_mismatch');
  report.case.observations.index = { documents: 2, bytes: eligibleBytes, paths, rootId, rawExcluded: true, bodyTextExcluded: true };
  const search = envelope(await cli('search', 'tools/call', ['--tool-name', TOOLS[1], '--tool-args-json', JSON.stringify({ query: QUERY, limit: 10 })]), 'vafs-local-search-v1');
  const pageBytes = Buffer.from(PAGE), start = pageBytes.indexOf(Buffer.from(QUERY));
  need(search.query === QUERY && search.source?.rootId === rootId && search.source.kind === 'local_checkout'
    && search.meta?.documents === 2 && search.meta.bytes === eligibleBytes && search.meta.legs?.rg?.status === 'ok'
    && search.meta.legs.metadata?.status === 'ok' && search.meta.legs.qmd?.status === 'disabled'
    && Array.isArray(search.data) && search.data.length === 1 && search.data[0].path === 'knowledge/reader.md', 'search_scope_mismatch');
  const match = search.data[0]; need(match.bytes === pageBytes.length && match.contentHash === sha(pageBytes) && match.modes.includes('grep')
    && Array.isArray(match.matches) && match.matches.length === 1 && match.matches[0].text === QUERY
    && match.matches[0].byteStart === start && match.matches[0].byteEnd === start + Buffer.byteLength(QUERY)
    && match.matches[0].line === pageBytes.subarray(0, start).toString().split('\n').length && match.matches[0].excerpt.includes(QUERY), 'search_byte_provenance_mismatch');
  need(!JSON.stringify(index).includes('raw-private-sentinel-only') && !JSON.stringify(search).includes('raw-private-sentinel-only'), 'raw_fixture_disclosed');
  report.case.observations.search = { path: match.path, query: QUERY, bytes: match.bytes, sha256: match.contentHash, matches: match.matches, qmd: 'disabled', rawExcluded: true };
  const get = envelope(await cli('get', 'tools/call', ['--tool-name', TOOLS[2], '--tool-args-json', JSON.stringify({ path: 'knowledge/reader.md' })]), 'vafs-local-page-v1');
  need(get.data?.path === 'knowledge/reader.md' && get.data.content === PAGE && get.data.bytes === pageBytes.length && get.data.contentHash === sha(pageBytes)
    && Buffer.from(get.data.content).equals(pageBytes), 'get_utf8_bytes_mismatch');
  report.case.observations.get = { path: get.data.path, bytes: pageBytes.length, sha256: sha(pageBytes), exactUtf8: true };
  report.case.observations.separateCliSessions = 5;
  need(report.commands.length === 5 && report.commands.every(row => row.accepted), 'five_cli_sessions_required');
  report.case.accepted = true; report.case.error = null;
} catch (error) { report.case.error = finite(error); report.errors.push(finite(error)); }
finally {
  cleanupEnd = Date.now() + 60000;
  if (root && identity && markerIdentity) {
    try {
      let rows = scan(), started = Date.now();
      while (rows.length && Date.now() - started < 2000) { await sleep(50); rows = scan(); }
      if (rows.length) { signalRows(rows, 'SIGTERM'); const end = Date.now() + 3000; while (rows.length && Date.now() < end) { await sleep(50); rows = scan(); } }
      if (rows.length) { signalRows(rows, 'SIGKILL'); const end = Date.now() + 3000; while (rows.length && Date.now() < end) { await sleep(50); rows = scan(); } }
      const drainEnd = Math.min(Date.now() + 6000, cleanupEnd);
      while (active.size && Date.now() < drainEnd) { for (const control of active) refresh(control); if (active.size) await sleep(25); }
      for (const control of active) refresh(control);
      report.cleanup.activeChildren = active.size; report.cleanup.ownedProcessesRemaining = scan().length;
      report.cleanup.groups = [...new Set([...observed.values()].map(row => row.pgid))].map(pgid => ({ pgid, absent: groupAbsent(pgid) }));
      report.cleanup.observedProcesses = [...observed.values()];
      need(active.size === 0 && report.cleanup.ownedProcessesRemaining === 0 && !report.cleanup.uncertain
        && report.cleanup.groups.every(row => row.absent === true), 'process_closure_unverified');
      if (sourceBefore) need(isDeepStrictEqual(vector(source, SOURCE_FILES), sourceBefore), 'runtime_source_changed');
      if (fixtureBefore) {
        fixtureGuard(); report.cleanup.fixtureUnchanged = true;
        if (configBefore) need(sha(read(config)) === configBefore && (fs.lstatSync(config).mode & 0o777) === 0o600, 'readonly_config_changed');
        if (clientConfigBefore) need(sha(read(clientConfig)) === clientConfigBefore, 'client_config_changed');
        for (const name of Object.keys(FIXTURES)) fs.unlinkSync(path.join(fixture, name));
        fs.rmdirSync(path.join(fixture, 'knowledge')); fs.rmdirSync(path.join(fixture, 'raw')); fs.rmdirSync(fixture);
        report.cleanup.fixtureRemoved = !fs.existsSync(fixture);
      }
      report.cleanup.passed = report.cleanup.fixtureUnchanged && report.cleanup.fixtureRemoved && !report.cleanup.signalsSent;
    } catch (error) { report.cleanup.failures.push(finite(error)); }
  }
  if (interrupted) report.errors.push('interrupted');
  if (Date.now() > workEnd + 60000) report.errors.push('global_deadline');
  if (!report.cleanup.passed || report.cleanup.failures.length || report.cleanup.signalsSent) report.errors.push('resource_cleanup_unverified');
  report.status = report.case.accepted && report.errors.length === 0 && report.cleanup.passed ? 'passed' : 'failed';
  if (report.status === 'failed' && report.case.accepted) { report.case.accepted = false; report.case.error = 'late_resource_failure'; }
  let output = JSON.stringify(report);
  if (Buffer.byteLength(output) > REPORT_LIMIT) { report.status = 'failed'; output = JSON.stringify({ schemaVersion: 1, sourceCommit: report.sourceCommit, status: 'failed', errors: ['report_limit'] }); }
  const timer = setTimeout(() => process.exit(1), 2000);
  process.stdout.write('VAFS_INSPECTOR_CLIENT_RESULT=' + output + '\n', () => {
    clearTimeout(timer); for (const [signal, handler] of handlers) process.removeListener(signal, handler);
    process.exit(report.status === 'passed' ? 0 : 1);
  });
}
