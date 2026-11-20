import { FlagOff, Send, TimerOff, Users } from 'lucide-react'
import { useState } from 'react'
import { useUser } from '../context/UserContext.jsx'
import { QUEST_TYPE_LABEL } from '../data/seed.js'
import ProofModal from './ProofModal.jsx'
import { CategoryTile, Countdown, MemberHeads, PenaltyLine, QuestMeta } from './QuestBits.jsx'
import { Modal } from './ui.jsx'

/** Shared body: timer, rewards, penalty, proof button and test controls. */
function ActiveQuestBody({ quest, onProofOpen }) {
  const { failQuest } = useUser()
  return (
    <>
      <div className="flex gap-3">
        <CategoryTile category={quest.category} size="lg" />
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-2xl uppercase leading-tight">{quest.title}</h2>
          {quest.description && <p className="mt-0.5 text-sm font-semibold text-muted">{quest.description}</p>}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 rounded-2xl border-[3px] border-outline bg-surface-2 p-2 pl-3">
        <span className="font-display text-sm uppercase tracking-widest text-muted">Time left</span>
        <Countdown expiresAt={quest.expiresAt} size="lg" />
      </div>
      <div className="mt-2"><PenaltyLine penalty={quest.penalty} /></div>

      <div className="mt-3"><QuestMeta quest={quest} /></div>

      {quest.group && quest.members?.length > 0 && (
        <div className="mt-3 flex items-center gap-2 rounded-xl border-[3px] border-outline bg-surface-2 p-1.5 pr-3">
          <MemberHeads members={quest.members} />
          <p className="min-w-0 flex-1 truncate text-xs font-extrabold">With {quest.members.map((m) => m.name).join(', ')}</p>
        </div>
      )}

      <button onClick={onProofOpen} className="btn btn-neon mt-4 h-14 w-full text-lg">
        <Send size={20} strokeWidth={3} /> Complete & submit proof
      </button>

      <div className="mt-3 flex items-center justify-between gap-2">
        {/* For usability sessions: jump straight to the time-expired failure state. */}
        <button
          onClick={() => failQuest(quest.id, 'expired')}
          className="flex items-center gap-1 rounded-lg border-2 border-dashed border-muted/60 px-2 py-1 text-xs font-extrabold text-muted hover:text-ink"
        >
          <TimerOff size={13} /> Test: Expire Timer
        </button>
        <button
          onClick={() => { if (confirm(`Give up "${quest.title}"? The penalty still applies.`)) failQuest(quest.id, 'gave_up') }}
          className="flex items-center gap-1 text-xs font-bold text-muted underline decoration-2 underline-offset-2 hover:text-pink"
        >
          <FlagOff size={13} /> Give up
        </button>
      </div>
    </>
  )
}

function Header({ quest }) {
  return (
    <div className={`stripes flex items-center justify-between gap-2 border-b-[3px] border-outline px-3 py-1.5 ${quest.group ? 'bg-blue' : 'bg-pink'}`}>
      <span className="flex items-center gap-1.5 font-display text-sm uppercase tracking-wider text-white [text-shadow:0_2px_0_#05020f]">
        <span className="live-dot size-2.5 rounded-full border-2 border-outline bg-neon" />
        Current quest in progress
      </span>
      {quest.group && <span className="pill bg-gold text-on-accent"><Users size={12} strokeWidth={3} /> Group</span>}
    </div>
  )
}

/**
 * Pinned, glowing card for the quest in progress.
 * Shown at the top of Home and Quests whenever there is an active quest.
 */
export default function CurrentQuestCard() {
  const { activeQuest: quest } = useUser()
  const [proofOpen, setProofOpen] = useState(false)
  if (!quest) return null
  return (
    <section key={quest.id} aria-label="Current quest in progress" className="quest-live relative animate-pop overflow-hidden rounded-3xl border-[3px] bg-surface">
      <Header quest={quest} />
      <div className="p-3.5"><ActiveQuestBody quest={quest} onProofOpen={() => setProofOpen(true)} /></div>
      {proofOpen && <ProofModal quest={quest} onClose={() => setProofOpen(false)} />}
    </section>
  )
}

/** Detail view opened from the minimized dock, on any tab. */
export function ActiveQuestSheet({ onClose }) {
  const { activeQuest: quest } = useUser()
  const [proofOpen, setProofOpen] = useState(false)
  if (!quest) return null
  if (proofOpen) return <ProofModal quest={quest} onClose={() => { setProofOpen(false); onClose() }} />
  return (
    <Modal onClose={onClose} title="Active quest" eyebrow={QUEST_TYPE_LABEL[quest.type] ?? 'Quest'}>
      <ActiveQuestBody quest={quest} onProofOpen={() => setProofOpen(true)} />
    </Modal>
  )
}
