import { Activity, Users } from 'lucide-react'
import { useOnline } from '../context/OnlineContext.jsx'
import { CATEGORIES, QUEST_TYPE_LABEL, REACTIONS } from '../data/seed.js'
import { FILL } from '../data/tones.js'
import { parseAvatar } from '../lib/api.js'
import Character from './Character.jsx'
import { CategoryTile } from './QuestBits.jsx'
import { Pill, SectionTitle } from './ui.jsx'
import { useNow } from './useNow.js'

const TYPE_TONE = { daily: 'gold', random: 'pink', group: 'blue' }
const CATEGORY_EMOJI = { body: '💪', mind: '🧠', craft: '🎨', life: '🌿', social: '💬' }
const SAMPLE_EMOJI = { 'proof-photo.jpg': '📸', 'before-after.png': '🖼️', 'quest-clip.mp4': '🎬' }
const GRADIENT = {
  neon: 'from-neon to-blue', grape: 'from-grape to-pink', pink: 'from-pink to-gold', gold: 'from-gold to-pink', blue: 'from-blue to-grape',
}

export function timeAgo(iso, now) {
  const m = Math.floor((now - Date.parse(iso)) / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  if (m < 1440) return `${Math.floor(m / 60)}h ago`
  return `${Math.floor(m / 1440)}d ago`
}

function duration(sec) {
  if (!sec) return null
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  return h ? `${h}h ${m}m` : m ? `${m}m ${s}s` : `${s}s`
}

/** Photo / video if it's shareable, otherwise a sample card. */
function ProofPreview({ url, category, title }) {
  const tone = CATEGORIES[category]?.tone ?? 'grape'
  const isVideo = /^data:video|\.(mp4|webm|mov)(\?|$)/i.test(url ?? '')
  if (/^(https?:|data:|blob:)/.test(url ?? '')) {
    return isVideo
      ? <video src={url} controls muted playsInline className="aspect-[4/3] w-full rounded-2xl border-[3px] border-outline bg-black object-cover" />
      : <img src={url} alt={`Proof for ${title}`} loading="lazy" className="aspect-[4/3] w-full rounded-2xl border-[3px] border-outline object-cover" />
  }
  const sample = url?.startsWith('sample:') ? url.slice(7) : null
  const emoji = sample && !/^[\w.-]+$/.test(sample) ? sample : SAMPLE_EMOJI[sample] ?? CATEGORY_EMOJI[category] ?? '✨'
  return (
    <div className={`relative grid aspect-[4/3] w-full place-items-center overflow-hidden rounded-2xl border-[3px] border-outline bg-gradient-to-br ${GRADIENT[tone]}`}>
      <div className="absolute inset-0 bg-[repeating-conic-gradient(rgb(255_255_255/.12)_0deg_10deg,transparent_10deg_20deg)]" />
      <span className="relative text-7xl drop-shadow-[0_4px_0_rgb(0_0_0/.25)]">{emoji}</span>
      {!url && <span className="absolute bottom-2 pill bg-surface text-ink">Proof kept on device</span>}
    </div>
  )
}

function Head({ look, className = 'size-10' }) {
  return (
    <div className={`stage shrink-0 overflow-hidden rounded-xl border-[3px] border-outline ${className}`}>
      <Character look={look} crop="head" className="size-full" />
    </div>
  )
}

function FeedPost({ post, now, profilesById, onReact }) {
  const look = parseAvatar(post.author.avatar).look
  const type = post.quest_type
  return (
    <article className="card overflow-hidden p-3" aria-label={`${post.author.username} completed ${post.quest_title}`}>
      <header className="flex items-center gap-2.5">
        <Head look={look} />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 font-display text-base leading-tight">
            <span className="truncate">{post.isMine ? 'You' : post.author.username}</span>
            <Pill tone="grape" className="text-[10px] leading-4">LV {post.author.level}</Pill>
          </p>
          <p className="text-xs font-bold text-muted">{timeAgo(post.created_at, now)}</p>
        </div>
        <Pill tone={TYPE_TONE[type]}>{QUEST_TYPE_LABEL[type]}</Pill>
      </header>

      <div className="my-3 flex items-center gap-2.5">
        <div className="-m-1 scale-[.8]"><CategoryTile category={post.category ?? 'life'} /></div>
        <div className="min-w-0">
          <h3 className="truncate font-display text-lg leading-tight">{post.quest_title}</h3>
          {post.duration_seconds && <p className="text-xs font-extrabold text-muted">Finished in {duration(post.duration_seconds)}</p>}
        </div>
      </div>

      <ProofPreview url={post.proof_url} category={post.category} title={post.quest_title} />

      {type === 'group' && post.party?.length > 0 && (
        <div className="mt-2.5 flex items-center gap-2">
          <div className="flex -space-x-2">
            {post.party.map((m) => <Head key={m.id ?? m.name} look={m.look ?? parseAvatar(profilesById[m.id]?.avatar).look} className="size-8 rounded-lg border-2" />)}
          </div>
          <p className="min-w-0 flex-1 truncate text-xs font-extrabold text-muted">{post.party.map((m) => m.name).join(', ')}</p>
          {post.completion_tag && (
            <Pill tone="blue" icon={Users}>{post.completion_tag === 'together' ? 'Done together' : 'Done separate'}</Pill>
          )}
        </div>
      )}

      <div className="mt-3 grid grid-cols-3 gap-2">
        {REACTIONS.map((r) => {
          const on = post.mine[r.id]
          return (
            <button
              key={r.id}
              onClick={() => onReact(post, r.id)}
              aria-pressed={on}
              aria-label={`${r.label} (${post.counts[r.id]})`}
              className={`flex items-center justify-center gap-1.5 rounded-xl border-[3px] border-outline py-1.5 font-display text-sm uppercase transition active:translate-y-0.5
                ${on ? `${FILL[r.id === 'hype' ? 'gold' : r.id === 'gg' ? 'neon' : 'grape']} shadow-[0_3px_0_var(--outline)]` : 'bg-surface-2 text-ink'}`}
            >
              <span className={`text-base ${on ? 'animate-pop' : ''}`}>{r.emoji}</span>
              <span className="hidden min-[380px]:inline">{r.label}</span>
              <span className="tabular-nums">{post.counts[r.id]}</span>
            </button>
          )
        })}
      </div>
    </article>
  )
}

/** Strava/BeReal-style feed of friends' completed quests with proof + reactions. */
export default function FriendFeed({ limit = 10, title = 'Friend activity' }) {
  const { feed, loaded, profilesById, toggleReaction } = useOnline()
  const now = useNow(30_000)
  const posts = feed.slice(0, limit)

  return (
    <section aria-label={title}>
      <SectionTitle icon={Activity} tone="pink">{title}</SectionTitle>
      {!loaded ? (
        <p className="py-6 text-center font-bold text-muted">Loading feed…</p>
      ) : posts.length === 0 ? (
        <div className="card p-5 text-center text-sm font-bold text-muted">No activity yet. Complete a quest to post your proof!</div>
      ) : (
        <div className="space-y-4">
          {posts.map((p) => <FeedPost key={p.id} post={p} now={now} profilesById={profilesById} onReact={toggleReaction} />)}
        </div>
      )}
    </section>
  )
}
