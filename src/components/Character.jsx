// Baby Thunderbird companion — clean chibi style (big glossy eyes, tiny beak, soft round body).
// Evolves with level: Lv 1–2 Hatchling (thunder-egg) · Lv 3–4 Fledgling · Lv 5+ Stormbird (wings + lightning).
// look: { colorway, accessory, outfit, level } — older looks are normalized automatically.

import { useId } from 'react'
import { COLORWAYS, normalizeLook, stageFor } from '../data/companion.js'

const O = '#1d2457' // soft navy outline
const SW = 4

const sparkPath = (cx, cy, s) =>
  `M${cx} ${cy - s} L${cx + s * 0.3} ${cy - s * 0.3} L${cx + s} ${cy} L${cx + s * 0.3} ${cy + s * 0.3} L${cx} ${cy + s} L${cx - s * 0.3} ${cy + s * 0.3} L${cx - s} ${cy} L${cx - s * 0.3} ${cy - s * 0.3} Z`

/** Small lightning bolt with its top at (x, y). */
function Bolt({ x, y, s = 1, fill }) {
  return (
    <polygon points="0,0 11,0 5,11 13,11 -3,31 2,16 -6,16" transform={`translate(${x} ${y}) scale(${s})`}
      fill={fill} stroke={O} strokeWidth={2.5 / s} strokeLinejoin="round" />
  )
}

/* ---------------- face ---------------- */

/** Big glossy black eyes with a sparkle highlight (closed happy arcs when cheering). */
function Eyes({ y, dx, r, mood }) {
  return [100 - dx, 100 + dx].map((cx) =>
    mood === 'cheer' ? (
      <path key={cx} d={`M${cx - r * 0.8} ${y + 2} Q${cx} ${y - r} ${cx + r * 0.8} ${y + 2}`} fill="none" stroke={O} strokeWidth={4.5} strokeLinecap="round" />
    ) : (
      <g key={cx}>
        <circle cx={cx} cy={y} r={r} fill={O} />
        <circle cx={cx + r * 0.3} cy={y - r * 0.35} r={r * 0.36} fill="#fff" />
        <circle cx={cx - r * 0.35} cy={y + r * 0.4} r={r * 0.15} fill="#fff" opacity={0.9} />
      </g>
    ),
  )
}

/** Tiny rounded chibi beak, top centered at (100, y). */
function Beak({ y, w = 16, c }) {
  const h = w * 0.62
  return (
    <path
      d={`M${100 - w / 2} ${y} Q100 ${y - 3} ${100 + w / 2} ${y} Q${100 + w * 0.2} ${y + h} 100 ${y + h + 1} Q${100 - w * 0.2} ${y + h} ${100 - w / 2} ${y} Z`}
      fill={c.beak} stroke={O} strokeWidth={2.6} strokeLinejoin="round"
    />
  )
}

/** Soft rosy blush with a warm gold glow. */
function Cheeks({ y, dx }) {
  return [100 - dx, 100 + dx].map((cx) => (
    <g key={cx}>
      <ellipse cx={cx} cy={y} rx={9} ry={5.5} fill="#ff8fb0" opacity={0.55} />
      <ellipse cx={cx - 1} cy={y - 1} rx={4} ry={2.2} fill="#ffd27a" opacity={0.6} />
    </g>
  ))
}

/** Three soft rounded crest feathers, base centered at (cx, y). */
function Crest({ cx = 100, y, s = 1, rot = 0, c, glow = false }) {
  const tear = 'M0 4 C-6 -4 -5 -18 0 -26 C5 -18 6 -4 0 4 Z'
  const feathers = [[-11, 3, -28, 0.8], [11, 3, 28, 0.8], [0, 0, 0, 1]]
  return (
    <g transform={`translate(${cx} ${y}) rotate(${rot}) scale(${s})`}>
      {glow && feathers.map(([x, yy, r, k], i) => (
        <path key={`g${i}`} d={tear} transform={`translate(${x} ${yy}) rotate(${r}) scale(${k})`} fill="none" stroke={c.accent} strokeWidth={10 / s} opacity={0.35} />
      ))}
      {feathers.map(([x, yy, r, k], i) => (
        <path key={i} d={tear} transform={`translate(${x} ${yy}) rotate(${r}) scale(${k})`} fill={c.accent} stroke={O} strokeWidth={3 / s} strokeLinejoin="round" />
      ))}
    </g>
  )
}

