# Local MCP retrieval

30 October 2026. Additive source implementation; functional checks are authored
and unrun pending their separate approval. The hosted API/MCP path is unchanged.

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

This is an example for a client supporting stdio MCP; it has not been installed
in any client. Replace both placeholder paths with explicitly selected paths:

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

## Read-only tool contract

| Tool | Arguments | Result |
| --- | --- | --- |
| `vafs_local_index` | Empty object | Existing metadata-only `vafs-local-index-v1` envelope. |
| `vafs_local_search` | `query`, optional integer `limit` from 1 to 100 | Existing `vafs-local-search-v1` envelope with metadata/real-rg legs and current hashes/matches. |
| `vafs_local_get_page` | Relative `path` | Existing `vafs-local-page-v1` envelope with exact current decoded text. |

Arguments cannot choose another root, include raw intake, choose QMD, export a
file or invoke hosted tools. QMD is disabled; this profile does not claim vector
retrieval or live QMD acceptance. The unchanged reader owns eligibility, ignore
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

The [focused proposal](proposals/local-mcp-checks.md) owns the new protocol,
reader-integration and stdio scope. Source parsing, import/JSON/link/whitespace
checks and independent inspection do not establish a working client session.
The earlier 63-case local reader proposal remains separately pinned and unrun;
no other project's approval is reused.

Hosted Auth, persistent services, API/integration activation, real QMD, native
clients, distribution and the wider vAFS architecture remain unfinished. No
provider, model, schema, dependency, hosted configuration or paid action is
introduced by this local interface.
