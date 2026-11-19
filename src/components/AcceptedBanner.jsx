import { ArrowRight, Swords, X } from 'lucide-react'
import { useEffect } from 'react'
import { useUser } from '../context/UserContext.jsx'

/** Prominent "Quest accepted!" banner with a shortcut to the active quest. */
export default function AcceptedBanner({ onNavigate }) {
  const { profile, dismissAccepted } = useUser()
  const notice = profile.lastAccepted
  // remount per notice so the timer restarts
  return notice ? <Banner key={notice.id} notice={notice} onNavigate={onNavigate} onDismiss={dismissAccepted} /> : null
}

function Banner({ notice, onNavigate, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 6000)
    return () => clearTimeout(t)
  }, [onDismiss])

  return (
    <div className="fixed inset-x-3 bottom-24 z-[65] animate-toast" role="status">
      <div className="quest-live flex items-center gap-3 rounded-2xl border-[3px] bg-surface p-3">
        <span className="grid size-12 shrink-0 place-items-center rounded-xl border-[3px] border-outline bg-gold text-on-accent shadow-[inset_0_-4px_0_rgb(0_0_0/.2)]">
          <Swords size={24} strokeWidth={2.75} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg uppercase leading-none">Quest accepted!</p>
          <p className="mt-0.5 truncate text-sm font-bold text-muted">{notice.title} is now active</p>
        </div>
        <button onClick={onDismiss} className="btn btn-ghost size-9 shrink-0 rounded-xl" aria-label="Dismiss">
          <X size={16} strokeWidth={3} />
        </button>
      </div>
      <button
        onClick={() => { onDismiss(); onNavigate('quests', { tab: 'queue' }) }}
        className="btn btn-gold -mt-1 h-12 w-full rounded-t-none text-base"
      >
        Go to active quest <ArrowRight size={18} strokeWidth={3} />
      </button>
    </div>
  )
}
