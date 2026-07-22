// ── Channel-variant copy ─────────────────────────────────────────────────────
// One product record → copy tailored per destination. The MASTER copy that the
// coordinator writes/edits (cluster.copyDescription/copyBullets + the title) IS
// the Shopify / long-form version — it's what the existing Shopify push already
// sends. We only additionally derive and store two more variants:
//   • marketplace — short, keyword-front-loaded, within marketplace title limits
//   • feed        — concise, factual, attribute-dense (for ERP/PIM like Cin7)
// Each export/push path picks the variant that fits its destination; all three
// share the brand voice, differing only in length and format.

export type ChannelCopy = {
  title: string
  description: string
  bullets: string[]
}

export type CopyVariants = {
  marketplace?: ChannelCopy
  feed?: ChannelCopy
}

/** Normalise an unknown value (API/DB) into a ChannelCopy, or null if empty. */
export function toChannelCopy(v: unknown): ChannelCopy | null {
  if (!v || typeof v !== 'object') return null
  const o = v as Record<string, unknown>
  const title = typeof o.title === 'string' ? o.title : ''
  const description = typeof o.description === 'string' ? o.description : ''
  const bullets = Array.isArray(o.bullets) ? o.bullets.filter((b): b is string => typeof b === 'string') : []
  if (!title && !description && !bullets.length) return null
  return { title, description, bullets }
}

/** Parse a variants blob (from the copy API or the DB) into a clean CopyVariants. */
export function toCopyVariants(v: unknown): CopyVariants | undefined {
  if (!v || typeof v !== 'object') return undefined
  const o = v as Record<string, unknown>
  const marketplace = toChannelCopy(o.marketplace)
  const feed = toChannelCopy(o.feed)
  if (!marketplace && !feed) return undefined
  return { ...(marketplace ? { marketplace } : {}), ...(feed ? { feed } : {}) }
}
