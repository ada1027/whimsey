import { Check, Dices, Lock, Shuffle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useUser } from '../context/UserContext.jsx'
import { RANDOM_QUESTS, ROLLS_PER_DAY } from '../data/seed.js'
import { CategoryTile, QuestMeta } from './QuestBits.jsx'
import { Modal } from './ui.jsx'

const SPIN_MS = 900
const randomOther = (excludeId) => {
  const pool = RANDOM_QUESTS.filter((q) => q.id !== excludeId)
  return pool[Math.floor(Math.random() * pool.length)]
}

/** Home › PLAY: slot-machine roll from the whimsical pool. 3 rolls per day. */
export default function PlayModal({ onClose, onOpenActive }) {
  const { activeQuest, pendingRoll, rollsLeft, revealRoll, reroll, acceptRoll } = useUser()
  const [reel, setReel] = useState(null) // title flashing while spinning
  const [spinning, setSpinning] = useState(false)
  const timers = useRef([])
  useEffect(() => () => timers.current.forEach(clearInterval), [])

  // Slot-machine spin, then lock in `final` via `commit`.
  const spin = (commit) => {
    setSpinning(true)
    const final = randomOther(pendingRoll?.id)
    const iv = setInterval(() => setReel(RANDOM_QUESTS[Math.floor(Math.random() * RANDOM_QUESTS.length)]), 70)
    timers.current.push(iv)
    setTimeout(() => { clearInterval(iv); setReel(null); commit(final.id); setSpinning(false) }, SPIN_MS)
  }

  // First open of the day (or after accepting): reveal a roll for free.
  const revealed = useRef(false)
  useEffect(() => {
    if (revealed.current || activeQuest || pendingRoll || rollsLeft < 1) return
    revealed.current = true
    spin(revealRoll)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (activeQuest) {
    return (
      <Modal onClose={onClose} title="Finish active quest first" eyebrow="Play">
        <div className="flex items-center gap-3 rounded-2xl border-[3px] border-outline bg-surface-2 p-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl border-[3px] border-outline bg-pink text-white"><Lock size={20} strokeWidth={3} /></span>
          <p className="text-sm font-bold">You&apos;re on <b>{activeQuest.title}</b>. Complete it (or let it expire) before rolling another.</p>
        </div>
        <button onClick={() => { onClose(); onOpenActive() }} className="btn btn-neon mt-4 h-12 w-full text-lg">Open active quest</button>
      </Modal>
    )
  }

  if (rollsLeft < 1) {
    return (
      <Modal onClose={onClose} title="Out of rolls" eyebrow="Play">
        <p className="text-center font-bold text-muted">You&apos;ve used all {ROLLS_PER_DAY} random rolls today. Fresh rolls at midnight — your Dailies are still waiting!</p>
        <button onClick={onClose} className="btn btn-gold mt-4 h-12 w-full text-lg">Got it</button>
      </Modal>
    )
  }

  const shown = reel ?? pendingRoll
  return (
    <Modal onClose={onClose} title="Random quest roll" eyebrow={`Rolls left today: ${rollsLeft}/${ROLLS_PER_DAY}`}>
      <div className={`stage relative overflow-hidden rounded-2xl border-[3px] border-outline p-4 text-center ${spinning ? '' : 'animate-pop'}`}>
        <Dices size={22} className={`absolute right-3 top-3 text-white/70 ${spinning ? 'animate-spin' : ''}`} />
        <div className="mx-auto mb-2 w-fit">{shown && <CategoryTile category={shown.category} size="lg" />}</div>
        <p className={`title-stroke text-2xl uppercase leading-tight transition ${spinning ? 'blur-[1.5px]' : ''}`}>{shown?.title ?? '…'}</p>
        {!spinning && pendingRoll && <p className="mt-1 text-sm font-bold text-white/85">{pendingRoll.description}</p>}
      </div>
      {!spinning && pendingRoll && <div className="mt-3"><QuestMeta quest={pendingRoll} showPenalty /></div>}

      <div className="mt-5 flex gap-3">
        <button onClick={() => spin(reroll)} disabled={spinning || !pendingRoll || rollsLeft < 2} className="btn btn-blue h-14 flex-1 text-lg">
          <Shuffle size={18} strokeWidth={3} /> Reroll
        </button>
        <button onClick={() => { acceptRoll(); onClose() }} disabled={spinning || !pendingRoll} className="btn btn-gold h-14 flex-[1.4] text-xl">
          {spinning ? <Dices className="animate-spin" size={22} /> : <Check size={22} strokeWidth={3.5} />} Accept quest
        </button>
      </div>
      <p className="mt-2 text-center text-xs font-bold text-muted">
        {rollsLeft < 2 ? 'Last roll — accept it or come back tomorrow.' : 'Accept or Reroll each use 1 roll. Closing keeps this quest waiting for you.'}
      </p>
    </Modal>
  )
}
