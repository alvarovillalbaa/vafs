#!/usr/bin/env node

import readline from "node:readline"

const DEFAULT_API_URL = "http://127.0.0.1:3000"

const tools = [
  {
    name: "vafs_search",
    description: "Hybrid search over VAFS workspaces.",
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
    description: "Read an AFS page by workspace and path.",
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
    description: "Queue sync/index for a workspace.",
    inputSchema: {
      type: "object",
      properties: { workspaceId: { type: "string" } },
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
    description: "Return VAFS health.",
    inputSchema: { type: "object", properties: {} },
  },
]

function write(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`)
}

async function api(path, options = {}) {
  const apiUrl = process.env.VAFS_API_URL ?? DEFAULT_API_URL
  const headers = {
    accept: "application/json",
    ...(options.body ? { "content-type": "application/json" } : {}),
    ...(process.env.VAFS_TOKEN
      ? { authorization: `Bearer ${process.env.VAFS_TOKEN}` }
      : {}),
  }
  const response = await fetch(`${apiUrl}${path}`, { ...options, headers })
  const text = await response.text()
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

async function callTool(name, args) {
  if (name === "vafs_health") {
    return api("/api/v1/health")
  }

  if (name === "vafs_search") {
    return api("/api/v1/search", {
      method: "POST",
      body: JSON.stringify(args),
    })
  }

  if (name === "vafs_get_page") {
    const params = new URLSearchParams({
      workspaceId: String(args.workspaceId ?? ""),
      path: String(args.path ?? ""),
    })
    return api(`/api/v1/files?${params.toString()}`)
  }

  if (name === "vafs_trigger_sync") {
    return api("/api/v1/sync", {
      method: "POST",
      body: JSON.stringify(args),
    })
  }

  if (name === "vafs_cleanup") {
    return api("/api/v1/cleanup-runs", {
      method: "POST",
      body: JSON.stringify(args),
    })
  }

  throw new Error(`Unknown tool: ${name}`)
}

const rl = readline.createInterface({ input: process.stdin })

rl.on("line", async (line) => {
  if (!line.trim()) return

  let request
  try {
    request = JSON.parse(line)
  } catch {
    write({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } })
    return
  }

  try {
    if (request.method === "initialize") {
      write({
        jsonrpc: "2.0",
        id: request.id,
        result: {
          protocolVersion: "2024-11-05",
          serverInfo: { name: "vafs", version: "0.1.0" },
          capabilities: { tools: {} },
        },
      })
      return
    }

    if (request.method === "tools/list") {
      write({ jsonrpc: "2.0", id: request.id, result: { tools } })
      return
    }

    if (request.method === "tools/call") {
      const result = await callTool(
        request.params?.name,
        request.params?.arguments ?? {}
      )
      write({
        jsonrpc: "2.0",
        id: request.id,
        result: {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        },
      })
      return
    }

    write({
      jsonrpc: "2.0",
      id: request.id,
      error: { code: -32601, message: "Method not found" },
    })
  } catch (error) {
    write({
      jsonrpc: "2.0",
      id: request.id,
      error: {
        code: -32000,
        message: error instanceof Error ? error.message : "Tool failed",
      },
    })
  }
})
