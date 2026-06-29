import { useEffect, useState } from 'react'
import { PurchaseRequestForm } from '../components/PurchaseRequestForm'
import { PurchaseRequestTable } from '../components/PurchaseRequestTable'
import { useSession } from '../hooks/useSession'
import { getDemoOrgId } from '../lib/demoOrg'
import { getOwnOrgId } from '../lib/userOrg'
import {
  createPurchaseRequest,
  fetchPurchaseRequests,
  type NewPurchaseRequestInput,
  type PurchaseRequest,
} from '../data/purchaseRequests'
import { fetchStockItems, type StockItem } from '../data/stockItems'

type LoadState = 'loading' | 'ready' | 'error'

export function Procurement() {
  const { session } = useSession()

  const [items, setItems] = useState<PurchaseRequest[]>([])
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const [stockItems, setStockItems] = useState<StockItem[]>([])

  const [formOpen, setFormOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  async function loadPurchaseRequests() {
    setLoadState('loading')
    try {
      const rows = await fetchPurchaseRequests()
      setItems(rows)
      setLoadState('ready')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to load purchase requests')
      setLoadState('error')
    }
  }

  useEffect(() => {
    let cancelled = false

    loadPurchaseRequests()

    fetchStockItems()
      .then((rows) => {
        if (!cancelled) setStockItems(rows)
      })
      .catch(() => {
        // Stock items only feed the line picker's dropdown; the free-text
        // path still works if this fails, so it's not a hard error here.
      })

    return () => {
      cancelled = true
    }
  }, [])

  async function handleCreate(input: NewPurchaseRequestInput) {
    setSubmitting(true)
    setSubmitError(null)
    try {
      // The one place the anon-demo lane and the real-auth lane touch: write
      // into the signed-in user's own org if there's a session, otherwise
      // fall back to the fixed demo org (the only thing anon can write to).
      const orgId = session ? await getOwnOrgId(session.user.id) : await getDemoOrgId()
      await createPurchaseRequest(input, orgId)
      setFormOpen(false)
      await loadPurchaseRequests()
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to create purchase request')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Procurement</h1>
          <p className="mt-1 text-sm text-ink-dim">
            Purchase requests — {session ? 'your org' : 'live demo org'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setFormOpen((open) => !open)}
          className="rounded-2xl bg-lime px-4 py-2 text-sm font-semibold text-canvas"
        >
          {formOpen ? 'Close' : '+ New purchase request'}
        </button>
      </div>

      {loadState === 'error' && (
        <div className="rounded-panel border border-cyan/40 bg-panel p-4 text-sm text-cyan">
          Couldn't reach Supabase: {errorMessage}
        </div>
      )}

      {formOpen && (
        <PurchaseRequestForm
          stockItems={stockItems}
          submitting={submitting}
          errorMessage={submitError}
          onSubmit={handleCreate}
          onCancel={() => setFormOpen(false)}
        />
      )}

      <PurchaseRequestTable items={items} loading={loadState === 'loading'} />
    </div>
  )
}
