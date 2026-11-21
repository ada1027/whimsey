// Baby Thunderbird companion (original SVG). Evolves with level:
//   Lv 1–2 Hatchling (thunder-egg) · Lv 3–4 Fledgling (chubby chick) · Lv 5+ Stormbird.
// look: { colorway, accessory, level } — older looks are normalized automatically.

import { COLORWAYS, normalizeLook, stageFor } from '../data/companion.js'

const O = '#140c2c' // outline
const SW = 5

const sparkPath = (cx, cy, s) =>
  `M${cx} ${cy - s} L${cx + s * 0.3} ${cy - s * 0.3} L${cx + s} ${cy} L${cx + s * 0.3} ${cy + s * 0.3} L${cx} ${cy + s} L${cx - s * 0.3} ${cy + s * 0.3} L${cx - s} ${cy} L${cx - s * 0.3} ${cy - s * 0.3} Z`

/** Small lightning bolt with its top at (x, y). */
function Bolt({ x, y, s = 1, fill, stroke = O }) {
  return (
    <polygon
      points="0,0 11,0 5,11 13,11 -3,31 2,16 -6,16"
      transform={`translate(${x} ${y}) scale(${s})`}
      fill={fill}
      stroke={stroke}
      strokeWidth={3 / s}
      strokeLinejoin="round"
    />
  )
}

function Eyes({ y, dx = 17, size = 9, mood }) {
  return [100 - dx, 100 + dx].map((cx) =>
    mood === 'cheer' ? (
      <path key={cx} d={`M${cx - 8} ${y + 3} Q${cx} ${y - 8} ${cx + 8} ${y + 3}`} fill="none" stroke={O} strokeWidth={5} strokeLinecap="round" />
    ) : (
      <g key={cx}>
        <ellipse cx={cx} cy={y} rx={size} ry={size * 1.2} fill={O} />
        <circle cx={cx + size * 0.35} cy={y - size * 0.45} r={size * 0.38} fill="#fff" />
        <circle cx={cx - size * 0.35} cy={y + size * 0.45} r={size * 0.18} fill="#fff" />
      </g>
    ),
  )
}

function Cheeks({ y, dx = 34, spark, accent }) {
  return [100 - dx, 100 + dx].map((cx) => (
    <g key={cx}>
      <ellipse cx={cx} cy={y} rx={8} ry={5} fill="#ff6f9f" opacity={0.45} />
      {spark && <path d={sparkPath(cx, y - 1, 6)} fill={accent} stroke={O} strokeWidth={1.8} strokeLinejoin="round" />}
    </g>
  ))
}

function Sparkles({ c }) {
  return (
    <g>
      <path d={sparkPath(34, 64, 9)} fill={c.accent} stroke={O} strokeWidth={2.5} />
      <path d={sparkPath(168, 78, 7)} fill="#fff" stroke={O} strokeWidth={2.5} />
      <path d={sparkPath(160, 38, 5)} fill={c.accent} stroke={O} strokeWidth={2} />
    </g>
  )
}

function GalaxyDots({ points }) {
  return points.map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} fill="#fff" opacity={0.85} />)
}

/* ---------------- stages ---------------- */

