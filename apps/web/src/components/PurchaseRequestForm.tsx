import { useState, type FormEvent } from 'react'
import type { StockItem } from '../data/stockItems'
import type { NewPurchaseRequestInput, NewPurchaseRequestLine } from '../data/purchaseRequests'

type DraftLine = {
  key: string
  stockItemId: string
  description: string
  qty: string
  uom: string
}

function emptyLine(): DraftLine {
  return { key: crypto.randomUUID(), stockItemId: '', description: '', qty: '', uom: '' }
}

type PurchaseRequestFormProps = {
  stockItems: StockItem[]
  submitting: boolean
  errorMessage: string | null
  onSubmit: (input: NewPurchaseRequestInput) => void
  onCancel: () => void
}

const inputClass =
  'rounded-2xl border border-border bg-panel px-4 py-2 text-sm text-ink placeholder:text-ink-dim focus:border-lime focus:outline-none disabled:opacity-50'

export function PurchaseRequestForm({
  stockItems,
  submitting,
  errorMessage,
  onSubmit,
  onCancel,
}: PurchaseRequestFormProps) {
  const [requestedBy, setRequestedBy] = useState('')
  const [department, setDepartment] = useState('')
  const [neededBy, setNeededBy] = useState('')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<DraftLine[]>([emptyLine()])
  const [validationError, setValidationError] = useState<string | null>(null)

  function updateLine(key: string, patch: Partial<DraftLine>) {
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)))
  }

  function addLine() {
    setLines((current) => [...current, emptyLine()])
  }

  function removeLine(key: string) {
    setLines((current) =>
      current.length > 1 ? current.filter((line) => line.key !== key) : current,
    )
  }

  function handleStockItemChange(key: string, stockItemId: string) {
    const stockItem = stockItems.find((item) => item.id === stockItemId)
    updateLine(key, {
      stockItemId,
      description: stockItem ? stockItem.name : '',
      uom: stockItem ? stockItem.uom : '',
    })
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setValidationError(null)

    if (!requestedBy.trim()) {
      setValidationError('Requester is required.')
      return
    }

    const parsedLines: NewPurchaseRequestLine[] = []
    for (const line of lines) {
      if (!line.description.trim() && !line.stockItemId) continue
      if (!line.description.trim()) {
        setValidationError('Each line needs a description or a stock item.')
        return
      }
      const qty = Number(line.qty)
      if (!Number.isFinite(qty) || qty <= 0) {
        setValidationError(`Enter a valid quantity for "${line.description}".`)
        return
      }
      parsedLines.push({
        stockItemId: line.stockItemId || null,
        description: line.description.trim(),
        qty,
        uom: line.uom.trim() || 'unit',
      })
    }

    if (parsedLines.length === 0) {
      setValidationError('Add at least one line.')
      return
    }

    onSubmit({
      requestedBy: requestedBy.trim(),
      department: department.trim(),
      neededBy,
      notes: notes.trim(),
      lines: parsedLines,
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-panel border border-border bg-panel p-5"
    >
      <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-dim">
        New purchase request
      </h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs text-ink-dim">
          Requester
          <input
            value={requestedBy}
            onChange={(event) => setRequestedBy(event.target.value)}
            placeholder="e.g. J. Mwangi"
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-ink-dim">
          Department (optional)
          <input
            value={department}
            onChange={(event) => setDepartment(event.target.value)}
            placeholder="e.g. Production"
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-ink-dim">
          Needed by (optional)
          <input
            type="date"
            value={neededBy}
            onChange={(event) => setNeededBy(event.target.value)}
            className={inputClass}
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-xs text-ink-dim">
        Notes (optional)
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={2}
          className={inputClass}
        />
      </label>

      <div className="flex flex-col gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-dim">Lines</p>
        {lines.map((line) => (
          <div
            key={line.key}
            className="grid grid-cols-1 gap-2 rounded-2xl border border-border p-3 sm:grid-cols-[1.5fr_1.5fr_0.7fr_1fr]"
          >
            <select
              value={line.stockItemId}
              onChange={(event) => handleStockItemChange(line.key, event.target.value)}
              className={inputClass}
            >
              <option value="">Free-text description…</option>
              {stockItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.sku})
                </option>
              ))}
            </select>
            <input
              value={line.description}
              onChange={(event) => updateLine(line.key, { description: event.target.value })}
              placeholder="Description"
              disabled={Boolean(line.stockItemId)}
              className={inputClass}
            />
            <input
              value={line.qty}
              onChange={(event) => updateLine(line.key, { qty: event.target.value })}
              placeholder="Qty"
              inputMode="decimal"
              className={inputClass}
            />
            <div className="flex items-center gap-2">
              <input
                value={line.uom}
                onChange={(event) => updateLine(line.key, { uom: event.target.value })}
                placeholder="UOM"
                className={inputClass}
              />
              <button
                type="button"
                onClick={() => removeLine(line.key)}
                className="text-xs text-ink-dim hover:text-cyan"
                aria-label="Remove line"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={addLine}
          className="self-start text-xs font-medium text-lime hover:underline"
        >
          + Add line
        </button>
      </div>

      {(validationError || errorMessage) && (
        <p className="text-sm text-cyan">{validationError ?? errorMessage}</p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-2xl bg-lime px-4 py-2 text-sm font-semibold text-canvas disabled:opacity-50"
        >
          {submitting ? 'Creating…' : 'Create purchase request'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-2xl border border-border px-4 py-2 text-sm text-ink-dim hover:text-ink"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
