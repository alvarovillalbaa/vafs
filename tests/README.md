# Focused local-client integration contract

I01 [passed its first invocation](../docs/results/2026/11-07/local-inspector-client-attempt-1.md)
at source `229803f1d8bd46b2217b21b01af7800d460d65fc`. Do not repeat this closed
scope without changed inputs or a concrete concern.

`integration/local-inspector-client.mjs` declares **tier2 / integration**.
Its disposable authored Markdown is a fixture for a private corpus; the actual
Inspector CLI, vAFS stdio server, filesystem and reader are used without mocks.
I01 allows no production, staging, private data, account, model or QMD resource.

Invoke I01 only through the explicitly scoped CI runner in
`scripts/run-local-inspector-checks.mjs`, following the
[proposal](../docs/proposals/local-inspector-client-checks.md). The operational
runner is support code, not a default-suite collector. Package scripts and the
existing 34 MCP / 63 reader scopes remain unchanged and are not rerun.

I01 contains five sequential connect/disconnect operations and has no retries.
Original partial/error outputs, exact source bindings and verified teardown
are required. Source preparation, native-client registration and a passing
configured CLI session remain separate claims.

## QMD keyword candidate

Q01 [passed its first invocation](../docs/results/2026/11-07/local-qmd-keyword-attempt-1.md)
at source `0a84a57b23c5f642d738e956d09d5d31a8029bd9`.
`integration/local-qmd-keyword.mjs` declares **tier2 /
integration** and uses six authored disposable Markdown files with the actual
QMD collection/FTS engine, vAFS CLI and filesystem. Its
[proposal](../docs/proposals/local-qmd-keyword-checks.md) defines one journey
with direct producer controls before and after intentional file changes.
Current-byte provenance and candidate filtering are the acceptance boundary.
No own services are mocked. No private data, embeddings, reranking, models,
accounts, hosted APIs, Inspector or browser resources belong to this scope.

The separate [published-package inspection](../docs/proposals/qmd-package-metadata.md)
is operational preparation, not a test case or native-binding proof. Its
`scripts/inspect-qmd-package-metadata.py` reads exact registry JSON only and
does not install or execute package contents. Q01 separately passed published
package provenance, an isolated frozen tool lock and actual SQLite/vector
admission before its five commands. This does not accept models, private files
or hosted behavior. Do not repeat the closed journey without changed inputs or
a concrete concern. Existing suites stay closed.
