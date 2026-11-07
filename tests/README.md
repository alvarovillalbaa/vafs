# Focused local-client integration contract

I01 [passed its first invocation](../docs/results/2026/11-07/local-inspector-client-attempt-1.md)
at source `229803f1d8bd46b2217b21b01af7800d460d65fc`. Do not repeat this closed
scope without changed inputs or a concrete concern.

`integration/local-inspector-client.mjs` declares **tier2 / integration**.
Its disposable authored Markdown is a fixture for a private corpus; the actual
Inspector CLI, vAFS stdio server, filesystem and reader are used without mocks.
No production, staging, private data, account, model or QMD resource is allowed.

Invoke only through the explicitly scoped CI runner in
`scripts/run-local-inspector-checks.mjs`, following the
[proposal](../docs/proposals/local-inspector-client-checks.md). The operational
runner is support code, not a default-suite collector. Package scripts and the
existing 34 MCP / 63 reader scopes remain unchanged and are not rerun.

I01 contains five sequential connect/disconnect operations and has no retries.
Original partial/error outputs, exact source bindings and verified teardown
are required. Source preparation, native-client registration and a passing
configured CLI session remain separate claims.
