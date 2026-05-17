import { ok } from "@/lib/vafs/api"
import { getFile, getHealth, searchWorkspace, startCleanupRun, triggerSync } from "@/lib/vafs/services"

export const dynamic = "force-dynamic"

const tools = [
  {
    name: "vafs_list_workspaces",
    description: "List VAFS workspaces available to the current principal.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "vafs_search",
    description: "Hybrid search over AFS canonical knowledge, raw sources, and metadata.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string" },
        workspaceId: { type: "string" },
      },
      required: ["query"],
    },
  },
  {
    name: "vafs_get_page",
    description: "Read one AFS page by workspace and path.",
    inputSchema: {
      type: "object",
      properties: {
        workspaceId: { type: "string" },
        path: { type: "string" },
      },
      required: ["workspaceId", "path"],
    },
  },
  {
    name: "vafs_trigger_sync",
    description: "Queue a sync/index job for a workspace.",
    inputSchema: {
      type: "object",
      properties: {
        workspaceId: { type: "string" },
      },
      required: ["workspaceId"],
    },
  },
  {
    name: "vafs_cleanup",
    description: "Queue a branch-and-PR cleanup run.",
    inputSchema: {
      type: "object",
      properties: {
        workspaceId: { type: "string" },
        objective: { type: "string" },
      },
      required: ["workspaceId"],
    },
  },
  {
    name: "vafs_health",
    description: "Return VAFS service health.",
    inputSchema: { type: "object", properties: {} },
  },
]

type JsonRpcRequest = {
  id?: string | number
  method?: string
  params?: {
    name?: string
    arguments?: Record<string, unknown>
  }
}

function rpc(id: JsonRpcRequest["id"], result: unknown) {
  return Response.json({ jsonrpc: "2.0", id: id ?? null, result })
}

export async function GET() {
  return ok({
    name: "vafs-mcp",
    protocol: "2024-11-05",
    tools,
  })
}

export async function POST(request: Request) {
  const body = (await request.json()) as JsonRpcRequest

  if (body.method === "initialize") {
    return rpc(body.id, {
      protocolVersion: "2024-11-05",
      serverInfo: { name: "vafs", version: "0.1.0" },
      capabilities: { tools: {} },
    })
  }

  if (body.method === "tools/list") {
    return rpc(body.id, { tools })
  }

  if (body.method === "tools/call") {
    const args = body.params?.arguments ?? {}
    const name = body.params?.name

    if (name === "vafs_search") {
      return rpc(body.id, {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              searchWorkspace({
                query: String(args.query ?? ""),
                workspaceId: args.workspaceId
                  ? String(args.workspaceId)
                  : undefined,
              }),
              null,
              2
            ),
          },
        ],
      })
    }

    if (name === "vafs_get_page") {
      return rpc(body.id, {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              getFile({
                workspaceId: String(args.workspaceId),
                path: String(args.path),
              }) ?? null,
              null,
              2
            ),
          },
        ],
      })
    }

    if (name === "vafs_trigger_sync") {
      return rpc(body.id, {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              triggerSync({ workspaceId: String(args.workspaceId) }),
              null,
              2
            ),
          },
        ],
      })
    }

    if (name === "vafs_cleanup") {
      return rpc(body.id, {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              startCleanupRun({
                workspaceId: String(args.workspaceId),
                objective: args.objective ? String(args.objective) : undefined,
              }),
              null,
              2
            ),
          },
        ],
      })
    }

    if (name === "vafs_health") {
      return rpc(body.id, {
        content: [{ type: "text", text: JSON.stringify(getHealth(), null, 2) }],
      })
    }
  }

  return Response.json(
    {
      jsonrpc: "2.0",
      id: body.id ?? null,
      error: { code: -32601, message: "Method not found" },
    },
    { status: 404 }
  )
}
