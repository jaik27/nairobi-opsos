import { useState } from 'react'
import { Sidebar, type NavId } from './components/Sidebar'
import { MissionControl } from './screens/MissionControl'
import { Stores } from './screens/Stores'
import { ComingSoon } from './screens/ComingSoon'

function App() {
  const [active, setActive] = useState<NavId>('mission-control')

  return (
    <div className="flex min-h-screen flex-col bg-canvas md:flex-row">
      <Sidebar active={active} onNavigate={setActive} />
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        {active === 'mission-control' && <MissionControl />}
        {active === 'procurement' && <ComingSoon title="Procurement" />}
        {active === 'stores' && <Stores />}
        {active === 'invoices' && <ComingSoon title="Invoices" />}
      </main>
    </div>
  )
}

export default App