/** Little rounded foot. */
function Foot({ x, y, c }) {
  return (
    <path
      d={`M${x - 12} ${y} Q${x - 12} ${y - 7} ${x} ${y - 7} Q${x + 12} ${y - 7} ${x + 12} ${y} Q${x + 8} ${y + 5} ${x + 4} ${y + 2} Q${x} ${y + 6} ${x - 4} ${y + 2} Q${x - 8} ${y + 5} ${x - 12} ${y} Z`}
      fill={c.beak} stroke={O} strokeWidth={3} strokeLinejoin="round"
    />
  )
}

/* ---------------- stages ---------------- */

// Where gear sits on each stage (scaled to the round chibi bodies).
const ANCHOR = {
  hatchling: { top: 58, eyeY: 93, dx: 16, hw: 44, neckY: 128, neckW: 48 },
  fledgling: { top: 44, eyeY: 94, dx: 20, hw: 55, neckY: 128, neckW: 50 },
  stormbird: { top: 38, eyeY: 88, dx: 21, hw: 59, neckY: 124, neckW: 55 },
}

// Body outlines, shared by the body fill/outline and the outfit clip (so garments sit flush with the edge).
const SHELL = 'M40 128 L54 116 L66 128 L80 115 L93 128 L107 115 L120 128 L134 115 L146 128 L160 117 C164 160 136 186 100 186 C64 186 36 160 40 128 Z'
const BODY = {
  fledgling: 'M100 42 C146 42 158 84 156 120 C154 160 132 184 100 184 C68 184 46 160 44 120 C42 84 54 42 100 42 Z',
  stormbird: 'M100 36 C150 36 162 80 160 120 C158 164 134 188 100 188 C66 188 42 164 40 120 C38 80 50 36 100 36 Z',
}

// Garment geometry per stage: neckline dip, strap tops/x-ranges, armhole height at the body edge, emblem spot.
const GARMENT = {
  fledgling: { neck: 130, strapTop: 117, strapL: [73, 86], strapR: [114, 127], arm: 148, emblemY: 162, emblem: 26 },
  stormbird: { neck: 126, strapTop: 113, strapL: [71, 85], strapR: [115, 129], arm: 144, emblemY: 162, emblem: 30 },
}

const HOODIE = { main: '#e8414f', dark: '#b82a3a', light: '#ff6b78' }

/** Gold gear emblem (Engineering). */
function Gear({ x, y, r }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      {Array.from({ length: 8 }, (_, i) => (
        <rect key={i} x={-r * 0.22} y={-r * 1.32} width={r * 0.44} height={r * 0.6} rx={r * 0.1} fill="#ffcb3d" stroke={O} strokeWidth={1.6} transform={`rotate(${i * 45})`} />
      ))}
      <circle r={r} fill="#ffcb3d" stroke={O} strokeWidth={2} />
      <circle r={r * 0.42} fill={HOODIE.main} stroke={O} strokeWidth={1.6} />
    </g>
  )
}

/** Chunky blue "1" with a gold outline. */
function JerseyNumber({ x, y, size }) {
  return (
    <text x={x} y={y} textAnchor="middle" fontFamily="Lilita One, sans-serif" fontSize={size}
      fill="#2f5fd0" stroke="#ffcb3d" strokeWidth={size * 0.12} paintOrder="stroke" strokeLinejoin="round">1</text>
  )
}

