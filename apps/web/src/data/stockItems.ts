import { supabase } from '../lib/supabaseClient'

export type StockItem = {
  id: string
  sku: string
  name: string
  uom: string
  onHand: number
  reorderLevel: number
  reorderQty: number
  unitCost: number
  location: string
}

type StockItemRow = {
  id: string
  sku: string
  name: string
  uom: string
  reorder_level: number
  reorder_qty: number
  unit_cost: number | null
  location: string | null
}

type StockOnHandRow = {
  stock_item_id: string
  on_hand: number
}

// stock_items holds master data; on_hand is a derived ledger value that only
// exists in v_stock_on_hand (see supabase/migrations/001_procurement_core.sql) —
// stock is never stored as a mutable counter, so we read both and merge.
export async function fetchStockItems(): Promise<StockItem[]> {
  const [itemsResult, onHandResult] = await Promise.all([
    supabase
      .from('stock_items')
      .select('id, sku, name, uom, reorder_level, reorder_qty, unit_cost, location')
      .order('name'),
    supabase.from('v_stock_on_hand').select('stock_item_id, on_hand'),
  ])

  if (itemsResult.error) throw itemsResult.error
  if (onHandResult.error) throw onHandResult.error

  const onHandByItemId = new Map<string, number>(
    (onHandResult.data as StockOnHandRow[]).map((row) => [row.stock_item_id, row.on_hand]),
  )

  return (itemsResult.data as StockItemRow[]).map((row) => ({
    id: row.id,
    sku: row.sku,
    name: row.name,
    uom: row.uom,
    onHand: onHandByItemId.get(row.id) ?? 0,
    reorderLevel: row.reorder_level,
    reorderQty: row.reorder_qty,
    unitCost: row.unit_cost ?? 0,
    location: row.location ?? '—',
  }))
}
