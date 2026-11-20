// Static game data + starter profile.

export const CATEGORIES = {
  body: { label: 'Body', tone: 'neon' },
  mind: { label: 'Mind', tone: 'grape' },
  craft: { label: 'Craft', tone: 'pink' },
  life: { label: 'Life', tone: 'gold' },
  social: { label: 'Social', tone: 'blue' },
}

export const DIFFICULTY = {
  easy: { label: 'Easy', xp: 15, tone: 'neon' },
  medium: { label: 'Medium', xp: 30, tone: 'blue' },
  hard: { label: 'Epic', xp: 60, tone: 'pink' },
}

export const ACTIVITY_TAGS = ['solo', 'group', 'simple', 'outdoors', 'creative', 'mindful']

/** Coins awarded alongside XP. */
export const coinsFor = (xp) => Math.ceil(xp / 5)

const quest = (id, title, description, category, difficulty, minutes, extra = {}) => ({
  id, title, description, category, difficulty, minutes,
  xp: DIFFICULTY[difficulty].xp,
  status: 'available',
  completedAt: null,
  proof: null,
  ...extra,
})

export const SEED_QUESTS = [
  quest('q1', 'Hydration Potion', 'Drink a full glass of water.', 'body', 'easy', 1, { status: 'active' }),
  quest('q2', 'Stretch Ritual', 'Stretch for 5 minutes — neck, back and legs.', 'body', 'easy', 5, { status: 'active' }),
  quest('q3', 'Dragon Walk', 'Take a 10-minute walk outside.', 'body', 'medium', 10),
  quest('q4', 'Scroll of Knowledge', 'Read 10 pages of any book.', 'mind', 'medium', 15),
  quest('q5', 'Doodle Spell', 'Sketch something you can see right now.', 'craft', 'easy', 5),
  quest('q6', 'Tidy the Lair', 'Clear and wipe down your desk.', 'life', 'medium', 10),
  quest('q7', 'Calm Mind', 'Do a 3-minute breathing exercise.', 'mind', 'easy', 3),
  quest('q8', 'Send a Raven', "Message a friend you haven't talked to in a while.", 'social', 'easy', 2),
  quest('q9', 'Morning Sunbeam', 'Step outside and soak up 5 minutes of daylight.', 'life', 'easy', 5, {
    status: 'completed', completedAt: Date.now() - 3.6e6,
    proof: { name: 'proof-photo.jpg', type: 'image/jpeg', size: 2_340_000, kind: 'photo', sample: true },
  }),
  quest('q10', 'Kitchen Alchemist', 'Cook a meal from scratch.', 'craft', 'hard', 30),
  quest('q11', 'Gauntlet of Steps', 'Walk 5,000 steps today.', 'body', 'hard', 45),
  quest('q12', 'Plant Whisperer', 'Water your plants or tidy a green space.', 'life', 'easy', 3),
  quest('q13', "Bard's Practice", 'Play an instrument or sing for 10 minutes.', 'craft', 'medium', 10),
  quest('q14', 'Digital Detox', 'Spend 30 minutes away from all screens.', 'mind', 'hard', 30),
  quest('q15', 'Party Up', 'Do any quest together with a friend.', 'social', 'medium', 20),
]

/* ---------- Avatar locker ---------- */

export const SLOTS = [
  { id: 'color', label: 'Color' },
  { id: 'face', label: 'Face' },
  { id: 'hat', label: 'Hat' },
  { id: 'item', label: 'Gear' },
  { id: 'title', label: 'Title' },
]

// unlock: { level } is earned automatically, { coins } is bought in the shop.
export const ITEMS = [
  { id: 'color-cream', slot: 'color', name: 'Marshmallow', value: '#fff1d6' },
  { id: 'color-mint', slot: 'color', name: 'Mint', value: '#7dffc0' },
  { id: 'color-sky', slot: 'color', name: 'Sky', value: '#7cd3ff', unlock: { level: 2 } },
  { id: 'color-bubble', slot: 'color', name: 'Bubblegum', value: '#ff9ccb', unlock: { coins: 30 } },
  { id: 'color-grape', slot: 'color', name: 'Grape', value: '#bba2ff', unlock: { coins: 60 } },
  { id: 'color-gold', slot: 'color', name: 'Golden', value: '#ffd23f', unlock: { level: 5 } },

  { id: 'face-classic', slot: 'face', name: 'Classic', value: 'classic' },
  { id: 'face-happy', slot: 'face', name: 'Joyful', value: 'happy' },
  { id: 'face-determined', slot: 'face', name: 'Determined', value: 'determined', unlock: { level: 2 } },
  { id: 'face-sleepy', slot: 'face', name: 'Sleepy', value: 'sleepy', unlock: { coins: 20 } },
  { id: 'face-star', slot: 'face', name: 'Starstruck', value: 'star', unlock: { level: 4 } },

  { id: 'hat-none', slot: 'hat', name: 'No Hat', value: 'none' },
  { id: 'hat-cap', slot: 'hat', name: 'Cap', value: 'cap' },
  { id: 'hat-headband', slot: 'hat', name: 'Headband', value: 'headband', unlock: { level: 2 } },
  { id: 'hat-party', slot: 'hat', name: 'Party Hat', value: 'party', unlock: { coins: 25 } },
  { id: 'hat-wizard', slot: 'hat', name: 'Wizard Hat', value: 'wizard', unlock: { level: 3 } },
  { id: 'hat-crown', slot: 'hat', name: 'Crown', value: 'crown', unlock: { level: 5 } },

  { id: 'item-bat', slot: 'item', name: 'Slugger Bat', value: 'bat' },
  { id: 'item-bottle', slot: 'item', name: 'Water Bottle', value: 'bottle' },
  { id: 'item-book', slot: 'item', name: 'Spell Book', value: 'book', unlock: { level: 2 } },
  { id: 'item-brush', slot: 'item', name: 'Paintbrush', value: 'brush', unlock: { coins: 35 } },
  { id: 'item-wand', slot: 'item', name: 'Star Wand', value: 'wand', unlock: { level: 3 } },
  { id: 'item-flag', slot: 'item', name: 'Guild Flag', value: 'flag', unlock: { level: 4 } },

  { id: 'title-rookie', slot: 'title', name: 'Rookie' },
  { id: 'title-seeker', slot: 'title', name: 'Quest Seeker', unlock: { level: 2 } },
  { id: 'title-hydro', slot: 'title', name: 'Hydration Hero', unlock: { coins: 20 } },
  { id: 'title-owl', slot: 'title', name: 'Night Owl', unlock: { coins: 40 } },
  { id: 'title-wizard', slot: 'title', name: 'Whimsy Wizard', unlock: { level: 4 } },
  { id: 'title-legend', slot: 'title', name: 'Legend', unlock: { level: 6 } },
]