/** Tank top / hoodie covering the whole torso, clipped to the body outline. */
function Garment({ kind, stage, clipId }) {
  const g = GARMENT[stage]
  const [l1, l2] = g.strapL
  const [r1, r2] = g.strapR
  if (kind === 'jersey') {
    // armhole → strap → neckline scoop → strap → armhole
    const edge = `M20 ${g.arm} Q${l1 - 12} ${g.arm} ${l1} ${g.strapTop + 12} L${l1 + 1} ${g.strapTop} L${l2} ${g.strapTop} Q${l2 + 4} ${g.neck - 2} 100 ${g.neck} Q${r1 - 4} ${g.neck - 2} ${r1} ${g.strapTop} L${r2 - 1} ${g.strapTop} L${r2} ${g.strapTop + 12} Q${r2 + 12} ${g.arm} 180 ${g.arm}`
    return (
      <g clipPath={`url(#${clipId})`}>
        <path d={`${edge} L180 210 L20 210 Z`} fill="#ffffff" />
        {/* royal blue + gold trim around collar and armholes */}
        <path d={edge} fill="none" stroke="#2f5fd0" strokeWidth={6} strokeLinejoin="round" />
        <path d={edge} fill="none" stroke="#ffcb3d" strokeWidth={2} strokeLinejoin="round" transform="translate(0 3.5)" />
        <path d={`M20 ${g.emblemY + 18} L180 ${g.emblemY + 18}`} stroke="#2f5fd0" strokeWidth={4} opacity={0.9} />
        <JerseyNumber x={100} y={g.emblemY + 8} size={g.emblem} />
      </g>
    )
  }
  if (kind === 'hoodie') {
    const top = g.neck - 8
    return (
      <>
        <g clipPath={`url(#${clipId})`}>
          <path d={`M20 ${top + 6} Q100 ${top - 8} 180 ${top + 6} L180 210 L20 210 Z`} fill={HOODIE.main} />
          {/* kangaroo pocket + side shading */}
          <path d={`M74 ${g.emblemY + 6} Q100 ${g.emblemY + 1} 126 ${g.emblemY + 6} L132 ${g.emblemY + 26} Q100 ${g.emblemY + 30} 68 ${g.emblemY + 26} Z`} fill={HOODIE.dark} stroke={O} strokeWidth={2.4} strokeLinejoin="round" />
          <path d={`M30 ${top + 20} Q44 ${top + 50} 40 ${top + 70} M170 ${top + 20} Q156 ${top + 50} 160 ${top + 70}`} fill="none" stroke={HOODIE.dark} strokeWidth={6} opacity={0.6} />
          <Gear x={100} y={g.emblemY - 10} r={6} />
        </g>
        {/* cozy hood collar wrapping the neck */}
        <path d={`M${l1 - 22} ${top + 2} Q100 ${top + 26} ${r2 + 22} ${top + 2}`} fill="none" stroke={O} strokeWidth={15} strokeLinecap="round" />
        <path d={`M${l1 - 22} ${top + 2} Q100 ${top + 26} ${r2 + 22} ${top + 2}`} fill="none" stroke={HOODIE.main} strokeWidth={9} strokeLinecap="round" />
        <path d={`M${l1 - 18} ${top} Q100 ${top + 21} ${r2 + 18} ${top}`} fill="none" stroke={HOODIE.light} strokeWidth={2.5} strokeLinecap="round" />
        {/* drawstrings */}
        {[-7, 7].map((dx) => (
          <g key={dx}>
            <path d={`M${100 + dx} ${top + 15} L${100 + dx * 1.15} ${top + 32}`} stroke="#fff" strokeWidth={2.4} strokeLinecap="round" />
            <circle cx={100 + dx * 1.15} cy={top + 34} r={2.2} fill="#fff" stroke={O} strokeWidth={1.2} />
          </g>
        ))}
      </>
    )
  }
  return null
}

/** Egg stage: the outfit becomes a cozy band around the lower shell. */
function ShellBand({ kind, clipId }) {
  if (kind === 'jersey') {
    return (
      <g clipPath={`url(#${clipId})`}>
        <rect x={20} y={140} width={160} height={30} fill="#ffffff" />
        {[140, 167].map((y) => <rect key={y} x={20} y={y} width={160} height={4} fill="#2f5fd0" />)}
        {[145, 165].map((y) => <rect key={y} x={20} y={y} width={160} height={1.6} fill="#ffcb3d" />)}
        <JerseyNumber x={100} y={164} size={22} />
      </g>
    )
  }
  if (kind === 'hoodie') {
    return (
      <g clipPath={`url(#${clipId})`}>
        <rect x={20} y={138} width={160} height={34} fill={HOODIE.main} />
        {Array.from({ length: 22 }, (_, i) => <path key={i} d={`M${24 + i * 7.5} 140 L${24 + i * 7.5} 170`} stroke={HOODIE.dark} strokeWidth={2} opacity={0.55} />)}
        <rect x={20} y={138} width={160} height={4} fill={HOODIE.dark} />
        <rect x={20} y={168} width={160} height={4} fill={HOODIE.dark} />
        <Gear x={100} y={155} r={6} />
      </g>
    )
  }
  return null
}

