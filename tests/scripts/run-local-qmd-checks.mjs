#!/usr/bin/env node
// One authored real QMD keyword journey; no old suite, model or application install.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { gzipSync, gunzipSync } from 'node:zlib';
import { isDeepStrictEqual } from 'node:util';
const REPOSITORY = 'alvarovillalbaa/vafs';
const BRANCH = 'refs/heads/qa/vafs-qmd-keyword-20261107-1';
const ACTIVE = '.github/workflows/local-qmd-keyword-1.yml';
const BASE_COMMIT = 'f94a884596a95a5ad24c7ebbdd14ba8365574f2e';
const SPEC = 'tests/integration/local-qmd-keyword.mjs';
const SPEC_SHA = 'b61071b21fee2b701f3f7652defc9d84a6cb6ac75aae8730445a1895be42d347';
const README_SHA = 'be94f31fb4aa44dda72c09d7995b5e1f2e43d9bb6f2e46c67e66c76984f8f404';
const TITLE = 'configured QMD keyword candidates reconcile to current eligible Markdown bytes';
const ADDED = [SPEC, 'tests/scripts/run-local-qmd-checks.mjs', 'docs/proposals/local-qmd-keyword-checks.md',
  'docs/proposals/local-qmd-keyword.workflow.yml.example'].sort();
const MODIFIED = ['tests/README.md'];
const RUNTIME = ['bin/vafs.mjs', 'bin/cli.mjs', ...['corpus', 'errors', 'output', 'process', 'retrieval'].map(name => 'bin/local/' + name + '.mjs')];
const PACKAGES = [
  { name: '@tobilu/qmd', version: '2.8.3', integrity: 'sha512-zjfVwrObPB618B6x8SdhlGv/tX9OxRHsbQnr5DUtBvqPK6HGQ27lM+9/BAY5okpjrHVnW56hLyDkqoTcsrVLzA==' },
  { name: 'better-sqlite3', version: '13.0.3', integrity: 'sha512-RbOBxmLBG8uvFUc15X9+9SFemKcQ0WBuISBVkpuiaUB2qblC8UWlHEjdWVoZ8AdhSwmoEgsiXKfopX0CQxaACQ==' },
  { name: 'sqlite-vec', version: '0.1.9', integrity: 'sha512-L7XJWRIBNvR9O5+vh1FQ+IGkh/3D2AzVksW5gdtk28m78Hy8skFD0pqReKH1Yp0/BUKRGcffgKvyO/EON5JXpA==' },
  { name: 'node-llama-cpp', version: '3.20.0', integrity: 'sha512-KnET3ttADYLCobjMnMTLkWkLt87rPRDhNzTZgGOCt8m8yTmdQW2sfLNmulGBA9laFvcyRIMOsgQST8lunPmMgw==' },
  { name: 'sqlite-vec-linux-x64', version: '0.1.9', integrity: 'sha512-w3tCH8xK2finW8fQJ/m8uqKodXUZ9KAuAar2UIhz4BHILfpE0WM/MTGCRfa7RjYbrYim5Luk3guvMOGI7T7JQA==' },
].map(item => ({ ...item, resolved: 'https://registry.npmjs.org/' + item.name + '/-/' + item.name.split('/').at(-1) + '-' + item.version + '.tgz' }));
const REQUIRED = PACKAGES.filter(item => item.name !== 'node-llama-cpp');
const METADATA = { path: 'docs/results/2026/11-07/qmd-package-metadata-attempt-1.json', bytes: 22950,
  sha256: 'cba9c9f708d4dffd5db54decc83dfc4c3aef9da301197330dcafe660bb80b7cb' };
const STREAM_LIMIT = 524288, REPORT_LIMIT = 2097152, CLIENT_LIMIT = 524288, STORAGE_LIMIT = 536870912;
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const gitBlob = bytes => createHash('sha1').update('blob ' + bytes.length + '\0').update(bytes).digest('hex');
const need = (condition, code) => { if (!condition) throw new Error(code); };
const finite = error => /^[a-z0-9_]+$/.test(error?.message ?? '') ? error.message : 'controller_error';
const sourceCommit = process.argv[3];
need(process.argv.length === 4 && process.argv[2] === '--source-commit' && /^[a-f0-9]{40}$/.test(sourceCommit ?? ''), 'source_pin_required');
need(process.version === 'v26.13.0' && process.platform === 'linux' && process.arch === 'x64' && process.env.CI === 'true'
  && process.env.GITHUB_ACTIONS === 'true' && process.env.GITHUB_REPOSITORY === REPOSITORY
  && process.env.GITHUB_EVENT_NAME === 'create' && process.env.GITHUB_REF === BRANCH
  && process.env.VAFS_QMD_PUBLIC_REPOSITORY === 'true', 'approved_public_ci_required');
const event = JSON.parse(read(process.env.GITHUB_EVENT_PATH, 262144));
need(event.ref_type === 'branch' && event.ref === BRANCH.slice('refs/heads/'.length)
  && event.repository?.private === false && event.repository?.full_name === REPOSITORY, 'approved_create_event_required');
