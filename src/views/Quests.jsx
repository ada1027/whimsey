import { Plus, ScrollText, X } from 'lucide-react'
import { useState } from 'react'
import CurrentQuestCard from '../components/CurrentQuestCard.jsx'
import QuestCard from '../components/QuestCard.jsx'
import { PageTitle } from '../components/ui.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { useUser } from '../context/UserContext.jsx'
import { CATEGORIES, DIFFICULTY } from '../data/seed.js'
import { FILL } from '../data/tones.js'

const TABS = [
  { id: 'board', label: 'Board' },
  { id: 'queue', label: 'Queue' },
  { id: 'done', label: 'Done' },
]

export default function Quests({ initialTab = 'board' }) {
  const { availableQuests, activeQuests, completedQuests, currentQuest } = useUser()
  const [tab, setTab] = useState(initialTab)
  const [category, setCategory] = useState('all')
  const [quickOnly, setQuickOnly] = useState(false)
  const [creating, setCreating] = useState(false)

  const counts = { board: availableQuests.length, queue: activeQuests.length, done: completedQuests.length }
  // The current quest is pinned above the tabs, so the queue lists what's up next.
  let list = { board: availableQuests, queue: activeQuests.slice(1), done: completedQuests }[tab]
  if (tab === 'board') {
    if (category !== 'all') list = list.filter((q) => q.category === category)
    if (quickOnly) list = list.filter((q) => q.minutes <= 5)
  }

  return (
    <div className="space-y-5">
      <PageTitle
        subtitle="Pick micro-quests, finish them, earn loot."
        action={
          <button
            onClick={() => setCreating((v) => !v)}
            aria-label={creating ? 'Cancel custom quest' : 'Create custom quest'}
            title={creating ? 'Cancel' : 'Custom quest'}
            className={`btn ${creating ? 'btn-ghost' : 'btn-grape'} size-12 shrink-0`}
          >
            {creating ? <X size={18} strokeWidth={3} /> : <Plus size={18} strokeWidth={3.5} />}
          </button>
        }
      >
        Quests
      </PageTitle>

      <CurrentQuestCard queueCount={activeQuests.length} />

      {creating && <NewQuestForm onDone={() => { setCreating(false); setTab('queue') }} />}

      {/* Tabs */}
      <div className="grid grid-cols-3 gap-2 rounded-2xl border-[3px] border-outline bg-surface-2 p-1.5" role="tablist">
        {TABS.map(({ id, label }) => {
          const active = tab === id
          return (
            <button
              key={id}
              role="tab"
              aria-selected={active}
              onClick={() => setTab(id)}
              className={`flex items-center justify-center gap-1.5 rounded-xl border-[3px] py-2 font-display text-sm uppercase tracking-wide transition
                ${active ? 'border-outline bg-gold text-on-accent shadow-[inset_0_-4px_0_rgb(0_0_0/.2),0_3px_0_var(--outline)]' : 'border-transparent text-muted hover:text-ink'}`}
            >
              {label}
              <span className={`pill px-1.5 text-[11px] leading-4 ${active ? 'bg-surface text-ink' : 'bg-surface-3 text-ink'}`}>{counts[id]}</span>
            </button>
          )
        })}
      </div>

      {/* Board filters */}
      {tab === 'board' && (
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none]">
          <Chip active={category === 'all'} onClick={() => setCategory('all')} tone="gold">All</Chip>
          {Object.entries(CATEGORIES).map(([id, c]) => (
            <Chip key={id} active={category === id} onClick={() => setCategory(id)} tone={c.tone}>{c.label}</Chip>
          ))}
          <span className="mx-1 w-[3px] shrink-0 rounded bg-outline/30" />
          <Chip active={quickOnly} onClick={() => setQuickOnly((v) => !v)} tone="blue">≤ 5 min</Chip>
        </div>
      )}

      {tab === 'queue' && list.length > 0 && (
        <p className="font-display text-sm uppercase tracking-widest text-muted">Up next</p>
      )}

      <div className="space-y-4">
        {list.map((q) => <QuestCard key={q.id} quest={q} />)}
      </div>

      {list.length === 0 && !(tab === 'queue' && currentQuest) && (
        <div className="card flex flex-col items-center gap-3 p-10 text-center">
          <ScrollText size={36} />
          <p className="font-display text-xl uppercase">
            {tab === 'board' ? 'No quests here' : tab === 'queue' ? 'Your queue is empty' : 'Nothing done yet'}
          </p>
          <p className="text-sm font-bold text-muted">
            {tab === 'board' ? 'Try another filter.' : tab === 'queue' ? 'Accept a quest from the board to get started.' : 'Complete a quest to see it here.'}
          </p>
          {tab !== 'board' && (
            <button onClick={() => setTab('board')} className="btn btn-gold mt-1 h-11 px-5">Browse the board</button>
          )}
        </div>
      )}
    </div>
  )
}

function Chip({ active, onClick, tone, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`pill shrink-0 rounded-xl px-3 py-1 text-sm transition ${active ? `${FILL[tone]} -translate-y-0.5` : 'bg-surface text-muted shadow-none'}`}
    >
      {children}
    </button>
  )
}

function NewQuestForm({ onDone }) {
  const { addQuest } = useUser()
  const toast = useToast()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('mind')
  const [difficulty, setDifficulty] = useState('easy')
  const [minutes, setMinutes] = useState(5)

  const submit = (e) => {
    e.preventDefault()
    if (!title.trim()) return
    addQuest({ title: title.trim(), description: description.trim(), category, difficulty, minutes })
    toast('Custom quest added to your queue!', { tone: 'grape', icon: Plus })
    onDone()
  }

  const input = 'w-full rounded-xl border-[3px] border-outline bg-surface-2 px-3 py-2.5 font-bold placeholder:text-muted/80 focus:bg-surface focus:outline-none focus:ring-4 focus:ring-blue/40'
  const label = 'mb-1.5 font-display text-sm uppercase tracking-widest text-muted'

  return (
    <form onSubmit={submit} className="card animate-pop space-y-4 p-4">
      <input autoFocus aria-label="Quest name" className={input} placeholder="Quest name (e.g. Meditate for 5 min)" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} />
      <input aria-label="Description" className={input} placeholder="Short description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={100} />

      <fieldset>
        <legend className={label}>Category</legend>
        <div className="flex flex-wrap gap-2">
          {Object.entries(CATEGORIES).map(([id, c]) => (
            <Chip key={id} active={category === id} onClick={() => setCategory(id)} tone={c.tone}>{c.label}</Chip>
          ))}
        </div>
      </fieldset>

      <div className="space-y-4">
        <fieldset>
          <legend className={label}>Difficulty</legend>
          <div className="flex flex-wrap gap-2">
            {Object.entries(DIFFICULTY).map(([id, d]) => (
              <Chip key={id} active={difficulty === id} onClick={() => setDifficulty(id)} tone={d.tone}>{d.label} · {d.xp} XP</Chip>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className={label}>Time</legend>
          <div className="flex flex-wrap gap-2">
            {[2, 5, 10, 20, 30].map((m) => (
              <Chip key={m} active={minutes === m} onClick={() => setMinutes(m)} tone="blue">{m} min</Chip>
            ))}
          </div>
        </fieldset>
      </div>

      <button type="submit" disabled={!title.trim()} className="btn btn-neon h-12 w-full text-lg">
        <Plus size={20} strokeWidth={3.5} /> Add to my queue
      </button>
    </form>
  )
}
