import { fail, ok } from "@/lib/vafs/api"
import { vafsScopes } from "@/lib/vafs/types"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const clientId = url.searchParams.get("client_id")
  const redirectUri = url.searchParams.get("redirect_uri")
  const scope = url.searchParams.get("scope") ?? ""
  const requestedScopes = scope.split(/\s+/).filter(Boolean)
  const invalidScopes = requestedScopes.filter(
    (item) => !vafsScopes.includes(item as (typeof vafsScopes)[number])
  )

  if (!clientId || !redirectUri) {
    return fail("bad_request", "client_id and redirect_uri are required")
  }

  if (invalidScopes.length > 0) {
    return fail("invalid_scope", "One or more scopes are not supported", 400, {
      invalidScopes,
    })
  }

  return ok({
    type: "oauth_authorization_preview",
    clientId,
    redirectUri,
    requestedScopes,
    next: "Supabase Auth should render consent and exchange an authorization code.",
  })
}
