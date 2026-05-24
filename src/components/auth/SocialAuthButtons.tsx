'use client'

import { createClient } from '@/lib/supabase/client'

type Provider = 'google' | 'apple' | 'azure'

interface Props {
  nextPath?: string
  label?: string
}

export function SocialAuthButtons({ nextPath = '/dashboard', label = 'Continue' }: Props) {
  const handleOAuth = async (provider: Provider) => {
    const supabase = createClient()
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`
    await supabase.auth.signInWithOAuth({ provider, options: { redirectTo } })
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => handleOAuth('google')}
        className="flex items-center justify-center gap-[10px] w-full py-[9px] px-4 rounded-[8px] border border-[var(--line2)] bg-[var(--bg2)] text-[0.875rem] font-[500] text-[var(--text)] hover:bg-[var(--bg3)] transition-colors"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
          <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
          <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
          <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
        </svg>
        {label} with Google
      </button>

      <div className="flex items-center gap-3 my-1">
        <div className="flex-1 h-px bg-[var(--line2)]" />
        <span className="text-[0.78rem] text-[var(--text3)]">or</span>
        <div className="flex-1 h-px bg-[var(--line2)]" />
      </div>
    </div>
  )
}
