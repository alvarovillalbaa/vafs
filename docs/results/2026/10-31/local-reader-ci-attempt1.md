# Local reader CI attempt 1 — preflight failure

The [first Ubuntu run](https://github.com/alvarovillalbaa/vafs/actions/runs/41240582792) failed before spawning tests: **0 of 63 cases ran**. This is a runner preflight failure, with no test verdict.

- Source: [d6888b7ab92cc17630858831879453402397b91e](https://github.com/alvarovillalbaa/vafs/tree/d6888b7ab92cc17630858831879453402397b91e), tree `bc30cc80f47537a8fb820a744fe0c1b2ea7b7a89`; 11 sealed inputs.
- Workflow: `fcceae7f5b8dd9a779a05b7d857faf236925a1c5`; workflow SHA-256 `86890a61e55d761c2dffcd64763736099da407615a48a2ba62f97842e1932df9`.
- Run `41240582792`, attempt 1, push to main; created 2026-10-31T20:48:03Z, completed 20:48:18Z. [Job `124653456687`](https://github.com/alvarovillalbaa/vafs/actions/runs/41240582792/job/124653456687) exited 1 after successful checkout/setup-node.

The actual report at 20:48:16.0793158Z contains only `rg_missing`. The resolver searched `/usr/bin`, `/bin` and `/usr/local/bin`, rather than the runner's complete PATH. This does **not** establish that rg was globally absent; another PATH directory, including Linuxbrew, was not checked.

Setup-node logged Node `v26.13.0`. Failure preceded the controller's runtime attribution, source guards, fixture allocation and child spawn. No Node/RG binary hashes or RG version were recorded. The report has no TAP plan, case rows or totals; stdout/stderr child captures are empty (SHA-256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`). Source guards and the Linux `/proc` owned-descendant check remain unrun.

Cleanup reported `processesStopped=true`, `forced=false`, `ownedTmpRemoved=false`. No child or owned task directory existed, so the last flag indicates no allocated directory, rather than a leaked fixture. There was no retry or signal interruption.

The scoped resolver repair examines nonempty absolute current-PATH directories and accepts only a resolved regular executable without CR/LF/NUL. The test child still receives only its explicit Node/RG directories plus `/usr/bin:/bin`, owned TMPDIR and UTC TZ. Existing runtime attribution will record the resolved binary's SHA-256 and version after successful preflight. No installation or dependency change is proposed. The repair has static validation only; a later CI run must establish its outcome.

The exact four files, all 63 literal case names, immutable source pin and 120-second/3-second termination limits remain unchanged. Child output remains capped at 256 KiB stdout and 64 KiB stderr. No source/test/seal edit, private corpus, real QMD/model, browser, database, provider or hosted/MCP acceptance occurred.

The [macOS receipt](local-reader-checks.md) remains 62 passes and one `ps` EPERM failure; this zero-case Ubuntu attempt does not replace that history. [Machine receipt](local-reader-ci-attempt1.json) retains the actual controller report.
