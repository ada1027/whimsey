import { Camera, FileCheck2, ImagePlus, Send, Upload, User, Users, Video } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useOnline } from '../context/OnlineContext.jsx'
import { useUser } from '../context/UserContext.jsx'
import { QuestMeta } from './QuestBits.jsx'
import { Modal } from './ui.jsx'

const MAX_BYTES = 100 * 1024 * 1024 // 100 MB

// Mock files so the flow can be tried without a real photo/video.
const SAMPLES = [
  { name: 'proof-photo.jpg', type: 'image/jpeg', size: 2_340_000, kind: 'photo', emoji: '📸', bg: 'from-pink to-gold' },
  { name: 'before-after.png', type: 'image/png', size: 1_120_000, kind: 'photo', emoji: '🖼️', bg: 'from-grape to-pink' },
  { name: 'quest-clip.mp4', type: 'video/mp4', size: 18_600_000, kind: 'video', emoji: '🎬', bg: 'from-blue to-grape' },
]

const formatSize = (b) => (b >= 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1e3))} KB`)

/** Asks for a (mock) photo/video before a quest is completed. Nothing is uploaded. */
export default function ProofModal({ quest, onClose }) {
  const { completeQuest } = useUser()
  const { completeWithProof } = useOnline()
  const inputRef = useRef(null)
  const [proof, setProof] = useState(null) // { name, type, size, kind, url?, sample?, file? }
  const [mode, setMode] = useState('together') // group quests: 'together' | 'separate'
  const isPartyQuest = !!quest.partyId
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Free the preview URL when the file changes or the modal closes.
  useEffect(() => () => proof?.url && URL.revokeObjectURL(proof.url), [proof])

  const pickFile = (file) => {
    if (!file) return
    const kind = file.type.startsWith('image/') ? 'photo' : file.type.startsWith('video/') ? 'video' : null
    if (!kind) return setError('Please choose a photo or video file.')
    if (file.size > MAX_BYTES) return setError('That file is over 100 MB.')
    setError('')
    setProof({ name: file.name, type: file.type, size: file.size, kind, url: URL.createObjectURL(file), file })
  }

  const submit = () => {
    if (!proof || submitting) return
    setSubmitting(true)
    const { name, type, size, kind, sample = false, file } = proof
    const share = () => completeWithProof({ quest, mode: isPartyQuest ? mode : null, file: sample ? null : file, sampleName: sample ? name : null })
    if (isPartyQuest) {
      // Award locally right away, then upload, sync completion to the party and post to the feed.
      completeQuest(quest.id, { name, type, size, kind, sample, mode })
      onClose()
      share()
      return
    }
    // Solo: short "verifying" beat, award XP + coins (reward overlay takes over), then share to the feed.
    setTimeout(() => {
      completeQuest(quest.id, { name, type, size, kind, sample })
      onClose()
      share()
    }, 800)
  }


  return (
    <Modal onClose={onClose} title={quest.title} eyebrow="Submit proof" dismissable={!submitting}>
      <QuestMeta quest={quest} />

      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={(e) => { pickFile(e.target.files?.[0]); e.target.value = '' }}
      />
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); pickFile(e.dataTransfer.files?.[0]) }}
        className={`mt-4 overflow-hidden rounded-2xl border-[3px] border-dashed border-outline transition ${dragging ? 'bg-neon/30' : 'bg-surface-2'}`}
      >
        {proof ? (
          <Preview proof={proof} />
        ) : (
          <button type="button" onClick={() => inputRef.current?.click()} className="flex w-full flex-col items-center gap-2 px-4 py-7 text-center">
            <span className="grid size-14 place-items-center rounded-2xl border-[3px] border-outline bg-grape text-white shadow-[0_4px_0_var(--outline)]">
              <ImagePlus size={28} strokeWidth={2.5} />
            </span>
            <span className="font-display text-lg uppercase">Attach photo or video</span>
            <span className="text-xs font-bold text-muted">Tap to browse, or drag & drop · max 100 MB</span>
          </button>
        )}
      </div>

      {proof && (
        <div className="mt-2 flex items-center gap-2 text-sm font-bold">
          {proof.kind === 'video' ? <Video size={16} /> : <Camera size={16} />}
          <span className="min-w-0 flex-1 truncate">{proof.name}</span>
          <span className="text-muted">{formatSize(proof.size)}</span>
          <button onClick={() => inputRef.current?.click()} disabled={submitting} className="flex items-center gap-1 underline decoration-2 underline-offset-2">
            <Upload size={14} /> Change
          </button>
        </div>
      )}

      {error && <p role="alert" className="mt-2 pill bg-pink px-2 py-1 text-xs normal-case tracking-normal text-white">{error}</p>}

      {isPartyQuest && (
        <fieldset className="mt-4">
          <legend className="mb-2 font-display text-sm uppercase tracking-widest text-muted">How is your party completing it?</legend>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'together', icon: Users, label: 'Together', hint: 'One photo counts for the whole party' },
              { id: 'separate', icon: User, label: 'Separately', hint: 'Everyone submits their own proof' },
            ].map(({ id, icon: Icon, label, hint }) => (
              <button key={id} type="button" onClick={() => setMode(id)} aria-pressed={mode === id}
                className={`rounded-xl border-[3px] border-outline p-2 text-left transition ${mode === id ? 'bg-blue text-on-accent shadow-[0_4px_0_var(--outline)]' : 'bg-surface-2'}`}>
                <span className="flex items-center gap-1.5 font-display uppercase"><Icon size={16} strokeWidth={3} /> {label}</span>
                <span className="block text-[11px] font-bold opacity-80">{hint}</span>
              </button>
            ))}
          </div>
        </fieldset>
      )}

      <p className="mb-2 mt-4 font-display text-sm uppercase tracking-widest text-muted">Or use a sample file</p>
      <div className="grid grid-cols-3 gap-2">
        {SAMPLES.map((s) => {
          const selected = proof?.sample && proof.name === s.name
          return (
            <button
              key={s.name}
              type="button"
              disabled={submitting}
              onClick={() => { setError(''); setProof({ ...s, sample: true }) }}
              aria-pressed={selected}
              className={`rounded-xl border-[3px] border-outline p-1.5 text-left transition hover:-translate-y-0.5 ${selected ? 'bg-gold text-on-accent shadow-[0_4px_0_var(--outline)]' : 'bg-surface-2'}`}
            >
              <div className={`grid aspect-video place-items-center rounded-lg border-2 border-outline bg-gradient-to-br text-2xl ${s.bg}`}>{s.emoji}</div>
              <p className="mt-1 truncate text-[11px] font-extrabold">{s.name}</p>
            </button>
          )
        })}
      </div>

      <button onClick={submit} disabled={!proof || submitting} className="btn btn-neon mt-5 h-14 w-full text-xl">
        {submitting ? (
          <><span className="size-5 animate-spin rounded-full border-[3px] border-current border-t-transparent" /> Verifying…</>
        ) : (
          <><Send size={20} strokeWidth={3} /> Submit Proof</>
        )}
      </button>
      <p className="mt-3 flex items-center justify-center gap-1 text-[11px] font-bold text-muted">
        <FileCheck2 size={12} />
        Your proof is shared to your friends' activity feed.
      </p>
    </Modal>
  )
}

function Preview({ proof }) {
  if (proof.url && proof.kind === 'photo') return <img src={proof.url} alt="Selected proof" className="max-h-56 w-full object-contain" />
  if (proof.url && proof.kind === 'video') return <video src={proof.url} controls muted className="max-h-56 w-full bg-black" />
  const sample = SAMPLES.find((s) => s.name === proof.name)
  return (
    <div className={`grid h-40 place-items-center bg-gradient-to-br text-6xl ${sample?.bg ?? ''}`}>
      <span>{sample?.emoji ?? '📎'}</span>
    </div>
  )
}
