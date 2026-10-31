# Local reader CI attempt 2 — PATH preflight failure

The [single run at the resolver-repair head](https://github.com/alvarovillalbaa/vafs/actions/runs/41241021475) failed before tests: **0 of 63 cases ran**. No test or Linux descendant-cleanup verdict follows from this attempt.

- Source: [d6888b7ab92cc17630858831879453402397b91e](https://github.com/alvarovillalbaa/vafs/tree/d6888b7ab92cc17630858831879453402397b91e), tree `bc30cc80f47537a8fb820a744fe0c1b2ea7b7a89`; 11 sealed inputs.
- Workflow commit `5667b85e509cd62cd62eac0b6c975ed903a9eff0`, SHA-256 `0b2249e1d2536d0373ae5160b5c7c471c5c9d37a1edafab54bc20f3396580c1c`.
- Run `41241021475`, attempt 1, push/main; 2026-10-31T20:53:46Z–20:54:02Z. [Job `124654756817`](https://github.com/alvarovillalbaa/vafs/actions/runs/41241021475/job/124654756817) exited 1 after successful checkout/setup-node.

At 20:53:59.3853834Z the controller reported only `rg_missing`. Unlike [attempt 1](local-reader-ci-attempt1.md), this resolver inspected nonempty absolute current-PATH directories, rejecting CR/LF/NUL paths and requiring a resolved regular executable. No usable rg was found through that supported lookup. This was not a filesystem-wide scan.

Setup-node logged `v26.13.0`; the runtime-attribution object was never assigned, so Node/RG binary hashes and an RG version remain unrecorded. The child never spawned. Source guards, TAP cases/plans/totals, fixture allocation and the Linux `/proc` owned-descendant check did not run. Child stdout/stderr were empty, each SHA-256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`. Cleanup reported `processesStopped=true`, `forced=false`, `ownedTmpRemoved=false`: no owned temporary directory existed. No retry or signal occurred.

The next scoped workflow packet provides Ubuntu's signed [`ripgrep=14.1.0-1` package](https://packages.ubuntu.com/noble/ripgrep) using `apt-get update` and `apt-get install --yes --no-install-recommends`, bounded to three minutes, followed by an exact package-version check. It uses no insecure repository flags. This is ephemeral runner test tooling; no local installation or application dependency/model install is involved.

The proposed Ubuntu Node26.13.0/RG14.1.0 profile is distinct from the historical macOS Node26.8.2/RG15.2.0 profile. The existing controller must record actual Node/RG versions and binary SHA-256 values on successful preflight. Those future values and any test pass remain unverified here. The controller's proof-limit wording now allows runner Node/RG tooling while excluding application dependency/model installs; the [machine receipt](local-reader-ci-attempt2.json) preserves this attempt's original report unchanged.

The immutable source, 11 source/test inputs, 63 literal cases/four files, restricted child environment and 120-second/3-second termination limits remain fixed. Child capture limits stay 256 KiB stdout/64 KiB stderr. The [macOS 62-pass/one-`ps`-EPERM result](local-reader-checks.md) and first zero-case Ubuntu attempt remain historical evidence. This repair received static validation only; no tests, workflow run, publication, browser, database, model, private corpus, real QMD or hosted/MCP acceptance occurred while preparing it.
