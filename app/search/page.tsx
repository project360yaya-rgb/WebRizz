'use client'

import { createClient } from '@/lib/supabase/client'
import { useState, useEffect } from 'react'
import BottomNav from '@/components/BottomNav'
import ReelViewer from '@/components/ReelViewer'
import Avatar from '@/components/Avatar'
import Link from 'next/link'
import { useDebounce } from 'use-debounce'
import { type User } from '@supabase/supabase-js'

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

export default function SearchPage() {
  const supabase = createClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery] = useDebounce(searchQuery, 400)

  interface ProfileResult {
    id: string
    username: string | null
    full_name: string | null
    avatar_url: string | null
  }

  const [results, setResults] = useState<Reel[]>([])
  const [profileResults, setProfileResults] = useState<ProfileResult[]>([])
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [currentUserAvatar, setCurrentUserAvatar] = useState<string | null>(null)
  const [selectedReel, setSelectedReel] = useState<Reel | null>(null)

  // Fetch current user for ReelViewer likes & avatars
  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCurrentUser(user)
        const { data: profile } = await supabase.from('profiles').select('avatar_url').eq('id', user.id).single()
        setCurrentUserAvatar(profile?.avatar_url || user.user_metadata?.avatar_url || null)
      }
    }
    loadUser()
  }, [supabase])

  // Search Algorithm
  useEffect(() => {
    async function performSearch() {
      if (!debouncedQuery.trim()) {
        setResults([])
        setProfileResults([])
        setHasSearched(false)
        return
      }

      setLoading(true)
      setHasSearched(true)

      const formattedQuery = `%${debouncedQuery}%`

      // 1. Fetch matching user profiles (for display AND for reel filtering)
      const { data: matchingProfiles } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .or(`username.ilike.${formattedQuery},full_name.ilike.${formattedQuery}`)
        .limit(10)

      setProfileResults(matchingProfiles || [])
      const matchingUserIds = matchingProfiles?.map(p => p.id) || []

      // Build the OR query string for the base table
      let baseOrQuery = `title.ilike.${formattedQuery},caption.ilike.${formattedQuery},category.ilike.${formattedQuery}`

      // If we found matching users, include them in the OR condition
      if (matchingUserIds.length > 0) {
        baseOrQuery += `,user_id.in.(${matchingUserIds.join(',')})`
      }

      // 2. Fetch reels matching title, caption, category, OR the user_ids we just found
      const { data: reelsData, error } = await supabase
        .from('reels')
        .select(`
          id,
          video_url,
          title,
          caption,
          category,
          created_at,
          user_id,
          profiles!inner (
            username,
            full_name,
            avatar_url
          )
        `)
        .or(baseOrQuery)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) {
        console.error('Search error:', error)
        setResults([])
        setLoading(false)
        return
      }

      if (!reelsData || reelsData.length === 0) {
        setResults([])
        setLoading(false)
        return
      }

      // 3. Fetch likes for results
      const reelIds = reelsData.map((r) => r.id)

      const { data: userLikes } = currentUser
        ? await supabase.from('likes').select('reel_id').eq('user_id', currentUser.id).in('reel_id', reelIds)
        : { data: [] }

      const { data: allLikes } = await supabase.from('likes').select('reel_id').in('reel_id', reelIds)

      const likedSet = new Set(userLikes?.map((l) => l.reel_id) || [])
      const countMap: Record<string, number> = {}
      allLikes?.forEach((l) => {
        countMap[l.reel_id] = (countMap[l.reel_id] || 0) + 1
      })

      // Fetch comment counts
      const { data: allComments } = reelIds.length > 0
        ? await supabase.from('comments').select('reel_id').in('reel_id', reelIds)
        : { data: [] }
      const commentsMap: Record<string, number> = {}
      allComments?.forEach((c) => {
        commentsMap[c.reel_id] = (commentsMap[c.reel_id] || 0) + 1
      })

      // 4. Format results precisely as ReelViewer expects
      const formattedResults = reelsData.map((r) => ({
        ...r,
        profiles: Array.isArray(r.profiles) ? r.profiles[0] : r.profiles,
        likes_count: countMap[r.id] || 0,
        is_liked: likedSet.has(r.id),
        comments_count: commentsMap[r.id] || 0,
      }))

      setResults(formattedResults)
      setLoading(false)
    }

    performSearch()
  }, [debouncedQuery, supabase, currentUser])

  return (
    <div className="relative min-h-dvh w-full bg-black sm:bg-slate-50 sm:ml-64">

      {/* Search Header */}
      <div className="fixed top-0 left-0 right-0 z-50 flex flex-col gap-2 bg-gradient-to-b from-black/90 via-black/60 to-transparent px-4 pb-6 pt-3 sm:left-64 sm:from-white sm:via-white sm:to-white/0 sm:border-b sm:border-slate-200 sm:bg-white sm:pb-4 sm:pt-6 sm:px-8">
        <h1 className="text-xl font-extrabold text-white tracking-tight sm:text-zinc-900 hidden sm:block sm:text-2xl sm:mb-1">Search</h1>
        <div className="relative flex w-full max-w-2xl items-center sm:max-w-xl">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
            <svg className="h-5 w-5 text-slate-400 sm:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </div>
          <input
            type="text"
            className="block w-full rounded-2xl border-0 bg-white/10 py-3 pl-11 pr-10 text-white placeholder-slate-300 backdrop-blur-md ring-1 ring-white/20 transition-all focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white sm:rounded-xl sm:bg-slate-100 sm:py-2.5 sm:text-sm sm:text-slate-900 sm:placeholder-slate-400 sm:ring-0 sm:focus:bg-white sm:focus:ring-2 sm:focus:ring-zinc-900"
            placeholder="Search by title, description, category, or username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoComplete="off"
            autoCorrect="off"
            spellCheck="false"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-300 hover:text-white sm:text-slate-400 sm:hover:text-slate-600 transition-colors"
            >
              <svg className="h-5 w-5 bg-white/10 sm:bg-slate-200 rounded-full p-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="min-h-dvh w-full">
        {!hasSearched ? (
          /* Empty Initial State */
          <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center text-white sm:text-zinc-900">
            <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-white/10 ring-1 ring-white/20 backdrop-blur-md sm:bg-slate-100 sm:ring-slate-200">
              <svg className="h-10 w-10 text-slate-300 sm:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Discover</h2>
            <p className="mt-2 text-sm text-slate-300 sm:text-slate-500 max-w-xs mx-auto">
              Find developer profiles and reels by searching for names, categories, and tags.
            </p>
          </div>
        ) : loading ? (
          /* Loading State */
          <div className="flex min-h-dvh items-center justify-center bg-black sm:bg-slate-50">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-white/20 border-t-white sm:border-slate-200 sm:border-t-zinc-900" />
          </div>
        ) : (profileResults.length > 0 || results.length > 0) ? (
          /* Results */
          <div className="pt-20 pb-20 px-2 sm:px-8 sm:pt-32 sm:pb-8">

            {/* User Profile Results */}
            {profileResults.length > 0 && (
              <div className="mb-6 px-1 sm:px-0">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 sm:text-slate-500 mb-3">Users</h3>
                <div className="flex gap-2.5 overflow-x-auto pb-2 sm:grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 sm:gap-3 sm:overflow-visible" style={{ scrollbarWidth: 'none' }}>
                  {profileResults.map((p) => (
                    <Link
                      key={p.id}
                      href={`/user/${p.username}`}
                      className="flex shrink-0 items-center gap-3 rounded-xl bg-white/10 p-3 ring-1 ring-white/10 backdrop-blur-md transition-all hover:bg-white/20 sm:bg-white sm:p-4 sm:ring-slate-200 sm:shadow-sm sm:hover:shadow-md sm:hover:ring-slate-300"
                    >
                      <Avatar
                        src={p.avatar_url}
                        fallbackText={p.full_name || p.username || '?'}
                        size="md"
                        className="border-2 border-white/20 sm:border-slate-200"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white sm:text-zinc-900 truncate">{p.full_name || 'User'}</p>
                        <p className="text-xs text-white/70 sm:text-slate-500 truncate">@{p.username || 'unknown'}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Reels section */}
            {results.length > 0 && currentUser && (
              <>
                {profileResults.length > 0 && (
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 sm:text-slate-500 mb-3 px-1 sm:px-0">Reels</h3>
                )}
                <p className="hidden sm:block text-sm text-slate-500 mb-4">{results.length} reel{results.length !== 1 ? 's' : ''} found</p>
              </>
            )}
            {results.length > 0 && currentUser && (
            <div className="grid grid-cols-3 gap-0.5 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {results.map((reel) => (
                <div
                  key={reel.id}
                  className="group relative aspect-9/16 cursor-pointer overflow-hidden bg-slate-800 sm:rounded-xl sm:bg-slate-200 sm:shadow-sm sm:ring-1 sm:ring-slate-200 sm:hover:ring-slate-300 sm:hover:shadow-md transition-all"
                  onClick={() => setSelectedReel(reel)}
                >
                  <video
                    src={reel.video_url}
                    className="h-full w-full object-cover transition-transform sm:group-hover:scale-105"
                    preload="metadata"
                    muted
                    playsInline
                  />
                  {/* Gradient overlay */}
                  <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/70 via-transparent to-transparent sm:opacity-0 sm:group-hover:opacity-100 transition-opacity" />
                  {/* Bottom info */}
                  <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-3">
                    <div className="flex items-center gap-1 text-white drop-shadow-md">
                      <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="m11.645 20.91-.007-.003-.022-.012a15.247 15.247 0 0 1-.383-.218 25.18 25.18 0 0 1-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0 1 12 5.052 5.5 5.5 0 0 1 16.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 0 1-4.244 3.17 15.247 15.247 0 0 1-.383.219l-.022.012-.007.004-.003.001a.752.752 0 0 1-.704 0l-.003-.001Z" />
                      </svg>
                      <span className="text-xs font-bold">{reel.likes_count}</span>
                    </div>
                    {reel.title && (
                      <p className="mt-1 text-xs font-semibold text-white line-clamp-1 drop-shadow-md hidden sm:block sm:group-hover:block">{reel.title}</p>
                    )}
                    <p className="text-[10px] text-white/80 line-clamp-1 drop-shadow-md hidden sm:block sm:group-hover:block">@{reel.profiles?.username || 'user'}</p>
                  </div>
                </div>
              ))}
            </div>
            )}
          </div>
        ) : (
          /* No Results Found State */
          <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center text-white sm:text-zinc-900">
            <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-white/5 ring-1 ring-white/10 sm:bg-slate-50 sm:ring-slate-200">
              <svg className="h-10 w-10 text-slate-400 sm:text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold">No results found</h2>
            <p className="mt-2 text-sm text-slate-400 sm:text-slate-500 max-w-sm">
              We couldn&apos;t find any users or reels matching &quot;{searchQuery}&quot;. Try searching for something else.
            </p>
          </div>
        )}
      </div>

      <BottomNav />

      {/* Reel Popup Modal */}
      {selectedReel && currentUser && (
        <div
          className="fixed inset-0 z-100 flex items-center justify-center bg-black sm:bg-black/80 sm:backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedReel(null)
          }}
        >
          {/* Close Button */}
          <button
            onClick={() => setSelectedReel(null)}
            className="absolute top-4 left-4 z-[110] flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md transition-colors hover:bg-black/60 sm:top-6 sm:right-6 sm:left-auto sm:bg-white/10 sm:hover:bg-white/20"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* ReelViewer container — full screen mobile, centered card on desktop */}
          <div className="h-[100dvh] w-full sm:h-[90vh] sm:max-h-[800px] sm:w-auto sm:aspect-9/16 sm:rounded-2xl sm:overflow-hidden sm:shadow-2xl bg-black">
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
