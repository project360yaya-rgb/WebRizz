'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import Avatar from '@/components/Avatar'

export default function SettingsPage() {
  const supabase = createClient()
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)

  // Editable fields
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // State
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [usernameError, setUsernameError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileData) {
        setProfile(profileData)
        setFullName(profileData.full_name || '')
        setUsername(profileData.username || '')
        setBio(profileData.bio || '')
        setAvatarUrl(profileData.avatar_url || null)
      }
    }
    fetchUser()
  }, [supabase, router])

  function handleAvatarSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be under 5MB')
      return
    }

    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
    setError(null)
  }

  function validateUsername(value: string): boolean {
    if (!value.trim()) {
      setUsernameError('Username is required')
      return false
    }
    if (value.length < 3) {
      setUsernameError('Username must be at least 3 characters')
      return false
    }
    if (!/^[a-zA-Z0-9_]+$/.test(value)) {
      setUsernameError('Only letters, numbers, and underscores')
      return false
    }
    setUsernameError(null)
    return true
  }

  async function handleSave() {
    if (!user) return
    setError(null)
    setSaved(false)

    if (!validateUsername(username)) return
    if (!fullName.trim()) {
      setError('Display name is required')
      return
    }

    setSaving(true)

    try {
      // Check username uniqueness if changed
      if (username !== profile?.username) {
        const { data: existing } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', username.toLowerCase())
          .neq('id', user.id)
          .single()

        if (existing) {
          setUsernameError('Username is already taken')
          setSaving(false)
          return
        }
      }

      // Upload new avatar if selected
      let newAvatarUrl = avatarUrl
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop()
        const filePath = `${user.id}-${Date.now()}.${fileExt}`

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, avatarFile)

        if (uploadError) {
          setError('Failed to upload avatar: ' + uploadError.message)
          setSaving(false)
          return
        }

        const { data: urlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath)

        newAvatarUrl = urlData.publicUrl
      }

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          username: username.toLowerCase().trim(),
          bio: bio.trim(),
          avatar_url: newAvatarUrl,
        })
        .eq('id', user.id)

      if (updateError) {
        setError('Failed to save: ' + updateError.message)
        setSaving(false)
        return
      }

      // Update local state
      setAvatarUrl(newAvatarUrl)
      setAvatarFile(null)
      setAvatarPreview(null)
      setProfile((prev: any) => ({
        ...prev,
        full_name: fullName.trim(),
        username: username.toLowerCase().trim(),
        bio: bio.trim(),
        avatar_url: newAvatarUrl,
      }))

      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (!user) return null

  const displayAvatar = avatarPreview || avatarUrl || user.user_metadata?.avatar_url

  return (
    <div className="min-h-screen bg-slate-50 sm:ml-64 sm:bg-white">
      {/* Mobile Header */}
      <div className="sticky top-0 z-30 flex items-center border-b border-slate-200 bg-white/95 backdrop-blur-xl px-4 py-3 sm:hidden">
        <Link href="/account" className="flex h-8 w-8 items-center justify-center text-zinc-900 transition-opacity hover:opacity-70">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="ml-2 text-lg font-bold text-zinc-900">Edit Profile</h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="ml-auto rounded-lg bg-zinc-900 px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-6 sm:py-12">
        {/* Desktop Header */}
        <div className="mb-8 hidden items-center justify-between sm:flex">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900">Edit Profile</h1>
            <p className="mt-2 text-sm text-slate-500">Update your profile information and avatar.</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/account" className="flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-zinc-900 transition-colors hover:bg-slate-200">
              Cancel
            </Link>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-zinc-900 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Saving...
                </>
              ) : 'Save Changes'}
            </button>
          </div>
        </div>

        {/* Success banner */}
        {saved && (
          <div className="mb-6 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
            <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-semibold text-green-700">Profile updated successfully!</span>
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div className="mb-6 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <span className="text-sm font-semibold text-red-600">{error}</span>
          </div>
        )}

        {/* Avatar Section */}
        <div className="mb-8 flex flex-col items-center rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="relative">
            <Avatar
              src={displayAvatar}
              fallbackText={fullName || profile?.full_name || user.email || '?'}
              size="lg"
              className="ring-2 ring-slate-200"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full bg-zinc-900 text-white shadow-lg transition-colors hover:bg-zinc-700"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
              </svg>
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="mt-3 text-sm font-semibold text-zinc-900 hover:underline"
          >
            Change Photo
          </button>
          {avatarPreview && (
            <span className="mt-1 text-xs text-slate-400">New photo selected — save to apply</span>
          )}
        </div>

        {/* Profile Fields */}
        <div className="space-y-6">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Profile Information</h3>
            </div>
            <div className="space-y-5 px-5 py-5">
              {/* Display Name */}
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-zinc-900">Display Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your display name"
                  maxLength={50}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-zinc-900 placeholder:text-slate-400 focus:border-zinc-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-400 transition-colors"
                />
              </div>

              {/* Username */}
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-zinc-900">Username</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">@</span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^a-zA-Z0-9_]/g, '')
                      setUsername(val)
                      if (usernameError) validateUsername(val)
                    }}
                    placeholder="username"
                    maxLength={30}
                    className={`w-full rounded-xl border bg-slate-50 pl-8 pr-4 py-2.5 text-sm text-zinc-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 transition-colors ${
                      usernameError
                        ? 'border-red-300 focus:border-red-400 focus:ring-red-400'
                        : 'border-slate-300 focus:border-zinc-400 focus:ring-zinc-400'
                    }`}
                  />
                </div>
                {usernameError && (
                  <p className="mt-1.5 text-xs font-medium text-red-500">{usernameError}</p>
                )}
              </div>

              {/* Bio */}
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-zinc-900">Bio</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell people about yourself..."
                  maxLength={160}
                  rows={3}
                  className="w-full resize-none rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-zinc-900 placeholder:text-slate-400 focus:border-zinc-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-400 transition-colors"
                />
                <p className="mt-1 text-right text-xs text-slate-400">{bio.length}/160</p>
              </div>
            </div>
          </div>

          {/* Account Details (read-only) */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Account Details</h3>
            </div>
            <div className="divide-y divide-slate-100 px-5">
              <div className="flex items-center justify-between py-4">
                <span className="text-sm font-medium text-slate-600">Email Address</span>
                <span className="text-sm font-semibold text-zinc-900">{user.email}</span>
              </div>
              <div className="flex items-center justify-between py-4">
                <span className="text-sm font-medium text-slate-600">Member Since</span>
                <span className="text-sm font-semibold text-zinc-900">
                  {new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Log Out */}
        <div className="mt-8 sm:hidden">
          <button
            onClick={handleSignOut}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 py-3.5 text-sm font-bold text-red-600 transition-all hover:bg-red-100 active:bg-red-200"
          >
            Log Out
          </button>
        </div>
      </div>
    </div>
  )
}
