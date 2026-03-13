'use client'

import { createClient } from '@/lib/supabase/client'
import { useCallback, useEffect, useRef, useState, memo } from 'react'
import Avatar from '@/components/Avatar'
import Link from 'next/link'

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

interface Comment {
  id: string
  content: string
  created_at: string
  user_id: string
  profiles: {
    username: string | null
    avatar_url: string | null
    full_name: string | null
  } | null
}

interface ReelViewerProps {
  initialReels: Reel[]
  currentUserId: string
  currentUserAvatar?: string | null
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d`
  const weeks = Math.floor(days / 7)
  return `${weeks}w`
}

// Memoized individual reel item to prevent re-renders when other reels change
const ReelItem = memo(function ReelItem({
  reel,
  index,
  isActive,
  isNear,
  isMuted,
  currentUserId,
  currentUserAvatar,
  likeAnimation,
  videoRef,
  onToggleLike,
  onVideoTap,
  onOpenComments,
  onShare,
  onTimeUpdate,
}: {
  reel: Reel
  index: number
  isActive: boolean
  isNear: boolean // within ±2 of active
  isMuted: boolean
  currentUserId: string
  currentUserAvatar?: string | null
  likeAnimation: boolean
  videoRef: (el: HTMLVideoElement | null) => void
  onToggleLike: (reelId: string, currentlyLiked: boolean) => void
  onVideoTap: (index: number, reelId: string, isLiked: boolean) => void
  onOpenComments: (reelId: string) => void
  onShare: (reel: Reel) => void
  onTimeUpdate: (reel: Reel, video: HTMLVideoElement) => void
}) {
  // Determine preload strategy
  const preload = isActive ? 'auto' : isNear ? 'metadata' : 'none'

  return (
    <div
      data-index={index}
      className="relative mx-auto flex h-[100dvh] w-full max-w-[450px] snap-start snap-always flex-col justify-center sm:aspect-[9/16] sm:h-auto sm:max-h-[100dvh] sm:py-4"
      onClick={() => onVideoTap(index, reel.id, reel.is_liked)}
    >
      <div className="relative h-full w-full overflow-hidden sm:rounded-2xl sm:shadow-2xl">
        {/* Video - only render src when near active */}
        <video
          ref={videoRef}
          src={isNear ? reel.video_url : undefined}
          className="absolute inset-0 h-full w-full object-cover"
          loop
          muted={isMuted}
          playsInline
          preload={preload}
          onTimeUpdate={isActive ? (e) => onTimeUpdate(reel, e.currentTarget) : undefined}
        />

        {/* Sound Indicator */}
        <div className="absolute right-4 top-4 z-10 rounded-full bg-black/40 p-2 backdrop-blur-md">
          {isMuted ? (
            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75 19.5 12m0 0 2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6 4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
            </svg>
          ) : (
            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
            </svg>
          )}
        </div>

        {/* Gradient overlays */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60" />

        {/* Like animation */}
        {likeAnimation && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <svg
              className="h-24 w-24 text-white animate-like-pop drop-shadow-lg"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="m11.645 20.91-.007-.003-.022-.012a15.247 15.247 0 0 1-.383-.218 25.18 25.18 0 0 1-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0 1 12 5.052 5.5 5.5 0 0 1 16.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 0 1-4.244 3.17 15.247 15.247 0 0 1-.383.219l-.022.012-.007.004-.003.001a.752.752 0 0 1-.704 0l-.003-.001Z" />
            </svg>
          </div>
        )}

        {/* Right sidebar — actions */}
        <div className="absolute bottom-24 right-3 flex flex-col items-center gap-5">
          {/* Like */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggleLike(reel.id, reel.is_liked)
            }}
            className="flex flex-col items-center gap-1"
          >
            <div className={`transition-transform active:scale-125 ${reel.is_liked ? 'text-red-500' : 'text-white'}`}>
              <svg className="h-7 w-7 drop-shadow-lg" viewBox="0 0 24 24" fill={reel.is_liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={reel.is_liked ? 0 : 2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m11.645 20.91-.007-.003-.022-.012a15.247 15.247 0 0 1-.383-.218 25.18 25.18 0 0 1-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0 1 12 5.052 5.5 5.5 0 0 1 16.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 0 1-4.244 3.17 15.247 15.247 0 0 1-.383.219l-.022.012-.007.004-.003.001a.752.752 0 0 1-.704 0l-.003-.001Z" />
              </svg>
            </div>
            <span className="text-xs font-semibold text-white drop-shadow-lg">{reel.likes_count}</span>
          </button>

          {/* Comment */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onOpenComments(reel.id)
            }}
            className="flex flex-col items-center gap-1"
          >
            <svg className="h-7 w-7 text-white drop-shadow-lg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 0 1-.923 1.785A5.969 5.969 0 0 0 6 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337Z" />
            </svg>
            <span className="text-xs font-semibold text-white drop-shadow-lg">{reel.comments_count}</span>
          </button>

          {/* Share */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onShare(reel)
            }}
            className="flex flex-col items-center gap-1"
          >
            <svg className="h-7 w-7 text-white drop-shadow-lg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
            </svg>
            <span className="text-xs font-semibold text-white drop-shadow-lg">Share</span>
          </button>
        </div>

        {/* Bottom info overlay */}
        <div className="absolute bottom-16 left-0 right-14 p-4">
          <div className="mb-2 flex items-center gap-3">
            {(() => {
              const avatarSrc = reel.profiles?.avatar_url || (reel.user_id === currentUserId ? currentUserAvatar : null)
              const fallbackText = reel.profiles?.full_name || reel.profiles?.username || '?'
              const profileHref = reel.profiles?.username ? `/user/${reel.profiles.username}` : '#'

              return (
                <Link href={profileHref} onClick={(e) => e.stopPropagation()}>
                  <Avatar
                    src={avatarSrc}
                    fallbackText={fallbackText}
                    size="md"
                    className="border-2 border-white/30"
                  />
                </Link>
              )
            })()}
            <div className="flex flex-col">
              <Link
                href={reel.profiles?.username ? `/user/${reel.profiles.username}` : '#'}
                onClick={(e) => e.stopPropagation()}
                className="text-sm font-bold text-white drop-shadow-lg hover:underline"
              >
                @{reel.profiles?.username || 'user'}
              </Link>
              {reel.category && (
                <span className="inline-flex items-center rounded-full bg-white/20 px-2 py-0.5 mt-0.5 text-[10px] font-medium text-white backdrop-blur-md self-start border border-white/10">
                  {reel.category}
                </span>
              )}
            </div>
          </div>

          {reel.title && (
            <h3 className="mb-1 text-base font-bold text-white drop-shadow-lg line-clamp-1">
              {reel.title}
            </h3>
          )}

          {reel.caption && (
            <p className="text-sm text-white/90 drop-shadow-lg line-clamp-2 leading-snug">
              {reel.caption}
            </p>
          )}
        </div>

      </div>
    </div>
  )
})

export default function ReelViewer({ initialReels, currentUserId, currentUserAvatar }: ReelViewerProps) {
  const supabase = createClient()
  const [reels, setReels] = useState<Reel[]>(initialReels)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [likeAnimations, setLikeAnimations] = useState<Record<string, boolean>>({})
  const [isMuted, setIsMuted] = useState(true)
  const videoRefs = useRef<Record<number, HTMLVideoElement | null>>({})

  // Watch tracking
  const watchedTiers = useRef<Record<string, number>>({})
  // Throttle ref for timeupdate
  const lastTimeUpdateRef = useRef<number>(0)

  // Comments
  const [commentReelId, setCommentReelId] = useState<string | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [commentText, setCommentText] = useState('')
  const [loadingComments, setLoadingComments] = useState(false)
  const [postingComment, setPostingComment] = useState(false)

  const PAGE_SIZE = 5

  // Fetch more reels
  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return
    setLoading(true)

    const from = page * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

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
        profiles (
          username,
          full_name,
          avatar_url
        )
      `)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error || !reelsData || reelsData.length === 0) {
      setHasMore(false)
      setLoading(false)
      return
    }

    const reelIds = reelsData.map((r) => r.id)
    const { data: likesData } = await supabase
      .from('likes')
      .select('reel_id')
      .eq('user_id', currentUserId)
      .in('reel_id', reelIds)

    const likedReelIds = new Set(likesData?.map((l) => l.reel_id) || [])

    const { data: countsData } = await supabase
      .from('likes')
      .select('reel_id')
      .in('reel_id', reelIds)

    const countMap: Record<string, number> = {}
    countsData?.forEach((l) => {
      countMap[l.reel_id] = (countMap[l.reel_id] || 0) + 1
    })

    const { data: commentsCountData } = await supabase
      .from('comments')
      .select('reel_id')
      .in('reel_id', reelIds)

    const commentsCountMap: Record<string, number> = {}
    commentsCountData?.forEach((c) => {
      commentsCountMap[c.reel_id] = (commentsCountMap[c.reel_id] || 0) + 1
    })

    const formattedReels: Reel[] = reelsData.map((r) => ({
      id: r.id,
      video_url: r.video_url,
      title: r.title,
      caption: r.caption,
      category: r.category,
      created_at: r.created_at,
      user_id: r.user_id,
      profiles: Array.isArray(r.profiles) ? r.profiles[0] : r.profiles,
      likes_count: countMap[r.id] || 0,
      is_liked: likedReelIds.has(r.id),
      comments_count: commentsCountMap[r.id] || 0,
    }))

    setReels((prev) => [...prev, ...formattedReels])
    setPage((prev) => prev + 1)
    if (reelsData.length < PAGE_SIZE) setHasMore(false)
    setLoading(false)
  }, [loading, hasMore, page, supabase, currentUserId])

  // Intersection observer for infinite scroll + active index
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = Number(entry.target.getAttribute('data-index'))
            setActiveIndex(index)

            if (index >= reels.length - 2) {
              loadMore()
            }
          }
        })
      },
      { root: container, threshold: 0.6 }
    )

    const items = container.querySelectorAll('[data-index]')
    items.forEach((item) => observer.observe(item))

    return () => observer.disconnect()
  }, [reels.length, loadMore])

  // Play/pause videos based on active index & clean up far-away videos
  useEffect(() => {
    Object.entries(videoRefs.current).forEach(([key, video]) => {
      const idx = Number(key)
      if (!video) return
      if (idx === activeIndex) {
        video.play().catch(() => {})
      } else {
        video.pause()
        // Reset far-away videos to free memory
        if (Math.abs(idx - activeIndex) > 2) {
          video.removeAttribute('src')
          video.load()
        }
      }
    })
  }, [activeIndex])

  // Throttled watch progress tracking (runs at most once per 500ms)
  const handleTimeUpdate = useCallback((reel: Reel, video: HTMLVideoElement) => {
    const now = performance.now()
    if (now - lastTimeUpdateRef.current < 500) return
    lastTimeUpdateRef.current = now

    if (!video.duration || reel.user_id === currentUserId) return

    const percentage = (video.currentTime / video.duration) * 100
    let tier = 0
    if (percentage >= 100) tier = 30
    else if (percentage >= 75) tier = 20
    else if (percentage >= 50) tier = 15
    else if (percentage >= 25) tier = 5

    if (tier <= 0) return

    const currentTier = watchedTiers.current[reel.id] || 0
    if (tier <= currentTier) return

    watchedTiers.current[reel.id] = tier
    supabase
      .from('reel_watches')
      .upsert({ user_id: currentUserId, reel_id: reel.id, watch_tier: tier }, { onConflict: 'user_id,reel_id' })
      .then(() => {})
  }, [currentUserId, supabase])

  // Toggle like
  const toggleLike = useCallback(async (reelId: string, currentlyLiked: boolean) => {
    setReels((prev) =>
      prev.map((r) =>
        r.id === reelId
          ? {
              ...r,
              is_liked: !currentlyLiked,
              likes_count: currentlyLiked ? r.likes_count - 1 : r.likes_count + 1,
            }
          : r
      )
    )

    if (!currentlyLiked) {
      setLikeAnimations((prev) => ({ ...prev, [reelId]: true }))
      setTimeout(() => {
        setLikeAnimations((prev) => ({ ...prev, [reelId]: false }))
      }, 800)
    }

    if (currentlyLiked) {
      await supabase.from('likes').delete().eq('user_id', currentUserId).eq('reel_id', reelId)
    } else {
      await supabase.from('likes').insert({ user_id: currentUserId, reel_id: reelId })
    }
  }, [supabase, currentUserId])

  // Double tap to like
  const lastTap = useRef<Record<string, number>>({})

  const handleVideoTap = useCallback((index: number, reelId: string, isLiked: boolean) => {
    const last = lastTap.current[reelId] || 0
    const now = Date.now()

    if (now - last < 300) {
      // Double tap
      if (!isLiked) {
        toggleLike(reelId, false)
      } else {
        setLikeAnimations((prev) => ({ ...prev, [reelId]: true }))
        setTimeout(() => {
          setLikeAnimations((prev) => ({ ...prev, [reelId]: false }))
        }, 800)
      }
      lastTap.current[reelId] = 0
      return
    }

    lastTap.current[reelId] = now

    // Single tap — toggle mute after a small delay
    setTimeout(() => {
      if (lastTap.current[reelId] === now) {
        setIsMuted((prev) => !prev)
      }
    }, 300)
  }, [toggleLike])

  // Share
  const handleShare = useCallback(async (reel: Reel) => {
    supabase
      .from('shares')
      .upsert({ user_id: currentUserId, reel_id: reel.id }, { onConflict: 'user_id,reel_id' })
      .then(() => {})

    if (navigator.share) {
      await navigator.share({
        title: `Reel by @${reel.profiles?.username || 'user'}`,
        text: reel.caption,
        url: window.location.origin + '/reel/' + reel.id,
      }).catch(() => {})
    } else {
      await navigator.clipboard.writeText(window.location.origin + '/reel/' + reel.id)
    }
  }, [supabase, currentUserId])

  // Comments
  const openComments = useCallback(async (reelId: string) => {
    setCommentReelId(reelId)
    setLoadingComments(true)
    setComments([])

    const { data } = await supabase
      .from('comments')
      .select('id, content, created_at, user_id, profiles(username, avatar_url, full_name)')
      .eq('reel_id', reelId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (data) {
      setComments(data.map(c => ({
        ...c,
        profiles: Array.isArray(c.profiles) ? c.profiles[0] : c.profiles,
      })))
    }
    setLoadingComments(false)
  }, [supabase])

  async function postComment() {
    if (!commentText.trim() || !commentReelId || postingComment) return
    setPostingComment(true)

    const { data, error } = await supabase
      .from('comments')
      .insert({ user_id: currentUserId, reel_id: commentReelId, content: commentText.trim() })
      .select('id, content, created_at, user_id, profiles(username, avatar_url, full_name)')
      .single()

    if (!error && data) {
      const newComment: Comment = {
        ...data,
        profiles: Array.isArray(data.profiles) ? data.profiles[0] : data.profiles,
      }
      setComments(prev => [newComment, ...prev])
      setReels(prev => prev.map(r => r.id === commentReelId ? { ...r, comments_count: r.comments_count + 1 } : r))
    }
    setCommentText('')
    setPostingComment(false)
  }

  async function deleteComment(commentId: string) {
    const comment = comments.find(c => c.id === commentId)
    if (!comment || comment.user_id !== currentUserId) return

    setComments(prev => prev.filter(c => c.id !== commentId))
    if (commentReelId) {
      setReels(prev => prev.map(r => r.id === commentReelId ? { ...r, comments_count: Math.max(0, r.comments_count - 1) } : r))
    }

    await supabase.from('comments').delete().eq('id', commentId)
  }

  // Stable video ref callback factory
  const getVideoRef = useCallback((index: number) => {
    return (el: HTMLVideoElement | null) => {
      videoRefs.current[index] = el
    }
  }, [])

  if (reels.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="text-center px-8">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full border-2 border-dashed border-zinc-200">
            <svg className="h-8 w-8 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-black">No reels yet</h2>
          <p className="mt-2 text-sm text-zinc-500">Be the first to post a reel!</p>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="h-[100dvh] w-full snap-y snap-mandatory overflow-y-scroll bg-white"
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
    >
      <style jsx>{`div::-webkit-scrollbar { display: none; }`}</style>

      {reels.map((reel, index) => (
        <ReelItem
          key={reel.id}
          reel={reel}
          index={index}
          isActive={index === activeIndex}
          isNear={Math.abs(index - activeIndex) <= 2}
          isMuted={isMuted}
          currentUserId={currentUserId}
          currentUserAvatar={currentUserAvatar}
          likeAnimation={likeAnimations[reel.id] || false}
          videoRef={getVideoRef(index)}
          onToggleLike={toggleLike}
          onVideoTap={handleVideoTap}
          onOpenComments={openComments}
          onShare={handleShare}
          onTimeUpdate={handleTimeUpdate}
        />
      ))}

      {/* Loading indicator */}
      {loading && (
        <div className="flex h-20 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
        </div>
      )}

      {/* Comment Sheet */}
      {commentReelId && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setCommentReelId(null)
              setComments([])
              setCommentText('')
            }
          }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setCommentReelId(null); setComments([]); setCommentText('') }} />

          {/* Comment panel */}
          <div className="relative z-10 flex max-h-[70vh] w-full flex-col rounded-t-2xl bg-white sm:max-w-md sm:rounded-2xl sm:max-h-[600px]">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h3 className="text-base font-bold text-zinc-900">Comments</h3>
              <button
                onClick={() => { setCommentReelId(null); setComments([]); setCommentText('') }}
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-100"
              >
                <svg className="h-5 w-5 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Comment list */}
            <div className="flex-1 overflow-y-auto px-4 py-3" style={{ scrollbarWidth: 'thin' }}>
              {loadingComments ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-zinc-900" />
                </div>
              ) : comments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <svg className="mb-3 h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 0 1-.923 1.785A5.969 5.969 0 0 0 6 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337Z" />
                  </svg>
                  <p className="text-sm font-semibold text-slate-500">No comments yet</p>
                  <p className="mt-1 text-xs text-slate-400">Be the first to comment!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3 group">
                      <Link href={comment.profiles?.username ? `/user/${comment.profiles.username}` : '#'}>
                        <Avatar
                          src={comment.profiles?.avatar_url}
                          fallbackText={comment.profiles?.full_name || comment.profiles?.username || '?'}
                          size="sm"
                        />
                      </Link>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Link
                            href={comment.profiles?.username ? `/user/${comment.profiles.username}` : '#'}
                            className="text-sm font-bold text-zinc-900 hover:underline"
                          >
                            @{comment.profiles?.username || 'user'}
                          </Link>
                          <span className="text-xs text-slate-400">{timeAgo(comment.created_at)}</span>
                          {comment.user_id === currentUserId && (
                            <button
                              onClick={() => deleteComment(comment.id)}
                              className="ml-auto hidden text-xs text-red-400 hover:text-red-600 group-hover:block"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                        <p className="mt-0.5 text-sm text-zinc-700 break-words">{comment.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Input */}
            <div className="border-t border-slate-200 px-4 py-3 pb-safe">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      postComment()
                    }
                  }}
                  placeholder="Add a comment..."
                  maxLength={500}
                  className="flex-1 rounded-full border border-slate-300 bg-slate-50 px-4 py-2 text-sm text-zinc-900 placeholder:text-slate-400 focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                  onClick={(e) => e.stopPropagation()}
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    postComment()
                  }}
                  disabled={!commentText.trim() || postingComment}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-white transition-colors hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {postingComment ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
