import { Sidebar } from '@/components/layout/Sidebar'
import { BrandProvider } from '@/context/BrandContext'
import { PlanProvider } from '@/context/PlanContext'
import { UpgradeModal } from '@/components/billing/UpgradeModal'
import { WelcomeModal } from '@/components/onboarding/WelcomeModal'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <BrandProvider>
      <PlanProvider>
        <div id="app" className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 overflow-y-auto relative">
            {children}
          </main>
        </div>
        <UpgradeModal />
        <WelcomeModal />
      </PlanProvider>
    </BrandProvider>
  )
}
