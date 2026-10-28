import test, { beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, realpath, utimes } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { readLocalCorpus, readLocalDocument } from '../../bin/local/corpus.mjs';

// T2: owned local text fixtures and real rg enumeration. Authored only; run separately after approval.
let fixture, root, outside;
beforeEach(async () => {
  fixture = await mkdtemp(join(tmpdir(), 'vafs-local-corpus-'));
  root = join(fixture, 'corpus'); outside = join(fixture, 'outside');
  await mkdir(root); await mkdir(outside);
});
afterEach(async () => { if (fixture) await rm(fixture, { recursive: true, force: true }); fixture = undefined; });
const digest = value => createHash('sha256').update(value).digest('hex');
async function put(path, value) {
  const file = join(root, ...path.split('/'));
  await mkdir(join(file, '..'), { recursive: true });
  await writeFile(file, value);
  return file;
}
const rejects = (operation, code) => assert.rejects(operation, error => error?.code === code && error.message === code);

test('requires an explicit directory and returns an honest empty corpus', async () => {
  await rejects(readLocalCorpus(), 'local_root_required');
  await rejects(readLocalCorpus('   '), 'local_root_required');
  const file = await put('file.md', '# File');
  await rejects(readLocalCorpus(file), 'local_root_invalid');
  await rejects(readLocalCorpus(join(fixture, 'missing')), 'local_root_invalid');
  const empty = await readLocalCorpus(outside);
  assert.deepEqual(empty.documents, []);
  assert.deepEqual(empty.skipped, []);
  assert.equal(empty.root, await realpath(outside));
});

test('canonicalizes an explicitly selected root and preserves BOM, CRLF and exact byte hashes', async () => {
  const { symlink } = await import('node:fs/promises');
  const original = Buffer.from('\uFEFF# Exact title\r\n\r\nExact paragraph.\r\n', 'utf8');
  await put('knowledge/exact.md', original);
  const alias = join(fixture, 'explicit-alias');
  await symlink(root, alias);
  const corpus = await readLocalCorpus(alias);
  const document = corpus.documents[0];
  assert.equal(corpus.root, await realpath(root));
  assert.equal(corpus.rootId, digest(corpus.root));
  assert.equal(document.content, original.toString('utf8'));
  assert.equal(document.bytes, original.length);
  assert.equal(document.contentHash, digest(original));
  assert.equal(document.path, 'knowledge/exact.md');
  assert.equal(document.section, 'knowledge');
});

test('extracts conservative scalar frontmatter while retaining the original source unchanged', async () => {
  const content = '---\ntitle: "Authored title"\ndescription: \'An authored description.\'\ndate: 2026-05-17\nupdated: 2026-05-18\n---\n# Different heading\n\nDifferent paragraph.\n';
  await put('knowledge/frontmatter.mdx', content);
  const document = (await readLocalCorpus(root)).documents[0];
  assert.equal(document.title, 'Authored title');
  assert.equal(document.description, 'An authored description.');
  assert.equal(document.date, '2026-05-17');
  assert.equal(document.dateSource, 'frontmatter');
  assert.equal(document.content, content);
  assert.equal(document.contentHash, digest(Buffer.from(content)));
});

test('labels filesystem fallback dates honestly and accepts an explicit updated scalar', async () => {
  const file = await put('fallback.txt', '---\ndate: 2026-02-30\n---\nNo invented author date.');
  await utimes(file, new Date('2020-01-02T03:04:05.000Z'), new Date('2020-01-02T03:04:05.000Z'));
  await put('updated.md', '---\nupdated: "2026-04-03T02:01:00Z"\n---\n# Updated');
  const corpus = await readLocalCorpus(root);
  const fallback = corpus.documents.find(document => document.path === 'fallback.txt');
  const updated = corpus.documents.find(document => document.path === 'updated.md');
  assert.equal(fallback.dateSource, 'filesystem');
  assert.equal(fallback.modifiedAt, '2020-01-02T03:04:05.000Z');
  assert.equal(fallback.date, fallback.modifiedAt);
  assert.equal(updated.date, '2026-04-03T02:01:00Z');
  assert.equal(updated.dateSource, 'frontmatter');
});

