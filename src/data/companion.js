// Baby Thunderbird companion: evolution stages, colorways, accessories.

/** Lv 1–2 Hatchling · Lv 3–4 Fledgling · Lv 5+ Stormbird */
export const STAGES = {
  hatchling: { name: 'Hatchling', from: 1 },
  fledgling: { name: 'Fledgling', from: 3 },
  stormbird: { name: 'Stormbird', from: 5 },
}
export const stageFor = (level = 1) => (level >= 5 ? 'stormbird' : level >= 3 ? 'fledgling' : 'hatchling')

/** body = main feathers, dark = wings/shell, belly = chest feathers, accent = crest tips/lightning, beak = beak + talons */
export const COLORWAYS = {
  classic: { name: 'UBC Blue & Gold', body: '#5b8def', dark: '#3f6fd8', belly: '#ffffff', accent: '#ffcb3d', beak: '#ffc23a' },
  sky: { name: 'Pastel Sky', body: '#8fd0ff', dark: '#5aa9e6', belly: '#ffffff', accent: '#ffe066', beak: '#ffb84d' },
  sakura: { name: 'Sakura Pink', body: '#ffb3d1', dark: '#f287b3', belly: '#fff2f8', accent: '#ffd166', beak: '#ff9f6b' },
  mint: { name: 'Mint Sprout', body: '#86ebc0', dark: '#4fc99a', belly: '#f2fff8', accent: '#ffd23f', beak: '#ffb347' },
  sunset: { name: 'Sunset', body: '#ff9466', dark: '#e8673f', belly: '#ffe7cc', accent: '#ffd23f', beak: '#ffc04d' },
  galaxy: { name: 'Galaxy', body: '#4b3aa8', dark: '#2e2378', belly: '#d9d2ff', accent: '#7df9ff', beak: '#ffc928' },
  grape: { name: 'Grape Soda', body: '#b28cff', dark: '#8a62e8', belly: '#f4edff', accent: '#ff8fd0', beak: '#ffc04d' },
  storm: { name: 'Storm Gold', body: '#ffcf3f', dark: '#e0a400', belly: '#fff6d6', accent: '#2c3f8f', beak: '#ff9f40' },
}

export const ACCESSORIES = {
  none: 'No accessory',
  headphones: 'Tiny Headphones',
  sprout: 'Sprout Leaf',
  glasses: 'Round Glasses',
  scarf: 'Cozy Scarf',
  wizard: 'Wizard Hat',
  bow: 'Ribbon Bow',
  crown: 'Storm Crown',
  gradscarf: 'Grad Scarf',
  umbrella: 'Raincouver Umbrella',
  rainhat: 'Rain Hat',
}

/** Chest gear, worn together with an accessory. */
export const OUTFITS = {
  none: 'No outfit',
  jersey: 'UBC #1 Jersey',
  hoodie: 'Engineering Hoodie',
}

export const DEFAULT_COMPANION_NAME = 'Sparky'

const FALLBACK_NAMES = ['Sparky', 'Zippy', 'Bolt Jr.', 'Fluff', 'Thunder', 'Biscuit', 'Peep', 'Static']
/** A stable fallback name for companions nobody has named yet. */
export function fallbackCompanionName(seed = '') {
  let h = 0
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return FALLBACK_NAMES[h % FALLBACK_NAMES.length]
}

// Older saves used a block character: map its colors/hats onto the Thunderbird.
const OLD_COLOR = { '#fff1d6': 'classic', '#7dffc0': 'mint', '#7cd3ff': 'sky', '#ff9ccb': 'sakura', '#bba2ff': 'grape', '#ffd23f': 'storm' }
const OLD_HAT = { cap: 'headphones', headband: 'scarf', party: 'sprout', wizard: 'wizard', crown: 'crown', none: 'none' }

/** Any stored look (old or new) → { colorway, accessory, outfit, level }. */
export function normalizeLook(look, level) {
  look = look || {}
  return {
    colorway: COLORWAYS[look.colorway] ? look.colorway : OLD_COLOR[look.color] ?? 'classic',
    accessory: ACCESSORIES[look.accessory] ? look.accessory : OLD_HAT[look.hat] ?? 'none',
    outfit: OUTFITS[look.outfit] ? look.outfit : 'none',
    level: level ?? look.level ?? 1,
  }
}
