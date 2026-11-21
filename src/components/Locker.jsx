import { Check, Coins, Lock, Shirt, Sparkles, Tag, Umbrella, X } from 'lucide-react'
import { useState } from 'react'
import { useToast } from '../context/ToastContext.jsx'
import { useUser } from '../context/UserContext.jsx'
import { COLORWAYS, STAGES, stageFor } from '../data/companion.js'
import { isOwned, ITEM_BY_ID, ITEMS, SLOTS } from '../data/seed.js'
import Character, { AccessoryIcon } from './Character.jsx'

const SLOT_ICONS = { colorway: Sparkles, outfit: Shirt, accessory: Umbrella, title: Tag }
const STAGE_ORDER = ['hatchling', 'fledgling', 'stormbird']
const omit = (obj, key) => { const next = { ...obj }; delete next[key]; return next }

/* ---------------- item icons ---------------- */

function Swatch({ colorway }) {
  const c = COLORWAYS[colorway]
  return (
    <span
      className="block size-14 rounded-full border-[3px] border-outline shadow-[inset_0_-5px_0_rgb(0_0_0/.15),0_3px_0_var(--outline)]"
      style={{ background: `conic-gradient(${c.body} 0 50%, ${c.belly} 50% 75%, ${c.accent} 75% 100%)` }}
    />
  )
}

function OutfitIcon({ kind }) {
  if (kind === 'jersey') {
    return (
      <svg viewBox="0 0 64 64" className="size-14" aria-hidden>
        <path d="M18 8 L26 8 Q32 18 38 8 L46 8 Q47 22 56 26 L56 58 L8 58 L8 26 Q17 22 18 8 Z" fill="#fff" stroke="#1d2457" strokeWidth={3} strokeLinejoin="round" />
        <path d="M26 8 Q32 18 38 8 M18 8 Q17 22 8 26 M46 8 Q47 22 56 26" fill="none" stroke="#2f5fd0" strokeWidth={4} strokeLinejoin="round" />
        <path d="M8 50 L56 50" stroke="#2f5fd0" strokeWidth={3} />
        <text x={32} y={45} textAnchor="middle" fontFamily="Lilita One, sans-serif" fontSize={22} fill="#2f5fd0" stroke="#ffcb3d" strokeWidth={2.4} paintOrder="stroke">1</text>
      </svg>
    )
  }
  if (kind === 'hoodie') {
    return (
      <svg viewBox="0 0 64 64" className="size-14" aria-hidden>
        <path d="M20 10 Q32 4 44 10 L56 20 L56 34 L48 34 L48 58 L16 58 L16 34 L8 34 L8 20 Z" fill="#e8414f" stroke="#1d2457" strokeWidth={3} strokeLinejoin="round" />
        <path d="M22 11 Q32 24 42 11" fill="none" stroke="#b82a3a" strokeWidth={5} strokeLinecap="round" />
        <path d="M28 18 L27 28 M36 18 L37 28" stroke="#fff" strokeWidth={2} strokeLinecap="round" />
        <path d="M22 44 L42 44 L44 54 L20 54 Z" fill="#b82a3a" stroke="#1d2457" strokeWidth={2} strokeLinejoin="round" />
        <circle cx={32} cy={36} r={4} fill="none" stroke="#ffcb3d" strokeWidth={2.4} strokeDasharray="2 1.4" />
      </svg>
    )
  }
  return <NoneIcon />
}

function NoneIcon() {
  return (
    <span className="grid size-12 place-items-center rounded-full border-[3px] border-dashed border-muted/60 text-muted">
      <X size={20} strokeWidth={3} />
    </span>
  )
}

function TitleBadge({ name, small }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-xl border-[3px] border-outline bg-gradient-to-b from-[#ffe08a] to-gold px-2 py-1 text-center font-display uppercase leading-tight text-on-accent shadow-[inset_0_-3px_0_rgb(0_0_0/.15),0_3px_0_var(--outline)] ${small ? 'text-[10px]' : 'text-xs'}`}>
      ★ {name}
    </span>
  )
}

function ItemIcon({ item }) {
  switch (item.slot) {
    case 'colorway': return <Swatch colorway={item.value} />
    case 'outfit': return <OutfitIcon kind={item.value} />
    case 'accessory': return item.value === 'none' ? <NoneIcon /> : <AccessoryIcon kind={item.value} className="size-14" />
    case 'title': return <TitleBadge name={item.name} small />
    default: return null
  }
}

