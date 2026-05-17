import { fail, getRequestedWorkspace, ok, readJson, requireScope } from "@/lib/vafs/api"
import { listCleanupRuns, startCleanupRun } from "@/lib/vafs/services"

export const dynamic = "force-dynamic"

type CleanupBody = {
  workspaceId?: string
  objective?: string
  sourcePaths?: string[]
}

export async function GET(request: Request) {
  const scope = requireScope(request, "vafs.read.pages")
  if (!scope.ok) return scope.response

  return ok(listCleanupRuns(getRequestedWorkspace(request)))
}

export async function POST(request: Request) {
  const scope = requireScope(request, "vafs.write.knowledge")
  if (!scope.ok) return scope.response

  const body = await readJson<CleanupBody>(request)
  const workspaceId = body.workspaceId ?? getRequestedWorkspace(request)

  if (!workspaceId) return fail("bad_request", "workspaceId is required")

  return ok(
    startCleanupRun({
      workspaceId,
      objective: body.objective,
      sourcePaths: body.sourcePaths,
    })
  )
}
