import { Coins, Crown, Sparkles, Zap } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useUser } from '../context/UserContext.jsx'
import { ITEMS } from '../data/seed.js'
import Character, { GearIcon } from './Character.jsx'

const COLORS = ['#ffc928', '#ff3d8b', '#2fb4ff', '#3dff8f', '#9b6dff', '#ffffff']

// Deterministic confetti layout (pure render).
const CONFETTI = Array.from({ length: 28 }, (_, i) => {
  const angle = (i / 28) * Math.PI * 2 + (i % 3) * 0.2
  const dist = 140 + ((i * 37) % 90)
  return {
    x: `${Math.cos(angle) * dist}px`,
    y: `${Math.sin(angle) * dist - 40}px`,
    r: `${(i * 67) % 360}deg`,
    color: COLORS[i % COLORS.length],
    w: 8 + (i % 3) * 4,
    delay: (i % 5) * 30,
  }
})

/** Full-screen "Quest Complete" celebration with animated XP bar + level up. */
export default function RewardOverlay({ onNavigate }) {
  const { profile } = useUser()
  if (!profile.lastReward) return null
  // key remounts per reward so the animation sequence restarts cleanly
  return <Celebration key={profile.lastReward.id} reward={profile.lastReward} onNavigate={onNavigate} />
}

function Celebration({ reward, onNavigate }) {
  const { dismissReward: dismiss, look } = useUser()
  const { from, to, levelsGained } = reward
  // Group quests: collecting takes you to Quests → Done with the quest highlighted.
  const dismissReward = () => {
    dismiss()
    if (reward.group) onNavigate('quests', { tab: 'done', highlight: reward.questId })
  }
  // phase 0: show old bar · 1: fill · 2: level up (bar restarts at new level)
  const [phase, setPhase] = useState(0)

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 450)
    const t2 = levelsGained ? setTimeout(() => setPhase(2), 1500) : null
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [levelsGained])

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && dismissReward()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const pct = (xp, max) => Math.min(100, (xp / max) * 100)
  const leveled = phase === 2
  const shownLevel = leveled ? to.level : from.level
  const shownMax = leveled ? to.maxXp : from.maxXp
  const barWidth = phase === 0 ? pct(from.xp, from.maxXp) : levelsGained && !leveled ? 100 : pct(to.xp, to.maxXp)
  const shownXp = phase === 0 ? from.xp : levelsGained && !leveled ? from.maxXp : to.xp

  const unlocked = levelsGained
    ? ITEMS.filter((i) => i.unlock?.level > from.level && i.unlock.level <= to.level)
    : []

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center overflow-hidden bg-[#05020f]/80 p-4 backdrop-blur-sm" onClick={dismissReward}>
      {/* rotating light rays */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 size-[1400px] -translate-x-1/2 -translate-y-1/2 animate-spin-slow bg-[repeating-conic-gradient(rgb(255_201_40/.13)_0deg_10deg,transparent_10deg_20deg)] [mask-image:radial-gradient(circle,black_10%,transparent_60%)]" />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="reward-title"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm text-center"
      >
        {/* confetti burst */}
        <div className="pointer-events-none absolute left-1/2 top-24" aria-hidden>
          {CONFETTI.map((c, i) => (
            <span
              key={`${phase >= 2 ? 'b' : 'a'}${i}`}
              className="confetti absolute rounded-sm border-2 border-[#05020f]"
              style={{ '--x': c.x, '--y': c.y, '--r': c.r, background: c.color, width: c.w, height: c.w * 0.6, animationDelay: `${c.delay}ms` }}
            />
          ))}
        </div>

        <p className="animate-pop font-display text-lg uppercase tracking-[.25em] text-gold">
          {leveled ? 'Level up!' : 'Quest complete!'}
        </p>
        <h2 id="reward-title" className="title-stroke animate-pop text-4xl uppercase leading-none" key={leveled ? 'lv' : 'qc'}>
          {leveled ? `Level ${to.level}` : reward.title}
        </h2>

        <div className="relative mx-auto my-3 w-40 animate-float">
          {leveled && <Crown className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 animate-pop text-gold drop-shadow-[0_3px_0_#05020f]" size={44} fill="currentColor" strokeWidth={2} />}
          <Character look={look} className="w-full drop-shadow-[0_8px_0_rgb(0_0_0/.35)]" />
        </div>

        {/* loot */}
        {reward.group && (
          <p className="mb-2 flex justify-center"><span className="pill animate-pop bg-blue text-on-accent">Group quest · +50% party bonus included</span></p>
        )}
        <div className="flex justify-center gap-3">
          <Loot icon={Zap} tone="bg-grape text-white" label={`+${reward.xp} XP`} delay={150} />
          <Loot icon={Coins} tone="bg-gold text-on-accent" label={`+${reward.coins}`} delay={300} />
        </div>

        {/* XP bar */}
        <div className="card mt-5 p-3 text-left">
          <div className="mb-1.5 flex items-center justify-between font-display uppercase">
            <span className={`pill px-2 ${leveled ? 'animate-wiggle bg-gold text-on-accent' : 'bg-surface-3 text-ink'}`}>LV {shownLevel}</span>
            <span className="text-sm tabular-nums text-muted">{shownXp} / {shownMax} XP</span>
          </div>
          <div className="relative h-6 overflow-hidden rounded-full border-[3px] border-outline bg-outline/60">
            <div
              key={leveled ? 'after' : 'before'}
              className={`relative h-full rounded-full bg-gradient-to-b from-[#7dffb4] to-neon ${leveled ? 'animate-fill' : phase === 1 ? 'transition-[width] duration-1000 ease-out' : ''}`}
              style={{ width: `${barWidth}%` }}
            >
              <div className="absolute inset-x-1 top-0.5 h-1/3 rounded-full bg-white/50" />
            </div>
          </div>

          {leveled && unlocked.length > 0 && (
            <div className="mt-3 animate-pop">
              <p className="mb-1.5 flex items-center gap-1 font-display text-sm uppercase tracking-wider text-muted">
                <Sparkles size={14} /> New gear unlocked
              </p>
              <div className="flex flex-wrap gap-1.5">
                {unlocked.map((i) => (
                  <span key={i.id} className="pill bg-pink text-white">
                    {i.slot === 'item' && <GearIcon item={i.value} className="h-4 w-3" />}
                    {i.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-5 flex gap-3">
          {leveled && unlocked.length > 0 && (
            <button onClick={() => { dismiss(); onNavigate('profile') }} className="btn btn-pink h-14 flex-1 text-lg">
              Locker
            </button>
          )}
          <button onClick={dismissReward} autoFocus className={`btn btn-gold h-14 flex-1 ${reward.group ? 'text-xl' : 'text-2xl'}`}>
            {reward.group ? 'Collect rewards' : 'Collect!'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Loot({ icon: Icon, tone, label, delay }) {
  return (
    <span
      className={`pill animate-pop gap-1.5 rounded-2xl border-[3px] px-4 py-1.5 text-2xl shadow-[inset_0_-4px_0_rgb(0_0_0/.2),0_5px_0_#05020f] ${tone}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <Icon size={22} strokeWidth={3} /> {label}
    </span>
  )
}
