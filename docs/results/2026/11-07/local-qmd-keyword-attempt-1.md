# First real QMD keyword journey — passed

[Run 42360057095](https://github.com/alvarovillalbaa/vafs/actions/runs/42360057095),
job `128366338940`, passed Q01 without retries. GitHub job metadata reports
7 November 2026, 09:31:02–09:32:02 UTC; the controller step ran 09:31:18–09:31:29.
Q01 is one authored Tier 2 integration identity with five real commands.
The accepted 34 MCP, 63 reader and Inspector I01 scopes were not rerun.

Tested source: `0a84a57b23c5f642d738e956d09d5d31a8029bd9`, tree
`9dbf3d8920e543f76d9719ab572e62a8cec5aa4f`; activation
`56655ad44f295e82ff09f7dac45c41810fedc9f7` on `qa/vafs-qmd-keyword-20261107-1`.
The [original emitted JSON](local-qmd-keyword-attempt-1.json) and
[full fetched job-log text](local-qmd-keyword-attempt-1.log) were saved before parsing.
JSON: **884,641 bytes**, SHA-256
`c6020b402c586cb91c7c2336b69b40e8400dc8834560a66714b7b440ed18e6b8`.
Log: **910,195 bytes**, SHA-256
`1d5a1e55e95a737287c1b5bdef35a4214b2c6476abbddc21c71541e9aa64221b`.
The unique log marker reproduces the JSON plus its original newline exactly.

Independent audits verified **90 original gzip captures**: 78 outer command
streams, ten inner streams and two tool-state records; 1,419,373 decoded capture
bytes / 406,091 gzip bytes. Counts, canonical base64 and hashes match throughout.
The 30,982-byte original driver report deep-equals the stored result; the four
JSON command outputs match their original bytes. Collection-add output and the
168-byte producer warning about the deleted file remain preserved.

Actual Linux x64 / Node 26.13.0 installed four exact required tool roots with
scripts disabled and optional dependencies omitted. The unchanged 82,512-byte
lock has SHA-256 `98697aea8ca592674d254ca791b355a27549388451e1d2a7ba9c9366294e98a7`.
All lock entries use verified registry-only URLs and valid integrity fields;
the five selected archive pins match the separate
[metadata inspection](qmd-package-metadata-attempt-1.md). The actual dependency
tree matches its original `npm ls` output. Each selected package has exactly
one physical root lock entry: QMD 2.8.3, better-sqlite3 13.0.3, sqlite-vec 0.1.9,
node-llama-cpp 3.20.0 and sqlite-vec-linux-x64 0.1.9. QMD references those versions;
no nested selected copy or installed optional llama platform package was found.

Before Q01, a real in-memory database loaded the vector extension, returned
SQLite **3.53.4** / vec **v0.1.9**, and closed. Observed native files were:
SQLite `prebuilds/linux-x64.node`, 2,226,168 bytes, SHA-256
`6fd4292c6c5f352436cd85c9e1cb286978efa43c20ae350973f83414ced9991d`;
vec `vec0.so`, 159,816 bytes, SHA-256
`5923730861b86c707cca5602b5f91092f9e52a46706dbc6e269fd4bb9c4498e8`.
These are child-observed ELF/hash/load results, not retained binary bodies.

Collection-add, direct keyword search and vAFS search ran against six authored
files, followed by an intentional same-inode edit and deletion, then both searches
again. Eligible metadata changed from four files / 629 bytes to three / 466 bytes;
ranked results changed from three to two. The edited page remained a stale QMD candidate
but returned its current title/description/hash and 195-byte content provenance,
with `qmd` mode only and no current literal match. Current UTF-8 matches use byte
range [157, 181), line 9. Raw and foreign candidates never became eligible results.
Observed live paths were `./` cwd-relative; the absolute-path branch is unclaimed.
The removed candidate became the exact `qmd://` fallback and was rejected as an
unsupported identifier; the missing-filesystem branch was **not** covered.
Live producer IDs were absent; the later fallback ID establishes no ID continuity.

Five full guards agreed on **975 blobs / 8,626,838 bytes**, vector SHA-256
`5187873ee9e016033c9b768e26c15ca4758c04d3947870664648e46d0f9cc00e`.
All path/mode/blob/size rows match the immutable source tree; 970 prior blobs
remain unchanged, with one reviewed README change and four additions. Seven
owner-only exported modules total 45,442 bytes. Source-body SHA-256 values are
controller observations, not a separate download/rehash of all 8.6 MB.

All 39 outer children and five inner command children exited zero with complete
EOF/reaping/close/group absence. Thirteen distinct attributed PID/starttime
observations came from sampled owned-root inventories, not a total process count.
No harness signals, uncertain ownership or remaining attributed processes
were reported. Fixture and scratch removal passed. Eleven logical-size samples
observed at most 289,466,215 bytes, not a quota or complete peak measurement.
Four owned model-cache samples were absent; this is not network attestation.
Only workflow `410213630` was disabled, freshly confirmed at 09:32:53 UTC.
No embedding, semantic query, reranking, model, private-corpus, hosted, GUI,
concurrency or fresh-ranking quality proof is claimed. No retry or source fix occurred.
