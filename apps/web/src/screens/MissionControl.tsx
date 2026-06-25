import { useEffect, useState } from 'react'
import { SummaryTile } from '../components/SummaryTile'
import { StockOnHandList } from '../components/StockOnHandList'
import { fetchStockItems, type StockItem } from '../data/stockItems'

type LoadState = 'loading' | 'ready' | 'error'

export function MissionControl() {
  const [items, setItems] = useState<StockItem[]>([])
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    fetchStockItems()
      .then((rows) => {
        if (cancelled) return
        setItems(rows)
        setLoadState('ready')
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setErrorMessage(error instanceof Error ? error.message : 'Failed to load stock data')
        setLoadState('error')
      })

    return () => {
      cancelled = true
    }
  }, [])

  const reorderAlerts = items.filter(
    (item) => item.reorderLevel > 0 && item.onHand <= item.reorderLevel,
  ).length
  const stockValue = items.reduce((sum, item) => sum + item.onHand * item.unitCost, 0)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Mission Control</h1>
        <p className="mt-1 text-sm text-ink-dim">
          Procurement &amp; Stores Control Tower — overview
        </p>
      </div>

      {loadState === 'error' && (
        <div className="rounded-panel border border-cyan/40 bg-panel p-4 text-sm text-cyan">
          Couldn't reach Supabase: {errorMessage}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryTile
          label="SKUs tracked"
          value={loadState === 'loading' ? '—' : items.length.toString()}
          accent="lime"
        />
        <SummaryTile
          label="Reorder alerts"
          value={loadState === 'loading' ? '—' : reorderAlerts.toString()}
          accent="cyan"
        />
        <SummaryTile
          label="Stock value"
          value={loadState === 'loading' ? '—' : `KES ${Math.round(stockValue).toLocaleString()}`}
          accent="lime"
        />
      </div>

      <StockOnHandList items={items} loading={loadState === 'loading'} />
    </div>
  )
}
