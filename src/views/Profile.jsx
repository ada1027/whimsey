import { Check, Coins, Flame, Lock, Medal, Pencil, Save, Shirt, Sparkles, Tag, Target, Trophy, Umbrella } from 'lucide-react'
import { useState } from 'react'
import Character from '../components/Character.jsx'
import { ActivityGrid, PostDetail, useUserPosts } from '../components/Profiles.jsx'
import { Modal, PageTitle, Pill, SectionTitle, XPBar } from '../components/ui.jsx'
import { useOnline } from '../context/OnlineContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { useUser } from '../context/UserContext.jsx'
import { STAGES, stageFor } from '../data/companion.js'
import { ACTIVITY_TAGS, isOwned, ITEMS, resolveLook, SLOTS } from '../data/seed.js'
import { encodeAvatar } from '../lib/api.js'

const SLOT_ICONS = { colorway: Sparkles, outfit: Shirt, accessory: Umbrella, title: Tag }
const LINES = ['Let’s go questing!', '*happy chirp*', 'Zap zap! ⚡', 'Feed me XP!', 'You’re my favorite human.', 'Snack break?']
const NEXT = { hatchling: { stage: 'fledgling', level: 3 }, fledgling: { stage: 'stormbird', level: 5 } }

export default function Profile() {
  const { profile, look, completedQuests } = useUser()
  const { me, rank, profilesById } = useOnline()
  const [openPost, setOpenPost] = useState(null)
  // Your own posts, with a local fallback author until your profile row has loaded.
  const author = profilesById[me] ?? { id: me, username: profile.username, level: profile.level, streak: profile.streak,
    avatar: encodeAvatar(resolveLook(profile.equipped), profile.equipped, profile.companionName) }
  const posts = useUserPosts(me, author)
  const post = openPost && posts?.find((p) => p.id === openPost)

  return (
    <div className="space-y-5">
      <PageTitle subtitle="Your Thunderbird, your quests.">Profile</PageTitle>

      <Habitat look={look} />

      <div className="grid grid-cols-4 gap-2">
        <MiniStat icon={Target} label="Quests" value={completedQuests.length} />
        <MiniStat icon={Flame} label="Streak" value={profile.streak} />
        <MiniStat icon={Trophy} label="Rank" value={`#${rank}`} />
        <MiniStat icon={Coins} label="Coins" value={profile.coins} />
      </div>

      <Customizer />

      <section>
        <SectionTitle icon={Medal} tone="blue">My quest grid</SectionTitle>
        <ActivityGrid posts={posts} onOpen={(p) => setOpenPost(p.id)} emptyText="Complete a quest — your proof photos will fill this grid." />
      </section>

      <IdentityCard />

      {post && (
        <Modal onClose={() => setOpenPost(null)} title={post.quest_title} eyebrow="Your quest">
          <PostDetail post={post} onBack={() => setOpenPost(null)} />
        </Modal>
      )}
    </div>
  )
}

