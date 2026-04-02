/**
 * Step 3: Cluster images by visual similarity using cosine similarity + K-means
 */
import { cosineSimlarity } from './step2-embeddings'

export interface ClusterAssignment {
  imageId: string
  clusterId: number
  confidence: number
}

/**
 * Cluster embeddings using K-means with cosine similarity.
 * Automatically estimates K if not provided.
 */
export function clusterEmbeddings(
  embeddings: { id: string; vector: number[] }[],
  kHint?: number
): ClusterAssignment[] {
  if (embeddings.length === 0) return []
  if (embeddings.length === 1) {
    return [{ imageId: embeddings[0].id, clusterId: 0, confidence: 1 }]
  }

  const k = kHint ?? estimateK(embeddings.length)
  const clampedK = Math.min(k, embeddings.length)

  // Initialize centroids via K-means++ strategy
  const centroids = initKMeansPlusPlus(
    embeddings.map((e) => e.vector),
    clampedK
  )

  let assignments = new Array(embeddings.length).fill(-1)
  const maxIter = 30

  for (let iter = 0; iter < maxIter; iter++) {
    let changed = false

    // Assign each point to nearest centroid
    const newAssignments = embeddings.map((emb) => {
      let bestCluster = 0
      let bestSim = -Infinity
      centroids.forEach((centroid, ci) => {
        const sim = cosineSimlarity(emb.vector, centroid)
        if (sim > bestSim) {
          bestSim = sim
          bestCluster = ci
        }
      })
      return bestCluster
    })

    if (newAssignments.some((a, i) => a !== assignments[i])) changed = true
    assignments = newAssignments

    if (!changed) break

    // Update centroids
    centroids.forEach((_, ci) => {
      const members = embeddings.filter((_, i) => assignments[i] === ci)
      if (members.length === 0) return
      const dim = members[0].vector.length
      const sum = new Array(dim).fill(0)
      members.forEach((m) => m.vector.forEach((v, d) => (sum[d] += v)))
      const mag = Math.sqrt(sum.reduce((s, v) => s + v * v, 0))
      centroids[ci] = mag > 0 ? sum.map((v) => v / mag) : sum
    })
  }

  // Calculate per-image confidence (similarity to its centroid)
  return embeddings.map((emb, i) => {
    const ci = assignments[i]
    const sim = cosineSimlarity(emb.vector, centroids[ci])
    return {
      imageId: emb.id,
      clusterId: ci,
      confidence: Math.max(0, Math.min(1, (sim + 1) / 2)), // normalize -1..1 → 0..1
    }
  })
}

function estimateK(n: number): number {
  // Rule of thumb: sqrt(n/2), clamped to reasonable range
  return Math.max(1, Math.min(Math.round(Math.sqrt(n / 2)), Math.floor(n / 3)))
}

function initKMeansPlusPlus(vectors: number[][], k: number): number[][] {
  const centroids: number[][] = []
  const idx = Math.floor(Math.random() * vectors.length)
  centroids.push([...vectors[idx]])

  while (centroids.length < k) {
    const distances = vectors.map((v) => {
      const maxSim = Math.max(...centroids.map((c) => cosineSimlarity(v, c)))
      return 1 - maxSim // distance = 1 - similarity
    })
    const total = distances.reduce((s, d) => s + d * d, 0)
    let r = Math.random() * total
    let chosen = 0
    for (let i = 0; i < distances.length; i++) {
      r -= distances[i] * distances[i]
      if (r <= 0) { chosen = i; break }
    }
    centroids.push([...vectors[chosen]])
  }

  return centroids
}
