// The player's character, drawn in SVG from a "look": { color, face, hat, item }.
// Shape follows the WHIMSEY wireframe: tall rounded block body, big eyes, held gear.

const O = '#140c2c' // outline
const SW = 5 // stroke width

const star = (cx, cy, r, inner = r * 0.45) =>
  Array.from({ length: 10 }, (_, i) => {
    const a = (Math.PI / 5) * i - Math.PI / 2
    const rr = i % 2 ? inner : r
    return `${cx + rr * Math.cos(a)},${cy + rr * Math.sin(a)}`
  }).join(' ')

function Face({ face }) {
  const eye = (cx) => (
    <g key={cx}>
      <ellipse cx={cx} cy={82} rx={11} ry={13} fill="#fff" stroke={O} strokeWidth={4} />
      <circle cx={cx + 2} cy={84} r={5.5} fill={O} />
      <circle cx={cx + 4} cy={81} r={1.8} fill="#fff" />
    </g>
  )
  switch (face) {
    case 'happy':
      return (
        <g>
          <path d="M74 86 Q84 72 94 86 M106 86 Q116 72 126 86" fill="none" stroke={O} strokeWidth={SW} strokeLinecap="round" />
          <circle cx={72} cy={100} r={6} fill="#ff7aa8" opacity={0.6} />
          <circle cx={128} cy={100} r={6} fill="#ff7aa8" opacity={0.6} />
          <path d="M82 102 Q100 128 118 102 Z" fill="#ff5a8a" stroke={O} strokeWidth={4} strokeLinejoin="round" />
        </g>
      )
    case 'determined':
      return (
        <g>
          {[84, 116].map(eye)}
          <path d="M72 66 L95 73 M128 66 L105 73" stroke={O} strokeWidth={SW + 1} strokeLinecap="round" />
          <path d="M86 111 Q100 106 114 111" fill="none" stroke={O} strokeWidth={SW} strokeLinecap="round" />
        </g>
      )
    case 'sleepy':
      return (
        <g>
          <path d="M74 84 Q84 92 94 84 M106 84 Q116 92 126 84" fill="none" stroke={O} strokeWidth={SW} strokeLinecap="round" />
          <ellipse cx={100} cy={112} rx={5} ry={6} fill="#ff5a8a" stroke={O} strokeWidth={3.5} />
          <text x={132} y={66} fontFamily="Lilita One, sans-serif" fontSize={16} fill={O}>z</text>
        </g>
      )
    case 'star':
      return (
        <g>
          <polygon points={star(84, 82, 14)} fill="#ffc928" stroke={O} strokeWidth={3.5} strokeLinejoin="round" />
          <polygon points={star(116, 82, 14)} fill="#ffc928" stroke={O} strokeWidth={3.5} strokeLinejoin="round" />
          <path d="M80 104 Q100 126 120 104 Z" fill="#ff5a8a" stroke={O} strokeWidth={4} strokeLinejoin="round" />
        </g>
      )
    default: // classic
      return (
        <g>
          {[84, 116].map(eye)}
          <path d="M84 106 Q100 120 116 106" fill="none" stroke={O} strokeWidth={SW} strokeLinecap="round" />
        </g>
      )
  }
}

function Hat({ hat }) {
  const p = { stroke: O, strokeWidth: SW, strokeLinejoin: 'round' }
  switch (hat) {
    case 'cap':
      return (
        <g>
          <path d="M60 52 Q60 16 100 16 Q140 16 140 52 Z" fill="#ff3d8b" {...p} />
          <rect x={118} y={44} width={46} height={12} rx={6} fill="#ff3d8b" {...p} />
          <circle cx={100} cy={16} r={5} fill="#ffc928" {...p} strokeWidth={3} />
        </g>
      )
    case 'headband':
      return (
        <g>
          <path d="M144 54 L166 42 L160 60 L168 74 Z" fill="#ff3d8b" {...p} strokeWidth={4} />
          <rect x={55} y={48} width={90} height={14} rx={4} fill="#ff3d8b" {...p} />
          <polygon points={star(100, 55, 6)} fill="#fff" />
        </g>
      )
    case 'party':
      return (
        <g>
          <path d="M78 46 L100 -14 L122 46 Z" fill="#2fb4ff" {...p} />
          <path d="M86 26 L114 26 M93 8 L107 8" stroke="#fff" strokeWidth={5} />
          <circle cx={100} cy={-16} r={8} fill="#ffc928" {...p} strokeWidth={4} />
        </g>
      )
    case 'wizard':
      return (
        <g>
          <path d="M66 44 L104 -22 L134 44 Z" fill="#8b5cff" {...p} />
          <ellipse cx={100} cy={46} rx={52} ry={9} fill="#8b5cff" {...p} />
          <polygon points={star(102, 18, 9)} fill="#ffc928" />
        </g>
      )
    case 'crown':
      return (
        <g>
          <path d="M64 46 L62 10 L82 28 L100 2 L118 28 L138 10 L136 46 Z" fill="#ffc928" {...p} />
          <circle cx={100} cy={34} r={6} fill="#ff3d8b" stroke={O} strokeWidth={3} />
          <circle cx={78} cy={36} r={4} fill="#2fb4ff" stroke={O} strokeWidth={3} />
          <circle cx={122} cy={36} r={4} fill="#3dff8f" stroke={O} strokeWidth={3} />
        </g>
      )
    default:
      return null
  }
}

