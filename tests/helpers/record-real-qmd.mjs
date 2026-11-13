#!/usr/bin/env node
// CI observer only. Execute the admitted real CLI; never replace its response.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";

const sha = value => createHash("sha256").update(value).digest("hex");
const capture = value => ({ bytes: value.length, sha256: sha(value), gzipBase64: gzipSync(value).toString("base64"), complete: true });
try {
  const cache = fs.realpathSync(process.env.XDG_CACHE_HOME);
  const info = fs.lstatSync(cache);
  if (!info.isDirectory() || info.isSymbolicLink() || info.uid !== process.getuid()) throw new Error();
  const executable = fileURLToPath(new URL("./node_modules/@tobilu/qmd/bin/qmd", import.meta.url));
  if (fs.realpathSync(executable) !== executable) throw new Error();
  const environment = {};
  for (const key of ["PATH", "HOME", "USER", "LOGNAME", "TMPDIR", "TMP", "TEMP", "LANG", "LC_ALL", "LC_CTYPE", "XDG_CONFIG_HOME", "XDG_DATA_HOME", "XDG_CACHE_HOME"]) {
    if (typeof process.env[key] === "string") environment[key] = process.env[key];
  }
  const startedAt = Date.now();
  const child = spawnSync(process.execPath, [executable, ...process.argv.slice(2)], {
    cwd: process.cwd(), env: environment, stdio: ["inherit", "pipe", "pipe"], timeout: 30000, maxBuffer: 2 * 1024 * 1024, killSignal: "SIGKILL",
  });
  const stdout = child.stdout ?? Buffer.alloc(0), stderr = child.stderr ?? Buffer.alloc(0);
  const row = { argv: process.argv.slice(2), executableSha256: sha(fs.readFileSync(executable)), cwd: process.cwd(),
    startedAt, finishedAt: Date.now(), wrapperPid: process.pid, pid: child.pid ?? null, exitCode: child.status, signal: child.signal, error: child.error?.code ?? null,
    stdout: capture(stdout), stderr: capture(stderr) };
  if (child.error) { row.stdout.complete = false; row.stderr.complete = false; }
  const trace = path.join(cache, "mcp-qmd-originals.jsonl");
  const before = fs.lstatSync(trace);
  if (!before.isFile() || before.isSymbolicLink() || before.uid !== process.getuid() || before.size > 2 * 1024 * 1024) throw new Error();
  const body = Buffer.from(JSON.stringify(row) + "\n");
  if (before.size + body.length > 2 * 1024 * 1024) throw new Error();
  const fd = fs.openSync(trace, fs.constants.O_WRONLY | fs.constants.O_APPEND | fs.constants.O_NOFOLLOW);
  try {
    const opened = fs.fstatSync(fd);
    if (opened.dev !== before.dev || opened.ino !== before.ino) throw new Error();
    fs.writeFileSync(fd, body);
  } finally { fs.closeSync(fd); }
  // Forward the actual engine bytes only after retaining them, unchanged.
  process.stdout.write(stdout);
  process.stderr.write(stderr);
  process.exitCode = child.error || child.signal || !Number.isInteger(child.status) ? 70 : child.status;
} catch {
  process.stderr.write("qmd_observer_failed\n");
  process.exitCode = 70;
}