/* ---------------- locker ---------------- */

/** Full-screen Thunderbird Locker: live preview, evolution preview, wardrobe grid. */
export default function Locker({ onClose }) {
  const { profile, look, title, equip, buyItem } = useUser()
  const toast = useToast()
  const [stage, setStage] = useState(() => stageFor(profile.level))
  const [slot, setSlot] = useState('colorway')
  const [tryOn, setTryOn] = useState({}) // slot → item id being previewed but not owned
  const [selectedId, setSelectedId] = useState(null)
  const [cheer, setCheer] = useState(false)

  const value = (id) => ITEM_BY_ID[id]?.value
  const previewLook = {
    ...look,
    level: STAGES[stage].from,
    ...Object.fromEntries(Object.entries(tryOn).filter(([s]) => s !== 'title').map(([s, id]) => [s, value(id)])),
  }
  const previewTitle = tryOn.title ? ITEM_BY_ID[tryOn.title].name : title
  const items = ITEMS.filter((i) => i.slot === slot)
  const selected = selectedId ? ITEM_BY_ID[selectedId] : null

  const pick = (item) => {
    setSelectedId(item.id)
    if (isOwned(item, profile)) {
      // Owned: equip right away (synced to your profile), clear any try-on for this slot.
      if (profile.equipped[item.slot] !== item.id) equip(item.id)
      setTryOn((t) => omit(t, item.slot))
    } else {
      setTryOn((t) => ({ ...t, [item.slot]: item.id })) // preview only
    }
  }

  const buy = (item) => {
    if (profile.coins < item.unlock.coins) return toast(`Need ${item.unlock.coins - profile.coins} more coins`, { tone: 'pink', icon: Coins })
    buyItem(item.id)
    setTryOn((t) => omit(t, item.slot))
    toast(`Unlocked & equipped ${item.name}!`, { tone: 'gold', icon: Coins })
  }

  const poke = () => {
    if (cheer) return
    setCheer(true)
    setTimeout(() => setCheer(false), 1100)
  }

  const action = (() => {
    if (!selected) return null
    const owned = isOwned(selected, profile)
    if (owned) return { label: profile.equipped[selected.slot] === selected.id ? 'Equipped' : 'Equip', done: profile.equipped[selected.slot] === selected.id }
    if (selected.unlock.coins) return { label: `Buy for ${selected.unlock.coins}`, buy: true }
    return { label: `Unlocks at LV ${selected.unlock.level}`, locked: true }
  })()

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-bg" role="dialog" aria-modal="true" aria-labelledby="locker-title">
      {/* header */}
      <div className="flex items-center justify-between gap-2 border-b-[3px] border-outline bg-surface px-3 py-2">
        <h2 id="locker-title" className="flex items-center gap-2 font-display text-xl uppercase"><Shirt size={20} strokeWidth={2.75} /> Thunderbird Locker</h2>
        <div className="flex items-center gap-2">
          <span className="pill bg-gold text-on-accent"><Coins size={12} strokeWidth={3} /> {profile.coins}</span>
          <button onClick={onClose} className="btn btn-ghost size-9 rounded-xl" aria-label="Close locker"><X size={16} strokeWidth={3} /></button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:none]">
        {/* live preview stage */}
        <div className="stage relative border-b-[3px] border-outline px-4 pb-3 pt-4">
          <span className="absolute left-3 top-3"><TitleBadge name={previewTitle} small /></span>
          {Object.keys(tryOn).length > 0 && <span className="absolute right-3 top-3 pill bg-pink text-white">Preview</span>}
          <button onClick={poke} className="mx-auto block w-44" aria-label="Preview your Thunderbird">
            <Character look={previewLook} mood={cheer ? 'cheer' : 'happy'} className={`w-full drop-shadow-[0_6px_0_rgb(0_0_0/.3)] ${cheer ? 'animate-wiggle' : 'animate-float'}`} label={`${profile.companionName} preview`} />
          </button>
          <p className="text-center font-display text-lg text-white [text-shadow:0_2px_0_#05020f]">{profile.companionName} · {STAGES[stage].name}</p>

          {/* evolution preview switcher */}
          <div className="mt-2 grid grid-cols-3 gap-1.5" role="tablist" aria-label="Evolution preview">
            {STAGE_ORDER.map((s) => {
              const locked = profile.level < STAGES[s].from
              const active = stage === s
              return (
                <button key={s} role="tab" aria-selected={active} onClick={() => setStage(s)}
                  className={`flex items-center justify-center gap-1 rounded-xl border-[3px] border-outline py-1.5 font-display text-[11px] uppercase leading-tight transition ${active ? 'bg-gold text-on-accent shadow-[0_3px_0_var(--outline)]' : 'bg-[#05020f]/40 text-white'}`}>
                  {locked && <Lock size={11} strokeWidth={3} />} Lv {STAGES[s].from} {STAGES[s].name}
                </button>
              )
            })}
          </div>
        </div>

        {/* slot tabs */}
        <div className="sticky top-0 z-10 grid grid-cols-4 gap-1.5 border-b-[3px] border-outline bg-surface-2 p-2" role="tablist" aria-label="Wardrobe">
          {SLOTS.map(({ id, label }) => {
            const Icon = SLOT_ICONS[id]
            const active = slot === id
            return (
              <button key={id} role="tab" aria-selected={active} onClick={() => setSlot(id)}
                className={`pill flex-col justify-center gap-0.5 rounded-xl py-1.5 text-[11px] transition ${active ? 'bg-gold text-on-accent -translate-y-0.5' : 'bg-surface text-muted shadow-none'}`}>
                <Icon size={15} strokeWidth={2.75} /> {label}
              </button>
            )
          })}
        </div>

        {/* wardrobe grid */}
        <div className="grid grid-cols-3 gap-2.5 p-3">
          {items.map((item) => {
            const owned = isOwned(item, profile)
            const equipped = profile.equipped[item.slot] === item.id
            const focused = selectedId === item.id || tryOn[item.slot] === item.id
            return (
              <button key={item.id} onClick={() => pick(item)} aria-pressed={equipped}
                aria-label={`${item.name}${equipped ? ', equipped' : owned ? '' : ', locked'}`}
                className={`relative flex flex-col items-center gap-1.5 rounded-2xl border-[3px] p-2 pt-3 transition active:translate-y-0.5
                  ${focused ? 'border-gold bg-gold/15' : 'border-outline bg-surface'} shadow-[0_3px_0_var(--outline)]`}>
                <span className={`grid h-16 w-full place-items-center ${owned ? '' : 'opacity-60 grayscale-[.4]'}`}><ItemIcon item={item} /></span>
                <span className="w-full truncate text-center text-[11px] font-extrabold">{item.name}</span>
                {equipped ? <span className="pill bg-neon text-on-accent"><Check size={11} strokeWidth={3.5} /> On</span>
                  : owned ? <span className="pill bg-surface-3 text-ink">Owned</span>
                    : item.unlock.coins ? <span className="pill bg-gold text-on-accent"><Coins size={11} strokeWidth={3} /> {item.unlock.coins}</span>
                      : <span className="pill bg-grape text-white"><Lock size={11} strokeWidth={3} /> LV {item.unlock.level}</span>}
              </button>
            )
          })}
        </div>
      </div>

      {/* action bar */}
      <div className="border-t-[3px] border-outline bg-surface p-3">
        {selected && action && (
          <div className="mb-2 flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate font-display text-base uppercase">{selected.name}</span>
            {action.buy ? (
              <button onClick={() => buy(selected)} className="btn btn-gold h-10 px-3 text-sm"><Coins size={15} strokeWidth={3} /> {action.label}</button>
            ) : (
              <span className={`pill px-2.5 py-1 text-xs ${action.done ? 'bg-neon text-on-accent' : action.locked ? 'bg-grape text-white' : 'bg-surface-3 text-ink'}`}>
                {action.locked ? <Lock size={12} strokeWidth={3} /> : <Check size={12} strokeWidth={3.5} />} {action.label}
              </span>
            )}
          </div>
        )}
        <button onClick={onClose} className="btn btn-neon h-12 w-full text-lg"><Check size={18} strokeWidth={3.5} /> Save &amp; Equip</button>
        {Object.keys(tryOn).length > 0 && <p className="mt-1.5 text-center text-[11px] font-bold text-muted">Locked items are preview-only until unlocked.</p>}
      </div>
    </div>
  )
}
