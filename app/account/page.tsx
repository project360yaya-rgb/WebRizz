'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import BottomNav from '@/components/BottomNav'
import Avatar from '@/components/Avatar'
import Link from 'next/link'
import ReelViewer from '@/components/ReelViewer'
import { type User } from '@supabase/supabase-js'
import { calculateUserPoints, type PointsResult } from '@/lib/points'

interface Profile {
  id: string
  full_name: string | null
  username: string | null
  avatar_url: string | null
}

interface Reel {
  id: string
  video_url: string
  title: string | null
  caption: string
  category: string | null
  created_at: string
  user_id: string
  profiles: {
    username: string | null
    full_name: string | null
    avatar_url: string | null
  } | null
  likes_count: number
  is_liked: boolean
  comments_count: number
}

export default function AccountPage() {
  const supabase = createClient()
  const router = useRouter()
  
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [userReels, setUserReels] = useState<Reel[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedReel, setSelectedReel] = useState<Reel | null>(null)
  const [followersCount, setFollowersCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [totalLikes, setTotalLikes] = useState(0)
  const [pointsResult, setPointsResult] = useState<PointsResult | null>(null)

  useEffect(() => {
    async function fetchAccountData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)

      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      setProfile(profileData)

      // Fetch user's reels
      const { data: reelsData } = await supabase
        .from('reels')
        .select(`
          id,
          video_url,
          title,
          caption,
          category,
          created_at,
          user_id,
          profiles (
            username,
            full_name,
            avatar_url
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (reelsData) {
        const reelIds = reelsData.map(r => r.id)

        // Fetch like counts
        const { data: allLikes } = reelIds.length > 0
          ? await supabase.from('likes').select('reel_id').in('reel_id', reelIds)
          : { data: [] }

        const countMap: Record<string, number> = {}
        let likesTotal = 0
        allLikes?.forEach(l => {
          countMap[l.reel_id] = (countMap[l.reel_id] || 0) + 1
          likesTotal++
        })
        setTotalLikes(likesTotal)

        // Fetch current user's likes
        const { data: userLikes } = user && reelIds.length > 0
          ? await supabase.from('likes').select('reel_id').eq('user_id', user.id).in('reel_id', reelIds)
          : { data: [] }

        const likedSet = new Set(userLikes?.map(l => l.reel_id) || [])

        // Fetch comment counts
        const { data: allComments } = reelIds.length > 0
          ? await supabase.from('comments').select('reel_id').in('reel_id', reelIds)
          : { data: [] }

        const commentsMap: Record<string, number> = {}
        allComments?.forEach(c => {
          commentsMap[c.reel_id] = (commentsMap[c.reel_id] || 0) + 1
        })

        const formattedReels = reelsData.map(r => ({
          ...r,
          profiles: Array.isArray(r.profiles) ? r.profiles[0] : r.profiles,
          likes_count: countMap[r.id] || 0,
          is_liked: likedSet.has(r.id),
          comments_count: commentsMap[r.id] || 0,
        }))
        setUserReels(formattedReels)
      }

      // Fetch follow counts
      const { count: followers } = await supabase
        .from('follows')
        .select('follower_id', { count: 'exact', head: true })
        .eq('following_id', user.id)

      setFollowersCount(followers || 0)

      const { count: following } = await supabase
        .from('follows')
        .select('following_id', { count: 'exact', head: true })
        .eq('follower_id', user.id)

      setFollowingCount(following || 0)

      // Calculate points & badge
      const pts = await calculateUserPoints(supabase, user.id)
      setPointsResult(pts)

      setLoading(false)
    }

    fetchAccountData()
  }, [supabase, router])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-zinc-900" />
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="relative min-h-screen bg-white pb-20 sm:ml-64 sm:pb-0">

      {/* Mobile Sticky Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-100 bg-white/80 px-4 py-3 backdrop-blur-2xl sm:hidden">
        <Link href="/messages" className="flex h-8 w-8 items-center justify-start text-zinc-900 transition-opacity hover:opacity-70">
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
          </svg>
        </Link>
        <h1 className="text-base font-bold tracking-wide text-zinc-900">
          {profile?.username || user.user_metadata?.username || 'Profile'}
        </h1>
        <Link href="/settings" className="flex h-8 w-8 items-center justify-end text-zinc-900 transition-opacity hover:opacity-70">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </Link>
      </header>

      <main className="mx-auto max-w-4xl pt-8 sm:px-6 sm:pt-12 lg:px-8">

        {/* Profile Details Section */}
        <div className="flex flex-col items-center px-5 sm:flex-row sm:items-start sm:gap-10 sm:px-0">

          {/* Avatar */}
          <div className="mb-4 shrink-0 sm:mb-0">
            <Avatar
              src={profile?.avatar_url || user.user_metadata?.avatar_url}
              fallbackText={profile?.full_name || user.user_metadata?.full_name || user.email || '?'}
              size="lg"
              className="h-20 w-20 sm:h-36 sm:w-36 ring-2 ring-slate-100 shadow-sm"
            />
          </div>

          {/* User Info & Stats */}
          <div className="flex w-full flex-1 flex-col items-center sm:items-start">

            {/* Stats Row — mobile: above name, horizontal */}
            <div className="mb-3 flex w-full justify-center gap-8 sm:hidden">
              <div className="flex flex-col items-center">
                <span className="text-lg font-extrabold text-zinc-900">{userReels.length}</span>
                <span className="text-[11px] font-medium text-slate-500">reels</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-lg font-extrabold text-zinc-900">{followersCount}</span>
                <span className="text-[11px] font-medium text-slate-500">followers</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-lg font-extrabold text-zinc-900">{followingCount}</span>
                <span className="text-[11px] font-medium text-slate-500">following</span>
              </div>
            </div>

            {/* Name & Edit */}
            <div className="flex w-full flex-col items-center gap-3 sm:flex-row sm:justify-start sm:gap-6">
              <h2 className="text-xl font-extrabold tracking-tight text-zinc-900 sm:text-2xl">
                {profile?.full_name || user.user_metadata?.full_name || 'Your Account'}
              </h2>
              <div className="hidden sm:flex sm:gap-2">
                <Link href="/settings" className="rounded-xl bg-slate-100 px-5 py-1.5 text-sm font-semibold text-zinc-900 transition-colors hover:bg-slate-200">
                  Edit Profile
                </Link>
              </div>
            </div>

            {/* Username */}
            {(profile?.username || user.user_metadata?.username) && (
              <span className="mt-0.5 text-sm font-medium text-slate-500">
                @{profile?.username || user.user_metadata?.username}
              </span>
            )}

            {/* Level Badge */}
            {pointsResult && (
              <div className="mt-2.5 flex items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r ${pointsResult.badge.color} px-3 py-1 text-xs font-bold tracking-wide ${pointsResult.badge.textColor} ${pointsResult.badge.glow ? `shadow-lg ${pointsResult.badge.glow}` : ''}`}>
                  <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                  </svg>
                  {pointsResult.badge.name}
                </span>
                <span className="text-xs font-medium text-slate-400">{pointsResult.totalPoints} pts</span>
              </div>
            )}

            {/* Mobile: Edit Profile Button */}
            <div className="mt-4 flex w-full gap-2 sm:hidden">
              <Link href="/settings" className="flex-1 rounded-xl bg-slate-100 px-4 py-2 text-center text-sm font-semibold text-zinc-900 transition-colors hover:bg-slate-200 active:bg-slate-300">
                Edit Profile
              </Link>
              <Link href="/messages" className="flex items-center justify-center rounded-xl bg-slate-100 px-3 py-2 text-zinc-900 transition-colors hover:bg-slate-200 active:bg-slate-300 sm:hidden">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
                </svg>
              </Link>
            </div>

            {/* Desktop Stats Row */}
            <div className="mt-6 hidden w-full gap-10 sm:flex">
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg font-extrabold text-zinc-900">{userReels.length}</span>
                <span className="text-sm text-slate-500">reels</span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg font-extrabold text-zinc-900">{followersCount}</span>
                <span className="text-sm text-slate-500">followers</span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg font-extrabold text-zinc-900">{followingCount}</span>
                <span className="text-sm text-slate-500">following</span>
              </div>
            </div>

          </div>
        </div>

        {/* Tab Divider */}
        <div className="mt-8 border-t border-slate-200">
          <div className="flex justify-center sm:justify-start">
            <div className="flex items-center gap-2 border-t-2 border-zinc-900 px-1 py-3.5 text-xs font-bold uppercase tracking-widest text-zinc-900">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
              </svg>
              Reels
            </div>
          </div>
        </div>

        {/* User's Reels Grid */}
        <div className="pb-8">
          {userReels.length === 0 ? (
            <div className="mt-8 flex flex-col items-center justify-center rounded-2xl py-16 text-center sm:border sm:border-slate-200 sm:bg-slate-50/50">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                <svg className="h-7 w-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-zinc-900">Share your first reel</h3>
              <p className="mt-1.5 max-w-xs text-sm text-slate-500">When you share reels, they will appear on your profile.</p>
              <Link href="/post" className="mt-6 rounded-xl bg-zinc-900 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-zinc-900/10 transition-all hover:bg-zinc-800 active:scale-[0.98]">
                Create Reel
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-px bg-slate-200/50 sm:gap-3 sm:bg-transparent md:grid-cols-4 lg:grid-cols-5">
              {userReels.map((reel) => (
                <div
                  key={reel.id}
                  className="group relative aspect-[9/16] cursor-pointer overflow-hidden bg-slate-100 sm:rounded-xl sm:ring-1 sm:ring-slate-200 sm:hover:ring-slate-300 sm:shadow-sm sm:hover:shadow-md transition-all"
                  onClick={() => setSelectedReel(reel)}
                >
                  <video
                    src={reel.video_url}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    preload="metadata"
                    muted
                    playsInline
                  />
                  <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100 sm:opacity-0" />
                  <div className="absolute inset-0 bg-linear-to-t from-black/50 via-transparent to-transparent sm:from-transparent" />

                  <div className="absolute bottom-2 left-2 flex items-center gap-1.5 text-white drop-shadow-md">
                    <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                    </svg>
                    <span className="text-xs font-bold">{reel.likes_count}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <BottomNav />

      {/* Reel Popup Modal */}
      {selectedReel && user && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black sm:bg-black/80 sm:backdrop-blur-md"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedReel(null)
          }}
        >
          <button
            onClick={() => setSelectedReel(null)}
            className="absolute left-4 top-4 z-[110] flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md transition-colors hover:bg-black/60 sm:left-auto sm:right-6 sm:top-6 sm:bg-white/10 sm:hover:bg-white/20"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="h-[100dvh] w-full bg-black sm:aspect-[9/16] sm:h-[90vh] sm:max-h-[850px] sm:w-auto sm:overflow-hidden sm:rounded-2xl sm:shadow-2xl">
            <ReelViewer
              initialReels={[selectedReel]}
              currentUserId={user.id}
              currentUserAvatar={profile?.avatar_url || user.user_metadata?.avatar_url}
            />
          </div>
        </div>
      )}

    </div>
  )
}