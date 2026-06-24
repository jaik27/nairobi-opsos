export type NavId = 'mission-control' | 'procurement' | 'stores' | 'invoices'

type NavItem = {
  id: NavId
  label: string
  glyph: string
}

const NAV_ITEMS: NavItem[] = [
  { id: 'mission-control', label: 'Mission Control', glyph: '◎' },
  { id: 'procurement', label: 'Procurement', glyph: '▤' },
  { id: 'stores', label: 'Stores', glyph: '▣' },
  { id: 'invoices', label: 'Invoices', glyph: '▦' },
]

type SidebarProps = {
  active: NavId
  onNavigate: (id: NavId) => void
}

export function Sidebar({ active, onNavigate }: SidebarProps) {
  return (
    <nav
      className="flex shrink-0 gap-1 border-b border-border bg-panel px-2 py-2
        md:h-screen md:w-56 md:flex-col md:gap-2 md:border-b-0 md:border-r md:px-4 md:py-6"
    >
      <div className="hidden px-2 pb-6 text-sm font-semibold tracking-wide text-ink-dim md:block">
        NAIROBI <span className="text-lime">OPS</span>
        <span className="text-cyan">OS</span>
      </div>
      {NAV_ITEMS.map((item) => {
        const isActive = item.id === active
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onNavigate(item.id)}
            className={`flex flex-1 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-xs font-medium transition-colors
              md:flex-row md:justify-start md:gap-3 md:px-4 md:py-3 md:text-sm
              ${
                isActive
                  ? 'bg-panel-raised text-lime'
                  : 'text-ink-dim hover:bg-panel-raised hover:text-ink'
              }`}
          >
            <span className="text-base">{item.glyph}</span>
            <span>{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
