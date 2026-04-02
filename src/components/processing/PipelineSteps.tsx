'use client'

import { cn } from '@/lib/utils'
import { PIPELINE_STEPS } from '@/types'
import type { PipelineStep } from '@/types'

interface PipelineStepsProps {
  currentStep: number
  status?: string
}

export function PipelineSteps({ currentStep, status }: PipelineStepsProps) {
  const steps: PipelineStep[] = PIPELINE_STEPS.map((s) => ({
    ...s,
    status:
      s.step < currentStep ? 'done'
      : s.step === currentStep ? 'active'
      : 'pending',
  }))

  return (
    <div className="flex flex-col gap-[2px]">
      {steps.map((step) => (
        <div
          key={step.step}
          className={cn(
            'flex items-center gap-[14px] px-[18px] py-[14px] rounded-sm transition-colors duration-150',
            step.status === 'active' && 'bg-[rgba(232,217,122,0.06)]',
            step.status === 'done' && 'opacity-60',
          )}
        >
          {/* Step number / status circle */}
          <div
            className={cn(
              'w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[0.72rem] font-medium border',
              step.status === 'pending' && 'border-[var(--line2)] text-[var(--text3)]',
              step.status === 'active' && 'bg-[var(--accent)] text-black border-[var(--accent)]',
              step.status === 'done' && 'bg-[var(--accent2)] text-black border-[var(--accent2)]',
              step.status === 'error' && 'bg-[var(--accent3)] text-black border-[var(--accent3)]',
            )}
            style={{ fontFamily: 'var(--font-dm-mono)' }}
          >
            {step.status === 'done' ? (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="black" strokeWidth="2">
                <polyline points="2 6 5 9 10 3"/>
              </svg>
            ) : step.status === 'active' ? (
              <span className="w-2 h-2 bg-black rounded-full animate-pulse" />
            ) : (
              step.step
            )}
          </div>

          {/* Content */}
          <div className="flex-1">
            <p className={cn(
              'text-[0.85rem] font-medium',
              step.status === 'active' ? 'text-[var(--text)]' : 'text-[var(--text2)]'
            )}>
              {step.name}
            </p>
            <p className="text-[0.75rem] text-[var(--text3)] mt-[2px]">
              {step.description}
            </p>
          </div>

          {/* Duration / indicator */}
          {step.status === 'active' && (
            <div className="flex-shrink-0">
              <svg
                width="14" height="14"
                viewBox="0 0 14 14"
                className="animate-spin text-[var(--accent)]"
                fill="none" stroke="currentColor" strokeWidth="1.5"
              >
                <circle cx="7" cy="7" r="5" strokeDasharray="20 11"/>
              </svg>
            </div>
          )}
          {step.duration_ms !== undefined && step.status === 'done' && (
            <span
              className="text-[0.72rem] text-[var(--text3)] flex-shrink-0"
              style={{ fontFamily: 'var(--font-dm-mono)' }}
            >
              {(step.duration_ms / 1000).toFixed(1)}s
            </span>
          )}
        </div>
      ))}
    </div>
  )
}