/** Gear drawn with its grip at (0,0), extending upward. */
export function Gear({ item }) {
  const p = { stroke: O, strokeWidth: 4.5, strokeLinejoin: 'round', strokeLinecap: 'round' }
  switch (item) {
    case 'bat':
      return (
        <g transform="rotate(18)">
          <path d="M-4 4 L-3 -26 Q-11 -64 -7 -84 Q0 -92 7 -84 Q11 -64 3 -26 L4 4 Z" fill="#d79a5b" {...p} />
          <path d="M-5 -14 L5 -14 M-5 -6 L5 -6" stroke={O} strokeWidth={3} />
        </g>
      )
    case 'bottle':
      return (
        <g>
          <rect x={-12} y={-50} width={24} height={50} rx={7} fill="#2fb4ff" {...p} />
          <rect x={-7} y={-60} width={14} height={11} rx={3} fill="#ff3d8b" {...p} />
          <path d="M-6 -36 L-6 -14" stroke="#fff" strokeWidth={4} strokeLinecap="round" opacity={0.7} />
        </g>
      )
    case 'book':
      return (
        <g transform="rotate(-8)">
          <rect x={-18} y={-44} width={36} height={44} rx={4} fill="#ff3d8b" {...p} />
          <path d="M-10 -44 L-10 0" stroke={O} strokeWidth={4} />
          <polygon points={star(4, -22, 8)} fill="#ffc928" />
        </g>
      )
    case 'brush':
      return (
        <g transform="rotate(14)">
          <path d="M0 4 L0 -44" stroke={O} strokeWidth={10} strokeLinecap="round" />
          <path d="M0 4 L0 -44" stroke="#d79a5b" strokeWidth={5} strokeLinecap="round" />
          <rect x={-6} y={-56} width={12} height={12} rx={2} fill="#c9c9d9" {...p} strokeWidth={3.5} />
          <path d="M-6 -56 Q0 -84 6 -56 Z" fill="#3dff8f" {...p} strokeWidth={3.5} />
        </g>
      )
    case 'wand':
      return (
        <g transform="rotate(10)">
          <path d="M0 4 L0 -56" stroke={O} strokeWidth={10} strokeLinecap="round" />
          <path d="M0 4 L0 -56" stroke="#8b5cff" strokeWidth={5} strokeLinecap="round" />
          <polygon points={star(0, -68, 16)} fill="#ffc928" stroke={O} strokeWidth={4} strokeLinejoin="round" />
        </g>
      )
    case 'flag':
      return (
        <g>
          <path d="M0 6 L0 -84" stroke={O} strokeWidth={9} strokeLinecap="round" />
          <path d="M0 6 L0 -84" stroke="#e6e1ff" strokeWidth={4} strokeLinecap="round" />
          <path d="M2 -84 L46 -72 L2 -58 Z" fill="#3dff8f" {...p} />
        </g>
      )
    default:
      return null
  }
}

/**
 * @param look   { color, face, hat, item }
 * @param crop   'full' (whole body) | 'head' (avatar icon)
 */
export default function Character({ look, crop = 'full', className = '', label }) {
  const { color = '#fff1d6', face = 'classic', hat = 'none', item = 'bat' } = look ?? {}
  const full = crop === 'full'
  const viewBox = full ? '0 -30 200 290' : '30 -24 140 140'
  const limb = { stroke: O, strokeWidth: SW + 1, strokeLinecap: 'round', fill: 'none' }

  return (
    <svg viewBox={viewBox} className={className} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      {!full && <rect x={30} y={-24} width={140} height={140} fill="transparent" />}
      {full && (
        <>
          <ellipse cx={100} cy={250} rx={58} ry={9} fill="rgb(0 0 0 / .28)" />
          <path d="M84 192 L79 238 M116 192 L121 238" {...limb} />
          <ellipse cx={73} cy={241} rx={13} ry={7} fill={O} />
          <ellipse cx={127} cy={241} rx={13} ry={7} fill={O} />
          <path d="M60 120 Q40 142 38 170" {...limb} />
          <circle cx={38} cy={172} r={8} fill={color} stroke={O} strokeWidth={4} />
        </>
      )}
      <rect x={58} y={38} width={84} height={160} rx={24} fill={color} stroke={O} strokeWidth={SW + 1} />
      {/* soft highlight for a toy-like finish */}
      <path d="M70 60 Q70 46 84 46" stroke="#fff" strokeWidth={5} strokeLinecap="round" fill="none" opacity={0.6} />
      <Face face={face} />
      <Hat hat={hat} />
      {full && (
        <>
          <path d="M140 120 Q160 136 162 160" {...limb} />
          <g transform="translate(162 164)"><Gear item={item} /></g>
          <circle cx={162} cy={164} r={8} fill={color} stroke={O} strokeWidth={4} />
        </>
      )}
    </svg>
  )
}

/** Standalone gear icon for locker tiles. */
export function GearIcon({ item, className = '' }) {
  return (
    <svg viewBox="-40 -100 80 112" className={className} aria-hidden>
      <Gear item={item} />
    </svg>
  )
}