/** Interactive companion habitat: tap your Thunderbird to make it cheer. */
function Habitat({ look }) {
  const { profile, title, updateProfile } = useUser()
  const toast = useToast()
  const [cheering, setCheering] = useState(null) // speech line while cheering
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(profile.companionName)
  const stage = stageFor(profile.level)
  const next = NEXT[stage]

  const poke = () => {
    if (cheering) return
    setCheering(LINES[Math.floor(Math.random() * LINES.length)])
    setTimeout(() => setCheering(null), 1600)
  }
  const saveName = (e) => {
    e.preventDefault()
    const n = name.trim().slice(0, 16)
    if (!n) return
    updateProfile({ companionName: n })
    setEditing(false)
    toast(`Say hi to ${n}!`, { tone: 'neon', icon: Sparkles })
  }

  return (
    <section className="card overflow-hidden" aria-label="Companion habitat">
      <div className="stage relative h-60 overflow-hidden">
        {/* clouds + hill */}
        <span className="absolute left-6 top-6 h-6 w-16 rounded-full bg-white/70 shadow-[14px_-6px_0_-2px_rgb(255_255_255/.7)]" />
        <span className="absolute right-8 top-12 h-5 w-12 rounded-full bg-white/50 shadow-[10px_-5px_0_-2px_rgb(255_255_255/.5)]" />
        <span className="absolute -bottom-16 left-1/2 h-32 w-[130%] -translate-x-1/2 rounded-[50%] border-t-[3px] border-outline bg-gradient-to-b from-[#7be495] to-[#3fae6a]" />
        <span className="absolute left-3 top-3 pill bg-gold text-on-accent">{title}</span>
        <button onClick={poke} className="absolute bottom-6 left-1/2 w-40 -translate-x-1/2" aria-label={`Pet ${profile.companionName}`}>
          {cheering && (
            <span className="absolute -top-6 left-1/2 z-10 -translate-x-1/2 animate-pop whitespace-nowrap rounded-xl border-[3px] border-outline bg-surface px-2 py-0.5 text-xs font-extrabold text-ink shadow-[0_3px_0_var(--outline)]">
              {cheering}
            </span>
          )}
          <Character look={look} mood={cheering ? 'cheer' : 'happy'} className={`w-full drop-shadow-[0_6px_0_rgb(0_0_0/.3)] ${cheering ? 'animate-wiggle' : 'animate-float'}`} label={`${profile.companionName} the ${STAGES[stage].name}`} />
        </button>
      </div>

      <div className="space-y-3 p-4">
        {editing ? (
          <form onSubmit={saveName} className="flex gap-2">
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} maxLength={16} aria-label="Companion name"
              className="min-w-0 flex-1 rounded-xl border-[3px] border-outline bg-surface-2 px-3 py-2 font-display text-lg focus:outline-none focus:ring-4 focus:ring-blue/40" />
            <button className="btn btn-neon size-11" aria-label="Save name"><Check size={18} strokeWidth={3.5} /></button>
          </form>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <div>
              <button onClick={() => { setName(profile.companionName); setEditing(true) }} className="group flex items-center gap-2 font-display text-2xl leading-tight">
                {profile.companionName} <Pencil size={16} className="text-muted group-hover:text-ink" />
              </button>
              <p className="text-sm font-bold text-muted">Baby Thunderbird · {STAGES[stage].name}</p>
            </div>
            <Pill tone="grape">LV {profile.level}</Pill>
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

/** Colorways, accessories and titles: equip owned items, buy or see the unlock level for the rest. */
function Customizer() {
  const { profile, look, equip, buyItem } = useUser()
  const toast = useToast()
  const [slot, setSlot] = useState('colorway')
  const items = ITEMS.filter((i) => i.slot === slot)
  const ownedCount = ITEMS.filter((i) => isOwned(i, profile)).length

  const onPick = (item) => {
    if (profile.equipped[item.slot] === item.id) return
    if (isOwned(item, profile)) {
      equip(item.id)
      toast(`Equipped ${item.name}`, { tone: 'neon', icon: Shirt })
    } else if (item.unlock.coins) {
      if (profile.coins < item.unlock.coins) toast(`Need ${item.unlock.coins - profile.coins} more coins`, { tone: 'pink', icon: Coins })
      else { buyItem(item.id); toast(`Bought & equipped ${item.name}!`, { tone: 'gold', icon: Coins }) }
    } else {
      toast(`Reach level ${item.unlock.level} to unlock`, { tone: 'grape', icon: Lock })
    }
  }

  return (
    <section className="card p-4" aria-label="Customize your Thunderbird">
      <SectionTitle icon={Sparkles} tone="pink" action={<Pill tone="dark" icon={Medal}>{ownedCount}/{ITEMS.length}</Pill>}>
        Customize
      </SectionTitle>
      <div className="mb-4 grid grid-cols-4 gap-1.5" role="tablist">
        {SLOTS.map(({ id, label }) => {
          const Icon = SLOT_ICONS[id]
          const active = slot === id
          return (
            <button key={id} role="tab" aria-selected={active} onClick={() => setSlot(id)}
              className={`pill flex-col justify-center gap-0.5 rounded-xl py-1.5 text-[11px] transition ${active ? 'bg-gold text-on-accent -translate-y-0.5' : 'bg-surface-2 text-muted shadow-none'}`}>
              <Icon size={15} strokeWidth={2.75} /> {label}
            </button>
          )
        })}
      </div>
      <div className="grid grid-cols-3 gap-2.5">
        {items.map((item) => {
          const owned = isOwned(item, profile)
          const on = profile.equipped[item.slot] === item.id
          return (
            <button key={item.id} onClick={() => onPick(item)} aria-pressed={on} aria-label={`${item.name}${on ? ', equipped' : owned ? '' : ', locked'}`}
              className={`relative flex flex-col items-center rounded-2xl border-[3px] border-outline p-1.5 transition hover:-translate-y-1 ${on ? 'bg-neon/30 shadow-[0_5px_0_var(--outline)]' : 'bg-surface-2 shadow-[0_3px_0_var(--outline)]'}`}>
              <div className={`stage grid aspect-square w-full place-items-center overflow-hidden rounded-xl border-2 border-outline ${owned ? '' : 'opacity-50 grayscale'}`}>
                {item.slot === 'title'
                  ? <span className="title-stroke px-1 text-center text-sm uppercase leading-tight">{item.name}</span>
                  : <Character
                      look={{ ...look, ...(item.slot === 'outfit' ? { accessory: 'none' } : {}), [item.slot]: item.value }}
                      crop={item.slot === 'colorway' ? 'head' : 'full'}
                      className="size-full"
                    />}
              </div>
              <p className="mt-1 w-full truncate text-center text-[11px] font-extrabold">{item.name}</p>
              <span className="mt-1">
                {on ? <Pill tone="neon">On</Pill>
                  : owned ? <Pill tone="dark">Equip</Pill>
                    : item.unlock.coins ? <Pill tone="gold" icon={Coins}>{item.unlock.coins}</Pill>
                      : <Pill tone="grape" icon={Lock}>LV {item.unlock.level}</Pill>}
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}

/** Name · bio · activity tags. */
function IdentityCard() {
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
  }

  const toggleTag = (t) =>
    updateProfile({ tags: profile.tags.includes(t) ? profile.tags.filter((x) => x !== t) : [...profile.tags, t] })

  const field = 'w-full rounded-xl border-[3px] border-outline bg-surface-2 px-3 py-2.5 font-bold focus:bg-surface focus:outline-none focus:ring-4 focus:ring-blue/40'
  const label = 'mb-1.5 block font-display text-sm uppercase tracking-widest text-muted'

  return (
    <form onSubmit={save} className="card space-y-4 p-4">
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

