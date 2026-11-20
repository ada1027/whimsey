// XP / level math shared by the local store and profile sync.

/** XP needed for the next level grows ~25% per level, rounded to 10s. */
export const nextMaxXp = (maxXp) => Math.round((maxXp * 1.25) / 10) * 10

/** XP needed to finish a given level (level 1 → 100). */
export function maxXpForLevel(level) {
  let max = 100
  for (let l = 1; l < level; l++) max = nextMaxXp(max)
  return max
}

/** Add XP and roll over any level-ups. */
export function applyXp({ xp, level, maxXp }, amount) {
  xp += amount
  let levelsGained = 0
  while (xp >= maxXp) {
    xp -= maxXp
    level += 1
    maxXp = nextMaxXp(maxXp)
    levelsGained += 1
  }
  return { xp, level, maxXp, levelsGained }
}
