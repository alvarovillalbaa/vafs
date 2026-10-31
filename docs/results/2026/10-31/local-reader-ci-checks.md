# Local reader CI checks — 63 passed

The [single Ubuntu run](https://github.com/alvarovillalbaa/vafs/actions/runs/41241301093) passed **63/63 checks**, with zero failures, cancellations, skips or TODOs. All exact case names, numbered TAP outcomes and the single `1..63` plan match the unchanged authored scope.

- Tested source: [d6888b7ab92cc17630858831879453402397b91e](https://github.com/alvarovillalbaa/vafs/tree/d6888b7ab92cc17630858831879453402397b91e), tree `bc30cc80f47537a8fb820a744fe0c1b2ea7b7a89`.
- Workflow: `c7253691e1cffd248331e9becbab62ab0c07047a`, SHA-256 `95cbf0580476ecd96018eadb7813b83c22cc39cf2e53062f2dfeadb4114e15a1`.
- Run `41241301093`, attempt 1, push/main; 2026-10-31T20:57:29Z–20:57:51Z. [Job `124655586122`](https://github.com/alvarovillalbaa/vafs/actions/runs/41241301093/job/124655586122) and controller exited successfully; actual controller exit 0, no signal, retry or deadline trigger.

| Exact file | Passed |
| --- | ---: |
| `tests/unit/local-corpus.test.mjs` | 17/17 |
| `tests/unit/local-retrieval.test.mjs` | 16/16 |
| `tests/unit/local-cli.test.mjs` | 17/17 |
| `tests/unit/local-process.test.mjs` | 13/13 |

Before and after execution, all **11 sealed source/test inputs** matched their SHA-256, Git blob and canonical modes, the checked-out commit/tree, and the [original seal](../10-28/local-retrieval-source.json). The complete guard objects, including all 63 expected names, are identical. Seal SHA-256: `bb589d6f1a642dfe52791e0c9e238c79368e8e94d94545375b041bdb45e3d98c`.

The actual profile was Ubuntu 24.04 Linux/x64, Node **v26.13.0**, ripgrep **14.1.0**. The three-minute runner-tool step successfully installed the exact signed Ubuntu package `ripgrep=14.1.0-1` and passed its package-version assertion. The controller attributed the resolved executable separately:

| Runtime binary | Actual SHA-256 |
| --- | --- |
| Node 26.13.0 | `0adde40d1b7dfa57c8bc83cbc319758c3ec6ebba21363bb2fa752ea6b267ad1b` |
| ripgrep 14.1.0 | `be2fbcdd985161603bfa268c7647eec670b9e94374f0e972da708d7de670a8fb` |

The unchanged owned-descendant case **#47** passed: “runner deadline settles while inherited pipes are open and stops its owned finite descendant.” On Linux it checks the authored PID through `/proc`, including a non-running zombie state, after asserting bounded settlement and process-group termination. Cleanup reported `processesStopped=true`, `ownedTmpRemoved=true`, `forced=false`. No outer cleanup intervention was needed to obtain the pass.

The controller retained its 120-second wall limit, TERM→KILL three-second grace, 256 KiB stdout/64 KiB stderr caps and task-owned fixtures. Its child received only explicit Node/RG directories plus system utilities in PATH, owned TMPDIR and TZ=UTC; no account/provider environment was inherited. TAP duration was **1654.679066 ms**. Exact stdout: **14,617 bytes**, SHA-256 `16b8dc9bd8a8977154bd94e7c3afb714615a660da29a64e845de01e4ebff99ac`; stderr 0 bytes, SHA-256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`. The [machine receipt](local-reader-ci-checks.json) retains the complete TAP and actual controller report, independently matched by byte count/hash.

Historical results remain separate: [macOS](local-reader-checks.md) passed 62/63 with one `ps` EPERM failure under Node26.8.2/RG15.2.0; [Ubuntu attempt 1](local-reader-ci-attempt1.md) and [attempt 2](local-reader-ci-attempt2.md) ran zero cases because preflight could not resolve rg. The Linux pass does not establish macOS process-inspection permission. No source or assertion was weakened, no local permission retry occurred, and this run was not a retry of a GitHub run.

This is authored T2 local-reader proof using real rg and scripted QMD protocol fixtures. Remote cases mock fetch. Ephemeral runner Node/RG tooling was provided; there was no application dependency/model installation, private corpus, real QMD index/model, provider, product HTTP server, Auth, browser, database or hosted/MCP acceptance. Complete product readiness remains separate. These results and the testing-guide update retire the temporary workflow in the final publication packet; canonical readback is recorded separately.
