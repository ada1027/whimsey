import { Check, Coins, Crown, Lock, Medal, Save, Shirt, Smile, Sparkles, Tag, Target, Trophy, Wand2 } from 'lucide-react'
import { useState } from 'react'
import Character, { GearIcon } from '../components/Character.jsx'
import { PageTitle, Pill, SectionTitle, XPBar } from '../components/ui.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { useUser } from '../context/UserContext.jsx'
import { ACTIVITY_TAGS, isOwned, ITEMS, SLOTS } from '../data/seed.js'

const SLOT_ICONS = { color: Sparkles, face: Smile, hat: Crown, item: Wand2, title: Tag }

export default function Profile() {
  const { profile, look, title, completedQuests, rank } = useUser()

  return (
    <div className="space-y-5">
      <PageTitle subtitle="Your hero, your style.">Profile</PageTitle>

      <div className="space-y-5">
        {/* Avatar card (wireframe: avatar · title · stats) */}
        <section className="card overflow-hidden">
          <div className="stage relative flex flex-col items-center px-4 pb-4 pt-5">
            <p className="font-display text-sm uppercase tracking-[.25em] text-white/80">Avatar</p>
            <Character look={look} className="mt-1 w-40 animate-float drop-shadow-[0_6px_0_rgb(0_0_0/.3)]" label={`${profile.username}'s character`} />
            <span className="pill -mt-1 bg-gold px-3 py-0.5 text-sm text-on-accent">{title}</span>
          </div>
          <div className="border-t-[3px] border-outline p-4">
            <div className="mb-3 flex items-center justify-between font-display uppercase">
              <span>Level {profile.level}</span>
              <span className="text-sm text-muted">{profile.xp}/{profile.maxXp} XP</span>
            </div>
            <XPBar xp={profile.xp} maxXp={profile.maxXp} />
            <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
              <MiniStat icon={Target} label="Tasks done" value={completedQuests.length} />
              <MiniStat icon={Trophy} label="Rank" value={`#${rank}`} />
              <MiniStat icon={Coins} label="Coins" value={profile.coins} />
            </dl>
          </div>
        </section>

        <div className="space-y-5">
          <IdentityCard />
          <Locker />
        </div>
      </div>
    </div>
  )
}

function MiniStat({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl border-[3px] border-outline bg-surface-2 px-1 py-2">
      <Icon size={16} className="mx-auto mb-0.5" strokeWidth={2.75} />
      <dd className="font-display text-xl leading-none tabular-nums">{value}</dd>
      <dt className="mt-0.5 text-[10px] font-extrabold uppercase tracking-wider text-muted">{label}</dt>
    </div>
  )
}

/** Name · bio · activity tags (wireframe right panel). */
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

/** Avatar customization: browse items per slot, equip owned ones, buy or see unlock level for the rest. */
function Locker() {
  const { profile, look, equip, buyItem } = useUser()
  const toast = useToast()
  const [slot, setSlot] = useState('color')
  const items = ITEMS.filter((i) => i.slot === slot)
  const ownedCount = ITEMS.filter((i) => isOwned(i, profile)).length

  const onPick = (item) => {
    if (profile.equipped[item.slot] === item.id) return
    if (isOwned(item, profile)) {
      equip(item.id)
      toast(`Equipped ${item.name}`, { tone: 'neon', icon: Shirt })
    } else if (item.unlock.coins) {
      if (profile.coins < item.unlock.coins) {
        toast(`Need ${item.unlock.coins - profile.coins} more coins`, { tone: 'pink', icon: Coins })
      } else {
        buyItem(item.id)
        toast(`Bought & equipped ${item.name}!`, { tone: 'gold', icon: Coins })
      }
    } else {
      toast(`Reach level ${item.unlock.level} to unlock`, { tone: 'grape', icon: Lock })
    }
  }

  return (
    <section className="card p-4">
      <SectionTitle icon={Shirt} tone="pink" action={<Pill tone="dark" icon={Medal}>{ownedCount}/{ITEMS.length} unlocked</Pill>}>
        Locker
      </SectionTitle>

      <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none]" role="tablist">
        {SLOTS.map(({ id, label }) => {
          const Icon = SLOT_ICONS[id]
          const active = slot === id
          return (
            <button key={id} role="tab" aria-selected={active} onClick={() => setSlot(id)}
              className={`pill shrink-0 rounded-xl px-3 py-1.5 text-sm transition ${active ? 'bg-gold text-on-accent -translate-y-0.5' : 'bg-surface-2 text-muted shadow-none'}`}>
              <Icon size={15} strokeWidth={2.75} /> {label}
            </button>
          )
        })}
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        {items.map((item) => {
          const owned = isOwned(item, profile)
          const equipped = profile.equipped[item.slot] === item.id
          return (
            <button
              key={item.id}
              onClick={() => onPick(item)}
              aria-pressed={equipped}
              aria-label={`${item.name}${equipped ? ', equipped' : owned ? '' : ', locked'}`}
              className={`group relative flex flex-col items-center rounded-2xl border-[3px] border-outline p-1.5 transition hover:-translate-y-1
                ${equipped ? 'bg-neon/30 shadow-[0_5px_0_var(--outline)]' : 'bg-surface-2 shadow-[0_3px_0_var(--outline)]'}`}
            >
              <div className={`stage grid aspect-square w-full place-items-center overflow-hidden rounded-xl border-2 border-outline ${owned ? '' : 'opacity-50 grayscale'}`}>
                <ItemPreview item={item} look={look} />
              </div>
              <p className="mt-1 w-full truncate text-center text-[11px] font-extrabold">{item.name}</p>
              <span className="mt-1">
                {equipped ? <Pill tone="neon">On</Pill>
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

function ItemPreview({ item, look }) {
  switch (item.slot) {
    case 'item':
      return <GearIcon item={item.value} className="h-[80%]" />
    case 'title':
      return <span className="title-stroke px-1 text-center text-sm uppercase leading-tight">{item.name}</span>
    default:
      return <Character look={{ ...look, [item.slot]: item.value }} crop="head" className="size-full" />
  }
}
