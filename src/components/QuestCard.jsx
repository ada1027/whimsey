import { Camera, Check, Coins, Lock, Play, Skull, Sparkles, Video, X, Zap } from 'lucide-react'
import { useOnline } from '../context/OnlineContext.jsx'
import { useUser } from '../context/UserContext.jsx'
import { CATEGORIES, coinsFor, penaltyLabel, QUEST_TYPE_LABEL } from '../data/seed.js'
import Character from './Character.jsx'
import { CategoryTile, Countdown, QuestMeta } from './QuestBits.jsx'
import { Pill } from './ui.jsx'

/** One of today's dailies, with the action that fits: Accept / locked / in progress / done / failed. */
export function DailyCard({ quest, onOpenActive }) {
  const { acceptDaily, activeQuest } = useUser()
  const { myMember, party, setReady } = useOnline()
  const cat = CATEGORIES[quest.category] ?? CATEGORIES.life
  const attempt = quest.attempt
  const locked = !attempt && !!activeQuest

  const accept = () => {
    acceptDaily(quest.id)
    // Readied up for a party queue? Un-ready, since you can only do one quest at a time.
    if (myMember?.is_ready && party?.status === 'lobby' && party.leader_id !== myMember.user_id) setReady(false)
  }

  return (
    <article className={`card relative flex flex-col gap-3 p-3.5 ${attempt?.status === 'active' ? 'quest-live' : ''} ${attempt && attempt.status !== 'active' ? 'bg-surface-2' : ''}`}>
      <div className="flex gap-3">
        <CategoryTile category={quest.category} />
        <div className="min-w-0 flex-1">
          <p className="font-display text-xs uppercase tracking-widest text-muted">{cat.label} · Daily</p>
          <h3 className={`font-display text-lg leading-tight ${attempt && attempt.status !== 'active' ? 'text-muted line-through decoration-[3px]' : ''}`}>
            {quest.title}
          </h3>
          <p className="mt-0.5 text-sm font-semibold text-muted">{quest.description}</p>
        </div>
        {attempt?.status === 'completed' && <StatusStamp tone="bg-neon text-on-accent" icon={Check}>Done</StatusStamp>}
        {attempt?.status === 'failed' && <StatusStamp tone="bg-pink text-white" icon={X}>Failed</StatusStamp>}
      </div>

      <QuestMeta quest={quest} showPenalty={!attempt || attempt.status === 'active'} />

      {!attempt && !locked && (
        <button onClick={accept} className="btn btn-gold h-12 w-full text-lg">
          <Play size={18} fill="currentColor" strokeWidth={2.5} /> Accept quest
        </button>
      )}
      {locked && (
        <button disabled className="btn btn-ghost h-12 w-full text-base" aria-label={`${quest.title}: finish active quest first`}>
          <Lock size={16} strokeWidth={3} /> Finish active quest first
        </button>
      )}
      {attempt?.status === 'active' && (
        <button onClick={onOpenActive} className="btn btn-neon h-12 w-full justify-between px-4 text-base">
          <span className="flex items-center gap-2"><Zap size={18} strokeWidth={3} /> In progress — open</span>
          <Countdown expiresAt={attempt.expiresAt} />
        </button>
      )}
    </article>
  )
}

function StatusStamp({ tone, icon: Icon, children }) {
  return (
    <span className={`absolute -right-2 -top-3 rotate-6 pill px-2 py-0.5 text-sm ${tone}`}>
      <Icon size={14} strokeWidth={4} /> {children}
    </span>
  )
}

const viewable = (url) => /^(https?:|data:image|blob:)/.test(url ?? '')

/** A finished (or failed) quest in the Done tab. */
export function HistoryCard({ quest, justFinished = false }) {
  const failed = quest.status === 'failed'
  const when = new Date(quest.completedAt ?? quest.failedAt)
  const proofs = quest.partyProofs ?? []

  return (
    <article
      id={justFinished ? 'just-finished' : undefined}
      className={`card relative flex flex-col gap-3 p-3.5 ${justFinished ? 'quest-live animate-pop' : failed ? 'bg-surface-2' : ''}`}
    >
      {justFinished && (
        <span className="absolute -top-3 left-3 pill bg-gold px-2 py-0.5 text-sm text-on-accent">
          <Sparkles size={14} strokeWidth={3} /> Just finished
        </span>
      )}
      <div className="flex gap-3">
        <CategoryTile category={quest.category} />
        <div className="min-w-0 flex-1">
          <p className="font-display text-xs uppercase tracking-widest text-muted">
            {QUEST_TYPE_LABEL[quest.type ?? (quest.group ? 'group' : 'daily')]} · {when.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}{' '}
            {when.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
          </p>
          <h3 className="font-display text-lg leading-tight">{quest.title}</h3>
        </div>
        {failed
          ? <StatusStamp tone="bg-pink text-white" icon={X}>Failed</StatusStamp>
          : <StatusStamp tone="bg-neon text-on-accent" icon={Check}>Done</StatusStamp>}
      </div>

      {failed ? (
        <p className="flex items-center gap-1.5 text-sm font-extrabold text-pink">
          <Skull size={15} /> {quest.failReason === 'gave_up' ? 'Gave up' : 'Time expired'} · {penaltyLabel(quest.penalty)}
        </p>
      ) : (
        <div className="flex flex-wrap items-center gap-1.5">
          <Pill tone="grape" icon={Zap}>+{quest.xp} XP</Pill>
          <Pill tone="gold" icon={Coins}>+{coinsFor(quest.xp)}</Pill>
          {quest.group && <Pill tone="pink">+50% party bonus</Pill>}
          {quest.proof && !quest.group && (
            <Pill tone="blue" icon={quest.proof.kind === 'video' ? Video : Camera} className="max-w-48 normal-case tracking-normal">
              <span className="truncate">{quest.proof.name}</span>
            </Pill>
          )}
        </div>
      )}

      {quest.group && proofs.length > 0 && (
        <div>
          <p className="mb-1.5 font-display text-xs uppercase tracking-widest text-muted">Party proof</p>
          <div className="grid grid-cols-4 gap-2">
            {proofs.map((p) => (
              <div key={p.id} className="text-center">
                <div className="stage relative aspect-square overflow-hidden rounded-xl border-[3px] border-outline">
                  {viewable(p.url) ? (
                    <a href={p.url} target="_blank" rel="noreferrer" title={`${p.name}'s proof`}>
                      <img src={p.url} alt={`${p.name}'s proof`} className="size-full object-cover" />
                    </a>
                  ) : (
                    <>
                      <Character look={p.look} crop="head" className="size-full opacity-90" />
                      <span className="absolute bottom-0.5 right-0.5 pill bg-surface px-1 py-0 text-[9px] text-ink">
                        {p.failed ? 'Failed' : p.url ? (p.url.includes('mp4') ? '🎬' : '📸') : '…'}
                      </span>
                    </>
                  )}
                </div>
                <p className="mt-0.5 truncate text-[11px] font-extrabold">{p.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </article>
  )
}
