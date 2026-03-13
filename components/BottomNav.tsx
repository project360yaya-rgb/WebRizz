'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import Avatar from '@/components/Avatar'

const navItems = [
  {
    href: '/dashboard',
    label: 'Home',
    icon: (active: boolean) => (
      <svg className="h-[22px] w-[22px]" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 1.5}>
        {active ? (
          <path d="M11.47 3.841a.75.75 0 011.06 0l8.69 8.69a.75.75 0 01-.53 1.28h-1.44v7.44a.75.75 0 01-.75.75h-4.5a.75.75 0 01-.75-.75v-4.5a.75.75 0 00-.75-.75h-1.5a.75.75 0 00-.75.75v4.5a.75.75 0 01-.75.75h-4.5a.75.75 0 01-.75-.75v-7.44H2.81a.75.75 0 01-.53-1.28l8.69-8.69z" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955a1.126 1.126 0 0 1 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
        )}
      </svg>
    ),
  },
  {
    href: '/search',
    label: 'Search',
    icon: (active: boolean) => (
      <svg className="h-[22px] w-[22px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
      </svg>
    ),
  },
  {
    href: '/messages',
    label: 'Messages',
    desktopOnly: true,
    icon: (active: boolean) => (
      <svg className="h-[22px] w-[22px]" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 1.5}>
        {active ? (
          <path d="M4.913 2.658c2.075-.27 4.19-.408 6.337-.408 2.147 0 4.262.139 6.337.408 1.922.25 3.291 1.861 3.405 3.727a4.403 4.403 0 0 0-1.032-.211 50.89 50.89 0 0 0-8.42 0c-2.358.196-4.04 2.19-4.04 4.434v4.286a4.47 4.47 0 0 0 2.433 3.984L7.28 21.53A.75.75 0 0 1 6 21v-4.03a48.527 48.527 0 0 1-1.087-.128C2.905 16.58 1.5 14.833 1.5 12.862V6.638c0-1.97 1.405-3.718 3.413-3.979Z" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
        )}
      </svg>
    ),
  },
  {
    href: '/post',
    label: 'Post',
    isSpecial: true,
    icon: () => (
      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-900 shadow-lg shadow-zinc-900/25 transition-transform active:scale-90">
        <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </div>
    ),
  },
  {
    href: '/scoreboard',
    label: 'Score',
    icon: (active: boolean) => (
      <svg className="h-[22px] w-[22px]" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 1.5}>
        {active ? (
          <path fillRule="evenodd" d="M5.166 2.621v.858c-1.035.148-2.059.33-3.071.543a.75.75 0 0 0-.584.859 6.753 6.753 0 0 0 6.138 5.6 6.73 6.73 0 0 0 2.743 1.346A6.707 6.707 0 0 1 9.279 15H8.54c-1.036 0-1.875.84-1.875 1.875V19.5h-.75a.75.75 0 0 0 0 1.5h12.17a.75.75 0 0 0 0-1.5h-.75v-2.625c0-1.036-.84-1.875-1.875-1.875h-.739a6.707 6.707 0 0 1-1.112-3.173 6.73 6.73 0 0 0 2.743-1.347 6.753 6.753 0 0 0 6.139-5.6.75.75 0 0 0-.585-.858 47.077 47.077 0 0 0-3.07-.543V2.62a.75.75 0 0 0-.658-.744 49.22 49.22 0 0 0-6.093-.377c-2.063 0-4.096.128-6.093.377a.75.75 0 0 0-.657.744Z" clipRule="evenodd" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .982-3.172M2.25 4.5a.75.75 0 0 1 .75-.75h1.5a3 3 0 0 1 3 3v.75M2.25 4.5v3.75c0 .414.336.75.75.75h3m-4.5-4.5h4.5m3.75 9.75a7.49 7.49 0 0 0 3.525-1.763M16.5 4.5A.75.75 0 0 1 17.25 3.75h1.5a3 3 0 0 0-3 3v.75m4.5-3.75v3.75c0 .414-.336.75-.75.75h-3m4.5-4.5h-4.5m-3.75 0v-.75a3 3 0 0 0-3-3h-1.5" />
        )}
      </svg>
    ),
  },
  {
    href: '/account',
    label: 'Profile',
    icon: (active: boolean) => (
      <svg className="h-[22px] w-[22px]" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 1.5}>
        {active ? (
          <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z" clipRule="evenodd" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
        )}
      </svg>
    ),
  },
]

