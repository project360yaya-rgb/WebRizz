import Link from 'next/link'

export default function Home() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-white font-sans text-slate-900">

      {/* Hero Section */}
      <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-6 py-24 text-center">
        {/* Subtle dot pattern background */}
        <div
          className="absolute inset-0 opacity-[0.4]"
          style={{ backgroundImage: 'radial-gradient(#cbd5e1 1.5px, transparent 1.5px)', backgroundSize: '24px 24px' }}
        />

        {/* Soft glowing accents */}
        <div className="absolute -left-32 -top-32 h-[420px] w-[420px] rounded-full bg-blue-400/10 blur-[120px]" />
        <div className="absolute -bottom-20 -right-20 h-96 w-96 rounded-full bg-indigo-400/10 blur-[100px]" />

        <div className="relative z-10 flex flex-col items-center">
          {/* Logo mark */}
          <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-2xl bg-zinc-900 text-white shadow-xl shadow-zinc-900/10">
            <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
            </svg>
          </div>

          <h1 className="mb-6 max-w-2xl text-5xl font-extrabold tracking-tight text-zinc-900 sm:text-6xl">
            Where developers <br className="hidden sm:block" />show their craft.
          </h1>

          <p className="mb-10 max-w-lg text-lg text-slate-600">
            Share coding reels, discover talented creators, and climb the scoreboard. A beautiful community built for developers.
          </p>

          {/* CTAs */}
          <div className="flex flex-col gap-4 sm:flex-row">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-zinc-900/10 transition-all hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2 active:scale-[0.98]"
            >
              Get Started — It&apos;s Free
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-8 py-3.5 text-sm font-semibold text-zinc-900 transition-all hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2 active:scale-[0.98]"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>

      {/* Features Strip */}
      <div className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-0 divide-y divide-slate-200 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {[
            { icon: 'M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z', title: 'Share Reels', desc: 'Record and share short coding videos with the community.' },
            { icon: 'M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z', title: 'Discover', desc: 'Find talented developers and learn new techniques.' },
            { icon: 'M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.982-3.172', title: 'Scoreboard', desc: 'Compete with others and climb the leaderboard.' },
          ].map((feature) => (
            <div key={feature.title} className="flex flex-col items-center px-8 py-10 text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-900 text-white">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={feature.icon} />
                </svg>
              </div>
              <h3 className="mb-2 text-base font-bold text-zinc-900">{feature.title}</h3>
              <p className="text-sm text-slate-500">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8 text-center">
        <p className="text-xs text-slate-400">
          &copy; {new Date().getFullYear()} WebRizz. Built for developers.
        </p>
      </footer>
    </div>
  )
}
