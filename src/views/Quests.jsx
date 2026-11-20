import { CalendarClock, ScrollText, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import CurrentQuestCard from '../components/CurrentQuestCard.jsx'
import { DailyCard, HistoryCard } from '../components/QuestCard.jsx'
import { PageTitle } from '../components/ui.jsx'
import { useNow } from '../components/useNow.js'
import { useUser } from '../context/UserContext.jsx'

const TABS = [
  { id: 'dailies', label: 'Dailies' },
  { id: 'done', label: 'Done' },
]

/**
 * params.tab       'dailies' | 'done'
 * params.highlight quest id to badge as "Just finished" (after collecting group rewards)
 */
export default function Quests({ params = {}, onOpenActive, onNavigate }) {
  const { dailies, history, activeQuest } = useUser()
  const [tab, setTab] = useState(params.tab === 'done' ? 'done' : 'dailies')
  const now = useNow(30_000)
  const msToMidnight = new Date(new Date(now).setHours(24, 0, 0, 0)) - now
  const remaining = dailies.filter((d) => !d.attempt).length
  const counts = { dailies: `${dailies.length - remaining}/${dailies.length}`, done: history.length }

  // Bring the just-finished quest into view.
  useEffect(() => {
    if (params.highlight && tab === 'done') {
      const t = setTimeout(() => document.getElementById('just-finished')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 150)
      return () => clearTimeout(t)
    }
  }, [params.highlight, tab])

  return (
    <div className="space-y-5">
      <PageTitle subtitle="3 fresh dailies every day. One quest at a time.">Quests</PageTitle>

      <CurrentQuestCard />

      <div className="grid grid-cols-2 gap-2 rounded-2xl border-[3px] border-outline bg-surface-2 p-1.5" role="tablist">
        {TABS.map(({ id, label }) => {
          const active = tab === id
          return (
            <button
              key={id}
              role="tab"
              aria-selected={active}
              onClick={() => setTab(id)}
              className={`flex items-center justify-center gap-1.5 rounded-xl border-[3px] py-2 font-display uppercase tracking-wide transition
                ${active ? 'border-outline bg-gold text-on-accent shadow-[inset_0_-4px_0_rgb(0_0_0/.2),0_3px_0_var(--outline)]' : 'border-transparent text-muted hover:text-ink'}`}
            >
              {label}
              <span className={`pill px-1.5 text-[11px] leading-4 ${active ? 'bg-surface text-ink' : 'bg-surface-3 text-ink'}`}>{counts[id]}</span>
            </button>
          )
        })}
      </div>

      {tab === 'dailies' && (
        <>
          <div className="flex items-center justify-between gap-2 text-sm font-bold text-muted">
            <span className="flex items-center gap-1.5"><CalendarClock size={16} /> New dailies in {Math.floor(msToMidnight / 3.6e6)}h {Math.floor((msToMidnight % 3.6e6) / 6e4)}m</span>
            {activeQuest && <span className="pill bg-pink text-white">1 quest active</span>}
          </div>
          <div className="space-y-4">
            {dailies.map((d) => <DailyCard key={d.id} quest={d} onOpenActive={onOpenActive} />)}
          </div>
          {remaining === 0 && !activeQuest && (
            <div className="card p-5 text-center">
              <p className="font-display text-xl uppercase">All dailies attempted!</p>
              <p className="mt-1 text-sm font-bold text-muted">Fresh ones arrive at midnight. Want more? Team up for a group quest.</p>
              <button onClick={() => onNavigate('social')} className="btn btn-blue mt-3 h-11 px-4"><Users size={18} strokeWidth={3} /> Find a party</button>
            </div>
          )}
        </>
      )}

      {tab === 'done' && (
        <div className="space-y-4">
          {history.map((q) => <HistoryCard key={q.id} quest={q} justFinished={q.id === params.highlight} />)}
          {history.length === 0 && (
            <div className="card flex flex-col items-center gap-3 p-10 text-center">
              <ScrollText size={36} />
              <p className="font-display text-xl uppercase">Nothing done yet</p>
              <p className="text-sm font-bold text-muted">Accept a daily and finish it before the timer runs out.</p>
              <button onClick={() => setTab('dailies')} className="btn btn-gold mt-1 h-11 px-5">See today&apos;s dailies</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
