import { Sidebar } from '@/components/layout/Sidebar'
import { BrandProvider } from '@/context/BrandContext'
import { PlanProvider } from '@/context/PlanContext'
import { UpgradeModal } from '@/components/billing/UpgradeModal'
import { WelcomeModal } from '@/components/onboarding/WelcomeModal'
import { BrandOnboardingModal } from '@/components/onboarding/BrandOnboardingModal'
import { MobileGate } from '@/components/layout/MobileGate'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <MobileGate>
      <BrandProvider>
        <PlanProvider>
          <div id="app" data-theme="dark" className="flex h-screen">
            <Sidebar />
            <main className="flex-1 overflow-y-auto relative" style={{ background: 'var(--bg)' }}>
              {children}
            </main>
          </div>
          <UpgradeModal />
          <WelcomeModal />
          <BrandOnboardingModal />
        </PlanProvider>
      </BrandProvider>
    </MobileGate>
  )
}
