# Local MCP retrieval

Updated 13 November 2026. The separate 34-case protocol and 63-case reader
receipts are recorded in the [testing guide](testing.md). The first configured
[Inspector CLI journey](results/2026/11-07/local-inspector-client-attempt-1.md)
passed on authored files. The hosted API/MCP path is unchanged.

The owning architecture permits local CLI/MCP retrieval. Previously only the
CLI could use the actual file reader: `bin/vafs-mcp.mjs` exclusively forwarded
to the hosted API. A separate executable now serves that reader over stdio:

```sh
node bin/vafs-local-mcp.mjs --root /path/to/agents-fs
```

Use existing Node 22+ and `rg` on POSIX macOS/Linux. No application dependency,
package registration, daemon, HTTP listener, automatic index/model installation
or hosted account is needed. Source syntax is checked on Node 22.23.3; a runtime
or platform compatibility matrix is not established.

## Client configuration

This is an example for a client supporting stdio MCP. The accepted Inspector
check used generated configuration in disposable CI storage; it did not register
a native client. Replace both placeholder paths with explicitly selected paths:

```json
{
  "mcpServers": {
    "vafs-local": {
      "command": "node",
      "args": ["/path/to/vafs/bin/vafs-local-mcp.mjs", "--root", "/path/to/agents-fs"]
    }
  }
}
```

The operator authorizes access to the selected checkout by launching this local
process. This is not hosted OAuth, tenant isolation, a filesystem mount or an
agent sandbox. The client owns consent to disclose retrieved text to its model.
Treat returned file text and metadata as untrusted source material.

### Optional operator-configured QMD keyword candidates

For an already installed/configured QMD collection, start the same server with:

```sh
node bin/vafs-local-mcp.mjs --root /path/to/agents-fs --qmd-collection personal
```

Add the last two arguments to a client's explicit stdio configuration to use
this profile. The collection identifier is validated and captured at startup;
messages cannot change it. External QMD configuration remains operator-owned,
not an immutable index snapshot. The server calls the existing bounded
`qmd search` reader path, never collection creation, embedding or reranking.
It installs no tool/model and builds no index automatically. Missing/failed QMD
returns a finite tool error; it does not fabricate a ranking or switch providers.

QMD contributes candidates only. Each is revalidated against current eligible
files under the pinned root; raw intake and foreign paths remain excluded.
Returned metadata/text hashes come from current files while ranking can remain
stale. Configured discovery reports this explicitly. Default startup remains
QMD-disabled with the original discovery text and tool argument schema. The
[eight-profile/one-real-journey packet](proposals/local-mcp-qmd-checks.md) is
prepared and unrun; CLI Q01 and Inspector I01 are separate old evidence.

## Read-only tool contract

| Tool | Arguments | Result |
| --- | --- | --- |
| `vafs_local_index` | Empty object | Existing metadata-only `vafs-local-index-v1` envelope. |
| `vafs_local_search` | `query`, optional integer `limit` from 1 to 100 | Existing `vafs-local-search-v1` envelope with metadata/real-rg legs and current hashes/matches. |
| `vafs_local_get_page` | Relative `path` | Existing `vafs-local-page-v1` envelope with exact current decoded text. |

Arguments cannot choose another root, include raw intake, choose QMD, export a
file or invoke hosted tools. QMD is disabled unless the operator chooses its
startup collection; no vector/model retrieval is provided by this option.
New actual MCP/QMD acceptance is pending. The existing reader owns eligibility, ignore
rules, descendant symlink checks, strict UTF-8, hashing and corpus/file budgets.
See [local retrieval](local-retrieval.md) for those limits and provenance.

Startup resolves the selected root once. Each tool checks its canonical path's
directory/device/inode before and after using the existing reader. Retargeting the original
alias does not redirect the session; replacing the pinned directory fails. This
retains the operator-trusted concurrent-filesystem boundary, not an atomic
snapshot or protection against arbitrary hostile ancestor replacement.

## Protocol and resource boundaries

The separate entrypoint implements MCP's [modern per-request metadata](https://modelcontextprotocol.io/specification/2026-07-28/basic/versioning)
profile `2026-07-28`: discovery, ping, tools/list and tools/call. Required version
and capabilities appear in each request's namespaced `_meta` fields. Results
declare `resultType:complete`; discovery reports versions/capabilities/server
identity. Unsupported versions return the specified `-32022` error.

It also supports the [legacy initialization lifecycle](https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle)
for `2025-11-25`, followed by `notifications/initialized`. Legacy state never
supplies missing metadata for a modern request. No resources, prompts, sampling,
elicitation, subscriptions, tasks or client-root discovery are advertised.

[Stdio framing](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/stdio)
uses strict UTF-8 newline-delimited JSON, with no logs on stdout. Input frames
are bounded to 64 KiB; complete responses to 8 MiB. Oversized output becomes a
finite error rather than a truncated page/index. Invalid JSON/UTF-8 receives a
parse error; an oversized frame terminates the transport after a finite error.

One file operation runs at a time; additional calls return busy. The transport
bounds outstanding handlers/writes to four and each write to five seconds.
Retrieval has a thirty-second response deadline; busy remains fenced until
actual I/O settles. These bounds do not preempt blocking operating-system I/O.
[Cancellation](https://modelcontextprotocol.io/specification/2026-07-28/basic/patterns/cancellation)
aborts the owned operation and suppresses its late response. EOF and termination
close the server, abort active retrieval and clean the entrypoint's signal
listeners. Clients should finish reading acknowledged responses before closing
stdin. Uncertain or interrupted operations are not successful acceptance.

## Evidence and remaining delivery

The [protocol proposal](proposals/local-mcp-checks.md) and the separate accepted
34-case MCP / 63-case reader receipts retain their original sources and limits.
The [Inspector result](results/2026/11-07/local-inspector-client-attempt-1.md)
adds I01: five actual Inspector 2.14.0 connect/disconnect sessions on Linux,
covering legacy initialize, discovery, index, literal search and exact UTF-8 get.
Original outputs, package integrity, source guards and owned cleanup passed.
Neither old suite was rerun. This is configured CLI interoperability, not one
persistent session, native-client registration or full MCP conformance.

The separate [CLI QMD keyword journey](results/2026/11-07/local-qmd-keyword-attempt-1.md)
passed on authored files. The optional MCP startup profile reuses that reader;
its separate execution is pending and does not repeat I01 or Q01. Hosted Auth,
persistent services, API/integration activation, QMD model
retrieval, native clients, distribution and the wider vAFS architecture remain
unfinished. No
provider, model, schema, dependency, hosted configuration or paid action is
introduced by this local interface.
