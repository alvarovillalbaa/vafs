import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm, stat, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { runLocalCommand } from "../../bin/local/process.mjs";
import { writeLocalIndex } from "../../bin/local/output.mjs";
import { LocalError } from "../../bin/local/errors.mjs";

// T2 authored fixture data only. These cases have not been executed without approval.
test("file-tool runner keeps shell characters literal and captures bounded streams", async () => {
  const argument = "$(printf not-a-shell); 'literal'";
  const result = await runLocalCommand(process.execPath, ["-e", "process.stdout.write(process.argv[1]);process.stderr.write('fixture stderr')", argument]);
  assert.equal(result.stdout.toString(), argument);
  assert.equal(result.stderr.toString(), "fixture stderr");
  assert.equal(result.exitCode, 0);
});

test("file-tool runner forwards stdin without converting it to command arguments", async () => {
  const input = Buffer.from("# Authored notes\r\nCafé, 日本語.\n");
  const result = await runLocalCommand(process.execPath, ["-e", "process.stdin.pipe(process.stdout)"], { input });
  assert.deepEqual(result.stdout, input);
});

test("file-tool environment omits tokens, preload and config trust overrides", async () => {
  const names = ["VAFS_TOKEN", "OPENAI_API_KEY", "AWS_SECRET_ACCESS_KEY", "NODE_OPTIONS", "NODE_PATH", "RIPGREP_CONFIG_PATH", "QMD_TRUST_LOCAL_CONFIG", "QMD_TRUST_UPDATE_HOOKS"];
  const result = await runLocalCommand(process.execPath, ["-e", `process.stdout.write(JSON.stringify(${JSON.stringify(names)}.filter(name=>process.env[name]!==undefined)))`], {
    env: Object.fromEntries(names.map(name => [name, "authored-private-value"])),
  });
  assert.deepEqual(JSON.parse(result.stdout), []);
});

test("missing and unsuccessful commands produce stable errors without private stderr", async () => {
  await assert.rejects(runLocalCommand("vafs-authored-missing-binary-731dc", []), { code: "local_process_missing" });
  await assert.rejects(runLocalCommand(process.execPath, ["-e", "process.stderr.write('authored-private-detail');process.exit(7)"]), error => {
    assert.equal(error.code, "local_process_failed");
    assert.equal(error.message.includes("authored-private-detail"), false);
    return true;
  });
});

test("explicitly permitted no-match status is retained without inventing successful matches", async () => {
  const result = await runLocalCommand(process.execPath, ["-e", "process.exit(1)"], { allowExitCodes: [0, 1] });
  assert.equal(result.exitCode, 1);
  assert.equal(result.stdout.length, 0);
});

test("a referenced deadline terminates only the owned running process", async () => {
  await assert.rejects(runLocalCommand(process.execPath, ["-e", "setInterval(()=>{},1000)"], { timeoutMs: 150 }), { code: "local_process_timeout" });
});

test("caller cancellation terminates the owned process and pre-cancellation never spawns", async () => {
  const controller = new AbortController();
  const pending = runLocalCommand(process.execPath, ["-e", "setInterval(()=>{},1000)"], { signal: controller.signal });
  controller.abort();
  await assert.rejects(pending, { code: "local_request_cancelled" });
  await assert.rejects(runLocalCommand("vafs-authored-missing-binary-731dc", [], { signal: controller.signal }), { code: "local_request_cancelled" });
});

test("combined stdout and stderr enforce the same byte budget", async () => {
  await assert.rejects(runLocalCommand(process.execPath, ["-e", "process.stdout.write('a'.repeat(800));process.stderr.write('b'.repeat(800))"], { maxOutputBytes: 1000 }), { code: "local_process_output_limit" });
});

test("invalid runner options and unknown local error codes cannot echo supplied data", async () => {
  await assert.rejects(runLocalCommand(process.execPath, [], { timeoutMs: 0 }), { code: "local_process_failed" });
  assert.equal(new LocalError("authored-private-credential").code, "local_failed");
});

async function withDirectory(operation) {
  const directory = await mkdtemp(join(tmpdir(), "vafs-local-output-"));
  try { return await operation(directory); }
  finally { await rm(directory, { recursive: true, force: true }); }
}

test("derived index publication is private, complete and replays identical bytes without replacement", async () => {
  await withDirectory(async directory => {
    const path = join(directory, "index.json"), value = { source: "authored", documents: [] };
    assert.equal(await writeLocalIndex(path, value), "created");
    const before = await stat(path);
    assert.equal(before.mode & 0o777, 0o600);
    assert.equal(await readFile(path, "utf8"), `${JSON.stringify(value, null, 2)}\n`);
    assert.equal(await writeLocalIndex(path, value), "unchanged");
    assert.equal((await stat(path)).ino, before.ino);
    assert.deepEqual(await readdir(directory), ["index.json"]);
  });
});

