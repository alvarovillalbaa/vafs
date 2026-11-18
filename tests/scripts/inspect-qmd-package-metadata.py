#!/usr/bin/env python3
"""Read five exact public npm manifests; never install or execute their contents."""
import base64
import gzip
import hashlib
import json
import math
import os
import re
import select
import signal
import ssl
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

REPOSITORY = "alvarovillalbaa/vafs"
BRANCH = "refs/heads/qa/vafs-qmd-metadata-20261107-1"
PACKAGES = [
    ("@tobilu/qmd", "2.8.3"),
    ("better-sqlite3", "13.0.3"),
    ("sqlite-vec", "0.1.9"),
    ("node-llama-cpp", "3.20.0"),
    ("sqlite-vec-linux-x64", "0.1.9"),
]
DECLARED = {"better-sqlite3": "^13.0.3", "sqlite-vec": "0.1.9", "node-llama-cpp": "3.20.0"}
MAX_BODY = 131072
MAX_GZIP = MAX_BODY + 256
MAX_REPORT = 2097152
PREFIX = b"VAFS_QMD_PACKAGE_METADATA_RESULT="
REPORT = {
    "schemaVersion": 1, "sourceCommit": None, "status": "failed",
    "inspectionComplete": False, "providerAccepted": False,
    "requests": [], "errors": [],
    "limits": {"jobSeconds": 300, "workSeconds": 180, "requestSeconds": 20,
               "socketSeconds": 5, "stdoutSeconds": 2, "responseBytes": MAX_BODY,
               "responseGzipBytes": MAX_GZIP, "summaryBytes": 32768, "reportBytes": MAX_REPORT},
    "scope": {"metadataRequests": 5, "tarballsFetched": 0, "packagesInstalled": 0,
              "packageScriptsExecuted": 0, "processesSpawned": 0, "filesWritten": 0,
              "homeOverridden": False, "applicationDataRead": False,
              "modelsOrNativeBinariesDownloaded": False, "installedTreeObserved": False},
    "cleanup": {"responsesOpened": 0, "responseCloseCallsReturned": 0,
                "responseObjectsRemaining": 0, "failures": []},
    "proofLimits": [
        "Original public exact-version registry JSON only; no package archive is requested.",
        "Registry-declared tarball integrity and URL are metadata, not an independently hashed or inspected archive.",
        "better-sqlite3 13.0.3 is the literal anchor of ^13.0.3, not a resolved dependency selection or installed tree.",
        "Published script strings do not establish skip-control behavior, native binding availability or absence of binaries in a future main archive.",
        "No package install, QMD query, app/private corpus read, model, provider or native-binary execution occurs.",
        "Response close counters describe this process's close calls, not a host-wide socket inventory; external termination can prevent emission.",
    ],
}


class ProbeError(Exception):
    def __init__(self, code):
        self.code = code


def need(condition, code):
    if not condition:
        raise ProbeError(code)


def sha(data):
    return hashlib.sha256(data).hexdigest()


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, request, response, code, message, headers, new_url):
        return None


def alarm(_signum, _frame):
    raise ProbeError("request_deadline")


def interrupted(_signum, _frame):
    raise ProbeError("interrupted")


def unique_object(pairs):
    result = {}
    for key, value in pairs:
        need(key not in result, "duplicate_metadata_key")
        result[key] = value
    return result


def invalid_constant(_value):
    raise ProbeError("registry_json_invalid")


def finite_float(value):
    number = float(value)
    need(math.isfinite(number), "registry_json_invalid")
    return number


