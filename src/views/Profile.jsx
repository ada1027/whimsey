import { Check, Coins, Flame, Medal, Pencil, Save, Shirt, Sparkles, Target, Trophy, UserPen } from 'lucide-react'
import { useState } from 'react'
import Character from '../components/Character.jsx'
import Locker from '../components/Locker.jsx'
import { ActivityGrid, PostDetail, useUserPosts } from '../components/Profiles.jsx'
import { Modal, PageTitle, Pill, SectionTitle, XPBar } from '../components/ui.jsx'
import { useOnline } from '../context/OnlineContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { useUser } from '../context/UserContext.jsx'
import { STAGES, stageFor } from '../data/companion.js'
import { ACTIVITY_TAGS, resolveLook } from '../data/seed.js'
import { encodeAvatar } from '../lib/api.js'

const NEXT = { hatchling: { stage: 'fledgling', level: 3 }, fledgling: { stage: 'stormbird', level: 5 } }

/** Clean, Strava-like profile: hero card → stat pills → quest grid. Customization lives in the Locker. */
export default function Profile() {
  const { profile, look, completedQuests } = useUser()
  const { me, rank, profilesById } = useOnline()
  const [openPost, setOpenPost] = useState(null)
  const [lockerOpen, setLockerOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  // Your own posts, with a local fallback author until your profile row has loaded.
  const author = profilesById[me] ?? { id: me, username: profile.username, level: profile.level, streak: profile.streak,
    avatar: encodeAvatar(resolveLook(profile.equipped), profile.equipped, profile.companionName) }
  const posts = useUserPosts(me, author)
  const post = openPost && posts?.find((p) => p.id === openPost)

  return (
    <div className="space-y-5">
      <PageTitle subtitle="Your Thunderbird, your quests.">Profile</PageTitle>

      <HeroCard look={look} onLocker={() => setLockerOpen(true)} onEdit={() => setEditing(true)} />

      <div className="grid grid-cols-4 gap-2">
        <MiniStat icon={Target} label="Quests" value={completedQuests.length} />
        <MiniStat icon={Flame} label="Streak" value={profile.streak} />
        <MiniStat icon={Trophy} label="Rank" value={`#${rank}`} />
        <MiniStat icon={Coins} label="Coins" value={profile.coins} />
      </div>

      <section>
        <SectionTitle icon={Medal} tone="blue">My quest grid</SectionTitle>
        <ActivityGrid posts={posts} onOpen={(p) => setOpenPost(p.id)} emptyText="Complete a quest — your proof photos will fill this grid." />
      </section>

      {post && (
        <Modal onClose={() => setOpenPost(null)} title={post.quest_title} eyebrow="Your quest">
          <PostDetail post={post} onBack={() => setOpenPost(null)} />
        </Modal>
      )}
      {editing && (
        <Modal onClose={() => setEditing(false)} title="Edit profile" eyebrow="Adventurer details">
          <IdentityCard onSaved={() => setEditing(false)} />
        </Modal>
      )}
      {lockerOpen && <Locker onClose={() => setLockerOpen(false)} />}
    </div>
  )
}

/** Thunderbird hero card: tap the bird (or the Locker button) to customize. */
function HeroCard({ look, onLocker, onEdit }) {
  const { profile, title, updateProfile } = useUser()
  const toast = useToast()
  const [renaming, setRenaming] = useState(false)
  const [name, setName] = useState(profile.companionName)
  const stage = stageFor(profile.level)
  const next = NEXT[stage]

  const saveName = (e) => {
    e.preventDefault()
    const n = name.trim().slice(0, 16)
    if (!n) return
    updateProfile({ companionName: n })
    setRenaming(false)
    toast(`Say hi to ${n}!`, { tone: 'neon', icon: Sparkles })
  }

  return (
    <section className="card overflow-hidden" aria-label="Thunderbird hero card">
      <div className="stage relative h-56 overflow-hidden">
        <span className="absolute left-6 top-6 h-6 w-16 rounded-full bg-white/70 shadow-[14px_-6px_0_-2px_rgb(255_255_255/.7)]" />
        <span className="absolute right-8 top-14 h-5 w-12 rounded-full bg-white/50 shadow-[10px_-5px_0_-2px_rgb(255_255_255/.5)]" />
        <span className="absolute -bottom-16 left-1/2 h-32 w-[130%] -translate-x-1/2 rounded-[50%] border-t-[3px] border-outline bg-gradient-to-b from-[#7be495] to-[#3fae6a]" />
        <span className="absolute left-3 top-3 pill bg-gold text-on-accent">{title}</span>
        <button onClick={onLocker} className="btn btn-gold absolute right-3 top-3 h-10 gap-1.5 px-3 text-sm" aria-label="Open Thunderbird Locker">
          <Shirt size={16} strokeWidth={2.75} /> Locker <Sparkles size={14} strokeWidth={2.75} />
        </button>
        <button onClick={onLocker} className="group absolute bottom-5 left-1/2 w-36 -translate-x-1/2" aria-label={`Customize ${profile.companionName}`}>
          <Character look={look} className="w-full animate-float drop-shadow-[0_6px_0_rgb(0_0_0/.3)] transition group-hover:scale-105" label={`${profile.companionName} the ${STAGES[stage].name}`} />
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg border-2 border-outline bg-surface px-1.5 text-[10px] font-extrabold text-ink opacity-0 transition group-hover:opacity-100">Tap to customize</span>
        </button>
      </div>

      <div className="space-y-3 p-4">
        {renaming ? (
          <form onSubmit={saveName} className="flex gap-2">
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} maxLength={16} aria-label="Companion name"
              className="min-w-0 flex-1 rounded-xl border-[3px] border-outline bg-surface-2 px-3 py-2 font-display text-lg focus:outline-none focus:ring-4 focus:ring-blue/40" />
            <button className="btn btn-neon size-11" aria-label="Save name"><Check size={18} strokeWidth={3.5} /></button>
          </form>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <button onClick={() => { setName(profile.companionName); setRenaming(true) }} className="group flex items-center gap-2 font-display text-2xl leading-tight">
                {profile.companionName} <Pencil size={16} className="text-muted group-hover:text-ink" />
              </button>
              <p className="truncate text-sm font-bold text-muted">{profile.username} · Baby Thunderbird · {STAGES[stage].name}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Pill tone="grape">LV {profile.level}</Pill>
              <button onClick={onEdit} className="btn btn-ghost size-9 rounded-xl" aria-label="Edit profile" title="Edit profile"><UserPen size={16} strokeWidth={2.75} /></button>
            </div>
          </div>
        )}
        <div>
          <div className="mb-1 flex justify-between text-xs font-extrabold uppercase tracking-wider text-muted">
            <span>{profile.xp}/{profile.maxXp} XP</span>
            <span>{next ? `Evolves into ${STAGES[next.stage].name} at LV ${next.level}` : 'Fully evolved ⚡'}</span>
          </div>
          <XPBar xp={profile.xp} maxXp={profile.maxXp} />
        </div>
      </div>
    </section>
  )
}

