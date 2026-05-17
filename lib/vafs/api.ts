import { vafsScopes, type ApiErrorEnvelope, type ApiEnvelope, type VafsScope } from "@/lib/vafs/types"

export function ok<T>(data: T, meta?: Record<string, unknown>) {
  const body: ApiEnvelope<T> = meta ? { data, meta } : { data }
  return Response.json(body)
}

export function fail(code: string, message: string, status = 400, details?: unknown) {
  const body: ApiErrorEnvelope = {
    error: {
      code,
      message,
      details,
    },
  }

  return Response.json(body, { status })
}

export async function readJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T
  } catch {
    return {} as T
  }
}

export function getRequestedWorkspace(request: Request) {
  const url = new URL(request.url)
  return (
    url.searchParams.get("workspaceId") ??
    request.headers.get("x-vafs-workspace") ??
    undefined
  )
}

export function requireScope(request: Request, scope: VafsScope) {
  if (process.env.VAFS_AUTH_REQUIRED !== "true") {
    return { ok: true as const, principalId: "demo_user" }
  }

  const grantedScopes = new Set(
    (request.headers.get("x-vafs-scopes") ?? "")
      .split(/[,\s]+/)
      .map((item) => item.trim())
      .filter(Boolean)
  )

  if (!vafsScopes.includes(scope)) {
    return {
      ok: false as const,
      response: fail("unknown_scope", `Unknown VAFS scope: ${scope}`, 500),
    }
  }

  if (!grantedScopes.has(scope)) {
    return {
      ok: false as const,
      response: fail("forbidden", `Missing required scope: ${scope}`, 403),
    }
  }

  return { ok: true as const, principalId: "token_subject" }
}
