"""Owned external CI: eight new profile cases and one real MCP/QMD journey."""
import base64
import gzip
import hashlib
import json
import os
from pathlib import Path
import secrets
import shutil
import signal
import subprocess
import sys
import tempfile
import time
import traceback

REPOSITORY = "alvarovillalbaa/vafs"
BASE = "c72dab8702d924265d1397aba20587fd2db38688"
BRANCH = "refs/heads/qa/vafs-local-mcp-qmd-20261113-2"
LOCK_SHA = "98697aea8ca592674d254ca791b355a27549388451e1d2a7ba9c9366294e98a7"
NATIVE_SHA = "7c150b7700c98ebf66b22918c82ef833da4f7c19b58df8ed2f69fd68c0822962"
RUNTIME = ["bin/vafs-local-mcp.mjs"] + ["bin/local/" + name + ".mjs" for name in ("corpus", "errors", "output", "process", "retrieval", "mcp")]
UNIT = "tests/unit/local-mcp-qmd.test.mjs"
CASE = "tests/integration/local-mcp-qmd.mjs"
HELPERS = ["tests/helpers/record-real-qmd.mjs", "tests/helpers/qmd-native-admission.mjs"]
FIXTURES = ["tests/fixtures/local-mcp-qmd-tool-package.json"]
LOCK_RECEIPT = "docs/results/2026/11-07/local-qmd-keyword-attempt-1.json"
ADDED = set([UNIT, CASE, *HELPERS, *FIXTURES, "tests/scripts/run-local-mcp-qmd.py",
             "docs/proposals/local-mcp-qmd-checks.md", "docs/proposals/local-mcp-qmd.workflow.yml.example"])
MODIFIED = {"AGENTS.md", "README.md", "docs/architecture.md", "docs/local-mcp.md", "docs/local-retrieval.md", "tests/README.md",
            "bin/local/mcp.mjs", "bin/local/retrieval.mjs"}
sha = lambda body: hashlib.sha256(body).hexdigest()
repo = Path.cwd()
run_id = os.environ.get("GITHUB_RUN_ID", "")
source = os.environ.get("SOURCE_COMMIT", "")
proof = Path(os.environ.get("RUNNER_TEMP", "/invalid")) / ("vafs-local-mcp-qmd-" + run_id + ".json")


def need(value, message):
    if not value:
        raise RuntimeError(message)


def absent(path):
    try:
        path.lstat()
        return False
    except FileNotFoundError:
        return True


def admit():
    need(os.environ.get("CI") == "true" and os.environ.get("GITHUB_REPOSITORY") == REPOSITORY and run_id.isdigit(), "Owned public CI only")
    need(os.environ.get("GITHUB_EVENT_NAME") == "create" and os.environ.get("GITHUB_REF") == BRANCH, "Exact create event/ref")
    event = json.loads(Path(os.environ["GITHUB_EVENT_PATH"]).read_bytes())
    need(event["repository"]["private"] is False and event["ref_type"] == "branch" and event["ref"] == BRANCH.removeprefix("refs/heads/"), "Exact public branch")
    need(subprocess.check_output(["git", "rev-parse", "HEAD"], text=True).strip() == source, "Exact prepared source")


admit()
if sys.argv[1:] == ["--retire"]:
    before = proof.lstat()
    body = proof.read_bytes()
    need(proof.is_file() and not proof.is_symlink() and before.st_uid == os.getuid() and before.st_dev == int(os.environ["REPORT_DEV"])
         and before.st_ino == int(os.environ["REPORT_INO"]) and sha(body) == os.environ["REPORT_SHA"], "Exact uploaded proof identity/bytes")
    need(json.loads(body)["runId"] == run_id, "Owned proof run")
    proof.unlink()
    need(not proof.exists(), "Uploaded proof absence")
    print(json.dumps({"kind": "uploaded-proof-retired", "sha256": sha(body), "bytes": len(body), "absent": True}))
    sys.exit(0)
