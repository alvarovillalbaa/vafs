import { ok } from "@/lib/vafs/api"
import { getHealth, getPlatformOverview } from "@/lib/vafs/services"

export const dynamic = "force-dynamic"

export async function GET() {
  return ok({
    ...getHealth(),
    overview: getPlatformOverview().counts,
  })
}
