import { constants } from 'node:fs';
import { lstat, open, realpath } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { basename, extname, isAbsolute, join, relative, sep, win32 } from 'node:path';
import { LocalError } from './errors.mjs';
import { runLocalCommand } from './process.mjs';

const MAX_DOCUMENTS = 1000;
const MAX_FILE_BYTES = 512 * 1024;
const MAX_TOTAL_BYTES = 16 * 1024 * 1024;
const EXCLUDED = new Set(['node_modules', 'vendor', 'dist', 'build']);
const EXTENSIONS = new Set(['.md', '.mdx', '.txt']);
const compare = (left, right) => left < right ? -1 : left > right ? 1 : 0;
const hash = value => createHash('sha256').update(value).digest('hex');
const fail = code => { throw new LocalError(code); };

function cancelled(signal) { if (signal?.aborted) fail('local_request_cancelled'); }
function inside(root, path) { const value = relative(root, path); return value === '' || (!isAbsolute(value) && value !== '..' && !value.startsWith(`..${sep}`)); }
function sameFile(left, right) {
  return left.dev === right.dev && left.ino === right.ino && left.size === right.size
    && left.mtimeNs === right.mtimeNs && left.ctimeNs === right.ctimeNs;
}

async function rootContext(value, signal) {
  cancelled(signal);
  if (value === undefined || value === null || (typeof value === 'string' && !value.trim())) fail('local_root_required');
  if (typeof value !== 'string' || value.includes('\0')) fail('local_root_invalid');
  try {
    const root = await realpath(value);
    const info = await lstat(root, { bigint: true });
    if (!info.isDirectory() || info.isSymbolicLink()) fail('local_root_invalid');
    cancelled(signal);
    return { root, info };
  } catch (error) { if (error instanceof LocalError) throw error; fail('local_root_invalid'); }
}

function documentPath(value, includeRaw) {
  if (typeof value !== 'string' || !value || isAbsolute(value) || win32.isAbsolute(value)
    || /^[a-z]:/i.test(value) || /[\\\u0000-\u001f\u007f]/u.test(value)) fail('local_path_invalid');
  const parts = value.split('/');
  if (parts.some(part => !part || part === '.' || part === '..' || part.startsWith('.') || EXCLUDED.has(part))
    || (!includeRaw && parts[0] === 'raw') || !EXTENSIONS.has(extname(value).toLowerCase())) fail('local_path_invalid');
  return value;
}

async function listPaths(context, { includeRaw, signal }) {
  const args = ['--files', '--null', '--no-config', '--no-require-git'];
  // Positive whitelist globs can override .gitignore; filter extensions after enumeration.
  for (const folder of ['.git', '.cache', 'node_modules', 'vendor', 'dist', 'build']) args.push('--glob', `!**/${folder}/**`);
  if (!includeRaw) args.push('--glob', '!raw/**');
  let result;
  try {
    result = await runLocalCommand('rg', args, { cwd: context.root, signal, allowExitCodes: [0, 1] });
  } catch (error) {
    if (error?.code === 'local_process_missing') fail('local_rg_unavailable');
    if (error?.code === 'local_process_failed') fail('local_rg_failed');
    if (error instanceof LocalError) throw error;
    fail('local_rg_failed');
  }
  cancelled(signal);
  if (![0, 1].includes(result.exitCode)) fail('local_rg_failed');
  let output;
  try { output = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(result.stdout); }
  catch { fail('local_rg_failed'); }
  if (output && !output.endsWith('\0')) fail('local_rg_failed');
  const paths = new Set();
  for (const entry of output.split('\0')) {
    if (!entry) continue;
    const path = sep === '\\' ? entry.replaceAll('\\', '/') : entry;
    try { paths.add(documentPath(path, includeRaw)); }
    catch (error) { if (!(error instanceof LocalError)) throw error; }
  }
  if (paths.size > MAX_DOCUMENTS) fail('local_corpus_too_large');
  return [...paths].sort(compare);
}

async function inspectRoot(context, signal) {
  cancelled(signal);
  const rootInfo = await lstat(context.root, { bigint: true });
  if (rootInfo.isSymbolicLink()) fail('local_symlink_forbidden');
  if (!rootInfo.isDirectory() || rootInfo.dev !== context.info.dev || rootInfo.ino !== context.info.ino) fail('local_file_unavailable');
}

