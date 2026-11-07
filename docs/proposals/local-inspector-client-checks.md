# Configured Inspector CLI interoperability — I01 accepted

The [first result](../results/2026/11-07/local-inspector-client-attempt-1.md)
passed at `229803f1d8bd46b2217b21b01af7800d460d65fc`: five actual legacy
Inspector sessions, complete original outputs, exact authored UTF-8 retrieval,
source/package guards and owned cleanup. There was no retry or product-source
fix. The earlier 34/63 scopes remain separate. The preparation below is historical
scope; actual observations and limitations belong to the receipt.

7 November 2026. The [testing guide](../testing.md) records separate accepted
34-case MCP and 63-case reader scopes. Neither proves real configured-client
interoperability. This packet adds one first interoperability identity, I01:
**official Inspector legacy stdio discovery and retrieval preserve eligible UTF-8 provenance**.
Preparation is not a passing result.

The owner's standing “approve everything / you choose / keep going / do all the
work” authorizes this bounded temporary public CI and source publication. No
account, paid provider, model call, QMD, private corpus, app dependency change,
Next build, HTTP server, browser, native-client registration or production
configuration is included. The old 34 and 63 checks stay closed and do not rerun.

## Observable contract

Use the actual official Inspector CLI and actual `bin/vafs-local-mcp.mjs` with
its unchanged local reader. Tier 2 data consists of disposable authored Markdown
under a unique owned root, including a UTF-8 knowledge page and excluded raw
intake. No product helper, protocol transport, reader or subprocess is mocked.

Five sequential CLI invocations use a read-only generated configuration selecting
one `stdio` server and explicit legacy protocol negotiation: initialize, list
tools, call index, literal search, then exact page read. Each invocation connects
and disconnects; this does not claim a single persistent session. Verify server
identity/protocol, the three expected read-only tool names, eligible metadata,
literal search provenance/current hashes, exact UTF-8 text and exclusion of raw
intake. QMD remains disabled. Fixture input bytes remain unchanged.

Keep complete bounded original stdout/stderr and parsed outputs for all attempted
operations, including failures and unrun steps. Nonzero exit, missing/extra
identity, truncated output, unexpected error, timeout, forced signal, uncertain
process ownership or unverified teardown fails the packet. A partial sequence
does not become a passing journey.

## Pinned tool and execution boundary

Inspector version **2.14.0** has documented Node floor
`^22.23.4 || ^24.22.1 || >=26.12.1`; use **Node 26.13.0**, matching the earlier
Linux reader profile. Source documentation is pinned to Inspector tag commit
[`4d3464cb3a6dde609d7b5ac24c440b947eb40f23`](https://github.com/modelcontextprotocol/inspector/tree/4d3464cb3a6dde609d7b5ac24c440b947eb40f23).
The [CLI guide](https://github.com/modelcontextprotocol/inspector/blob/4d3464cb3a6dde609d7b5ac24c440b947eb40f23/clients/cli/README.md)
defines `--config`, `--server`, `--protocol-era`, JSON output and methods.
Do not combine `--config` with the conflicting ad-hoc `--transport` flag.

Root read the [published package metadata](https://registry.npmjs.org/@modelcontextprotocol%2Finspector/2.14.0)
at 08:06:51 UTC. Its SRI is
`sha512-CP3ddu+PHACEA6LkUwrnY2yzZqBiwFZHylU5bst3l1LiNrRfUNn54QNZZ4yecaudctJ9vBollO0AdxhDIslAdg==`.
The published package is separate from its source-doc revision; no byte equality
between them is inferred. Install the exact tool only under owned runner
storage, verify its lock/SRI and retain the bounded resolved dependency lock.
Disable lifecycle scripts: its postinstall installs clients and is outside
this scope. Do not invoke a source build or its browser/TUI launchers.

Use a scrubbed child environment, original runner HOME, owned npm/cache/config/
temporary/state paths and the documented memory-only secret backend. Disable
browser auto-open and avoid stored credentials, proxies and OAuth. Generated
configuration and fixtures cannot select a different server/root or HTTP target.
Preserve the app's package and lock files.

One new create-only QA branch owns one public Ubuntu 24.04 job capped at twenty
minutes. Outer work is bounded to 1020 seconds plus 90 seconds cleanup; the
integration driver gets 240 seconds work, 60 seconds cleanup and two seconds
stdout. The first job step records its clock; setup time reduces the available
work window, reserving 90 seconds cleanup and a 30-second job/output margin.
Missing or invalid timing fails admission. Source, output, stream, process and scratch guards must pass before
acceptance. Fixture and tool teardown are part of the verdict.

## Source ownership

Baseline is `743e6afe2b1722189f73c3d39a71b8783efdbc18`, tree
`aa622c6d9a43d3b6e9c6ce675fb0bc60854e3ef6`: 958 blobs / 7,494,850 bytes.
Preparation adds only the integration driver, its separate operational runner,
`tests/README.md`, this proposal and an inactive workflow example. All original
mode/blob/byte inputs remain exact. Main stays unchanged during the first check;
Root publishes a reviewed candidate and separately activates its owned QA branch.

The selected CI checkout gets complete native Git/source guards. Execution
exports only `bin/vafs-local-mcp.mjs` and its six `bin/local/*.mjs` modules,
recording original Git modes and exact bytes while using owner-only copy
permissions, plus the pinned driver. Do not copy old
audit trees, UI/skill folders, dependencies or Git histories into test evidence.

There is no canonical local checkout. Small source files are prepared in the
existing delivery bundle and published through GitHub's Git-object APIs; a
local source bundle is not a Git checkout or remote publication. Storage Guard
reports 17.3 GiB free against 34 GiB required, so no local clone/worktree,
installation, client/server launch, build or runtime check is part of preparation.
Use only existing-tool syntax, source, link and whitespace checks locally.

This can establish configured Inspector CLI interoperability against authored
files. It cannot establish native client registration, macOS process-inspection
permission, hosted identity/RLS, real QMD/models or full vAFS acceptance.
