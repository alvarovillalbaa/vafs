# Focused local-client integration contract

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
