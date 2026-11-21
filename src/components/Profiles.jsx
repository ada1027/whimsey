import { ArrowLeft, Check, Flame, Hourglass, Plus, Send, Target, Trophy, UserPlus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useOnline } from '../context/OnlineContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { STAGES, stageFor } from '../data/companion.js'
import { QUEST_TYPE_LABEL } from '../data/seed.js'
import * as api from '../lib/api.js'
import { db } from '../lib/db.js'
import Character from './Character.jsx'
import { FeedPost, ProofPreview } from './FriendFeed.jsx'
import { Modal, Pill } from './ui.jsx'
import { useNow } from './useNow.js'

/** One adventurer's posts, kept live (refetches when the database changes). */
export function useUserPosts(userId, author) {
  const { enrichPost } = useOnline()
  const [posts, setPosts] = useState(null)
  useEffect(() => {
    if (!userId) return
    let alive = true
    let t
    const load = () => api.loadUserPosts(userId).then((r) => alive && setPosts(r)).catch(() => alive && setPosts([]))
    load()
    const unsubscribe = db.subscribe(() => { clearTimeout(t); t = setTimeout(load, 200) })
    return () => { alive = false; clearTimeout(t); unsubscribe() }
  }, [userId])
  return posts?.map((p) => enrichPost({ ...p, author })) ?? null
}

/** Instagram / Strava-style 3-column grid of completed quests with proof thumbnails. */
export function ActivityGrid({ posts, onOpen, emptyText = 'No completed quests yet.' }) {
  if (posts === null) return <p className="py-6 text-center font-bold text-muted">Loading quests…</p>
  if (!posts.length) return <p className="rounded-2xl border-[3px] border-dashed border-outline/40 p-6 text-center text-sm font-bold text-muted">{emptyText}</p>
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {posts.map((p) => (
        <button key={p.id} onClick={() => onOpen(p)} className="group relative overflow-hidden rounded-xl text-left transition active:scale-95" aria-label={`${p.quest_title} — open details`}>
          <ProofPreview url={p.proof_url} category={p.category} title={p.quest_title} square />
          <span className="pointer-events-none absolute inset-x-0 bottom-0 rounded-b-xl bg-gradient-to-t from-black/75 to-transparent px-1.5 pb-1 pt-4 text-[10px] font-extrabold leading-tight text-white">
            {p.quest_title}
          </span>
          {p.quest_type === 'group' && <span className="absolute right-1 top-1 pill bg-blue px-1 py-0 text-[9px] text-on-accent">Group</span>}
        </button>
      ))}
    </div>
  )
}

/** Full post (proof + reactions) opened from a grid tile. */
export function PostDetail({ post, onBack }) {
  const { toggleReaction, profilesById, openProfile } = useOnline()
  const now = useNow(30_000)
  return (
    <div>
      <button onClick={onBack} className="mb-3 flex items-center gap-1 text-sm font-extrabold text-muted hover:text-ink">
        <ArrowLeft size={16} strokeWidth={3} /> Back to grid
      </button>
      <FeedPost post={post} now={now} profilesById={profilesById} onReact={toggleReaction} onOpenProfile={openProfile} />
      <p className="mt-2 text-center text-xs font-bold text-muted">{QUEST_TYPE_LABEL[post.quest_type]} · posted {new Date(post.created_at).toLocaleString()}</p>
    </div>
  )
}

function StatTile({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl border-[3px] border-outline bg-surface-2 px-1 py-2 text-center">
      <Icon size={16} className="mx-auto mb-0.5" strokeWidth={2.75} />
      <p className="font-display text-xl leading-none tabular-nums">{value}</p>
      <p className="mt-0.5 text-[10px] font-extrabold uppercase tracking-wider text-muted">{label}</p>
    </div>
  )
}

