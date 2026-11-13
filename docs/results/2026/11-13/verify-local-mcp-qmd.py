"""Portable receipt audit only; never imports or executes product/check bodies."""
import base64
import gzip
import hashlib
import json
from pathlib import Path
import zipfile

root = Path(__file__).resolve().parent
digest = lambda data: hashlib.sha256(data).hexdigest()
source = "71c1e8fdc460277f3fbf31e0a7867166c8fa1399"
captures = []


def receipt(attempt, run, archive_sha, report_sha):
    path = root / f"local-mcp-qmd-attempt-{attempt}.zip"
    raw = path.read_bytes()
    assert digest(raw) == archive_sha
    with zipfile.ZipFile(path) as archive:
        assert archive.namelist() == [f"vafs-local-mcp-qmd-{run}.json"]
        body = archive.read(archive.namelist()[0])
    assert digest(body) == report_sha
    return json.loads(body), body


def unpack(value):
    body = gzip.decompress(base64.b64decode(value["gzipBase64"], validate=True))
    assert value["complete"] is True and len(body) == value["bytes"] and digest(body) == value["sha256"]
    return body


def audit_captures(value, path="report"):
    if isinstance(value, dict):
        if "gzipBase64" in value:
            body = unpack(value)
            if "retainedBytes" in value:
                assert value["retainedBytes"] == len(body)
            captures.append({"path": path, "bytes": len(body), "sha256": digest(body)})
        else:
            for key, item in value.items():
                audit_captures(item, path + "." + key)
    elif isinstance(value, list):
        for index, item in enumerate(value):
            audit_captures(item, path + f"[{index}]")


negative, _ = receipt(2, 43423338500,
    "6f6c6ee2b872587619c0cc96d11d37bb32844454ccabbe1de1664cd75e4435e9",
    "c3484acb69eb9ed4f6c6ca024230c8302537ddbdff44908b0acf3908510270fe")
assert negative["accepted"] is False and negative["checks"] == {}
assert negative["failure"]["type"] == "FileNotFoundError" and "/usr/bin/rg" in negative["failure"]["message"]
assert negative["cleanup"]["rootAbsent"] is True and not negative["cleanup"]["remaining"]
assert all(row["absent"] for row in negative["cleanup"]["observedGroups"])
first_log = gzip.decompress((root / "local-mcp-qmd-attempt-1-job.log.gz").read_bytes())
assert digest(first_log) == "d9f29e017db4ec0ca6b98cc06f740cb25b724de41d33cf5a021127eb7a4d7313"
assert b"NameError: name 'status' is not defined" in first_log

r, raw = receipt(3, 43423746169,
    "15573c1ba4ada8dba209a101968cfe7a77e81417f93a394caedd83a822d37cdf",
    "143d85917e71b8c4efeef1d523c26f72b71f09ea472c2ddbcb6d0292bd63631d")
assert r["accepted"] is True and r["exitCode"] == 0 and r["sourceCommit"] == source
assert r["runId"] == "43423746169" and r["oldCasesReexecuted"] is False
audit_captures(r)
tree_raw = (root / "local-mcp-qmd-source-tree.json").read_bytes()
assert digest(tree_raw) == "3bbec3a42022272caa44daefd9fdbc3e6ae51b03f1fbfc9680e5b9782f8a2f4b"
tree = json.loads(tree_raw)
assert tree["sha"] == "72adb8e78d31286c3c04831314e44dfe087079fd" and tree["truncated"] is False
expected = {row["path"]: (row["mode"], row["sha"], row["size"]) for row in tree["tree"]}
actual = {path: (row["mode"], row["blob"], row["bytes"]) for path, row in r["sourceFiles"].items()}
assert expected == actual and len(actual) == 986
assert [g["label"] for g in r["sourceGuards"]] == ["before-owned-work", "before-real-mcp", "after-real-mcp", "after-owned-shutdown", "after-root-removal"]
assert all(g["matches"] and g["files"] == 986 for g in r["sourceGuards"])
assert (r["node"], r["npm"], r["ripgrep"]) == ("v26.13.0", "11.20.0", "ripgrep 14.1.0")
assert len(r["commands"]) == 7
for command in r["commands"]:
    assert command["exitCode"] == 0 and command["reaped"] is True
    assert command["observerError"] is None and command["observedGroupsAbsent"] is True
    assert not command.get("boundedStop")
tap = unpack(r["commands"][3]["stdout"])
assert digest(tap) == r["checks"]["newProfileT2"]["tapSha256"]
assert all(line in tap.decode().splitlines() for line in ("# tests 8", "# pass 8", "# fail 0", "# cancelled 0", "# skipped 0", "# todo 0"))
assert r["checks"]["newProfileT2"] == {"passed": 8, "tapSha256": digest(tap), "realQmd": False}
lock = unpack(r["toolLock"]["original"])
assert len(lock) == 82512 and digest(lock) == "98697aea8ca592674d254ca791b355a27549388451e1d2a7ba9c9366294e98a7"
assert json.loads(lock)["packages"][""]["dependencies"] == {"@tobilu/qmd": "2.8.3", "better-sqlite3": "13.0.3", "sqlite-vec": "0.1.9", "sqlite-vec-linux-x64": "0.1.9"}
native = r["nativeAdmission"]
assert native["actualInMemoryDatabase"] and native["vectorExtensionLoaded"] and native["databaseClosed"]
assert native["sqliteVersion"] == "3.53.4" and native["vecVersion"] == "v0.1.9"
assert {row["path"]: row["sha256"] for row in native["files"]} == {
    "node_modules/better-sqlite3/prebuilds/linux-x64.node": "6fd4292c6c5f352436cd85c9e1cb286978efa43c20ae350973f83414ced9991d",
    "node_modules/sqlite-vec-linux-x64/vec0.so": "5923730861b86c707cca5602b5f91092f9e52a46706dbc6e269fd4bb9c4498e8"}
