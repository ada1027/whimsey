// Static game data + starter profile.

export const CATEGORIES = {
  body: { label: 'Body', tone: 'neon' },
  mind: { label: 'Mind', tone: 'grape' },
  craft: { label: 'Craft', tone: 'pink' },
  life: { label: 'Life', tone: 'gold' },
  social: { label: 'Social', tone: 'blue' },
}

// limit = minutes you get once a quest is accepted; penalty applies if the timer runs out (or you give up).
export const DIFFICULTY = {
  easy: { label: 'Easy', xp: 15, tone: 'neon', limit: 15, penalty: { xp: 10, coins: 0 } },
  medium: { label: 'Medium', xp: 30, tone: 'blue', limit: 30, penalty: { xp: 15, coins: 0 } },
  hard: { label: 'Epic', xp: 60, tone: 'pink', limit: 60, penalty: { xp: 30, coins: 10 } },
}

/** Every failure also resets your streak. */
export const penaltyFor = (difficulty) => ({ ...DIFFICULTY[difficulty].penalty, streakReset: true })

export const penaltyLabel = ({ xp, coins }) =>
  [xp && `-${xp} XP`, coins && `-${coins} coins`, 'Streak reset'].filter(Boolean).join(' & ')

export const ACTIVITY_TAGS = ['solo', 'group', 'simple', 'outdoors', 'creative', 'mindful']

/** Coins awarded alongside XP. */
export const coinsFor = (xp) => Math.ceil(xp / 5)

const quest = (id, title, description, category, difficulty) => ({
  id, title, description, category, difficulty,
  xp: DIFFICULTY[difficulty].xp,
  limit: DIFFICULTY[difficulty].limit,
})

/** The pool daily quests are drawn from. */
export const QUEST_CATALOG = [
  quest('q1', 'Hydration Potion', 'Drink a full glass of water.', 'body', 'easy'),
  quest('q2', 'Stretch Ritual', 'Stretch for 5 minutes — neck, back and legs.', 'body', 'easy'),
  quest('q3', 'Dragon Walk', 'Take a 10-minute walk outside.', 'body', 'medium'),
  quest('q4', 'Scroll of Knowledge', 'Read 10 pages of any book.', 'mind', 'medium'),
  quest('q5', 'Doodle Spell', 'Sketch something you can see right now.', 'craft', 'easy'),
  quest('q6', 'Tidy the Lair', 'Clear and wipe down your desk.', 'life', 'medium'),
  quest('q7', 'Calm Mind', 'Do a 3-minute breathing exercise.', 'mind', 'easy'),
  quest('q8', 'Send a Raven', "Message a friend you haven't talked to in a while.", 'social', 'easy'),
  quest('q9', 'Morning Sunbeam', 'Step outside and soak up 5 minutes of daylight.', 'life', 'easy'),
  quest('q10', 'Kitchen Alchemist', 'Cook a meal from scratch.', 'craft', 'hard'),
  quest('q11', 'Gauntlet of Steps', 'Walk 5,000 steps.', 'body', 'hard'),
  quest('q12', 'Plant Whisperer', 'Water your plants or tidy a green space.', 'life', 'easy'),
  quest('q13', "Bard's Practice", 'Play an instrument or sing for 10 minutes.', 'craft', 'medium'),
  quest('q14', 'Digital Detox', 'Spend 30 minutes away from all screens.', 'mind', 'hard'),
  quest('q15', 'Party Up', 'Do any quest together with a friend.', 'social', 'medium'),
]
export const CATALOG_BY_ID = Object.fromEntries(QUEST_CATALOG.map((q) => [q.id, q]))

export const DAILY_COUNT = 3

/** Local calendar day, e.g. "2026-11-20". */
export const dayKey = (d = new Date()) => d.toLocaleDateString('en-CA')

/** Today's 3 dailies: one Easy, one Medium, one Epic, the same for everyone on a given day. */
export function pickDailies(date) {
  let h = 2166136261
  for (const c of date) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0
  const next = () => (h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0) / 2 ** 32
  return ['easy', 'medium', 'hard'].map((d) => {
    const pool = QUEST_CATALOG.filter((q) => q.difficulty === d)
    return pool[Math.floor(next() * pool.length)].id
  })
}

/* ---------- Random rolls (Home › PLAY) ---------- */

export const ROLLS_PER_DAY = 3
const ROLL_XP = 20
const ROLL_PENALTY = { xp: 5, coins: 0, streakReset: true }

const roll = (id, title, description, category, limit) => ({
  id, title, description, category, limit, difficulty: 'easy', xp: ROLL_XP, penalty: ROLL_PENALTY, type: 'random',
})

