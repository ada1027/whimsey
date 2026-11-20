import { ChevronUp, Swords } from 'lucide-react'
import { useEffect } from 'react'
import { useUser } from '../context/UserContext.jsx'
import { CategoryTile, Countdown } from './QuestBits.jsx'

const EXPANDED_MS = 5000

/**
 * Sits between the screen and the bottom nav whenever a quest is active, on every tab.
 * Right after accepting, it shows the full "Quest accepted!" banner for 5s, then
 * smoothly collapses to a compact pill with the live countdown. Tap to open the quest.
 */
export default function ActiveQuestDock({ onOpen }) {
  const { activeQuest: quest, profile, dismissAccepted } = useUser()
  const notice = profile.lastAccepted
  // Expanded while the "just accepted" notice is fresh; clearing it after 5s collapses the banner.
  const expanded = !!quest && notice?.questId === quest.id

  useEffect(() => {
    if (!expanded) return
    const t = setTimeout(dismissAccepted, EXPANDED_MS)
    return () => clearTimeout(t)
  }, [expanded, notice?.id, dismissAccepted])

  if (!quest) return null

  return (
    <div className="relative z-20 shrink-0 px-3 pb-2 pt-1">
      {/* expanded banner (collapses smoothly) */}
      <div
        className={`grid transition-[grid-template-rows,opacity,margin] duration-500 ease-out ${expanded ? 'mb-2 grid-rows-[1fr] opacity-100' : 'mb-0 grid-rows-[0fr] opacity-0'}`}
        aria-hidden={!expanded}
      >
        <div className="overflow-hidden">
          <div className="quest-live flex items-center gap-3 rounded-2xl border-[3px] bg-surface p-3">
            <span className="grid size-12 shrink-0 place-items-center rounded-xl border-[3px] border-outline bg-gold text-on-accent shadow-[inset_0_-4px_0_rgb(0_0_0/.2)]">
              <Swords size={24} strokeWidth={2.75} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-display text-lg uppercase leading-none">Quest accepted!</p>
              <p className="mt-0.5 truncate text-sm font-bold text-muted">{quest.title} — the clock is ticking</p>
            </div>
          </div>
        </div>
      </div>

      {/* persistent compact pill */}
      <button
        onClick={onOpen}
        aria-label={`Active quest: ${quest.title}. Open quest`}
        className={`quest-live flex w-full items-center gap-2.5 rounded-2xl border-[3px] bg-surface p-1.5 pr-2 text-left transition active:translate-y-0.5 ${expanded ? '' : 'animate-pop'}`}
      >
        <div className="scale-[.72] -m-2"><CategoryTile category={quest.category} /></div>
        <div className="min-w-0 flex-1">
          <p className="font-display text-[11px] uppercase leading-none tracking-widest text-muted">{quest.group ? 'Group quest' : 'Active quest'}</p>
          <p className="truncate font-display text-base leading-tight">{quest.title}</p>
        </div>
        <Countdown expiresAt={quest.expiresAt} />
        <ChevronUp size={18} strokeWidth={3} className="shrink-0 text-muted" />
      </button>
    </div>
  )
}