function Hatchling({ c, mood }) {
  return (
    <>
      {/* chick peeking out */}
      <circle cx={100} cy={100} r={44} fill={c.body} stroke={O} strokeWidth={SW} />
      <Eyes y={96} dx={16} size={8.5} mood={mood} />
      <path d="M93 107 L107 107 L100 115 Z" fill={c.beak} stroke={O} strokeWidth={3} strokeLinejoin="round" />
      <Cheeks y={108} dx={30} />
      {/* lower shell */}
      <path
        d="M40 128 L54 116 L66 128 L80 115 L93 128 L107 115 L120 128 L134 115 L146 128 L160 117 C164 160 136 186 100 186 C64 186 36 160 40 128 Z"
        fill={c.dark} stroke={O} strokeWidth={SW} strokeLinejoin="round"
      />
      <path d="M48 152 L62 142 L76 154 L90 142 L100 152 L112 142 L126 154 L140 142 L152 152" fill="none" stroke={c.accent} strokeWidth={6} strokeLinejoin="round" strokeLinecap="round" />
      {/* lightning tuft poking out */}
      <Bolt x={138} y={34} s={0.95} fill={c.accent} />
      {/* lifted top shell */}
      <g transform={`translate(-4 ${mood === 'cheer' ? -18 : -10}) rotate(${mood === 'cheer' ? -24 : -16} 100 60)`}>
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

function Fledgling({ c, mood }) {
  const up = mood === 'cheer'
  return (
    <>
      {[84, 116].map((x) => <ellipse key={x} cx={x} cy={178} rx={11} ry={6} fill={c.beak} stroke={O} strokeWidth={4} />)}
      {/* lightning feather tuft */}
      <path d="M86 70 L84 36 L96 50 L101 22 L108 50 L120 34 L116 70 Z" fill={c.accent} stroke={O} strokeWidth={4} strokeLinejoin="round" />
      {/* stubby wings */}
      <ellipse cx={46} cy={124} rx={15} ry={25} fill={c.dark} stroke={O} strokeWidth={SW} transform={`rotate(${up ? 55 : 22} 52 112)`} />
      <ellipse cx={154} cy={124} rx={15} ry={25} fill={c.dark} stroke={O} strokeWidth={SW} transform={`rotate(${up ? -55 : -22} 148 112)`} />
      <ellipse cx={100} cy={118} rx={58} ry={58} fill={c.body} stroke={O} strokeWidth={SW} />
      <ellipse cx={100} cy={142} rx={36} ry={28} fill={c.belly} />
      <path d="M66 82 Q74 70 88 68" fill="none" stroke="#fff" strokeWidth={5} strokeLinecap="round" opacity={0.45} />
      <Eyes y={100} dx={18} size={9.5} mood={mood} />
      <path d="M90 116 Q100 108 110 116 Q100 129 90 116 Z" fill={c.beak} stroke={O} strokeWidth={3.5} strokeLinejoin="round" />
      <Cheeks y={121} dx={36} spark accent={c.accent} />
    </>
  )
}

function Stormbird({ c, mood }) {
  const up = mood === 'cheer'
  const wing = (
    <g transform={up ? 'rotate(-22 58 104)' : undefined}>
      <path
        d="M60 106 C34 96 14 72 8 46 C24 56 32 56 40 52 C34 66 38 74 47 78 C42 86 46 96 60 100 Z"
        fill={c.dark} stroke={O} strokeWidth={SW} strokeLinejoin="round"
      />
      <path d="M12 52 C20 58 30 58 38 54" fill="none" stroke={c.accent} strokeWidth={4} strokeLinecap="round" />
    </g>
  )
  return (
    <>
      {/* lightning aura */}
      <g className="animate-pulse">
        <Bolt x={24} y={118} s={0.8} fill={c.accent} />
        <Bolt x={174} y={118} s={0.8} fill={c.accent} />
        <Bolt x={30} y={18} s={0.55} fill={c.accent} />
        <Bolt x={170} y={14} s={0.55} fill={c.accent} />
      </g>
      {[84, 116].map((x) => <ellipse key={x} cx={x} cy={184} rx={12} ry={6} fill={c.beak} stroke={O} strokeWidth={4} />)}
      {/* glowing crest */}
      <path d="M84 62 L72 20 L92 42 L100 6 L108 42 L128 20 L116 62 Z" fill="none" stroke={c.accent} strokeWidth={14} strokeLinejoin="round" opacity={0.35} />
      <path d="M84 62 L72 20 L92 42 L100 6 L108 42 L128 20 L116 62 Z" fill={c.accent} stroke={O} strokeWidth={4.5} strokeLinejoin="round" />
      {wing}
      <g transform="translate(200 0) scale(-1 1)">{wing}</g>
      <path d="M100 52 C140 52 156 90 154 122 C152 160 130 184 100 184 C70 184 48 160 46 122 C44 90 60 52 100 52 Z" fill={c.body} stroke={O} strokeWidth={SW} />
      <ellipse cx={100} cy={146} rx={32} ry={30} fill={c.belly} />
      <path d="M85 124 L100 136 L115 124" fill="none" stroke={c.accent} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M68 76 Q76 64 90 62" fill="none" stroke="#fff" strokeWidth={5} strokeLinecap="round" opacity={0.45} />
      <Eyes y={92} dx={16} size={9.5} mood={mood} />
      {mood !== 'cheer' && <path d="M74 76 L90 80 M126 76 L110 80" stroke={O} strokeWidth={4} strokeLinecap="round" />}
      <path d="M88 108 Q100 100 112 108 Q104 116 100 124 Q96 116 88 108 Z" fill={c.beak} stroke={O} strokeWidth={3.5} strokeLinejoin="round" />
      <Cheeks y={113} dx={36} spark accent={c.accent} />
    </>
  )
}

/* ---------------- accessories ---------------- */

// Where things sit on each stage.
const ANCHOR = {
  hatchling: { top: 30, eyeY: 96, dx: 16, hw: 46, scarfY: 124, scarfW: 50 },
  fledgling: { top: 64, eyeY: 100, dx: 18, hw: 57, scarfY: 134, scarfW: 46 },
  stormbird: { top: 58, eyeY: 92, dx: 16, hw: 52, scarfY: 128, scarfW: 44 },
}

function Accessory({ kind, stage }) {
  const a = ANCHOR[stage]
  const cx = 100
  switch (kind) {
    case 'headphones':
      return (
        <g>
          <path d={`M${cx - a.hw} ${a.eyeY} C${cx - a.hw} ${a.top - 26} ${cx + a.hw} ${a.top - 26} ${cx + a.hw} ${a.eyeY}`} fill="none" stroke={O} strokeWidth={11} strokeLinecap="round" />
          <path d={`M${cx - a.hw} ${a.eyeY} C${cx - a.hw} ${a.top - 26} ${cx + a.hw} ${a.top - 26} ${cx + a.hw} ${a.eyeY}`} fill="none" stroke="#ff5c9a" strokeWidth={5} strokeLinecap="round" />
          {[cx - a.hw - 8, cx + a.hw - 8].map((x) => <rect key={x} x={x} y={a.eyeY - 14} width={16} height={28} rx={7} fill="#ff5c9a" stroke={O} strokeWidth={4} />)}
        </g>
      )
    case 'sprout':
      return (
        <g>
          <path d={`M${cx} ${a.top + 6} Q${cx - 3} ${a.top - 10} ${cx + 2} ${a.top - 22}`} fill="none" stroke={O} strokeWidth={7} strokeLinecap="round" />
          <path d={`M${cx} ${a.top + 6} Q${cx - 3} ${a.top - 10} ${cx + 2} ${a.top - 22}`} fill="none" stroke="#3ccf7a" strokeWidth={3} strokeLinecap="round" />
          <ellipse cx={cx - 11} cy={a.top - 24} rx={12} ry={6.5} fill="#5be08f" stroke={O} strokeWidth={3.5} transform={`rotate(-28 ${cx - 11} ${a.top - 24})`} />
          <ellipse cx={cx + 13} cy={a.top - 26} rx={12} ry={6.5} fill="#5be08f" stroke={O} strokeWidth={3.5} transform={`rotate(28 ${cx + 13} ${a.top - 26})`} />
        </g>
      )
    case 'glasses':
      return (
        <g>
          {[cx - a.dx, cx + a.dx].map((x) => <circle key={x} cx={x} cy={a.eyeY} r={13} fill="#fff" fillOpacity={0.18} stroke={O} strokeWidth={4} />)}
          <path d={`M${cx - a.dx + 13} ${a.eyeY} Q${cx} ${a.eyeY - 6} ${cx + a.dx - 13} ${a.eyeY}`} fill="none" stroke={O} strokeWidth={4} />
        </g>
      )
    case 'scarf':
      return (
        <g>
          <rect x={cx + a.scarfW * 0.35} y={a.scarfY} width={15} height={34} rx={6} fill="#ff4d6d" stroke={O} strokeWidth={4} transform={`rotate(-12 ${cx + a.scarfW * 0.35} ${a.scarfY})`} />
          <rect x={cx - a.scarfW} y={a.scarfY - 9} width={a.scarfW * 2} height={18} rx={9} fill="#ff4d6d" stroke={O} strokeWidth={4} />
          {[-0.45, 0, 0.45].map((f) => <path key={f} d={`M${cx + f * a.scarfW} ${a.scarfY - 7} L${cx + f * a.scarfW + 5} ${a.scarfY + 7}`} stroke="#fff" strokeWidth={3} opacity={0.75} />)}
        </g>
      )
    case 'wizard':
      return (
        <g>
          <path d={`M${cx - 32} ${a.top + 4} L${cx + 10} ${a.top - 58} L${cx + 32} ${a.top + 4} Z`} fill="#7c4dff" stroke={O} strokeWidth={4.5} strokeLinejoin="round" />
          <ellipse cx={cx} cy={a.top + 4} rx={42} ry={8} fill="#7c4dff" stroke={O} strokeWidth={4.5} />
          <path d={sparkPath(cx + 4, a.top - 22, 7)} fill="#ffc928" />
        </g>
      )
    case 'bow':
      return (
        <g transform={`translate(${cx + 24} ${a.top + 4}) rotate(18)`}>
          <path d="M0 0 L-18 -11 L-18 11 Z M0 0 L18 -11 L18 11 Z" fill="#ff5c9a" stroke={O} strokeWidth={4} strokeLinejoin="round" />
          <circle r={5.5} fill="#ff86b4" stroke={O} strokeWidth={3.5} />
        </g>
      )
    case 'crown':
      return (
        <g>
          <path d={`M${cx - 26} ${a.top + 4} L${cx - 29} ${a.top - 22} L${cx - 13} ${a.top - 8} L${cx} ${a.top - 30} L${cx + 13} ${a.top - 8} L${cx + 29} ${a.top - 22} L${cx + 26} ${a.top + 4} Z`} fill="#ffc928" stroke={O} strokeWidth={4.5} strokeLinejoin="round" />
          <circle cx={cx} cy={a.top - 6} r={4.5} fill="#ff3d8b" stroke={O} strokeWidth={2.5} />
        </g>
      )
    default:
      return null
  }
}

// full leaves headroom for tall hats; head crops frame the face for avatars
const VIEWBOX = {
  full: '0 -24 200 224',
  hatchling: '26 4 148 148',
  fledgling: '26 12 148 148',
  stormbird: '24 -2 152 152',
}

const GALAXY = {
  hatchling: [[62, 160, 2.2], [118, 168, 1.6], [140, 150, 2]],
  fledgling: [[64, 96, 2.2], [138, 92, 1.8], [56, 132, 1.5], [146, 136, 2]],
  stormbird: [[66, 100, 2], [136, 96, 1.8], [60, 150, 1.6], [142, 152, 2]],
}

/**
 * @param look  { colorway, accessory, level }
 * @param crop  'full' | 'head' (avatar icon)
 * @param mood  'happy' | 'cheer' (closed happy eyes, wings up, sparkles)
 */
export default function Character({ look, crop = 'full', mood = 'happy', className = '', label }) {
  const l = normalizeLook(look)
  const stage = stageFor(l.level)
  const c = COLORWAYS[l.colorway]
  const Body = { hatchling: Hatchling, fledgling: Fledgling, stormbird: Stormbird }[stage]
  const full = crop === 'full'

  return (
    <svg
      viewBox={full ? VIEWBOX.full : VIEWBOX[stage]}
      className={className}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {full && <ellipse cx={100} cy={192} rx={52} ry={7} fill="rgb(0 0 0 / .25)" />}
      <Body c={c} mood={mood} />
      {l.colorway === 'galaxy' && <GalaxyDots points={GALAXY[stage]} />}
      <Accessory kind={l.accessory} stage={stage} />
      {mood === 'cheer' && full && <Sparkles c={c} />}
    </svg>
  )
}
