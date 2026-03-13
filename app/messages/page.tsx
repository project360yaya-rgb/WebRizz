'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import BottomNav from '@/components/BottomNav'
import Avatar from '@/components/Avatar'
import Link from 'next/link'

interface ConversationItem {
  id: string
  participant_one: string
  participant_two: string
  last_message_at: string
  last_message_text: string
  other_user: {
    id: string
    username: string | null
    full_name: string | null
    avatar_url: string | null
  }
}

function timeAgo(dateStr: string) {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return 'now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d`
  const weeks = Math.floor(days / 7)
  return `${weeks}w`
}

export default function MessagesPage() {
  const supabase = createClient()
  const router = useRouter()

  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [conversations, setConversations] = useState<ConversationItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setCurrentUserId(user.id)

      // Fetch conversations where user is either participant
      const { data: convosAsP1 } = await supabase
        .from('conversations')
        .select('*')
        .eq('participant_one', user.id)
        .order('last_message_at', { ascending: false })

      const { data: convosAsP2 } = await supabase
        .from('conversations')
        .select('*')
        .eq('participant_two', user.id)
        .order('last_message_at', { ascending: false })

      const allConvos = [...(convosAsP1 || []), ...(convosAsP2 || [])]
        .sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime())

      if (allConvos.length === 0) {
        setLoading(false)
        return
      }

      // Get other participant profiles
      const otherIds = allConvos.map(c =>
        c.participant_one === user.id ? c.participant_two : c.participant_one
      )

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .in('id', otherIds)

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || [])

      const items: ConversationItem[] = allConvos.map(c => {
        const otherId = c.participant_one === user.id ? c.participant_two : c.participant_one
        const profile = profileMap.get(otherId)
        return {
          id: c.id,
          participant_one: c.participant_one,
          participant_two: c.participant_two,
          last_message_at: c.last_message_at,
          last_message_text: c.last_message_text || '',
          other_user: {
            id: otherId,
            username: profile?.username || null,
            full_name: profile?.full_name || null,
            avatar_url: profile?.avatar_url || null,
          },
        }
      })

      setConversations(items)
      setLoading(false)
    }

    load()
  }, [supabase, router])

  // Realtime: listen for conversation updates (new messages update last_message_at)
  useEffect(() => {
    if (!currentUserId) return

    const channel = supabase
      .channel('conversations-list')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'conversations' },
        (payload) => {
          const updated = payload.new as { id: string; participant_one: string; participant_two: string; last_message_at: string; last_message_text: string }
          if (updated.participant_one !== currentUserId && updated.participant_two !== currentUserId) return

          setConversations(prev => {
            const existing = prev.find(c => c.id === updated.id)
            if (!existing) return prev
            const updatedItem = { ...existing, last_message_at: updated.last_message_at, last_message_text: updated.last_message_text || '' }
            return [updatedItem, ...prev.filter(c => c.id !== updated.id)]
          })
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'conversations' },
        async (payload) => {
          const newConvo = payload.new as { id: string; participant_one: string; participant_two: string; last_message_at: string; last_message_text: string }
          if (newConvo.participant_one !== currentUserId && newConvo.participant_two !== currentUserId) return

          const otherId = newConvo.participant_one === currentUserId ? newConvo.participant_two : newConvo.participant_one
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, username, full_name, avatar_url')
            .eq('id', otherId)
            .single()

          setConversations(prev => [{
            id: newConvo.id,
            participant_one: newConvo.participant_one,
            participant_two: newConvo.participant_two,
            last_message_at: newConvo.last_message_at,
            last_message_text: newConvo.last_message_text || '',
            other_user: {
              id: otherId,
              username: profile?.username || null,
              full_name: profile?.full_name || null,
              avatar_url: profile?.avatar_url || null,
            },
          }, ...prev])
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [currentUserId, supabase])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white sm:ml-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-zinc-900" />
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-white pb-20 sm:ml-64 sm:pb-0">

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur-xl sm:px-6">
        <h1 className="text-center text-base font-bold tracking-wide text-zinc-900 sm:text-left sm:text-xl">
          Messages
        </h1>
      </header>

      <main className="mx-auto max-w-2xl">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-8 py-24 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border-2 border-slate-200">
              <svg className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-zinc-900">No messages yet</h3>
            <p className="mt-2 text-sm text-slate-500">Visit someone&apos;s profile and tap Message to start a conversation.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {conversations.map(convo => (
              <Link
                key={convo.id}
                href={`/messages/${convo.other_user.username}`}
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50"
              >
                <Avatar
                  src={convo.other_user.avatar_url}
                  fallbackText={convo.other_user.full_name || convo.other_user.username || '?'}
                  size="md"
                  className="h-12 w-12 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold text-zinc-900">
                      {convo.other_user.full_name || convo.other_user.username}
                    </span>
                    <span className="shrink-0 text-xs text-slate-400">
                      {timeAgo(convo.last_message_at)}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-sm text-slate-500">
                    {convo.last_message_text || 'Start a conversation'}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  )
}
