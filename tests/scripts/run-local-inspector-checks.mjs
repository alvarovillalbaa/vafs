#!/usr/bin/env node
// One actual official Inspector CLI interoperability case; owned public CI only.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { gzipSync, gunzipSync } from 'node:zlib';
import { isDeepStrictEqual } from 'node:util';
const REPOSITORY = 'alvarovillalbaa/vafs';
const BRANCH = 'refs/heads/qa/vafs-inspector-20261107-1';
const ACTIVE = '.github/workflows/local-inspector-client-1.yml';
const BASE_COMMIT = '743e6afe2b1722189f73c3d39a71b8783efdbc18';
const SPEC = 'tests/integration/local-inspector-client.mjs';
const SPEC_SHA = 'f9672bd0aefcd6e30672f4ba6219e4e9ff04e3416b903139b4602914f0823882';
const TITLE = 'official Inspector legacy stdio discovery and retrieval preserve eligible UTF-8 provenance';
const ADDED = [SPEC, 'tests/scripts/run-local-inspector-checks.mjs', 'tests/README.md',
  'docs/proposals/local-inspector-client-checks.md', 'docs/proposals/local-inspector-client.workflow.yml.example'].sort();
const RUNTIME = ['bin/vafs-local-mcp.mjs', 'bin/local/corpus.mjs', 'bin/local/errors.mjs',
  'bin/local/mcp.mjs', 'bin/local/output.mjs', 'bin/local/process.mjs', 'bin/local/retrieval.mjs'];
const INSPECTOR = { name: '@modelcontextprotocol/inspector', version: '2.14.0',
  resolved: 'https://registry.npmjs.org/@modelcontextprotocol/inspector/-/inspector-2.14.0.tgz',
  integrity: 'sha512-CP3ddu+PHACEA6LkUwrnY2yzZqBiwFZHylU5bst3l1LiNrRfUNn54QNZZ4yecaudctJ9vBollO0AdxhDIslAdg==' };
const STREAM_LIMIT = 524288, REPORT_LIMIT = 2097152, CLIENT_LIMIT = 524288;
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const gitBlob = bytes => createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
const need = (condition, code) => { if (!condition) throw new Error(code); };
const finite = error => /^[a-z0-9_]+$/.test(error?.message ?? '') ? error.message : 'controller_error';
const sourceCommit = process.argv[3];
need(process.argv.length === 4 && process.argv[2] === '--source-commit' && /^[a-f0-9]{40}$/.test(sourceCommit ?? ''), 'source_pin_required');
need(!/^0+$/.test(BASE_COMMIT) && !/^0+$/.test(SPEC_SHA), 'reviewed_preparation_pins_required');
need(process.version === 'v26.13.0' && process.platform === 'linux' && process.arch === 'x64' && process.env.CI === 'true'
  && process.env.GITHUB_ACTIONS === 'true' && process.env.GITHUB_REPOSITORY === REPOSITORY
  && process.env.GITHUB_EVENT_NAME === 'create' && process.env.GITHUB_REF === BRANCH
  && process.env.VAFS_INSPECTOR_PUBLIC_REPOSITORY === 'true', 'approved_public_ci_required');
const event = JSON.parse(read(process.env.GITHUB_EVENT_PATH, 262144));
need(event.ref_type === 'branch' && event.ref === BRANCH.slice('refs/heads/'.length)
  && event.repository?.private === false && event.repository?.full_name === REPOSITORY, 'approved_create_event_required');
