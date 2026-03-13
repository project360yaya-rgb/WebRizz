'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Avatar from '@/components/Avatar'
import MessageBubble from '@/components/MessageBubble'
import Link from 'next/link'

interface Profile {
  id: string
  username: string | null
  full_name: string | null
  avatar_url: string | null
}

interface Message {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  created_at: string
  is_read: boolean
}

export default function ChatPage() {
  const { username } = useParams<{ username: string }>()
  const supabase = createClient()
  const router = useRouter()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [otherProfile, setOtherProfile] = useState<Profile | null>(null)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Load chat data
  useEffect(() => {
    async function loadChat() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setCurrentUserId(user.id)

      // Fetch the other user's profile
      const decodedUsername = decodeURIComponent(username)
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .eq('username', decodedUsername)
        .single()

      if (!profileData) {
        router.push('/messages')
        return
      }

      // Don't allow messaging yourself
      if (profileData.id === user.id) {
        router.push('/account')
        return
      }

      setOtherProfile(profileData)

      // Find existing conversation (canonical ordering)
      const [p1, p2] = [user.id, profileData.id].sort()
      const { data: existingConvo } = await supabase
        .from('conversations')
        .select('id')
        .eq('participant_one', p1)
        .eq('participant_two', p2)
        .single()

      if (existingConvo) {
        setConversationId(existingConvo.id)

        // Load messages
        const { data: messagesData } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', existingConvo.id)
          .order('created_at', { ascending: true })
          .limit(200)

        setMessages(messagesData || [])

        // Mark unread messages from the other user as read
        supabase
          .from('messages')
          .update({ is_read: true })
          .eq('conversation_id', existingConvo.id)
          .eq('is_read', false)
          .neq('sender_id', user.id)
          .then(() => {})
      }

      setLoading(false)
    }

    loadChat()
  }, [supabase, router, username])

  // Realtime subscription for new messages
  useEffect(() => {
    if (!conversationId || !currentUserId) return

    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message

          setMessages(prev => {
            // Dedup: check if this is our own optimistic message echoed back
            const optimisticIdx = prev.findIndex(
              m => m.sender_id === newMsg.sender_id
                && m.content === newMsg.content
                && m.id !== newMsg.id
                && Math.abs(new Date(m.created_at).getTime() - new Date(newMsg.created_at).getTime()) < 10000
            )

            if (optimisticIdx >= 0) {
              // Replace optimistic with server version
              const updated = [...prev]
              updated[optimisticIdx] = newMsg
              return updated
            }

            // New message from the other user
            return [...prev, newMsg]
          })

          // Mark as read if from other user
          if (newMsg.sender_id !== currentUserId) {
            supabase
              .from('messages')
              .update({ is_read: true })
              .eq('id', newMsg.id)
              .then(() => {})
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [conversationId, currentUserId, supabase])

  async function sendMessage() {
    if (!newMessage.trim() || sending || !currentUserId || !otherProfile) return
    setSending(true)

    let convoId = conversationId

    // Lazy conversation creation on first message
    if (!convoId) {
      const [p1, p2] = [currentUserId, otherProfile.id].sort()

      const { data: newConvo, error } = await supabase
        .from('conversations')
        .insert({ participant_one: p1, participant_two: p2 })
        .select('id')
        .single()

      if (error || !newConvo) {
        // Race condition: conversation may already exist
        const { data: existing } = await supabase
          .from('conversations')
          .select('id')
          .eq('participant_one', p1)
          .eq('participant_two', p2)
          .single()

        convoId = existing?.id || null
      } else {
        convoId = newConvo.id
      }

      if (convoId) setConversationId(convoId)
    }

    if (!convoId) {
      setSending(false)
      return
    }

    // Optimistic update
    const optimisticMsg: Message = {
      id: crypto.randomUUID(),
      conversation_id: convoId,
      sender_id: currentUserId,
      content: newMessage.trim(),
      created_at: new Date().toISOString(),
      is_read: false,
    }

    const savedText = newMessage.trim()
    setMessages(prev => [...prev, optimisticMsg])
    setNewMessage('')

    const { error } = await supabase
      .from('messages')
      .insert({
        conversation_id: convoId,
        sender_id: currentUserId,
        content: savedText,
      })

    if (error) {
      // Rollback
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id))
      setNewMessage(savedText)
    }

    setSending(false)
    inputRef.current?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // Group messages by date
  function getDateLabel(dateStr: string) {
    const date = new Date(dateStr)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) return 'Today'
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined })
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white sm:ml-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-zinc-900" />
      </div>
    )
  }

  if (!otherProfile) return null

  return (
    <div className="relative flex h-dvh flex-col bg-white sm:ml-64">

      {/* Chat Header */}
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur-xl">
        <button onClick={() => router.push('/messages')} className="flex h-8 w-8 shrink-0 items-center justify-center text-zinc-900 hover:opacity-70 sm:hidden">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <Link href="/messages" className="hidden shrink-0 items-center justify-center text-slate-500 hover:text-zinc-900 sm:flex">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </Link>
        <Link href={`/user/${otherProfile.username}`} className="flex items-center gap-3 min-w-0">
          <Avatar
            src={otherProfile.avatar_url}
            fallbackText={otherProfile.full_name || otherProfile.username || '?'}
            size="sm"
            className="h-9 w-9 shrink-0"
          />
          <div className="min-w-0">
            <h1 className="truncate text-sm font-bold text-zinc-900">
              {otherProfile.full_name || otherProfile.username}
            </h1>
            <p className="truncate text-xs text-slate-500">@{otherProfile.username}</p>
          </div>
        </Link>
      </header>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Avatar
              src={otherProfile.avatar_url}
              fallbackText={otherProfile.full_name || otherProfile.username || '?'}
              size="lg"
              className="mb-4 h-20 w-20"
            />
            <p className="text-sm font-semibold text-zinc-900">{otherProfile.full_name || otherProfile.username}</p>
            <p className="mt-1 text-xs text-slate-500">@{otherProfile.username}</p>
            <p className="mt-4 text-sm text-slate-400">Send a message to start the conversation</p>
          </div>
        )}

        {messages.map((msg, i) => {
          // Date separator
          const showDate = i === 0 || getDateLabel(msg.created_at) !== getDateLabel(messages[i - 1].created_at)

          return (
            <div key={msg.id}>
              {showDate && (
                <div className="my-4 flex justify-center">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
                    {getDateLabel(msg.created_at)}
                  </span>
                </div>
              )}
              <MessageBubble
                content={msg.content}
                timestamp={msg.created_at}
                isSender={msg.sender_id === currentUserId}
              />
            </div>
          )
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="border-t border-slate-200 bg-white px-4 py-3 safe-area-bottom">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            maxLength={2000}
            className="flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-zinc-900 placeholder-slate-400 outline-none transition-colors focus:border-zinc-400 focus:bg-white focus:ring-1 focus:ring-zinc-400"
          />
          <button
            onClick={sendMessage}
            disabled={!newMessage.trim() || sending}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-white transition-all hover:bg-zinc-800 disabled:opacity-30"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
