import { Clock, Coins, Skull, Timer, Users, Zap } from 'lucide-react'
import { CATEGORIES, coinsFor, DIFFICULTY, penaltyFor, penaltyLabel } from '../data/seed.js'
import { FILL } from '../data/tones.js'
import { CATEGORY_ICONS } from './icons.js'
import Character from './Character.jsx'
import { Pill } from './ui.jsx'
import { formatCountdown, useNow } from './useNow.js'

/** Difficulty, time limit and rewards. `showPenalty` adds the failure penalty line. */
export function QuestMeta({ quest, showPenalty = false }) {
  const diff = DIFFICULTY[quest.difficulty]
  const limit = quest.limit ?? diff.limit
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1.5">
        {quest.group && <Pill tone="blue" icon={Users}>Group</Pill>}
        <Pill tone={diff.tone}>{diff.label}</Pill>
        <Pill tone="dark" icon={Clock}>{limit} min limit</Pill>
        <Pill tone="grape" icon={Zap}>+{quest.xp} XP</Pill>
        <Pill tone="gold" icon={Coins}>+{coinsFor(quest.xp)}</Pill>
        {quest.group && <Pill tone="pink">+50% party bonus</Pill>}
      </div>
      {showPenalty && <PenaltyLine penalty={quest.penalty ?? penaltyFor(quest.difficulty)} />}
    </div>
  )
}

/** "If time runs out: -15 XP & Streak reset" */
export function PenaltyLine({ penalty, prefix = 'If time runs out' }) {
  return (
    <p className="flex items-center gap-1.5 text-xs font-extrabold text-pink">
      <Skull size={13} strokeWidth={2.75} className="shrink-0" />
      <span>{prefix}: <span className="uppercase tracking-wide">{penaltyLabel(penalty)}</span></span>
    </p>
  )
}

/** Live mm:ss countdown pill; turns pink and pulses in the last minute. */
export function Countdown({ expiresAt, size = 'md', className = '' }) {
  const now = useNow(1000)
  const left = expiresAt - now
  const urgent = left <= 60_000
  const big = size === 'lg'
  return (
    <span
      role="timer"
      aria-label={`Time left ${formatCountdown(left)}`}
      className={`pill tabular-nums ${big ? 'px-2.5 py-1 text-xl' : ''} ${urgent ? 'animate-pulse bg-pink text-white' : 'bg-surface-3 text-ink'} ${className}`}
    >
      <Timer size={big ? 18 : 12} strokeWidth={3} /> {formatCountdown(left)}
    </span>
  )
}

export function CategoryTile({ category, size = 'md' }) {
  const cat = CATEGORIES[category] ?? CATEGORIES.life
  const Icon = CATEGORY_ICONS[category] ?? CATEGORY_ICONS.life
  const box = size === 'lg' ? 'size-16 rounded-2xl' : 'size-12 rounded-xl'
  return (
    <div
      className={`grid shrink-0 place-items-center border-[3px] border-outline shadow-[inset_0_-4px_0_rgb(0_0_0/.2)] ${box} ${FILL[cat.tone]}`}
      title={cat.label}
    >
      <Icon size={size === 'lg' ? 30 : 22} strokeWidth={2.5} />
    </div>
  )
}

/** Row of small character heads (party members on a group quest). */
export function MemberHeads({ members, size = 'size-8' }) {
  return (
    <div className="flex -space-x-2">
      {members.map((m) => (
        <div key={m.id} className={`stage ${size} overflow-hidden rounded-lg border-2 border-outline`} title={m.name}>
          <Character look={m.look} crop="head" className="size-full" />
        </div>
      ))}
    </div>
  )
}