test('uses real headings and prose rather than fenced examples or complex YAML values', async () => {
  await put('fallback.md', '---\ntitle: [not, scalar]\ndescription: |\n  Not a simple scalar\n---\n```md\n# Example heading\n```\n# Real heading\nLast updated: 2026-01-01\n\nFirst prose line\ncontinues here.\n\nLater prose.');
  const document = (await readLocalCorpus(root)).documents[0];
  assert.equal(document.title, 'Real heading');
  assert.equal(document.description, 'First prose line continues here.');
  assert.equal(document.dateSource, 'filesystem');
});

test('uses the nearest vetted README or INDEX and does not attribute filesystem dates to folder metadata', async () => {
  await put('README.md', '# Root metadata\n\nRoot description.');
  await put('knowledge/README.md', '---\ntitle: Canonical knowledge\ndate: 2026-01-01\n---\nKnowledge description.');
  await put('knowledge/scoped/INDEX.md', '---\ntitle: Scoped metadata\nupdated: 2026-02-03\n---\nScoped description.');
  await put('knowledge/scoped/topic.md', '# Topic\n\nTopic paragraph.');
  await put('other/topic.md', '# Other');
  const corpus = await readLocalCorpus(root);
  assert.deepEqual(corpus.documents.find(document => document.path === 'knowledge/scoped/topic.md').folder, {
    path: 'knowledge/scoped', title: 'Scoped metadata', description: 'Scoped description.', date: '2026-02-03'
  });
  assert.deepEqual(corpus.documents.find(document => document.path === 'other/topic.md').folder, {
    path: '.', title: 'Root metadata', description: 'Root description.', date: null
  });
});

test('respects .gitignore in a plain directory and never loads ignored metadata on get', async () => {
  await put('.gitignore', 'ignored.md\nignored-dir/\nknowledge/README.md\n');
  await put('README.md', '# Vetted root\n\nAvailable description.');
  await put('ignored.md', '# Ignored private text');
  await put('ignored-dir/private.md', '# Ignored nested text');
  await put('knowledge/README.md', '# Ignored folder metadata');
  await put('knowledge/topic.md', '# Available topic');
  const corpus = await readLocalCorpus(root);
  assert.deepEqual(corpus.documents.map(document => document.path), ['README.md', 'knowledge/topic.md']);
  const document = await readLocalDocument(root, 'knowledge/topic.md');
  assert.equal(document.folder.title, 'Vetted root');
  await rejects(readLocalDocument(root, 'ignored.md'), 'local_file_unavailable');
});

test('excludes hidden paths, generated/vendor folders and non-text extensions even when raw is enabled', async () => {
  await put('visible.md', '# Visible');
  for (const folder of ['.git', '.cache', '.hidden', 'node_modules', 'vendor', 'dist', 'build', 'knowledge/node_modules']) await put(`${folder}/private.md`, '# Excluded');
  await put('.secret.md', '# Hidden root');
  await put('script.js', 'not a document');
  await put('archive.json', '{}');
  const corpus = await readLocalCorpus(root, { includeRaw: true });
  assert.deepEqual(corpus.documents.map(document => document.path), ['visible.md']);
});

test('requires an explicit raw opt-in for both index and get', async () => {
  await put('knowledge/topic.md', '# Knowledge');
  await put('raw/intake.txt', 'Authored raw intake.');
  assert.deepEqual((await readLocalCorpus(root)).documents.map(document => document.path), ['knowledge/topic.md']);
  await rejects(readLocalDocument(root, 'raw/intake.txt'), 'local_path_invalid');
  const included = await readLocalCorpus(root, { includeRaw: true });
  assert.deepEqual(included.documents.map(document => document.path), ['knowledge/topic.md', 'raw/intake.txt']);
  assert.equal((await readLocalDocument(root, 'raw/intake.txt', { includeRaw: true })).content, 'Authored raw intake.');
});

