import { SupabaseClient } from '@supabase/supabase-js'

export const BADGE_TIERS = [
  { name: 'CODE MASTER', points: 25000, color: 'from-amber-400 to-yellow-500', textColor: 'text-amber-900', glow: 'shadow-amber-400/50' },
  { name: 'ARCHITECT', points: 4000, color: 'from-purple-500 to-violet-600', textColor: 'text-white', glow: '' },
  { name: 'DEBUGGER', points: 1000, color: 'from-blue-500 to-cyan-500', textColor: 'text-white', glow: '' },
  { name: 'CODER', points: 250, color: 'from-emerald-500 to-green-500', textColor: 'text-white', glow: '' },
  { name: 'BEGINNER', points: 0, color: 'from-slate-400 to-slate-500', textColor: 'text-white', glow: '' },
] as const

export type BadgeTier = typeof BADGE_TIERS[number]

export function getBadge(points: number): BadgeTier {
  for (const tier of BADGE_TIERS) {
    if (points >= tier.points) return tier
  }
  return BADGE_TIERS[BADGE_TIERS.length - 1]
}

export interface PointBreakdown {
  reelPosts: number
  likesReceived: number
  followersGained: number
  watchPoints: number
  shares: number
  comments: number
}

export interface PointsResult {
  totalPoints: number
  breakdown: PointBreakdown
  badge: BadgeTier
}

export async function calculateUserPoints(
  supabase: SupabaseClient,
  userId: string
): Promise<PointsResult> {
  const [reelsRes, likesRes, followersRes, watchesRes, sharesRes, commentsRes] = await Promise.all([
    // Reel posts: count × 50
    supabase.from('reels').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    // Likes received on user's reels: count × 10
    supabase.from('likes').select('reel_id, reels!inner(user_id)', { count: 'exact', head: true }).eq('reels.user_id', userId),
    // Followers gained: count × 10
    supabase.from('follows').select('follower_id', { count: 'exact', head: true }).eq('following_id', userId),
    // Watch points: SUM of watch_tier
    supabase.from('reel_watches').select('watch_tier').eq('user_id', userId),
    // Shares: count × 5
    supabase.from('shares').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    // Comments: count × 20
    supabase.from('comments').select('id', { count: 'exact', head: true }).eq('user_id', userId),
  ])

  const reelPosts = (reelsRes.count || 0) * 50
  const likesReceived = (likesRes.count || 0) * 10
  const followersGained = (followersRes.count || 0) * 10
  const watchPoints = watchesRes.data?.reduce((sum, w) => sum + (w.watch_tier || 0), 0) || 0
  const shares = (sharesRes.count || 0) * 5
  const comments = (commentsRes.count || 0) * 20

  const totalPoints = reelPosts + likesReceived + followersGained + watchPoints + shares + comments

  return {
    totalPoints,
    breakdown: { reelPosts, likesReceived, followersGained, watchPoints, shares, comments },
    badge: getBadge(totalPoints),
  }
}

// Efficient batch calculation for scoreboard — 6 queries instead of N
export async function calculateAllUsersPoints(
  supabase: SupabaseClient
): Promise<Record<string, { totalPoints: number; badge: BadgeTier }>> {
  const [reelsRes, likesRes, followersRes, watchesRes, sharesRes, commentsRes] = await Promise.all([
    // All reels grouped by user
    supabase.from('reels').select('user_id'),
    // All likes with reel owner
    supabase.from('likes').select('reel_id, reels!inner(user_id)'),
    // All follows
    supabase.from('follows').select('following_id'),
    // All watches
    supabase.from('reel_watches').select('user_id, watch_tier'),
    // All shares
    supabase.from('shares').select('user_id'),
    // All comments
    supabase.from('comments').select('user_id'),
  ])

  const points: Record<string, number> = {}

  const addPoints = (userId: string, pts: number) => {
    points[userId] = (points[userId] || 0) + pts
  }

  // Reel posts × 50
  reelsRes.data?.forEach(r => addPoints(r.user_id, 50))

  // Likes received × 10
  likesRes.data?.forEach(l => {
    const reelOwner = (l as Record<string, unknown>).reels as { user_id: string } | null
    if (reelOwner?.user_id) addPoints(reelOwner.user_id, 10)
  })

  // Followers × 10
  followersRes.data?.forEach(f => addPoints(f.following_id, 10))

  // Watch points (direct tier value)
  watchesRes.data?.forEach(w => addPoints(w.user_id, w.watch_tier || 0))

  // Shares × 5
  sharesRes.data?.forEach(s => addPoints(s.user_id, 5))

  // Comments × 20
  commentsRes.data?.forEach(c => addPoints(c.user_id, 20))

  const result: Record<string, { totalPoints: number; badge: BadgeTier }> = {}
  for (const [userId, totalPoints] of Object.entries(points)) {
    result[userId] = { totalPoints, badge: getBadge(totalPoints) }
  }

  return result
}
