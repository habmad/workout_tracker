import { eq } from "drizzle-orm";
import { db } from "@/db";
import { exercisePreferences, type ExercisePreference } from "@/db/schema";
import { getDay, type DayId } from "@/data/routine";
import type { ExercisePreferenceDTO } from "@/lib/preference-types";

export type { ExercisePreferenceDTO, DisplayExercise } from "@/lib/preference-types";
export { mergeExercisesWithPrefs } from "@/lib/preference-types";

export function toPreferenceDTO(row: ExercisePreference): ExercisePreferenceDTO {
  return {
    exerciseId: row.exerciseId,
    customName: row.customName,
    sortOrder: row.sortOrder,
    collapsed: row.collapsed,
  };
}

export async function getPreferencesForDay(
  dayId: DayId,
): Promise<ExercisePreferenceDTO[]> {
  const rows = await db
    .select()
    .from(exercisePreferences)
    .where(eq(exercisePreferences.dayId, dayId));
  return rows.map(toPreferenceDTO);
}

export type PreferenceUpdate = {
  exerciseId: string;
  customName?: string | null;
  sortOrder?: number;
  collapsed?: boolean;
};

export async function upsertPreferences(
  dayId: DayId,
  updates: PreferenceUpdate[],
): Promise<ExercisePreferenceDTO[]> {
  const day = getDay(dayId);
  if (!day) throw new Error("Invalid dayId");

  const validIds = new Set(day.exercises.map((e) => e.id));
  for (const u of updates) {
    if (!validIds.has(u.exerciseId)) {
      throw new Error(`Unknown exerciseId: ${u.exerciseId}`);
    }
  }

  const existing = await db
    .select()
    .from(exercisePreferences)
    .where(eq(exercisePreferences.dayId, dayId));
  const byId = new Map(existing.map((r) => [r.exerciseId, r]));

  const now = new Date();

  for (const u of updates) {
    const prev = byId.get(u.exerciseId);
    const defaultOrder = day.exercises.findIndex((e) => e.id === u.exerciseId);

    const next = {
      exerciseId: u.exerciseId,
      dayId,
      customName:
        u.customName !== undefined
          ? u.customName
          : (prev?.customName ?? null),
      sortOrder:
        u.sortOrder !== undefined
          ? u.sortOrder
          : (prev?.sortOrder ?? defaultOrder),
      collapsed:
        u.collapsed !== undefined
          ? u.collapsed
          : (prev?.collapsed ?? false),
      updatedAt: now,
    };

    await db
      .insert(exercisePreferences)
      .values(next)
      .onConflictDoUpdate({
        target: exercisePreferences.exerciseId,
        set: {
          customName: next.customName,
          sortOrder: next.sortOrder,
          collapsed: next.collapsed,
          updatedAt: now,
        },
      });
  }

  return getPreferencesForDay(dayId);
}
