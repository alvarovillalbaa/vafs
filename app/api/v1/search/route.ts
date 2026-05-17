import { getRequestedWorkspace, ok, readJson, requireScope } from "@/lib/vafs/api"
import { searchWorkspace } from "@/lib/vafs/services"

export const dynamic = "force-dynamic"

type SearchBody = {
  query?: string
  workspaceId?: string
  includeRaw?: boolean
}

export async function GET(request: Request) {
  const scope = requireScope(request, "vafs.search")
  if (!scope.ok) return scope.response

  const url = new URL(request.url)
  const query = url.searchParams.get("q") ?? ""

  return ok(
    searchWorkspace({
      query,
      workspaceId: getRequestedWorkspace(request),
      includeRaw: url.searchParams.get("includeRaw") !== "false",
    }),
    { retrieval: "metadata+bm25+s3_vectors+rerank; local_rg via CLI/MCP only" }
  )
}

export async function POST(request: Request) {
  const scope = requireScope(request, "vafs.search")
  if (!scope.ok) return scope.response

  const body = await readJson<SearchBody>(request)

  return ok(
    searchWorkspace({
      query: body.query ?? "",
      workspaceId: body.workspaceId ?? getRequestedWorkspace(request),
      includeRaw: body.includeRaw ?? true,
    }),
    { retrieval: "metadata+bm25+s3_vectors+rerank; local_rg via CLI/MCP only" }
  )
}