const enteredAt = Date.now(), jobStartText = process.env.VAFS_QMD_JOB_STARTED_MS;
need(/^\d{13}$/.test(jobStartText ?? ''), 'job_start_timestamp_required');
const jobStartedAt = Number(jobStartText);
need(Number.isSafeInteger(jobStartedAt) && jobStartedAt <= enteredAt && enteredAt - jobStartedAt < 600000, 'job_start_timestamp_invalid');
const admittedWorkEnd = Math.min(enteredAt + 420000, jobStartedAt + 600000 - 90000 - 30000);
need(admittedWorkEnd - enteredAt >= 317000, 'job_entry_window_unavailable');
const repo = fs.realpathSync(process.cwd()), parent = fs.realpathSync(process.env.RUNNER_TEMP ?? '');
need(path.isAbsolute(parent) && fs.statSync(parent).isDirectory(), 'runner_temp_invalid');
need(typeof process.env.HOME === 'string' && path.isAbsolute(process.env.HOME) && fs.statSync(process.env.HOME).isDirectory(), 'original_home_required');
need(Buffer.byteLength(path.join(parent, 'vq-XXXXXX')) <= 60, 'scratch_path_budget');
const root = fs.mkdtempSync(path.join(parent, 'vq-'));
fs.chmodSync(root, 0o700);
const identity = fs.lstatSync(root), nonce = randomUUID().replaceAll('-', '');
need(identity.uid === process.getuid(), 'scratch_owner_invalid');
fs.writeFileSync(path.join(root, '.owner'), nonce, { flag: 'wx', mode: 0o600 });
for (const name of ['tools', 'tmp', 'cache', 'config', 'data', 'state', 'source']) fs.mkdirSync(path.join(root, name), { mode: 0o700 });
for (const name of ['npm-user', 'npm-global']) fs.writeFileSync(path.join(root, name), '', { flag: 'wx', mode: 0o600 });
const tools = path.join(root, 'tools'), exported = path.join(root, 'source'), specFile = path.join(tools, 'local-qmd-keyword.mjs');
const env = {
  PATH: [path.join(tools, 'node_modules/.bin'), path.dirname(process.execPath), '/usr/bin', '/bin', '/usr/local/bin', '/usr/sbin', '/sbin'].join(path.delimiter),
  HOME: process.env.HOME, LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8', TZ: 'UTC', CI: 'true', NO_COLOR: '1',
  TMPDIR: path.join(root, 'tmp'), TMP: path.join(root, 'tmp'), TEMP: path.join(root, 'tmp'),
  XDG_CACHE_HOME: path.join(root, 'cache'), XDG_CONFIG_HOME: path.join(root, 'config'),
  XDG_DATA_HOME: path.join(root, 'data'), XDG_STATE_HOME: path.join(root, 'state'),
  NODE_COMPILE_CACHE: path.join(root, 'cache', 'node'),
  npm_config_userconfig: path.join(root, 'npm-user'), npm_config_globalconfig: path.join(root, 'npm-global'),
  npm_config_cache: path.join(root, 'cache', 'npm'), npm_config_registry: 'https://registry.npmjs.org/',
  npm_config_audit: 'false', npm_config_fund: 'false', npm_config_update_notifier: 'false', npm_config_ignore_scripts: 'true',
  GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null', GIT_TERMINAL_PROMPT: '0', GIT_OPTIONAL_LOCKS: '0',
  VAFS_QMD_SOURCE_ROOT: exported, VAFS_QMD_PACKAGE_ROOT: path.join(tools, 'node_modules/@tobilu/qmd'),
  VAFS_QMD_EXECUTABLE: path.join(tools, 'node_modules/@tobilu/qmd/bin/qmd'),
  VAFS_QMD_RUN_ROOT: root, VAFS_QMD_FIXTURE_ROOT: path.join(root, 'corpus'), VAFS_QMD_NONCE: nonce,
  VAFS_TOOL_ROOT: tools, SOURCE_COMMIT: sourceCommit,
};
const report = {
  schemaVersion: 'vafs.local-qmd-keyword.v1', sourceCommit, canonicalBaseCommit: BASE_COMMIT,
  status: 'failed', startedAtUtc: new Date().toISOString(),
  runtime: { node: process.version, platform: process.platform, architecture: process.arch },
  scope: { cases: 1, identities: [{ id: 'Q01', title: TITLE }], realCommands: 5, retries: 0, workers: 1,
    appDependencies: false, appBuild: false, browser: false, httpServer: false, accounts: false, models: false,
    embeddingOrSemanticCommands: false, old34Repeated: false, old63Repeated: false, inspectorRepeated: false },
  limits: { workSeconds: 420, cleanupSeconds: 90, clientSeconds: 310, jobMinutes: 10,
    streamBytes: STREAM_LIMIT, streamGzipBytes: 131072, allStreamsGzipBytes: 786432,
    clientJsonBytes: CLIENT_LIMIT, reportBytes: REPORT_LIMIT, ownedLogicalBytes: STORAGE_LIMIT },
  timing: { earliestUserStepAtUtc: new Date(jobStartedAt).toISOString(), controllerEntryAtUtc: new Date(enteredAt).toISOString(),
    setupElapsedMs: enteredAt - jobStartedAt, admittedWorkMs: admittedWorkEnd - enteredAt,
    cleanupReservedMs: 90000, jobOutputAndStartupMarginMs: 30000, workDeadlineAtUtc: new Date(admittedWorkEnd).toISOString() },
  commands: [], guards: [], errors: [], sourceFiles: [],
  storage: { sampledLogicalByteLimit: STORAGE_LIMIT, maximumObservedLogicalBytes: 0, scans: 0,
    qualification: 'Periodic owned lstat logical-byte observations, not a filesystem quota, allocated-block accounting or complete peak measurement.' },
  proofLimits: [
    'One authored real QMD FTS/vAFS CLI journey; old34/63 and Inspector I01 remain separate and are not rerun.',
    'Four exact required tool-only dependencies plus transitive node-llama-cpp3.20.0. All lifecycle scripts are disabled and optional dependencies omitted; the required vector platform is explicit.',
    'Main npm archives may include native payloads. No package-script downloader or embedding/reranking/semantic command is invoked; this is not host-wide network attestation.',
    'Registry-only lock URLs/SRI, an unchanged frozen lock and native SQLite/vector admission precede Q01. A gate failure remains the first failed attempt; no automatic rebuild, download fallback or retry is allowed.',
    'Metadata prerequisite is a separate completed inspection, not archive execution, installed-tree or keyword proof.',
    'Original HOME is retained. Only owned XDG model-cache paths are checked; cache absence is not proof that no network request was attempted.',
    'Only the observed full-path/missing fallback producer branches are claimed. No stable producer docid, fresh-index rank, concurrency, private-corpus, hosted or full vAFS acceptance is inferred.',
    'Full source/index/native/Git guards and scoped owned PID/starttime/group/EOF teardown are required. External termination and unrelated host resources remain outside that proof.',
  ],
};
const workEnd = admittedWorkEnd;
let cleanupEnd, interrupted = false, globalExpired = false, baseline, baseTree, allGzip = 0, ownedAttempted = false;
let scanUncertain = false, lastScan = 0, exportManifest, exportIdentity, npm, lastStorageScan = 0, installedPackages, toolFiles;
const ownedProcesses = new Map(), active = new Set(), handlers = new Map();
for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  const handler = () => { interrupted = true; for (const child of active) child.stop('interrupted'); };
  handlers.set(signal, handler); process.on(signal, handler);
}
const globalTimer = setTimeout(() => { globalExpired = true; for (const child of active) child.stop('global_deadline'); }, Math.max(1, workEnd + 90000 - Date.now()));
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const QUERY = 'vafsquartzharbor20261107';
const FILES = {
  'selected/README.md': '# Fixture handbook\n\nNeutral authored collection context.\n',
  'selected/knowledge/current.md': '---\ntitle: "Current sail note"\ndescription: "A neutral eligible note."\ndate: 2026-11-07\n---\n# Current sail note\n\nMañana, 東京 and café remain exact.\nThe vafsquartzharbor20261107 marker remains in current text.\n',
  'selected/knowledge/stale.md': '---\ntitle: "Cached archive note"\ndescription: "Original neutral description."\ndate: 2026-11-07\n---\n# Cached archive note\n\nÉclair and 東京 precede the vafsquartzharbor20261107 marker.\n',
  'selected/knowledge/removed.md': '---\ntitle: "Removed ledger note"\ndescription: "Neutral deletion fixture."\ndate: 2026-11-07\n---\n# Removed ledger note\n\nThe vafsquartzharbor20261107 marker was indexed here.\n',
  'selected/raw/private.md': '# Raw intake note\n\nvafsquartzharbor20261107 raw-private-sentinel-only\n',
  'foreign.md': '# Foreign sibling note\n\nvafsquartzharbor20261107 outside-sentinel-only\n',
};
const REVISED = '---\ntitle: "Revised archive note"\ndescription: "Current revised description."\ndate: 2026-11-07\n---\n# Revised archive note\n\nRévisé 東京: these current bytes contain only fresh authored prose.\n';
const CANDIDATES = ['selected/knowledge/current.md', 'selected/knowledge/stale.md', 'selected/knowledge/removed.md', 'selected/raw/private.md', 'foreign.md'];
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
    try { checkStorage(); } catch (error) { report.storage.lastFailure = finite(error); control.stop('owned_storage_bound'); }
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
  need(baseTree.size === 971 && sourceBytes === 8523581 && ADDED.every(name => !baseTree.has(name)), 'canonical_baseline_changed');
  report.canonicalBaseline = { commit: BASE_COMMIT, blobs: baseTree.size, bytes: sourceBytes,
    treeSha256: sha(bytes), allPriorModesAndUnmodifiedBlobsRequiredUnchanged: true, onlyAddedPaths: ADDED, onlyModifiedPriorPaths: MODIFIED };
}
async function guard(label, cleanup = false, postScratch = false) {
  const result = { label, passed: false }; report.guards.push(result); const options = { cleanup, postScratch };
  need((await run(label + '_head', 'git', ['rev-parse', 'HEAD'], 10, options)).output[0].toString().trim() === sourceCommit, 'head_changed');
  need(!fs.existsSync(path.join(repo, ACTIVE)), 'active_workflow_in_source');
  const tree = parseGit((await run(label + '_tree', 'git', ['ls-tree', '-r', '-z', 'HEAD'], 10, options)).output[0], false);
  const index = parseGit((await run(label + '_index', 'git', ['ls-files', '--stage', '-z'], 10, options)).output[0], true);
  need(baseTree && tree.size === 975 && index.size === tree.size, 'tracked_count_changed');
  for (const [name, item] of baseTree) {
    need(tree.get(name)?.mode === item.mode, 'prior_mode_changed');
    if (!MODIFIED.includes(name)) need(tree.get(name)?.gitBlob === item.gitBlob, 'prior_source_changed');
    else need(fileVector(name).sha256 === README_SHA && tree.get(name)?.gitBlob !== item.gitBlob, 'reviewed_readme_changed');
  }
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

function checkStorage(force = false) {
  if (!ownedAttempted || !fs.existsSync(root) || (!force && Date.now() - lastStorageScan < 1000)) return;
  owner(); lastStorageScan = Date.now(); let bytes = 0, entries = 0;
  function walk(directory) {
    let names;
    try { names = fs.readdirSync(directory); } catch (error) { if (error.code === 'ENOENT') return; throw error; }
    for (const name of names) {
      const file = path.join(directory, name); let item;
      try { item = fs.lstatSync(file); } catch (error) { if (error.code === 'ENOENT') continue; throw error; }
      need(item.uid === process.getuid() && ++entries <= 100000, 'owned_storage_inventory');
      if (item.isDirectory()) walk(file);
      else { need(item.isFile() || item.isSymbolicLink(), 'owned_storage_type'); bytes += item.size; need(bytes <= STORAGE_LIMIT, 'owned_storage_limit'); }
    }
  }
  walk(root); report.storage.maximumObservedLogicalBytes = Math.max(report.storage.maximumObservedLogicalBytes, bytes);
  report.storage.scans++; report.storage.lastObservedEntries = entries;
}
function modelCacheGuard(label) {
  const paths = ['cache/qmd/models', 'data/qmd/models', 'config/qmd/models'];
  for (const name of paths) {
    try { fs.lstatSync(path.join(root, name)); throw new Error('owned_model_cache_present'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  (report.modelCacheGuards ??= []).push({ label, relativePaths: paths, absent: true, qualification: 'Owned paths only; no network-attempt or host-wide write claim.' });
}
function metadataPrerequisite() {
  const bytes = read(path.join(repo, METADATA.path), 131072);
  need(bytes.length === METADATA.bytes && sha(bytes) === METADATA.sha256, 'metadata_receipt_pin');
  const value = JSON.parse(bytes);
  need(value.inspectionComplete === true && value.status === 'completed' && value.providerAccepted === false
    && value.sourceCommit === '4f4a4c56d1c037af79de933b9805af4888a3b7f4' && value.requests?.length === 5, 'metadata_receipt_shape');
  for (const expected of PACKAGES) {
    const row = value.requests.find(item => item.name === expected.name && item.version === expected.version);
    need(row?.complete === true && row.status === 200 && row.error === null && row.raw?.originalComplete === true, 'metadata_request_incomplete');
    const zip = Buffer.from(row.raw.data, 'base64'), original = gunzipSync(zip, { maxOutputLength: 131072 });
    need(zip.toString('base64') === row.raw.data && zip.length === row.raw.compressedBytes && original.length === row.raw.bytes
      && original.length === row.raw.observedBytes && sha(original) === row.raw.sha256 && sha(original) === row.raw.observedSha256, 'metadata_original_mismatch');
    const manifest = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(original));
    need(manifest.name === expected.name && manifest.version === expected.version && manifest.dist?.integrity === expected.integrity
      && manifest.dist.tarball === expected.resolved, 'metadata_archive_pin');
  }
  report.metadataPrerequisite = { ...METADATA, sourceCommit: value.sourceCommit, originalsVerified: 5,
    inspectionComplete: true, providerAccepted: false, qualification: 'Separate metadata evidence, not archive/native/keyword execution.' };
}
function validIntegrity(value) {
  if (typeof value !== 'string') return false;
  const match = /^(sha1|sha256|sha384|sha512)-([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match) return false;
  const bytes = Buffer.from(match[2], 'base64');
  return bytes.toString('base64') === match[2] && bytes.length === ({ sha1: 20, sha256: 32, sha384: 48, sha512: 64 })[match[1]];
}
function retainToolState() {
  owner(); const file = path.join(tools, 'package-lock.json');
  if (!fs.existsSync(file)) return;
  const bytes = read(file, 524288);
  report.toolLock = { raw: compressed(bytes), packageJsonSha256: sha(read(path.join(tools, 'package.json'), 32768)), selected: [] };
  const value = JSON.parse(bytes), expectedRoot = Object.fromEntries(REQUIRED.map(item => [item.name, item.version]));
  need(value.lockfileVersion === 3 && isDeepStrictEqual(value.packages?.['']?.dependencies, expectedRoot), 'tool_manifest_changed');
  let networkEntries = 0;
  for (const [name, item] of Object.entries(value.packages)) {
    if (!name) continue;
    need(name.startsWith('node_modules/') && !item.link && typeof item.resolved === 'string', 'tool_lock_entry_invalid');
    const url = new URL(item.resolved);
    need(url.protocol === 'https:' && url.host === 'registry.npmjs.org' && !url.username && !url.password
      && !url.search && !url.hash && url.pathname.endsWith('.tgz') && validIntegrity(item.integrity), 'tool_lock_origin_or_integrity');
    networkEntries++;
  }
  for (const expected of PACKAGES) {
    const item = value.packages['node_modules/' + expected.name];
    need(item?.version === expected.version && item.resolved === expected.resolved && item.integrity === expected.integrity, 'tool_archive_pin');
    report.toolLock.selected.push({ ...expected });
  }
  report.toolLock.registryEntriesVerified = networkEntries;
}
function installedProof() {
  owner(); const results = []; report.runtime.packageObservations = results;
  for (const expected of PACKAGES) {
    const file = path.join(tools, 'node_modules', expected.name, 'package.json'), bytes = read(file, 131072), value = JSON.parse(bytes);
    results.push({ name: value.name, version: value.version, bytes: bytes.length, sha256: sha(bytes) });
    need(value.name === expected.name && value.version === expected.version, 'installed_package_identity');
  }
  const forbidden = [];
  function walk(directory) {
    for (const name of fs.readdirSync(directory)) {
      const file = path.join(directory, name), item = fs.lstatSync(file);
      need(item.uid === process.getuid(), 'installed_package_owner');
      if (item.isSymbolicLink()) { need(fs.realpathSync(file).startsWith(root + path.sep), 'installed_link_outside_owned_root'); continue; }
      if (!item.isDirectory()) continue;
      if (name === '@node-llama-cpp') { for (const child of fs.readdirSync(file)) forbidden.push(path.relative(tools, path.join(file, child))); }
      walk(file);
    }
  }
  walk(path.join(tools, 'node_modules')); need(forbidden.length === 0, 'optional_llama_platform_package_installed');
  if (installedPackages) need(isDeepStrictEqual(results, installedPackages), 'installed_package_manifest_changed');
  else installedPackages = results;
  report.runtime.packages = results; report.runtime.optionalLlamaPlatformPackagesInstalled = [];
  const qmdRoot = env.VAFS_QMD_PACKAGE_ROOT;
  const actual = ['package.json', 'bin/qmd', 'dist/cli/qmd.js'].map(name => {
    const bytes = read(path.join(qmdRoot, name), name === 'dist/cli/qmd.js' ? 4194304 : 131072);
    return { path: name, bytes: bytes.length, sha256: sha(bytes) };
  });
  if (toolFiles) need(isDeepStrictEqual(actual, toolFiles), 'installed_qmd_entry_changed'); else toolFiles = actual;
  report.runtime.qmd = { name: '@tobilu/qmd', version: '2.8.3', packageJsonSha256: actual[0].sha256,
    executableSha256: actual[1].sha256, installedEntrySha256: actual[2].sha256 };
}
const NATIVE_ADMISSION = [
  "import fs from 'node:fs';",
  "import path from 'node:path';",
  "import { createRequire } from 'node:module';",
  "import { createHash } from 'node:crypto';",
  "const tools = fs.realpathSync(process.env.VAFS_TOOL_ROOT), root = fs.realpathSync(process.env.VAFS_QMD_RUN_ROOT);",
  "const need = (value, code) => { if (!value) throw new Error(code); };",
  "const require = createRequire(path.join(tools, 'package.json'));",
  "const Database = require('better-sqlite3'), sqliteVec = require('sqlite-vec');",
  "need(typeof Database === 'function' && typeof sqliteVec.load === 'function' && typeof sqliteVec.getLoadablePath === 'function', 'native_api_unavailable');",
  "let db, result;",
  "try {",
  "  db = new Database(':memory:');",
  "  sqliteVec.load(db);",
  "  result = db.prepare('SELECT sqlite_version() AS sqliteVersion, vec_version() AS vecVersion').get();",
  "  need(typeof result.sqliteVersion === 'string' && /^\\d+\\.\\d+\\.\\d+$/.test(result.sqliteVersion) && /^v?0\\.1\\.9$/.test(result.vecVersion), 'native_version_mismatch');",
  "  const sqlite = fs.realpathSync(path.join(tools, 'node_modules/better-sqlite3/prebuilds/linux-x64.node'));",
  "  need(Object.keys(require.cache).some(file => file.endsWith('.node') && fs.realpathSync(file) === sqlite), 'bundled_sqlite_binding_not_loaded');",
  "  const vector = fs.realpathSync(sqliteVec.getLoadablePath());",
  "  need(vector.startsWith(path.join(tools, 'node_modules/sqlite-vec-linux-x64') + path.sep), 'vector_binding_outside_expected_package');",
  "  const files = [sqlite, vector].map(file => {",
  "    need(file.startsWith(root + path.sep), 'native_path_outside_owned_root');",
  "    const before = fs.lstatSync(file); need(before.isFile() && !before.isSymbolicLink() && before.uid === process.getuid() && before.size > 0 && before.size <= 134217728, 'native_file_invalid');",
  "    const data = fs.readFileSync(file), after = fs.lstatSync(file);",
  "    need(before.dev === after.dev && before.ino === after.ino && before.size === data.length && before.size === after.size && before.mtimeMs === after.mtimeMs && before.ctimeMs === after.ctimeMs && data.subarray(0, 4).equals(Buffer.from([127,69,76,70])), 'native_file_changed_or_not_elf');",
  "    return { path: path.relative(tools, file), bytes: data.length, sha256: createHash('sha256').update(data).digest('hex') };",
  "  });",
  "  result = { ...result, files, actualInMemoryDatabase: true, vectorExtensionLoaded: true };",
  "} finally {",
  "  if (db) { db.close(); need(db.open === false, 'native_database_close_unverified'); }",
  "}",
  "process.stdout.write(JSON.stringify({ ...result, databaseClosed: true }) + '\\n');",
  ""
].join('\n');

function clientResults(bytes) {
  need(bytes.length <= CLIENT_LIMIT, 'client_output_limit');
  const lines = bytes.toString().split('\n').filter(line => line.startsWith('VAFS_QMD_KEYWORD_RESULT='));
  need(lines.length === 1, 'client_receipt_count');
  const value = JSON.parse(lines[0].slice('VAFS_QMD_KEYWORD_RESULT='.length));
  report.client = { accepted: false, result: value, rawSha256: sha(bytes), rawBytes: bytes.length };
  need(value.schemaVersion === 1 && value.status === 'passed' && isDeepStrictEqual(value.errors, [])
    && value.sourceCommit === sourceCommit && value.canonicalBaseCommit === BASE_COMMIT
    && value.case?.id === 'Q01' && value.case.title === TITLE && value.case.accepted === true && value.case.error === null
    && Array.isArray(value.commands) && value.commands.length === 5, 'client_receipt_shape');
  need(value.runtime?.node === 'v26.13.0' && value.runtime.qmdPackage === '@tobilu/qmd' && value.runtime.qmdVersion === '2.8.3'
    && value.runtime.packageJsonSha256 === report.runtime.qmd.packageJsonSha256
    && value.runtime.executableSha256 === report.runtime.qmd.executableSha256
    && value.runtime.installedEntrySha256 === report.runtime.qmd.installedEntrySha256, 'client_runtime');
  const configuration = value.configuration;
  const directKeys = ['PATH', 'HOME', 'LANG', 'LC_ALL', 'TMPDIR', 'TMP', 'TEMP', 'XDG_CONFIG_HOME', 'XDG_DATA_HOME', 'XDG_CACHE_HOME'].sort();
  need(configuration?.originalHomeRetained === true && configuration.cwd === 'canonical_original_home'
    && configuration.ancestorQmdConfigAbsent === true && configuration.initialQmdStateAbsent === true
    && configuration.actualQmdPathVerified === true && configuration.actualNodePathVerified === true
    && configuration.noQmdPrivateOverrides === true && isDeepStrictEqual(configuration.directQmdEnvironmentKeys, directKeys)
    && isDeepStrictEqual(configuration.vafsEnvironmentKeys, [...directKeys, 'CI', 'NO_COLOR'].sort()), 'client_configuration');
  need(value.limits?.workSeconds === 240 && value.limits.cleanupSeconds === 60 && value.limits.stdoutSeconds === 2
    && value.limits.cliSeconds === 35 && value.limits.streamBytes === 65536 && value.limits.streamGzipBytes === 32768
    && value.limits.allStreamsGzipBytes === 131072 && value.limits.reportBytes === 524288, 'client_limits');
  need(value.cleanup?.passed === true && value.cleanup.fixtureUnchangedSinceIntentionalMutation === true && value.cleanup.fixtureRemoved === true
    && value.cleanup.activeChildren === 0 && value.cleanup.ownedProcessesRemaining === 0 && value.cleanup.uncertain === false
    && value.cleanup.signalsSent === false && isDeepStrictEqual(value.cleanup.failures, [])
    && Array.isArray(value.cleanup.groups) && value.cleanup.groups.length > 0
    && value.cleanup.groups.every(item => Number.isInteger(item.pgid) && item.pgid > 1 && item.absent === true)
    && Array.isArray(value.cleanup.observedProcesses) && value.cleanup.observedProcesses.length > 0, 'client_cleanup');
  const labels = ['collection_add', 'qmd_baseline', 'vafs_baseline', 'qmd_stale', 'vafs_stale'];
  let zipped = 0;
  const decoded = value.commands.map((row, index) => {
    need(row.label === labels[index] && row.kind === (index === 2 || index === 4 ? 'vafs' : 'qmd') && row.cwd === 'canonical_original_home'
      && row.accepted === true && row.exitCode === 0 && row.signal === null && row.stopReason === null && row.forcedDrain === false
      && row.exitObservedAndReaped === true && row.closeObserved === true && row.released === true && row.originalProcessGroupAbsent === true
      && isDeepStrictEqual(row.pipesEOF, [true, true]) && isDeepStrictEqual(row.descriptorsClosed, [true, true])
      && Array.isArray(row.streams) && row.streams.length === 2 && !row.jsonError, 'client_command_closure');
    const originals = row.streams.map((stream, streamIndex) => {
      need(stream.name === ['stdout', 'stderr'][streamIndex] && stream.encoding === 'gzip-base64'
        && Number.isInteger(stream.bytes) && stream.bytes >= 0 && stream.bytes <= 65536
        && stream.observedBytes === stream.bytes && stream.observedSha256 === stream.sha256 && stream.complete === true
        && /^[a-f0-9]{64}$/.test(stream.sha256 ?? '') && typeof stream.data === 'string', 'client_original_shape');
      const zip = Buffer.from(stream.data, 'base64');
      need(zip.toString('base64') === stream.data && zip.length === stream.compressedBytes && zip.length <= 32768, 'client_original_gzip');
      zipped += zip.length; const original = gunzipSync(zip, { maxOutputLength: 65536 });
      need(original.length === stream.bytes && sha(original) === stream.sha256, 'client_original_hash'); return original;
    });
    const text = new TextDecoder('utf-8', { fatal: true }).decode(originals[0]);
    if (index === 0) { need(!Object.hasOwn(row, 'json'), 'collection_output_not_json'); return null; }
    const json = JSON.parse(text); need(isDeepStrictEqual(json, row.json), 'client_original_json'); return json;
  });
  need(zipped <= 131072, 'client_all_originals_limit');
  const fixture = env.VAFS_QMD_FIXTURE_ROOT, selected = path.join(fixture, 'selected'), collection = 'vafs-q01-' + nonce.slice(0, 12);
  need(isDeepStrictEqual(value.collection, { name: collection, authoredFiles: 6, mask: '**/*.md', createdFromAbsentOwnedState: true }), 'client_collection');
  const observations = value.case.observations;
  function controls(rows, after) {
    need(Array.isArray(rows) && rows.length === 5, 'producer_candidate_count');
    const result = new Map();
    for (const item of rows) {
      need(item && typeof item === 'object' && typeof item.title === 'string' && typeof item.snippet === 'string'
        && Buffer.byteLength(item.snippet) <= 8192 && Number.isFinite(item.score) && typeof item.file === 'string', 'producer_candidate_shape');
      let kind = path.isAbsolute(item.file) ? 'absolute' : item.file.startsWith('./') ? 'cwd_relative'
        : item.file.startsWith('qmd://') ? 'qmd_uri' : 'unsupported_identifier';
      const absolute = kind === 'absolute' ? path.resolve(item.file) : kind === 'cwd_relative' ? path.resolve(fs.realpathSync(env.HOME), item.file) : null;
      const missing = 'selected/knowledge/removed.md';
      const name = after && item.file === 'qmd://' + collection + '/' + missing ? missing : CANDIDATES.find(name => path.join(fixture, name) === absolute);
      need(name && !result.has(name), 'producer_candidate_binding');
      if (name === missing) need(item.title === 'Removed ledger note' && item.snippet.includes(QUERY) && item.snippet.includes('was indexed here.'), 'producer_missing_cached_content');
      if (after && name === missing) need(kind === 'qmd_uri' && item.file === 'qmd://' + collection + '/' + missing, 'producer_missing_exact_fallback');
      const valid = typeof item.docid === 'string' && /^#[a-f0-9]{1,64}$/.test(item.docid);
      result.set(name, { path: name, docid: valid ? item.docid : null, docidObserved: Object.hasOwn(item, 'docid'), docidValid: valid,
        title: item.title, file: item.file, pathKind: kind, snippetBytes: Buffer.byteLength(item.snippet),
        snippetSha256: sha(item.snippet), snippetContainsQuery: item.snippet.includes(QUERY),
        displayPath: typeof item.displayPath === 'string' ? item.displayPath : null });
    }
    need(isDeepStrictEqual([...result.keys()].sort(), [...CANDIDATES].sort()), 'producer_candidate_membership'); return result;
  }
  const before = controls(decoded[1], false), after = controls(decoded[3], true);
  need(isDeepStrictEqual(observations.baselineControl, [...before.values()]) && isDeepStrictEqual(observations.staleControl, [...after.values()])
    && after.get('selected/knowledge/stale.md').title === before.get('selected/knowledge/stale.md').title
    && after.get('selected/knowledge/stale.md').title !== 'Revised archive note', 'producer_control_observation');
  function wrapper(output, changed) {
    const files = { ...FILES }; if (changed) { files['selected/knowledge/stale.md'] = REVISED; delete files['selected/knowledge/removed.md']; }
    const paths = ['knowledge/current.md', 'knowledge/stale.md', ...(changed ? [] : ['knowledge/removed.md'])];
    const bytes = ['selected/README.md', ...paths.map(name => 'selected/' + name)].reduce((sum, name) => sum + Buffer.byteLength(files[name]), 0);
    const skipped = [{ path: '', reason: 'local_path_outside_root' }, { path: 'raw/private.md', reason: 'local_path_invalid' }];
    if (changed) skipped.push({ path: '', reason: 'local_path_invalid' });
    skipped.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : a.reason < b.reason ? -1 : a.reason > b.reason ? 1 : 0);
    need(output?.schemaVersion === 'vafs-local-search-v1' && output.query === QUERY && output.source?.kind === 'local_checkout'
      && output.source.rootId === sha(selected) && output.meta?.documents === paths.length + 1 && output.meta.bytes === bytes
      && isDeepStrictEqual(output.meta.legs, { metadata: { status: 'ok' }, rg: { status: 'ok' }, qmd: { status: 'ok', collection } })
      && Array.isArray(output.data) && isDeepStrictEqual(output.data.map(item => item.path).sort(), [...paths].sort())
      && isDeepStrictEqual(output.skipped, skipped), 'wrapper_scope');
    for (const item of output.data) {
      const data = Buffer.from(files['selected/' + item.path]), at = data.indexOf(QUERY);
      const stem = item.path === 'knowledge/current.md' ? ['Current sail note', 'A neutral eligible note.']
        : item.path === 'knowledge/stale.md' ? changed ? ['Revised archive note', 'Current revised description.'] : ['Cached archive note', 'Original neutral description.']
        : ['Removed ledger note', 'Neutral deletion fixture.'];
      need(item.title === stem[0] && item.description === stem[1] && item.date === '2026-11-07' && item.dateSource === 'frontmatter'
        && item.bytes === data.length && item.contentHash === sha(data) && Number.isFinite(item.score)
        && isDeepStrictEqual(item.modes, at < 0 ? ['qmd'] : ['grep', 'qmd']), 'wrapper_current_bytes');
      if (at < 0) need(isDeepStrictEqual(item.matches, []), 'wrapper_stale_no_matches');
      else need(item.matches?.length === 1 && item.matches[0].text === QUERY && item.matches[0].byteStart === at
        && item.matches[0].byteEnd === at + Buffer.byteLength(QUERY) && item.matches[0].line === data.subarray(0, at).toString().split('\n').length
        && item.matches[0].excerpt.includes(QUERY), 'wrapper_utf8_match');
    }
    need(!JSON.stringify(output).includes('raw-private-sentinel-only') && !JSON.stringify(output).includes('outside-sentinel-only')
      && (!changed || !JSON.stringify(output).includes('Cached archive note')), 'wrapper_excluded_text');
    return { documents: paths.length + 1, bytes, sourceRootId: output.source.rootId,
      data: output.data.map(({ path, title, description, date, dateSource, contentHash, bytes, modes, matches }) => ({ path, title, description, date, dateSource, contentHash, bytes, modes, matches })),
      skipped: output.skipped, rawExcluded: true, foreignExcluded: true };
  }
  need(isDeepStrictEqual(observations.baseline, wrapper(decoded[2], false)) && isDeepStrictEqual(observations.afterMutation, wrapper(decoded[4], true)), 'wrapper_observation');
  const missing = after.get('selected/knowledge/removed.md');
  need(isDeepStrictEqual(observations.removedCandidate, { pathKind: 'qmd_uri', missingFilesystemBranchCovered: false, unsupportedIdentifierRejected: true,
    fallbackDocidObserved: missing.docidObserved, fallbackDocidValid: missing.docidValid,
    baselineDocidExposed: before.get('selected/knowledge/removed.md').docidObserved, docidContinuityClaimed: false })
    && observations.query === QUERY && observations.realCommands === 5, 'removed_branch_observation');
  need(value.snapshots?.length === 2 && value.snapshots[0].phase === 'before_index'
    && value.snapshots[1].phase === 'after_intentional_edit_and_removal' && value.mutations?.length === 2, 'fixture_snapshot_shape');
  for (let phase = 0; phase < 2; phase++) {
    const expected = { ...FILES }; if (phase) { expected['selected/knowledge/stale.md'] = REVISED; delete expected['selected/knowledge/removed.md']; }
    const rows = value.snapshots[phase].files;
    need(Array.isArray(rows) && rows.length === Object.keys(expected).length && new Set(rows.map(item => item.path)).size === rows.length
      && rows.every(item => Object.hasOwn(expected, item.path) && item.bytes === Buffer.byteLength(expected[item.path])
        && item.sha256 === sha(expected[item.path]) && item.mode === 0o600), 'fixture_snapshot_bytes');
  }
  const originalStale = value.snapshots[0].files.find(item => item.path === 'selected/knowledge/stale.md');
  const revisedStale = value.snapshots[1].files.find(item => item.path === 'selected/knowledge/stale.md');
  const originalRemoved = value.snapshots[0].files.find(item => item.path === 'selected/knowledge/removed.md');
  need(isDeepStrictEqual(value.mutations[0], { path: originalStale.path, kind: 'replace_owned_bytes_after_index', before: originalStale, after: revisedStale })
    && originalStale.dev === revisedStale.dev && originalStale.ino === revisedStale.ino
    && isDeepStrictEqual(value.mutations[1], { path: originalRemoved.path, kind: 'unlink_owned_file_after_index', before: originalRemoved, absent: true }), 'fixture_mutation_binding');
  need(value.sourceFiles?.length === 7 && new Set(value.sourceFiles.map(item => item.path)).size === 7
    && value.sourceFiles.every(item => exportManifest.some(expected => expected.path === item.path && expected.bytes === item.bytes
      && expected.sha256 === item.sha256 && item.mode === (expected.mode === '100755' ? 0o700 : 0o600))), 'client_source_binding');
  need(value.toolFiles?.length === 3 && new Set(value.toolFiles.map(item => item.path)).size === 3
    && value.toolFiles.every(item => toolFiles.some(expected => expected.path === item.path && expected.bytes === item.bytes && expected.sha256 === item.sha256)), 'client_tool_binding');
  report.client.independentOriginalsVerified = { commands: 5, captures: 10,
    decodedBytes: value.commands.reduce((sum, row) => sum + row.streams.reduce((part, stream) => part + stream.bytes, 0), 0) };
  report.client.accepted = true;
}

function checkNativeFiles() {
  const value = report.nativeAdmission?.result;
  need(sha(read(path.join(tools, 'native-admission.mjs'), 32768)) === report.nativeAdmission?.sourceSha256, 'native_admission_source_changed');
  need(value?.actualInMemoryDatabase === true && value.vectorExtensionLoaded === true && value.databaseClosed === true
    && /^\d+\.\d+\.\d+$/.test(value.sqliteVersion ?? '') && /^v?0\.1\.9$/.test(value.vecVersion ?? '')
    && Array.isArray(value.files) && value.files.length === 2, 'native_admission_incomplete');
  for (const item of value.files) {
    need(typeof item.path === 'string' && !path.isAbsolute(item.path) && !item.path.split('/').some(part => !part || part === '.' || part === '..'), 'native_relative_path_invalid');
    const file = path.join(tools, item.path), real = fs.realpathSync(file);
    need(real === file && real.startsWith(root + path.sep), 'native_path_changed');
    const bytes = read(file, 134217728); need(bytes.length === item.bytes && sha(bytes) === item.sha256
      && bytes.subarray(0, 4).equals(Buffer.from([127, 69, 76, 70])), 'native_bytes_changed');
  }
}
try {
  await canonicalBase(); await guard('before'); metadataPrerequisite();
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
  fs.writeFileSync(path.join(tools, 'package.json'), JSON.stringify({ name: 'vafs-qmd-owned-ci', version: '0.0.0', private: true,
    dependencies: Object.fromEntries(REQUIRED.map(item => [item.name, item.version])) }) + '\n', { flag: 'wx', mode: 0o600 });
  const lock = await run('generate_tool_lock', process.execPath, [npm, 'install', '--prefix', tools, '--package-lock-only',
    '--ignore-scripts', '--omit=optional', '--no-audit', '--no-fund'], 90, { cwd: tools, retainFailure: true });
  retainToolState(); need(lock.accepted, 'generate_tool_lock_failed');
  const lockHash = report.toolLock.raw.sha256;
  await run('install_frozen_qmd', process.execPath, [npm, 'ci', '--prefix', tools, '--ignore-scripts', '--omit=optional', '--no-audit', '--no-fund'], 120, { cwd: tools });
  retainToolState(); need(report.toolLock.raw.sha256 === lockHash, 'tool_lock_changed');
  installedProof(); checkStorage(true); modelCacheGuard('before_native_admission');
  const tree = await run('resolved_tool_tree', process.execPath, [npm, 'ls', '--prefix', tools, '--all', '--omit=optional', '--json'], 30, { cwd: tools, retainFailure: true });
  report.resolvedToolTree = { raw: compressed(tree.output[0]), parsed: null };
  report.resolvedToolTree.parsed = JSON.parse(tree.output[0]); need(tree.accepted, 'resolved_tool_tree_failed');
  const nativeFile = path.join(tools, 'native-admission.mjs');
  fs.writeFileSync(nativeFile, NATIVE_ADMISSION, { flag: 'wx', mode: 0o600 });
  report.nativeAdmission = { sourceSha256: sha(NATIVE_ADMISSION), generatedSha256: sha(read(nativeFile, 32768)), result: null };
  need(report.nativeAdmission.generatedSha256 === report.nativeAdmission.sourceSha256, 'native_admission_source_changed');
  const native = await run('native_sqlite_vector_admission', process.execPath, [nativeFile], 20, { cwd: tools, retainFailure: true });
  if (native.output[0].length) {
    try { report.nativeAdmission.result = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(native.output[0])); }
    catch { report.nativeAdmission.jsonError = 'native_stdout_not_utf8_json'; }
  }
  need(native.accepted && !report.nativeAdmission.jsonError, 'native_sqlite_vector_admission_failed');
  checkNativeFiles(); modelCacheGuard('before_client'); checkExport(); await guard('before_client');
  need(workEnd - Date.now() >= 317000, 'client_window_unavailable');
  const client = await run('qmd_keyword_case', process.execPath, [specFile], 310, { cwd: tools, retainFailure: true });
  clientResults(client.output[0]); need(client.accepted, 'client_cli_failed');
  installedProof(); checkNativeFiles(); modelCacheGuard('after_client'); checkStorage(true);
  checkExport(); await guard('after_client');
} catch (error) { report.errors.push(finite(error)); }
finally {
  cleanupEnd = Math.min(Date.now() + 90000, workEnd + 90000);
  try { if (fs.existsSync(path.join(tools, 'package.json'))) retainToolState(); } catch (error) { report.errors.push(finite(error)); }
  try { if (exportManifest) checkExport(); } catch (error) { report.errors.push(finite(error)); }
  try { if (installedPackages) installedProof(); if (report.nativeAdmission?.result) checkNativeFiles(); modelCacheGuard('finally'); checkStorage(true); } catch (error) { report.errors.push(finite(error)); }
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
  process.stdout.write('VAFS_QMD_REPORT=' + text + '\n', () => {
    clearTimeout(outputTimer); clearTimeout(globalTimer);
    for (const [signal, handler] of handlers) process.removeListener(signal, handler);
    process.exitCode = report.status === 'passed' && !interrupted && !globalExpired && Date.now() <= workEnd + 92000 ? 0 : 1;
  });
}
