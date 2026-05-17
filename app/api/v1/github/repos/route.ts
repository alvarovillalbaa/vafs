import { fail, ok, readJson, requireScope } from "@/lib/vafs/api"
import { createAgentsFsRepo, discoverAgentsFsRepos } from "@/lib/vafs/services"
import type { RepoConnection } from "@/lib/vafs/types"

export const dynamic = "force-dynamic"

type CreateRepoBody = {
  owner?: string
  kind?: RepoConnection["kind"]
  workspaceId?: string
}

export async function GET(request: Request) {
  const scope = requireScope(request, "vafs.admin.sources")
  if (!scope.ok) return scope.response

  return ok(discoverAgentsFsRepos())
}

export async function POST(request: Request) {
  const scope = requireScope(request, "vafs.admin.sources")
  if (!scope.ok) return scope.response

  const body = await readJson<CreateRepoBody>(request)
  if (!body.owner || !body.kind || !body.workspaceId) {
    return fail("bad_request", "owner, kind, and workspaceId are required")
  }

  return ok(
    createAgentsFsRepo({
      owner: body.owner,
      kind: body.kind,
      workspaceId: body.workspaceId,
    })
  )
}