q = r["checks"]["Q02"]
outer = unpack(r["commands"][-1]["stdout"]).decode().splitlines()
assert len(outer) == 1 and outer[0].startswith("VAFS_MCP_QMD_RESULT=")
assert json.loads(outer[0].split("=", 1)[1]) == q
assert q["passed"] is True and not q["errors"] and q["sourceCommit"] == source
assert len(q["commands"]) == 4 and len(q["qmdOriginals"]) == 5
assert all(c["exitCode"] == 0 and c["signal"] is None and c["closed"] and c["groupAbsent"] for c in q["commands"])
assert all(c["exitCode"] == 0 and c["signal"] is None and c["error"] is None
           and c["executableSha256"] == "b7162aa4da31d602c687f2c3dd2d7fcae753def25066d4b07dc262d790f4ea23" for c in q["qmdOriginals"])
query = "vafsmcpquartzharbor20261113"
expected_args = ["search", query, "-c", q["collection"], "--json", "-n", "20", "--full-path"]
assert all(row["argv"] == expected_args for row in q["qmdOriginals"][1:])
assert len(q["nativeBaseline"]) == len(q["nativeStale"]) == 5
assert json.loads(unpack(q["qmdOriginals"][1]["stdout"])) == q["nativeBaseline"]
assert json.loads(unpack(q["qmdOriginals"][3]["stdout"])) == q["nativeStale"]
assert any(row["title"] == "Cached archive note" for row in q["nativeStale"])
wire = [json.loads(line) for line in unpack(q["commands"][2]["stdout"]).decode().splitlines()]
assert len(wire) == len(q["wireRequests"]) == 8
assert [row["id"] for row in wire] == [row["id"] for row in q["wireRequests"]]
assert all(wire[i]["error"]["code"] == -32602 for i in range(2, 6))
assert wire[6]["result"]["structuredContent"] == q["baseline"] and wire[7]["result"]["structuredContent"] == q["afterMutation"]
for index, value in enumerate((q["baseline"], q["afterMutation"])):
    names = {row["path"] for row in value["data"]}
    assert names == ({"knowledge/current.md", "knowledge/stale.md", "knowledge/removed.md"} if index == 0 else {"knowledge/current.md", "knowledge/stale.md"})
    assert value["meta"]["legs"]["qmd"] == {"status": "ok", "collection": q["collection"]}
    for row in value["data"]:
        snapshot = q["snapshots"][index]["files"]["selected/" + row["path"]]
        assert (row["contentHash"], row["bytes"]) == (snapshot["sha256"], snapshot["bytes"])
        if index == 1 and row["path"] == "knowledge/stale.md":
            assert row["title"] == "Revised archive note" and row["modes"] == ["qmd"] and row["matches"] == []
        else:
            assert set(row["modes"]) == {"grep", "qmd"} and len(row["matches"]) == 1
            match = row["matches"][0]
            assert match["text"] == query and match["byteEnd"] - match["byteStart"] == len(query.encode())
    assert "AUTHORED_RAW_SENTINEL" not in json.dumps(value) and "AUTHORED_FOREIGN_SENTINEL" not in json.dumps(value)
assert len(q["snapshots"][0]["files"]) == 6 and len(q["snapshots"][1]["files"]) == 5
assert all(g["closed"] and g["absent"] for g in q["cleanup"]["groups"])
cleanup = r["cleanup"]
assert cleanup["rootAbsent"] is True and not cleanup["remaining"] and not cleanup.get("signalActions")
assert all(g["reaped"] and g["absent"] for g in cleanup["directGroups"])
assert all(g["absent"] for g in cleanup["observedGroups"])
assert len(cleanup["files"]) == 5308
for attempt, expected_hash in ((2, "05d1daa98b3f7036994b8ac992f213124cc39164be5f1d48d79389b34735733e"),
                               (3, "ae277829b4bbaddbc4dc41a4b015be1599c6d858f2b9fd068580f616455c4686")):
    log = gzip.decompress((root / f"local-mcp-qmd-attempt-{attempt}-job.log.gz").read_bytes())
    assert digest(log) == expected_hash and b'"kind": "uploaded-proof-retired"' in log and b'"absent": true' in log
assert b'"sha256": "143d85917e71b8c4efeef1d523c26f72b71f09ea472c2ddbcb6d0292bd63631d"' in log
controls = json.loads((root / "local-mcp-qmd-controls.json").read_bytes())
assert controls["sourceCommit"] == source and controls["qaRefs"] == []
assert {row["id"] for row in controls["workflows"]} == {417231776, 417233775, 417236241}
assert all(row["state"] == "disabled_manually" for row in controls["workflows"])
print(json.dumps({"accepted": True, "kind": "vafs.local-mcp-qmd.receipt-audit", "sourceCommit": source,
    "profileChecks": 8, "realJourney": "Q02", "nativeQmdInvocations": 5, "persistentMcpProcesses": 1,
    "originalCaptures": len(captures), "decodedBytes": sum(c["bytes"] for c in captures), "sourceFiles": 986,
    "sourceGuards": 5, "scratchInventoryFiles": 5308, "failedAttemptsPreserved": [1, 2],
    "proofSha256": digest(raw), "captures": captures}, separators=(",", ":")))