async function inspectPath(context, path, signal) {
  await inspectRoot(context, signal);
  const parts = path.split('/');
  let absolute = context.root, info;
  for (let index = 0; index < parts.length; index++) {
    absolute = join(absolute, parts[index]);
    info = await lstat(absolute, { bigint: true });
    if (info.isSymbolicLink()) fail('local_symlink_forbidden');
    if (index < parts.length - 1 && !info.isDirectory()) fail('local_file_unavailable');
  }
  if (!info?.isFile()) fail('local_file_unavailable');
  const resolved = await realpath(absolute);
  if (!inside(context.root, resolved)) fail('local_path_outside_root');
  if (resolved !== absolute) fail('local_file_unavailable');
  cancelled(signal);
  return { absolute, info };
}

async function readDocument(context, path, budget, signal) {
  let handle;
  try {
    const before = await inspectPath(context, path, signal);
    if (before.info.size > BigInt(MAX_FILE_BYTES)) fail('local_file_too_large');
    handle = await open(before.absolute, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
    const opened = await handle.stat({ bigint: true });
    if (!opened.isFile() || !sameFile(before.info, opened)) fail('local_file_unavailable');
    const openedPath = await inspectPath(context, path, signal);
    if (!sameFile(opened, openedPath.info)) fail('local_file_unavailable');
    const chunks = [];
    let bytes = 0;
    while (true) {
      cancelled(signal);
      const chunk = Buffer.alloc(Math.min(64 * 1024, MAX_FILE_BYTES + 1 - bytes));
      const { bytesRead } = await handle.read(chunk, 0, chunk.length, null);
      if (bytesRead === 0) break;
      bytes += bytesRead;
      budget.bytes += bytesRead;
      if (budget.bytes > MAX_TOTAL_BYTES) fail('local_corpus_too_large');
      if (bytes > MAX_FILE_BYTES) fail('local_file_too_large');
      chunks.push(chunk.subarray(0, bytesRead));
    }
    const after = await handle.stat({ bigint: true });
    const afterPath = await inspectPath(context, path, signal);
    if (!sameFile(opened, after) || !sameFile(after, afterPath.info) || BigInt(bytes) !== after.size) fail('local_file_unavailable');
    const original = Buffer.concat(chunks, bytes);
    let content;
    try { content = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(original); }
    catch { fail('local_invalid_utf8'); }
    // NUL-bearing text uses the same fixed unsupported-encoding error as invalid UTF-8.
    if (content.includes('\0')) fail('local_invalid_utf8');
    const modifiedAt = new Date(Number(after.mtimeMs)).toISOString();
    const metadata = documentMetadata(content, path);
    cancelled(signal);
    return {
      path, title: metadata.title, description: metadata.description,
      date: metadata.date ?? modifiedAt, dateSource: metadata.date === null ? 'filesystem' : 'frontmatter',
      modifiedAt, content, contentHash: hash(original), bytes,
      section: path.includes('/') ? path.split('/')[0] : 'root', folder: null
    };
  } catch (error) { if (error instanceof LocalError) throw error; fail('local_file_unavailable'); }
  finally { if (handle) await handle.close().catch(() => undefined); }
}

function scalar(value) {
  const text = value.trim();
  if (!text || text.startsWith('#') || /^[\[\]{>|&*!]/u.test(text)) return null;
  if (text.startsWith('"')) {
    try { const decoded = JSON.parse(text); return typeof decoded === 'string' ? decoded : null; }
    catch { return null; }
  }
  if (text.startsWith("'")) return /^'(?:[^']|'')*'$/u.test(text) ? text.slice(1, -1).replaceAll("''", "'") : null;
  if (/^(?:true|false|null|~)$/iu.test(text) || /:\s/u.test(text)) return null;
  return text.split(/\s+#/u)[0].trim();
}

function explicitDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z)?$/u.test(value)) return null;
  const time = Date.parse(value);
  if (!Number.isFinite(time) || new Date(time).toISOString().slice(0, 10) !== value.slice(0, 10)) return null;
  return value;
}

function compact(value, maximum) {
  const result = value.replace(/\s+/gu, ' ').trim().slice(0, maximum);
  const last = result.charCodeAt(result.length - 1);
  return last >= 0xd800 && last <= 0xdbff ? result.slice(0, -1) : result;
}

