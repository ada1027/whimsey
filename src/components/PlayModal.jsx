import { Check, Dices, Lock, Shuffle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useUser } from '../context/UserContext.jsx'
import { CategoryTile, QuestMeta } from './QuestBits.jsx'
import { Modal } from './ui.jsx'

/** PLAY: spins one of today's remaining dailies. Respects the one-active-quest limit. */
export default function PlayModal({ onClose, onNavigate, onOpenActive }) {
  const { dailies, profile, acceptDaily, activeQuest } = useUser()
  const [pick, setPick] = useState(null)
  const [spinning, setSpinning] = useState(true)
  const [spinKey, setSpinKey] = useState(0)

  const open = dailies.filter((d) => !d.attempt)
  // "Simple" players skip the Epic daily when possible.
  const pool = profile.tags.includes('simple') ? open.filter((q) => q.difficulty !== 'hard') : open
  const candidates = pool.length ? pool : open
  const blocked = !!activeQuest

  useEffect(() => {
    if (blocked || !candidates.length) return
    let n = 0
    const iv = setInterval(() => {
      setPick(candidates[Math.floor(Math.random() * candidates.length)])
      if (++n > 10) { clearInterval(iv); setSpinning(false) }
    }, 70)
    return () => clearInterval(iv)
    // re-run on reroll only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinKey])

  const reroll = () => { setSpinning(true); setSpinKey((k) => k + 1) }
  const accept = () => {
    acceptDaily(pick.id) // the dock expands with "Quest accepted!" and starts the timer
    onClose()
    onNavigate('quests', { tab: 'dailies' })
  }

  if (blocked) {
    return (
      <Modal onClose={onClose} title="Finish active quest first" eyebrow="Play">
        <div className="flex items-center gap-3 rounded-2xl border-[3px] border-outline bg-surface-2 p-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl border-[3px] border-outline bg-pink text-white"><Lock size={20} strokeWidth={3} /></span>
          <p className="text-sm font-bold">You&apos;re on <b>{activeQuest.title}</b>. Complete it (or let it expire) before starting another.</p>
        </div>
        <button onClick={() => { onClose(); onOpenActive() }} className="btn btn-neon mt-4 h-12 w-full text-lg">Open active quest</button>
      </Modal>
    )
  }

  return (
    <Modal onClose={onClose} title="Random daily" eyebrow="Play">
      {!candidates.length ? (
        <div className="text-center">
          <p className="font-bold text-muted">You&apos;ve attempted all 3 dailies today. New ones arrive at midnight!</p>
          <button onClick={() => { onClose(); onNavigate('social') }} className="btn btn-blue mt-4 h-12 w-full text-lg">Try a group quest</button>
        </div>
      ) : (
        <>
          <div className={`stage rounded-2xl border-[3px] border-outline p-4 text-center ${spinning ? '' : 'animate-pop'}`}>
            <div className="mx-auto mb-2 w-fit">{pick && <CategoryTile category={pick.category} size="lg" />}</div>
            <p className={`title-stroke text-2xl uppercase leading-tight transition ${spinning ? 'blur-[1.5px]' : ''}`}>{pick?.title ?? '…'}</p>
            {!spinning && pick && <p className="mt-1 text-sm font-bold text-white/85">{pick.description}</p>}
          </div>
          {!spinning && pick && <div className="mt-3"><QuestMeta quest={pick} showPenalty /></div>}
          <div className="mt-5 flex gap-3">
            <button onClick={reroll} disabled={spinning || candidates.length < 2} className="btn btn-blue h-14 flex-1 text-lg">
              <Shuffle size={18} strokeWidth={3} /> Reroll
            </button>
            <button onClick={accept} disabled={spinning} className="btn btn-gold h-14 flex-[1.4] text-xl">
              {spinning ? <Dices className="animate-spin" size={22} /> : <Check size={22} strokeWidth={3.5} />} Accept
            </button>
          </div>
        </>
      )}
    </Modal>
  )
}
