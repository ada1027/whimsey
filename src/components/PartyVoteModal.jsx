import { Check, ChevronDown, Coins, RefreshCw, Users, Zap } from 'lucide-react'
import { useOnline } from '../context/OnlineContext.jsx'
import { coinsFor, DIFFICULTY, MAX_REROLLS, PARTY_BONUS } from '../data/seed.js'
import Character from './Character.jsx'
import { CategoryTile } from './QuestBits.jsx'
import { Pill } from './ui.jsx'

/** Pops on every party member's screen while the party votes Accept / Reroll on a group quest. */
export default function PartyVoteModal() {
  const { party, me, vote, hiddenVoteRound, hideVote } = useOnline()
  const quest = party?.current_quest
  if (party?.status !== 'voting' || !quest || hiddenVoteRound === quest.round) return null

  const base = DIFFICULTY[quest.difficulty].xp
  const total = Math.round(base * (1 + PARTY_BONUS))
  const myVote = party.votes?.[me]
  const rerollsLeft = MAX_REROLLS - party.rerolls_used
  const waiting = party.members.filter((m) => !party.votes?.[m.user_id]).length

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center overflow-hidden bg-[#05020f]/80 p-4 backdrop-blur-sm">
      <div className="pointer-events-none absolute left-1/2 top-1/2 size-[1200px] -translate-x-1/2 -translate-y-1/2 animate-spin-slow bg-[repeating-conic-gradient(rgb(47_180_255/.14)_0deg_10deg,transparent_10deg_20deg)] [mask-image:radial-gradient(circle,black_10%,transparent_60%)]" />

      <div role="dialog" aria-modal="true" aria-labelledby="vote-title" className="relative w-full text-center" key={quest.round}>
        <p className="font-display text-lg uppercase tracking-[.25em] text-blue">Match found!</p>
        <h2 id="vote-title" className="title-stroke animate-pop text-5xl uppercase leading-none">Quest popped!</h2>
        <p className="mt-1 font-bold text-white/85">Vote with your party: accept or reroll.</p>

        <div className="card mt-4 animate-pop overflow-hidden text-left">
          <div className="stripes flex items-center justify-between border-b-[3px] border-outline bg-blue px-3 py-1.5">
            <span className="flex items-center gap-1.5 font-display text-sm uppercase tracking-wider text-on-accent">
              <Users size={14} strokeWidth={3} /> Group quest
            </span>
            <span className="pill bg-pink text-white">+50% party bonus</span>
          </div>
          <div className="p-3.5">
            <div className="flex gap-3">
              <CategoryTile category={quest.category} size="lg" />
              <div className="min-w-0">
                <h3 className="font-display text-2xl uppercase leading-tight">{quest.title}</h3>
                <p className="text-sm font-semibold text-muted">{quest.description}</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Pill tone={DIFFICULTY[quest.difficulty].tone}>{DIFFICULTY[quest.difficulty].label}</Pill>
              <Pill tone="dark">{quest.minutes} min</Pill>
              <Pill tone="grape" icon={Zap}><span className="line-through opacity-70">{base}</span> {total} XP</Pill>
              <Pill tone="gold" icon={Coins}>+{coinsFor(total)}</Pill>
              <Pill tone="dark" icon={RefreshCw}>{rerollsLeft} rerolls left</Pill>
            </div>

            <p className="mb-1.5 mt-4 font-display text-sm uppercase tracking-widest text-muted">Votes</p>
            <div className="grid grid-cols-4 gap-2">
              {party.members.map((m) => {
                const v = party.votes?.[m.user_id]
                return (
                  <div key={m.user_id} className="relative text-center">
                    <div className="stage aspect-square overflow-hidden rounded-xl border-[3px] border-outline">
                      <Character look={m.look} crop="head" className="size-full" />
                    </div>
                    <span className={`pill absolute -right-1 -top-1.5 px-1 py-0 ${v === 'accept' ? 'bg-neon text-on-accent' : v === 'reroll' ? 'bg-blue text-on-accent' : 'bg-surface-3 text-ink'}`}>
                      {v === 'accept' ? <Check size={12} strokeWidth={4} /> : v === 'reroll' ? <RefreshCw size={12} strokeWidth={3.5} /> : '…'}
                    </span>
                    <p className="mt-0.5 truncate text-[11px] font-extrabold">{m.user_id === me ? 'You' : m.profile.username}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="mt-4 flex gap-3">
          <button onClick={() => vote('reroll')} disabled={rerollsLeft <= 0}
            className={`btn h-14 flex-1 text-lg ${myVote === 'reroll' ? 'btn-blue ring-4 ring-white/70' : 'btn-ghost'}`}>
            <RefreshCw size={18} strokeWidth={3} /> Reroll
          </button>
          <button onClick={() => vote('accept')} autoFocus
            className={`btn btn-gold h-14 flex-[1.6] text-lg ${myVote === 'accept' ? 'ring-4 ring-white/70' : ''}`}>
            <Check size={20} strokeWidth={3.5} /> Accept
          </button>
        </div>
        <p className="mt-2 font-display text-sm uppercase tracking-wider text-white/85">
          {myVote ? `You voted ${myVote} · waiting for ${waiting} more…` : rerollsLeft <= 0 ? 'No rerolls left — majority accepts' : 'Majority wins · ties accept'}
        </p>
        <button onClick={() => hideVote(quest.round)} className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-white/70 underline">
          <ChevronDown size={14} /> Hide (reopen from the Social tab)
        </button>
      </div>
    </div>
  )
}