need(sys.argv[1:] == [], "No extra arguments")

report = {"schemaVersion": 1, "kind": "vafs.local-mcp-qmd", "runId": run_id, "sourceCommit": source, "baseCommit": BASE,
          "commands": [], "sourceGuards": [], "checks": {}, "cleanup": {}, "oldCasesReexecuted": False}
root = None
status = 1
leaders, starts, attributed = [], {}, {}
observation_uncertain = False
uninspected = set()
deadline = time.monotonic() + max(0, 720 - (time.time() - float(os.environ.get("PROFILE_STARTED_EPOCH", "0"))))


def capture(body):
    retained = body[:2 * 1024**2]
    return {"bytes": len(body), "retainedBytes": len(retained), "sha256": sha(body), "complete": retained == body,
            "gzipBase64": base64.b64encode(gzip.compress(retained, mtime=0)).decode()}


def git_vector(ref, current=False):
    result = {}
    for entry in subprocess.check_output(["git", "ls-tree", "-rz", ref]).split(b"\0"):
        if entry:
            meta, name = entry.split(b"\t", 1)
            mode, kind, blob = meta.decode().split()
            need(kind == "blob" and mode in ("100644", "100755"), "Source leaf type")
            if current:
                path = repo / name.decode()
                body = path.read_bytes()
                need(not path.is_symlink() and bool(path.stat().st_mode & 0o111) == (mode == "100755"), "Source native mode")
                need(hashlib.sha1(b"blob " + str(len(body)).encode() + b"\0" + body).hexdigest() == blob, "Native source bytes")
            else:
                body = subprocess.check_output(["git", "cat-file", "blob", blob])
            result[name.decode()] = {"mode": mode, "blob": blob, "bytes": len(body), "sha256": sha(body)}
    return result


def guard(label):
    need(subprocess.check_output(["git", "rev-parse", "HEAD"], text=True).strip() == source and subprocess.check_output(["git", "status", "--porcelain"]) == b"", "Exact clean source/index")
    need(git_vector("HEAD", True) == source_files, "Complete source vector unchanged")
    report["sourceGuards"].append({"label": label, "matches": True, "files": len(source_files)})


def inventory(directory):
    result, total = {}, 0
    for path in sorted(directory.rglob("*")):
        info = path.lstat()
        need(info.st_uid == os.getuid(), "Owned inventory UID")
        if path.is_symlink():
            need(path.resolve().is_relative_to(root), "Owned symlink target")
            result[str(path.relative_to(directory))] = {"type": "symlink", "target": os.readlink(path)}
        elif path.is_file():
            body = path.read_bytes()
            total += len(body)
            result[str(path.relative_to(directory))] = {"bytes": len(body), "sha256": sha(body)}
        else:
            need(path.is_dir(), "Owned inventory type")
        need(total <= 512 * 1024**2 and len(result) <= 40000, "Owned storage bound")
    return result


def process_row(entry):
    fields = (entry / "stat").read_text().rpartition(") ")[2].split()
    return {"pid": int(entry.name), "parent": int(fields[1]), "pgid": int(fields[2]), "session": int(fields[3]), "start": fields[19], "state": fields[0]}


