import { Check, Crown, Hourglass, Plus, Search, Send, UserPlus, Users, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import Character from '../components/Character.jsx'
import { Modal, PageTitle, Pill, SectionTitle } from '../components/ui.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { useUser } from '../context/UserContext.jsx'

const STATUS = {
  online: { dot: 'bg-neon', label: 'Online' },
  away: { dot: 'bg-gold', label: 'Away' },
  offline: { dot: 'bg-surface-3', label: 'Offline' },
  pending: { dot: 'bg-surface-3', label: 'Pending' },
}

export default function Social() {
  const { profile, toggleParty, maxParty } = useUser()
  const toast = useToast()
  const [adding, setAdding] = useState(false)

  const invite = (f) => {
    const inParty = profile.party.includes(f.id)
    if (!inParty && profile.party.length >= maxParty) {
      return toast(`Party is full (${maxParty} max)`, { tone: 'pink', icon: Users })
    }
    toggleParty(f.id)
    toast(inParty ? `${f.name} removed from party` : `Party invite sent to ${f.name}!`, { tone: inParty ? 'blue' : 'neon', icon: inParty ? X : Send })
  }

  return (
    <div className="space-y-5">
      <PageTitle
        subtitle="Adventure is better with friends."
        action={
          <button onClick={() => setAdding(true)} className="btn btn-pink size-12 shrink-0" aria-label="Add friend" title="Add friend">
            <UserPlus size={20} strokeWidth={3} />
          </button>
        }
      >
        Social
      </PageTitle>

      <GroupQueue />

      <div className="space-y-5">
        <section className="card p-4">
          <SectionTitle icon={Users} tone="pink">Friends <Pill tone="dark">{profile.friends.length}</Pill></SectionTitle>
          <ul className="space-y-2.5">
            {profile.friends.map((f) => {
              const st = STATUS[f.status]
              const inParty = profile.party.includes(f.id)
              return (
                <li key={f.id} className="flex items-center gap-3 rounded-2xl border-[3px] border-outline bg-surface-2 p-2">
                  <div className="relative shrink-0">
                    <div className="stage size-12 overflow-hidden rounded-xl border-[3px] border-outline">
                      <Character look={f.look} crop="head" className="size-full" />
                    </div>
                    <span className={`absolute -bottom-1 -right-1 size-4 rounded-full border-[3px] border-outline ${st.dot}`} title={st.label} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 font-display text-lg leading-tight">
                      <span className="truncate">{f.name}</span>
                      <Pill tone="grape" className="text-[10px] leading-4">LV {f.level}</Pill>
                    </p>
                    <p className="truncate text-xs font-bold text-muted">{f.note}</p>
                  </div>
                  {f.status === 'pending' ? (
                    <Pill tone="dark" icon={Hourglass}>Sent</Pill>
                  ) : (
                    <button
                      onClick={() => invite(f)}
                      aria-pressed={inParty}
                      className={`btn ${inParty ? 'btn-neon' : 'btn-blue'} h-10 shrink-0 px-3 text-sm`}
                    >
                      {inParty ? <><Check size={16} strokeWidth={3.5} /> Invited</> : <><Plus size={16} strokeWidth={3.5} /> Invite</>}
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        </section>

        <Leaderboard />
      </div>

      {adding && <AddFriendModal onClose={() => setAdding(false)} />}
    </div>
  )
}

/** Placeholder for joining a group quest queue (matchmaking is not built yet). */
function GroupQueue() {
  const { profile, look } = useUser()
  const [searchingSince, setSearchingSince] = useState(null)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!searchingSince) return
    const iv = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(iv)
  }, [searchingSince])

  const party = profile.party.map((id) => profile.friends.find((f) => f.id === id)).filter(Boolean)
  const slots = [...party, ...Array(Math.max(0, 3 - party.length)).fill(null)]
  const secs = searchingSince ? Math.max(0, Math.floor((now - searchingSince) / 1000)) : 0

  return (
    <section className="card stage relative overflow-hidden p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="title-stroke text-2xl uppercase">Group quests</h2>
          <p className="text-sm font-bold text-white/85">Team up for bonus XP on shared quests.</p>
        </div>
        <Pill tone="pink">Preview</Pill>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2">
        <PartySlot look={look} name="You" />
        {slots.map((f, i) => (f ? <PartySlot key={f.id} look={f.look} name={f.name} /> : <PartySlot key={`empty${i}`} />))}
      </div>

      <div className="mt-5">
        {searchingSince ? (
          <div className="flex items-center gap-3">
            <div className="flex h-14 flex-1 items-center justify-center gap-3 rounded-2xl border-[3px] border-outline bg-[#05020f]/50 font-display text-lg uppercase">
              <Search size={20} className="animate-pulse" /> Searching… {Math.floor(secs / 60)}:{String(secs % 60).padStart(2, '0')}
            </div>
            <button onClick={() => setSearchingSince(null)} className="btn btn-pink h-14 px-4 text-base">Cancel</button>
          </div>
        ) : (
          <button onClick={() => { setNow(Date.now()); setSearchingSince(Date.now()) }} className="btn btn-gold h-14 w-full text-xl">
            <Users size={22} strokeWidth={3} /> Join group queue
          </button>
        )}
        <p className="mt-2 text-center text-xs font-bold text-white/70">Group matchmaking is a placeholder in this prototype.</p>
      </div>
    </section>
  )
}

function PartySlot({ look, name }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`grid aspect-square w-full place-items-center overflow-hidden rounded-2xl border-[3px] border-outline ${look ? 'bg-white/15' : 'border-dashed bg-[#05020f]/30'}`}>
        {look ? <Character look={look} crop="head" className="size-full" /> : <Plus size={26} strokeWidth={3} className="text-white/60" />}
      </div>
      <span className="w-full truncate text-center font-display text-xs uppercase [text-shadow:0_2px_0_#05020f]">{name ?? 'Open'}</span>
    </div>
  )
}

function Leaderboard() {
  const { leaderboard } = useUser()
  const medal = ['bg-gold text-on-accent', 'bg-[#d9dcf0] text-[#1a1033]', 'bg-[#e8935a] text-[#1a1033]']
  return (
    <section className="card p-4">
      <SectionTitle icon={Crown} tone="gold">Weekly ranks</SectionTitle>
      <ol className="space-y-2">
        {leaderboard.map((p, i) => (
          <li key={p.id} className={`flex items-center gap-2.5 rounded-2xl border-[3px] p-1.5 pr-3 ${p.me ? 'border-outline bg-gold/25' : 'border-transparent'}`}>
            <span className={`grid size-8 shrink-0 place-items-center rounded-lg border-[3px] border-outline font-display ${medal[i] ?? 'bg-surface-2'}`}>{i + 1}</span>
            <div className="stage size-9 shrink-0 overflow-hidden rounded-lg border-2 border-outline">
              <Character look={p.look} crop="head" className="size-full" />
            </div>
            <span className="min-w-0 flex-1 truncate font-display">{p.name}{p.me && <span className="text-muted"> (you)</span>}</span>
            <span className="font-display tabular-nums">{p.xpWeek} XP</span>
          </li>
        ))}
      </ol>
    </section>
  )
}

function AddFriendModal({ onClose }) {
  const { profile, addFriend } = useUser()
  const toast = useToast()
  const [name, setName] = useState('')
  const trimmed = name.trim()
  const taken = profile.friends.some((f) => f.name.toLowerCase() === trimmed.toLowerCase())
  const error = trimmed && taken ? 'Already on your friends list.' : trimmed.toLowerCase() === profile.username.toLowerCase() ? "That's you!" : ''

  const submit = (e) => {
    e.preventDefault()
    if (!trimmed || error) return
    addFriend(trimmed)
    toast(`Friend request sent to ${trimmed}!`, { tone: 'pink', icon: Send })
    onClose()
  }

  return (
    <Modal onClose={onClose} title="Add a friend" eyebrow="Social">
      <form onSubmit={submit} className="space-y-3">
        <label className="block">
          <span className="mb-1.5 block font-display text-sm uppercase tracking-widest text-muted">Username</span>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={20}
            placeholder="e.g. QuestQueen"
            className="w-full rounded-xl border-[3px] border-outline bg-surface-2 px-3 py-3 font-bold focus:bg-surface focus:outline-none focus:ring-4 focus:ring-blue/40"
          />
        </label>
        {error && <p role="alert" className="text-sm font-bold text-pink">{error}</p>}
        <button type="submit" disabled={!trimmed || !!error} className="btn btn-pink h-14 w-full text-xl">
          <Send size={20} strokeWidth={3} /> Send request
        </button>
        <p className="text-center text-xs font-bold text-muted">Prototype: requests are simulated — no one is actually contacted.</p>
      </form>
    </Modal>
  )
}
