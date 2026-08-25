export interface ParsedSet {
  reps: number | null;
  weight: number | null;
}

/**
 * Parse CSV "Workout info" strings like:
 * "(5,60)(5,60)" → reps + weight (kg)
 * "(,39)" or "(, 39)" → weight-only (burn / timed blocks)
 * "(10,)" → reps-only (legacy); burn seeds should use "(,10)" instead
 */
export function parseWorkoutInfo(raw: string | null | undefined): ParsedSet[] {
  if (!raw?.trim()) return [];

  const sets: ParsedSet[] = [];
  const re = /\(\s*([^,)]*)\s*,\s*([^)]*)\s*\)/g;
  let match: RegExpExecArray | null;

  while ((match = re.exec(raw)) !== null) {
    const repsStr = match[1].trim();
    const weightStr = match[2].trim();
    const reps = repsStr === "" ? null : Number(repsStr);
    const weight = weightStr === "" ? null : Number(weightStr);
    sets.push({
      reps: Number.isFinite(reps as number) ? (reps as number) : null,
      weight: Number.isFinite(weight as number) ? (weight as number) : null,
    });
  }

  if (sets.length === 0) {
    // Incomplete "(,39" or "(39," without closing paren
    const weightOnly = raw.match(/\(\s*,\s*(\d+(?:\.\d+)?)\s*,?/);
    if (weightOnly) {
      sets.push({ reps: null, weight: Number(weightOnly[1]) });
      return sets;
    }
    const repsOnly = raw.match(/\(\s*(\d+(?:\.\d+)?)\s*,\s*\)?/);
    if (repsOnly) {
      sets.push({ reps: Number(repsOnly[1]), weight: null });
    }
  }

  return sets;
}
