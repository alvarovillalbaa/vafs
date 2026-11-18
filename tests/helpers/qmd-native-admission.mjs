import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
const tools = fs.realpathSync(process.env.VAFS_TOOL_ROOT), root = fs.realpathSync(process.env.VAFS_QMD_RUN_ROOT);
const need = (value, code) => { if (!value) throw new Error(code); };
const require = createRequire(path.join(tools, 'package.json'));
const Database = require('better-sqlite3'), sqliteVec = require('sqlite-vec');
need(typeof Database === 'function' && typeof sqliteVec.load === 'function' && typeof sqliteVec.getLoadablePath === 'function', 'native_api_unavailable');
let db, result;
try {
  db = new Database(':memory:');
  sqliteVec.load(db);
  result = db.prepare('SELECT sqlite_version() AS sqliteVersion, vec_version() AS vecVersion').get();
  need(typeof result.sqliteVersion === 'string' && /^\d+\.\d+\.\d+$/.test(result.sqliteVersion) && /^v?0\.1\.9$/.test(result.vecVersion), 'native_version_mismatch');
  const sqlite = fs.realpathSync(path.join(tools, 'node_modules/better-sqlite3/prebuilds/linux-x64.node'));
  need(Object.keys(require.cache).some(file => file.endsWith('.node') && fs.realpathSync(file) === sqlite), 'bundled_sqlite_binding_not_loaded');
  const vector = fs.realpathSync(sqliteVec.getLoadablePath());
  need(vector.startsWith(path.join(tools, 'node_modules/sqlite-vec-linux-x64') + path.sep), 'vector_binding_outside_expected_package');
  const files = [sqlite, vector].map(file => {
    need(file.startsWith(root + path.sep), 'native_path_outside_owned_root');
    const before = fs.lstatSync(file); need(before.isFile() && !before.isSymbolicLink() && before.uid === process.getuid() && before.size > 0 && before.size <= 134217728, 'native_file_invalid');
    const data = fs.readFileSync(file), after = fs.lstatSync(file);
    need(before.dev === after.dev && before.ino === after.ino && before.size === data.length && before.size === after.size && before.mtimeMs === after.mtimeMs && before.ctimeMs === after.ctimeMs && data.subarray(0, 4).equals(Buffer.from([127,69,76,70])), 'native_file_changed_or_not_elf');
    return { path: path.relative(tools, file), bytes: data.length, sha256: createHash('sha256').update(data).digest('hex') };
  });
  result = { ...result, files, actualInMemoryDatabase: true, vectorExtensionLoaded: true };
} finally {
  if (db) { db.close(); need(db.open === false, 'native_database_close_unverified'); }
}
process.stdout.write(JSON.stringify({ ...result, databaseClosed: true }) + '\n');
