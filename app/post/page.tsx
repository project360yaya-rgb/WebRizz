'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState, useRef } from 'react'
import BottomNav from '@/components/BottomNav'

const DEFAULT_CATEGORIES = ['Frontend', 'Backend', 'Fullstack', 'DevOps', 'Other']

export default function PostPage() {
  const router = useRouter()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoPreview, setVideoPreview] = useState<string | null>(null)
  
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState(DEFAULT_CATEGORIES[0])
  const [customCategory, setCustomCategory] = useState('')
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleVideoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith('video/')) {
        setError('Please select a valid video file.')
        return
      }
      if (file.size > 50 * 1024 * 1024) { // 50MB limit
        setError('Video file is too large. Max size is 50MB.')
        return
      }
      
      setVideoFile(file)
      setVideoPreview(URL.createObjectURL(file))
      setError(null)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!videoFile) {
      setError('Please select a video to upload.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // 1. Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        throw new Error('You must be logged in to post a reel.')
      }

      // 2. Upload video
      const fileExt = videoFile.name.split('.').pop()
      const fileName = `${user.id}-${Date.now()}.${fileExt}`
      
      const { error: uploadError } = await supabase.storage
        .from('reels')
        .upload(fileName, videoFile)

      if (uploadError) {
        throw new Error('Failed to upload video: ' + uploadError.message)
      }

      // 3. Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('reels')
        .getPublicUrl(fileName)

      // 4. Determine final category
      const finalCategory = category === 'Other' && customCategory.trim() !== '' 
        ? customCategory.trim() 
        : category

      // 5. Insert into database
      const { error: insertError } = await supabase
        .from('reels')
        .insert({
          user_id: user.id,
          video_url: publicUrl,
          title: title.trim(),
          caption: description.trim(),
          category: finalCategory
        })

      if (insertError) {
        throw new Error('Failed to save reel details: ' + insertError.message)
      }

      // Success!
      router.push('/dashboard')
      
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white pb-24 font-sans text-slate-900">
      
      {/* Header */}
      <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur-xl">
        <h1 className="text-center text-lg font-bold text-zinc-900">New Reel</h1>
      </div>

      <div className="mx-auto max-w-lg p-4 sm:p-6">
        
        {error && (
          <div className="mb-6 flex animate-in fade-in items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <svg className="h-5 w-5 shrink-0 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Video Upload Area */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Video File</label>
            <div 
              onClick={() => fileInputRef.current?.click()}
              className={`relative flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed transition-all hover:bg-slate-50 ${
                videoPreview ? 'aspect-[9/16] max-h-[60vh] border-transparent bg-black' : 'h-48 border-slate-300 bg-slate-50'
              }`}
            >
              {videoPreview ? (
                <>
                  <video 
                    src={videoPreview} 
                    className="h-full w-full object-cover opacity-90"
                    controls
                    playsInline
                  />
                  <div className="absolute right-3 top-3 rounded-full bg-black/50 p-2 text-white backdrop-blur-sm transition-colors hover:bg-black/70">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center text-center px-4">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-900 text-white shadow-xl shadow-zinc-900/10">
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                  </div>
                  <span className="font-semibold text-zinc-900">Click to upload video</span>
                  <span className="mt-1 text-xs text-slate-500">MP4 or WebM up to 50MB</span>
                </div>
              )}
            </div>
            <input 
              ref={fileInputRef} 
              type="file" 
              accept="video/*" 
              onChange={handleVideoChange} 
              className="hidden" 
            />
          </div>

          <div className="space-y-4">
            {/* Title */}
            <div>
              <label htmlFor="title" className="mb-1.5 block text-sm font-medium text-slate-700">
                Title
              </label>
              <input
                id="title"
                type="text"
                required
                maxLength={60}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Give your reel a catchy title"
                className="block w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition-shadow focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="mb-1.5 block text-sm font-medium text-slate-700">
                Description
              </label>
              <textarea
                id="description"
                rows={3}
                maxLength={300}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tell us what this reel is about..."
                className="block w-full resize-none rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition-shadow focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
              />
            </div>

            {/* Category */}
            <div>
              <label htmlFor="category" className="mb-1.5 block text-sm font-medium text-slate-700">
                Category
              </label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="block w-full appearance-none rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 transition-shadow focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
              >
                {DEFAULT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Custom Category Input */}
            {category === 'Other' && (
              <div className="animate-in fade-in slide-in-from-top-2">
                <label htmlFor="customCategory" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Custom Category <span className="text-xs text-slate-400">(Optional)</span>
                </label>
                <input
                  id="customCategory"
                  type="text"
                  maxLength={30}
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  placeholder="e.g. Machine Learning"
                  className="block w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition-shadow focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                />
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={loading || !videoFile}
              className="flex w-full items-center justify-center rounded-lg bg-zinc-900 px-4 py-3.5 text-sm font-semibold text-white transition-all hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:bg-zinc-900 disabled:active:scale-100"
            >
              {loading ? (
                <>
                  <svg className="mr-2 h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Uploading Reel...
                </>
              ) : (
                'Post Reel'
              )}
            </button>
          </div>
          
        </form>
      </div>

      <BottomNav />
    </div>
  )
}