export const ITEM_BY_ID = Object.fromEntries(ITEMS.map((i) => [i.id, i]))

export const isOwned = (item, profile) =>
  !item.unlock ||
  (item.unlock.level != null && profile.level >= item.unlock.level) ||
  profile.purchased.includes(item.id)

/** Turn equipped item ids into the values the Character renders. */
export function resolveLook(equipped) {
  const v = (slot) => ITEM_BY_ID[equipped[slot]]?.value
  return { color: v('color'), face: v('face'), hat: v('hat'), item: v('item') }
}

export const DEFAULT_EQUIPPED = {
  color: 'color-cream', face: 'face-classic', hat: 'hat-none', item: 'item-bat', title: 'title-rookie',
}

/* ---------- Social / multiplayer ---------- */

export const MAX_PARTY_SIZE = 4 // including you
export const PARTY_BONUS = 0.5 // +50% XP on group quests
export const MAX_REROLLS = 3 // per group-queue round

/** Shared activities a group queue can pop. */
export const GROUP_QUESTS = [
  { key: 'stretch', title: 'Group Stretch Break', description: 'Everyone stretches for 5 minutes at the same time.', category: 'body', difficulty: 'easy', minutes: 5 },
  { key: 'sketch', title: 'Coffee & Sketch Together', description: 'Grab a drink and sketch the same object, then share.', category: 'craft', difficulty: 'medium', minutes: 15 },
  { key: 'walk', title: 'Squad Walk', description: 'Each take a 15-minute walk and snap one cool thing you see.', category: 'body', difficulty: 'medium', minutes: 15 },
  { key: 'gratitude', title: 'Gratitude Round', description: 'Each share one thing you are grateful for today.', category: 'social', difficulty: 'easy', minutes: 5 },
  { key: 'tidy', title: 'Speed Tidy Challenge', description: 'Race to tidy one room in 10 minutes.', category: 'life', difficulty: 'easy', minutes: 10 },
  { key: 'water', title: 'Hydration Toast', description: 'Everyone drinks a full glass of water — cheers on camera!', category: 'body', difficulty: 'easy', minutes: 2 },
]

/** "Seed 8 sample users": searchable bot profiles that auto-accept friend requests. */
export const SAMPLE_USERS = [
  { username: 'Pixel', level: 7, xp: 120, coins: 210, streak: 12, look: { color: '#7dffc0', face: 'happy', hat: 'cap', item: 'flag' } },
  { username: 'Moonbeam', level: 5, xp: 80, coins: 150, streak: 6, look: { color: '#bba2ff', face: 'star', hat: 'wizard', item: 'wand' } },
  { username: 'Bolt', level: 4, xp: 60, coins: 95, streak: 3, look: { color: '#7cd3ff', face: 'determined', hat: 'headband', item: 'bottle' } },
  { username: 'Inky', level: 2, xp: 40, coins: 30, streak: 1, look: { color: '#ff9ccb', face: 'sleepy', hat: 'none', item: 'book' } },
  { username: 'Sprout', level: 3, xp: 10, coins: 55, streak: 4, look: { color: '#7dffc0', face: 'classic', hat: 'party', item: 'brush' } },
  { username: 'Nova', level: 6, xp: 150, coins: 180, streak: 9, look: { color: '#ffd23f', face: 'determined', hat: 'crown', item: 'bat' } },
  { username: 'Juniper', level: 4, xp: 20, coins: 70, streak: 2, look: { color: '#7cd3ff', face: 'star', hat: 'none', item: 'book' } },
  { username: 'Taco', level: 5, xp: 30, coins: 120, streak: 5, look: { color: '#fff1d6', face: 'happy', hat: 'headband', item: 'wand' } },
]

/** Names for extra simulated teammates when the sample bots are busy. */
export const BOT_NAMES = ['Biscuit', 'Comet', 'Pebble', 'Ziggy', 'Maple', 'Rook', 'Waffle', 'Echo']

export const DEFAULT_PROFILE = {
  username: 'Adventurer',
  bio: '',
  tags: ['solo', 'simple'],
  gamemode: 'simple',
  level: 1,
  xp: 15,
  maxXp: 100,
  coins: 40,
  streak: 3,
  equipped: DEFAULT_EQUIPPED,
  purchased: [],
  quests: SEED_QUESTS,
}
