'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import BottomNav from '@/components/BottomNav'
import Avatar from '@/components/Avatar'
import Link from 'next/link'
import ReelViewer from '@/components/ReelViewer'
import { type User } from '@supabase/supabase-js'

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

        const formattedReels = reelsData.map(r => ({
          ...r,
          profiles: Array.isArray(r.profiles) ? r.profiles[0] : r.profiles,
          likes_count: countMap[r.id] || 0,
          is_liked: likedSet.has(r.id)
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
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur-xl sm:hidden">
        <div className="w-8" /> {/* Spacer */}
        <h1 className="text-base font-bold tracking-wide text-zinc-900">
          {profile?.username || user.user_metadata?.username || 'Profile'}
        </h1>
        <Link href="/settings" className="flex h-8 w-8 items-center justify-end text-zinc-900 transition-opacity hover:opacity-70">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </Link>
      </header>

      <main className="mx-auto max-w-4xl pt-6 sm:px-6 sm:pt-12 lg:px-8">
        
        {/* Profile Details Section */}
        <div className="flex flex-col items-center px-4 sm:flex-row sm:items-start sm:gap-10 sm:px-0">
          
          {/* Avatar Profile */}
          <div className="mb-4 shrink-0 sm:mb-0">
            <Avatar
              src={profile?.avatar_url || user.user_metadata?.avatar_url}
              fallbackText={profile?.full_name || user.user_metadata?.full_name || user.email || '?'}
              size="lg"
              className="h-24 w-24 sm:h-36 sm:w-36 border border-slate-200 shadow-sm"
            />
          </div>

          {/* User Info & Stats */}
          <div className="flex w-full flex-1 flex-col items-center sm:items-start">
            
            {/* Desktop: Name & Settings Row */}
            <div className="flex w-full flex-col items-center gap-3 sm:flex-row sm:justify-start sm:gap-6">
              <h2 className="text-xl font-bold tracking-tight text-zinc-900 sm:text-2xl">
                {profile?.full_name || user.user_metadata?.full_name || 'Your Account'}
              </h2>
              <div className="hidden sm:block">
                <Link href="/settings" className="rounded-lg bg-slate-100 px-4 py-1.5 text-sm font-semibold text-zinc-900 transition-colors hover:bg-slate-200">
                  Edit Profile
                </Link>
              </div>
            </div>

            {/* Username Badge */}
            {(profile?.username || user.user_metadata?.username) && (
              <span className="mt-1 text-sm font-medium text-slate-500">
                @{profile?.username || user.user_metadata?.username}
              </span>
            )}

            {/* Mobile: Edit Profile Button */}
            <div className="mt-4 flex w-full justify-center sm:hidden">
              <Link href="/settings" className="w-full max-w-[250px] rounded-lg bg-slate-100 px-4 py-1.5 text-center text-sm font-semibold text-zinc-900 transition-colors hover:bg-slate-200">
                Edit Profile
              </Link>
            </div>

            {/* Stats Row */}
            <div className="mt-6 flex w-full justify-center gap-6 border-t border-slate-100 pt-4 sm:mt-6 sm:justify-start sm:gap-10 sm:border-none sm:pt-0">
              <div className="flex flex-col items-center sm:flex-row sm:gap-1.5">
                <span className="text-base font-bold text-zinc-900 sm:text-lg">{userReels.length}</span>
                <span className="text-sm text-slate-500">reels</span>
              </div>
              <div className="flex flex-col items-center sm:flex-row sm:gap-1.5">
                <span className="text-base font-bold text-zinc-900 sm:text-lg">{followersCount}</span>
                <span className="text-sm text-slate-500">followers</span>
              </div>
              <div className="flex flex-col items-center sm:flex-row sm:gap-1.5">
                <span className="text-base font-bold text-zinc-900 sm:text-lg">{followingCount}</span>
                <span className="text-sm text-slate-500">following</span>
              </div>
              {/* <div className="flex flex-col items-center sm:flex-row sm:gap-1.5">
                <span className="text-base font-bold text-zinc-900 sm:text-lg">{totalLikes}</span>
                <span className="text-sm text-slate-500">likes</span>
              </div> */}
            </div>

          </div>
        </div>

        {/* Tab Divider */}
        <div className="mt-8 border-t border-slate-200">
          <div className="flex justify-center sm:justify-start">
            <div className="flex items-center gap-2 border-t-2 border-zinc-900 px-1 py-4 text-xs font-bold uppercase tracking-widest text-zinc-900">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
              </svg>
              Reels
            </div>
          </div>
        </div>

        {/* User's Reels Grid */}
        <div className="pb-8">
          {userReels.length === 0 ? (
            <div className="mt-8 flex flex-col items-center justify-center rounded-2xl py-16 text-center sm:border sm:border-slate-200 sm:bg-slate-50">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border-2 border-zinc-900">
                <svg className="h-8 w-8 text-zinc-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-zinc-900">Share your first reel</h3>
              <p className="mt-2 text-sm text-slate-500">When you share reels, they will appear on your profile.</p>
              <Link href="/post" className="mt-6 rounded-lg bg-zinc-900 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800">
                Create Reel
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-[2px] sm:gap-4 md:grid-cols-4 lg:grid-cols-5">
              {userReels.map((reel) => (
                <div 
                  key={reel.id} 
                  className="group relative aspect-[9/16] cursor-pointer overflow-hidden bg-slate-100 sm:rounded-xl"
                  onClick={() => setSelectedReel(reel)}
                >
                  <video
                    src={reel.video_url}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    preload="metadata"
                    muted
                    playsInline
                  />
                  {/* Bottom Gradient for Legibility */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80" />
                  
                  <div className="absolute bottom-2 left-2 flex items-center gap-1.5 text-white">
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                    </svg>
                    <span className="text-sm font-semibold">{reel.likes_count}</span>
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
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black sm:bg-zinc-900/90 sm:backdrop-blur-sm"
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