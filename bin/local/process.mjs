import { spawn } from "node:child_process";
import { LocalError } from "./errors.mjs";

const permittedEnvironment = [
  "PATH", "HOME", "USER", "LOGNAME", "TMPDIR", "TMP", "TEMP", "LANG", "LC_ALL", "LC_CTYPE",
  "SYSTEMROOT", "SystemRoot", "WINDIR", "XDG_CONFIG_HOME", "XDG_DATA_HOME", "XDG_CACHE_HOME",
];

/** Only file-tool configuration crosses this boundary; no shell or application credentials. */
export async function runLocalCommand(binary, args, {
  cwd, input, signal, timeoutMs = 10_000, maxOutputBytes = 2 * 1024 * 1024,
  allowExitCodes = [0], env = {},
} = {}) {
  if (signal?.aborted) throw new LocalError("local_request_cancelled");
  if (typeof binary !== "string" || !binary || !Array.isArray(args)
    || args.some(value => typeof value !== "string" || value.includes("\0"))
    || !Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 30_000
    || !Number.isSafeInteger(maxOutputBytes) || maxOutputBytes < 1 || maxOutputBytes > 16 * 1024 * 1024
    || !Array.isArray(allowExitCodes) || allowExitCodes.length > 16
    || allowExitCodes.some(value => !Number.isInteger(value) || value < 0 || value > 255)
    || (input !== undefined && typeof input !== "string" && !Buffer.isBuffer(input))
    || (input !== undefined && Buffer.byteLength(input) > 16 * 1024 * 1024)) {
    throw new LocalError("local_process_failed");
  }
  const childEnvironment = {};
  for (const name of permittedEnvironment) {
    const value = Object.hasOwn(env, name) ? env[name] : process.env[name];
    if (typeof value === "string") childEnvironment[name] = value;
  }
  return new Promise((resolve, reject) => {
    let child, timer, problem, outputBytes = 0, settled = false;
    const stdout = [], stderr = [];
    const terminate = () => {
      if (!child?.pid) return;
      if (process.platform !== "win32") {
        try { process.kill(-child.pid, "SIGKILL"); } catch {}
      } else child.kill("SIGKILL");
    };
    const cleanup = () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
      process.removeListener("exit", terminate);
    };
    const stop = code => {
      if (settled || problem) return;
      problem = new LocalError(code);
      terminate();
      // Descendants cannot retain the pipes and postpone the owned child's close event.
      child?.stdin.destroy();
      child?.stdout.destroy();
      child?.stderr.destroy();
    };
    const abort = () => stop("local_request_cancelled");
    try {
      child = spawn(binary, args, {
        cwd, env: childEnvironment, shell: false, windowsHide: true,
        detached: process.platform !== "win32",
        stdio: ["pipe", "pipe", "pipe"],
      });
    } catch {
      reject(new LocalError("local_process_failed"));
      return;
    }
    timer = setTimeout(() => stop("local_process_timeout"), timeoutMs);
    process.once("exit", terminate);
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) abort();
    const collect = chunks => chunk => {
      outputBytes += chunk.byteLength;
      if (outputBytes > maxOutputBytes) { stop("local_process_output_limit"); return; }
      chunks.push(chunk);
    };
    child.stdout.on("data", collect(stdout));
    child.stderr.on("data", collect(stderr));
    // A bounded search process may close stdin before consuming every byte.
    child.stdin.on("error", error => { if (error.code !== "EPIPE") stop("local_process_failed"); });
    child.once("error", error => {
      settled = true;
      cleanup();
      reject(problem ?? new LocalError(error.code === "ENOENT" ? "local_process_missing" : "local_process_failed"));
    });
    child.once("close", exitCode => {
      if (settled) return;
      settled = true;
      cleanup();
      if (problem) { reject(problem); return; }
      if (!allowExitCodes.includes(exitCode)) { reject(new LocalError("local_process_failed")); return; }
      resolve({ stdout: Buffer.concat(stdout), stderr: Buffer.concat(stderr), exitCode });
    });
    child.stdin.end(input);
  });
}
