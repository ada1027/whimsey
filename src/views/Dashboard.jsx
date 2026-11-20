import { CalendarCheck, Check, CircleHelp, ClipboardList, Dices, Coins, Flame, Gamepad2, Play, Plus, Shield, Target, Trophy, Users } from 'lucide-react'
import Character from '../components/Character.jsx'
import CurrentQuestCard from '../components/CurrentQuestCard.jsx'
import FriendFeed from '../components/FriendFeed.jsx'
import { CategoryTile, Countdown } from '../components/QuestBits.jsx'
import { ROLLS_PER_DAY } from '../data/seed.js'
import { useToast } from '../context/ToastContext.jsx'
import { useOnline } from '../context/OnlineContext.jsx'
import { useUser } from '../context/UserContext.jsx'
import { FILL } from '../data/tones.js'

/**
 * Home screen, laid out from the wireframe:
 *   [pro tools] [ YOU + invite ] [friends / guild]
 *   [ PLAY ] [ CURRENT TASK ] [ GAMEMODE ]
 */
export default function Dashboard({ onNavigate, onOpenPlay, onOpenGamemode, onOpenActive }) {
  const { profile, look, title, dailies, completedQuests, activeQuest: current, rollsLeft } = useUser()
  const dailiesLeft = dailies.filter((d) => !d.attempt).length
  const { party, inParty } = useOnline()
  const toast = useToast()
  const pro = profile.gamemode === 'pro'

  return (
    <div className="space-y-5">
      {/* ---------- Pinned: the quest to do right now ---------- */}
      <CurrentQuestCard />

      {/* ---------- Stage ---------- */}
      <section className="card stage relative overflow-hidden px-2 py-4">
        <div className="pointer-events-none absolute -left-10 top-6 size-40 rounded-full bg-pink/30 blur-3xl" />
        <div className="pointer-events-none absolute -right-10 bottom-0 size-40 rounded-full bg-blue/30 blur-3xl" />

        <div className="relative grid grid-cols-[64px_1fr_64px] items-center gap-1">
          {/* left column: pro tools */}
          <div className="flex flex-col gap-4 self-start pt-6">
            {pro && (
              <>
                <SideTile icon={ClipboardList} label="Daily" tone="blue" badge={dailiesLeft ? `x${dailiesLeft}` : null}
                  onClick={() => onNavigate('quests', { tab: 'dailies' })} />
                <SideTile icon={CircleHelp} label="Mystery" tone="grape"
                  onClick={() => toast('A mystery event appears tomorrow…', { tone: 'grape', icon: CircleHelp })} />
                <SideTile icon={Trophy} label="Ranks" tone="gold" onClick={() => onNavigate('social', { scrollTo: 'ranks' })} />
              </>
            )}
          </div>

          {/* center: the player */}
          <div className="relative flex flex-col items-center">
            <p className="title-stroke text-3xl uppercase">You</p>
            <p className="pill mt-1 bg-gold text-on-accent">{title}</p>
            <div className="relative mt-1">
              <button onClick={() => onNavigate('profile')} className="block w-36 animate-float" aria-label="Customize your character">
                <Character look={look} className="w-full drop-shadow-[0_6px_0_rgb(0_0_0/.3)]" />
              </button>
              {/* wireframe: "+" next to the player = invite people to form a party */}
              <button
                onClick={() => onNavigate('social')}
                className="btn btn-neon absolute -right-5 bottom-4 size-11 rounded-xl"
                aria-label="Invite people to your party"
                title="Invite to party"
              >
                <Plus size={24} strokeWidth={3.5} />
              </button>
            </div>
          </div>

          {/* right column: friends / guild */}
          <div className="flex flex-col gap-4 self-start pt-6">
            <SideTile icon={Users} label="Friends" tone="pink" onClick={() => onNavigate('social', { scrollTo: 'friends' })}
              badge={inParty ? `${party.members.length}` : null} />
            {pro && (
              <SideTile icon={Shield} label="Guild" tone="neon"
                onClick={() => toast('Guilds are coming soon!', { tone: 'neon', icon: Shield })} />
            )}
          </div>
        </div>
      </section>

      {/* ---------- Action row ---------- */}
      <div className="grid grid-cols-2 gap-3">
        <button onClick={onOpenPlay} className="btn btn-gold relative col-span-2 h-28 flex-col gap-0.5 rounded-3xl">
          <span className="flex items-center gap-2 text-5xl leading-none"><Play size={36} fill="currentColor" strokeWidth={2.5} /> Play</span>
          <span className="font-sans text-xs font-extrabold normal-case tracking-normal">
            {current ? 'Finish your active quest first' : rollsLeft ? 'Roll a random whimsical quest' : 'Out of rolls — back tomorrow'}
          </span>
          <span className="pill mt-1 bg-surface text-ink [text-shadow:none]">
            <Dices size={12} strokeWidth={3} /> Rolls left today: {rollsLeft}/{ROLLS_PER_DAY}
          </span>
        </button>

        <button
          onClick={() => (current ? onOpenActive() : onNavigate('quests', { tab: 'dailies' }))}
          className="btn btn-blue h-24 min-w-0 flex-col gap-1 rounded-3xl px-3"
        >
          <span className="flex items-center gap-1.5 text-lg leading-none"><Target size={18} strokeWidth={3} /> Current task</span>
          <span className="w-full truncate font-sans text-xs font-extrabold normal-case tracking-normal">
            {current ? current.title : `None — ${dailiesLeft} dailies left`}
          </span>
        </button>

        <button onClick={onOpenGamemode} className="btn btn-pink h-24 min-w-0 flex-col gap-1 rounded-3xl px-3">
          <span className="flex items-center gap-1.5 text-lg leading-none"><Gamepad2 size={18} strokeWidth={3} /> Gamemode</span>
          <span className="pill bg-white/90 text-[#1a1033] [text-shadow:none]">{pro ? 'Pro' : 'Simple'}</span>
        </button>
      </div>

      <DailiesPreview dailies={dailies} onOpen={() => onNavigate('quests', { tab: 'dailies' })} />

      <FriendFeed limit={8} />

      {/* ---------- Quick stats ---------- */}
      <div className="grid grid-cols-2 gap-3">
        <Stat icon={Trophy} label="Level" value={profile.level} tone="grape" />
        <Stat icon={Flame} label="Day streak" value={profile.streak} tone="pink" />
        <Stat icon={Check} label="Quests done" value={completedQuests.length} tone="neon" />
        <Stat icon={Coins} label="Coins" value={profile.coins} tone="gold" />
      </div>

    </div>
  )
}

