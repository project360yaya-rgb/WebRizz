import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ReelViewer from '@/components/ReelViewer'
import BottomNav from '@/components/BottomNav'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch current user's profile for avatar
  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('avatar_url')
    .eq('id', user.id)
    .single()

  const currentUserAvatar = currentProfile?.avatar_url || user.user_metadata?.avatar_url || null

  // Fetch initial reels
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
    .order('created_at', { ascending: false })
    .range(0, 4)

  // Get likes for these reels
  const reelIds = reelsData?.map((r) => r.id) || []

  const { data: userLikes } = reelIds.length > 0
    ? await supabase
        .from('likes')
        .select('reel_id')
        .eq('user_id', user.id)
        .in('reel_id', reelIds)
    : { data: [] }

  const { data: allLikes } = reelIds.length > 0
    ? await supabase
        .from('likes')
        .select('reel_id')
        .in('reel_id', reelIds)
    : { data: [] }

  const likedSet = new Set(userLikes?.map((l) => l.reel_id) || [])
  const countMap: Record<string, number> = {}
  allLikes?.forEach((l) => {
    countMap[l.reel_id] = (countMap[l.reel_id] || 0) + 1
  })

  const initialReels = (reelsData || []).map((r) => ({
    id: r.id,
    video_url: r.video_url,
    title: r.title,
    caption: r.caption,
    category: r.category,
    created_at: r.created_at,
    user_id: r.user_id,
    profiles: Array.isArray(r.profiles) ? r.profiles[0] : r.profiles,
    likes_count: countMap[r.id] || 0,
    is_liked: likedSet.has(r.id),
  }))

  return (
    <div className="relative">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/80 to-transparent">
        <h1 className="text-lg font-bold text-white tracking-tight">WebRizz</h1>
      </div>

      <ReelViewer initialReels={initialReels} currentUserId={user.id} currentUserAvatar={currentUserAvatar} />
      <BottomNav />
    </div>
  )
}