test('never follows symlink descendants to a file or directory outside the selected root', async () => {
  const { symlink } = await import('node:fs/promises');
  await writeFile(join(outside, 'secret.md'), '# Owned outside fixture');
  await put('safe.md', '# Safe');
  await symlink(join(outside, 'secret.md'), join(root, 'leak.md'));
  await symlink(outside, join(root, 'portal'));
  const corpus = await readLocalCorpus(root);
  assert.deepEqual(corpus.documents.map(document => document.path), ['safe.md']);
  await rejects(readLocalDocument(root, 'leak.md'), 'local_symlink_forbidden');
  await rejects(readLocalDocument(root, 'portal/secret.md'), 'local_symlink_forbidden');
});

test('rejects traversal, absolute, hidden and noncanonical get paths', async () => {
  await put('safe.md', '# Safe');
  for (const path of ['../outside/secret.md', '/tmp/secret.md', 'C:\\secret.md', 'knowledge/../safe.md', './safe.md', '.hidden.md', 'safe.md/', 'script.js']) {
    await rejects(readLocalDocument(root, path), 'local_path_invalid');
  }
});

test('skips invalid UTF-8 and NUL text with fixed reasons and fails direct gets', async () => {
  await put('bad.md', Buffer.from([0xc3, 0x28]));
  await put('nul.txt', 'text\0binary');
  await put('good.md', '# Good');
  const corpus = await readLocalCorpus(root);
  assert.deepEqual(corpus.documents.map(document => document.path), ['good.md']);
  assert.deepEqual(corpus.skipped, [{ path: 'bad.md', reason: 'local_invalid_utf8' }, { path: 'nul.txt', reason: 'local_invalid_utf8' }]);
  await rejects(readLocalDocument(root, 'bad.md'), 'local_invalid_utf8');
});

test('accepts exactly 512 KiB, skips a larger file and refuses its direct get', async () => {
  await put('limit.txt', Buffer.alloc(512 * 1024, 0x61));
  await put('oversize.txt', Buffer.alloc(512 * 1024 + 1, 0x61));
  const corpus = await readLocalCorpus(root);
  assert.equal(corpus.documents.length, 1);
  assert.equal(corpus.documents[0].bytes, 512 * 1024);
  assert.deepEqual(corpus.skipped, [{ path: 'oversize.txt', reason: 'local_file_too_large' }]);
  await rejects(readLocalDocument(root, 'oversize.txt'), 'local_file_too_large');
});

test('refuses more than 1000 eligible documents instead of silently truncating results', async () => {
  for (let index = 0; index < 1001; index++) await put(`document-${index}.md`, '# Authored document');
  await rejects(readLocalCorpus(root), 'local_corpus_too_large');
});

test('enforces the 16 MiB aggregate read budget for accepted and invalid documents', async () => {
  const bytes = Buffer.alloc(512 * 1024, 0x61);
  for (let index = 0; index < 33; index++) await put(`document-${index}.txt`, bytes);
  await rejects(readLocalCorpus(root), 'local_corpus_too_large');
  bytes[0] = 0;
  for (let index = 0; index < 33; index++) await put(`document-${index}.txt`, bytes);
  await rejects(readLocalCorpus(root), 'local_corpus_too_large');
});

test('returns the same vetted document projection from get and index', async () => {
  await put('README.md', '# Corpus\n\nRoot description.');
  await put('knowledge/topic.txt', 'Topic paragraph.');
  const corpus = await readLocalCorpus(root);
  const document = await readLocalDocument(root, 'knowledge/topic.txt');
  assert.deepEqual(document, corpus.documents.find(candidate => candidate.path === document.path));
  assert.equal(document.title, 'topic');
  assert.equal(document.section, 'knowledge');
});

test('honors an already-cancelled request without starting a corpus scan', async () => {
  const controller = new AbortController(); controller.abort();
  await rejects(readLocalCorpus(root, { signal: controller.signal }), 'local_request_cancelled');
  await rejects(readLocalDocument(root, 'missing.md', { signal: controller.signal }), 'local_request_cancelled');
});
