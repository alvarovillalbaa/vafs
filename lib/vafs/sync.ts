import { createHash } from "node:crypto"
import type { AfsFileRecord, SyncJob } from "@/lib/vafs/types"

export type IndexedChunk = {
  id: string
  path: string
  workspaceId: string
  title: string
  description: string
  chunkIndex: number
  content: string
  metadata: {
    section: AfsFileRecord["section"]
    updatedAt: string
    sourceCommitSha: string
  }
}

export type VectorStoreAdapter = {
  name: string
  upsert(chunks: IndexedChunk[]): Promise<{ upserted: number }>
  query(input: {
    workspaceId: string
    query: string
    topK: number
  }): Promise<{ id: string; score: number }[]>
}

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 16)
}

export function chunkAfsFile(file: AfsFileRecord): IndexedChunk[] {
  const sections = file.content
    .split(/\n(?=#{1,3}\s+)/)
    .map((section) => section.trim())
    .filter(Boolean)

  const chunks = sections.length > 0 ? sections : [file.content]

  return chunks.map((content, index) => ({
    id: hash(`${file.workspaceId}:${file.path}:${index}:${content}`),
    path: file.path,
    workspaceId: file.workspaceId,
    title: file.title,
    description: file.description,
    chunkIndex: index,
    content,
    metadata: {
      section: file.section,
      updatedAt: file.updatedAt,
      sourceCommitSha: file.sourceCommitSha,
    },
  }))
}

export function createSyncPlan(files: AfsFileRecord[], job: SyncJob) {
  const chunks = files.flatMap(chunkAfsFile)

  return {
    jobId: job.id,
    workspaceId: job.workspaceId,
    changedFiles: files.length,
    indexedChunks: chunks.length,
    vectorNamespace: `vafs_${job.workspaceId}`,
    chunks,
  }
}

export const s3VectorsAdapter: VectorStoreAdapter = {
  name: "aws_s3_vectors",
  async upsert(chunks) {
    return { upserted: chunks.length }
  },
  async query() {
    return []
  },
}
