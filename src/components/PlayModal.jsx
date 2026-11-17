import { Check, Dices, Shuffle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useToast } from '../context/ToastContext.jsx'
import { useUser } from '../context/UserContext.jsx'
import { CategoryTile, QuestMeta } from './QuestBits.jsx'
import { Modal } from './ui.jsx'

/** PLAY: random quest assignment with a quick slot-machine spin. */
export default function PlayModal({ onClose, onNavigate }) {
  const { availableQuests, profile, acceptQuest } = useUser()
  const toast = useToast()
  const [pick, setPick] = useState(null)
  const [spinning, setSpinning] = useState(true)
  const [spinKey, setSpinKey] = useState(0)

  // "Simple" players are matched with easy/medium quests only.
  const pool = profile.tags.includes('simple')
    ? availableQuests.filter((q) => q.difficulty !== 'hard')
    : availableQuests
  const candidates = pool.length ? pool : availableQuests

  useEffect(() => {
    if (!candidates.length) return
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
    acceptQuest(pick.id)
    toast(`"${pick.title}" added to your queue!`, { tone: 'neon', icon: Check })
    onClose()
  }

  return (
    <Modal onClose={onClose} title="Random quest" eyebrow="Play">
      {!candidates.length ? (
        <div className="text-center">
          <p className="font-bold text-muted">The quest board is empty — you've accepted everything!</p>
          <button onClick={() => { onClose(); onNavigate('quests', { tab: 'queue' }) }} className="btn btn-blue mt-4 h-12 w-full text-lg">
            Go to my queue
          </button>
        </div>
      ) : (
        <>
          <div className={`stage rounded-2xl border-[3px] border-outline p-4 text-center ${spinning ? '' : 'animate-pop'}`}>
            <div className="mx-auto mb-2 w-fit">{pick && <CategoryTile category={pick.category} size="lg" />}</div>
            <p className={`title-stroke text-2xl uppercase leading-tight transition ${spinning ? 'blur-[1.5px]' : ''}`}>{pick?.title ?? '…'}</p>
            {!spinning && pick && <p className="mt-1 text-sm font-bold text-white/85">{pick.description}</p>}
          </div>
          {!spinning && pick && <div className="mt-3 flex justify-center"><QuestMeta quest={pick} /></div>}
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
