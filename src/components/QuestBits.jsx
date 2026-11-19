import { Clock, Coins, Users, Zap } from 'lucide-react'
import { CATEGORIES, coinsFor, DIFFICULTY } from '../data/seed.js'
import { FILL } from '../data/tones.js'
import { CATEGORY_ICONS } from './icons.js'
import Character from './Character.jsx'
import { Pill } from './ui.jsx'

export function QuestMeta({ quest }) {
  const diff = DIFFICULTY[quest.difficulty]
  return (
    <div className="flex flex-wrap gap-1.5">
      {quest.group && <Pill tone="blue" icon={Users}>Group</Pill>}
      <Pill tone={diff.tone}>{diff.label}</Pill>
      <Pill tone="dark" icon={Clock}>{quest.minutes} min</Pill>
      <Pill tone="grape" icon={Zap}>+{quest.xp} XP</Pill>
      <Pill tone="gold" icon={Coins}>+{coinsFor(quest.xp)}</Pill>
      {quest.group && <Pill tone="pink">+50% party bonus</Pill>}
    </div>
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
