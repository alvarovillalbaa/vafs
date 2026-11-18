# Local reader focused checks

31 October 2026. **62 passed, 1 failed** in the exact authored 63-case scope at [current personal vAFS `d6888b7`](https://github.com/alvarovillalbaa/vafs/commit/d6888b7ab92cc17630858831879453402397b91e), tree `bc30cc80f47537a8fb820a744fe0c1b2ea7b7a89`. Execution stopped after this result; no source/test was changed and no retry occurred. [JSON receipt](local-reader-checks.json) retains all case outcomes, input identities and the failure diagnostic.

| File | Pass | Fail |
| --- | ---: | ---: |
| `tests/unit/local-corpus.test.mjs` | 17 | 0 |
| `tests/unit/local-retrieval.test.mjs` | 16 | 0 |
| `tests/unit/local-cli.test.mjs` | 17 | 0 |
| `tests/unit/local-process.test.mjs` | 12 | 1 |

The failed case is **“runner deadline settles while inherited pipes are open and stops its owned finite descendant”**, [line 113 of the immutable source](https://github.com/alvarovillalbaa/vafs/blob/d6888b7ab92cc17630858831879453402397b91e/tests/unit/local-process.test.mjs#L113). Its `execFile('ps', ...)` inspection received **`spawn EPERM`** at line 124, surfaced during cleanup verification at line 159. No permission retry or alternate inspection surface was attempted. This leaves descendant termination **unverified**; it does not establish that the runner itself failed to terminate the child. The assertion was retained unchanged.

Existing Node **v26.8.2** and ripgrep **15.2.0**, Darwin arm64, ran the [four-file proposal](../../../proposals/local-retrieval-checks.md) command with no installation or build:

```sh
node --test --test-concurrency=1 --test-reporter=tap \
  tests/unit/local-corpus.test.mjs \
  tests/unit/local-retrieval.test.mjs \
  tests/unit/local-cli.test.mjs \
  tests/unit/local-process.test.mjs
```

Started **2026-10-31T20:33:57.525Z**, finished **2026-10-31T20:34:02.383Z**, actual exit **1**, no signal. All **63 unique names** and numbered TAP outcomes match the authored source; totals are 63 tests/0 suites/62 pass/1 fail/0 cancel/skip/todo. The 120-second process-group deadline, TERM/KILL three-second grace and stdout 256 KiB/stderr 64 KiB caps did not trigger. Original authored case/process timeouts were preserved. The passed child environment contained only allowlisted PATH, owned TMPDIR and TZ=UTC; no HOME/account/provider credentials or Node options were inherited. The same selected Node executable supplied preflight and test execution; absolute host paths are omitted from published evidence.

All **11 dependency-closed source/test inputs** matched the original [seal](../10-28/local-retrieval-source.json) and current remote Git blobs, sizes and modes before execution, and remained unchanged afterward. Before that guard, only the owned delivery copy's `bin/vafs.mjs` mode was restored from 100644 to canonical 100755 with bytes unchanged; this was not a canonical source edit. The complete closure has 11 modules/18 relative import edges and Node builtins only.

Authored fixtures use bounded local text/files (roughly 17 MiB and up to 1001 tiny files), real rg and controlled Node scripts for the QMD protocol. Remote cases mock fetch. The outer fixture directory retained its device/inode, was empty after the suite, and its owner marker/identity matched before removal. This filesystem cleanup is separate from the failed process-inspection proof.

TAP/stdout: **15,781 bytes**, SHA-256 `32969a712ed00c1ed9d14f00627b71bcd7e8e411bf78800ffb1e8306d6c1e116`; stderr 0. The actual profile is Node 26.8.2, not the preparation document's older runtime. No real QMD/index/model, provider, HTTP network, private corpus, registered native client, hosted service, account, database, installation, clone, CI or paid resource was used. The separate 34-case MCP pass remains intact and did not claim OS-child termination. These files are local evidence; root owns canonical publication and any next execution profile.
