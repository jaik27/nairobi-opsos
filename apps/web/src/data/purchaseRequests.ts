import { supabase } from '../lib/supabaseClient'

export type PurchaseRequestStatus =
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'rfq_sent'
  | 'closed'

export type PurchaseRequest = {
  id: string
  prNumber: string
  requestedBy: string
  department: string | null
  status: PurchaseRequestStatus
  neededBy: string | null
  notes: string | null
  createdAt: string
  lineCount: number
}

export type NewPurchaseRequestLine = {
  stockItemId: string | null
  description: string
  qty: number
  uom: string
}

export type NewPurchaseRequestInput = {
  requestedBy: string
  department: string
  neededBy: string
  notes: string
  lines: NewPurchaseRequestLine[]
}

type PurchaseRequestRow = {
  id: string
  pr_number: string
  requested_by: string | null
  department: string | null
  status: PurchaseRequestStatus
  needed_by: string | null
  notes: string | null
  created_at: string
  purchase_request_lines: { count: number }[]
}

export async function fetchPurchaseRequests(): Promise<PurchaseRequest[]> {
  const { data, error } = await supabase
    .from('purchase_requests')
    .select(
      'id, pr_number, requested_by, department, status, needed_by, notes, created_at, purchase_request_lines(count)',
    )
    .order('created_at', { ascending: false })

  if (error) throw error

  return (data as PurchaseRequestRow[]).map((row) => ({
    id: row.id,
    prNumber: row.pr_number,
    requestedBy: row.requested_by ?? '—',
    department: row.department,
    status: row.status,
    neededBy: row.needed_by,
    notes: row.notes,
    createdAt: row.created_at,
    lineCount: row.purchase_request_lines[0]?.count ?? 0,
  }))
}

// Demo shortcut: a timestamp is not a real numbering scheme. Replace with a
// DB sequence or server-assigned number (see migration 004's notes) before
// any real tenant exists.
function generatePrNumber(): string {
  return `PR-${Date.now()}`
}

// orgId is supplied by the caller, not resolved in here — see Procurement.tsx's
// handleCreate, which is the one place the anon-demo lane and the real-auth
// lane touch: it picks the demo org id or the signed-in user's own org id
// before calling this.
export async function createPurchaseRequest(
  input: NewPurchaseRequestInput,
  orgId: string,
): Promise<string> {
  const prNumber = generatePrNumber()

  const { data: pr, error: prError } = await supabase
    .from('purchase_requests')
    .insert({
      org_id: orgId,
      pr_number: prNumber,
      requested_by: input.requestedBy,
      department: input.department || null,
      needed_by: input.neededBy || null,
      notes: input.notes || null,
    })
    .select('id')
    .single()

  if (prError) throw prError

  const prId = (pr as { id: string }).id

  const lineRows = input.lines.map((line) => ({
    org_id: orgId,
    pr_id: prId,
    stock_item_id: line.stockItemId,
    description: line.description,
    qty: line.qty,
    uom: line.uom,
  }))

  const { error: linesError } = await supabase.from('purchase_request_lines').insert(lineRows)

  if (linesError) {
    throw new Error(
      `Purchase Request ${prNumber} was created but its lines failed to save: ${linesError.message}`,
    )
  }

  return prId
}