def fetch_manifest(opener, name, version, deadline):
    url = "https://registry.npmjs.org/" + urllib.parse.quote(name, safe="@") + "/" + version
    need((name, version) in PACKAGES, "unapproved_package")
    row = {"name": name, "version": version, "url": url, "status": None,
           "contentType": None, "contentLength": None, "contentLengthHeaderCount": 0,
           "complete": False, "error": None, "raw": None}
    REPORT["requests"].append(row)
    response, kept, observed, digest = None, bytearray(), 0, hashlib.sha256()
    started, failure = time.monotonic(), None
    try:
        remaining = min(20.0, deadline - started)
        need(remaining > 0, "work_deadline")
        signal.setitimer(signal.ITIMER_REAL, remaining)
        request = urllib.request.Request(url, headers={"Accept": "application/json",
            "Accept-Encoding": "identity", "User-Agent": "vafs-qmd-metadata-only/1"})
        try:
            response = opener.open(request, timeout=min(5.0, remaining))
        except urllib.error.HTTPError as error:
            response = error  # Retain HTTP error/redirect bodies before applying gates.
        REPORT["cleanup"]["responsesOpened"] += 1
        REPORT["cleanup"]["responseObjectsRemaining"] += 1
        row["status"], row["contentType"] = response.status, response.headers.get("Content-Type", "")[:256]
        lengths = response.headers.get_all("Content-Length", [])
        row["contentLengthHeaderCount"] = len(lengths)
        row["contentLength"] = lengths[0][:64] if len(lengths) == 1 else None
        need(response.geturl() == url, "response_url_changed")
        while True:
            need(time.monotonic() < deadline and time.monotonic() - started < 20, "request_deadline")
            part = response.read1(min(16384, MAX_BODY + 1 - observed))
            if not part:
                row["complete"] = True
                break
            observed += len(part)
            digest.update(part)
            kept.extend(part[:max(0, MAX_BODY - len(kept))])
            need(observed <= MAX_BODY, "response_body_limit")
    except Exception as error:
        failure = error.code if isinstance(error, ProbeError) else "registry_request_failed"
    finally:
        signal.setitimer(signal.ITIMER_REAL, 0)
        if response is not None:
            try:
                response.close()
                REPORT["cleanup"]["responseCloseCallsReturned"] += 1
                REPORT["cleanup"]["responseObjectsRemaining"] -= 1
            except Exception:
                REPORT["cleanup"]["failures"].append("response_close_failed")
                failure = failure or "response_close_failed"
        body = bytes(kept)
        zipped = gzip.compress(body, mtime=0)
        row["raw"] = {"encoding": "gzip-base64", "bytes": len(body), "sha256": sha(body),
                      "compressedBytes": len(zipped), "data": base64.b64encode(zipped).decode("ascii"),
                      "observedBytes": observed, "observedSha256": digest.hexdigest(),
                      "originalComplete": row["complete"] and observed == len(body)}
        row["durationMs"] = round((time.monotonic() - started) * 1000)
        row["error"] = failure
    need(len(zipped) <= MAX_GZIP, "response_gzip_limit")
    if failure:
        raise ProbeError(failure)
    length = row["contentLength"]
    if row["contentLengthHeaderCount"] > 1 or (length is not None and
            (not re.fullmatch(r"[0-9]{1,12}", length) or int(length) != observed)):
        row["complete"], row["raw"]["originalComplete"], row["error"] = False, False, "response_length_mismatch"
        raise ProbeError("response_length_mismatch")
    need(row["complete"] and row["status"] == 200, "registry_http_status")
    need(row["contentType"].split(";", 1)[0].strip().lower() == "application/json", "registry_content_type")
    try:
        value = json.loads(body.decode("utf-8", errors="strict"), object_pairs_hook=unique_object,
                           parse_constant=invalid_constant, parse_float=finite_float)
    except ProbeError:
        raise
    except Exception:
        raise ProbeError("registry_json_invalid") from None
    need(isinstance(value, dict) and value.get("name") == name and value.get("version") == version, "package_identity_mismatch")
    dist = value.get("dist")
    need(isinstance(dist, dict), "package_dist_missing")
    integrity = dist.get("integrity", "")
    need(isinstance(integrity, str) and re.fullmatch(r"sha512-[A-Za-z0-9+/]+={0,2}", integrity), "package_integrity_invalid")
    try:
        encoded = integrity[len("sha512-"):]
        checksum = base64.b64decode(encoded, validate=True)
        need(len(checksum) == 64 and base64.b64encode(checksum).decode("ascii") == encoded, "package_integrity_invalid")
    except (ValueError, TypeError):
        raise ProbeError("package_integrity_invalid") from None
    tarball = dist.get("tarball")
    need(isinstance(tarball, str), "package_tarball_invalid")
    parsed = urllib.parse.urlsplit(tarball)
    expected_path = "/" + name + "/-/" + name.rsplit("/", 1)[-1] + "-" + version + ".tgz"
    need(parsed.scheme == "https" and parsed.netloc == "registry.npmjs.org" and not parsed.query
         and not parsed.fragment and urllib.parse.unquote(parsed.path) == expected_path, "package_tarball_invalid")
    need(isinstance(dist.get("shasum"), str) and re.fullmatch(r"[0-9a-f]{40}", dist["shasum"]), "package_shasum_invalid")
    fields = ["name", "version", "type", "bin", "engines", "scripts", "dependencies",
              "optionalDependencies", "peerDependencies", "peerDependenciesMeta", "config",
              "gypfile", "files", "os", "cpu"]
    selected = {key: value[key] for key in fields if key in value}
    selected["dist"] = {key: dist[key] for key in ["integrity", "tarball", "shasum"]}
    for field in ["unpackedSize", "fileCount"]:
        if field in dist:
            need(type(dist[field]) is int and dist[field] >= 0, "package_size_metadata_invalid")
            selected["dist"][field] = dist[field]
    need(len(json.dumps(selected, ensure_ascii=False, allow_nan=False).encode("utf-8")) <= 32768, "manifest_summary_limit")
    row["manifest"] = selected
    return value


