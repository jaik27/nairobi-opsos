import type { StockItem } from '../data/stockItems'

type StockOnHandListProps = {
  items: StockItem[]
}

export function StockOnHandList({ items }: StockOnHandListProps) {
  return (
    <div className="rounded-panel border border-border bg-panel p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-dim">
        Stock on hand
      </h2>
      <ul className="mt-4 flex flex-col divide-y divide-border">
        {items.map((item) => {
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
