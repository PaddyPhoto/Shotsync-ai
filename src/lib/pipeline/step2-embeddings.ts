/**
 * Step 2: Generate image embeddings using OpenAI Vision API
 * Falls back to mock embeddings when API key is not set.
 */

export async function generateEmbedding(imageUrl: string): Promise<number[]> {
  if (!process.env.OPENAI_API_KEY) {
    return generateMockEmbedding(imageUrl)
  }

  // Use OpenAI's text-embedding-3-small with an image description
  // For production, use a proper vision embedding model or CLIP
  const OpenAI = (await import('openai')).default
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  // Describe the image first, then embed the description
  const vision = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: imageUrl, detail: 'low' } },
          {
            type: 'text',
            text: 'Describe this fashion product image in detail: garment type, colour, style, visible details. Be specific and consistent.',
          },
        ],
      },
    ],
    max_tokens: 200,
  })

  const description = vision.choices[0]?.message?.content ?? ''

  const embedding = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: description,
  })

  return embedding.data[0].embedding
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
