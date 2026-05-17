import { demoFiles } from "@/lib/vafs/fixtures"
import type { AfsFileRecord, SearchMode, SearchResult } from "@/lib/vafs/types"

const canonicalBoost: Record<AfsFileRecord["section"], number> = {
  root: 1.25,
  truth: 1.2,
  operational: 1,
  memory: 0.95,
  raw: 0.7,
}

function tokenize(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9/_-]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
}

function unique(values: string[]) {
  return Array.from(new Set(values))
}

function tokenScore(queryTokens: string[], fieldTokens: string[]) {
  if (queryTokens.length === 0 || fieldTokens.length === 0) return 0

  const fieldSet = new Set(fieldTokens)
  const matched = queryTokens.filter((token) => fieldSet.has(token)).length
  const partial = queryTokens.filter((token) =>
    fieldTokens.some((fieldToken) => fieldToken.includes(token))
  ).length

  return matched / queryTokens.length + partial / queryTokens.length / 2
}

function charNgrams(value: string, size = 3) {
  const compact = value.toLowerCase().replace(/\s+/g, " ")
  const grams = new Set<string>()
  for (let index = 0; index <= compact.length - size; index += 1) {
    grams.add(compact.slice(index, index + size))
  }
  return grams
}

function vectorLikeScore(query: string, content: string) {
  const queryGrams = charNgrams(query)
  const contentGrams = charNgrams(content)
  if (queryGrams.size === 0 || contentGrams.size === 0) return 0

  let overlap = 0
  for (const gram of queryGrams) {
    if (contentGrams.has(gram)) overlap += 1
  }
  return overlap / Math.max(queryGrams.size, 1)
}

function highlights(file: AfsFileRecord, queryTokens: string[]) {
  const sentences = file.content
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)

  const matching = sentences.filter((sentence) => {
    const normalized = sentence.toLowerCase()
    return queryTokens.some((token) => normalized.includes(token))
  })

  return (matching.length > 0 ? matching : sentences).slice(0, 2)
}

export function searchAfsFiles({
  query,
  workspaceId,
  files = demoFiles,
  includeRaw = true,
}: {
  query: string
  workspaceId?: string
  files?: AfsFileRecord[]
  includeRaw?: boolean
}): SearchResult[] {
  const trimmedQuery = query.trim()
  if (!trimmedQuery) return []

  const queryTokens = unique(tokenize(trimmedQuery))

  return files
    .filter((file) => (workspaceId ? file.workspaceId === workspaceId : true))
    .filter((file) => includeRaw || file.section !== "raw")
    .map((file) => {
      const titleTokens = tokenize(`${file.path} ${file.title}`)
      const descriptionTokens = tokenize(file.description)
      const contentTokens = tokenize(file.content)
      const metadataScore =
        tokenScore(queryTokens, titleTokens) * 2 +
        tokenScore(queryTokens, descriptionTokens) * 1.5
      const bm25Score = tokenScore(queryTokens, contentTokens)
      const vectorScore = vectorLikeScore(trimmedQuery, file.content)
      const boosted =
        (metadataScore * 0.35 + bm25Score * 0.35 + vectorScore * 0.3) *
        canonicalBoost[file.section]
      const modes: SearchMode[] = []

      if (metadataScore > 0) modes.push("metadata")
      if (bm25Score > 0) modes.push("bm25")
      if (vectorScore > 0) modes.push("vector")
      if (file.content.toLowerCase().includes(trimmedQuery.toLowerCase())) {
        modes.push("grep")
      }
      if (modes.length > 1) modes.push("rerank")

      return {
        path: file.path,
        title: file.title,
        description: file.description,
        section: file.section,
        updatedAt: file.updatedAt,
        score: Number(boosted.toFixed(4)),
        modes,
        highlights: highlights(file, queryTokens),
      }
    })
    .filter((result) => result.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 20)
}
