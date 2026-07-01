import { supabase } from '../lib/supabaseClient'

export type PurchaseRequestStatus =
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'rfq_sent'
  | 'closed'

export type PurchaseRequestLine = {
  id: string
  stockItemId: string | null
  description: string | null
  qty: number
  uom: string | null
  stockItemSku: string | null
  stockItemName: string | null
}

export type StatusHistoryEntry = {
  id: string
  fromStatus: PurchaseRequestStatus
  toStatus: PurchaseRequestStatus
  comment: string | null
  changedBy: string | null
  changedAt: string
}

export type PurchaseRequestDetail = {
  id: string
  orgId: string
  prNumber: string
  requestedBy: string
  department: string | null
  status: PurchaseRequestStatus
  neededBy: string | null
  notes: string | null
  createdAt: string
  createdBy: string | null
  lines: PurchaseRequestLine[]
  history: StatusHistoryEntry[]
}

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

// ── Internal row shapes for fetchPurchaseRequestDetail ───────────────────────

type PRDetailRow = {
  id: string
  org_id: string
  pr_number: string
  requested_by: string | null
  department: string | null
  status: PurchaseRequestStatus
  needed_by: string | null
  notes: string | null
  created_at: string
  created_by: string | null
  purchase_request_lines: Array<{
    id: string
    stock_item_id: string | null
    description: string | null
    qty: number
    uom: string | null
    // PostgREST returns many-to-one joins as an array even for a single row;
    // access via [0] in the mapping below.
    stock_items: Array<{ sku: string; name: string }>
  }>
  purchase_request_status_history: Array<{
    id: string
    from_status: string
    to_status: string
    comment: string | null
    changed_by: string | null
    changed_at: string
  }>
}

export async function fetchPurchaseRequestDetail(id: string): Promise<PurchaseRequestDetail> {
  const { data, error } = await supabase
    .from('purchase_requests')
    .select(
      `id, org_id, pr_number, requested_by, department, status, needed_by, notes,
       created_at, created_by,
       purchase_request_lines(
         id, stock_item_id, description, qty, uom,
         stock_items(sku, name)
       ),
       purchase_request_status_history(
         id, from_status, to_status, comment, changed_by, changed_at
       )`,
    )
    .eq('id', id)
    .single()

  if (error) throw error

  const row = data as PRDetailRow
  return {
    id: row.id,
    orgId: row.org_id,
    prNumber: row.pr_number,
    requestedBy: row.requested_by ?? '—',
    department: row.department,
    status: row.status,
    neededBy: row.needed_by,
    notes: row.notes,
    createdAt: row.created_at,
    createdBy: row.created_by,
    lines: row.purchase_request_lines.map((l) => ({
      id: l.id,
      stockItemId: l.stock_item_id,
      description: l.description,
      qty: l.qty,
      uom: l.uom,
      stockItemSku: l.stock_items[0]?.sku ?? null,
      stockItemName: l.stock_items[0]?.name ?? null,
    })),
    history: [...row.purchase_request_status_history]
      .sort((a, b) => a.changed_at.localeCompare(b.changed_at))
      .map((h) => ({
        id: h.id,
        fromStatus: h.from_status as PurchaseRequestStatus,
        toStatus: h.to_status as PurchaseRequestStatus,
        comment: h.comment,
        changedBy: h.changed_by,
        changedAt: h.changed_at,
      })),
  }
}

// Two-step write: status UPDATE first, then history INSERT — same established
// pattern as createPurchaseRequest (PR row then lines). If the history insert
// fails, the status change sticks with no rollback. Flag: wrap in a DB-side
// RPC function to make this atomic if orphaned history becomes a problem.
export async function updatePurchaseRequestStatus(
  id: string,
  orgId: string,
  fromStatus: PurchaseRequestStatus,
  toStatus: PurchaseRequestStatus,
  comment?: string,
): Promise<void> {
  const { error: updateError } = await supabase
    .from('purchase_requests')
    .update({ status: toStatus })
    .eq('id', id)

  if (updateError) throw updateError

  const { error: historyError } = await supabase
    .from('purchase_request_status_history')
    .insert({
      org_id: orgId,
      pr_id: id,
      from_status: fromStatus,
      to_status: toStatus,
      comment: comment ?? null,
    })

  if (historyError) {
    throw new Error(
      `Status updated to '${toStatus}' but history failed to save: ${historyError.message}`,
    )
  }
}
