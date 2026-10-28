import { constants } from "node:fs";
import { open, link, unlink } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { dirname, basename, join } from "node:path";
import { LocalError } from "./errors.mjs";

const MAXIMUM = 8 * 1024 * 1024;

/** Publish a derived export; the caller checks its location against the corpus root. */
export async function writeLocalIndex(path, value) {
  let bytes;
  try {
    const json = JSON.stringify(value, null, 2);
    if (json === undefined) throw new Error();
    bytes = Buffer.from(`${json}\n`);
    if (bytes.length > MAXIMUM) throw new Error();
  } catch { throw new LocalError("local_index_write_failed"); }
  const temporary = join(dirname(path), `.${basename(path)}.${randomUUID()}.tmp`);
  let owned = false;
  try {
    const handle = await open(temporary, "wx", 0o600);
    owned = true;
    try { await handle.writeFile(bytes); await handle.sync(); }
    finally { await handle.close(); }
    try { await link(temporary, path); return "created"; }
    catch (error) {
      if (error.code !== "EEXIST") throw error;
      const existing = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
      try {
        const info = await existing.stat();
        if (!info.isFile() || info.size !== bytes.length) throw new LocalError("local_index_exists");
        const buffer = Buffer.alloc(bytes.length + 1);
        let size = 0;
        while (size < buffer.length) {
          const { bytesRead } = await existing.read(buffer, size, buffer.length - size, null);
          if (!bytesRead) break;
          size += bytesRead;
        }
        if (size !== bytes.length || !buffer.subarray(0, size).equals(bytes)) throw new LocalError("local_index_exists");
        return "unchanged";
      } finally { await existing.close(); }
    }
  } catch (error) {
    if (error instanceof LocalError) throw error;
    throw new LocalError("local_index_write_failed");
  } finally { if (owned) await unlink(temporary).catch(() => undefined); }
}
