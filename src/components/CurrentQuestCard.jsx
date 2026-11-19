import { Clock, Send, Undo2, Users } from 'lucide-react'
import { useState } from 'react'
import { useToast } from '../context/ToastContext.jsx'
import { useUser } from '../context/UserContext.jsx'
import ProofModal from './ProofModal.jsx'
import { CategoryTile, MemberHeads, QuestMeta } from './QuestBits.jsx'

const minutesAgo = (t) => {
  if (!t) return null
  const m = Math.floor((Date.now() - t) / 60000)
  return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : `${Math.floor(m / 60)}h ago`
}

/**
 * Pinned, glowing card for the quest the player should do right now.
 * Shown at the top of Home and Quests whenever there is an active quest.
 */
export default function CurrentQuestCard({ queueCount = 0 }) {
  const { currentQuest: quest, dropQuest } = useUser()
  const toast = useToast()
  const [proofOpen, setProofOpen] = useState(false)
  if (!quest) return null

  const started = minutesAgo(quest.acceptedAt)

  return (
    <section
      key={quest.id}
      aria-label="Current quest in progress"
      className="quest-live relative animate-pop overflow-hidden rounded-3xl border-[3px] bg-surface"
    >
      {/* header strip */}
      <div className={`stripes flex items-center justify-between gap-2 border-b-[3px] border-outline px-3 py-1.5 ${quest.group ? 'bg-blue' : 'bg-pink'}`}>
        <span className="flex items-center gap-1.5 font-display text-sm uppercase tracking-wider text-white [text-shadow:0_2px_0_#05020f]">
          <span className="live-dot size-2.5 rounded-full border-2 border-outline bg-neon" />
          Current quest in progress
        </span>
        {quest.group && (
          <span className="pill bg-gold text-on-accent"><Users size={12} strokeWidth={3} /> Group</span>
        )}
      </div>

      <div className="p-3.5">
        <div className="flex gap-3">
          <CategoryTile category={quest.category} size="lg" />
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-2xl uppercase leading-tight">{quest.title}</h2>
            {quest.description && <p className="mt-0.5 text-sm font-semibold text-muted">{quest.description}</p>}
          </div>
        </div>

        <div className="mt-3"><QuestMeta quest={quest} /></div>

        {quest.group && quest.members?.length > 0 && (
          <div className="mt-3 flex items-center gap-2 rounded-xl border-[3px] border-outline bg-surface-2 p-1.5 pr-3">
            <MemberHeads members={quest.members} />
            <p className="min-w-0 flex-1 truncate text-xs font-extrabold">
              With {quest.members.map((m) => m.name).join(', ')}
            </p>
          </div>
        )}

        <button onClick={() => setProofOpen(true)} className="btn btn-neon mt-4 h-14 w-full text-lg">
          <Send size={20} strokeWidth={3} /> Complete & submit proof
        </button>

        <div className="mt-2.5 flex items-center justify-between text-xs font-bold text-muted">
          <span className="flex items-center gap-1">
            <Clock size={12} /> {started ? `Accepted ${started}` : 'In your queue'}
            {queueCount > 1 && ` · ${queueCount - 1} more queued`}
          </span>
          <button
            onClick={() => {
              dropQuest(quest.id)
              toast(quest.custom || quest.group ? 'Quest removed' : 'Quest returned to the board', { tone: 'blue', icon: Undo2 })
            }}
            className="flex items-center gap-1 underline decoration-2 underline-offset-2 hover:text-ink"
          >
            <Undo2 size={12} /> Drop
          </button>
        </div>
      </div>

      {proofOpen && <ProofModal quest={quest} onClose={() => setProofOpen(false)} />}
    </section>
  )
}
