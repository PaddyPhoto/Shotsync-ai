import { createServiceClient } from '@/lib/supabase/server'
import { sendEmail, reEngagementEmail } from '@/lib/email'

type ServiceClient = ReturnType<typeof createServiceClient>

const DAY = 86_400_000

export async function runReEngagement(service: ServiceClient) {
  // Check enabled flag
  const { data: settingsRows } = await service
    .from('admin_settings')
    .select('key, value')
    .eq('key', 're_engagement_enabled')

  const enabled = settingsRows?.find((s: { key: string; value: string }) => s.key === 're_engagement_enabled')?.value !== 'false'
  if (!enabled) return { skipped: true, reason: 'disabled' as const }

  // Unsubscribe list
  const { data: unsubData } = await service.from('email_unsubscribes').select('email')
  const unsubSet = new Set((unsubData ?? []).map((r: { email: string }) => r.email.toLowerCase()))

  // All users
  const { data: userData, error: userError } = await service.auth.admin.listUsers({ perPage: 1000 })
  if (userError) throw new Error(userError.message)

  // Re-engagement email history
  const { data: emailLog } = await service
    .from('transactional_email_log')
    .select('email, sequence_number, sent_at')
    .eq('template', 're-engagement')

  type EmailHistory = { count: number; latestSentAt: Date }
  const historyMap = new Map<string, EmailHistory>()
  for (const row of (emailLog ?? []) as { email: string; sequence_number: number; sent_at: string }[]) {
    const key = row.email.toLowerCase()
    const rowDate = new Date(row.sent_at)
    const existing = historyMap.get(key)
    if (!existing) {
      historyMap.set(key, { count: 1, latestSentAt: rowDate })
    } else {
      existing.count++
      if (rowDate > existing.latestSentAt) existing.latestSentAt = rowDate
    }
  }

  const now = Date.now()
  const toSend: { email: string; sequence: number }[] = []

  for (const user of userData.users) {
    const email = user.email
    if (!email || unsubSet.has(email.toLowerCase())) continue

    const lastActivity = new Date(
      (user as { last_sign_in_at?: string | null }).last_sign_in_at ?? user.created_at
    ).getTime()

    const history = historyMap.get(email.toLowerCase())
    const count = history?.count ?? 0

    if (count >= 3) continue

    if (count === 0) {
      if (now - lastActivity >= 15 * DAY) {
        toSend.push({ email, sequence: 1 })
      }
    } else if (count === 1) {
      const lastSent = history!.latestSentAt.getTime()
      if (lastActivity < lastSent && now - lastSent >= 15 * DAY) {
        toSend.push({ email, sequence: 2 })
      }
    } else if (count === 2) {
      const lastSent = history!.latestSentAt.getTime()
      if (lastActivity < lastSent && now - lastSent >= 30 * DAY) {
        toSend.push({ email, sequence: 3 })
      }
    }
  }

  let sent = 0
  const runAt = new Date().toISOString()

  for (const { email, sequence } of toSend) {
    try {
      await sendEmail(reEngagementEmail(email))
      await service.from('transactional_email_log').insert({
        email: email.toLowerCase(),
        template: 're-engagement',
        sequence_number: sequence,
        sent_at: runAt,
      })
      sent++
    } catch {
      // continue — don't let one failure block the rest
    }
  }

  const result = { sent, skipped: toSend.length - sent, total: userData.users.length }

  await service.from('admin_settings').upsert([
    { key: 're_engagement_last_run_at', value: runAt, updated_at: runAt },
    { key: 're_engagement_last_run_result', value: JSON.stringify(result), updated_at: runAt },
  ])

  return result
}
