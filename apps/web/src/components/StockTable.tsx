import type { StockItem } from '../data/stockItems'

export type StockSortColumn = 'name' | 'onHand'
export type SortDirection = 'asc' | 'desc'

type StockTableProps = {
  items: StockItem[]
  loading: boolean
  sortColumn: StockSortColumn
  sortDirection: SortDirection
  onSort: (column: StockSortColumn) => void
}

function SortIndicator({ active, direction }: { active: boolean; direction: SortDirection }) {
  if (!active) return null
  return <span className="ml-1 text-lime">{direction === 'asc' ? '▲' : '▼'}</span>
}

export function StockTable({ items, loading, sortColumn, sortDirection, onSort }: StockTableProps) {
  return (
    <div className="rounded-panel border border-border bg-panel p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-dim">
        Stock on hand
      </h2>

      {loading && <p className="mt-4 text-sm text-ink-dim">Loading live stock data…</p>}
      {!loading && items.length === 0 && (
        <p className="mt-4 text-sm text-ink-dim">No stock items match.</p>
      )}

      {!loading && items.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-ink-dim">
                <th className="py-2 pr-4 font-medium">SKU</th>
                <th className="py-2 pr-4 font-medium">
                  <button
                    type="button"
                    onClick={() => onSort('name')}
                    className="flex items-center hover:text-ink"
                  >
                    Name
                    <SortIndicator active={sortColumn === 'name'} direction={sortDirection} />
                  </button>
                </th>
                <th className="py-2 pr-4 font-medium">UOM</th>
                <th className="py-2 pr-4 font-medium">Location</th>
                <th className="py-2 pr-4 text-right font-medium">
                  <button
                    type="button"
                    onClick={() => onSort('onHand')}
                    className="flex w-full items-center justify-end hover:text-ink"
                  >
                    On hand
                    <SortIndicator active={sortColumn === 'onHand'} direction={sortDirection} />
                  </button>
                </th>
                <th className="py-2 pl-4 text-right font-medium">Reorder level</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const isLow = item.reorderLevel > 0 && item.onHand <= item.reorderLevel
                return (
                  <tr
                    key={item.id}
                    className={`border-b border-border last:border-0 ${isLow ? 'bg-cyan/5' : ''}`}
                  >
                    <td className="py-3 pr-4 text-ink-dim">{item.sku}</td>
                    <td className="py-3 pr-4 font-medium text-ink">{item.name}</td>
                    <td className="py-3 pr-4 text-ink-dim">{item.uom}</td>
                    <td className="py-3 pr-4 text-ink-dim">{item.location}</td>
                    <td
                      className={`py-3 pr-4 text-right font-semibold ${isLow ? 'text-cyan' : 'text-ink'}`}
                    >
                      {item.onHand.toLocaleString()}
                      {isLow && (
                        <span className="ml-2 text-[11px] font-medium text-cyan">
                          below reorder
                        </span>
                      )}
                    </td>
                    <td className="py-3 pl-4 text-right text-ink-dim">
                      {item.reorderLevel.toLocaleString()}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