/** Compact view of today's 3 dailies. */
function DailiesPreview({ dailies, onOpen }) {
  const done = dailies.filter((d) => d.attempt?.status === 'completed').length
  return (
    <section className="card p-3.5" aria-label="Today's dailies">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display text-xl uppercase"><CalendarCheck size={20} /> Today&apos;s dailies</h2>
        <span className="pill bg-surface-3 text-ink">{done}/{dailies.length} done</span>
      </div>
      <ul className="space-y-2">
        {dailies.map((d) => {
          const a = d.attempt
          return (
            <li key={d.id}>
              <button onClick={onOpen} className="flex w-full items-center gap-2.5 rounded-xl border-[3px] border-outline bg-surface-2 p-1.5 pr-2.5 text-left transition hover:-translate-y-0.5">
                <div className="-m-1.5 scale-[.7]"><CategoryTile category={d.category} /></div>
                <span className={`min-w-0 flex-1 truncate font-display ${a && a.status !== 'active' ? 'text-muted line-through' : ''}`}>{d.title}</span>
                {a?.status === 'completed' ? <span className="pill bg-neon text-on-accent">Done</span>
                  : a?.status === 'failed' ? <span className="pill bg-pink text-white">Failed</span>
                    : a?.status === 'active' ? <Countdown expiresAt={a.expiresAt} />
                      : <span className="pill bg-grape text-white">+{d.xp} XP</span>}
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function SideTile({ icon: Icon, label, tone, onClick, badge }) {
  return (
    <button onClick={onClick} className="group flex flex-col items-center gap-1" aria-label={label}>
      <span className={`btn relative size-14 rounded-2xl ${FILL[tone]}`}>
        <Icon size={26} strokeWidth={2.5} />
        {badge && <span className="absolute -right-2 -top-2 pill bg-pink px-1 text-[11px] leading-4 text-white">{badge}</span>}
      </span>
      <span className="font-display text-xs uppercase tracking-wide text-white [text-shadow:0_2px_0_#05020f]">{label}</span>
    </button>
  )
}

function Stat({ icon: Icon, label, value, tone }) {
  return (
    <div className="card flex items-center gap-3 p-3">
      <span className={`grid size-11 shrink-0 place-items-center rounded-xl border-[3px] border-outline shadow-[inset_0_-4px_0_rgb(0_0_0/.2)] ${FILL[tone]}`}>
        <Icon size={20} strokeWidth={2.75} />
      </span>
      <div className="min-w-0">
        <p className="font-display text-2xl leading-none tabular-nums">{value}</p>
        <p className="truncate text-[11px] font-extrabold uppercase tracking-wider text-muted">{label}</p>
      </div>
    </div>
  )
}
