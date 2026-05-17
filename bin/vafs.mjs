#!/usr/bin/env node

const DEFAULT_API_URL = "http://127.0.0.1:3000"

function usage() {
  console.log(`vafs

Usage:
  vafs health
  vafs workspaces
  vafs search <query> [--workspace <id>]
  vafs get <workspaceId> <path>
  vafs raw upload <workspaceId> <filename> <content>
  vafs sync <workspaceId>
  vafs cleanup <workspaceId> [objective]

Environment:
  VAFS_API_URL      Defaults to ${DEFAULT_API_URL}
  VAFS_TOKEN        Optional bearer token
`)
}

function getFlag(args, name) {
  const index = args.indexOf(name)
  if (index === -1) return undefined
  return args[index + 1]
}

async function request(path, options = {}) {
  const apiUrl = process.env.VAFS_API_URL ?? DEFAULT_API_URL
  const headers = {
    accept: "application/json",
    ...(options.body ? { "content-type": "application/json" } : {}),
    ...(process.env.VAFS_TOKEN
      ? { authorization: `Bearer ${process.env.VAFS_TOKEN}` }
      : {}),
    ...(options.headers ?? {}),
  }

  const response = await fetch(`${apiUrl}${path}`, { ...options, headers })
  const text = await response.text()
  let payload

  try {
    payload = JSON.parse(text)
  } catch {
    payload = text
  }

  if (!response.ok) {
    console.error(JSON.stringify(payload, null, 2))
    process.exit(1)
  }

  console.log(JSON.stringify(payload, null, 2))
}

const args = process.argv.slice(2)
const [command, subcommand, ...rest] = args

if (!command || command === "help" || command === "--help") {
  usage()
  process.exit(0)
}

if (command === "health") {
  await request("/api/v1/health")
} else if (command === "workspaces") {
  await request("/api/v1/workspaces")
} else if (command === "search") {
  const workspaceId = getFlag(args, "--workspace")
  const query = rest.filter((item) => item !== "--workspace" && item !== workspaceId).join(" ")
  const params = new URLSearchParams({ q: query })
  if (workspaceId) params.set("workspaceId", workspaceId)
  await request(`/api/v1/search?${params.toString()}`)
} else if (command === "get") {
  const [workspaceId, ...pathParts] = args.slice(1)
  const path = pathParts.join(" ")
  const params = new URLSearchParams({ workspaceId, path })
  await request(`/api/v1/files?${params.toString()}`)
} else if (command === "raw" && subcommand === "upload") {
  const [workspaceId, filename, ...contentParts] = rest
  await request("/api/v1/raw", {
    method: "POST",
    body: JSON.stringify({
      workspaceId,
      filename,
      content: contentParts.join(" "),
    }),
  })
} else if (command === "sync") {
  await request("/api/v1/sync", {
    method: "POST",
    body: JSON.stringify({ workspaceId: subcommand }),
  })
} else if (command === "cleanup") {
  await request("/api/v1/cleanup-runs", {
    method: "POST",
    body: JSON.stringify({
      workspaceId: subcommand,
      objective: rest.join(" ") || undefined,
    }),
  })
} else {
  usage()
  process.exit(1)
}
