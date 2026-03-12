import BottomNav from '@/components/BottomNav'

export default function ScoreboardPage() {
  return (
    <div className="min-h-screen bg-white pb-16">
      <div className="flex h-screen items-center justify-center">
        <div className="text-center px-8">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50">
            <svg className="h-8 w-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .982-3.172M2.25 4.5a.75.75 0 0 1 .75-.75h1.5a3 3 0 0 1 3 3v.75M2.25 4.5v3.75c0 .414.336.75.75.75h3" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-zinc-900">Scoreboard</h2>
          <p className="mt-2 text-sm text-slate-500">Coming soon — see top developers</p>
        </div>
      </div>
      <BottomNav />
    </div>
  )
}
