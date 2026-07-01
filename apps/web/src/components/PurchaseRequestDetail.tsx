import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import {
  fetchPurchaseRequestDetail,
  updatePurchaseRequestStatus,
  type PurchaseRequestDetail as PRDetail,
  type PurchaseRequestStatus,
} from '../data/purchaseRequests'

type LoadState = 'loading' | 'ready' | 'error'

type Props = {
  prId: string
  session: Session | null
  userRole: string | null
  onClose: () => void
  onStatusUpdated: () => void
}

function statusLabel(s: PurchaseRequestStatus): string {
  return s.replace('_', ' ')
}

function statusClass(s: PurchaseRequestStatus): string {
  switch (s) {
    case 'approved':
      return 'text-lime'
    case 'submitted':
    case 'rfq_sent':
    case 'rejected':
      return 'text-cyan'
    default:
      return 'text-ink-dim'
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-KE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-KE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Shows "You" when the actor is the signed-in user; truncated UUID otherwise.
// A full name lookup requires a profiles join — deferred until auth multi-user.
function displayActor(changedBy: string | null, userId: string | null): string {
  if (!changedBy) return '—'
  if (changedBy === userId) return 'You'
  return changedBy.slice(0, 8) + '…'
}

export function PurchaseRequestDetail({
  prId,
  session,
  userRole,
  onClose,
  onStatusUpdated,
}: Props) {
  const [pr, setPr] = useState<PRDetail | null>(null)
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [refreshCount, setRefreshCount] = useState(0)

  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoadState('loading')
    setLoadError(null)
    fetchPurchaseRequestDetail(prId)
      .then((detail) => {
        if (!cancelled) {
          setPr(detail)
          setLoadState('ready')
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : 'Failed to load')
          setLoadState('error')
        }
      })
    return () => {
      cancelled = true
    }
  }, [prId, refreshCount])

  async function handleTransition(toStatus: PurchaseRequestStatus) {
    if (!pr || !session) return
    if (toStatus === 'rejected' && !comment.trim()) {
      setActionError('A comment is required when rejecting.')
      return
    }
    setSubmitting(true)
    setActionError(null)
    try {
      await updatePurchaseRequestStatus(
        pr.id,
        pr.orgId,
        pr.status,
        toStatus,
        comment.trim() || undefined,
      )
      onStatusUpdated()
      if (toStatus === 'submitted') {
        // Stay in the detail view so the user can see the updated status +
        // the new history entry. Re-fetch to get the freshly committed state.
        setComment('')
        setRefreshCount((c) => c + 1)
      } else {
        // Approve / reject: workflow is done for this PR; go back to the list.
        onClose()
      }
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setSubmitting(false)
    }
  }

  const canSubmit = !!session && pr?.status === 'draft'
  const canApproveReject =
    !!session &&
    pr?.status === 'submitted' &&
    (userRole === 'owner' || userRole === 'procurement')

  // ── Loading / error shells ─────────────────────────────────────────────────

  if (loadState === 'loading') {
    return (
      <div className="rounded-panel border border-border bg-panel p-6 text-sm text-ink-dim">
        Loading…
      </div>
    )
  }

  if (loadState === 'error' || !pr) {
    return (
      <div className="rounded-panel border border-border bg-panel p-6">
        <button type="button" onClick={onClose} className="mb-4 text-sm text-ink-dim hover:text-ink">
          ← Back
        </button>
        <p className="text-sm text-cyan">{loadError ?? 'Unknown error'}</p>
      </div>
    )
  }

  // ── Main detail view ───────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <button type="button" onClick={onClose} className="mb-2 text-sm text-ink-dim hover:text-ink">
          ← Back to list
        </button>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-xl font-semibold text-ink">{pr.prNumber}</h2>
          <span
            className={`text-xs font-medium uppercase tracking-wide ${statusClass(pr.status)}`}
          >
            {statusLabel(pr.status)}
          </span>
        </div>
      </div>

      {/* Meta */}
      <div className="rounded-panel border border-border bg-panel p-5">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-dim">
          Details
        </h3>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm md:grid-cols-4">
          <div>
            <dt className="text-ink-dim">Requested by</dt>
            <dd className="mt-0.5 text-ink">{pr.requestedBy}</dd>
          </div>
          <div>
            <dt className="text-ink-dim">Department</dt>
            <dd className="mt-0.5 text-ink">{pr.department ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-ink-dim">Needed by</dt>
            <dd className="mt-0.5 text-ink">{pr.neededBy ? formatDate(pr.neededBy) : '—'}</dd>
          </div>
          <div>
            <dt className="text-ink-dim">Raised on</dt>
            <dd className="mt-0.5 text-ink">{formatDate(pr.createdAt)}</dd>
          </div>
          {pr.notes && (
            <div className="col-span-2 md:col-span-4">
              <dt className="text-ink-dim">Notes</dt>
              <dd className="mt-0.5 text-ink">{pr.notes}</dd>
            </div>
          )}
        </dl>
      </div>

      {/* Lines */}
      <div className="rounded-panel border border-border bg-panel p-5">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-dim">
          Line items ({pr.lines.length})
        </h3>
        {pr.lines.length === 0 ? (
          <p className="text-sm text-ink-dim">No line items.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[400px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-ink-dim">
                  <th className="py-2 pr-4 font-medium">#</th>
                  <th className="py-2 pr-4 font-medium">Description</th>
                  <th className="py-2 pr-4 text-right font-medium">Qty</th>
                  <th className="py-2 font-medium">UOM</th>
                </tr>
              </thead>
              <tbody>
                {pr.lines.map((line, i) => (
                  <tr key={line.id} className="border-b border-border last:border-0">
                    <td className="py-2.5 pr-4 text-ink-dim">{i + 1}</td>
                    <td className="py-2.5 pr-4 text-ink">
                      {line.stockItemName ?? line.description ?? '—'}
                      {line.stockItemSku && (
                        <span className="ml-1.5 text-ink-dim">({line.stockItemSku})</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-4 text-right text-ink">{line.qty}</td>
                    <td className="py-2.5 text-ink-dim">{line.uom ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Action */}
      {(canSubmit || canApproveReject) && (
        <div className="rounded-panel border border-border bg-panel p-5">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-dim">
            Action
          </h3>

          {canApproveReject && (
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add a comment… (required for rejection)"
              rows={3}
              className="mb-3 w-full resize-none rounded-2xl border border-border bg-panel-raised px-4 py-3 text-sm text-ink placeholder:text-ink-dim focus:border-lime focus:outline-none"
            />
          )}

          {actionError && <p className="mb-3 text-sm text-cyan">{actionError}</p>}

          <div className="flex flex-wrap gap-3">
            {canSubmit && (
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleTransition('submitted')}
                className="rounded-2xl bg-lime px-5 py-2 text-sm font-semibold text-canvas disabled:opacity-50"
              >
                {submitting ? 'Submitting…' : 'Submit for approval'}
              </button>
            )}
            {canApproveReject && (
              <>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleTransition('approved')}
                  className="rounded-2xl bg-lime px-5 py-2 text-sm font-semibold text-canvas disabled:opacity-50"
                >
                  {submitting ? '…' : 'Approve'}
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleTransition('rejected')}
                  className="rounded-2xl border border-cyan/40 bg-panel px-5 py-2 text-sm font-semibold text-cyan disabled:opacity-50"
                >
                  {submitting ? '…' : 'Reject'}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Status history */}
      <div className="rounded-panel border border-border bg-panel p-5">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-dim">
          Status history
        </h3>
        {pr.history.length === 0 ? (
          <p className="text-sm text-ink-dim">No status changes yet.</p>
        ) : (
          <ol className="flex flex-col gap-3">
            {pr.history.map((entry) => (
              <li key={entry.id} className="flex flex-col gap-0.5 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`font-medium uppercase tracking-wide ${statusClass(entry.fromStatus)}`}
                  >
                    {statusLabel(entry.fromStatus)}
                  </span>
                  <span className="text-ink-dim">→</span>
                  <span
                    className={`font-medium uppercase tracking-wide ${statusClass(entry.toStatus)}`}
                  >
                    {statusLabel(entry.toStatus)}
                  </span>
                  <span className="text-ink-dim">·</span>
                  <span className="text-ink-dim">
                    {displayActor(entry.changedBy, session?.user.id ?? null)}
                  </span>
                  <span className="text-ink-dim">·</span>
                  <span className="text-ink-dim">{formatDateTime(entry.changedAt)}</span>
                </div>
                {entry.comment && (
                  <p className="ml-1 text-ink-dim">"{entry.comment}"</p>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  )
}
