// ── Brand secret redaction ──────────────────────────────────────────────────
// Third-party credentials (Shopify token, Cin7 application key, and the S3 /
// Google Drive / Dropbox secrets inside cloud_connections) must never be sent to
// the browser. We mask them on read and preserve the stored values on write, so
// a masked value round-tripping back from the client can never overwrite a real
// secret. Shopify's access token is dropped entirely in favour of a boolean.

export const SECRET_MASK = '••••••••••••••••'

export const isMasked = (v: unknown): v is string =>
  typeof v === 'string' && v.startsWith('•')

// Secret fields held inside the cloud_connections JSON, keyed by provider.
const CC_SECRET_FIELDS: Record<string, string[]> = {
  s3: ['secret_access_key'],
  google_drive: ['refresh_token', 'access_token'],
  dropbox: ['refresh_token', 'access_token'],
}

function maskCloudConnections(cc: unknown): unknown {
  if (!cc || typeof cc !== 'object') return cc
  const out: Record<string, unknown> = { ...(cc as Record<string, unknown>) }
  for (const [provider, fields] of Object.entries(CC_SECRET_FIELDS)) {
    const p = out[provider]
    if (p && typeof p === 'object') {
      const pp = { ...(p as Record<string, unknown>) }
      for (const f of fields) if (pp[f]) pp[f] = SECRET_MASK
      out[provider] = pp
    }
  }
  return out
}

// Redact a brand row before returning it to the browser.
export function maskBrandSecrets<T extends Record<string, unknown>>(brand: T) {
  const { shopify_access_token, cin7_application_key, cloud_connections, ...rest } =
    brand as Record<string, unknown>
  return {
    ...rest,
    cloud_connections: maskCloudConnections(cloud_connections),
    shopify_authenticated: !!shopify_access_token,
    cin7_application_key: cin7_application_key ? SECRET_MASK : '',
  }
}

type StoredSecrets = {
  cin7_application_key?: string | null
  cloud_connections?: unknown
} | null

// Sanitise an incoming update so masked/empty secrets never clobber stored ones.
// - Cin7 key: masked or empty ⇒ drop (keep stored).
// - cloud_connections: for each provider PRESENT in the incoming blob, restore
//   masked/absent secret fields from the stored record. A provider fully absent
//   from the incoming blob is an intentional disconnect and is left removed.
// Mutates and returns `updates`.
export function preserveBrandSecretsOnWrite(
  updates: Record<string, unknown>,
  stored: StoredSecrets,
) {
  if ('cin7_application_key' in updates) {
    const v = updates.cin7_application_key
    if (!v || isMasked(v)) delete updates.cin7_application_key
  }

  const incoming = updates.cloud_connections
  if (incoming && typeof incoming === 'object') {
    const inc: Record<string, unknown> = { ...(incoming as Record<string, unknown>) }
    const storedCC = (stored?.cloud_connections ?? {}) as Record<string, unknown>
    for (const [provider, fields] of Object.entries(CC_SECRET_FIELDS)) {
      const incP = inc[provider]
      if (incP && typeof incP === 'object') {
        const merged = { ...(incP as Record<string, unknown>) }
        const storedP = storedCC[provider] as Record<string, unknown> | undefined
        for (const f of fields) {
          if (!merged[f] || isMasked(merged[f])) {
            if (storedP && storedP[f]) merged[f] = storedP[f]
            else delete merged[f]
          }
        }
        inc[provider] = merged
      }
    }
    updates.cloud_connections = inc
  }
  return updates
}