function Hatchling({ c, mood, outfit, clipId }) {
  const up = mood === 'cheer'
  const dressed = outfit !== 'none'
  return (
    <>
      <defs><clipPath id={clipId}><path d={SHELL} /></clipPath></defs>
      {/* chick peeking out, crest escaping from under the shell */}
      <Crest cx={130} y={68} s={0.85} rot={34} c={c} />
      <circle cx={100} cy={100} r={44} fill={c.body} stroke={O} strokeWidth={SW} />
      <path d="M70 84 Q76 70 90 66" fill="none" stroke="#fff" strokeWidth={4} strokeLinecap="round" opacity={0.45} />
      <Eyes y={93} dx={16} r={9.5} mood={mood} />
      <Beak y={104} w={14} c={c} />
      <Cheeks y={107} dx={30} />
      {/* lower shell (+ cozy outfit band) */}
      <path d={SHELL} fill={c.dark} />
      {!dressed && <path d="M48 152 L62 142 L76 154 L90 142 L100 152 L112 142 L126 154 L140 142 L152 152" fill="none" stroke={c.accent} strokeWidth={5.5} strokeLinejoin="round" strokeLinecap="round" />}
      <ShellBand kind={outfit} clipId={clipId} />
      <path d={SHELL} fill="none" stroke={O} strokeWidth={SW} strokeLinejoin="round" />
      {/* lifted top shell */}
      <g transform={`translate(-4 ${up ? -18 : -10}) rotate(${up ? -24 : -16} 100 60)`}>
        <path
          d="M54 72 L66 82 L78 70 L90 82 L102 70 L114 82 L126 70 L140 80 C142 46 124 24 98 26 C72 28 52 46 54 72 Z"
          fill={c.dark} stroke={O} strokeWidth={SW} strokeLinejoin="round"
        />
        <path d="M78 46 Q86 38 96 38" fill="none" stroke="#fff" strokeWidth={4} strokeLinecap="round" opacity={0.5} />
        <Bolt x={106} y={38} s={0.6} fill={c.accent} />
      </g>
    </>
  )
}