test("derived index publication preserves different existing files and symlink targets", async () => {
  await withDirectory(async directory => {
    const path = join(directory, "keep.json"), link = join(directory, "link.json");
    await writeFile(path, "keep original");
    await symlink(path, link);
    await assert.rejects(writeLocalIndex(path, { replacement: true }), { code: "local_index_exists" });
    await assert.rejects(writeLocalIndex(link, { replacement: true }), LocalError);
    assert.equal(await readFile(path, "utf8"), "keep original");
    assert.deepEqual((await readdir(directory)).sort(), ["keep.json", "link.json"]);
  });
});

test("concurrent derived index writers publish exactly one complete winner", async () => {
  await withDirectory(async directory => {
    const path = join(directory, "index.json");
    const values = [{ winner: "first" }, { winner: "second" }];
    const outcomes = await Promise.allSettled(values.map(value => writeLocalIndex(path, value)));
    assert.equal(outcomes.filter(value => value.status === "fulfilled").length, 1);
    assert.equal(outcomes.filter(value => value.status === "rejected").length, 1);
    const actual = JSON.parse(await readFile(path, "utf8"));
    assert.equal(values.some(value => JSON.stringify(value) === JSON.stringify(actual)), true);
    assert.deepEqual(await readdir(directory), ["index.json"]);
  });
});

test("runner deadline settles while inherited pipes are open and stops its owned finite descendant", { skip: process.platform === "win32", timeout: 7000 }, async () => {
  await withDirectory(async directory => {
    const pidfile = join(directory, "owned-grandchild.json");
    const parentSource = [
      "const {spawn}=require('node:child_process');const fs=require('node:fs');",
      "const marker=process.argv[1];",
      "const child=spawn(process.execPath,['-e','setTimeout(()=>{},2500)','--',marker],{stdio:['ignore','inherit','inherit']});",
      "fs.writeFileSync(marker,JSON.stringify({pid:child.pid,marker}));",
    ].join("");
    const { execFile } = await import("node:child_process");
    const ps = (pid, field) => new Promise((resolve, reject) => {
      execFile("ps", ["-o", `${field}=`, "-p", String(pid)], { encoding: "utf8", timeout: 500, maxBuffer: 8192 }, (error, stdout) => {
        if (error && error.code !== 1) return reject(new Error("fixture_process_inspection_failed"));
        resolve(error ? "" : stdout.trim());
      });
    });
    const running = async pid => {
      try { process.kill(pid, 0); } catch (error) { if (error.code === "ESRCH") return false; throw error; }
      // A killed orphan can briefly await init reaping; a zombie is not a running descendant.
      if (process.platform === "linux") {
        try {
          const state = await readFile(`/proc/${pid}/stat`, "utf8");
          return state.slice(state.lastIndexOf(") ") + 2).split(" ")[0] !== "Z";
        } catch (error) { if (error.code === "ENOENT") return false; throw error; }
      }
      const state = await ps(pid, "stat");
      return Boolean(state) && !state.startsWith("Z");
    };
    let owned;
    try {
      const started = performance.now();
      await assert.rejects(runLocalCommand(process.execPath, ["-e", parentSource, "--", pidfile], { timeoutMs: 250 }), { code: "local_process_timeout" });
      const elapsed = performance.now() - started;
      owned = JSON.parse(await readFile(pidfile, "utf8"));
      assert.equal(owned.marker, pidfile);
      assert.equal(Number.isSafeInteger(owned.pid) && owned.pid > 1 && owned.pid !== process.pid, true);
      assert.ok(elapsed < 1500, "inherited pipes must not extend settlement to the descendant's finite 2.5s lifetime");
      const reapDeadline = performance.now() + 1000;
      while (await running(owned.pid) && performance.now() < reapDeadline) await new Promise(resolve => setTimeout(resolve, 40));
      assert.equal(await running(owned.pid), false, "the runner must stop its own process group, not only its direct child");
    } finally {
      // Even a failing implementation leaves only a finite fixture; never signal an unverified PID.
      if (!owned) { try { owned = JSON.parse(await readFile(pidfile, "utf8")); } catch {} }
      if (owned?.marker === pidfile && Number.isSafeInteger(owned.pid) && owned.pid > 1 && owned.pid !== process.pid) {
        const command = process.platform === "linux"
          ? await readFile(`/proc/${owned.pid}/cmdline`, "utf8").catch(() => "")
          : await ps(owned.pid, "command");
        if (command.includes(pidfile)) {
          try { process.kill(owned.pid, "SIGKILL"); } catch (error) { if (error.code !== "ESRCH") throw error; }
        }
      }
    }
  });
});
