export async function generateEmbedding(imageUrl: string): Promise<number[]> {
  return generateMockEmbedding(imageUrl)
}

/**
 * Generate a deterministic mock embedding based on image URL.
 * Images with similar URLs (same job/batch) get similar embeddings.
 * In a real system, replace with CLIP or similar visual embeddings.
 */
export function generateMockEmbedding(seed: string): number[] {
  const DIM = 1536
  const vec = new Array(DIM).fill(0)

  // Simple hash-based pseudo-random vector
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0
  }

  // Group images with similar hash values (simulate clustering)
  const groupSeed = Math.abs(hash) % 8 // 8 visual groups
  const noise = Math.abs(hash * 1234567) % 1000

  for (let i = 0; i < DIM; i++) {
    const base = Math.sin(groupSeed * 1000 + i) * 0.8
    const n = Math.sin(noise + i * 0.1) * 0.2
    vec[i] = base + n
  }

  // Normalize to unit vector
  const mag = Math.sqrt(vec.reduce((s, v) => s + v * v, 0))
  return vec.map((v) => v / mag)
}

export function cosineSimlarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0
  let dot = 0, magA = 0, magB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    magA += a[i] * a[i]
    magB += b[i] * b[i]
  }
  if (magA === 0 || magB === 0) return 0
  return dot / (Math.sqrt(magA) * Math.sqrt(magB))
}
