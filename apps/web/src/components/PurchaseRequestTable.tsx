import type { PurchaseRequest } from '../data/purchaseRequests'

type PurchaseRequestTableProps = {
  items: PurchaseRequest[]
  loading: boolean
}

function statusClass(status: PurchaseRequest['status']): string {
  switch (status) {
    case 'approved':
      return 'text-lime'
    case 'rejected':
      return 'text-cyan'
    case 'submitted':
    case 'rfq_sent':
      return 'text-cyan'
    default:
      return 'text-ink-dim'
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-KE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function PurchaseRequestTable({ items, loading }: PurchaseRequestTableProps) {
  return (
    <div className="rounded-panel border border-border bg-panel p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-dim">
        Purchase requests
      </h2>

      {loading && <p className="mt-4 text-sm text-ink-dim">Loading purchase requests…</p>}
      {!loading && items.length === 0 && (
        <p className="mt-4 text-sm text-ink-dim">No purchase requests yet.</p>
      )}

      {!loading && items.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-ink-dim">
                <th className="py-2 pr-4 font-medium">PR number</th>
                <th className="py-2 pr-4 font-medium">Requester</th>
                <th className="py-2 pr-4 font-medium">Date</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                <th className="py-2 pl-4 text-right font-medium">#lines</th>
              </tr>
            </thead>
            <tbody>
              {items.map((pr) => (
                <tr key={pr.id} className="border-b border-border last:border-0">
                  <td className="py-3 pr-4 font-medium text-ink">{pr.prNumber}</td>
                  <td className="py-3 pr-4 text-ink-dim">{pr.requestedBy}</td>
                  <td className="py-3 pr-4 text-ink-dim">{formatDate(pr.createdAt)}</td>
                  <td
                    className={`py-3 pr-4 font-medium uppercase tracking-wide ${statusClass(pr.status)}`}
                  >
                    {pr.status.replace('_', ' ')}
                  </td>
                  <td className="py-3 pl-4 text-right text-ink">{pr.lineCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