function documentMetadata(content, path) {
  const lines = (content.startsWith('\uFEFF') ? content.slice(1) : content).split(/\r?\n/u);
  const fields = new Map(), duplicate = new Set();
  let start = 0;
  if (lines[0] === '---') {
    const end = lines.indexOf('---', 1);
    if (end >= 0) {
      start = end + 1;
      for (const line of lines.slice(1, end)) {
        const match = /^(title|description|date|updated):[ \t]*(.*)$/u.exec(line);
        if (!match) continue;
        if (fields.has(match[1])) duplicate.add(match[1]);
        fields.set(match[1], scalar(match[2]));
      }
      for (const key of duplicate) fields.delete(key);
    }
  }
  let heading = '', paragraph = '', fence = null;
  const prose = [];
  for (const line of lines.slice(start)) {
    const marker = /^\s*(`{3,}|~{3,})/u.exec(line);
    if (marker) { if (fence === null) fence = marker[1][0]; else if (marker[1][0] === fence) fence = null; continue; }
    if (fence) continue;
    const match = /^#{1,6}[ \t]+(.+?)[ \t]*#*[ \t]*$/u.exec(line);
    if (match && !heading) heading = match[1];
    if (paragraph) continue;
    if (!line.trim()) { if (prose.length) paragraph = prose.join(' '); continue; }
    if (match || /^\s*(?:[-*_]{3,}\s*$|[-*+]\s|\d+[.)]\s|>|\||<!--)/u.test(line) || /^last updated:/iu.test(line)) {
      if (prose.length) paragraph = prose.join(' ');
      continue;
    }
    prose.push(line.trim());
  }
  if (!paragraph) paragraph = prose.join(' ');
  return {
    title: compact(fields.get('title') || heading || basename(path, extname(path)), 256),
    description: compact(fields.get('description') || paragraph, 512),
    date: explicitDate(fields.get('date')) ?? explicitDate(fields.get('updated'))
  };
}

function attachFolders(documents) {
  const metadata = new Map();
  for (const document of documents) {
    const name = basename(document.path);
    const match = /^(README|INDEX)\.(md|mdx|txt)$/iu.exec(name);
    if (!match) continue;
    const folder = document.path.includes('/') ? document.path.slice(0, document.path.lastIndexOf('/')) : '.';
    const priority = (match[1].toUpperCase() === 'README' ? 0 : 3) + ['md', 'mdx', 'txt'].indexOf(match[2].toLowerCase());
    const current = metadata.get(folder);
    if (!current || priority < current.priority) metadata.set(folder, { document, priority });
  }
  return documents.map(document => {
    let folder = document.path.includes('/') ? document.path.slice(0, document.path.lastIndexOf('/')) : '.';
    while (true) {
      const source = metadata.get(folder)?.document;
      if (source) return { ...document, folder: { path: folder, title: source.title, description: source.description, date: source.dateSource === 'frontmatter' ? source.date : null } };
      if (folder === '.') return document;
      folder = folder.includes('/') ? folder.slice(0, folder.lastIndexOf('/')) : '.';
    }
  });
}

async function loadCorpus(context, { includeRaw = false, signal } = {}) {
  try { await inspectRoot(context, signal); }
  catch (error) { if (error instanceof LocalError) throw error; fail('local_root_invalid'); }
  const paths = await listPaths(context, { includeRaw, signal });
  try { await inspectRoot(context, signal); }
  catch (error) { if (error instanceof LocalError) throw error; fail('local_root_invalid'); }
  const documents = [], skipped = [], budget = { bytes: 0 };
  for (const path of paths) {
    try { documents.push(await readDocument(context, path, budget, signal)); }
    catch (error) {
      if (!(error instanceof LocalError)) fail('local_failed');
      if (['local_request_cancelled', 'local_corpus_too_large'].includes(error.code)) throw error;
      skipped.push({ path, reason: error.code });
    }
  }
  cancelled(signal);
  try { await inspectRoot(context, signal); }
  catch (error) { if (error instanceof LocalError) throw error; fail('local_root_invalid'); }
  return { root: context.root, rootId: hash(context.root), documents: attachFolders(documents), skipped };
}

export async function readLocalCorpus(root, { includeRaw = false, signal } = {}) {
  if (typeof includeRaw !== 'boolean') fail('local_path_invalid');
  const context = await rootContext(root, signal);
  return loadCorpus(context, { includeRaw, signal });
}

export async function readLocalDocument(root, relativePath, options = {}) {
  const includeRaw = options.includeRaw ?? false;
  if (typeof includeRaw !== 'boolean') fail('local_path_invalid');
  const context = await rootContext(root, options.signal);
  const path = documentPath(relativePath, includeRaw);
  try { await inspectPath(context, path, options.signal); }
  catch (error) { if (error instanceof LocalError) throw error; fail('local_file_unavailable'); }
  // A get shares index eligibility and budgets, including .gitignore and folder metadata.
  const corpus = await loadCorpus(context, { includeRaw, signal: options.signal });
  const document = corpus.documents.find(candidate => candidate.path === path);
  if (document) return document;
  fail(corpus.skipped.find(candidate => candidate.path === path)?.reason ?? 'local_file_unavailable');
}