function RelationAction({ profile }) {
  const { me, relation, sendFriendRequest, acceptFriend, incoming, invite, isLeader, party, invitesSent } = useOnline()
  const toast = useToast()
  if (profile.id === me) return <Pill tone="gold">This is you</Pill>
  const rel = relation(profile.id)
  if (rel === 'friend') {
    const inParty = party?.members.some((m) => m.user_id === profile.id)
    if (inParty) return <Pill tone="neon" icon={Check}>In your party</Pill>
    if (invitesSent.has(profile.id)) return <Pill tone="dark" icon={Send}>Invited</Pill>
    if (isLeader && (!party || party.status === 'lobby')) {
      return (
        <button className="btn btn-blue h-10 px-3 text-sm" onClick={async () => { await invite(profile.id); toast(profile.is_bot ? `${profile.username} joined your party!` : `Party invite sent to ${profile.username}`, { tone: 'neon', icon: Send }) }}>
          <Plus size={16} strokeWidth={3.5} /> Invite to party
        </button>
      )
    }
    return <Pill tone="neon" icon={Check}>Friends</Pill>
  }
  if (rel === 'outgoing') return <Pill tone="dark" icon={Hourglass}>Request sent</Pill>
  if (rel === 'incoming') {
    const req = incoming.find((f) => f.profile.id === profile.id)
    return <button className="btn btn-neon h-10 px-3 text-sm" onClick={() => acceptFriend(req.id)}><Check size={16} strokeWidth={3.5} /> Accept request</button>
  }
  return (
    <button className="btn btn-pink h-10 px-3 text-sm" onClick={async () => { await sendFriendRequest(profile); toast(profile.is_bot ? `${profile.username} accepted — you're friends!` : `Friend request sent to ${profile.username}`, { tone: 'pink', icon: UserPlus }) }}>
      <UserPlus size={16} strokeWidth={3} /> Add friend
    </button>
  )
}

/** Public "Adventurer Profile" — opens from any avatar or username. */
export function UserProfileModal() {
  const { viewingProfileId: id, closeProfile, profilesById, me, rank } = useOnline()
  const [fetched, setFetched] = useState(null)
  const [openPost, setOpenPost] = useState(null)
  const profile = profilesById[id] ?? (fetched?.id === id ? fetched : null)

  useEffect(() => {
    if (id && !profilesById[id]) api.getProfile(id).then(setFetched).catch(() => {})
  }, [id, profilesById])

  const posts = useUserPosts(id, profile)
  if (!id) return null
  const post = openPost && posts?.find((p) => p.id === openPost)
  const level = profile?.level ?? 1
  const stage = stageFor(level)

  return (
    <Modal onClose={() => { setOpenPost(null); closeProfile() }} title={profile?.username ?? 'Adventurer'} eyebrow="Adventurer profile" z="z-[60]">
      {!profile ? (
        <p className="py-8 text-center font-bold text-muted">Loading…</p>
      ) : post ? (
        <PostDetail post={post} onBack={() => setOpenPost(null)} />
      ) : (
        <>
          <div className="stage relative flex items-center gap-3 overflow-hidden rounded-2xl border-[3px] border-outline p-3">
            <div className="w-28 shrink-0 animate-float">
              <Character look={api.lookOf(profile)} className="w-full drop-shadow-[0_6px_0_rgb(0_0_0/.3)]" label={`${profile.username}'s companion`} />
            </div>
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-1.5">
                <Pill tone="gold">LV {level}</Pill>
                {profile.is_bot && <Pill tone="blue">Sample player</Pill>}
              </p>
              <p className="mt-1 font-display text-lg leading-tight text-white [text-shadow:0_2px_0_#05020f]">
                {api.companionNameOf(profile)} the {STAGES[stage].name}
              </p>
              <p className="text-xs font-bold text-white/80">Baby Thunderbird companion</p>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            <StatTile icon={Flame} label="Streak" value={profile.streak ?? 0} />
            <StatTile icon={Target} label="Quests" value={posts?.length ?? '…'} />
            <StatTile icon={Trophy} label={profile.id === me ? 'Rank' : 'Level'} value={profile.id === me ? `#${rank}` : level} />
          </div>

          <div className="mt-3 flex justify-center"><RelationAction profile={profile} /></div>

          <p className="mb-2 mt-4 font-display text-sm uppercase tracking-widest text-muted">Completed quests</p>
          <ActivityGrid posts={posts} onOpen={(p) => setOpenPost(p.id)} emptyText={`${profile.username} hasn't posted any quests yet.`} />
        </>
      )}
    </Modal>
  )
}
