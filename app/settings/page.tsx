'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Avatar from '@/components/Avatar'

export default function SettingsPage() {
  const supabase = createClient()
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  
  useEffect(() => {
    async function fetchUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)
      
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      setProfile(profileData)
    }
    fetchUser()
  }, [supabase, router])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-slate-50 sm:ml-64 sm:bg-white">
      {/* Mobile Header */}
      <div className="sticky top-0 z-30 flex items-center border-b border-slate-200 bg-white/95 backdrop-blur-xl px-4 py-3 sm:hidden">
        <Link href="/account" className="flex h-8 w-8 items-center justify-center text-zinc-900 transition-opacity hover:opacity-70">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="ml-2 text-lg font-bold text-zinc-900">Settings</h1>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-6 sm:py-12">
        {/* Desktop Header */}
        <div className="mb-8 hidden items-center justify-between sm:flex">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900">Settings</h1>
            <p className="mt-2 text-sm text-slate-500">Manage your account settings and preferences.</p>
          </div>
          <Link href="/account" className="flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-zinc-900 transition-colors hover:bg-slate-200">
            Back to Profile
          </Link>
        </div>

        {/* Profile Card Summary */}
        <div className="mb-8 flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
           <Avatar
            src={profile?.avatar_url || user.user_metadata?.avatar_url}
            fallbackText={profile?.full_name || user.user_metadata?.full_name || user.email || '?'}
            size="md"
            className="ring-1 ring-slate-200"
          />
          <div>
            <h3 className="text-base font-bold text-zinc-900">{profile?.full_name || user.user_metadata?.full_name || 'Your Account'}</h3>
            <p className="text-sm text-slate-500">{user.email}</p>
          </div>
        </div>

        {/* Settings Sections */}
        <div className="space-y-6">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Account Details</h3>
            </div>
            <div className="divide-y divide-slate-100 px-5">
              <div className="flex items-center justify-between py-4">
                <span className="text-sm font-medium text-slate-600">Email Address</span>
                <span className="text-sm font-semibold text-zinc-900">{user.email}</span>
              </div>
              <div className="flex items-center justify-between py-4">
                <span className="text-sm font-medium text-slate-600">Member Since</span>
                <span className="text-sm font-semibold text-zinc-900">
                  {new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </span>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Preferences</h3>
            </div>
            <div className="divide-y divide-slate-100">
              <button className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-slate-50">
                <span className="text-sm font-semibold text-zinc-900">Edit Profile</span>
                <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <button className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-slate-50">
                <span className="text-sm font-semibold text-zinc-900">Notification Settings</span>
                <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Log Out action (desktop logout is in sidebar) */}
        <div className="mt-8 sm:hidden">
          <button
            onClick={handleSignOut}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 py-3.5 text-sm font-bold text-red-600 transition-all hover:bg-red-100 active:bg-red-200"
          >
            Log Out
          </button>
        </div>
      </div>
    </div>
  )
}
