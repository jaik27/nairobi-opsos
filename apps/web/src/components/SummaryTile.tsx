type SummaryTileProps = {
  label: string
  value: string
  accent?: 'lime' | 'cyan'
}

export function SummaryTile({ label, value, accent = 'lime' }: SummaryTileProps) {
  const accentClass = accent === 'lime' ? 'text-lime' : 'text-cyan'

  return (
    <div className="rounded-panel border border-border bg-panel p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-dim">
        {label}
      </p>
      <p className={`mt-2 text-3xl font-semibold ${accentClass}`}>{value}</p>
    </div>
  )
}
