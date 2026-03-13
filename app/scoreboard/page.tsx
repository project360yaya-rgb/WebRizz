'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import BottomNav from '@/components/BottomNav'
import Avatar from '@/components/Avatar'
import { calculateAllUsersPoints, type BadgeTier } from '@/lib/points'
import Link from 'next/link'

interface LeaderboardEntry {
  userId: string
  username: string
  full_name: string | null
  avatar_url: string | null
  totalPoints: number
  badge: BadgeTier
}

export default function ScoreboardPage() {
  const supabase = createClient()
  const router = useRouter()

  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    async function loadScoreboard() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setCurrentUserId(user.id)

      // Get all user points
      const allPoints = await calculateAllUsersPoints(supabase)

      // Get all profiles
      const userIds = Object.keys(allPoints)
      if (userIds.length === 0) {
        setLoading(false)
        return
      }

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .in('id', userIds)

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || [])

      // Build sorted leaderboard
      const leaderboard: LeaderboardEntry[] = userIds
        .map(userId => {
          const profile = profileMap.get(userId)
          const pts = allPoints[userId]
          return {
            userId,
            username: profile?.username || 'unknown',
            full_name: profile?.full_name || null,
            avatar_url: profile?.avatar_url || null,
            totalPoints: pts.totalPoints,
            badge: pts.badge,
          }
        })
        .filter(e => e.totalPoints > 0)
        .sort((a, b) => b.totalPoints - a.totalPoints)

      setEntries(leaderboard)
      setLoading(false)
    }

    loadScoreboard()
  }, [supabase, router])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white sm:ml-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-zinc-900" />
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-slate-50 pb-20 sm:ml-64 sm:pb-0">

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur-2xl sm:px-6">
        <h1 className="text-center text-base font-bold tracking-wide text-zinc-900 sm:text-left sm:text-xl">
          Scoreboard
        </h1>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6 sm:px-6">

        {/* Top 3 Podium */}
        {entries.length >= 3 && (
          <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/80">
            <div className="flex items-end justify-center gap-4 sm:gap-6">
              {/* 2nd Place */}
              <div className="flex flex-col items-center">
                <Link href={`/user/${entries[1].username}`} className="relative">
                  <Avatar
                    src={entries[1].avatar_url}
                    fallbackText={entries[1].full_name || entries[1].username}
                    size="md"
                    className="h-16 w-16 ring-2 ring-slate-300 sm:h-20 sm:w-20"
                  />
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-[10px] font-extrabold text-slate-600">2</span>
                </Link>
                <Link href={`/user/${entries[1].username}`} className="mt-3 max-w-[80px] truncate text-xs font-semibold text-zinc-900 hover:underline">
                  @{entries[1].username}
                </Link>
                <span className="text-[11px] font-medium text-slate-400">{entries[1].totalPoints} pts</span>
              </div>

              {/* 1st Place */}
              <div className="flex flex-col items-center -mt-6">
                <div className="mb-1.5 text-amber-400">
                  <svg className="h-7 w-7 drop-shadow-sm" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5z" />
                    <path d="M19 19H5a1 1 0 01 0-2h14a1 1 0 010 2z" />
                  </svg>
                </div>
                <Link href={`/user/${entries[0].username}`} className="relative">
                  <Avatar
                    src={entries[0].avatar_url}
                    fallbackText={entries[0].full_name || entries[0].username}
                    size="lg"
                    className="h-20 w-20 ring-[3px] ring-amber-400 shadow-lg shadow-amber-200/40 sm:h-24 sm:w-24"
                  />
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-[10px] font-extrabold text-white shadow-sm">1</span>
                </Link>
                <Link href={`/user/${entries[0].username}`} className="mt-3 max-w-[90px] truncate text-sm font-bold text-zinc-900 hover:underline">
                  @{entries[0].username}
                </Link>
                <span className={`mt-1 inline-flex items-center gap-1 rounded-full bg-linear-to-r ${entries[0].badge.color} px-2.5 py-0.5 text-[10px] font-bold ${entries[0].badge.textColor}`}>
                  {entries[0].badge.name}
                </span>
                <span className="text-[11px] font-medium text-slate-400">{entries[0].totalPoints} pts</span>
              </div>

              {/* 3rd Place */}
              <div className="flex flex-col items-center">
                <Link href={`/user/${entries[2].username}`} className="relative">
                  <Avatar
                    src={entries[2].avatar_url}
                    fallbackText={entries[2].full_name || entries[2].username}
                    size="md"
                    className="h-16 w-16 ring-2 ring-amber-700/30 sm:h-20 sm:w-20"
                  />
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex h-5 w-5 items-center justify-center rounded-full bg-amber-700/20 text-[10px] font-extrabold text-amber-800">3</span>
                </Link>
                <Link href={`/user/${entries[2].username}`} className="mt-3 max-w-[80px] truncate text-xs font-semibold text-zinc-900 hover:underline">
                  @{entries[2].username}
                </Link>
                <span className="text-[11px] font-medium text-slate-400">{entries[2].totalPoints} pts</span>
              </div>
            </div>
          </div>
        )}

        {/* Full Leaderboard List */}
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/80">
          {entries.length === 0 ? (
            <div className="py-16 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
                <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.982-3.172" />
                </svg>
              </div>
              <p className="text-sm font-medium text-slate-500">No activity yet</p>
              <p className="mt-1 text-xs text-slate-400">Watch reels, post, and comment to earn points!</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {entries.map((entry, index) => {
                const rank = index + 1
                const isMe = entry.userId === currentUserId
                return (
                  <Link
                    key={entry.userId}
                    href={isMe ? '/account' : `/user/${entry.username}`}
                    className={`flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-slate-50 ${isMe ? 'bg-blue-50/40' : ''}`}
                  >
                    <span className={`w-7 text-center text-sm font-extrabold ${rank <= 3 ? 'text-amber-500' : 'text-slate-300'}`}>
                      {rank}
                    </span>
                    <Avatar
                      src={entry.avatar_url}
                      fallbackText={entry.full_name || entry.username}
                      size="sm"
                      className="h-10 w-10"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold text-zinc-900">
                          {entry.full_name || entry.username}
                        </span>
                        {isMe && (
                          <span className="shrink-0 rounded-md bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-600">YOU</span>
                        )}
                      </div>
                      <span className="text-xs text-slate-500">@{entry.username}</span>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`inline-flex items-center rounded-full bg-linear-to-r ${entry.badge.color} px-2 py-0.5 text-[10px] font-bold ${entry.badge.textColor}`}>
                        {entry.badge.name}
                      </span>
                      <span className="text-xs font-medium text-slate-400">{entry.totalPoints} pts</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  )
}
