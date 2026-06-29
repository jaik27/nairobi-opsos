import type { Session } from '@supabase/supabase-js'
import { signOut } from '../lib/auth'

type AuthStatusProps = {
  session: Session | null
  loading: boolean
  onSignInClick: () => void
}

export function AuthStatus({ session, loading, onSignInClick }: AuthStatusProps) {
  async function handleSignOut() {
    await signOut()
  }

  return (
    <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-border bg-panel px-4 py-2 text-xs">
      {loading ? (
        <span className="text-ink-dim">Checking session…</span>
      ) : session ? (
        <>
          <span className="text-ink-dim">
            Signed in as <span className="text-ink">{session.user.email}</span>
          </span>
          <button
            type="button"
            onClick={handleSignOut}
            className="font-medium text-cyan hover:underline"
          >
            Sign out
          </button>
        </>
      ) : (
        <>
          <span className="text-ink-dim">Viewing the demo org (signed out)</span>
          <button
            type="button"
            onClick={onSignInClick}
            className="font-medium text-lime hover:underline"
          >
            Sign in
          </button>
        </>
      )}
    </div>
  )
}
