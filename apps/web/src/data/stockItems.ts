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

// Mock data only — mirrors the stock_items / v_stock_on_hand shape in
// supabase/migrations/001_procurement_core.sql so the Supabase swap-in is a
// drop-in replacement, not a reshape.
export const stockItems: StockItem[] = [
  {
    id: '1',
    sku: 'AL-BIL-6063-150',
    name: 'Aluminium billet 6063, 150mm dia',
    uom: 'pc',
    onHand: 84,
    reorderLevel: 40,
    reorderQty: 100,
    unitCost: 18500,
    location: 'Yard A',
  },
  {
    id: '2',
    sku: 'AL-BIL-6063-200',
    name: 'Aluminium billet 6063, 200mm dia',
    uom: 'pc',
    onHand: 22,
    reorderLevel: 30,
    reorderQty: 80,
    unitCost: 27800,
    location: 'Yard A',
  },
  {
    id: '3',
    sku: 'AL-ING-P1020',
    name: 'P1020 aluminium ingot',
    uom: 'kg',
    onHand: 12400,
    reorderLevel: 5000,
    reorderQty: 10000,
    unitCost: 295,
    location: 'Warehouse 1',
  },
  {
    id: '4',
    sku: 'AL-DIE-EX-0142',
    name: 'Extrusion die, profile EX-0142',
    uom: 'pc',
    onHand: 3,
    reorderLevel: 4,
    reorderQty: 6,
    unitCost: 142000,
    location: 'Die Store',
  },
  {
    id: '5',
    sku: 'AL-DIE-EX-0197',
    name: 'Extrusion die, profile EX-0197',
    uom: 'pc',
    onHand: 6,
    reorderLevel: 4,
    reorderQty: 6,
    unitCost: 158000,
    location: 'Die Store',
  },
  {
    id: '6',
    sku: 'AL-BUSH-6063-12',
    name: 'Aluminium bushing 6063, 12mm',
    uom: 'pc',
    onHand: 510,
    reorderLevel: 200,
    reorderQty: 500,
    unitCost: 320,
    location: 'Warehouse 2',
  },
  {
    id: '7',
    sku: 'AL-SCRAP-MIX',
    name: 'Aluminium scrap, mixed grade',
    uom: 'kg',
    onHand: 1850,
    reorderLevel: 0,
    reorderQty: 0,
    unitCost: 180,
    location: 'Yard B',
  },
  {
    id: '8',
    sku: 'AL-MGSI-MASTER',
    name: 'Mg-Si master alloy ingot',
    uom: 'kg',
    onHand: 640,
    reorderLevel: 800,
    reorderQty: 1500,
    unitCost: 410,
    location: 'Warehouse 1',
  },
]