def owned_processes():
    global observation_uncertain
    need(not observation_uncertain, "Owned observation previously uncertain")
    rows = {}
    for entry in Path("/proc").iterdir():
        if not entry.name.isdigit() or int(entry.name) == os.getpid() or int(entry.name) in uninspected:
            continue
        try:
            if entry.stat().st_uid == os.getuid():
                row = process_row(entry)
                if baseline.get(entry.name) != row["start"]:
                    rows[row["pid"]] = row
        except (FileNotFoundError, ProcessLookupError):
            pass
        except PermissionError as error:
            uninspected.add(int(entry.name))
            report.setdefault("processObservationErrors", []).append({"pid": int(entry.name), "surface": "public-stat", "error": str(error)})
            if int(entry.name) in starts or int(entry.name) in attributed:
                observation_uncertain = True
                raise
    selected = {pid for pid, row in rows.items() if starts.get(pid) == row["start"] or attributed.get(pid) == row["start"]}
    while True:
        expanded = selected | {pid for pid, row in rows.items() if row["parent"] == os.getpid() or row["parent"] in selected or row["pgid"] in selected or row["session"] in selected}
        if expanded == selected:
            break
        selected = expanded
    result = []
    for pid in selected:
        row = rows[pid]
        attributed[pid] = row["start"]
        if row["state"] != "Z":
            result.append({key: value for key, value in row.items() if key != "state"})
    return result


def group_live(pid):
    try:
        os.killpg(pid, 0)
        return True
    except ProcessLookupError:
        return False


def run(argv, *, cwd=None, timeout=90):
    global observation_uncertain
    row = {"argv": argv, "startedAt": time.time()}
    report["commands"].append(row)
    out, err = root / (str(len(report["commands"])) + ".out"), root / (str(len(report["commands"])) + ".err")
    observer_error = None
    seen = {}
    with out.open("xb") as stdout, err.open("xb") as stderr:
        child = subprocess.Popen(argv, cwd=cwd or tools, env=environment, stdin=subprocess.DEVNULL, stdout=stdout, stderr=stderr, start_new_session=True)
        leaders.append(child)
        row["pid"] = child.pid
        try:
            starts[child.pid] = process_row(Path("/proc") / str(child.pid))["start"]
        except (FileNotFoundError, ProcessLookupError):
            row["startObservation"] = "already absent"
        except PermissionError:
            observation_uncertain = True
            observer_error = traceback.format_exc()
        except BaseException:
            observation_uncertain = True
            observer_error = traceback.format_exc()
        end = min(deadline, time.monotonic() + timeout)
        while child.poll() is None:
            if observer_error is None:
                try:
                    for observed in owned_processes():
                        seen[(observed["pid"], observed["start"])] = observed
                except BaseException:
                    observer_error = traceback.format_exc()
            if time.monotonic() >= end or out.stat().st_size + err.stat().st_size > 2 * 1024**2:
                row["boundedStop"] = True
                os.killpg(child.pid, signal.SIGTERM)
                try:
                    child.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    os.killpg(child.pid, signal.SIGKILL)
                    child.wait(timeout=5)
                break
            time.sleep(.05)
        child.wait(timeout=5)
    row.update({"exitCode": child.returncode, "reaped": True, "stdout": capture(out.read_bytes()), "stderr": capture(err.read_bytes()),
                "observerError": observer_error, "observedProcesses": list(seen.values())})
    groups = {child.pid} | {item["pgid"] for item in seen.values()}
    until = time.monotonic() + 2
    while any(group_live(pid) for pid in groups) and time.monotonic() < until:
        time.sleep(.05)
    row["observedGroupsAbsent"] = all(not group_live(pid) for pid in groups)
    need(observer_error is None and row["observedGroupsAbsent"] and all(row[key]["complete"] for key in ("stdout", "stderr")), "Command originals/observer closure")
    need(child.returncode == 0 and not row.get("boundedStop"), "Actual command failure")
    return out.read_bytes()


def stop_owned(remaining):
    actions = report["cleanup"].setdefault("signalActions", [])
    for sig in (signal.SIGTERM, signal.SIGKILL):
        for row in remaining:
            try:
                entry = Path("/proc") / str(row["pid"])
                now = process_row(entry)
                need(entry.stat().st_uid == os.getuid() and now["start"] == row["start"] and now["pgid"] == row["pgid"]
                     and row["pgid"] > 1 and row["pgid"] != os.getpgrp(), "Owned process identity before cleanup signal")
                os.killpg(row["pgid"], sig)
                actions.append({"pid": row["pid"], "start": row["start"], "pgid": row["pgid"], "signal": int(sig)})
            except (FileNotFoundError, ProcessLookupError):
                pass
        until = time.monotonic() + 5
        remaining = owned_processes()
        while remaining and time.monotonic() < until:
            time.sleep(.05)
            remaining = owned_processes()
        if not remaining:
            break
    return remaining


