import { BatteryFull, Signal, Wifi } from 'lucide-react'
import { useRef, useState } from 'react'
import GamemodeModal from './components/GamemodeModal.jsx'
import NavBar from './components/NavBar.jsx'
import PlayModal from './components/PlayModal.jsx'
import RewardOverlay from './components/RewardOverlay.jsx'
import StatusBar from './components/StatusBar.jsx'
import { ToastViewport } from './context/ToastContext.jsx'
import Dashboard from './views/Dashboard.jsx'
import Profile from './views/Profile.jsx'
import Quests from './views/Quests.jsx'
import Social from './views/Social.jsx'

export default function App() {
  const [route, setRoute] = useState({ view: 'dashboard', params: {}, key: 0 })
  const [modal, setModal] = useState(null) // 'play' | 'gamemode' | null
  const screenRef = useRef(null)

  const navigate = (view, params = {}) => {
    setRoute((r) => ({ view, params, key: r.key + 1 }))
    screenRef.current?.scrollTo({ top: 0 })
  }
  const shared = { onNavigate: navigate, onOpenPlay: () => setModal('play'), onOpenGamemode: () => setModal('gamemode') }

  return (
    // On real phones the app fills the screen; on larger screens it sits in a phone frame.
    <div className="flex min-h-dvh items-center justify-center sm:p-6">
      {/* translateZ(0) makes this the containing block for every `fixed` overlay (modals,
          reward screen), so they stay inside the phone instead of covering the whole window. */}
      <div
        className="relative flex h-dvh w-full max-w-[420px] flex-col overflow-hidden bg-bg [transform:translateZ(0)]
                   sm:h-[min(880px,calc(100dvh-3rem))] sm:rounded-[3rem] sm:border-[10px] sm:border-[#05020f]
                   sm:shadow-[0_0_0_2px_#3a2d80,0_40px_80px_-24px_rgb(0_0_0/.7),0_0_140px_-20px_rgb(139_92_255/.45)]"
      >
        <DeviceBar />
        <StatusBar {...shared} />
        <main ref={screenRef} className="screen-bg flex-1 overflow-y-auto overscroll-contain px-4 pb-8 pt-5 [scrollbar-width:none]">
          {route.view === 'dashboard' && <Dashboard {...shared} />}
          {route.view === 'quests' && <Quests key={route.key} initialTab={route.params.tab} />}
          {route.view === 'social' && <Social />}
          {route.view === 'profile' && <Profile />}
        </main>
        <NavBar view={route.view} onChange={navigate} />

        <ToastViewport />
        {modal === 'play' && <PlayModal onClose={() => setModal(null)} onNavigate={navigate} />}
        {modal === 'gamemode' && <GamemodeModal onClose={() => setModal(null)} />}
        <RewardOverlay onNavigate={navigate} />
      </div>
    </div>
  )
}

/** Fake phone status row (desktop preview only — real phones show their own). */
function DeviceBar() {
  return (
    <div className="relative hidden h-9 shrink-0 items-center justify-between bg-surface px-7 font-sans text-sm font-extrabold sm:flex" aria-hidden>
      <span>9:41</span>
      <span className="absolute left-1/2 top-1.5 h-6 w-24 -translate-x-1/2 rounded-full bg-[#05020f]" />
      <span className="flex items-center gap-1.5">
        <Signal size={15} strokeWidth={3} /> <Wifi size={15} strokeWidth={3} /> <BatteryFull size={18} strokeWidth={2.5} />
      </span>
    </div>
  )
}
