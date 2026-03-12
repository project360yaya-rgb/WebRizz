import { login } from './actions'
import Link from 'next/link'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const params = await searchParams
  const error = params?.error

  return (
    <div className="flex min-h-screen w-full bg-white font-sans text-slate-900">
      
      {/* LEFT PANEL: Geometric Light Theme Hero */}
      <div className="relative hidden w-1/2 flex-col justify-center overflow-hidden bg-slate-50 border-r border-slate-200 lg:flex">
        {/* Subtle dot pattern background */}
        <div 
          className="absolute inset-0 opacity-[0.4]" 
          style={{ backgroundImage: 'radial-gradient(#cbd5e1 1.5px, transparent 1.5px)', backgroundSize: '24px 24px' }} 
        />
        
        {/* Soft glowing accent elements */}
        <div className="absolute -left-20 -top-20 h-96 w-96 rounded-full bg-blue-400/10 blur-[100px]" />
        <div className="absolute bottom-10 right-10 h-80 w-80 rounded-full bg-indigo-400/10 blur-[80px]" />

        <div className="relative z-10 flex flex-col items-center justify-center px-16 text-center xl:px-24">
          <div className="mb-10 flex h-20 w-20 items-center justify-center rounded-2xl bg-zinc-900 text-white shadow-xl shadow-zinc-900/10">
            <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
            </svg>
          </div>
          <h1 className="mb-6 text-4xl font-extrabold tracking-tight text-zinc-900 xl:text-5xl">
            Welcome back.
          </h1>
          <p className="max-w-md text-lg text-slate-600">
            Sign in to your account and continue building the future alongside thousands of creators.
          </p>
        </div>
      </div>

      {/* RIGHT PANEL: Form Section */}
      <div className="flex w-full items-center justify-center p-6 sm:p-12 lg:w-1/2">
        
        <div className="w-full max-w-[440px]">
          <div className="mb-8">
            <h2 className="text-3xl font-bold tracking-tight text-zinc-900">Sign in</h2>
            <p className="mt-2 text-sm text-slate-600">Enter your details below to access your account.</p>
          </div>

          {error && (
            <div className="mb-6 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              <svg className="h-5 w-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          <form className="space-y-5">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                placeholder="you@example.com"
                className="block w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition-shadow focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                placeholder="••••••••"
                className="block w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition-shadow focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
              />
            </div>

            <div className="pt-2">
              <button
                formAction={login}
                className="flex w-full items-center justify-center rounded-lg bg-zinc-900 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2 active:scale-[0.98]"
              >
                Sign In
              </button>
            </div>
          </form>

          <p className="mt-8 text-center text-sm text-slate-600">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="font-semibold text-zinc-900 hover:underline">
              Create one
            </Link>
          </p>

        </div>
      </div>
    </div>
  )
}
