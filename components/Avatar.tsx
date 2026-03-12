'use client'

import { useState } from 'react'

interface AvatarProps {
  src?: string | null
  fallbackText: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = {
  sm: 'h-6 w-6 text-[10px]',
  md: 'h-10 w-10 text-sm',
  lg: 'h-24 w-24 text-4xl',
}

export default function Avatar({ src, fallbackText, size = 'md', className = '' }: AvatarProps) {
  const [imgError, setImgError] = useState(false)

  const sizeClass = sizeClasses[size]
  const letter = (fallbackText?.[0] || '?').toUpperCase()

  if (src && !imgError) {
    return (
      <img
        src={src}
        alt=""
        className={`${sizeClass} rounded-full object-cover ${className}`}
        onError={() => setImgError(true)}
      />
    )
  }

  return (
    <div
      className={`${sizeClass} flex items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-blue-500 font-bold text-white ${className}`}
    >
      {letter}
    </div>
  )
}
