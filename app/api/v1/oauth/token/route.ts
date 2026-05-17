import { fail, ok, readJson } from "@/lib/vafs/api"

export const dynamic = "force-dynamic"

type TokenBody = {
  grant_type?: string
  code?: string
  client_id?: string
  refresh_token?: string
}

export async function POST(request: Request) {
  const body = await readJson<TokenBody>(request)

  if (!body.grant_type) {
    return fail("bad_request", "grant_type is required")
  }

  return ok({
    token_type: "Bearer",
    access_token: "demo_vafs_access_token",
    refresh_token: body.refresh_token ?? "demo_vafs_refresh_token",
    expires_in: 3600,
    scope: "vafs.search vafs.read.pages",
    mode: "stub_replace_with_supabase_oauth_server",
  })
}
