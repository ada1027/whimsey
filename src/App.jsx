import { BatteryFull, Signal, Wifi } from 'lucide-react'
import { useRef, useState } from 'react'
import ActiveQuestDock from './components/ActiveQuestDock.jsx'
import { ActiveQuestSheet } from './components/CurrentQuestCard.jsx'
import GamemodeModal from './components/GamemodeModal.jsx'
import LoginScreen from './components/LoginScreen.jsx'
import NavBar from './components/NavBar.jsx'
import PartyVoteModal from './components/PartyVoteModal.jsx'
import PlayModal from './components/PlayModal.jsx'
import QuestFailedModal from './components/QuestFailedModal.jsx'
import RewardOverlay from './components/RewardOverlay.jsx'
import StatusBar from './components/StatusBar.jsx'
import { OnlineProvider } from './context/OnlineContext.jsx'
import { GUEST_STORE_KEY, userStoreKey, useSession } from './context/SessionContext.jsx'
import { ToastViewport } from './context/ToastContext.jsx'
import { UserProvider, useUser } from './context/UserContext.jsx'
import Dashboard from './views/Dashboard.jsx'
import Profile from './views/Profile.jsx'
import Quests from './views/Quests.jsx'
import Social from './views/Social.jsx'

export default function App() {
  const { session } = useSession()
  // Each adventurer has their own local save; remounting resets all screen state on switch.
  const storageKey = session ? userStoreKey(session.userId) : GUEST_STORE_KEY
  return (
    <UserProvider key={storageKey} storageKey={storageKey}>
      <PhoneFrame>
        {session ? (
          <OnlineProvider key={session.userId}>
            <Game />
          </OnlineProvider>
        ) : (
          <>
            <LoginScreen />
            <ToastViewport />
          </>
        )}
      </PhoneFrame>
    </UserProvider>
  )
}

function Game() {
  const [route, setRoute] = useState({ view: 'dashboard', params: {}, key: 0 })
  const [modal, setModal] = useState(null) // 'play' | 'gamemode' | null
  const [sheetFor, setSheetFor] = useState(null) // active-quest detail view, keyed by quest id
  const { activeQuest } = useUser()
  const screenRef = useRef(null)

  const navigate = (view, params = {}) => {
    setRoute((r) => ({ view, params, key: r.key + 1 }))
    screenRef.current?.scrollTo({ top: 0 })
  }
  const openActive = () => activeQuest && setSheetFor(activeQuest.id)
  const shared = { onNavigate: navigate, onOpenPlay: () => setModal('play'), onOpenGamemode: () => setModal('gamemode'), onOpenActive: openActive }

  return (
    <>
      <StatusBar {...shared} />
      <div className="relative min-h-0 flex-1">
        <main ref={screenRef} className="screen-bg absolute inset-0 overflow-y-auto overscroll-contain px-4 pb-8 pt-5 [scrollbar-width:none]">
          {route.view === 'dashboard' && <Dashboard {...shared} />}
          {route.view === 'quests' && <Quests key={route.key} params={route.params} onOpenActive={openActive} onNavigate={navigate} />}
          {route.view === 'social' && <Social key={route.key} params={route.params} onNavigate={navigate} />}
          {route.view === 'profile' && <Profile />}
        </main>
        <ToastViewport />
      </div>
      {/* Persistent on every tab while a quest is active */}
      <ActiveQuestDock onOpen={openActive} />
      <NavBar view={route.view} onChange={navigate} />

      {sheetFor && activeQuest?.id === sheetFor && <ActiveQuestSheet onClose={() => setSheetFor(null)} />}
      {modal === 'play' && <PlayModal onClose={() => setModal(null)} onNavigate={navigate} onOpenActive={openActive} />}
      {modal === 'gamemode' && <GamemodeModal onClose={() => setModal(null)} />}
      <RewardOverlay onNavigate={navigate} />
      <QuestFailedModal onNavigate={navigate} />
      <PartyVoteModal />
    </>
  )
}

/** On real phones the app fills the screen; on larger screens it sits in a phone frame. */
function PhoneFrame({ children }) {
  return (
    <div className="flex min-h-dvh items-center justify-center sm:p-6">
      {/* translateZ(0) makes this the containing block for every `fixed` overlay (modals,
          reward screen), so they stay inside the phone instead of covering the whole window. */}
      <div
        className="relative flex h-dvh w-full max-w-[420px] flex-col overflow-hidden bg-bg [transform:translateZ(0)]
                   sm:h-[min(880px,calc(100dvh-3rem))] sm:rounded-[3rem] sm:border-[10px] sm:border-[#05020f]
                   sm:shadow-[0_0_0_2px_#3a2d80,0_40px_80px_-24px_rgb(0_0_0/.7),0_0_140px_-20px_rgb(139_92_255/.45)]"
      >
        <DeviceBar />
        {children}
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
