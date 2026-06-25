import type { StockItem } from '../data/stockItems'

type StockOnHandListProps = {
  items: StockItem[]
  loading?: boolean
}

export function StockOnHandList({ items, loading = false }: StockOnHandListProps) {
  return (
    <div className="rounded-panel border border-border bg-panel p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-dim">
        Stock on hand
      </h2>
      {loading && <p className="mt-4 text-sm text-ink-dim">Loading live stock data…</p>}
      {!loading && items.length === 0 && (
        <p className="mt-4 text-sm text-ink-dim">No stock items found.</p>
      )}
      <ul className="mt-4 flex flex-col divide-y divide-border">
        {!loading &&
          items.map((item) => {
            const isLow = item.reorderLevel > 0 && item.onHand <= item.reorderLevel
            return (
              <li
                key={item.id}
                className="flex items-center justify-between gap-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{item.name}</p>
                  <p className="text-xs text-ink-dim">
                    {item.sku} · {item.location}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p
                    className={`text-sm font-semibold ${isLow ? 'text-cyan' : 'text-ink'}`}
                  >
                    {item.onHand.toLocaleString()} {item.uom}
                  </p>
                  {isLow && (
                    <p className="text-[11px] font-medium text-cyan">below reorder</p>
                  )}
                </div>
              </li>
            )
          })}
      </ul>
    </div>
  )
}
