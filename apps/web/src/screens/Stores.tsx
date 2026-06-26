import { useEffect, useMemo, useState } from 'react'
import { SummaryTile } from '../components/SummaryTile'
import { StockTable, type SortDirection, type StockSortColumn } from '../components/StockTable'
import { fetchStockItems, type StockItem } from '../data/stockItems'

type LoadState = 'loading' | 'ready' | 'error'

export function Stores() {
  const [items, setItems] = useState<StockItem[]>([])
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [sortColumn, setSortColumn] = useState<StockSortColumn>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

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

  function handleSort(column: StockSortColumn) {
    if (column === sortColumn) {
      setSortDirection((direction) => (direction === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const visibleItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    const filtered = normalizedQuery
      ? items.filter(
          (item) =>
            item.name.toLowerCase().includes(normalizedQuery) ||
            item.sku.toLowerCase().includes(normalizedQuery),
        )
      : items

    const sorted = [...filtered].sort((a, b) => {
      const result = sortColumn === 'name' ? a.name.localeCompare(b.name) : a.onHand - b.onHand
      return sortDirection === 'asc' ? result : -result
    })

    return sorted
  }, [items, query, sortColumn, sortDirection])

  const belowReorder = items.filter(
    (item) => item.reorderLevel > 0 && item.onHand <= item.reorderLevel,
  ).length

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Stores</h1>
        <p className="mt-1 text-sm text-ink-dim">Stock on hand — live ledger view</p>
      </div>

      {loadState === 'error' && (
        <div className="rounded-panel border border-cyan/40 bg-panel p-4 text-sm text-cyan">
          Couldn't reach Supabase: {errorMessage}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SummaryTile
          label="SKUs tracked"
          value={loadState === 'loading' ? '—' : items.length.toString()}
          accent="lime"
        />
        <SummaryTile
          label="Below reorder"
          value={loadState === 'loading' ? '—' : belowReorder.toString()}
          accent="cyan"
        />
      </div>

      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search by name or SKU…"
        className="rounded-2xl border border-border bg-panel px-4 py-2 text-sm text-ink placeholder:text-ink-dim focus:border-lime focus:outline-none"
      />

      <StockTable
        items={visibleItems}
        loading={loadState === 'loading'}
        sortColumn={sortColumn}
        sortDirection={sortDirection}
        onSort={handleSort}
      />
    </div>
  )
}
