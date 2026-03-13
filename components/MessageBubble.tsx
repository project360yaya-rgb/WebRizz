'use client'

interface MessageBubbleProps {
  content: string
  timestamp: string
  isSender: boolean
}

export default function MessageBubble({ content, timestamp, isSender }: MessageBubbleProps) {
  const time = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  return (
    <div className={`flex ${isSender ? 'justify-end' : 'justify-start'} mb-1.5`}>
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm break-words ${
          isSender
            ? 'bg-zinc-900 text-white rounded-br-md'
            : 'bg-slate-100 text-zinc-900 rounded-bl-md'
        }`}
      >
        <p className="whitespace-pre-wrap">{content}</p>
        <p className={`mt-0.5 text-[10px] ${isSender ? 'text-white/50' : 'text-slate-400'}`}>
          {time}
        </p>
      </div>
    </div>
  )
}
