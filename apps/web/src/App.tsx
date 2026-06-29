import { useState } from 'react'
import { AuthStatus } from './components/AuthStatus'
import { Sidebar, type NavId } from './components/Sidebar'
import { useSession } from './hooks/useSession'
import { MissionControl } from './screens/MissionControl'
import { Procurement } from './screens/Procurement'
import { SignIn } from './screens/SignIn'
import { Stores } from './screens/Stores'
import { ComingSoon } from './screens/ComingSoon'

function App() {
  const [active, setActive] = useState<NavId>('mission-control')
  const [showSignIn, setShowSignIn] = useState(false)
  const { session, loading: sessionLoading } = useSession()

  function handleNavigate(id: NavId) {
    setShowSignIn(false)
    setActive(id)
  }

  return (
    <div className="flex min-h-screen flex-col bg-canvas md:flex-row">
      <Sidebar active={active} onNavigate={handleNavigate} />
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <AuthStatus
          session={session}
          loading={sessionLoading}
          onSignInClick={() => setShowSignIn(true)}
        />

        {showSignIn ? (
          <SignIn onDone={() => setShowSignIn(false)} />
        ) : (
          <>
            {active === 'mission-control' && <MissionControl />}
            {active === 'procurement' && <Procurement />}
            {active === 'stores' && <Stores />}
            {active === 'invoices' && <ComingSoon title="Invoices" />}
          </>
        )}
      </main>
    </div>
  )
}

export default App