export default function BottomNav() {
  const pathname = usePathname()
  const supabase = createClient()
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [fallbackText, setFallbackText] = useState<string>('?')

  useEffect(() => {
    async function fetchUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('avatar_url, full_name, username')
          .eq('id', user.id)
          .single()

        if (profile?.avatar_url) {
          setAvatarUrl(profile.avatar_url)
        } else if (user.user_metadata?.avatar_url) {
          setAvatarUrl(user.user_metadata.avatar_url)
        }

        setFallbackText(profile?.full_name || user.user_metadata?.full_name || profile?.username || user.email || '?')
      }
    }
    fetchUser()
  }, [supabase])

  return (
    <>
      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-100 bg-white/80 backdrop-blur-2xl backdrop-saturate-150 sm:hidden safe-area-bottom">
        <div className="mx-auto flex h-16 w-full max-w-md items-center justify-around px-1">
          {navItems.filter(item => !item.desktopOnly).map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center gap-0.5 rounded-2xl px-3 py-1.5 transition-all ${
                  item.isSpecial ? '' : isActive ? 'text-zinc-900' : 'text-slate-400 active:text-slate-600'
                }`}
              >
                {item.href === '/account' && (avatarUrl || fallbackText !== '?') ? (
                  <Avatar
                    src={avatarUrl}
                    fallbackText={fallbackText}
                    size="sm"
                    className={`h-7 w-7 ring-2 transition-all ${isActive ? 'ring-zinc-900' : 'ring-transparent'}`}
                  />
                ) : (
                  item.icon(isActive)
                )}
                {!item.isSpecial && (
                  <span className={`text-[10px] leading-tight ${isActive ? 'font-bold' : 'font-medium'}`}>
                    {item.label}
                  </span>
                )}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Desktop Sidebar */}
      <aside className="fixed bottom-0 left-0 top-0 z-50 hidden w-64 flex-col border-r border-slate-200/80 bg-white sm:flex">
        {/* Logo */}
        <div className="px-8 pb-2 pt-8">
          <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900">WebRizz</h1>
          <p className="mt-0.5 text-[11px] font-medium text-slate-400">Developer Community</p>
        </div>

        {/* Nav Items */}
        <nav className="mt-6 flex flex-1 flex-col gap-1 px-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center gap-4 rounded-xl px-4 py-3 transition-all ${
                  isActive
                    ? 'bg-zinc-900 font-bold text-white shadow-lg shadow-zinc-900/10'
                    : 'font-medium text-slate-600 hover:bg-slate-50 hover:text-zinc-900'
                }`}
              >
                <div>
                  {item.href === '/account' && (avatarUrl || fallbackText !== '?') ? (
                    <Avatar
                      src={avatarUrl}
                      fallbackText={fallbackText}
                      size="sm"
                      className={`h-7 w-7 ring-2 ${isActive ? 'ring-white/30' : 'ring-slate-200'}`}
                    />
                  ) : item.isSpecial ? (
                    isActive ? (
                      <svg className="h-[22px] w-[22px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                    ) : (
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-900 shadow-sm">
                        <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                      </div>
                    )
                  ) : (
                    item.icon(isActive)
                  )}
                </div>
                <span className="text-[15px]">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Desktop Logout */}
        {avatarUrl !== null && (
          <div className="border-t border-slate-100 px-4 py-4">
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="flex w-full items-center gap-4 rounded-xl px-4 py-2.5 text-left font-medium text-slate-500 transition-all hover:bg-red-50 hover:text-red-600"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                </svg>
                <span className="text-sm font-semibold">Log Out</span>
              </button>
            </form>
          </div>
        )}
      </aside>
    </>
  )
}
