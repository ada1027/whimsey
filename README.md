# WHIMSEY

Gamified daily quests & micro-activities — usability-test prototype.
React + Vite + Tailwind CSS v4 + Lucide. Arcade-style UI (chunky outlines, 3D buttons, loot pills).

```bash
npm install
npm run dev
```
(Windows PowerShell 5: run each command on its own line.)

## Test tasks covered
1. **Avatar & profile** — Profile tab: edit name/bio/activity tags, Locker to equip color, face, hat, gear and title. Items unlock by level or are bought with coins.
2. **Quest board** — Quests tab › Board: browse/filter micro-quests (time, category, difficulty, XP), **Accept** to add to My Queue. Home › PLAY assigns a random quest.
3. **Complete + proof** — My Queue › **Complete** opens Submit Proof (attach a real photo/video or a sample file). Submitting plays the reward animation, fills the XP bar and handles level-ups.
4. **Social** — friends list (mock), Add Friend, invite to party, and a placeholder Group Quest queue.

Gamemode (Home › Gamemode, or the ☰ menu): **Simple** vs **Pro** (adds daily tasks, mystery event, ranks, guild, shop).

## Structure
- `src/context/UserContext.jsx` – all game state (reducer), persisted to `localStorage`.
- `src/data/seed.js` – quests, locker items, mock friends, starter profile.
- `src/components/Character.jsx` – SVG character built from the equipped look.
- `src/components/` – StatusBar, NavBar, QuestCard, ProofModal, RewardOverlay, PlayModal, GamemodeModal, ui primitives.
- `src/views/` – Dashboard (home), Quests, Social, Profile.
- `src/index.css` – theme tokens (dark/light) and arcade utilities: `card`, `btn btn-gold|pink|blue|neon|grape|ghost`, `pill`, `title-stroke`, `stage`.

Everything is local: no files are uploaded and no friend requests are sent.
