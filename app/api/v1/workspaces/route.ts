import { ok } from "@/lib/vafs/api"
import { listWorkspaces } from "@/lib/vafs/services"

export const dynamic = "force-dynamic"

export async function GET() {
  return ok(listWorkspaces())
}
