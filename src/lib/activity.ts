// Server-side only — fire-and-forget activity logger.
// Never throws; errors are swallowed so logging never blocks the main flow.

export type ActivityEvent =
  | 'job.completed'
  | 'plan.upgraded'
  | 'plan.changed'
  | 'plan.admin_override'
  | 'export.started'
  | 'export.failed'

export interface ActivityMetadata {
  job_name?: string
  image_count?: number
  cluster_count?: number
  marketplaces?: string[]
  plan_from?: string
  plan_to?: string
  [key: string]: unknown
}

export async function logActivity(
  orgId: string,
  userId: string | null,
  event: ActivityEvent,
  metadata: ActivityMetadata = {}
): Promise<void> {
  try {
    const { createServiceClient } = await import('@/lib/supabase/server')
    const service = createServiceClient()
    await service.from('activity_log').insert({
      org_id: orgId,
      user_id: userId ?? null,
      event,
      metadata,
    })
  } catch {
    // intentionally silent
  }
}
