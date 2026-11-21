import { CalendarCheck, ChevronRight, Dices, Play, Users } from 'lucide-react'
import { useState } from 'react'
import Character from '../components/Character.jsx'
import CurrentQuestCard from '../components/CurrentQuestCard.jsx'
import FriendFeed from '../components/FriendFeed.jsx'
import { useUser } from '../context/UserContext.jsx'
import { ROLLS_PER_DAY } from '../data/seed.js'

const CHEERS = ['Let’s roll!', 'You got this!', 'Quest time!', 'Feeling lucky?', 'Go go go!']

/**
 * Action-first Home:
 *   (active quest, if any) → hero PLAY card → Dailies strip → Friend activity feed
 */
export default function Dashboard({ onNavigate, onOpenPlay }) {
  const { profile, look, dailies, activeQuest, rollsLeft } = useUser()
  const [cheer] = useState(() => CHEERS[new Date().getDate() % CHEERS.length])

  return (
    <div className="space-y-4">
      {/* The quest in progress beats everything else */}
      <CurrentQuestCard />

      <HeroPlay look={look} name={profile.companionName} cheer={cheer} rollsLeft={rollsLeft} busy={!!activeQuest} onPlay={onOpenPlay} />

      <DailyStrip dailies={dailies} onOpen={() => onNavigate('quests', { tab: 'dailies' })} />

      <FriendFeed
        limit={12}
        action={
          <button onClick={() => onNavigate('social', { scrollTo: 'friends' })} className="flex items-center gap-1 font-display text-sm uppercase text-muted hover:text-ink">
            <Users size={16} strokeWidth={2.75} /> Friends <ChevronRight size={14} strokeWidth={3} />
          </button>
        }
      />
    </div>
  )
}

function HeroPlay({ look, name, cheer, rollsLeft, busy, onPlay }) {
  const sub = busy ? 'Finish your active quest first' : rollsLeft ? 'Roll a whimsical quest' : 'Out of rolls — back tomorrow'
  return (
    <button
      onClick={onPlay}
      className="btn btn-gold relative w-full justify-start gap-2 overflow-hidden rounded-3xl p-3 pr-4 text-left"
      aria-label={`Play: ${sub}. Rolls left today: ${rollsLeft} of ${ROLLS_PER_DAY}`}
    >
      {/* energy rays */}
      <span className="pointer-events-none absolute -left-16 -top-16 size-64 animate-spin-slow bg-[repeating-conic-gradient(rgb(255_255_255/.25)_0deg_10deg,transparent_10deg_20deg)] [mask-image:radial-gradient(circle,black_20%,transparent_65%)]" />
      <span className="relative w-28 shrink-0">
        <span className="absolute -right-1 -top-1 z-10 rotate-6 rounded-xl border-[3px] border-outline bg-surface px-1.5 py-0.5 font-sans text-[10px] font-extrabold normal-case tracking-normal text-ink shadow-[0_3px_0_var(--outline)]">
          {cheer}
        </span>
        <Character look={look} mood="cheer" className="w-full animate-float drop-shadow-[0_5px_0_rgb(0_0_0/.25)]" label={`${name} cheering you on`} />
      </span>
      <span className="relative flex min-w-0 flex-1 flex-col items-start gap-1">
        <span className="flex items-center gap-2 text-5xl leading-none"><Play size={34} fill="currentColor" strokeWidth={2.5} /> Play</span>
        <span className="font-sans text-sm font-extrabold normal-case leading-tight tracking-normal">{sub}</span>
        <span className="pill mt-0.5 bg-surface text-ink [text-shadow:none]">
          <Dices size={12} strokeWidth={3} /> Rolls left today: {rollsLeft}/{ROLLS_PER_DAY}
        </span>
      </span>
    </button>
  )
}

const DOT = {
  completed: 'bg-neon',
  failed: 'bg-pink',
  active: 'bg-gold animate-pulse',
}

/** Slim progress bar for today's 3 dailies. */
function DailyStrip({ dailies, onOpen }) {
  const done = dailies.filter((d) => d.attempt?.status === 'completed').length
  return (
    <button onClick={onOpen} className="card flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition active:translate-y-0.5" aria-label={`Dailies: ${done} of ${dailies.length} done. Go to Quests`}>
      <CalendarCheck size={20} strokeWidth={2.75} className="shrink-0" />
      <span className="font-display uppercase tracking-wide">Dailies: {done}/{dailies.length} Done</span>
      <span className="ml-auto flex items-center gap-1.5">
        {dailies.map((d) => (
          <span key={d.id} title={d.title} className={`size-3.5 rounded-full border-[3px] border-outline ${DOT[d.attempt?.status] ?? 'bg-surface-3'}`} />
        ))}
      </span>
      <ChevronRight size={18} strokeWidth={3} className="shrink-0 text-muted" />
    </button>
  )
}
