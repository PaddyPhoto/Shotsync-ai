import { describe, it, expect } from 'vitest'
import { PLANS, type PlanId } from './index'

/**
 * Guards the plan feature-gating matrix. A regression here previously shipped
 * AI copywriting blocked on every paid plan, so these assertions encode the
 * intended gating explicitly — flipping a flag by accident will fail the build.
 */
describe('plan gating matrix', () => {
  const ALL_PLANS: PlanId[] = ['free', 'launch', 'growth', 'scale', 'enterprise']

  it('every PlanId has a definition', () => {
    for (const id of ALL_PLANS) {
      expect(PLANS[id], `missing plan: ${id}`).toBeDefined()
      expect(PLANS[id].id).toBe(id)
    }
  })

  it('aiCopy is unlocked from Growth and above (the regression that broke)', () => {
    const expected: Record<PlanId, boolean> = {
      free: false,
      launch: false,
      growth: true,
      scale: true,
      enterprise: true,
    }
    for (const id of ALL_PLANS) {
      expect(PLANS[id].limits.aiCopy, `aiCopy wrong for ${id}`).toBe(expected[id])
    }
  })

  it('paid plans (growth/scale/enterprise) must allow aiCopy', () => {
    expect(PLANS.growth.limits.aiCopy).toBe(true)
    expect(PLANS.scale.limits.aiCopy).toBe(true)
    expect(PLANS.enterprise.limits.aiCopy).toBe(true)
  })

  it('bgRemoval matches the intended matrix', () => {
    const expected: Record<PlanId, boolean> = {
      free: false,
      launch: false,
      growth: true,
      scale: true,
      enterprise: true,
    }
    for (const id of ALL_PLANS) {
      expect(PLANS[id].limits.bgRemoval, `bgRemoval wrong for ${id}`).toBe(expected[id])
    }
  })

  it('brand limits increase monotonically with tier (enterprise unlimited)', () => {
    expect(PLANS.free.limits.brands).toBe(1)
    expect(PLANS.scale.limits.brands).toBeGreaterThan(PLANS.growth.limits.brands)
    expect(PLANS.enterprise.limits.brands).toBe(-1) // unlimited
  })
})
