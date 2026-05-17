import { fail, getRequestedWorkspace, ok, readJson, requireScope } from "@/lib/vafs/api"
import { triggerSync } from "@/lib/vafs/services"
import type { SyncJob } from "@/lib/vafs/types"

export const dynamic = "force-dynamic"

type SyncBody = {
  workspaceId?: string
  trigger?: SyncJob["trigger"]
}

export async function POST(request: Request) {
  const scope = requireScope(request, "vafs.sync.trigger")
  if (!scope.ok) return scope.response

  const body = await readJson<SyncBody>(request)
  const workspaceId = body.workspaceId ?? getRequestedWorkspace(request)

  if (!workspaceId) return fail("bad_request", "workspaceId is required")

  try {
    return ok(triggerSync({ workspaceId, trigger: body.trigger ?? "manual" }))
  } catch (error) {
    return fail(
      "sync_failed",
      error instanceof Error ? error.message : "Unable to trigger sync",
      500
    )
  }
}
