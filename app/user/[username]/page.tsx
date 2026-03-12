'use client'

import { createClient } from '@/lib/supabase/client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { type User } from '@supabase/supabase-js'
import BottomNav from '@/components/BottomNav'
import Avatar from '@/components/Avatar'
import ReelViewer from '@/components/ReelViewer'
import Link from 'next/link'

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

export default function UserProfilePage() {
  const { username } = useParams<{ username: string }>()
  const supabase = createClient()
  const router = useRouter()

  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [currentUserAvatar, setCurrentUserAvatar] = useState<string | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [userReels, setUserReels] = useState<Reel[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [selectedReel, setSelectedReel] = useState<Reel | null>(null)

  // Follow state
  const [isFollowing, setIsFollowing] = useState(false)
  const [followersCount, setFollowersCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [totalLikes, setTotalLikes] = useState(0)

  useEffect(() => {
    async function loadProfile() {
      // 1. Fetch current user (may be null if not logged in)
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCurrentUser(user)
        const { data: myProfile } = await supabase.from('profiles').select('avatar_url').eq('id', user.id).single()
        setCurrentUserAvatar(myProfile?.avatar_url || user.user_metadata?.avatar_url || null)
      }

      // 2. Fetch target profile by username
      const decodedUsername = decodeURIComponent(username)
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url')
        .eq('username', decodedUsername)
        .single()

      if (profileError || !profileData) {
        setNotFound(true)
        setLoading(false)
        return
      }

      // 3. If this is the current user's profile, redirect to /account
      if (user && profileData.id === user.id) {
        router.replace('/account')
        return
      }

      setProfile(profileData)

      // 4. Fetch user's reels
      const { data: reelsData } = await supabase
        .from('reels')
        .select(`
          id, video_url, title, caption, category, created_at, user_id,
          profiles (username, full_name, avatar_url)
        `)
        .eq('user_id', profileData.id)
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

        setUserReels(reelsData.map(r => ({
          ...r,
          profiles: Array.isArray(r.profiles) ? r.profiles[0] : r.profiles,
          likes_count: countMap[r.id] || 0,
          is_liked: likedSet.has(r.id),
        })))
      }

      // 5. Fetch follow counts
      const { count: followers } = await supabase
        .from('follows')
        .select('follower_id', { count: 'exact', head: true })
        .eq('following_id', profileData.id)

      setFollowersCount(followers || 0)

      const { count: following } = await supabase
        .from('follows')
        .select('following_id', { count: 'exact', head: true })
        .eq('follower_id', profileData.id)

      setFollowingCount(following || 0)

      // 6. Check if current user follows this profile
      if (user) {
        const { data: followData } = await supabase
          .from('follows')
          .select('follower_id')
          .eq('follower_id', user.id)
          .eq('following_id', profileData.id)
          .single()

        setIsFollowing(!!followData)
      }

      setLoading(false)
    }

    loadProfile()
  }, [supabase, username, router])

  // Follow/Unfollow toggle (optimistic update)
  async function toggleFollow() {
    if (!currentUser || !profile) return

    // Optimistic update
    setIsFollowing(prev => !prev)
    setFollowersCount(prev => isFollowing ? prev - 1 : prev + 1)

    if (isFollowing) {
      await supabase.from('follows').delete().eq('follower_id', currentUser.id).eq('following_id', profile.id)
    } else {
      await supabase.from('follows').insert({ follower_id: currentUser.id, following_id: profile.id })
    }
  }

  const isLoggedIn = !!currentUser

  if (loading) {
    return (
      <div className={`flex h-screen items-center justify-center bg-white ${isLoggedIn ? 'sm:ml-64' : ''}`}>
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-zinc-900" />
      </div>
    )
  }

  if (notFound) {
    return (
      <div className={`flex min-h-screen flex-col items-center justify-center bg-white ${isLoggedIn ? 'sm:ml-64' : ''}`}>
        <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full border-2 border-slate-100 bg-slate-50">
          <svg className="h-10 w-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold tracking-tight text-zinc-900">User not found</h2>
        <p className="mt-2 text-sm text-slate-500">@{decodeURIComponent(username)} doesn&apos;t exist.</p>
        <Link href="/login" className="mt-6 rounded-lg bg-zinc-900 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800">
          Log In
        </Link>
        {isLoggedIn && <BottomNav />}
      </div>
    )
  }

  if (!profile) return null

  return (
    <div className={`relative min-h-screen bg-white pb-20 sm:pb-0 ${isLoggedIn ? 'sm:ml-64' : ''}`}>
      
      {/* Mobile Sticky Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur-xl sm:hidden">
        <button onClick={() => router.back()} className="flex h-8 w-8 items-center justify-start text-zinc-900 hover:opacity-70">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <h1 className="text-base font-bold tracking-wide text-zinc-900">
          {profile.username}
        </h1>
        <div className="w-8" /> {/* Spacer to center the title */}
      </header>

      {/* Login banner for unauthenticated visitors */}
      {!isLoggedIn && (
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-center sm:px-8">
          <p className="text-sm text-slate-600">
            <Link href="/login" className="font-bold text-zinc-900 hover:underline">Log in</Link>
            {' '}or{' '}
            <Link href="/signup" className="font-bold text-zinc-900 hover:underline">sign up</Link>
            {' '}to follow users and watch reels.
          </p>
        </div>
      )}

      <main className="mx-auto max-w-4xl pt-6 sm:px-6 sm:pt-12 lg:px-8">
        
        {/* Desktop Back Button */}
        <div className={`mb-6 hidden px-4 sm:block sm:px-0 ${!isLoggedIn ? 'pt-4' : ''}`}>
          <button onClick={() => router.back()} className="flex items-center gap-2 text-sm font-semibold text-slate-500 transition-colors hover:text-zinc-900">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            Back
          </button>
        </div>

        {/* Profile Details Section */}
        <div className="flex flex-col items-center px-4 sm:flex-row sm:items-start sm:gap-10 sm:px-0">
          
          {/* Avatar Profile */}
          <div className="mb-4 shrink-0 sm:mb-0">
            <Avatar
              src={profile.avatar_url}
              fallbackText={profile.full_name || profile.username || '?'}
              size="lg"
              className="h-24 w-24 border border-slate-200 shadow-sm sm:h-36 sm:w-36"
            />
          </div>

          {/* User Info & Stats */}
          <div className="flex w-full flex-1 flex-col items-center sm:items-start">
            
            {/* Desktop: Name & Follow Button Row */}
            <div className="flex w-full flex-col items-center gap-3 sm:flex-row sm:justify-start sm:gap-6">
              <h2 className="text-xl font-bold tracking-tight text-zinc-900 sm:text-2xl">
                {profile.full_name || 'User'}
              </h2>
              
              <div className="hidden sm:block">
                {currentUser ? (
                  <button
                    onClick={toggleFollow}
                    className={`rounded-lg px-6 py-1.5 text-sm font-semibold transition-all ${
                      isFollowing
                        ? 'border border-slate-300 bg-white text-zinc-900 hover:border-slate-400 hover:bg-slate-50'
                        : 'bg-zinc-900 text-white hover:bg-zinc-800'
                    }`}
                  >
                    {isFollowing ? 'Following' : 'Follow'}
                  </button>
                ) : (
                  <Link href="/login" className="rounded-lg bg-zinc-900 px-6 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800">
                    Log in to follow
                  </Link>
                )}
              </div>
            </div>

            {/* Username Badge */}
            <span className="mt-1 text-sm font-medium text-slate-500">
              @{profile.username}
            </span>

            {/* Mobile: Follow Button */}
            <div className="mt-4 flex w-full justify-center sm:hidden">
              {currentUser ? (
                <button
                  onClick={toggleFollow}
                  className={`w-full max-w-[250px] rounded-lg py-1.5 text-center text-sm font-semibold transition-all ${
                    isFollowing
                      ? 'border border-slate-300 bg-white text-zinc-900 hover:border-slate-400 hover:bg-slate-50'
                      : 'bg-zinc-900 text-white hover:bg-zinc-800'
                  }`}
                >
                  {isFollowing ? 'Following' : 'Follow'}
                </button>
              ) : (
                <Link href="/login" className="w-full max-w-[250px] rounded-lg bg-zinc-900 py-1.5 text-center text-sm font-semibold text-white transition-colors hover:bg-zinc-800">
                  Log in to follow
                </Link>
              )}
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
              <h3 className="text-xl font-bold text-zinc-900">No reels yet</h3>
              <p className="mt-2 text-sm text-slate-500">@{profile.username} hasn&apos;t posted anything here yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-[2px] sm:gap-4 md:grid-cols-4 lg:grid-cols-5">
              {userReels.map((reel) => (
                <div
                  key={reel.id}
                  className="group relative aspect-[9/16] cursor-pointer overflow-hidden bg-slate-100 sm:rounded-xl"
                  onClick={() => isLoggedIn ? setSelectedReel(reel) : router.push('/login')}
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

      {isLoggedIn && <BottomNav />}

      {/* Reel Popup Modal (only for logged-in users) */}
      {selectedReel && currentUser && (
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
              currentUserId={currentUser.id}
              currentUserAvatar={currentUserAvatar}
            />
          </div>
        </div>
      )}
    </div>
  )
}