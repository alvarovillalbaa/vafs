# Published QMD metadata — inspection completed

[Run 42358143244](https://github.com/alvarovillalbaa/vafs/actions/runs/42358143244),
job `128360623296`, succeeded on 7 November 2026, 09:04:24–09:04:29 UTC.
This is metadata preparation evidence; `providerAccepted` remains **false**.
No QMD execution, package installation or keyword journey occurred.

Tested preparation source: `4f4a4c56d1c037af79de933b9805af4888a3b7f4`, tree
`a936b35c74ce56e25518e7c10248a8fb57b4498d`. Activation:
`a407b106b1c59fdedc5dd61b68c3e6e2651480b8`, QA branch
`qa/vafs-qmd-metadata-20261107-1`.

The [full fetched job-log text](qmd-package-metadata-attempt-1.log) and unique
[emitted JSON](qmd-package-metadata-attempt-1.json) were saved before parsing.
The log is **42,305 bytes**, SHA-256
`3007e7c4b8e9673ede1a0d115b11e58fbba1b38e76409742a039518ae88d6146`;
the JSON plus its original final newline is **22,950 bytes**, SHA-256
`cba9c9f708d4dffd5db54decc83dfc4c3aef9da301197330dcafe660bb80b7cb`.
The unique log marker reproduces the JSON exactly. The log preserves the complete
decoded text returned by the GitHub log API, not a separately fetched log ZIP.

Independent decoding verified all five original HTTP-body gzip captures:
**18,407 body bytes / 8,406 gzip bytes**. Every canonical base64 value, observed
and retained byte count, SHA-256, declared Content-Length and complete EOF flag
matched. All five exact-version registry requests returned HTTP 200 JSON;
selected manifests independently match those original bodies.

| Package | Inspected version | Body bytes | Registry-declared unpacked bytes / files |
| --- | --- | ---: | ---: |
| `@tobilu/qmd` | `2.8.3` | 3,798 | 914,522 / 53 |
| `better-sqlite3` | `13.0.3` | 2,888 | 27,302,969 / 68 |
| `sqlite-vec` | `0.1.9` | 2,090 | 4,004 / 5 |
| `node-llama-cpp` | `3.20.0` | 7,726 | 38,502,605 / 929 |
| `sqlite-vec-linux-x64` | `0.1.9` | 1,905 | 160,160 / 3 |

Published QMD declares Node >=22 and dependencies `better-sqlite3: ^13.0.3`,
`sqlite-vec: 0.1.9`, `node-llama-cpp: 3.20.0`; 13.0.3 is a range anchor,
not a resolved installed dependency. QMD's registry-declared archive integrity is:
`sha512-zjfVwrObPB618B6x8SdhlGv/tX9OxRHsbQnr5DUtBvqPK6HGQ27lM+9/BAY5okpjrHVnW56hLyDkqoTcsrVLzA==`.
All five exact registry tarball URLs, SHA-512 SRI values and SHA-1 metadata are
retained and validated as metadata. No tarball was downloaded or independently
hashed, and declared unpacked sizes do not inventory actual archive contents.

The published better-sqlite3 manifest has `gypfile: false` and no install script.
The published node-llama-cpp manifest contains the transformed postinstall
`node ./dist/cli/cli.js postinstall` and fourteen optional platform/GPU packages.
The sqlite-vec manifest declares the exact Linux x64 package, whose manifest
specifies Linux/x64. Script strings alone do not prove skip-control behavior,
prebuilt binding availability or the absence of native payloads in main archives.

Workflow HEAD/clean checks passed before and after inspection; both printed
script hashes equal `5a61bf8dfe6253d16929302e947e261f94c104c4a98d10266ca7e9755f4d455d`.
Setup consumed 1.314 seconds; the script admitted its 180-second work cap inside
the five-minute job. Five response-close calls returned, with zero response
objects remaining and no cleanup failures. The script spawned no child process,
wrote no file and preserved HOME; no app/private corpus, model or binary was used.

Only workflow `410199744` was disabled. Fresh API readback confirmed
`disabled_manually` at 09:05:21 UTC. No retry, source fix, QA retirement or
application change was performed by this audit. Actual installation, native
SQLite/vector admission and the first Q01 journey remain unverified.