function MiniStat({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl border-[3px] border-outline bg-surface px-1 py-2 text-center shadow-[0_3px_0_var(--outline)]">
      <Icon size={16} className="mx-auto mb-0.5" strokeWidth={2.75} />
      <p className="font-display text-lg leading-none tabular-nums">{value}</p>
      <p className="mt-0.5 text-[10px] font-extrabold uppercase tracking-wider text-muted">{label}</p>
    </div>
  )
}

/** Name · bio · activity tags. */
function IdentityCard({ onSaved }) {
  const { profile, updateProfile } = useUser()
  const toast = useToast()
  const [name, setName] = useState(profile.username)
  const [bio, setBio] = useState(profile.bio)
  const dirty = name.trim() !== profile.username || bio.trim() !== profile.bio

  const save = (e) => {
    e.preventDefault()
    if (!name.trim()) return
    updateProfile({ username: name.trim(), bio: bio.trim() })
    toast('Profile saved!', { tone: 'neon', icon: Check })
    onSaved?.()
  }

  const toggleTag = (t) =>
    updateProfile({ tags: profile.tags.includes(t) ? profile.tags.filter((x) => x !== t) : [...profile.tags, t] })

  const field = 'w-full rounded-xl border-[3px] border-outline bg-surface-2 px-3 py-2.5 font-bold focus:bg-surface focus:outline-none focus:ring-4 focus:ring-blue/40'
  const label = 'mb-1.5 block font-display text-sm uppercase tracking-widest text-muted'

  return (
    <form onSubmit={save} className="space-y-4">
      <label className="block">
        <span className={label}>Name</span>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={20} className={`${field} font-display text-lg`} />
      </label>
      <label className="block">
        <span className={label}>Bio</span>
        <textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={140} rows={2} placeholder="Tell your guild what you're about…" className={`${field} resize-none`} />
      </label>
      <fieldset>
        <legend className={label}>Activity tags</legend>
        <div className="flex flex-wrap gap-2">
          {ACTIVITY_TAGS.map((t) => {
            const on = profile.tags.includes(t)
            return (
              <button type="button" key={t} onClick={() => toggleTag(t)} aria-pressed={on}
                className={`pill rounded-xl px-3 py-1 text-sm transition ${on ? 'bg-blue text-on-accent -translate-y-0.5' : 'bg-surface text-muted shadow-none'}`}>
                {on && <Check size={14} strokeWidth={3.5} />}{t}
              </button>
            )
          })}
        </div>
        <p className="mt-2 text-xs font-bold text-muted">Tags tune which quests PLAY picks for you ("simple" skips Epic quests).</p>
      </fieldset>
      {dirty && (
        <button type="submit" disabled={!name.trim()} className="btn btn-neon h-12 w-full animate-pop text-lg">
          <Save size={18} strokeWidth={3} /> Save changes
        </button>
      )}
    </form>
  )
}