def collect():
    entered = time.monotonic()
    need(len(sys.argv) == 3 and sys.argv[1] == "--source-commit" and re.fullmatch(r"[0-9a-f]{40}", sys.argv[2]), "source_pin_required")
    REPORT["sourceCommit"] = sys.argv[2]
    need(sys.platform == "linux" and sys.version_info >= (3, 11) and os.environ.get("CI") == "true"
         and os.environ.get("GITHUB_ACTIONS") == "true" and os.environ.get("GITHUB_REPOSITORY") == REPOSITORY
         and os.environ.get("GITHUB_REF") == BRANCH and os.environ.get("GITHUB_EVENT_NAME") == "create"
         and os.environ.get("VAFS_QMD_PUBLIC_REPOSITORY") == "true"
         and os.environ.get("SOURCE_COMMIT") == REPORT["sourceCommit"], "approved_public_ci_required")
    start_text = os.environ.get("VAFS_QMD_JOB_STARTED_MS", "")
    need(re.fullmatch(r"[0-9]{13}", start_text), "job_timestamp_required")
    setup_seconds = time.time() - int(start_text) / 1000
    need(0 <= setup_seconds < 300, "job_timestamp_invalid")
    budget = min(180.0, 300.0 - setup_seconds - 15.0)
    need(budget >= 130, "metadata_window_unavailable")
    deadline = entered + budget
    REPORT["timing"] = {"setupSeconds": round(setup_seconds, 3), "admittedWorkSeconds": round(budget, 3), "jobMarginSeconds": 15}
    # Explicit Ubuntu trust bundle and empty proxy handler ignore inherited TLS/proxy settings.
    context = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
    context.load_verify_locations(cafile="/etc/ssl/certs/ca-certificates.crt")
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect(), urllib.request.HTTPSHandler(context=context))
    qmd = fetch_manifest(opener, *PACKAGES[0], deadline)
    need(isinstance(qmd.get("dependencies"), dict) and all(qmd["dependencies"].get(name) == spec for name, spec in DECLARED.items()), "qmd_declared_dependency_mismatch")
    REPORT["declaredDependencySpecs"] = {name: qmd["dependencies"][name] for name in DECLARED}
    for name, version in PACKAGES[1:]:
        manifest = fetch_manifest(opener, name, version, deadline)
        if name == "sqlite-vec":
            optional = manifest.get("optionalDependencies")
            need(isinstance(optional, dict) and optional.get("sqlite-vec-linux-x64") == "0.1.9", "sqlite_vec_platform_spec_mismatch")
    need(time.monotonic() <= deadline, "work_deadline")
    cleanup = REPORT["cleanup"]
    need(cleanup["responsesOpened"] == cleanup["responseCloseCallsReturned"] == 5
         and cleanup["responseObjectsRemaining"] == 0 and not cleanup["failures"], "response_cleanup_unverified")
    REPORT["inspectionComplete"] = True
    REPORT["status"] = "completed"


def emit():
    payload = PREFIX + json.dumps(REPORT, ensure_ascii=False, allow_nan=False, separators=(",", ":")).encode("utf-8") + b"\n"
    if len(payload) > MAX_REPORT:
        return False  # Bounds above keep five complete originals and summaries below this cap.
    original = os.get_blocking(1)
    try:
        os.set_blocking(1, False)
        deadline, offset = time.monotonic() + 2, 0
        while offset < len(payload):
            remaining = deadline - time.monotonic()
            if remaining <= 0 or not select.select([], [1], [], remaining)[1]:
                return False
            try:
                offset += os.write(1, payload[offset:])
            except BlockingIOError:
                continue
        return True
    except OSError:
        return False
    finally:
        os.set_blocking(1, original)


if __name__ == "__main__":
    signal.signal(signal.SIGALRM, alarm)
    signal.signal(signal.SIGTERM, interrupted)
    signal.signal(signal.SIGINT, interrupted)
    try:
        collect()
    except Exception as error:
        REPORT["errors"].append(error.code if isinstance(error, ProbeError) else "metadata_inspection_failed")
    signal.setitimer(signal.ITIMER_REAL, 0)
    sys.exit(0 if emit() and REPORT["inspectionComplete"] else 1)
