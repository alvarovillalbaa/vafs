# Local MCP focused checks

31 October 2026. **34/34 passed** at immutable [personal vAFS source `7a4d979`](https://github.com/alvarovillalbaa/vafs/tree/7a4d979353936fde7b4ed958aa6ddd653699dda3), whose sealed implementation inputs match source `ac3d57c`. The current owner's broad instruction and root's exact assignment authorized this [34-case packet](../../../proposals/local-mcp-checks.md). No source or test was changed.

The existing **Node v26.8.2** / **ripgrep 15.2.0**, Darwin arm64 profile ran exactly:

```sh
node --test --test-reporter=tap --test-concurrency=1 --test-timeout=10000 tests/unit/local-mcp.test.mjs
```

The controller self-reported its Node version/executable and used that same absolute resolved executable for the test child. Existing absolute `rg` passed `spawnSync --version` with status 0, no signal/error/stderr. Published identities use portable basenames; this actual profile replaces no source requirement and does not establish an older preparation-runtime result.

Execution started **2026-10-31T20:26:18.793Z**, finished **2026-10-31T20:26:19.095Z**, actual exit **0**, no signal. TAP reports **34 tests, 0 suites, 34 pass, 0 fail/cancel/skip/todo**; every unique case name and numbered `ok` line matches the [source seal](../10-30/local-mcp-source.json). The child received only allowlisted `PATH`, `TMPDIR` and `TZ=UTC`, with no inherited HOME, account/provider credentials or Node options. The separate outer deadline was 120 seconds, each case 10 seconds, process-group TERM/KILL grace 3 seconds, stdout 256 KiB/stderr 64 KiB. No timeout, interruption or output cap occurred.

All **14 selected inputs** matched their sealed SHA-256, byte size and executable mode before execution and remained unchanged afterward. Each authored fixture uses its owned parent identity before removal; the outer fixture directory also retained its device/inode and was empty after the suite. The outer owner marker/device/inode matched and its temporary tree was removed. [JSON receipt](local-mcp-checks.json) retains inputs, all 34 names, limits and cleanup. TAP/stdout was **8,688 bytes**, SHA-256 `f1342ac56986ed6ea0f2edcf251fce6ab9171ce127affd44587b982c1a923d9b`; stderr was empty.

Two controller attempts stopped **before any test or product import**. First, an overly strict wrapper check expected a space after the valid `ripgrep 15.2.0` banner. Second, profile formatting passed `basename` directly to `Array.map`, exposing the numeric index as its optional suffix. Both were wrapper-only corrections; both attempts ran 0 cases, preserved all 14 inputs and removed empty owned fixtures. They are recorded separately from the one actual 34-case invocation and are not product/test failures.

The successful cases use actual local authored Markdown and real rg for byte/hash/fresh-read/path boundaries, plus controlled reader seams and in-memory streams for protocol/ownership/cancellation/error behavior. They establish this focused local contract, not hosted identity, QMD/model behavior, real-client interoperability or full MCP conformance. EOF suppression is not OS-child shutdown proof; retrieval/write deadline durations are not measured. The older 63-case scope, Next build, native client, hosted service, private corpus, database, providers and paid work were not exercised. This receipt records execution; the delivery handoff records subsequent canonical publication separately.
