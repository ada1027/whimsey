import { Check, Coins, Users, X, Zap } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useUser } from '../context/UserContext.jsx'
import { coinsFor, DIFFICULTY, PARTY_BONUS } from '../data/seed.js'
import Character from './Character.jsx'
import { CategoryTile } from './QuestBits.jsx'
import { Pill } from './ui.jsx'

const ACCEPT_SECONDS = 20

/** "Match found!" pop-up with the shared group quest and an accept countdown. */
export default function MatchFoundModal({ match, onAccept, onDecline }) {
  const { look } = useUser()
  const [left, setLeft] = useState(ACCEPT_SECONDS)
  const { quest, members } = match
  const base = DIFFICULTY[quest.difficulty].xp
  const total = Math.round(base * (1 + PARTY_BONUS))

  useEffect(() => {
    const iv = setInterval(() => setLeft((s) => s - 1), 1000)
    return () => clearInterval(iv)
  }, [])
  useEffect(() => { if (left <= 0) onDecline(true) }, [left, onDecline])

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center overflow-hidden bg-[#05020f]/80 p-4 backdrop-blur-sm">
      <div className="pointer-events-none absolute left-1/2 top-1/2 size-[1200px] -translate-x-1/2 -translate-y-1/2 animate-spin-slow bg-[repeating-conic-gradient(rgb(47_180_255/.14)_0deg_10deg,transparent_10deg_20deg)] [mask-image:radial-gradient(circle,black_10%,transparent_60%)]" />

      <div role="dialog" aria-modal="true" aria-labelledby="match-title" className="relative w-full animate-pop text-center">
        <p className="font-display text-lg uppercase tracking-[.25em] text-blue">Match found!</p>
        <h2 id="match-title" className="title-stroke text-5xl uppercase leading-none">Quest popped!</h2>

        <div className="card mt-5 overflow-hidden text-left">
          <div className="stripes flex items-center justify-between border-b-[3px] border-outline bg-blue px-3 py-1.5">
            <span className="flex items-center gap-1.5 font-display text-sm uppercase tracking-wider text-on-accent">
              <Users size={14} strokeWidth={3} /> Group quest
            </span>
            <span className="pill bg-pink text-white">+50% party bonus</span>
          </div>
          <div className="p-3.5">
            <div className="flex gap-3">
              <CategoryTile category={quest.category} size="lg" />
              <div className="min-w-0">
                <h3 className="font-display text-2xl uppercase leading-tight">{quest.title}</h3>
                <p className="text-sm font-semibold text-muted">{quest.description}</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Pill tone={DIFFICULTY[quest.difficulty].tone}>{DIFFICULTY[quest.difficulty].label}</Pill>
              <Pill tone="dark">{quest.minutes} min</Pill>
              <Pill tone="grape" icon={Zap}>
                <span className="line-through opacity-70">{base}</span> {total} XP
              </Pill>
              <Pill tone="gold" icon={Coins}>+{coinsFor(total)}</Pill>
            </div>

            <p className="mb-1.5 mt-4 font-display text-sm uppercase tracking-widest text-muted">Your squad</p>
            <div className="grid grid-cols-4 gap-2">
              {[{ id: 'me', name: 'You', look }, ...members].map((m) => (
                <div key={m.id} className="text-center">
                  <div className="stage aspect-square overflow-hidden rounded-xl border-[3px] border-outline">
                    <Character look={m.look} crop="head" className="size-full" />
                  </div>
                  <p className="mt-0.5 truncate text-[11px] font-extrabold">{m.name}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5 flex gap-3">
          <button onClick={() => onDecline(false)} className="btn btn-ghost h-14 flex-1 text-lg">
            <X size={18} strokeWidth={3} /> Decline
          </button>
          <button onClick={onAccept} autoFocus className="btn btn-gold relative h-14 flex-[1.8] overflow-hidden text-lg">
            {/* countdown fill */}
            <span
              className="absolute inset-y-0 left-0 bg-white/30 transition-[width] duration-1000 ease-linear"
              style={{ width: `${(left / ACCEPT_SECONDS) * 100}%` }}
            />
            <span className="relative flex items-center gap-2"><Check size={20} strokeWidth={3.5} /> Accept group quest</span>
          </button>
        </div>
        <p className="mt-2 font-display text-sm uppercase tracking-wider text-white/80">Auto-decline in {Math.max(0, left)}s</p>
      </div>
    </div>
  )
}
