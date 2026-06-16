/**
 * Weekly health check for ShotSync — runs in GitHub Actions (see
 * .github/workflows/health-check.yml). Type-checks the app, audits production
 * dependencies for vulnerabilities, and emails a summary via Resend (the same
 * service the app uses). Read-only: it never modifies code or applies fixes.
 *
 * This runs entirely on GitHub's infrastructure, so it keeps working
 * independently of Claude Code or any Anthropic subscription.
 */
import { execSync } from 'node:child_process'
import { Resend } from 'resend'

const TO = 'hello@shotsync.ai'
const FROM = 'ShotSync <hello@shotsync.ai>'

function run(cmd) {
  try {
    const stdout = execSync(cmd, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 20 * 1024 * 1024,
    })
    return { ok: true, stdout, stderr: '' }
  } catch (e) {
    return { ok: false, stdout: e.stdout || '', stderr: e.stderr || '', code: e.status }
  }
}

// ── 1. TypeScript ────────────────────────────────────────────────────────────
const tsc = run('npx tsc --noEmit')
const tsPass = tsc.ok
const tsOutput = (tsc.stdout + tsc.stderr).trim()
const tsErrorCount = tsPass ? 0 : (tsOutput.match(/error TS/g) || []).length

// ── 2. Unit tests (plan gating, org resolution, etc.) ────────────────────────
const tests = run('npm test')
const testsPass = tests.ok
const testOutput = (tests.stdout + tests.stderr).trim()

// ── 3. Dependency audit (production only) ────────────────────────────────────
let counts = { critical: 0, high: 0, moderate: 0, low: 0, total: 0 }
const highCritList = []
let fixableCount = 0
let auditOk = true
try {
  const res = run('npm audit --omit=dev --json')
  const json = JSON.parse(res.stdout)
  const v = json.metadata?.vulnerabilities || {}
  counts = {
    critical: v.critical || 0,
    high: v.high || 0,
    moderate: v.moderate || 0,
    low: v.low || 0,
    total: v.total || 0,
  }
  for (const [name, info] of Object.entries(json.vulnerabilities || {})) {
    if (info.fixAvailable) fixableCount++
    if (info.severity === 'high' || info.severity === 'critical') {
      const titles = (info.via || [])
        .filter((x) => typeof x === 'object' && x.title)
        .map((x) => x.title)
      highCritList.push({
        name,
        severity: info.severity,
        fix: Boolean(info.fixAvailable),
        titles: [...new Set(titles)],
      })
    }
  }
} catch {
  auditOk = false
}

const commit = (run('git rev-parse --short HEAD').stdout || '').trim()
const healthy = tsPass && testsPass && counts.critical === 0 && counts.high === 0
const subject = healthy
  ? 'ShotSync Weekly Health Check — All Green'
  : 'ShotSync Weekly Health Check — Needs Attention'

// ── 3. Build the report ──────────────────────────────────────────────────────
const highCritHtml = highCritList.length
  ? `<ul>${highCritList
      .map(
        (h) =>
          `<li><strong>${h.name}</strong> (${h.severity})${h.fix ? ' — fix available' : ' — no upstream fix'}${
            h.titles.length ? `<br><span style="color:#6e6e73">${h.titles.join('; ')}</span>` : ''
          }</li>`,
      )
      .join('')}</ul>`
  : '<p>None 🎉</p>'

const html = `
  <h2 style="font-family:-apple-system,Helvetica,Arial,sans-serif;color:#1d1d1f">ShotSync Weekly Health Check</h2>
  <p style="color:#6e6e73;font-size:13px">Commit <code>${commit}</code> · run by GitHub Actions</p>
  <ul style="font-family:-apple-system,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6">
    <li><strong>TypeScript:</strong> ${tsPass ? 'PASS ✅' : `FAIL ❌ (${tsErrorCount} errors)`}</li>
    <li><strong>Unit tests:</strong> ${testsPass ? 'PASS ✅' : 'FAIL ❌'}</li>
    <li><strong>Security:</strong> ${auditOk ? `${counts.total} vulns (${counts.critical} critical, ${counts.high} high, ${counts.moderate} moderate, ${counts.low} low)` : 'audit could not be parsed'}</li>
    <li><strong>Fixable via <code>npm audit fix</code>:</strong> ${fixableCount}</li>
  </ul>
  <h3 style="font-family:-apple-system,Helvetica,Arial,sans-serif;color:#1d1d1f">Critical / High issues</h3>
  ${highCritHtml}
  ${
    tsPass
      ? ''
      : `<h3 style="font-family:-apple-system,Helvetica,Arial,sans-serif;color:#1d1d1f">TypeScript errors (first 30 lines)</h3><pre style="background:#f5f5f7;padding:12px;border-radius:8px;font-size:12px;overflow:auto">${tsOutput
          .split('\n')
          .slice(0, 30)
          .join('\n')
          .replace(/</g, '&lt;')}</pre>`
  }
  ${
    testsPass
      ? ''
      : `<h3 style="font-family:-apple-system,Helvetica,Arial,sans-serif;color:#1d1d1f">Failing tests (last 30 lines)</h3><pre style="background:#f5f5f7;padding:12px;border-radius:8px;font-size:12px;overflow:auto">${testOutput
          .split('\n')
          .slice(-30)
          .join('\n')
          .replace(/</g, '&lt;')}</pre>`
  }
  <p style="color:#6e6e73;font-size:13px">This is a read-only report. No code or dependencies were changed — review and apply any fixes yourself.</p>
`

// Always print a plain-text summary to the Actions log.
console.log(`Subject: ${subject}`)
console.log(`TypeScript: ${tsPass ? 'PASS' : `FAIL (${tsErrorCount} errors)`}`)
console.log(`Unit tests: ${testsPass ? 'PASS' : 'FAIL'}`)
console.log(
  `Security: ${counts.total} vulns (${counts.critical} crit, ${counts.high} high, ${counts.moderate} mod, ${counts.low} low); ${fixableCount} fixable`,
)
if (highCritList.length) {
  console.log('High/Critical:')
  for (const h of highCritList) console.log(`  - ${h.name} (${h.severity})${h.fix ? ' [fix available]' : ''}`)
}

// ── 4. Email it ──────────────────────────────────────────────────────────────
const key = process.env.RESEND_API_KEY
if (!key) {
  console.error('RESEND_API_KEY is not set — cannot send the report email.')
  process.exit(1)
}

const resend = new Resend(key)
const { data, error } = await resend.emails.send({ from: FROM, to: TO, replyTo: TO, subject, html })
if (error) {
  console.error('Email failed:', error)
  process.exit(1)
}
console.log('Email sent:', data?.id)