const enteredAt = Date.now(), jobStartText = process.env.VAFS_INSPECTOR_JOB_STARTED_MS;
need(/^\d{13}$/.test(jobStartText ?? ''), 'job_start_timestamp_required');
const jobStartedAt = Number(jobStartText);
need(Number.isSafeInteger(jobStartedAt) && jobStartedAt <= enteredAt && enteredAt - jobStartedAt < 1200000, 'job_start_timestamp_invalid');
const admittedWorkEnd = Math.min(enteredAt + 1020000, jobStartedAt + 1200000 - 90000 - 30000);
need(admittedWorkEnd - enteredAt >= 317000, 'job_entry_window_unavailable');
const repo = fs.realpathSync(process.cwd()), parent = fs.realpathSync(process.env.RUNNER_TEMP ?? '');
need(path.isAbsolute(parent) && fs.statSync(parent).isDirectory(), 'runner_temp_invalid');
need(typeof process.env.HOME === 'string' && path.isAbsolute(process.env.HOME) && fs.statSync(process.env.HOME).isDirectory(), 'original_home_required');
need(Buffer.byteLength(path.join(parent, 'vi-XXXXXX')) <= 60, 'scratch_path_budget');
const root = fs.mkdtempSync(path.join(parent, 'vi-'));
fs.chmodSync(root, 0o700);
const identity = fs.lstatSync(root), nonce = randomUUID().replaceAll('-', '');
need(identity.uid === process.getuid(), 'scratch_owner_invalid');
fs.writeFileSync(path.join(root, '.owner'), nonce, { flag: 'wx', mode: 0o600 });
for (const name of ['tools', 'tmp', 'cache', 'config', 'data', 'state', 'source']) fs.mkdirSync(path.join(root, name), { mode: 0o700 });
for (const name of ['npm-user', 'npm-global']) fs.writeFileSync(path.join(root, name), '', { flag: 'wx', mode: 0o600 });
const tools = path.join(root, 'tools'), exported = path.join(root, 'source'), specFile = path.join(tools, 'local-inspector-client.mjs');
const env = {
  PATH: `${path.dirname(process.execPath)}:/usr/bin:/bin:/usr/local/bin:/usr/sbin:/sbin`,
  HOME: process.env.HOME, LANG: 'C.UTF-8', TZ: 'UTC', CI: 'true', NO_COLOR: '1',
  TMPDIR: path.join(root, 'tmp'), TMP: path.join(root, 'tmp'), TEMP: path.join(root, 'tmp'),
  XDG_CACHE_HOME: path.join(root, 'cache'), XDG_CONFIG_HOME: path.join(root, 'config'),
  XDG_DATA_HOME: path.join(root, 'data'), XDG_STATE_HOME: path.join(root, 'state'),
  NODE_COMPILE_CACHE: path.join(root, 'cache', 'node'),
  npm_config_userconfig: path.join(root, 'npm-user'), npm_config_globalconfig: path.join(root, 'npm-global'),
  npm_config_cache: path.join(root, 'cache', 'npm'), npm_config_registry: 'https://registry.npmjs.org/',
  npm_config_audit: 'false', npm_config_fund: 'false', npm_config_update_notifier: 'false', npm_config_ignore_scripts: 'true',
  GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null', GIT_TERMINAL_PROMPT: '0', GIT_OPTIONAL_LOCKS: '0',
  VAFS_INSPECTOR_SOURCE_ROOT: exported, VAFS_INSPECTOR_PACKAGE_ROOT: path.join(tools, 'node_modules', INSPECTOR.name),
  VAFS_INSPECTOR_RUN_ROOT: root, VAFS_INSPECTOR_NONCE: nonce, SOURCE_COMMIT: sourceCommit,
};
const report = {
  schemaVersion: 'vafs.local-inspector-client.v1', sourceCommit, canonicalBaseCommit: BASE_COMMIT,
  status: 'failed', startedAtUtc: new Date().toISOString(),
  runtime: { node: process.version, platform: process.platform, architecture: process.arch },
  scope: { cases: 1, identities: [{ id: 'I01', title: TITLE }], inspectorCliSessions: 5,
    commands: ['initialize', 'tools/list', 'tools/call:index', 'tools/call:search', 'tools/call:get'],
    retries: 0, workers: 1, appDependencies: false, appBuild: false, browser: false, httpServer: false,
    accounts: false, models: false, realQmd: false, old34Repeated: false, old63Repeated: false },
  limits: { workSeconds: 1020, cleanupSeconds: 90, clientSeconds: 310, jobMinutes: 20,
    streamBytes: STREAM_LIMIT, streamGzipBytes: 131072, allStreamsGzipBytes: 786432,
    clientJsonBytes: CLIENT_LIMIT, reportBytes: REPORT_LIMIT },
  timing: { earliestUserStepAtUtc: new Date(jobStartedAt).toISOString(), controllerEntryAtUtc: new Date(enteredAt).toISOString(),
    setupElapsedMs: enteredAt - jobStartedAt, admittedWorkMs: admittedWorkEnd - enteredAt,
    cleanupReservedMs: 90000, jobOutputAndStartupMarginMs: 30000, workDeadlineAtUtc: new Date(admittedWorkEnd).toISOString() },
  commands: [], guards: [], errors: [], sourceFiles: [],
  proofLimits: [
    'One authored local Markdown case uses five separate real official Inspector2.14.0 legacy stdio CLI sessions, not a persistent GUI session.',
    'No application dependency installation, Next build/server, browser, QMD model/index, hosted account/provider, database or inference is performed.',
    'Inspector and its resolved dependencies are installed only in owned runner storage with all lifecycle scripts disabled; app package and lock are unchanged.',
    'The official npm2.14.0 SRI binds the published archive; source tag4d3464cb3a6dde609d7b5ac24c440b947eb40f23 is documentation provenance, not archive/source byte equivalence.',
    'The old34 MCP and63 local-reader checks remain separate historical evidence and are not rerun or carried as this case.',
    'Full native checkout guards and seven byte-exact exported modules bind source; scoped UID/PID/starttime/group/EOF guards establish owned cleanup, not host-wide inventory.',
    'The earliest user-step timestamp includes checkout/Node/apt setup in the job budget. Earlier GitHub runner setup and any external kill remain infrastructure boundaries; teardown after external termination is not guaranteed.',
  ],
};
const workEnd = admittedWorkEnd;
let cleanupEnd, interrupted = false, globalExpired = false, baseline, baseTree, allGzip = 0, ownedAttempted = false;
let scanUncertain = false, lastScan = 0, exportManifest, exportIdentity, npm;
const ownedProcesses = new Map(), active = new Set(), handlers = new Map();
for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  const handler = () => { interrupted = true; for (const child of active) child.stop('interrupted'); };
  handlers.set(signal, handler); process.on(signal, handler);
}
const globalTimer = setTimeout(() => { globalExpired = true; for (const child of active) child.stop('global_deadline'); }, Math.max(1, workEnd + 90000 - Date.now()));
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
function owner() {
  const current = fs.lstatSync(root), marker = fs.lstatSync(path.join(root, '.owner'));
  need(path.dirname(root) === parent && current.isDirectory() && !current.isSymbolicLink() && current.dev === identity.dev && current.ino === identity.ino
    && current.uid === process.getuid() && (current.mode & 0o777) === 0o700 && marker.isFile() && !marker.isSymbolicLink()
    && marker.uid === process.getuid() && (marker.mode & 0o777) === 0o600 && marker.size === 32
    && fs.readFileSync(path.join(root, '.owner'), 'utf8') === nonce, 'scratch_identity_changed');
}
function read(file, maximum = 16777216) {
  const before = fs.lstatSync(file); need(before.isFile() && !before.isSymbolicLink() && before.size <= maximum, 'file_type_or_bound');
  const bytes = fs.readFileSync(file), after = fs.lstatSync(file);
  need(before.dev === after.dev && before.ino === after.ino && before.size === after.size && before.mtimeMs === after.mtimeMs
    && before.ctimeMs === after.ctimeMs && bytes.length === before.size, 'file_changed'); return bytes;
}
function scrub(value, maximum = 700) {
  let text = String(value ?? '').replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '');
  for (const [from, to] of [[root, '[scratch]'], [repo, '[repository]'], [process.env.HOME, '[runner-home]']]) if (from) text = text.split(from).join(to);
  return Buffer.from(text).subarray(0, maximum).toString('utf8');
}
function compressed(bytes, maximum = 131072) {
  const zip = gzipSync(bytes); need(zip.length <= maximum, 'raw_gzip_limit');
  return { encoding: 'gzip-base64', bytes: bytes.length, sha256: sha(bytes), compressedBytes: zip.length, data: zip.toString('base64') };
}
function groupAbsent(pid) { try { process.kill(-pid, 0); return false; } catch (error) { return error.code === 'ESRCH' ? true : null; } }
function proc(pid) {
  const base = `/proc/${pid}`, item = fs.statSync(base);
  if (item.uid !== process.getuid()) return null;
  const before = readProc(path.join(base, 'stat'), 8192).toString(), close = before.lastIndexOf(')');
  need(close > 0, 'proc_stat_shape');
  const fields = before.slice(close + 2).trim().split(/\s+/);
  need(fields.length >= 20 && /^\d+$/.test(fields[19]), 'proc_stat_shape');
  const args = readProc(path.join(base, 'cmdline'), 65536).toString().split('\0').filter(Boolean);
  const after = readProc(path.join(base, 'stat'), 8192).toString(), afterClose = after.lastIndexOf(')');
  need(afterClose > 0 && after.slice(afterClose + 2).trim().split(/\s+/)[19] === fields[19], 'proc_identity_changed');
  const owned = args.some(arg => arg === root || arg.startsWith(root + '/') || arg.includes('=' + root + '/'))
    || ownedProcesses.has(pid + ':' + fields[19]);
  return { pid, ppid: Number(fields[1]), pgid: Number(fields[2]), session: Number(fields[3]), state: fields[0],
    starttime: fields[19], owned, executable: args.length ? path.basename(args[0].trim().split(/\s+/)[0]).slice(0, 80) : '' };
}
function readProc(file, maximum) {
  const fd = fs.openSync(file, 'r');
  try { const buffer = Buffer.alloc(maximum + 1), length = fs.readSync(fd, buffer, 0, buffer.length, 0); need(length <= maximum, 'proc_read_bound'); return buffer.subarray(0, length); }
  finally { fs.closeSync(fd); }
}
function scanOwned(force = false) {
  if (!ownedAttempted || (!force && Date.now() - lastScan < 500)) return [];
  lastScan = Date.now(); const names = fs.readdirSync('/proc').filter(name => /^\d+$/.test(name));
  need(names.length <= 8192, 'proc_inventory_bound'); const present = [];
  for (const name of names) {
    const pid = Number(name); if (pid === process.pid) continue;
    try {
      const item = proc(pid); if (!item?.owned) continue;
      const key = item.pid + ':' + item.starttime;
      if (!ownedProcesses.has(key)) ownedProcesses.set(key, { ...item, firstSeenAtUtc: new Date().toISOString() });
      need(ownedProcesses.size <= 256, 'owned_process_inventory_bound'); present.push(item);
    } catch (error) { if (!['ENOENT', 'ESRCH'].includes(error.code)) scanUncertain = true; }
  }
  return present;
}
async function cleanupOwned() {
  owner(); const started = Date.now(); let present = scanOwned(true), termSent = 0, killSent = 0;
  while (present.length && Date.now() - started < 6500 && Date.now() < cleanupEnd - 10000) {
    for (const item of present) {
      try {
        const current = proc(item.pid);
        need(current?.owned && current.starttime === item.starttime, 'owned_pid_identity_changed');
        const signal = Date.now() - started >= 3000 ? 'SIGKILL' : 'SIGTERM';
        process.kill(item.pid, signal); if (signal === 'SIGKILL') killSent++; else termSent++;
      } catch (error) { if (!['ENOENT', 'ESRCH'].includes(error.code)) scanUncertain = true; }
    }
    await pause(100); present = scanOwned(true);
  }
  const stillPresent = scanOwned(true);
  report.ownedProcessCleanup = { passed: !scanUncertain && stillPresent.length === 0 && termSent === 0 && killSent === 0,
    basis: 'Same UID, unique owned-root argv attribution and revalidated Linux kernel PID starttime; no argv/env output.',
    observed: [...ownedProcesses.values()], remaining: stillPresent, termSent, killSent, scanUncertain };
  need(report.ownedProcessCleanup.passed, 'owned_process_cleanup_unverified');
}
async function run(label, executable, args, seconds, { cleanup = false, retainFailure = false, cwd = repo, postScratch = false } = {}) {
  if (postScratch) need(cleanup && report.scratchCleanup === 'passed' && !fs.existsSync(root), 'scratch_postguard_invalid'); else owner();
  need(cleanup || (!interrupted && !globalExpired), 'interrupted_before_command');
  const end = cleanup ? cleanupEnd : workEnd, remaining = end - Date.now() - 6500;
  need(remaining > 0, 'command_budget_exhausted');
  const commandEnv = postScratch ? { PATH: env.PATH, HOME: env.HOME, LANG: env.LANG, TZ: env.TZ,
    GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null', GIT_TERMINAL_PROMPT: '0', GIT_OPTIONAL_LOCKS: '0' } : env;
  const started = Date.now(), child = spawn(executable, args, { cwd, env: commandEnv, detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
  const chunks = [[], []], count = [0, 0], size = [0, 0], digest = [createHash('sha256'), createHash('sha256')], eof = [false, false];
  let exitCode = null, signal = null, exited = false, closed = false, reason = null, stopAt = null, termSent = false, killSent = false, forcedDrain = false, captureFinished = false;
  const control = { stop(why) {
    if (!reason) { reason = why; stopAt = Date.now(); }
    if (!termSent && child.pid) { termSent = true; try { process.kill(-child.pid, 'SIGTERM'); } catch {} }
  } };
  active.add(control);
  child.once('error', () => { control.stop('spawn_failed'); });
  child.once('exit', (code, received) => { exited = true; exitCode = code; signal = received; });
  child.once('close', () => { closed = true; });
  [child.stdout, child.stderr].forEach((stream, index) => {
    stream.once('end', () => { eof[index] = true; });
    stream.on('data', bytes => {
      if (captureFinished) return;
      count[index] += bytes.length; digest[index].update(bytes);
      const kept = bytes.subarray(0, Math.max(0, STREAM_LIMIT - size[index])); chunks[index].push(kept); size[index] += kept.length;
      if (count[index] > STREAM_LIMIT) control.stop('output_limit');
    });
  });
  let leaderClosedAt = null;
  while (true) {
    try { scanOwned(); } catch { scanUncertain = true; }
    const now = Date.now(), absent = child.pid ? groupAbsent(child.pid) : true;
    if (closed && leaderClosedAt === null) leaderClosedAt = now;
    if (interrupted && !cleanup) control.stop('interrupted');
    if (now - started >= Math.min(seconds * 1000, remaining)) control.stop('timeout');
    if (closed && exited && eof.every(Boolean) && absent === true) break;
    if (closed && !child.pid) break;
    if (leaderClosedAt !== null && absent !== true && now - leaderClosedAt >= 1500) control.stop('process_group_remaining');
    if (stopAt !== null && now - stopAt >= 3000 && !killSent && child.pid && absent !== true) {
      killSent = true; try { process.kill(-child.pid, 'SIGKILL'); } catch {}
    }
    if (stopAt !== null && now - stopAt >= 6000) {
      forcedDrain = !closed || !eof.every(Boolean);
      if (forcedDrain) { child.stdout.destroy(); child.stderr.destroy(); }
      break;
    }
    await pause(25);
  }
  captureFinished = true; const output = chunks.map(parts => Buffer.concat(parts));
  const row = { label, args: [executable === process.execPath ? '[node]' : scrub(executable, 250), ...args.map(value => scrub(value, 250))],
    exitCode, signal, stopReason: reason, exitObservedAndReaped: exited, closeObserved: closed, pipesEOF: [...eof],
    forcedDrain, originalProcessGroupAbsent: child.pid ? groupAbsent(child.pid) : true, termSent, killSent, durationMs: Date.now() - started,
    streams: output.map((bytes, index) => {
      const raw = compressed(bytes); allGzip += raw.compressedBytes;
      return { name: index ? 'stderr' : 'stdout', observedBytes: count[index], observedSha256: digest[index].digest('hex'),
        complete: closed && eof[index] && count[index] === bytes.length && !forcedDrain, raw, head: scrub(bytes.toString(), 500), tail: scrub(bytes.subarray(Math.max(0, bytes.length - 700)).toString(), 700) };
    }) };
  row.released = exited && closed && eof.every(Boolean) && !forcedDrain && row.originalProcessGroupAbsent === true;
  report.commands.push(row); active.delete(control);
  need(allGzip <= 786432, 'all_streams_gzip_limit');
  const accepted = row.exitCode === 0 && row.signal === null && row.stopReason === null && row.released && row.streams.every(stream => stream.complete);
  if (!retainFailure) need(accepted, label + '_failed');
  return { output, row, accepted };
}
function parseGit(bytes, index) {
  const rows = new Map();
  for (const record of bytes.toString().split('\0').filter(Boolean)) {
    const tab = record.indexOf('\t'), header = record.slice(0, tab).split(' '), name = record.slice(tab + 1);
    need(tab > 0 && name && !path.isAbsolute(name) && !name.split('/').some(part => !part || part === '.' || part === '..') && !rows.has(name), 'git_entry_invalid');
    need(index ? header[2] === '0' : header[1] === 'blob', 'git_entry_type'); rows.set(name, { mode: header[0], gitBlob: header[index ? 1 : 2] });
  }
  return rows;
}
function fileVector(name, directory = repo) {
  const file = path.join(directory, name);
  for (let current = path.dirname(file); current !== directory; current = path.dirname(current)) {
    const item = fs.lstatSync(current); need(item.isDirectory() && !item.isSymbolicLink(), 'tracked_ancestor_changed');
  }
  const before = fs.lstatSync(file), mode = before.isSymbolicLink() ? '120000' : before.isFile() ? (before.mode & 0o111 ? '100755' : '100644') : null;
  need(mode, 'tracked_type_invalid');
  const bytes = before.isSymbolicLink() ? fs.readlinkSync(file, { encoding: 'buffer' }) : read(file), after = fs.lstatSync(file);
  need(before.dev === after.dev && before.ino === after.ino && before.size === after.size && before.mtimeMs === after.mtimeMs && before.ctimeMs === after.ctimeMs, 'tracked_file_changed');
  return { path: name, mode, gitBlob: gitBlob(bytes), bytes: bytes.length, sha256: sha(bytes) };
}
async function canonicalBase() {
  const parentCommit = (await run('canonical_parent', 'git', ['rev-parse', 'HEAD^'], 10)).output[0].toString().trim();
  need(parentCommit === BASE_COMMIT, 'canonical_parent_changed');
  const bytes = (await run('canonical_tree', 'git', ['ls-tree', '-r', '-l', '-z', BASE_COMMIT], 10)).output[0];
  baseTree = parseGit(bytes, false);
  const sourceBytes = bytes.toString().split('\0').filter(Boolean).reduce((sum, row) => {
    const header = row.slice(0, row.indexOf('\t')).trim().split(/\s+/);
    need(header.length === 4 && /^\d+$/.test(header[3]), 'canonical_blob_size'); return sum + Number(header[3]);
  }, 0);
  need(baseTree.size === 958 && sourceBytes === 7494850 && ADDED.every(name => !baseTree.has(name)), 'canonical_baseline_changed');
  report.canonicalBaseline = { commit: BASE_COMMIT, blobs: baseTree.size, bytes: sourceBytes,
    treeSha256: sha(bytes), allPriorModesAndBlobsRequiredUnchanged: true, onlyAddedPaths: ADDED };
}
async function guard(label, cleanup = false, postScratch = false) {
  const result = { label, passed: false }; report.guards.push(result); const options = { cleanup, postScratch };
  need((await run(label + '_head', 'git', ['rev-parse', 'HEAD'], 10, options)).output[0].toString().trim() === sourceCommit, 'head_changed');
  need(!fs.existsSync(path.join(repo, ACTIVE)), 'active_workflow_in_source');
  const tree = parseGit((await run(label + '_tree', 'git', ['ls-tree', '-r', '-z', 'HEAD'], 10, options)).output[0], false);
  const index = parseGit((await run(label + '_index', 'git', ['ls-files', '--stage', '-z'], 10, options)).output[0], true);
  need(baseTree && tree.size === 963 && index.size === tree.size, 'tracked_count_changed');
  for (const [name, item] of baseTree) need(tree.get(name)?.mode === item.mode && tree.get(name)?.gitBlob === item.gitBlob, 'prior_source_changed');
  need(JSON.stringify([...tree.keys()].filter(name => !baseTree.has(name)).sort()) === JSON.stringify(ADDED), 'added_source_scope_changed');
  const vector = [];
  for (const [name, item] of tree) {
    const value = fileVector(name); need(index.get(name)?.mode === item.mode && index.get(name)?.gitBlob === item.gitBlob
      && value.mode === item.mode && value.gitBlob === item.gitBlob, 'full_tracked_source_changed'); vector.push(value);
  }
  need((await run(label + '_status', 'git', ['status', '--porcelain=v1', '-z', '--untracked-files=all'], 10, options)).output[0].length === 0, 'worktree_not_clean');
  await run(label + '_diff', 'git', ['-c', 'core.filemode=true', 'diff', '--no-ext-diff', '--no-textconv', '--quiet', '--exit-code', 'HEAD', '--'], 10, options);
  const ignored = (await run(label + '_ignored', 'git', ['status', '--porcelain=v1', '-z', '--ignored=matching', '--untracked-files=normal'], 10, options)).output[0];
  need(ignored.length === 0, 'repository_generated_output');
  if (!baseline) { baseline = vector; report.sourceFiles = vector; }
  need(JSON.stringify(vector) === JSON.stringify(baseline), 'source_vector_changed');
  Object.assign(result, { passed: true, trackedFiles: vector.length, sourceBytes: vector.reduce((sum, file) => sum + file.bytes, 0),
    vectorSha256: sha(JSON.stringify(vector)), fullHeadIndexModesAndBytes: true, noUntrackedOrIgnoredOutput: true });
}
function generate() {
  owner(); exportManifest = [];
  for (const name of RUNTIME) {
    const original = fileVector(name); need(['100644', '100755'].includes(original.mode), 'runtime_source_type');
    const file = path.join(exported, name); fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
    fs.writeFileSync(file, read(path.join(repo, name)), { flag: 'wx', mode: original.mode === '100755' ? 0o700 : 0o600 });
    const actual = fileVector(name, exported); need(JSON.stringify(actual) === JSON.stringify(original), 'runtime_export_changed'); exportManifest.push(actual);
  }
  exportIdentity = fs.lstatSync(exported); report.exportedRuntime = exportManifest;
  const bytes = read(path.join(repo, SPEC), 131072); need(sha(bytes) === SPEC_SHA, 'client_source_hash');
  fs.writeFileSync(specFile, bytes, { flag: 'wx', mode: 0o600 });
  report.generated = { sourceSpec: SPEC, sourceSha256: SPEC_SHA, generatedSha256: sha(read(specFile, 131072)), copiedByteExact: read(specFile, 131072).equals(bytes) };
  need(report.generated.copiedByteExact, 'generated_client_changed'); checkExport();
}
function checkExport() {
  owner(); const current = fs.lstatSync(exported);
  need(current.isDirectory() && !current.isSymbolicLink() && current.dev === exportIdentity.dev && current.ino === exportIdentity.ino, 'export_identity_changed');
  const names = [];
  function walk(directory) {
    for (const name of fs.readdirSync(directory)) {
      const file = path.join(directory, name), item = fs.lstatSync(file);
      need(!item.isSymbolicLink() && item.uid === process.getuid(), 'export_type_changed');
      if (item.isDirectory()) walk(file); else { need(item.isFile(), 'export_type_changed'); names.push(path.relative(exported, file)); }
    }
  }
  walk(exported); need(JSON.stringify(names.sort()) === JSON.stringify([...RUNTIME].sort()), 'export_membership_changed');
  need(JSON.stringify(exportManifest.map(item => fileVector(item.path, exported))) === JSON.stringify(exportManifest)
    && sha(read(specFile, 131072)) === SPEC_SHA, 'export_bytes_changed');
}
function retainToolState() {
  owner(); const file = path.join(tools, 'package-lock.json');
  if (!fs.existsSync(file)) return;
  const bytes = read(file, 524288);
  report.toolLock = { raw: compressed(bytes), packageJsonSha256: sha(read(path.join(tools, 'package.json'), 32768)), top: null };
  const value = JSON.parse(bytes), selected = value.packages?.['node_modules/' + INSPECTOR.name];
  report.toolLock.top = selected ? { version: selected.version, resolved: selected.resolved, integrity: selected.integrity } : null;
  need(value.lockfileVersion === 3 && selected?.version === INSPECTOR.version && selected.resolved === INSPECTOR.resolved
    && selected.integrity === INSPECTOR.integrity && value.packages?.['']?.dependencies?.[INSPECTOR.name] === INSPECTOR.version, 'inspector_archive_pin');
}
function clientResults(bytes) {
  need(bytes.length <= CLIENT_LIMIT, 'client_output_limit');
  const lines = bytes.toString().split('\n').filter(line => line.startsWith('VAFS_INSPECTOR_CLIENT_RESULT='));
  need(lines.length === 1, 'client_receipt_count');
  const value = JSON.parse(lines[0].slice('VAFS_INSPECTOR_CLIENT_RESULT='.length));
  report.client = { accepted: false, result: value, rawSha256: sha(bytes), rawBytes: bytes.length };
  need(value.schemaVersion === 1 && value.status === 'passed' && Array.isArray(value.errors) && value.errors.length === 0
    && value.sourceCommit === sourceCommit && value.canonicalBaseCommit === BASE_COMMIT
    && value.case?.id === 'I01' && value.case.title === TITLE && value.case.accepted === true && value.case.error === null
    && Array.isArray(value.commands) && value.commands.length === 5, 'client_receipt_shape');
  need(value.runtime?.node === 'v26.13.0' && value.runtime.inspector === INSPECTOR.version
    && value.runtime.packageJsonSha256 === report.runtime.inspector.packageJsonSha256
    && value.runtime.launcherSha256 === report.runtime.inspector.launcherSha256, 'client_runtime');
  need(value.configuration?.readOnly === true && value.configuration.mode === 0o600 && value.configuration.transport === 'stdio'
    && value.configuration.protocolEra === 'legacy' && value.configuration.secretStore === 'memory'
    && value.configuration.automaticBrowserOpen === false && value.configuration.inheritedHome === true, 'client_configuration');
  need(value.limits?.workSeconds === 240 && value.limits.cleanupSeconds === 60 && value.limits.stdoutSeconds === 2
    && value.limits.cliSeconds === 35 && value.limits.streamBytes === 65536 && value.limits.streamGzipBytes === 32768
    && value.limits.allStreamsGzipBytes === 131072 && value.limits.reportBytes === 524288, 'client_limits');
  need(value.cleanup?.passed === true && value.cleanup.fixtureUnchanged === true && value.cleanup.fixtureRemoved === true
    && value.cleanup.activeChildren === 0 && value.cleanup.ownedProcessesRemaining === 0 && value.cleanup.uncertain === false
    && value.cleanup.signalsSent === false && Array.isArray(value.cleanup.failures) && value.cleanup.failures.length === 0
    && Array.isArray(value.cleanup.groups) && value.cleanup.groups.length > 0
    && value.cleanup.groups.every(item => Number.isInteger(item.pgid) && item.pgid > 1 && item.absent === true)
    && Array.isArray(value.cleanup.observedProcesses) && value.cleanup.observedProcesses.length > 0, 'client_cleanup');
  const plain = item => item !== null && typeof item === 'object' && !Array.isArray(item);
  const labels = ['initialize', 'tools_list', 'index', 'search', 'get'], methods = ['initialize', 'tools/list', 'tools/call', 'tools/call', 'tools/call'];
  let zipped = 0;
  const decoded = value.commands.map((row, index) => {
    need(row.label === labels[index] && row.method === methods[index] && row.accepted === true && row.exitCode === 0
      && row.signal === null && row.stopReason === null && row.forcedDrain === false && row.exitObservedAndReaped === true
      && row.closeObserved === true && row.released === true && row.originalProcessGroupAbsent === true
      && isDeepStrictEqual(row.pipesEOF, [true, true]) && isDeepStrictEqual(row.descriptorsClosed, [true, true])
      && Array.isArray(row.streams) && row.streams.length === 2 && !row.jsonError, 'client_command_closure');
    const originals = row.streams.map((stream, streamIndex) => {
      need(stream.name === ['stdout', 'stderr'][streamIndex] && stream.encoding === 'gzip-base64'
        && Number.isInteger(stream.bytes) && stream.bytes >= 0 && stream.bytes <= 65536
        && stream.observedBytes === stream.bytes && stream.observedSha256 === stream.sha256 && stream.complete === true
        && /^[a-f0-9]{64}$/.test(stream.sha256 ?? '') && typeof stream.data === 'string'
        && /^[A-Za-z0-9+/]*={0,2}$/.test(stream.data), 'client_original_shape');
      const zip = Buffer.from(stream.data, 'base64');
      need(zip.toString('base64') === stream.data && zip.length === stream.compressedBytes && zip.length <= 32768, 'client_original_gzip');
      zipped += zip.length; const original = gunzipSync(zip, { maxOutputLength: 65536 });
      need(original.length === stream.bytes && sha(original) === stream.sha256, 'client_original_hash'); return original;
    });
    const json = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(originals[0]));
    need(plain(json) && Object.keys(json).length === 1 && plain(json.result) && isDeepStrictEqual(json, row.json), 'client_original_json');
    return json.result;
  });
  need(zipped <= 131072, 'client_all_originals_limit');
  need(isDeepStrictEqual(decoded[0].serverInfo, { name: 'vafs-local', version: '0.1.0' })
    && decoded[0].protocolVersion === '2025-11-25' && isDeepStrictEqual(decoded[0].capabilities, { tools: {} }), 'client_initialize');
  const toolNames = ['vafs_local_index', 'vafs_local_search', 'vafs_local_get_page'];
  need(Array.isArray(decoded[1].tools) && isDeepStrictEqual(decoded[1].tools.map(tool => tool.name), toolNames)
    && decoded[1].tools.every(tool => tool.inputSchema?.type === 'object' && tool.inputSchema.additionalProperties === false
      && tool.annotations?.readOnlyHint === true && tool.annotations.destructiveHint === false && tool.annotations.openWorldHint === false), 'client_tools');
  const payloads = decoded.slice(2).map((item, index) => {
    need(item.isError === false && plain(item.structuredContent) && item.structuredContent.schemaVersion === ['vafs-local-index-v1', 'vafs-local-search-v1', 'vafs-local-page-v1'][index]
      && Array.isArray(item.content) && item.content.length === 1 && item.content[0].type === 'text'
      && typeof item.content[0].text === 'string' && isDeepStrictEqual(JSON.parse(item.content[0].text), item.structuredContent), 'client_tool_envelope');
    return item.structuredContent;
  });
  const fixture = { 'README.md': '# Inspector fixture\n\nOwned metadata only.\n',
    'knowledge/reader.md': '---\ntitle: "Authored UTF-8 note"\ndescription: "Owned integration fixture."\ndate: 2026-11-07\n---\n# Authored UTF-8 note\n\nMañana, 東京 and café stay byte-exact.\nA literal lighthouse-éclair marker lives here.\n',
    'raw/private-note.md': '# Excluded raw fixture\n\nlighthouse-éclair raw-private-sentinel-only\n' };
  const paths = ['README.md', 'knowledge/reader.md'], page = Buffer.from(fixture[paths[1]]), query = 'lighthouse-éclair', offset = page.indexOf(Buffer.from(query));
  const eligibleBytes = paths.reduce((total, name) => total + Buffer.byteLength(fixture[name]), 0), [index, search, get] = payloads;
  need(index.source?.kind === 'local_checkout' && index.source.rootId === sha(path.join(root, 'inspector-client', 'corpus'))
    && Array.isArray(index.documents) && isDeepStrictEqual(index.documents.map(item => item.path), paths)
    && index.meta?.documents === 2 && index.meta.bytes === eligibleBytes && isDeepStrictEqual(index.skipped, [])
    && index.documents.every(item => !Object.hasOwn(item, 'content') && item.bytes === Buffer.byteLength(fixture[item.path])
      && item.contentHash === sha(fixture[item.path])), 'client_index');
  need(search.source?.kind === 'local_checkout' && search.source.rootId === index.source.rootId && search.query === query
    && search.meta?.documents === 2 && search.meta.bytes === eligibleBytes && search.meta.legs?.rg?.status === 'ok'
    && search.meta.legs?.metadata?.status === 'ok' && search.meta.legs?.qmd?.status === 'disabled'
    && Array.isArray(search.data) && search.data.length === 1, 'client_search_scope');
  const match = search.data[0];
  need(match.path === paths[1] && match.bytes === page.length && match.contentHash === sha(page) && match.modes?.includes('grep')
    && Array.isArray(match.matches) && match.matches.length === 1 && match.matches[0].text === query
    && match.matches[0].byteStart === offset && match.matches[0].byteEnd === offset + Buffer.byteLength(query)
    && match.matches[0].line === page.subarray(0, offset).toString().split('\n').length && match.matches[0].excerpt?.includes(query), 'client_search_bytes');
  need(get.data?.path === paths[1] && get.data.content === fixture[paths[1]] && get.data.bytes === page.length
    && get.data.contentHash === sha(page) && !JSON.stringify(index).includes('raw-private-sentinel-only')
    && !JSON.stringify(search).includes('raw-private-sentinel-only'), 'client_get_bytes');
  const observation = value.case.observations;
  need(isDeepStrictEqual(observation.initialization, { protocolVersion: decoded[0].protocolVersion, serverInfo: decoded[0].serverInfo, capabilities: decoded[0].capabilities })
    && isDeepStrictEqual(observation.tools, toolNames) && observation.separateCliSessions === 5
    && isDeepStrictEqual(observation.index, { documents: 2, bytes: eligibleBytes, paths, rootId: index.source.rootId, rawExcluded: true, bodyTextExcluded: true })
    && isDeepStrictEqual(observation.search, { path: match.path, query, bytes: match.bytes, sha256: match.contentHash, matches: match.matches, qmd: 'disabled', rawExcluded: true })
    && isDeepStrictEqual(observation.get, { path: paths[1], bytes: page.length, sha256: sha(page), exactUtf8: true }), 'client_observation_binding');
  need(Array.isArray(value.sourceFiles) && value.sourceFiles.length === 7 && new Set(value.sourceFiles.map(item => item.path)).size === 7
    && value.sourceFiles.every(item => exportManifest.some(expected => expected.path === item.path && expected.bytes === item.bytes
      && expected.sha256 === item.sha256 && item.mode === (expected.mode === '100755' ? 0o700 : 0o600))), 'client_source_binding');
  need(Array.isArray(value.fixtureFiles) && value.fixtureFiles.length === 3 && new Set(value.fixtureFiles.map(item => item.path)).size === 3
    && value.fixtureFiles.every(item => Object.hasOwn(fixture, item.path)
    && item.bytes === Buffer.byteLength(fixture[item.path]) && item.sha256 === sha(fixture[item.path]) && item.mode === 0o600), 'client_fixture_binding');
  report.client.independentOriginalsVerified = { commands: 5, captures: 10, decodedBytes: value.commands.reduce((total, row) => total + row.streams.reduce((sum, stream) => sum + stream.bytes, 0), 0) };
  report.client.accepted = true;
}
try {
  await canonicalBase(); await guard('before');
  report.runtime.nodeSha256 = sha(read(process.execPath, 268435456));
  need(JSON.parse(read(path.join(repo, 'package.json'), 32768)).name === 'vafs', 'package_identity');
  generate(); ownedAttempted = true;
  const rgPath = fs.realpathSync('/usr/bin/rg');
  const resolvedRg = env.PATH.split(path.delimiter).map(directory => path.join(directory, 'rg')).find(file => {
    try { const item = fs.statSync(file); return item.isFile() && (item.mode & 0o111) !== 0; } catch { return false; }
  });
  need(resolvedRg && fs.realpathSync(resolvedRg) === rgPath, 'ripgrep_path_mismatch');
  const rg = await run('ripgrep_version', '/usr/bin/rg', ['--version'], 15, { cwd: tools });
  need(rg.output[0].toString().split('\n')[0] === 'ripgrep 14.1.0', 'ripgrep_version');
  report.runtime.ripgrep = { version: '14.1.0', sha256: sha(read(rgPath, 16777216)), pathLookupVerified: true };
  npm = fs.realpathSync(path.join(path.dirname(process.execPath), 'npm'));
  need(fs.statSync(npm).isFile(), 'npm_cli_missing'); report.runtime.npmCliSha256 = sha(read(npm, 1048576));
  report.runtime.npm = (await run('npm_version', process.execPath, [npm, '--version'], 15, { cwd: tools })).output[0].toString().trim();
  fs.writeFileSync(path.join(tools, 'package.json'), JSON.stringify({ name: 'vafs-inspector-owned-ci', version: '0.0.0', private: true,
    dependencies: { [INSPECTOR.name]: INSPECTOR.version } }) + '\n', { flag: 'wx', mode: 0o600 });
  const lock = await run('generate_tool_lock', process.execPath, [npm, 'install', '--prefix', tools, '--package-lock-only', '--ignore-scripts', '--no-audit', '--no-fund'], 120, { cwd: tools, retainFailure: true });
  retainToolState(); need(lock.accepted, 'generate_tool_lock_failed');
  const lockHash = report.toolLock.raw.sha256;
  await run('install_frozen_inspector', process.execPath, [npm, 'ci', '--prefix', tools, '--ignore-scripts', '--no-audit', '--no-fund'], 180, { cwd: tools });
  retainToolState(); need(report.toolLock.raw.sha256 === lockHash, 'tool_lock_changed');
  const packageBytes = read(path.join(env.VAFS_INSPECTOR_PACKAGE_ROOT, 'package.json'), 65536), packageValue = JSON.parse(packageBytes);
  need(packageValue.name === INSPECTOR.name && packageValue.version === INSPECTOR.version, 'installed_inspector_version');
  report.runtime.inspector = { ...INSPECTOR, packageJsonSha256: sha(packageBytes), lifecycleScriptsDisabled: true,
    launcherSha256: sha(read(path.join(env.VAFS_INSPECTOR_PACKAGE_ROOT, 'clients/launcher/build/index.js'), 4194304)) };
  const tree = await run('resolved_tool_tree', process.execPath, [npm, 'ls', '--prefix', tools, '--all', '--json'], 30, { cwd: tools, retainFailure: true });
  report.resolvedToolTree = { raw: compressed(tree.output[0]), parsed: JSON.parse(tree.output[0]) }; need(tree.accepted, 'resolved_tool_tree_failed');
  checkExport(); await guard('before_client');
  need(workEnd - Date.now() >= 317000, 'client_window_unavailable');
  const client = await run('inspector_client_case', process.execPath, [specFile], 310, { cwd: tools, retainFailure: true });
  clientResults(client.output[0]); need(client.accepted, 'client_cli_failed');
  checkExport(); await guard('after_client');
} catch (error) { report.errors.push(finite(error)); }
finally {
  cleanupEnd = Math.min(Date.now() + 90000, workEnd + 90000);
  try { if (fs.existsSync(path.join(tools, 'package.json'))) retainToolState(); } catch (error) { report.errors.push(finite(error)); }
  try { if (exportManifest) checkExport(); } catch (error) { report.errors.push(finite(error)); }
  try { await guard('after', true); } catch (error) { report.errors.push(finite(error)); }
  report.processCleanup = { passed: active.size === 0 && report.commands.every(row => row.released), started: report.commands.length };
  try { await cleanupOwned(); } catch (error) { report.errors.push(finite(error)); }
  try {
    owner(); need(report.processCleanup.passed && report.ownedProcessCleanup?.passed === true, 'process_cleanup_unverified');
    fs.rmSync(root, { recursive: true }); need(!fs.existsSync(root), 'scratch_still_present'); report.scratchCleanup = 'passed';
  } catch (error) { report.scratchCleanup = 'unverified'; report.errors.push(finite(error)); }
  try { if (report.scratchCleanup === 'passed') await guard('after_cleanup', true, true); } catch (error) { report.errors.push(finite(error)); }
  report.processCleanup = { passed: active.size === 0 && report.commands.every(row => row.released), started: report.commands.length };
  if (interrupted) report.errors.push('interrupted');
  if (globalExpired || Date.now() > workEnd + 90000) report.errors.push('global_deadline');
  report.interrupted = interrupted; report.completedAtUtc = new Date().toISOString();
  report.status = !report.errors.length && report.client?.accepted === true && report.processCleanup.passed
    && report.ownedProcessCleanup?.passed === true && report.scratchCleanup === 'passed' ? 'passed' : 'failed';
  let text = JSON.stringify(report);
  if (Buffer.byteLength(text) > REPORT_LIMIT) { text = JSON.stringify({ schemaVersion: report.schemaVersion, sourceCommit, status: 'failed', errors: ['report_limit'] }); report.status = 'failed'; }
  const outputTimer = setTimeout(() => { process.stderr.write('controller_stdout_deadline\n'); process.exit(1); }, Math.max(1, Math.min(2000, workEnd + 92000 - Date.now())));
  process.stdout.write('VAFS_INSPECTOR_REPORT=' + text + '\n', () => {
    clearTimeout(outputTimer); clearTimeout(globalTimer);
    for (const [signal, handler] of handlers) process.removeListener(signal, handler);
    process.exitCode = report.status === 'passed' && !interrupted && !globalExpired && Date.now() <= workEnd + 92000 ? 0 : 1;
  });
}
