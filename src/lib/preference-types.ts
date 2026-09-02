import type { Exercise, WorkoutDay } from "@/data/routine";

export type ExercisePreferenceDTO = {
  exerciseId: string;
  customName: string | null;
  sortOrder: number;
  collapsed: boolean;
};

export type DisplayExercise = Exercise & {
  collapsed: boolean;
  defaultName: string;
};

/** Merge static routine exercises with saved prefs into display order. */
export function mergeExercisesWithPrefs(
  day: WorkoutDay,
  prefs: ExercisePreferenceDTO[],
): DisplayExercise[] {
  const prefById = new Map(prefs.map((p) => [p.exerciseId, p]));

  const withMeta = day.exercises.map((exercise, index) => {
    const pref = prefById.get(exercise.id);
    const custom =
      pref?.customName != null && pref.customName.trim() !== ""
        ? pref.customName.trim()
        : null;
    return {
      ...exercise,
      defaultName: exercise.name,
      name: custom ?? exercise.name,
      collapsed: pref?.collapsed ?? false,
      sortOrder: pref?.sortOrder ?? index,
    };
  });

  withMeta.sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));

  return withMeta.map((item) => ({
    id: item.id,
    name: item.name,
    kind: item.kind,
    targetSets: item.targetSets,
    targetReps: item.targetReps,
    defaultName: item.defaultName,
    collapsed: item.collapsed,
  }));
}