try:
    need(time.monotonic() + 480 < deadline and shutil.disk_usage(os.environ["RUNNER_TEMP"]).free > 8 * 1024**3, "Time/storage admission")
    need(sys.platform == "linux", "Public Linux profile")
    source_files = git_vector("HEAD", True)
    base_files = git_vector(BASE)
    need(len(base_files) == 978 and set(source_files) - set(base_files) == ADDED and set(base_files) - set(source_files) == set(), "Exact additive source paths")
    need({name for name in base_files if source_files[name] != base_files[name]} == MODIFIED, "Exact reviewed modified paths")
    need((repo / "AGENTS.md").read_bytes().startswith(subprocess.check_output(["git", "show", BASE + ":AGENTS.md"])), "Append-only root instructions")
    report["sourceFiles"] = source_files
    guard("before-owned-work")
    root = Path(tempfile.mkdtemp(prefix="vafs-mcp-qmd-", dir=os.environ["RUNNER_TEMP"])).resolve()
    os.chmod(root, 0o700)
    identity = (root.stat().st_dev, root.stat().st_ino, root.stat().st_uid)
    nonce = secrets.token_hex(16)
    (root / ".owner").write_text(nonce)
    report["ownedRoot"] = {"path": str(root), "identity": list(identity), "nonce": nonce}
    baseline = {}
    for entry in Path("/proc").iterdir():
        if entry.name.isdigit():
            try:
                if entry.stat().st_uid == os.getuid():
                    baseline[entry.name] = process_row(entry)["start"]
            except (FileNotFoundError, ProcessLookupError):
                pass
            except PermissionError as error:
                uninspected.add(int(entry.name))
                report.setdefault("processObservationErrors", []).append({"pid": int(entry.name), "surface": "baseline-public-stat", "error": str(error)})
    for name in ("tools", "source", "cache", "config", "data", "state", "temp", "fixtures", "unit-fixtures"):
        (root / name).mkdir(mode=0o700)
    tools, exported = root / "tools", root / "source"
    for name in ("npmrc", "npm-global"):
        (root / name).write_text("")
    environment = {key: os.environ[key] for key in ("PATH", "HOME", "RUNNER_TEMP")}
    environment.update({"CI": "true", "LANG": "C.UTF-8", "LC_ALL": "C.UTF-8", "TZ": "UTC", "NO_COLOR": "1", "SOURCE_COMMIT": source,
                        "TMPDIR": str(root / "temp"), "TMP": str(root / "temp"), "TEMP": str(root / "temp"),
                        "XDG_CACHE_HOME": str(root / "cache"), "XDG_CONFIG_HOME": str(root / "config"), "XDG_DATA_HOME": str(root / "data"),
                        "npm_config_cache": str(root / "cache/npm"), "npm_config_userconfig": str(root / "npmrc"), "npm_config_globalconfig": str(root / "npm-global"),
                        "npm_config_update_notifier": "false", "npm_config_fetch_retries": "0", "VAFS_TOOL_ROOT": str(tools), "VAFS_QMD_RUN_ROOT": str(root),
                        "VAFS_MCP_QMD_TEST_ROOT": str(root / "unit-fixtures"), "VAFS_MCP_QMD_FIXTURE_ROOT": str(root / "fixtures"),
                        "VAFS_MCP_QMD_SOURCE_ROOT": str(exported), "VAFS_MCP_QMD_NONCE": nonce})
    node, npm = shutil.which("node"), shutil.which("npm")
    report["node"] = run([node, "--version"]).decode().strip()
    need(report["node"] == "v26.13.0", "Pinned admitted Node version")
    report["npm"] = run([npm, "--version"]).decode().strip()
    report["ripgrep"] = run(["/usr/bin/rg", "--version"]).decode().splitlines()[0]
    need(report["ripgrep"] == "ripgrep 14.1.0", "Pinned ripgrep profile")
    for name in [*RUNTIME, UNIT, CASE]:
        target = exported / name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(repo / name, target)
        os.chmod(target, 0o700 if source_files[name]["mode"] == "100755" else 0o600)
    report["exportedBefore"] = inventory(exported)
    tap = run([node, "--test", "--test-reporter=tap", str(exported / UNIT)], timeout=30)
    need(all(line in tap.decode().splitlines() for line in ("# tests 8", "# pass 8", "# fail 0", "# cancelled 0", "# skipped 0", "# todo 0")), "Eight fresh profile identities")
    report["checks"]["newProfileT2"] = {"passed": 8, "tapSha256": sha(tap), "realQmd": False}
    prior_raw = (repo / LOCK_RECEIPT).read_bytes()
    need(hashlib.sha1(b"blob " + str(len(prior_raw)).encode() + b"\0" + prior_raw).hexdigest() == "4da89ba1fe0283bd9ca5b8279258af608ee76418", "Original accepted tool-lock receipt")
    prior = json.loads(prior_raw)
    need(prior["status"] == "passed", "Accepted native tool profile")
    lock = gzip.decompress(base64.b64decode(prior["toolLock"]["raw"]["data"], validate=True))
    need(sha(lock) == LOCK_SHA, "Exact prior qualified tool lock")
    shutil.copyfile(repo / FIXTURES[0], tools / "package.json")
    (tools / "package-lock.json").write_bytes(lock)
    report["toolLock"] = {"sha256": LOCK_SHA, "original": capture(lock)}
    run([npm, "ci", "--ignore-scripts", "--omit=optional", "--no-audit", "--no-fund"], timeout=150)
    need((tools / "package-lock.json").read_bytes() == lock, "Frozen tool lock unchanged")
    qmd = tools / "node_modules/@tobilu/qmd"
    need(json.loads((qmd / "package.json").read_bytes())["version"] == "2.8.3"
         and sha((qmd / "bin/qmd").read_bytes()) == "b7162aa4da31d602c687f2c3dd2d7fcae753def25066d4b07dc262d790f4ea23"
         and sha((qmd / "dist/cli/qmd.js").read_bytes()) == "0dd4fd702adb83f27a69e59725478524ee48d00580ab6e9848dcde933000d99a", "Actual prior qualified QMD code")
    need(absent(tools / "node_modules/@node-llama-cpp"), "No optional native llama platform")
    native_source = (repo / HELPERS[1]).read_bytes()
    need(sha(native_source) == NATIVE_SHA, "Exact qualified native-admission prerequisite")
    (tools / "native-admission.mjs").write_bytes(native_source)
    report["nativeAdmission"] = json.loads(run([node, str(tools / "native-admission.mjs")], timeout=30))
    expected_native = {"node_modules/better-sqlite3/prebuilds/linux-x64.node": "6fd4292c6c5f352436cd85c9e1cb286978efa43c20ae350973f83414ced9991d",
                       "node_modules/sqlite-vec-linux-x64/vec0.so": "5923730861b86c707cca5602b5f91092f9e52a46706dbc6e269fd4bb9c4498e8"}
    need(report["nativeAdmission"]["databaseClosed"] and all(row["sha256"] == expected_native[row["path"]] for row in report["nativeAdmission"]["files"]), "Exact admitted SQLite/vector bytes")
    shutil.copyfile(repo / HELPERS[0], tools / "record-real-qmd.mjs")
    (tools / "bin").mkdir()
    quote = lambda value: "'" + value.replace("'", "'\\''") + "'"
    (tools / "bin/qmd").write_text("#!/bin/sh\nexec " + quote(node) + " " + quote(str(tools / "record-real-qmd.mjs")) + ' "$@"\n')
    os.chmod(tools / "bin/qmd", 0o700)
    environment["PATH"] = str(tools / "bin") + os.pathsep + environment["PATH"]
    (root / "cache/mcp-qmd-originals.jsonl").write_bytes(b"")
    for directory in [Path(environment["HOME"]), *Path(environment["HOME"]).parents]:
        need(absent(directory / ".qmd"), "No inherited ancestor QMD configuration")
    report["installedBefore"] = inventory(tools)
    guard("before-real-mcp")
    output = run([node, str(exported / CASE)], timeout=210)
    rows = [line.removeprefix("VAFS_MCP_QMD_RESULT=") for line in output.decode().splitlines() if line.startswith("VAFS_MCP_QMD_RESULT=")]
    need(len(rows) == 1, "One actual Q02 receipt")
    case = json.loads(rows[0])
    report["checks"]["Q02"] = case
    need(case["identity"] == "Q02" and case["passed"] is True and case["errors"] == [] and len(case["qmdOriginals"]) == 5, "Actual persistent MCP QMD journey")
    need(inventory(tools) == report["installedBefore"] and inventory(exported) == report["exportedBefore"], "Tool/export bytes unchanged")
    for name in ("cache/qmd/models", "data/qmd/models", "config/qmd/models"):
        need(absent(root / name), "No owned QMD model cache")
    guard("after-real-mcp")
    status = 0
