# WHIMSEY

Gamified daily quests & micro-activities — usability-test prototype.
React + Vite + Tailwind CSS v4 + Lucide. Arcade-style UI (chunky outlines, 3D buttons, loot pills).

```bash
npm install
npm run dev
```
(Windows PowerShell 5: run each command on its own line.)

## Test tasks covered
1. **Thunderbird companion & profile** — your baby Thunderbird evolves (Hatchling Lv 1–2 → Fledgling Lv 3–4 → Stormbird Lv 5+). Profile tab: tap it in its habitat, rename it, pick a colorway/accessory/title, and browse your 3-column quest proof grid. Tap any avatar or name anywhere to open that adventurer's profile and grid.
2. **Random rolls** — Home › PLAY rolls a whimsical micro-quest from its own pool (3 rolls per day; the first reveal is free, Reroll and Accept each use a roll). Same one-active-quest limit and timer.
2. **Dailies** — Quests tab › Dailies: 3 quests per day (one Easy, Medium, Epic) with XP, coins, time limit and failure penalty. Only **one quest can be active** at a time (solo or group); other Accept buttons lock with "Finish active quest first". Home › PLAY spins one of the remaining dailies.
3. **Timer, proof & failure** — accepting starts a countdown (15/30/60 min). The active quest stays pinned on Home/Quests and as a compact dock above the nav on every tab (tap it for details). **Complete & submit proof** earns XP/coins and builds your streak; if the timer hits 00:00 (or use **Test: Expire Timer**) you get "Quest Failed — Time Expired!" with an XP/coin penalty and a streak reset.
4. **Social / parties** — party lobby (leader crown, invite, kick, leave), join friends' open lobbies, and group matchmaking: **Join group queue** → searching → **Match found** → accept a shared quest with a +50% party bonus. Non-leaders **Ready up** and the (mock) leader starts the queue.

**Home** is action-first: PLAY card (with your companion), Dailies strip, then the **friend activity feed**: every completed quest posts the proof photo/video, quest type, time taken, party + Together/Separate tag, with 🔥 Hype / 👏 GG / 👀 Sus? reactions that sync live. Sample users seed a few posts on first load and cheer new posts.

The quest in progress is pinned at the top of Home and Quests (glowing **Current quest in progress** card with **Complete & submit proof**). Accepting from the board shows a **Quest accepted!** banner; PLAY and group quests jump straight to it.

**Notification bell** (top bar): reactions, Done-Together tags, friend requests (Accept/Decline) and party invites (Join) — sample notifications are seeded on first login.

## Multiplayer sync (Supabase)

Without keys the app runs in **local mode**: the same tables live in your browser's storage and sync between tabs (open a second tab and log in as another adventurer to test). With Supabase, profiles, friends, parties, ready-ups, votes and proof photos sync live across devices.

1. Create a free project at supabase.com.
2. **SQL Editor → New query**, paste all of `supabase_schema.sql`, click **Run**.
3. **Project Settings → API**: copy the Project URL and the `anon` public key.
4. Copy `.env.example` to `.env.local` and paste both values, then restart `npm run dev`.
5. On Vercel/Netlify add the same two variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) and redeploy.

⚠️ The schema uses open prototype policies: anyone with the app can read/write all rows and upload proofs. Don't use real personal data.

Gamemode (Home › Gamemode, or the ☰ menu): **Simple** vs **Pro** (adds daily tasks, mystery event, ranks, guild, shop).

## Structure
- `src/context/UserContext.jsx` – local game state (quests, locker, XP), saved per adventurer in `localStorage`.
- `src/context/SessionContext.jsx` – pick/create adventurer; `OnlineContext.jsx` – live friends, party, voting, bots, profile sync.
- `src/lib/db.js` – data layer (Supabase or local mock); `src/lib/api.js` – game operations; `supabase_schema.sql` – database setup.
- `src/data/seed.js` – quests, locker items, mock friends, starter profile.
- `src/components/Character.jsx` – SVG character built from the equipped look.
- `src/components/` – StatusBar, NavBar, QuestCard, ProofModal, RewardOverlay, PlayModal, GamemodeModal, ui primitives.
- `src/views/` – Dashboard (home), Quests, Social, Profile.
- `src/index.css` – theme tokens (dark/light) and arcade utilities: `card`, `btn btn-gold|pink|blue|neon|grape|ghost`, `pill`, `title-stroke`, `stage`.

Solo quest proof stays on the device; group quest proof is uploaded to the `quest-proofs` bucket (Supabase mode).
