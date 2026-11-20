import { RotateCcw, Skull, TimerOff } from 'lucide-react'
import { useUser } from '../context/UserContext.jsx'
import { penaltyLabel } from '../data/seed.js'

/** "Quest Failed — Time Expired!" — shown when the countdown hits 00:00 (or you give up). */
export default function QuestFailedModal({ onNavigate }) {
  const { profile, dismissFailure } = useUser()
  const f = profile.lastFailure
  if (!f) return null
  const expired = f.reason !== 'gave_up'

  const pickNew = () => { dismissFailure(); onNavigate('quests', { tab: 'dailies' }) }

  return (
    <div className="fixed inset-0 z-[75] grid place-items-center bg-[#05020f]/85 p-4 backdrop-blur-sm">
      <div role="alertdialog" aria-modal="true" aria-labelledby="fail-title" className="w-full animate-pop text-center" key={f.id}>
        <span className="mx-auto grid size-20 animate-wiggle place-items-center rounded-3xl border-[3px] border-[#05020f] bg-pink text-white shadow-[0_6px_0_#05020f]">
          {expired ? <TimerOff size={40} strokeWidth={2.5} /> : <Skull size={40} strokeWidth={2.5} />}
        </span>
        <p className="mt-4 font-display text-lg uppercase tracking-[.25em] text-pink">Quest failed</p>
        <h2 id="fail-title" className="title-stroke text-4xl uppercase leading-none">{expired ? 'Time expired!' : 'You gave up'}</h2>
        <p className="mt-2 font-bold text-white/85">&ldquo;{f.title}&rdquo; {expired ? 'ran out of time.' : 'was abandoned.'}</p>

        <div className="card mt-5 p-4">
          <p className="font-display text-sm uppercase tracking-widest text-muted">Penalty applied</p>
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            {f.penalty.xp > 0 && <span className="pill bg-pink px-3 py-1 text-lg text-white">-{f.penalty.xp} XP</span>}
            {f.penalty.coins > 0 && <span className="pill bg-pink px-3 py-1 text-lg text-white">-{f.penalty.coins} coins</span>}
            <span className="pill bg-surface-3 px-3 py-1 text-lg text-ink">Streak reset</span>
          </div>
          <p className="mt-3 text-xs font-bold text-muted">{penaltyLabel(f.penalty)} · your quest slot is free again.</p>
          {f.group && <p className="mt-1 text-xs font-bold text-muted">Your party can still finish without you.</p>}
        </div>

        <button onClick={pickNew} autoFocus className="btn btn-gold mt-5 h-14 w-full text-xl">
          <RotateCcw size={20} strokeWidth={3} /> Pick a new quest
        </button>
        <button onClick={dismissFailure} className="mt-2 text-sm font-bold text-white/75 underline">Close</button>
      </div>
    </div>
  )
}