except BaseException as error:
    report["failure"] = {"type": type(error).__name__, "message": str(error), "traceback": traceback.format_exc()}
finally:
    if root is not None:
        try:
            need(not observation_uncertain, "Process observation uncertain; preserve scratch")
            remaining = owned_processes()
            if remaining:
                remaining = stop_owned(remaining)
                status = 1
            report["cleanup"]["remaining"] = remaining
            report["cleanup"]["directGroups"] = [{"pid": p.pid, "reaped": p.poll() is not None, "absent": not group_live(p.pid)} for p in leaders]
            observed_groups = {p.pid for p in leaders} | {row["pgid"] for command in report["commands"] for row in command.get("observedProcesses", [])}
            report["cleanup"]["observedGroups"] = [{"pgid": pid, "absent": not group_live(pid)} for pid in sorted(observed_groups)]
            need(not remaining and all(row["reaped"] and row["absent"] for row in report["cleanup"]["directGroups"])
                 and all(row["absent"] for row in report["cleanup"]["observedGroups"]), "Owned processes remain; preserve scratch")
            guard("after-owned-shutdown")
            need((root.stat().st_dev, root.stat().st_ino, root.stat().st_uid) == identity and (root / ".owner").read_text() == nonce, "Owned root identity/nonce")
            report["cleanup"]["files"] = inventory(root)
            shutil.rmtree(root)
            report["cleanup"]["rootAbsent"] = not root.exists()
            guard("after-root-removal")
        except BaseException:
            report["cleanup"]["failure"] = traceback.format_exc()
            status = 1
    report["exitCode"] = status
    report["accepted"] = status == 0 and report["cleanup"].get("rootAbsent") is True
    body = json.dumps(report, separators=(",", ":")).encode() + b"\n"
    need(len(body) < 8 * 1024**2 and not proof.exists(), "Bounded new proof file")
    with proof.open("xb") as file:
        file.write(body)
    info = proof.stat()
    with Path(os.environ["GITHUB_OUTPUT"]).open("a") as output:
        output.write(f"report_sha={sha(body)}\nreport_dev={info.st_dev}\nreport_ino={info.st_ino}\n")
    print(json.dumps({"kind": "mcp-qmd-proof", "sha256": sha(body), "bytes": len(body), "accepted": report["accepted"]}))
sys.exit(status)
