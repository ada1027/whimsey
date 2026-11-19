import { Check, Crown, DoorOpen, Hourglass, LogIn, Plus, Search, Send, UserPlus, Users, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import Character from '../components/Character.jsx'
import MatchFoundModal from '../components/MatchFoundModal.jsx'
import { Modal, PageTitle, Pill, SectionTitle } from '../components/ui.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { useUser } from '../context/UserContext.jsx'
import { GROUP_QUESTS, MAX_PARTY_SIZE, playerSnapshot, RANDOM_PLAYERS, SEED_LOBBIES } from '../data/seed.js'

const SEARCH_MS = 2600 // "Searching for group quest…" duration
const LEADER_QUEUE_DELAY_MS = 1500 // mock leader starts the queue after you ready up

const STATUS = {
  online: { dot: 'bg-neon', label: 'Online' },
  away: { dot: 'bg-gold', label: 'Away' },
  offline: { dot: 'bg-surface-3', label: 'Offline' },
  pending: { dot: 'bg-surface-3', label: 'Pending' },
}

const pickRandom = (arr, n) => [...arr].sort(() => Math.random() - 0.5).slice(0, n)

export default function Social({ onNavigate }) {
  const { party } = useUser()
  const [adding, setAdding] = useState(false)
  const [inviting, setInviting] = useState(false)

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

      {/* Re-keyed on every party change (join / leave / kick) so any matchmaking in progress resets. */}
      <PartyLobby key={`${party.leaderId}:${party.members.map((m) => m.id).join(',')}`} onNavigate={onNavigate} onInvite={() => setInviting(true)} />
      <JoinableParties />
      <FriendsList />
      <Leaderboard />

      {adding && <AddFriendModal onClose={() => setAdding(false)} />}
      {inviting && <InviteModal onClose={() => setInviting(false)} />}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Party lobby + matchmaking                                           */
/* ------------------------------------------------------------------ */

function PartyLobby({ onNavigate, onInvite }) {
  const { party, isLeader, inParty, partyLeader, look, kickFromParty, leaveParty, addGroupQuest } = useUser()
  const toast = useToast()
  // idle → (ready → ) searching → found
  const [phase, setPhase] = useState('idle')
  const [match, setMatch] = useState(null)
  const [searchStart, setSearchStart] = useState(0)
  const [now, setNow] = useState(0)
  const timers = useRef([])

  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = [] }
  useEffect(() => clearTimers, [])


  // Ticking timer while searching.
  useEffect(() => {
    if (phase !== 'searching') return
    const iv = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(iv)
  }, [phase])

  const startSearch = () => {
    clearTimers()
    setSearchStart(Date.now()); setNow(Date.now())
    setPhase('searching')
    timers.current.push(setTimeout(() => {
      const quest = GROUP_QUESTS[Math.floor(Math.random() * GROUP_QUESTS.length)]
      // With a party, you play with your party; solo, you're matched with 2–3 randoms.
      const members = inParty ? party.members : pickRandom(RANDOM_PLAYERS, 2 + Math.floor(Math.random() * 2))
      setMatch({ quest, members })
      setPhase('found')
    }, SEARCH_MS))
  }

  const readyUp = () => {
    setPhase('ready')
    timers.current.push(setTimeout(startSearch, LEADER_QUEUE_DELAY_MS))
  }

  const cancel = () => { clearTimers(); setPhase('idle') }

  const accept = () => {
    addGroupQuest(match)
    toast('Group quest accepted — go team!', { tone: 'blue', icon: Users })
    setPhase('idle'); setMatch(null)
    onNavigate('quests', { tab: 'queue' })
  }

  const decline = useCallback((timedOut) => {
    setPhase('idle'); setMatch(null)
    toast(timedOut ? 'Match expired' : 'Match declined', { tone: 'pink', icon: X })
  }, [toast])

  const leave = () => {
    const leaderName = partyLeader?.name
    leaveParty()
    toast(leaderName ? `You left ${leaderName}'s party` : 'Party disbanded', { tone: 'pink', icon: DoorOpen })
  }

  const kick = (m) => {
    kickFromParty(m.id)
    toast(`${m.name} removed from party`, { tone: 'blue', icon: X })
  }

  const openSlots = MAX_PARTY_SIZE - 1 - party.members.length
  const secs = Math.max(0, Math.floor((now - searchStart) / 1000))
  const label = !inParty ? 'Solo' : isLeader ? 'Your party' : `${partyLeader?.name}'s party`

  // Slot order: leader first.
  const me = { id: 'me', name: 'You', look, me: true }
  const ordered = isLeader
    ? [me, ...party.members]
    : [party.members.find((m) => m.id === party.leaderId), me, ...party.members.filter((m) => m.id !== party.leaderId)].filter(Boolean)

  return (
    <>
    <section className="card stage relative overflow-hidden p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="title-stroke text-2xl uppercase">Party lobby</h2>
          <p className="flex items-center gap-1.5 text-sm font-bold text-white/85">
            <Pill tone={inParty ? 'neon' : 'dark'}>{label}</Pill>
            {party.members.length + 1}/{MAX_PARTY_SIZE}
          </p>
        </div>
        {inParty && (
          <button onClick={leave} className="btn btn-pink h-10 shrink-0 px-3 text-sm">
            <DoorOpen size={16} strokeWidth={3} /> Leave party
          </button>
        )}
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2">
        {ordered.map((m) => (
          <PartySlot
            key={m.id}
            player={m}
            leader={(m.me && isLeader) || m.id === party.leaderId}
            onKick={isLeader && !m.me ? () => kick(m) : null}
          />
        ))}
        {Array.from({ length: openSlots }, (_, i) => (
          <OpenSlot key={`open${i}`} canInvite={isLeader} onClick={onInvite} />
        ))}
      </div>

      <div className="mt-5">
        {phase === 'searching' || phase === 'found' ? (
          <div className="flex items-center gap-3">
            <div className="relative flex h-14 flex-1 items-center justify-center gap-3 overflow-hidden rounded-2xl border-[3px] border-outline bg-[#05020f]/55 font-display uppercase">
              <span className="relative grid size-6 place-items-center">
                <span className="radar-ring absolute inset-0 rounded-full border-2 border-blue" />
                <Search size={18} strokeWidth={3} />
              </span>
              <span className="text-base leading-tight">Searching for group quest… <span className="tabular-nums text-blue">0:{String(secs).padStart(2, '0')}</span></span>
            </div>
            <button onClick={cancel} className="btn btn-pink h-14 px-3 text-sm" aria-label="Cancel search">
              <X size={18} strokeWidth={3.5} />
            </button>
          </div>
        ) : isLeader ? (
          <>
            <button onClick={startSearch} className="btn btn-gold h-14 w-full text-xl">
              <Users size={22} strokeWidth={3} /> Join group queue
            </button>
            <p className="mt-2 text-center text-xs font-bold text-white/80">
              {inParty ? `Queues your party of ${party.members.length + 1} for a shared quest.` : "Queue solo and we'll match you with other players."}
            </p>
          </>
        ) : phase === 'ready' ? (
          <div className="flex h-14 items-center justify-center gap-2 rounded-2xl border-[3px] border-outline bg-neon font-display text-lg uppercase text-on-accent">
            <Check size={20} strokeWidth={3.5} /> Ready! Waiting for {partyLeader?.name}…
          </div>
        ) : (
          <>
            <button onClick={readyUp} className="btn btn-neon h-14 w-full text-xl">
              <Check size={22} strokeWidth={3.5} /> Ready up
            </button>
            <p className="mt-2 flex items-center justify-center gap-1 text-center text-xs font-bold text-white/80">
              <Crown size={12} /> Only {partyLeader?.name} (leader) can start the queue.
            </p>
          </>
        )}
      </div>
    </section>
    {phase === 'found' && match && <MatchFoundModal match={match} onAccept={accept} onDecline={decline} />}
    </>
  )
}

function PartySlot({ player, leader, onKick }) {
  return (
    <div className="relative flex flex-col items-center gap-1">
      {leader && (
        <span className="absolute -top-2.5 left-1/2 z-10 -translate-x-1/2 pill bg-gold px-1 py-0 text-on-accent" title="Party leader" aria-label="Party leader">
          <Crown size={12} strokeWidth={3} fill="currentColor" />
        </span>
      )}
      <div className={`aspect-square w-full overflow-hidden rounded-2xl border-[3px] border-outline bg-white/15 ${leader ? 'ring-2 ring-gold' : ''}`}>
        <Character look={player.look} crop="head" className="size-full" />
      </div>
      {onKick && (
        <button
          onClick={onKick}
          className="btn btn-pink absolute -right-1.5 -top-1.5 size-6 rounded-lg border-2 p-0"
          aria-label={`Remove ${player.name} from party`}
          title="Remove from party"
        >
          <X size={12} strokeWidth={4} />
        </button>
      )}
      <span className="w-full truncate text-center font-display text-xs uppercase [text-shadow:0_2px_0_#05020f]">{player.name}</span>
    </div>
  )
}

function OpenSlot({ canInvite, onClick }) {
  const inner = (
    <>
      <span className="grid aspect-square w-full place-items-center rounded-2xl border-[3px] border-dashed border-outline bg-[#05020f]/30">
        <Plus size={26} strokeWidth={3} className={canInvite ? 'text-white' : 'text-white/40'} />
      </span>
      <span className="w-full truncate text-center font-display text-xs uppercase text-white/80 [text-shadow:0_2px_0_#05020f]">
        {canInvite ? 'Invite' : 'Open'}
      </span>
    </>
  )
  return canInvite ? (
    <button onClick={onClick} className="flex flex-col items-center gap-1 transition hover:-translate-y-0.5" aria-label="Invite a friend">{inner}</button>
  ) : (
    <div className="flex flex-col items-center gap-1">{inner}</div>
  )
}

/* ------------------------------------------------------------------ */
/* Joinable friend lobbies                                             */
/* ------------------------------------------------------------------ */

function JoinableParties() {
  const { party, inParty, partyLeader, joinLobby } = useUser()
  const toast = useToast()

  const join = (lobby, leaderName) => {
    const hadParty = inParty && party.lobbyId !== lobby.id
    joinLobby(lobby)
    toast(hadParty ? `Left your party and joined ${leaderName}'s` : `Joined ${leaderName}'s party!`, { tone: 'neon', icon: LogIn })
  }

  return (
    <section className="card p-4">
      <SectionTitle icon={LogIn} tone="blue">Joinable parties</SectionTitle>
      <ul className="space-y-2.5">
        {SEED_LOBBIES.map((lobby) => {
          const players = lobby.memberIds.map(playerSnapshot)
          const leader = players[0]
          const joined = party.lobbyId === lobby.id
          const count = lobby.memberIds.length + (joined ? 1 : 0)
          const full = !joined && lobby.memberIds.length >= MAX_PARTY_SIZE
          return (
            <li key={lobby.id} className={`flex items-center gap-3 rounded-2xl border-[3px] border-outline p-2 ${joined ? 'bg-neon/25' : 'bg-surface-2'}`}>
              <div className="flex -space-x-2">
                {players.map((p, i) => (
                  <div key={p.id} className="relative">
                    {i === 0 && <Crown size={14} fill="currentColor" className="absolute -top-2.5 left-1/2 z-10 -translate-x-1/2 text-gold drop-shadow-[0_1px_0_#05020f]" />}
                    <div className="stage size-11 overflow-hidden rounded-xl border-[3px] border-outline">
                      <Character look={p.look} crop="head" className="size-full" />
                    </div>
                  </div>
                ))}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-lg leading-tight">{leader.name}&apos;s party</p>
                <p className="truncate text-xs font-bold text-muted">{lobby.vibe}</p>
                <Pill tone="dark" className="mt-1 text-[10px] leading-4">{count}/{MAX_PARTY_SIZE} players</Pill>
              </div>
              {joined ? (
                <Pill tone="neon" icon={Check}>In party</Pill>
              ) : (
                <button onClick={() => join(lobby, leader.name)} disabled={full} className="btn btn-blue h-10 shrink-0 px-3 text-sm">
                  {full ? 'Full' : <><LogIn size={16} strokeWidth={3} /> Join</>}
                </button>
              )}
            </li>
          )
        })}
      </ul>
      {inParty && !partyLeader && (
        <p className="mt-2 text-xs font-bold text-muted">Joining another party will leave your current one.</p>
      )}
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Friends                                                             */
/* ------------------------------------------------------------------ */

function useInvite() {
  const { party, isLeader, inviteToParty, kickFromParty } = useUser()
  const toast = useToast()
  const full = party.members.length >= MAX_PARTY_SIZE - 1
  return {
    canInvite: isLeader,
    inParty: (id) => party.members.some((m) => m.id === id),
    toggle: (f) => {
      if (party.members.some((m) => m.id === f.id)) {
        kickFromParty(f.id)
        return toast(`${f.name} removed from party`, { tone: 'blue', icon: X })
      }
      if (full) return toast(`Party is full (${MAX_PARTY_SIZE} max)`, { tone: 'pink', icon: Users })
      inviteToParty(f.id)
      toast(`${f.name} joined your party!`, { tone: 'neon', icon: Send })
    },
  }
}

function FriendAction({ f }) {
  const { canInvite, inParty, toggle } = useInvite()
  if (f.status === 'pending') return <Pill tone="dark" icon={Hourglass}>Sent</Pill>
  if (inParty(f.id)) {
    return canInvite ? (
      <button onClick={() => toggle(f)} className="btn btn-neon h-10 shrink-0 px-3 text-sm" aria-label={`Remove ${f.name} from party`}>
        <Check size={16} strokeWidth={3.5} /> In party
      </button>
    ) : <Pill tone="neon" icon={Check}>In party</Pill>
  }
  if (f.status === 'offline') return <Pill tone="dark">Offline</Pill>
  if (!canInvite) return null
  return (
    <button onClick={() => toggle(f)} className="btn btn-blue h-10 shrink-0 px-3 text-sm">
      <Plus size={16} strokeWidth={3.5} /> Invite
    </button>
  )
}

function FriendRow({ f }) {
  const st = STATUS[f.status]
  return (
    <li className="flex items-center gap-3 rounded-2xl border-[3px] border-outline bg-surface-2 p-2">
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
      <FriendAction f={f} />
    </li>
  )
}

function FriendsList() {
  const { profile, isLeader, partyLeader } = useUser()
  return (
    <section className="card p-4">
      <SectionTitle icon={Users} tone="pink">Friends <Pill tone="dark">{profile.friends.length}</Pill></SectionTitle>
      {!isLeader && (
        <p className="mb-2 text-xs font-bold text-muted">You&apos;re in {partyLeader?.name}&apos;s party — only the leader can invite.</p>
      )}
      <ul className="space-y-2.5">
        {profile.friends.map((f) => <FriendRow key={f.id} f={f} />)}
      </ul>
    </section>
  )
}

function InviteModal({ onClose }) {
  const { profile } = useUser()
  const invitable = profile.friends.filter((f) => f.status !== 'pending')
  return (
    <Modal onClose={onClose} title="Invite to party" eyebrow="Party lobby">
      <ul className="space-y-2.5">
        {invitable.map((f) => <FriendRow key={f.id} f={f} />)}
      </ul>
      <button onClick={onClose} className="btn btn-gold mt-4 h-12 w-full text-lg">Done</button>
    </Modal>
  )
}

/* ------------------------------------------------------------------ */
/* Leaderboard + add friend                                            */
/* ------------------------------------------------------------------ */

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
      </form>
    </Modal>
  )
}
