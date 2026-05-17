import { fail, getRequestedWorkspace, ok, readJson, requireScope } from "@/lib/vafs/api"
import { getFile, proposeFileWrite } from "@/lib/vafs/services"
import type { AfsFileRecord } from "@/lib/vafs/types"

export const dynamic = "force-dynamic"

type PutBody = {
  workspaceId?: string
  path?: string
  content?: string
  section?: AfsFileRecord["section"]
}

export async function GET(request: Request) {
  const scope = requireScope(request, "vafs.read.pages")
  if (!scope.ok) return scope.response

  const url = new URL(request.url)
  const path = url.searchParams.get("path")
  const workspaceId = getRequestedWorkspace(request)

  if (!workspaceId || !path) {
    return fail("bad_request", "workspaceId and path are required")
  }

  const file = getFile({ workspaceId, path })
  if (!file) return fail("not_found", "File not found", 404)

  return ok(file)
}

export async function PUT(request: Request) {
  const body = await readJson<PutBody>(request)
  const scopeName =
    body.section === "raw" ? "vafs.write.raw" : "vafs.write.knowledge"
  const scope = requireScope(request, scopeName)
  if (!scope.ok) return scope.response

  const workspaceId = body.workspaceId ?? getRequestedWorkspace(request)
  if (!workspaceId || !body.path || !body.content) {
    return fail("bad_request", "workspaceId, path, and content are required")
  }

  return ok(
    proposeFileWrite({
      workspaceId,
      path: body.path,
      content: body.content,
      section: body.section,
    })
  )
}
