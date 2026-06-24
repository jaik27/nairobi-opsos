import { SummaryTile } from '../components/SummaryTile'
import { StockOnHandList } from '../components/StockOnHandList'
import { stockItems } from '../data/stockItems'

export function MissionControl() {
  const reorderAlerts = stockItems.filter(
    (item) => item.reorderLevel > 0 && item.onHand <= item.reorderLevel,
  ).length
  const skuCount = stockItems.length
  const stockValue = stockItems.reduce((sum, item) => sum + item.onHand * item.unitCost, 0)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Mission Control</h1>
        <p className="mt-1 text-sm text-ink-dim">
          Procurement &amp; Stores Control Tower — overview
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryTile label="SKUs tracked" value={skuCount.toString()} accent="lime" />
        <SummaryTile
          label="Reorder alerts"
          value={reorderAlerts.toString()}
          accent="cyan"
        />
        <SummaryTile
          label="Stock value"
          value={`KES ${Math.round(stockValue).toLocaleString()}`}
          accent="lime"
        />
      </div>

      <StockOnHandList items={stockItems} />
    </div>
  )
}
