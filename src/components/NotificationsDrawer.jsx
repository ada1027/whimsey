import { Bell, Check, LogIn, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useOnline } from '../context/OnlineContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { REACTIONS } from '../data/seed.js'
import { lookOf } from '../lib/api.js'
import Character from './Character.jsx'
import { timeAgo } from './FriendFeed.jsx'
import { Modal, Pill } from './ui.jsx'
import { useNow } from './useNow.js'

const B = ({ children }) => <b className="font-extrabold text-ink">{children}</b>

function message(n, name) {
  const p = n.payload ?? {}
  switch (n.type) {
    case 'reaction': {
      const r = REACTIONS.find((x) => x.id === p.kind) ?? REACTIONS[0]
      return <><B>{name}</B> gave {r.emoji} {r.label} to your <B>{p.quest_title}</B> quest</>
    }
    case 'group_tag':
      return <><B>{name}</B> tagged you as &lsquo;Done Together&rsquo; on <B>{p.quest_title}</B></>
    case 'friend_request':
      return <><B>{name}</B> sent you a friend request</>
    case 'friend_accepted':
      return <><B>{name}</B> accepted your friend request 🎉</>
    case 'party_invite':
      return <><B>{name}</B> invited you to join their party</>
    default:
      return <><B>{name}</B> did something whimsical</>
  }
}

function Actions({ n, onJoined }) {
  const { relation, acceptFriend, removeFriendship, party, join } = useOnline()
  const toast = useToast()
  const actor = n.actor
  if (n.type === 'friend_request' && actor) {
    const rel = relation(actor.id)
    if (rel !== 'incoming') return <Pill tone={rel === 'friend' ? 'neon' : 'dark'}>{rel === 'friend' ? 'Friends ✓' : 'Handled'}</Pill>
    return (
      <div className="flex gap-2">
        <button onClick={() => removeFriendship(n.payload.friendship_id)} className="btn btn-ghost h-9 px-3 text-xs"><X size={14} strokeWidth={3} /> Decline</button>
        <button onClick={async () => { await acceptFriend(n.payload.friendship_id); toast(`You and ${actor.username} are friends!`, { tone: 'neon', icon: Check }) }} className="btn btn-neon h-9 px-3 text-xs">
          <Check size={14} strokeWidth={3.5} /> Accept
        </button>
      </div>
    )
  }
  if (n.type === 'party_invite') {
    if (party?.id === n.payload?.party_id) return <Pill tone="neon">In party ✓</Pill>
    return (
      <button
        onClick={async () => { const ok = await join({ id: n.payload.party_id }); if (ok !== undefined) { toast(`Joined ${actor?.username ?? 'the'} party!`, { tone: 'neon', icon: LogIn }); onJoined() } }}
        className="btn btn-blue h-9 px-3 text-xs"
      >
        <LogIn size={14} strokeWidth={3} /> Join party
      </button>
    )
  }
  return null
}

/** Bell inbox: kudos, group tags, friend requests (Accept / Decline) and party invites (Join). */
export default function NotificationsDrawer({ onClose, onNavigate }) {
  const { notifications, markNotificationsRead, openProfile } = useOnline()
  const now = useNow(30_000)
  // Remember what was unread when the drawer opened, so highlights stay while you read.
  const [freshIds] = useState(() => new Set(notifications.filter((n) => !n.read).map((n) => n.id)))

  useEffect(() => {
    if (!freshIds.size) return
    const t = setTimeout(markNotificationsRead, 1200)
    return () => clearTimeout(t)
  }, [freshIds, markNotificationsRead])

  return (
    <Modal onClose={onClose} title="Notifications" eyebrow={freshIds.size ? `${freshIds.size} new` : 'All caught up'}>
      {notifications.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center text-muted">
          <Bell size={32} />
          <p className="font-bold">No notifications yet. Reactions, tags and invites show up here.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {notifications.map((n) => {
            const name = n.actor?.username ?? 'Someone'
            return (
              <li key={n.id} className={`flex gap-3 rounded-2xl border-[3px] p-2.5 ${freshIds.has(n.id) ? 'border-gold bg-gold/15' : 'border-outline bg-surface-2'}`}>
                <button
                  onClick={() => n.actor && openProfile(n.actor.id)}
                  className="stage size-11 shrink-0 overflow-hidden rounded-xl border-[3px] border-outline"
                  aria-label={`Open ${name}'s profile`}
                >
                  <Character look={lookOf(n.actor)} crop="head" className="size-full" />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold leading-snug text-muted">{message(n, name)}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-muted">
                    {freshIds.has(n.id) && <span className="size-2 rounded-full bg-pink" aria-label="New" />}
                    {timeAgo(n.created_at, now)}
                  </p>
                  <div className="mt-2 empty:hidden"><Actions n={n} onJoined={() => { onClose(); onNavigate('social') }} /></div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Modal>
  )
}