/** Soft rounded side wing (left; mirror for right). With the hoodie it becomes a cozy sleeve. */
function SoftWing({ c, up, sleeve }) {
  return (
    <g transform={up ? 'rotate(48 52 114)' : undefined}>
      <path d="M52 110 C32 116 24 144 36 164 C44 158 52 152 57 142 C60 130 58 116 52 110 Z" fill={sleeve ? HOODIE.main : c.dark} stroke={O} strokeWidth={SW} strokeLinejoin="round" />
      {sleeve
        ? <path d="M33 154 Q40 150 48 154" fill="none" stroke={HOODIE.dark} strokeWidth={5} strokeLinecap="round" />
        : <path d="M45 124 C38 134 36 146 39 156" fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round" opacity={0.35} />}
    </g>
  )
}

function Fledgling({ c, mood, outfit, clipId }) {
  const up = mood === 'cheer'
  const dressed = outfit !== 'none'
  const wings = (
    <>
      <SoftWing c={c} up={up} sleeve={outfit === 'hoodie'} />
      <g transform="translate(200 0) scale(-1 1)"><SoftWing c={c} up={up} sleeve={outfit === 'hoodie'} /></g>
    </>
  )
  return (
    <>
      <defs><clipPath id={clipId}><path d={BODY.fledgling} /></clipPath></defs>
      <Foot x={84} y={186} c={c} />
      <Foot x={116} y={186} c={c} />
      <Crest y={46} s={0.95} c={c} />
      {!dressed && wings}
      {/* one round chibi body */}
      <path d={BODY.fledgling} fill={c.body} />
      <ellipse cx={100} cy={152} rx={34} ry={27} fill={c.belly} />
      <path d="M66 74 Q74 58 90 54" fill="none" stroke="#fff" strokeWidth={5} strokeLinecap="round" opacity={0.4} />
      <Garment kind={outfit} stage="fledgling" clipId={clipId} />
      <path d={BODY.fledgling} fill="none" stroke={O} strokeWidth={SW} />
      {/* dressed: the garment tucks under the wings */}
      {dressed && wings}
      <Eyes y={94} dx={20} r={11.5} mood={mood} />
      <Beak y={106} w={17} c={c} />
      <Cheeks y={110} dx={37} />
    </>
  )
}

/** Big rounded wing with soft scalloped feathers (left; mirror for right). */
function BigWing({ c, up }) {
  return (
    <g transform={up ? 'rotate(-16 60 120)' : undefined}>
      <path
        d="M62 128 C40 124 20 104 12 74 Q21 69 28 76 Q28 66 38 69 Q39 81 47 85 Q45 96 55 99 Q55 111 62 113 Z"
        fill={c.dark} stroke={O} strokeWidth={SW} strokeLinejoin="round"
      />
      <path d="M54 110 C42 102 32 90 26 78" fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round" opacity={0.35} />
    </g>
  )
}

function Stormbird({ c, mood, outfit, clipId }) {
  const up = mood === 'cheer'
  return (
    <>
      <defs><clipPath id={clipId}><path d={BODY.stormbird} /></clipPath></defs>
      {/* lightning aura */}
      <g className="animate-pulse">
        <Bolt x={20} y={130} s={0.75} fill={c.accent} />
        <Bolt x={178} y={130} s={0.75} fill={c.accent} />
        <Bolt x={30} y={12} s={0.5} fill={c.accent} />
        <Bolt x={168} y={8} s={0.5} fill={c.accent} />
      </g>
      <BigWing c={c} up={up} />
      <g transform="translate(200 0) scale(-1 1)"><BigWing c={c} up={up} /></g>
      <Foot x={84} y={190} c={c} />
      <Foot x={116} y={190} c={c} />
      <Crest y={40} s={1.15} c={c} glow />
      <path d={BODY.stormbird} fill={c.body} />
      <ellipse cx={100} cy={152} rx={38} ry={30} fill={c.belly} />
      {outfit === 'none' && <path d="M90 134 L100 142 L110 134" fill="none" stroke={c.accent} strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round" />}
      <path d="M64 70 Q72 52 90 48" fill="none" stroke="#fff" strokeWidth={5} strokeLinecap="round" opacity={0.4} />
      <Garment kind={outfit} stage="stormbird" clipId={clipId} />
      <path d={BODY.stormbird} fill="none" stroke={O} strokeWidth={SW} />
      <Eyes y={88} dx={21} r={12} mood={mood} />
      <Beak y={101} w={18} c={c} />
      <Cheeks y={105} dx={39} />
    </>
  )
}

/* ---------------- accessories (head / neck) ---------------- */

function Accessory({ kind, stage }) {
  const a = ANCHOR[stage]
  const cx = 100
  const drop = (x, y) => <path key={`${x}-${y}`} d={`M${x} ${y} q4 6 0 9 q-4 -3 0 -9 Z`} fill="#9fdcff" stroke={O} strokeWidth={1.8} />
  const scarf = (main, stripe) => (
    <g>
      <rect x={cx + a.neckW * 0.35} y={a.neckY} width={14} height={30} rx={6} fill={main} stroke={O} strokeWidth={3.2} transform={`rotate(-12 ${cx + a.neckW * 0.35} ${a.neckY})`} />
      <rect x={cx - a.neckW} y={a.neckY - 8} width={a.neckW * 2} height={16} rx={8} fill={main} stroke={O} strokeWidth={3.2} />
      {[-0.5, 0, 0.5].map((f) => <path key={f} d={`M${cx + f * a.neckW} ${a.neckY - 6} L${cx + f * a.neckW + 5} ${a.neckY + 6}`} stroke={stripe} strokeWidth={3.5} />)}
    </g>
  )
  switch (kind) {
    case 'headphones':
      return (
        <g>
          <path d={`M${cx - a.hw + 2} ${a.eyeY} C${cx - a.hw} ${a.top - 30} ${cx + a.hw} ${a.top - 30} ${cx + a.hw - 2} ${a.eyeY}`} fill="none" stroke={O} strokeWidth={9} strokeLinecap="round" />
          <path d={`M${cx - a.hw + 2} ${a.eyeY} C${cx - a.hw} ${a.top - 30} ${cx + a.hw} ${a.top - 30} ${cx + a.hw - 2} ${a.eyeY}`} fill="none" stroke="#ff6fa5" strokeWidth={4.5} strokeLinecap="round" />
          {[cx - a.hw - 6, cx + a.hw - 10].map((x) => <rect key={x} x={x} y={a.eyeY - 13} width={16} height={26} rx={8} fill="#ff6fa5" stroke={O} strokeWidth={3.2} />)}
        </g>
      )
    case 'sprout':
      return (
        <g>
          <path d={`M${cx + 18} ${a.top + 10} Q${cx + 15} ${a.top - 6} ${cx + 20} ${a.top - 18}`} fill="none" stroke={O} strokeWidth={6} strokeLinecap="round" />
          <path d={`M${cx + 18} ${a.top + 10} Q${cx + 15} ${a.top - 6} ${cx + 20} ${a.top - 18}`} fill="none" stroke="#3ccf7a" strokeWidth={2.6} strokeLinecap="round" />
          <ellipse cx={cx + 8} cy={a.top - 20} rx={11} ry={6} fill="#6ee69a" stroke={O} strokeWidth={3} transform={`rotate(-28 ${cx + 8} ${a.top - 20})`} />
          <ellipse cx={cx + 31} cy={a.top - 22} rx={11} ry={6} fill="#6ee69a" stroke={O} strokeWidth={3} transform={`rotate(28 ${cx + 31} ${a.top - 22})`} />
        </g>
      )
    case 'glasses':
      return (
        <g>
          {[cx - a.dx, cx + a.dx].map((x) => <circle key={x} cx={x} cy={a.eyeY} r={15} fill="#fff" fillOpacity={0.18} stroke={O} strokeWidth={3.2} />)}
          <path d={`M${cx - a.dx + 15} ${a.eyeY - 1} Q${cx} ${a.eyeY - 6} ${cx + a.dx - 15} ${a.eyeY - 1}`} fill="none" stroke={O} strokeWidth={3.2} />
        </g>
      )
    case 'scarf':
      return scarf('#ff5c7a', '#ffffff')
    case 'gradscarf':
      return scarf('#3f6fd8', '#ffcb3d')
    case 'wizard':
      return (
        <g>
          <path d={`M${cx - 32} ${a.top + 6} L${cx + 10} ${a.top - 52} L${cx + 32} ${a.top + 6} Z`} fill="#8a5cff" stroke={O} strokeWidth={3.5} strokeLinejoin="round" />
          <ellipse cx={cx} cy={a.top + 6} rx={42} ry={8} fill="#8a5cff" stroke={O} strokeWidth={3.5} />
          <path d={sparkPath(cx + 4, a.top - 20, 7)} fill="#ffcb3d" />
        </g>
      )
    case 'bow':
      return (
        <g transform={`translate(${cx + 30} ${a.top + 10}) rotate(18)`}>
          <path d="M0 0 Q-10 -14 -18 -9 Q-21 0 -18 9 Q-10 14 0 0 Z M0 0 Q10 -14 18 -9 Q21 0 18 9 Q10 14 0 0 Z" fill="#ff6fa5" stroke={O} strokeWidth={3} strokeLinejoin="round" />
          <circle r={5} fill="#ff9cc2" stroke={O} strokeWidth={2.6} />
        </g>
      )
    case 'crown':
      return (
        <g>
          <path d={`M${cx - 26} ${a.top + 6} L${cx - 29} ${a.top - 18} L${cx - 13} ${a.top - 6} L${cx} ${a.top - 26} L${cx + 13} ${a.top - 6} L${cx + 29} ${a.top - 18} L${cx + 26} ${a.top + 6} Z`} fill="#ffcb3d" stroke={O} strokeWidth={3.5} strokeLinejoin="round" />
          <circle cx={cx} cy={a.top - 4} r={4} fill="#ff5c9a" stroke={O} strokeWidth={2} />
        </g>
      )
    case 'rainhat':
      // Vancouver sou'wester
      return (
        <g>
          <path d={`M${cx - 54} ${a.top + 12} Q${cx} ${a.top - 6} ${cx + 54} ${a.top + 12} Q${cx + 50} ${a.top + 24} ${cx + 34} ${a.top + 20} L${cx - 34} ${a.top + 20} Q${cx - 50} ${a.top + 24} ${cx - 54} ${a.top + 12} Z`} fill="#ffd84d" stroke={O} strokeWidth={3.5} strokeLinejoin="round" />
          <path d={`M${cx - 32} ${a.top + 10} Q${cx - 30} ${a.top - 26} ${cx} ${a.top - 28} Q${cx + 30} ${a.top - 26} ${cx + 32} ${a.top + 10} Z`} fill="#ffd84d" stroke={O} strokeWidth={3.5} strokeLinejoin="round" />
          <path d={`M${cx - 30} ${a.top + 2} Q${cx} ${a.top - 6} ${cx + 30} ${a.top + 2}`} fill="none" stroke="#e8b400" strokeWidth={3.5} />
          {drop(cx - 62, a.top + 34)}{drop(cx + 60, a.top + 42)}
        </g>
      )
    case 'umbrella': {
      // Raincouver umbrella held at the side, tilted over the head
      const hx = cx + a.hw + 8
      const hy = a.eyeY + 40
      return (
        <g transform={`rotate(-16 ${hx} ${hy})`}>
          <path d={`M${hx} ${a.top - 22} L${hx} ${hy} q0 10 -9 10 q-8 0 -8 -8`} fill="none" stroke={O} strokeWidth={6} strokeLinecap="round" />
          <path d={`M${hx} ${a.top - 22} L${hx} ${hy} q0 10 -9 10 q-8 0 -8 -8`} fill="none" stroke="#e0a868" strokeWidth={2.6} strokeLinecap="round" />
          <g transform={`translate(${hx} ${a.top - 22})`}>
            <path d="M-60 8 Q0 -52 60 8 Q46 -2 30 8 Q15 -2 0 8 Q-15 -2 -30 8 Q-46 -2 -60 8 Z" fill="#3f6fd8" stroke={O} strokeWidth={3.5} strokeLinejoin="round" />
            <path d="M0 -22 Q-14 -10 -30 8 M0 -22 Q14 -10 30 8" fill="none" stroke="#ffcb3d" strokeWidth={5} />
            <circle cy={-23} r={3.5} fill="#ffcb3d" stroke={O} strokeWidth={2} />
          </g>
          {drop(cx - 58, a.top + 6)}{drop(cx - 40, a.top + 30)}{drop(cx + 70, a.top + 36)}
        </g>
      )
    }
    default:
      return null
  }
}

/* ---------------- render ---------------- */

const VIEWBOX = {
  full: '0 -36 200 236',
  hatchling: '26 10 148 148',
  fledgling: '24 20 152 152',
  stormbird: '22 10 156 156',
}

const GALAXY = {
  hatchling: [[62, 164, 2.2], [118, 170, 1.6], [142, 150, 2]],
  fledgling: [[66, 120, 2.2], [136, 116, 1.8], [72, 82, 1.5], [130, 72, 2]],
  stormbird: [[62, 116, 2], [138, 112, 1.8], [70, 74, 1.6], [132, 66, 2]],
}

/**
 * @param look  { colorway, accessory, outfit, level }
 * @param crop  'full' | 'head' (avatar icon)
 * @param mood  'happy' | 'cheer' (closed happy eyes, wings up, sparkles)
 */
export default function Character({ look, crop = 'full', mood = 'happy', className = '', label }) {
  const l = normalizeLook(look)
  const stage = stageFor(l.level)
  const c = COLORWAYS[l.colorway]
  const Body = { hatchling: Hatchling, fledgling: Fledgling, stormbird: Stormbird }[stage]
  const full = crop === 'full'
  const clipId = `tb${useId().replace(/[^a-zA-Z0-9]/g, '')}` // unique per avatar on the page

  return (
    <svg viewBox={full ? VIEWBOX.full : VIEWBOX[stage]} className={className} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      {full && <ellipse cx={100} cy={196} rx={50} ry={6.5} fill="rgb(0 0 0 / .18)" />}
      <Body c={c} mood={mood} outfit={l.outfit} clipId={clipId} />
      {l.colorway === 'galaxy' && GALAXY[stage].map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} fill="#fff" opacity={0.85} />)}
      <Accessory kind={l.accessory} stage={stage} />
      {mood === 'cheer' && full && (
        <g>
          <path d={sparkPath(28, 60, 8)} fill={c.accent} stroke={O} strokeWidth={2} />
          <path d={sparkPath(172, 74, 6.5)} fill="#fff" stroke={O} strokeWidth={2} />
          <path d={sparkPath(164, 30, 5)} fill={c.accent} stroke={O} strokeWidth={1.8} />
        </g>
      )}
    </svg>
  )
}
