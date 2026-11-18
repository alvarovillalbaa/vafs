#!/usr/bin/env node
// Tier 2: one authored corpus, actual QMD FTS and unchanged production vAFS CLI.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { isDeepStrictEqual } from 'node:util';

const BASE = 'f94a884596a95a5ad24c7ebbdd14ba8365574f2e';
const QMD_SOURCE = '86d2365d17fc682e491c2c53d1e4a884aee8682a';
const TITLE = 'configured QMD keyword candidates reconcile to current eligible Markdown bytes';
const QUERY = 'vafsquartzharbor20261107';
const SOURCE_FILES = ['bin/vafs.mjs', 'bin/cli.mjs', ...['corpus', 'errors', 'output', 'process', 'retrieval'].map(name => `bin/local/${name}.mjs`)];
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
const STREAM_LIMIT = 65536, ZIP_LIMIT = 32768, ALL_ZIP_LIMIT = 131072, REPORT_LIMIT = 524288;
const sha = value => createHash('sha256').update(value).digest('hex');
const need = (value, code) => { if (!value) throw new Error(code); };
const finite = error => /^[a-z][a-z0-9_]{0,100}$/.test(error?.message ?? '') ? error.message : 'qmd_check_failed';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const inside = (parent, child) => child.startsWith(parent + path.sep);
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const report = {
  schemaVersion: 1, sourceCommit: process.env.SOURCE_COMMIT ?? null, canonicalBaseCommit: BASE,
  qmdSourceReference: { commit: QMD_SOURCE, expectedPackage: '@tobilu/qmd', expectedVersion: '2.8.3',
    qualification: 'Source-described profile only; published archive and native-binding admission are separate prerequisites owned by the supervisor.' },
  status: 'failed', case: { id: 'Q01', title: TITLE, accepted: false, error: 'unrun', observations: {} },
  commands: [], errors: [], mutations: [], snapshots: [], cleanup: { passed: false, fixtureUnchangedSinceIntentionalMutation: false,
    fixtureRemoved: false, activeChildren: null, ownedProcessesRemaining: null, uncertain: false, signalsSent: false, failures: [] },
  limits: { workSeconds: 240, cleanupSeconds: 60, stdoutSeconds: 2, cliSeconds: 35,
    streamBytes: STREAM_LIMIT, streamGzipBytes: ZIP_LIMIT, allStreamsGzipBytes: ALL_ZIP_LIMIT, reportBytes: REPORT_LIMIT },
  proofLimits: [
    'One real collection/FTS/vAFS CLI journey uses six authored Markdown files. It does not repeat the old34/63 suites or Inspector I01.',
    'No embedding, semantic query, reranking, model, account, hosted API, browser, Next server or fake provider is invoked by this driver.',
    'The supervisor must first admit the official published QMD archive, frozen tool lock and working native SQLite/vector bindings. Package name/version checks here do not replace that gate.',
    'Only the actually observed absolute or explicit ./ full-path branch is covered. Unsupported identifiers remain unsupported; a removed-row fallback does not prove the missing-filesystem branch.',
    'QMD normally omits document IDs for resolved full paths. Optional IDs are observations only; no baseline-to-fallback ID continuity is claimed.',
    'A live eligible path may retain stale QMD rank while vAFS supplies fresh current metadata/hash/bytes. This is not a promise of fresh index ranking or retrieval quality.',
    'Edits occur only between closed commands. This does not establish an atomic filesystem snapshot under concurrent writers, symlink-retarget coverage or host-wide network/process attestation.',
    'All commands retain bounded original streams before assertions; any harness signal or uncertain closure prevents acceptance. The supervisor owns final XDG/tool/scratch disposal.',
  ],
};
const workEnd = Date.now() + 240000;
let cleanupEnd, root, identity, markerIdentity, nonce, source, packageRoot, qmdExecutable, fixture, fixtureIdentity, selectedRoot, home;
let sourceBefore, toolBefore, expectedFiles = { ...FILES }, expectedSnapshot, toolEnv, env, collection;
let totalZip = 0, interrupted = false;
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
function ancestorConfigGuard() {
  for (let directory = home; ; directory = path.dirname(directory)) {
    try { fs.lstatSync(path.join(directory, '.qmd')); throw new Error('ancestor_qmd_config_present'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (directory === path.dirname(directory)) break;
  }
}
function fixtureGuard() {
  owner(); const info = fs.lstatSync(fixture);
  need(info.isDirectory() && !info.isSymbolicLink() && info.uid === process.getuid() && (info.mode & 0o777) === 0o700
    && info.dev === fixtureIdentity.dev && info.ino === fixtureIdentity.ino, 'fixture_identity_changed');
  const found = [];
  function walk(directory) {
    for (const name of fs.readdirSync(directory)) {
      const file = path.join(directory, name), item = fs.lstatSync(file);
      need(!item.isSymbolicLink() && item.uid === process.getuid(), 'fixture_type_changed');
      if (item.isDirectory()) walk(file); else { need(item.isFile(), 'fixture_type_changed'); found.push(path.relative(fixture, file)); }
    }
  }
  walk(fixture); const names = Object.keys(expectedFiles).sort();
  need(isDeepStrictEqual(found.sort(), names) && isDeepStrictEqual(vector(fixture, names), expectedSnapshot), 'fixture_membership_or_bytes_changed');
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
async function command(label, kind, args, wantJson = true) {
  owner(); fixtureGuard(); ancestorConfigGuard(); need(!interrupted && workEnd - Date.now() >= 35000, 'cli_window_unavailable');
  const executable = kind === 'qmd' ? qmdExecutable : process.execPath;
  const actualArgs = kind === 'qmd' ? args : [path.join(source, 'bin/vafs.mjs'), ...args];
  const started = Date.now(), child = spawn(executable, actualArgs, { cwd: home, env: kind === 'qmd' ? toolEnv : env,
    detached: true, shell: false, stdio: ['ignore', 'pipe', 'pipe'] });
  const row = { label, kind, startedAt: started, cwd: 'canonical_original_home', exitCode: null, signal: null,
    stopReason: null, forcedDrain: false, streams: [], accepted: false };
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
  if (wantJson) {
    try { row.json = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(output[0])); }
    catch { row.jsonError = 'stdout_not_single_utf8_json'; }
  }
  need(row.streams.every(item => item.compressedBytes <= ZIP_LIMIT) && totalZip <= ALL_ZIP_LIMIT, 'capture_gzip_limit');
  row.accepted = row.exitCode === 0 && row.signal === null && row.stopReason === null && row.released && row.streams.every(item => item.complete)
    && !report.cleanup.signalsSent && !report.cleanup.uncertain;
  need(row.accepted, label + '_cli_failed'); need(!wantJson || !row.jsonError, label + '_json_invalid');
  fixtureGuard(); ancestorConfigGuard(); return row.json;
}
function renderedPath(value) {
  need(typeof value === 'string' && value.length > 0 && Buffer.byteLength(value) <= 4096 && !value.includes('\0'), 'qmd_file_invalid');
  if (path.isAbsolute(value)) return { kind: 'absolute', absolute: path.resolve(value) };
  if (value.startsWith('./')) return { kind: 'cwd_relative', absolute: path.resolve(home, value) };
  return { kind: value.startsWith('qmd://') ? 'qmd_uri' : 'unsupported_identifier', absolute: null };
}
function controlRows(rows, previous) {
  need(Array.isArray(rows) && rows.length === CANDIDATES.length, 'qmd_candidate_count');
  const byName = new Map(), removed = 'selected/knowledge/removed.md';
  for (const row of rows) {
    need(record(row) && typeof row.title === 'string' && typeof row.snippet === 'string' && Buffer.byteLength(row.snippet) <= 8192
      && typeof row.score === 'number' && Number.isFinite(row.score), 'qmd_candidate_identity');
    const observedPath = renderedPath(row.file), fallback = previous && row.file === `qmd://${collection}/${removed}`;
    const name = fallback ? removed : CANDIDATES.find(item => path.join(fixture, item) === observedPath.absolute);
    need(name && !byName.has(name), 'qmd_candidate_binding');
    if (previous && name === removed) {
      const old = previous.get(removed);
      need(fallback && observedPath.kind === 'qmd_uri' && row.title === 'Removed ledger note'
        && row.title === old.title && row.snippet.includes(QUERY)
        && row.snippet.includes('was indexed here.'), 'qmd_removed_fallback_binding');
    } else need(observedPath.absolute === path.join(fixture, name), 'qmd_live_path_binding');
    if (name === removed) need(row.title === 'Removed ledger note' && row.snippet.includes(QUERY)
      && row.snippet.includes('was indexed here.'), 'qmd_removed_cached_content');
    const validDocid = typeof row.docid === 'string' && /^#[a-f0-9]{1,64}$/.test(row.docid);
    byName.set(name, { docid: validDocid ? row.docid : null, docidObserved: Object.hasOwn(row, 'docid'), docidValid: validDocid,
      title: row.title, file: row.file, pathKind: observedPath.kind, snippetBytes: Buffer.byteLength(row.snippet),
      snippetSha256: sha(row.snippet), snippetContainsQuery: row.snippet.includes(QUERY),
      displayPath: typeof row.displayPath === 'string' ? row.displayPath : null });
  }
  need(isDeepStrictEqual([...byName.keys()].sort(), [...CANDIDATES].sort()), 'qmd_candidates_incomplete'); return byName;
}
function expectedSkips(control, changed) {
  const result = [
    { path: 'raw/private.md', reason: 'local_path_invalid' },
    { path: '', reason: 'local_path_outside_root' },
  ];
  if (changed) {
    const missing = control.get('selected/knowledge/removed.md'), supported = ['absolute', 'cwd_relative'].includes(missing.pathKind);
    result.push({ path: supported ? 'knowledge/removed.md' : '', reason: supported ? 'local_file_unavailable' : 'local_path_invalid' });
  }
  return result.sort((a, b) => compare(a.path, b.path) || compare(a.reason, b.reason));
}
function wrapperResult(value, control, changed) {
  const paths = ['knowledge/current.md', 'knowledge/stale.md', ...(changed ? [] : ['knowledge/removed.md'])];
  const eligible = ['selected/README.md', ...paths.map(name => 'selected/' + name)];
  const bytes = eligible.reduce((total, name) => total + Buffer.byteLength(expectedFiles[name]), 0);
  need(record(value) && value.schemaVersion === 'vafs-local-search-v1' && value.query === QUERY
    && value.source?.kind === 'local_checkout' && value.source.rootId === sha(selectedRoot)
    && value.meta?.documents === eligible.length && value.meta.bytes === bytes
    && isDeepStrictEqual(value.meta.legs, { metadata: { status: 'ok' }, rg: { status: 'ok' }, qmd: { status: 'ok', collection } })
    && Array.isArray(value.data) && isDeepStrictEqual(value.data.map(item => item.path).sort(), [...paths].sort())
    && isDeepStrictEqual(value.skipped, expectedSkips(control, changed)), 'vafs_scope_or_skips');
  for (const item of value.data) {
    const content = Buffer.from(expectedFiles['selected/' + item.path]), at = content.indexOf(QUERY);
    const title = item.path === 'knowledge/current.md' ? 'Current sail note' : item.path === 'knowledge/stale.md'
      ? changed ? 'Revised archive note' : 'Cached archive note' : 'Removed ledger note';
    const description = item.path === 'knowledge/current.md' ? 'A neutral eligible note.' : item.path === 'knowledge/stale.md'
      ? changed ? 'Current revised description.' : 'Original neutral description.' : 'Neutral deletion fixture.';
    const modes = at < 0 ? ['qmd'] : ['grep', 'qmd'];
    need(item.title === title && item.description === description && item.date === '2026-11-07' && item.dateSource === 'frontmatter'
      && item.contentHash === sha(content) && item.bytes === content.length
      && isDeepStrictEqual(item.modes, modes) && typeof item.score === 'number' && Number.isFinite(item.score), 'vafs_current_provenance');
    if (changed && item.path === 'knowledge/stale.md') need(at === -1 && isDeepStrictEqual(item.modes, ['qmd']), 'stale_qmd_only_required');
    if (at < 0) need(isDeepStrictEqual(item.matches, []), 'vafs_stale_literal_matches');
    else need(Array.isArray(item.matches) && item.matches.length === 1 && item.matches[0].byteStart === at
      && item.matches[0].byteEnd === at + Buffer.byteLength(QUERY) && item.matches[0].line === content.subarray(0, at).toString().split('\n').length
      && item.matches[0].text === QUERY && item.matches[0].excerpt.includes(QUERY), 'vafs_utf8_offsets');
  }
  const serialized = JSON.stringify(value);
  need(!serialized.includes('raw-private-sentinel-only') && !serialized.includes('outside-sentinel-only'), 'excluded_text_disclosed');
  if (changed) need(!serialized.includes('Cached archive note') && value.data.find(item => item.path === 'knowledge/stale.md').matches.length === 0, 'cached_text_replaced_current');
  return { documents: eligible.length, bytes, sourceRootId: value.source.rootId,
    data: value.data.map(({ path, title, description, date, dateSource, contentHash, bytes, modes, matches }) => ({ path, title, description, date, dateSource, contentHash, bytes, modes, matches })),
    skipped: value.skipped, rawExcluded: true, foreignExcluded: true };
}
function takeSnapshot(phase) {
  expectedSnapshot = vector(fixture, Object.keys(expectedFiles).sort());
  report.snapshots.push({ phase, files: expectedSnapshot }); fixtureGuard();
}
function mutateFixture() {
  fixtureGuard(); const name = 'selected/knowledge/stale.md', file = path.join(fixture, name), before = vector(fixture, [name])[0];
  const fd = fs.openSync(file, fs.constants.O_WRONLY | fs.constants.O_NOFOLLOW);
  try {
    const current = fs.fstatSync(fd); need(current.dev === before.dev && current.ino === before.ino, 'mutation_inode_changed');
    fs.ftruncateSync(fd, 0); fs.writeFileSync(fd, REVISED);
  }
  finally { fs.closeSync(fd); }
  expectedFiles[name] = REVISED;
  const after = vector(fixture, [name])[0]; need(after.dev === before.dev && after.ino === before.ino && after.sha256 === sha(REVISED), 'mutation_write_mismatch');
  report.mutations.push({ path: name, kind: 'replace_owned_bytes_after_index', before, after });
  const removed = 'selected/knowledge/removed.md', removedBefore = vector(fixture, [removed])[0];
  need(isDeepStrictEqual(removedBefore, expectedSnapshot.find(item => item.path === removed)), 'removed_file_changed');
  fs.unlinkSync(path.join(fixture, removed)); delete expectedFiles[removed];
  report.mutations.push({ path: removed, kind: 'unlink_owned_file_after_index', before: removedBefore, absent: !fs.existsSync(path.join(fixture, removed)) });
  takeSnapshot('after_intentional_edit_and_removal');
}
try {
  need(process.platform === 'linux' && process.version === 'v26.13.0' && process.env.CI === 'true'
    && /^[a-f0-9]{40}$/.test(report.sourceCommit ?? ''), 'approved_ci_profile_required');
  need(!REVISED.includes(QUERY) && sha(REVISED) !== sha(FILES['selected/knowledge/stale.md']), 'authored_stale_fixture_invalid');
  need(typeof process.env.HOME === 'string' && path.isAbsolute(process.env.HOME), 'original_home_required');
  home = fs.realpathSync(process.env.HOME); ancestorConfigGuard();
  root = fs.realpathSync(process.env.VAFS_QMD_RUN_ROOT ?? ''); nonce = process.env.VAFS_QMD_NONCE;
  need(root === process.env.VAFS_QMD_RUN_ROOT && /^[a-f0-9]{32}$/.test(nonce ?? '') && home !== root && !inside(root, home), 'root_scope_invalid');
  identity = fs.lstatSync(root); markerIdentity = fs.lstatSync(path.join(root, '.owner')); owner();
  source = fs.realpathSync(process.env.VAFS_QMD_SOURCE_ROOT ?? ''); packageRoot = fs.realpathSync(process.env.VAFS_QMD_PACKAGE_ROOT ?? '');
  need(inside(root, source) && inside(root, packageRoot), 'source_or_package_outside_owned_root');
  qmdExecutable = fs.realpathSync(process.env.VAFS_QMD_EXECUTABLE ?? '');
  need(qmdExecutable === path.join(packageRoot, 'bin/qmd') && (fs.lstatSync(qmdExecutable).mode & 0o111) !== 0, 'qmd_executable_invalid');
  const packageBytes = read(path.join(packageRoot, 'package.json'), 65536), pkg = JSON.parse(packageBytes);
  need(pkg.name === '@tobilu/qmd' && pkg.version === '2.8.3' && pkg.bin?.qmd === 'bin/qmd', 'qmd_package_profile_mismatch');
  sourceBefore = vector(source, SOURCE_FILES); report.sourceFiles = sourceBefore;
  toolBefore = vector(packageRoot, ['package.json', 'bin/qmd', 'dist/cli/qmd.js']); report.toolFiles = toolBefore;
  report.runtime = { node: process.version, qmdPackage: pkg.name, qmdVersion: pkg.version, packageJsonSha256: sha(packageBytes),
    executableSha256: sha(read(qmdExecutable)), installedEntrySha256: sha(read(path.join(packageRoot, 'dist/cli/qmd.js'), 4194304)) };
  const inheritedPaths = String(process.env.PATH ?? '').split(path.delimiter), nodeBin = path.dirname(process.execPath);
  need(inheritedPaths.length > 0 && inheritedPaths.every(directory => path.isAbsolute(directory) && (directory === nodeBin || inside(root, directory)
    || ['/usr/local/bin', '/usr/bin', '/bin', '/usr/sbin', '/sbin'].includes(directory))), 'child_path_not_allowlisted');
  function executableFromPath(name) {
    const match = inheritedPaths.map(directory => path.join(directory, name)).find(file => { try { const item = fs.statSync(file); return item.isFile() && (item.mode & 0o111) !== 0; } catch { return false; } });
    return match ? fs.realpathSync(match) : null;
  }
  need(executableFromPath('qmd') === qmdExecutable && executableFromPath('node') === fs.realpathSync(process.execPath), 'actual_child_executable_mismatch');
  toolEnv = { PATH: process.env.PATH, HOME: process.env.HOME, LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' };
  for (const name of ['TMPDIR', 'TMP', 'TEMP', 'XDG_CONFIG_HOME', 'XDG_DATA_HOME', 'XDG_CACHE_HOME']) {
    const value = process.env[name]; need(typeof value === 'string' && path.isAbsolute(value), 'owned_runtime_directory_required');
    const directory = fs.realpathSync(value), item = fs.lstatSync(value);
    need(directory === value && inside(root, directory) && item.isDirectory() && !item.isSymbolicLink()
      && item.uid === process.getuid() && (item.mode & 0o777) === 0o700, 'owned_runtime_directory_required'); toolEnv[name] = value;
  }
  for (const name of ['XDG_CONFIG_HOME', 'XDG_DATA_HOME', 'XDG_CACHE_HOME']) {
    try { fs.lstatSync(path.join(toolEnv[name], 'qmd')); throw new Error('qmd_state_preexisting'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  env = { ...toolEnv, CI: 'true', NO_COLOR: '1' };
  report.configuration = { originalHomeRetained: true, cwd: 'canonical_original_home', ancestorQmdConfigAbsent: true, initialQmdStateAbsent: true,
    actualQmdPathVerified: true, actualNodePathVerified: true, directQmdEnvironmentKeys: Object.keys(toolEnv).sort(),
    vafsEnvironmentKeys: Object.keys(env).sort(), noQmdPrivateOverrides: true };
  for (let pid = process.ppid, depth = 0; pid > 1 && depth < 64; depth++) {
    const item = processInfo(pid); if (!item) break; ancestors.set(pid, item.starttime); pid = item.ppid;
  }
  need(scan().length === 0, 'owned_processes_preexisting');
  fixture = process.env.VAFS_QMD_FIXTURE_ROOT;
  need(typeof fixture === 'string' && path.isAbsolute(fixture) && path.dirname(fixture) === root && !fs.existsSync(fixture), 'fixture_scope_invalid');
  fs.mkdirSync(fixture, { mode: 0o700 }); fixtureIdentity = fs.lstatSync(fixture);
  for (const name of ['selected', 'selected/knowledge', 'selected/raw']) fs.mkdirSync(path.join(fixture, name), { mode: 0o700 });
  selectedRoot = fs.realpathSync(path.join(fixture, 'selected'));
  for (const [name, text] of Object.entries(FILES)) fs.writeFileSync(path.join(fixture, name), text, { flag: 'wx', mode: 0o600 });
  takeSnapshot('before_index'); collection = 'vafs-q01-' + nonce.slice(0, 12);
  report.collection = { name: collection, authoredFiles: 6, mask: '**/*.md', createdFromAbsentOwnedState: true };
  await command('collection_add', 'qmd', ['collection', 'add', fixture, '--name', collection, '--mask', '**/*.md'], false);
  const searchArgs = ['search', QUERY, '-c', collection, '--json', '-n', '20', '--full-path'];
  const wrapperArgs = ['local', 'search', QUERY, '--root', selectedRoot, '--qmd-collection', collection, '--limit', '20'];
  const baselineControl = controlRows(await command('qmd_baseline', 'qmd', searchArgs));
  report.case.observations.baselineControl = [...baselineControl].map(([path, value]) => ({ path, ...value }));
  report.case.observations.baseline = wrapperResult(await command('vafs_baseline', 'vafs', wrapperArgs), baselineControl, false);
  mutateFixture();
  const changedControl = controlRows(await command('qmd_stale', 'qmd', searchArgs), baselineControl);
  need(changedControl.get('selected/knowledge/stale.md').title === baselineControl.get('selected/knowledge/stale.md').title
    && changedControl.get('selected/knowledge/stale.md').title !== 'Revised archive note', 'qmd_cached_title_not_observed');
  report.case.observations.staleControl = [...changedControl].map(([path, value]) => ({ path, ...value }));
  report.case.observations.afterMutation = wrapperResult(await command('vafs_stale', 'vafs', wrapperArgs), changedControl, true);
  const missing = changedControl.get('selected/knowledge/removed.md');
  report.case.observations.removedCandidate = { pathKind: missing.pathKind,
    missingFilesystemBranchCovered: ['absolute', 'cwd_relative'].includes(missing.pathKind),
    unsupportedIdentifierRejected: !['absolute', 'cwd_relative'].includes(missing.pathKind),
    fallbackDocidObserved: missing.docidObserved, fallbackDocidValid: missing.docidValid,
    baselineDocidExposed: baselineControl.get('selected/knowledge/removed.md').docidObserved,
    docidContinuityClaimed: false };
  report.case.observations.query = QUERY; report.case.observations.realCommands = 5;
  need(report.commands.length === 5 && report.commands.every(row => row.accepted), 'five_real_commands_required');
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
      if (toolBefore) need(isDeepStrictEqual(vector(packageRoot, ['package.json', 'bin/qmd', 'dist/cli/qmd.js']), toolBefore), 'qmd_tool_changed');
      if (expectedSnapshot) {
        fixtureGuard(); report.cleanup.fixtureUnchangedSinceIntentionalMutation = true;
        for (const name of Object.keys(expectedFiles)) fs.unlinkSync(path.join(fixture, name));
        fs.rmdirSync(path.join(fixture, 'selected/knowledge')); fs.rmdirSync(path.join(fixture, 'selected/raw'));
        fs.rmdirSync(path.join(fixture, 'selected')); fs.rmdirSync(fixture); report.cleanup.fixtureRemoved = !fs.existsSync(fixture);
      }
      if (home) ancestorConfigGuard();
      report.cleanup.passed = report.cleanup.fixtureUnchangedSinceIntentionalMutation && report.cleanup.fixtureRemoved && !report.cleanup.signalsSent;
    } catch (error) { report.cleanup.failures.push(finite(error)); }
  }
  if (interrupted) report.errors.push('interrupted');
  if (Date.now() > workEnd + 60000) report.errors.push('global_deadline');
  if (!report.cleanup.passed || report.cleanup.failures.length || report.cleanup.signalsSent) report.errors.push('resource_cleanup_unverified');
  if (report.case.accepted && report.errors.length) { report.case.accepted = false; report.case.error = 'late_resource_failure'; }
  report.status = report.case.accepted && report.errors.length === 0 && report.cleanup.passed ? 'passed' : 'failed';
  let output = JSON.stringify(report);
  if (Buffer.byteLength(output) > REPORT_LIMIT) { report.status = 'failed'; output = JSON.stringify({ schemaVersion: 1, sourceCommit: report.sourceCommit, status: 'failed', errors: ['report_limit'] }); }
  const timer = setTimeout(() => process.exit(1), 2000);
  process.stdout.write('VAFS_QMD_KEYWORD_RESULT=' + output + '\n', () => {
    clearTimeout(timer); for (const [signal, handler] of handlers) process.removeListener(signal, handler);
    process.exit(report.status === 'passed' ? 0 : 1);
  });
}
