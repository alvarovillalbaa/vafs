#!/usr/bin/env node

import { access, readdir, readFile } from "node:fs/promises"
import { join } from "node:path"

const root = process.cwd()

const requiredPaths = [
  "lib/vafs/afs-contract.ts",
  "lib/vafs/services.ts",
  "app/api/v1/search/route.ts",
  "app/api/mcp/route.ts",
  "bin/vafs.mjs",
  "bin/vafs-mcp.mjs",
  "supabase/migrations/202605170001_initial_vafs.sql",
  "packages/skills/vafs-use/SKILL.md",
  "packages/skills/vafs-devs/SKILL.md",
]

const requiredApiFragments = [
  "/api/v1/search",
  "/api/v1/files",
  "/api/v1/raw",
  "/api/v1/sync",
  "/api/v1/cleanup-runs",
  "/api/v1/oauth/authorize",
  "/api/v1/oauth/token",
]

async function assertPath(path) {
  await access(join(root, path))
}

async function main() {
  await Promise.all(requiredPaths.map(assertPath))

  const readme = await readFile(join(root, "README.md"), "utf8")
  for (const fragment of requiredApiFragments) {
    if (!readme.includes(fragment)) {
      throw new Error(`README.md is missing API fragment ${fragment}`)
    }
  }

  const skillFiles = await readdir(join(root, "packages/skills"))
  for (const skillName of ["vafs-use", "vafs-devs"]) {
    if (!skillFiles.includes(skillName)) {
      throw new Error(`Missing skill package ${skillName}`)
    }
  }

  console.log("VAFS validation passed")
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
