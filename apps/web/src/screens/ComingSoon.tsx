type ComingSoonProps = {
  title: string
}

export function ComingSoon({ title }: ComingSoonProps) {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold text-ink">{title}</h1>
      <div className="rounded-panel border border-border bg-panel p-8 text-sm text-ink-dim">
        Coming in a later step of the walking skeleton.
      </div>
    </div>
  )
}
