import { useState, type FormEvent } from 'react'
import { signInWithMagicLink } from '../lib/auth'

type SignInProps = {
  onDone: () => void
}

type Status = 'idle' | 'sending' | 'sent' | 'error'

const inputClass =
  'rounded-2xl border border-border bg-panel px-4 py-2 text-sm text-ink placeholder:text-ink-dim focus:border-lime focus:outline-none disabled:opacity-50'

export function SignIn({ onDone }: SignInProps) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus('sending')
    setErrorMessage(null)
    try {
      await signInWithMagicLink(email.trim())
      setStatus('sent')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to send the sign-in link')
      setStatus('error')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Sign in</h1>
        <p className="mt-1 text-sm text-ink-dim">
          Get a magic link emailed to you — no password needed.
        </p>
      </div>

      <div className="max-w-sm rounded-panel border border-border bg-panel p-5">
        {status === 'sent' ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-ink">
              Check <span className="font-medium text-lime">{email}</span> for a sign-in link.
            </p>
            <button
              type="button"
              onClick={onDone}
              className="self-start rounded-2xl border border-border px-4 py-2 text-sm text-ink-dim hover:text-ink"
            >
              Back
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1 text-xs text-ink-dim">
              Email
              <input
                type="email"
                required
                disabled={status === 'sending'}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className={inputClass}
              />
            </label>

            {status === 'error' && <p className="text-sm text-cyan">{errorMessage}</p>}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={status === 'sending'}
                className="rounded-2xl bg-lime px-4 py-2 text-sm font-semibold text-canvas disabled:opacity-50"
              >
                {status === 'sending' ? 'Sending…' : 'Send magic link'}
              </button>
              <button
                type="button"
                onClick={onDone}
                className="rounded-2xl border border-border px-4 py-2 text-sm text-ink-dim hover:text-ink"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
