import {
  Bot, Check, Crown, DoorOpen, Hourglass, Loader2, Lock, LogIn, Plus, RefreshCw, Search, Send, Swords, UserCheck, UserPlus, Users, Vote, X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import Character from '../components/Character.jsx'
import FriendFeed from '../components/FriendFeed.jsx'
import { Modal, PageTitle, Pill, SectionTitle } from '../components/ui.jsx'
import { presence, useOnline } from '../context/OnlineContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { useUser } from '../context/UserContext.jsx'
import { MAX_PARTY_SIZE } from '../data/seed.js'
import { parseAvatar } from '../lib/api.js'

const lookOf = (profile) => parseAvatar(profile?.avatar).look

/** params.scrollTo: 'friends' | 'ranks' — smooth-scrolls to that section once data has loaded. */
export default function Social({ onNavigate, params = {} }) {
  const { loaded, error } = useOnline()
  const [adding, setAdding] = useState(false)
  const [inviting, setInviting] = useState(false)

  useEffect(() => {
    if (!loaded || !params.scrollTo) return
    const t = setTimeout(() => document.getElementById(`${params.scrollTo}-section`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120)
    return () => clearTimeout(t)
  }, [loaded, params.scrollTo])

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

      {error && <p role="alert" className="card bg-pink p-3 text-sm font-bold text-white">Sync problem: {error}</p>}
      {!loaded && !error && (
        <p className="flex items-center justify-center gap-2 py-8 font-display uppercase text-muted"><Loader2 className="animate-spin" /> Connecting…</p>
      )}

      {loaded && (
        <>
          <FriendFeed limit={3} title="Latest from friends" />
          <PartyCard onNavigate={onNavigate} onInvite={() => setInviting(true)} />
          <FriendRequests />
          <JoinableParties />
          <FriendsList onAdd={() => setAdding(true)} />
          <Leaderboard />
        </>
      )}

      {adding && <AddFriendModal onClose={() => setAdding(false)} />}
      {inviting && <InviteModal onClose={() => setInviting(false)} />}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Party card: lobby → voting → active quest → completed               */
/* ------------------------------------------------------------------ */

function PartyCard({ onNavigate, onInvite }) {
  const online = useOnline()
  const { party, me, isLeader, inParty, partyLeader, myMember, hasBots, searching } = online
  const { look, profile, activeQuest } = useUser()
  const toast = useToast()
  // One quest at a time: an active solo quest blocks queueing / readying up.
  const busySolo = activeQuest && !activeQuest.group ? activeQuest : null

  // Solo (no party row yet): show just you as leader.
  const members = party?.members ?? [{ user_id: me, profile: { username: profile.username }, look, is_ready: true }]
  const status = party?.status ?? 'lobby'
  const openSlots = MAX_PARTY_SIZE - members.length
  const notReady = members.filter((m) => m.user_id !== party?.leader_id && !m.is_ready)
  const doneCount = members.filter((m) => m.has_completed).length
  const label = !inParty ? 'Solo' : isLeader ? 'Your party' : `${partyLeader?.profile.username}'s party`

  const leave = async () => {
    const name = partyLeader?.profile.username
    await online.leave()
    toast(isLeader ? 'You left the party' : `You left ${name}'s party`, { tone: 'pink', icon: DoorOpen })
  }

  return (
    <section className="card stage relative overflow-hidden p-4" aria-label="Party lobby">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="title-stroke text-2xl uppercase">Party lobby</h2>
          <p className="flex items-center gap-1.5 text-sm font-bold text-white/85">
            <Pill tone={inParty ? 'neon' : 'dark'}>{label}</Pill>
            {members.length}/{MAX_PARTY_SIZE}
            {status !== 'lobby' && <Pill tone="gold">{{ voting: 'Voting', active_quest: 'Quest active', completed: 'Complete!' }[status]}</Pill>}
          </p>
        </div>
        {party && (
          <button onClick={leave} className="btn btn-pink h-10 shrink-0 px-3 text-sm">
            <DoorOpen size={16} strokeWidth={3} /> Leave
          </button>
        )}
      </div>

      {isLeader && status === 'lobby' && (
        <label className="mt-3 flex cursor-pointer items-center justify-between gap-3 rounded-xl border-[3px] border-outline bg-[#05020f]/35 px-3 py-2">
          <span className="flex items-center gap-2 font-display text-sm uppercase tracking-wide">
            <Bot size={18} strokeWidth={2.75} /> Simulate bot teammates
          </span>
          <Switch checked={hasBots} onChange={() => online.setBots(!hasBots)} label="Simulate bot teammates" />
        </label>
      )}

      <div className="mt-4 grid grid-cols-4 gap-2">
        {members.map((m) => (
          <PartySlot
            key={m.user_id}
            member={m}
            isMe={m.user_id === me}
            leader={m.user_id === (party?.leader_id ?? me)}
            status={status}
            onKick={isLeader && m.user_id !== me && status === 'lobby' ? () => online.kick(m.user_id) : null}
          />
        ))}
        {Array.from({ length: openSlots }, (_, i) => <OpenSlot key={`open${i}`} canInvite={isLeader && status === 'lobby'} onClick={onInvite} />)}
      </div>

      <div className="mt-5">
        {searching ? (
          <div className="flex h-14 items-center justify-center gap-3 rounded-2xl border-[3px] border-outline bg-[#05020f]/55 font-display uppercase">
            <span className="relative grid size-6 place-items-center">
              <span className="radar-ring absolute inset-0 rounded-full border-2 border-blue" />
              <Search size={18} strokeWidth={3} />
            </span>
            Searching for group quest…
          </div>
        ) : status === 'voting' ? (
          <button onClick={online.showVote} className="btn btn-blue h-14 w-full text-xl"><Vote size={22} strokeWidth={3} /> Quest popped — vote!</button>
        ) : status === 'active_quest' ? (
          <>
            <button onClick={() => onNavigate('quests', { tab: 'queue' })} className="btn btn-neon h-14 w-full text-lg">
              <Swords size={20} strokeWidth={3} /> {party.current_quest?.title} · {doneCount}/{members.length} done
            </button>
            <p className="mt-2 text-center text-xs font-bold text-white/80">Submit proof from the quest card — teammates see it live.</p>
          </>
        ) : status === 'completed' ? (
          <div className="flex h-14 items-center justify-center gap-2 rounded-2xl border-[3px] border-outline bg-gold font-display text-xl uppercase text-on-accent">
            🎉 Party quest complete!
          </div>
        ) : busySolo && status === 'lobby' ? (
          <>
            <button disabled className="btn btn-ghost h-14 w-full text-lg"><Lock size={18} strokeWidth={3} /> Finish active quest first</button>
            <p className="mt-2 text-center text-xs font-bold text-white/80">You&apos;re on &ldquo;{busySolo.title}&rdquo;. Complete it before joining a group quest.</p>
          </>
        ) : isLeader ? (
          members.length < 2 ? (
            <>
              <button onClick={online.findGroupSolo} className="btn btn-gold h-14 w-full text-xl"><Users size={22} strokeWidth={3} /> Join group queue</button>
              <p className="mt-2 text-center text-xs font-bold text-white/80">Solo? We&apos;ll match you with simulated teammates — or invite friends first.</p>
            </>
          ) : (
            <>
              <button onClick={online.startQueue} disabled={notReady.length > 0} className="btn btn-gold h-14 w-full text-xl">
                <Users size={22} strokeWidth={3} /> Join group queue
              </button>
              <p className="mt-2 text-center text-xs font-bold text-white/80">
                {notReady.length ? `Waiting for ${notReady.map((m) => m.profile.username).join(', ')} to ready up…` : `Everyone's ready! Queue your party of ${members.length}.`}
              </p>
            </>
          )
        ) : (
          <>
            <button onClick={() => online.setReady(!myMember?.is_ready)} className={`btn h-14 w-full text-xl ${myMember?.is_ready ? 'btn-ghost' : 'btn-neon'}`}>
              {myMember?.is_ready ? <><X size={20} strokeWidth={3.5} /> Unready</> : <><Check size={22} strokeWidth={3.5} /> Ready up</>}
            </button>
            <p className="mt-2 flex items-center justify-center gap-1 text-center text-xs font-bold text-white/80">
              <Crown size={12} /> {myMember?.is_ready ? `Ready! Waiting for ${partyLeader?.profile.username} to queue…` : `Only ${partyLeader?.profile.username} (leader) can start the queue.`}
            </p>
          </>
        )}
      </div>
    </section>
  )
}

function Switch({ checked, onChange, label }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={onChange}
      className={`relative h-7 w-12 shrink-0 rounded-full border-[3px] border-outline transition ${checked ? 'bg-neon' : 'bg-surface-3'}`}>
      <span className={`absolute top-0.5 size-[18px] rounded-full border-2 border-outline bg-white transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  )
}

const isViewable = (url) => /^(https?:|data:image)/.test(url ?? '')

function PartySlot({ member, isMe, leader, status, onKick }) {
  const name = isMe ? 'You' : member.profile.username
  const badge =
    status === 'lobby' ? (leader ? null : member.is_ready ? { tone: 'bg-neon text-on-accent', text: 'Ready' } : { tone: 'bg-surface-3 text-ink', text: '…' })
      : status === 'active_quest' || status === 'completed'
        ? (member.proof_url?.startsWith('failed:') ? { tone: 'bg-pink text-white', text: 'Failed' }
          : member.has_completed ? { tone: 'bg-neon text-on-accent', text: 'Done' } : { tone: 'bg-surface-3 text-ink', text: '…' })
        : null
  return (
    <div className="relative flex flex-col items-center gap-1">
      {leader && (
        <span className="absolute -top-2.5 left-1/2 z-10 -translate-x-1/2 pill bg-gold px-1 py-0 text-on-accent" title="Party leader" aria-label="Party leader">
          <Crown size={12} strokeWidth={3} fill="currentColor" />
        </span>
      )}
      <div className={`relative aspect-square w-full overflow-hidden rounded-2xl border-[3px] border-outline bg-white/15 ${leader ? 'ring-2 ring-gold' : ''}`}>
        <Character look={member.look} crop="head" className="size-full" />
        {badge && <span className={`pill absolute bottom-0.5 right-0.5 px-1 py-0 text-[9px] leading-4 ${badge.tone}`}>{badge.text}</span>}
        {isViewable(member.proof_url) && (
          <a href={member.proof_url} target="_blank" rel="noreferrer" className="absolute bottom-0.5 left-0.5 size-6 overflow-hidden rounded-md border-2 border-outline" title="View proof">
            <img src={member.proof_url} alt={`${name}'s proof`} className="size-full object-cover" />
          </a>
        )}
      </div>
      {member.profile.is_bot && <span className="pill absolute left-0 top-0 bg-blue px-1 py-0 text-[9px] text-on-accent">Bot</span>}
      {onKick && (
        <button onClick={onKick} className="btn btn-pink absolute -right-1.5 -top-1.5 size-6 rounded-lg border-2 p-0" aria-label={`Remove ${name} from party`} title="Remove from party">
          <X size={12} strokeWidth={4} />
        </button>
      )}
      <span className="w-full truncate text-center font-display text-xs uppercase [text-shadow:0_2px_0_#05020f]">{name}</span>
    </div>
  )
}

function OpenSlot({ canInvite, onClick }) {
  const inner = (
    <>
      <span className="grid aspect-square w-full place-items-center rounded-2xl border-[3px] border-dashed border-outline bg-[#05020f]/30">
        <Plus size={26} strokeWidth={3} className={canInvite ? 'text-white' : 'text-white/40'} />
      </span>
      <span className="w-full truncate text-center font-display text-xs uppercase text-white/80 [text-shadow:0_2px_0_#05020f]">{canInvite ? 'Invite' : 'Open'}</span>
    </>
  )
  return canInvite
    ? <button onClick={onClick} className="flex flex-col items-center gap-1 transition hover:-translate-y-0.5" aria-label="Invite a friend">{inner}</button>
    : <div className="flex flex-col items-center gap-1">{inner}</div>
}

/* ------------------------------------------------------------------ */
/* Requests, joinable parties, friends, leaderboard                    */
/* ------------------------------------------------------------------ */

function Head({ profile, size = 'size-12', dot }) {
  return (
    <div className="relative shrink-0">
      <div className={`stage ${size} overflow-hidden rounded-xl border-[3px] border-outline`}>
        <Character look={lookOf(profile)} crop="head" className="size-full" />
      </div>
      {dot && <span className={`absolute -bottom-1 -right-1 size-4 rounded-full border-[3px] border-outline ${dot}`} />}
    </div>
  )
}

function PersonRow({ profile, note, children }) {
  const p = presence(profile)
  return (
    <li className="flex items-center gap-3 rounded-2xl border-[3px] border-outline bg-surface-2 p-2">
      <Head profile={profile} dot={p.dot} />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 font-display text-lg leading-tight">
          <span className="truncate">{profile.username}</span>
          <Pill tone="grape" className="text-[10px] leading-4">LV {profile.level}</Pill>
        </p>
        <p className="truncate text-xs font-bold text-muted">{note ?? p.label}</p>
      </div>
      {children}
    </li>
  )
}

function FriendRequests() {
  const { incoming, acceptFriend, removeFriendship } = useOnline()
  if (!incoming.length) return null
  return (
    <section className="card p-4">
      <SectionTitle icon={UserCheck} tone="neon">Friend requests <Pill tone="pink">{incoming.length}</Pill></SectionTitle>
      <ul className="space-y-2.5">
        {incoming.map((f) => (
          <PersonRow key={f.id} profile={f.profile} note="Wants to be friends">
            <button onClick={() => removeFriendship(f.id)} className="btn btn-ghost size-10 rounded-xl" aria-label={`Decline ${f.profile.username}`}><X size={16} strokeWidth={3} /></button>
            <button onClick={() => acceptFriend(f.id)} className="btn btn-neon h-10 px-3 text-sm"><Check size={16} strokeWidth={3.5} /> Accept</button>
          </PersonRow>
        ))}
      </ul>
    </section>
  )
}

function JoinableParties() {
  const { lobbies, join, inParty } = useOnline()
  const toast = useToast()
  return (
    <section className="card p-4">
      <SectionTitle icon={LogIn} tone="blue">Joinable parties</SectionTitle>
      {lobbies.length === 0 ? (
        <p className="text-sm font-bold text-muted">No friends are hosting an open lobby right now. When a friend creates a party it shows up here live.</p>
      ) : (
        <ul className="space-y-2.5">
          {lobbies.map((lobby) => {
            const leader = lobby.members[0]?.profile
            const full = lobby.members.length >= MAX_PARTY_SIZE
            return (
              <li key={lobby.id} className="flex items-center gap-3 rounded-2xl border-[3px] border-outline bg-surface-2 p-2">
                <div className="flex -space-x-2">
                  {lobby.members.map((m, i) => (
                    <div key={m.user_id} className="relative">
                      {i === 0 && <Crown size={14} fill="currentColor" className="absolute -top-2.5 left-1/2 z-10 -translate-x-1/2 text-gold drop-shadow-[0_1px_0_#05020f]" />}
                      <Head profile={m.profile} size="size-10" />
                    </div>
                  ))}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-lg leading-tight">{leader?.username}&apos;s party</p>
                  <Pill tone="dark" className="text-[10px] leading-4">{lobby.members.length}/{MAX_PARTY_SIZE} players</Pill>
                </div>
                <button disabled={full} className="btn btn-blue h-10 shrink-0 px-3 text-sm"
                  onClick={async () => { await join(lobby); toast(inParty ? `Left your party and joined ${leader?.username}'s` : `Joined ${leader?.username}'s party!`, { tone: 'neon', icon: LogIn }) }}>
                  {full ? 'Full' : <><LogIn size={16} strokeWidth={3} /> Join</>}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

function FriendAction({ profile }) {
  const { party, isLeader, invite } = useOnline()
  const toast = useToast()
  const inMyParty = party?.members.some((m) => m.user_id === profile.id)
  if (inMyParty) return <Pill tone="neon" icon={Check}>In party</Pill>
  if (!isLeader || (party && party.status !== 'lobby')) return null
  return (
    <button className="btn btn-blue h-10 shrink-0 px-3 text-sm"
      onClick={async () => { await invite(profile.id); toast(`Pulled ${profile.username} into your party!`, { tone: 'neon', icon: Send }) }}>
      <Plus size={16} strokeWidth={3.5} /> Invite
    </button>
  )
}

function FriendsList({ onAdd }) {
  const { friends, outgoing, isLeader, partyLeader, removeFriendship } = useOnline()
  return (
    <section id="friends-section" className="card scroll-mt-4 p-4">
      <SectionTitle icon={Users} tone="pink">Friends <Pill tone="dark">{friends.length}</Pill></SectionTitle>
      {!isLeader && <p className="mb-2 text-xs font-bold text-muted">You&apos;re in {partyLeader?.profile.username}&apos;s party — only the leader can invite.</p>}
      {friends.length === 0 && outgoing.length === 0 ? (
        <div className="text-center">
          <p className="text-sm font-bold text-muted">No friends yet. Search the adventurer directory to add some!</p>
          <button onClick={onAdd} className="btn btn-pink mt-3 h-11 px-4"><UserPlus size={18} strokeWidth={3} /> Find friends</button>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {friends.map((f) => <PersonRow key={f.id} profile={f.profile}><FriendAction profile={f.profile} /></PersonRow>)}
          {outgoing.map((f) => (
            <PersonRow key={f.id} profile={f.profile} note="Friend request sent">
              <button onClick={() => removeFriendship(f.id)} className="pill bg-surface-3 text-ink" title="Cancel request"><Hourglass size={12} /> Sent</button>
            </PersonRow>
          ))}
        </ul>
      )}
    </section>
  )
}

function InviteModal({ onClose }) {
  const { friends } = useOnline()
  return (
    <Modal onClose={onClose} title="Invite to party" eyebrow="Party lobby">
      {friends.length === 0
        ? <p className="text-sm font-bold text-muted">Add friends first — or flip on &quot;Simulate bot teammates&quot;.</p>
        : <ul className="space-y-2.5">{friends.map((f) => <PersonRow key={f.id} profile={f.profile}><FriendAction profile={f.profile} /></PersonRow>)}</ul>}
      <button onClick={onClose} className="btn btn-gold mt-4 h-12 w-full text-lg">Done</button>
    </Modal>
  )
}

function Leaderboard() {
  const { leaderboard } = useOnline()
  const medal = ['bg-gold text-on-accent', 'bg-[#d9dcf0] text-[#1a1033]', 'bg-[#e8935a] text-[#1a1033]']
  return (
    <section id="ranks-section" className="card scroll-mt-4 p-4">
      <SectionTitle icon={Crown} tone="gold">Friend ranks</SectionTitle>
      <ol className="space-y-2">
        {leaderboard.map((p, i) => (
          <li key={p.id} className={`flex items-center gap-2.5 rounded-2xl border-[3px] p-1.5 pr-3 ${p.me ? 'border-outline bg-gold/25' : 'border-transparent'}`}>
            <span className={`grid size-8 shrink-0 place-items-center rounded-lg border-[3px] border-outline font-display ${medal[i] ?? 'bg-surface-2'}`}>{i + 1}</span>
            <div className="stage size-9 shrink-0 overflow-hidden rounded-lg border-2 border-outline"><Character look={p.look} crop="head" className="size-full" /></div>
            <span className="min-w-0 flex-1 truncate font-display">{p.username}{p.me && <span className="text-muted"> (you)</span>}</span>
            <span className="font-display tabular-nums">LV {p.level}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}

/** Search the shared adventurer directory (profiles table) and send friend requests. */
function AddFriendModal({ onClose }) {
  const { searchUsers, sendFriendRequest, acceptFriend, incoming, relation, seedSampleUsers } = useOnline()
  const toast = useToast()
  const [q, setQ] = useState('')
  const [results, setResults] = useState(null)
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    let alive = true
    const t = setTimeout(() => searchUsers(q).then((r) => alive && setResults(r)).catch(() => alive && setResults([])), 220)
    return () => { alive = false; clearTimeout(t) }
  }, [q, searchUsers, nonce])

  const add = async (p) => {
    await sendFriendRequest(p)
    toast(p.is_bot ? `${p.username} accepted — you're friends!` : `Friend request sent to ${p.username}`, { tone: 'pink', icon: Send })
    setNonce((n) => n + 1)
  }

  return (
    <Modal onClose={onClose} title="Find adventurers" eyebrow="Add friend">
      <label className="relative block">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by username" aria-label="Search by username"
          className="w-full rounded-xl border-[3px] border-outline bg-surface-2 py-3 pl-10 pr-3 font-bold focus:bg-surface focus:outline-none focus:ring-4 focus:ring-blue/40" />
      </label>

      <ul className="mt-3 max-h-80 space-y-2 overflow-y-auto [scrollbar-width:thin]">
        {results === null && <li className="py-4 text-center text-muted"><Loader2 className="mx-auto animate-spin" /></li>}
        {results?.length === 0 && <li className="py-3 text-center text-sm font-bold text-muted">No adventurers found{q ? ` for "${q}"` : ''}.</li>}
        {results?.map((p) => {
          const rel = relation(p.id)
          const req = incoming.find((f) => f.profile.id === p.id)
          return (
            <PersonRow key={p.id} profile={p}>
              {rel === 'friend' ? <Pill tone="neon" icon={Check}>Friends</Pill>
                : rel === 'outgoing' ? <Pill tone="dark" icon={Hourglass}>Pending</Pill>
                  : rel === 'incoming' ? <button onClick={async () => { await acceptFriend(req.id); setNonce((n) => n + 1) }} className="btn btn-neon h-10 px-3 text-sm"><Check size={16} strokeWidth={3.5} /> Accept</button>
                    : <button onClick={() => add(p)} className="btn btn-pink h-10 px-3 text-sm"><UserPlus size={16} strokeWidth={3} /> Add</button>}
            </PersonRow>
          )
        })}
      </ul>

      <button onClick={async () => { const n = await seedSampleUsers(); toast(n ? `Added ${n} sample users` : 'Sample users already exist', { tone: 'blue', icon: RefreshCw }); setNonce((x) => x + 1) }}
        className="btn btn-ghost mt-4 h-11 w-full text-sm">
        <Users size={16} strokeWidth={3} /> Seed 8 sample users
      </button>
      <p className="mt-2 text-center text-xs font-bold text-muted">Sample users accept instantly. Real teammates see your request in their Social tab.</p>
    </Modal>
  )
}
