export default function ErrorPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="text-center px-6">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-red-200 bg-red-50">
          <svg
            className="h-10 w-10 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>
        <h1 className="mb-3 text-3xl font-bold text-zinc-900">Something went wrong</h1>
        <p className="mb-8 max-w-sm mx-auto text-slate-600">
          We encountered an error while processing your request. Please try again.
        </p>
        <a
          href="/login"
          className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2 active:scale-[0.98]"
        >
          ← Back to Login
        </a>
      </div>
    </div>
  );
}
