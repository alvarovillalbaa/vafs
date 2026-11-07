# Official Inspector CLI interoperability — passed

[Run 42355602463](https://github.com/alvarovillalbaa/vafs/actions/runs/42355602463),
job `128352907526`, passed on 7 November 2026, 08:28:05–08:28:35 UTC.
One new Tier 2 identity, **I01: official Inspector legacy stdio discovery and
retrieval preserve eligible UTF-8 provenance**, passed without retries.
The earlier 34 MCP and 63 reader checks were not rerun or counted here.

Tested source: `229803f1d8bd46b2217b21b01af7800d460d65fc`, tree
`191e66e5f526f217f839403be2eb98e06f4cd1c5`. Activation:
`0f5d97db2c8f0f0c2df6059901af71d4601f3554`, QA branch
`qa/vafs-inspector-20261107-1`. Main remained outside this check.

The unique emitted [original JSON receipt](local-inspector-client-attempt-1.json)
was saved before interpreting the result, with its final newline: **853,964 bytes**,
SHA-256 `e64f55b04b0b8048d9998cf22bc0e3d5f001899b80169faa2f7cdefeb3fe1abb`.
Without that newline: 853,963 bytes,
SHA-256 `4431eff9aaeba29671d0a8d422631a162171aa0db9a213aedd852e61796eb732`.

Independent decoding verified all **88 retained gzip captures**: 76 outer command
streams, ten inner CLI streams and two tool-state records; 1,375,012 total decoded
capture bytes / 398,906 gzip bytes. Every recorded byte count and digest matched.
The original inner report deep-equals the embedded result; all five CLI stdout
JSON records independently match the parsed initialization/tool observations.
Each CLI stderr retains the same 224-byte memory-only secret-store notice.

Actual runtime was Ubuntu x64, Node **26.13.0**, npm **11.20.0**, ripgrep **14.1.0**
and official Inspector **2.14.0**. Both npm commands explicitly disabled lifecycle
scripts; the generated lock was then used unchanged by `npm ci`.
The retained 79,457-byte lock has SHA-256
`ddd64415900eb38e2cc12e3cad361aede7bb3f2b3fc2453212e66806f9f2237d`
and the reviewed exact Inspector archive URL/SRI. The resolved dependency tree
is retained separately (33,797 bytes). Apt setup succeeded in separate Actions
step logs; those logs are not controller-captured command streams.

The five **separate connect/disconnect sessions** performed legacy initialize,
tools/list, index, literal search and exact page read. Initialization reported
`vafs-local` / `0.1.0`, protocol `2025-11-25`, and exactly the three read-only tools.
Index returned two eligible files / 252 bytes without body text. Search returned
only `knowledge/reader.md`: its 210-byte authored UTF-8 page matched SHA-256
`e9129527d478ee6c645c010faaa705f087b224ffadd1dabfac08e578ef0c235a`.
The 18-byte literal matched byte range **[172, 190)**, line 9; exact get bytes
matched the fixture. Raw intake was absent and the QMD leg reported disabled.

All five full native guards agreed on **963 source blobs / 7,573,429 bytes**,
vector SHA-256 `0ad2724b25e28a6dad8fe1835edba8e05afb6601be02e44c0621c2f3a6a6c03a`.
Their HEAD/index/working modes and blobs match the immutable source tree:
958 baseline blobs unchanged plus exactly five new preparation paths.
Seven owner-only exported runtime modules total 48,972 bytes and match source;
the driver was copied byte-exact at its reviewed `f9672bd0…` SHA-256.

All 38 outer children and five inner CLI children exited zero with complete EOF,
reaping, close and original process-group absence. Eleven distinct attributed
PID/starttime identities were observed across the two inventories; remaining,
uncertain and harness signal counts were zero. Authored fixtures stayed unchanged
and were removed; owned scratch cleanup passed. Setup took 14,496 ms before
controller entry; the recorded admission retained the 1,020-second work cap,
90-second cleanup reserve and 30-second job margin.

Only temporary workflow `410180782` was disabled; fresh API readback confirmed
`disabled_manually` at 08:29:56 UTC. No retry, source fix or branch retirement
was performed by this audit.

This proves configured Linux CLI interoperability against disposable authored
Markdown, not one persistent session or native-client registration. It does not
prove macOS process-inspection permission, private-corpus access, hosted identity,
QMD/models, GUI behavior or full vAFS acceptance. The npm archive SRI and pinned
source-documentation revision remain separate provenance claims.