/** Spontaneous, whimsical micro-quests — a separate pool from the dailies. */
export const RANDOM_QUESTS = [
  roll('r1', 'Yellow Hunt', 'Find something yellow outside and snap it.', 'life', 15),
  roll('r2', 'Squat Surprise', 'Do 15 squats right now.', 'body', 5),
  roll('r3', 'Mood Doodle', 'Draw a 30-second doodle of your mood.', 'craft', 5),
  roll('r4', 'Kindness Bomb', 'Compliment a friend or a stranger.', 'social', 10),
  roll('r5', 'Sky Check', 'Take a photo of the sky right now.', 'life', 5),
  roll('r6', 'Flamingo Mode', 'Balance on one foot for 60 seconds.', 'body', 5),
  roll('r7', 'Hotel Bed', 'Make your bed like a fancy hotel.', 'life', 10),
  roll('r8', 'Lunch Haiku', 'Write a 3-line poem about your last meal.', 'craft', 10),
  roll('r9', 'Meme Delivery', 'Send a meme to someone who needs a laugh.', 'social', 5),
  roll('r10', 'Tiny Tower', 'Build a tower out of things on your desk.', 'craft', 10),
  roll('r11', 'Cloud Safari', 'Find a cloud shaped like an animal.', 'mind', 15),
  roll('r12', 'Dance Break', 'Do a 1-minute dance break — no one is watching.', 'body', 5),
  roll('r13', 'Gratitude Blast', 'Say 5 things you are grateful for out loud.', 'mind', 5),
  roll('r14', 'Rainbow Shelf', 'Rearrange one shelf or drawer by color.', 'life', 15),
  roll('r15', 'Pinky Up', 'Drink a glass of water from your fanciest cup, pinky up.', 'body', 5),
  roll('r16', 'Plant Pal', 'Say hi to a plant and snap a portrait of it.', 'life', 10),
]
export const RANDOM_BY_ID = Object.fromEntries(RANDOM_QUESTS.map((q) => [q.id, q]))

/* ---------- Friend activity feed ---------- */

export const QUEST_TYPE_LABEL = { daily: 'Daily', random: 'Random roll', group: 'Group quest' }

export const REACTIONS = [
  { id: 'hype', emoji: '🔥', label: 'Hype' },
  { id: 'gg', emoji: '👏', label: 'GG' },
  { id: 'sus', emoji: '👀', label: 'Sus?' },
]

/** Posts seeded from the sample users so the feed looks alive on first load. `ago` is minutes. */
export const SAMPLE_FEED = [
  { ref: 'sample-1', user: 'Pixel', title: 'Dragon Walk', type: 'daily', category: 'body', proof: 'sample:🌳', duration: 18 * 60 + 31, ago: 4,
    reactions: { hype: ['Moonbeam', 'Bolt'], gg: ['Nova'] } },
  { ref: 'sample-2', user: 'Moonbeam', title: 'Mood Doodle', type: 'random', category: 'craft', proof: 'sample:🎨', duration: 2 * 60 + 5, ago: 27,
    reactions: { gg: ['Pixel', 'Taco', 'Sprout'] } },
  { ref: 'sample-3', user: 'Bolt', title: 'Group Stretch Break', type: 'group', category: 'body', proof: 'sample:🧘', duration: 6 * 60 + 12, ago: 64,
    tag: 'together', party: ['Bolt', 'Pixel', 'Sprout'], reactions: { hype: ['Juniper'], gg: ['Moonbeam', 'Nova'] } },
  { ref: 'sample-4', user: 'Nova', title: 'Yellow Hunt', type: 'random', category: 'life', proof: 'sample:🌻', duration: 9 * 60 + 48, ago: 190,
    reactions: { hype: ['Pixel'], sus: ['Inky'] } },
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
  // limit = timer in minutes once the party accepts
  { key: 'stretch', title: 'Group Stretch Break', description: 'Everyone stretches for 5 minutes at the same time.', category: 'body', difficulty: 'easy', minutes: 5, limit: DIFFICULTY.easy.limit },
  { key: 'sketch', title: 'Coffee & Sketch Together', description: 'Grab a drink and sketch the same object, then share.', category: 'craft', difficulty: 'medium', minutes: 15, limit: DIFFICULTY.medium.limit },
  { key: 'walk', title: 'Squad Walk', description: 'Each take a 15-minute walk and snap one cool thing you see.', category: 'body', difficulty: 'medium', minutes: 15, limit: DIFFICULTY.medium.limit },
  { key: 'gratitude', title: 'Gratitude Round', description: 'Each share one thing you are grateful for today.', category: 'social', difficulty: 'easy', minutes: 5, limit: DIFFICULTY.easy.limit },
  { key: 'tidy', title: 'Speed Tidy Challenge', description: 'Race to tidy one room in 10 minutes.', category: 'life', difficulty: 'easy', minutes: 10, limit: DIFFICULTY.easy.limit },
  { key: 'water', title: 'Hydration Toast', description: 'Everyone drinks a full glass of water — cheers on camera!', category: 'body', difficulty: 'easy', minutes: 2, limit: DIFFICULTY.easy.limit },
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
  xp: 0,
  maxXp: 100,
  coins: 40,
  streak: 0,
  lastStreakDay: null,
  equipped: DEFAULT_EQUIPPED,
  purchased: [],
  quests: [], // attempts: active, completed and failed quests (fresh accounts start empty)
  daily: null, // { date, ids } — rolled on load and at midnight
  rolls: null, // { date, used, pending } — 3 random rolls per day; `pending` is the revealed-but-not-accepted roll
  version: 3,
}
