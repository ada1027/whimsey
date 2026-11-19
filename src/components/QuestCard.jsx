import { Camera, Check, Plus, Undo2, Video } from 'lucide-react'
import { useState } from 'react'
import { useToast } from '../context/ToastContext.jsx'
import { useUser } from '../context/UserContext.jsx'
import { CATEGORIES } from '../data/seed.js'
import { CategoryTile, QuestMeta } from './QuestBits.jsx'
import ProofModal from './ProofModal.jsx'
import { Pill } from './ui.jsx'

/** One quest, with the action that fits its status: Accept / Complete / done. */
export default function QuestCard({ quest }) {
  const { acceptQuest, dropQuest } = useUser()
  const toast = useToast()
  const [proofOpen, setProofOpen] = useState(false)
  const cat = CATEGORIES[quest.category] ?? CATEGORIES.life
  const done = quest.status === 'completed'

  // The "Quest accepted!" banner (AcceptedBanner) confirms this.
  const accept = () => acceptQuest(quest.id)
  const drop = () => {
    dropQuest(quest.id)
    toast(quest.custom || quest.group ? 'Quest removed' : 'Quest returned to the board', { tone: 'blue', icon: Undo2 })
  }

  return (
    <>
      <article className={`card relative flex flex-col gap-3 p-3.5 ${done ? 'bg-surface-2' : ''}`}>
        <div className="flex gap-3">
          <CategoryTile category={quest.category} />
          <div className="min-w-0 flex-1">
            <p className="font-display text-xs uppercase tracking-widest text-muted">
              {cat.label}{quest.custom && ' · Custom'}
            </p>
            <h3 className={`font-display text-lg leading-tight ${done ? 'text-muted line-through decoration-[3px]' : ''}`}>
              {quest.title}
            </h3>
            {quest.description && <p className="mt-0.5 line-clamp-2 text-sm font-semibold text-muted">{quest.description}</p>}
          </div>
          {quest.status === 'active' && (
            <button onClick={drop} className="btn btn-ghost size-9 shrink-0 rounded-xl" aria-label={`Drop ${quest.title}`} title="Return to board">
              <Undo2 size={16} strokeWidth={3} />
            </button>
          )}
          {done && (
            <span className="absolute -right-2 -top-3 rotate-6 pill bg-neon px-2 py-0.5 text-sm text-on-accent">
              <Check size={14} strokeWidth={4} /> Done
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-end justify-between gap-2">
          <QuestMeta quest={quest} />
          {quest.status === 'available' && (
            <button onClick={accept} className="btn btn-gold ml-auto h-11 px-4 text-base">
              <Plus size={18} strokeWidth={3.5} /> Accept
            </button>
          )}
          {quest.status === 'active' && (
            <button onClick={() => setProofOpen(true)} className="btn btn-neon ml-auto h-11 px-4 text-base" aria-label={`Complete ${quest.title}`}>
              <Check size={18} strokeWidth={3.5} /> Complete
            </button>
          )}
          {done && quest.proof && (
            <Pill tone="blue" icon={quest.proof.kind === 'video' ? Video : Camera} className="ml-auto max-w-48 normal-case tracking-normal">
              <span className="truncate">{quest.proof.name}</span>
            </Pill>
          )}
        </div>
      </article>
      {proofOpen && <ProofModal quest={quest} onClose={() => setProofOpen(false)} />}
    </>
  )
}
