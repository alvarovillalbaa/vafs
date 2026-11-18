#!/usr/bin/env node
import { runLocalMcp } from "./local/mcp.mjs";

const controller = new AbortController();
const stop = () => controller.abort();
process.once("SIGINT", stop);
process.once("SIGTERM", stop);
try {
  process.exitCode = await runLocalMcp(process.argv.slice(2), {
    input: process.stdin, output: process.stdout,
    stderr: text => process.stderr.write(text), signal: controller.signal,
  });
} finally {
  process.removeListener("SIGINT", stop);
  process.removeListener("SIGTERM", stop);
}
