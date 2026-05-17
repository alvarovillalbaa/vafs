import { fail, getRequestedWorkspace, ok, readJson, requireScope } from "@/lib/vafs/api"
import { uploadRaw } from "@/lib/vafs/services"

export const dynamic = "force-dynamic"

type UploadRawBody = {
  workspaceId?: string
  filename?: string
  content?: string
}

export async function POST(request: Request) {
  const scope = requireScope(request, "vafs.write.raw")
  if (!scope.ok) return scope.response

  const body = await readJson<UploadRawBody>(request)
  const workspaceId = body.workspaceId ?? getRequestedWorkspace(request)

  if (!workspaceId || !body.filename || !body.content) {
    return fail("bad_request", "workspaceId, filename, and content are required")
  }

  return ok(uploadRaw({ workspaceId, filename: body.filename, content: body.content }))
}
