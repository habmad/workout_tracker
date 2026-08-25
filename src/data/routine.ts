export type DayId = "day1" | "day2" | "day3" | "day4";

export type ExerciseKind = "normal" | "burn" | "amap";

export interface Exercise {
  id: string;
  name: string;
  kind: ExerciseKind;
  /** Target set count for normal/amap; burn uses 1 input block */
  targetSets: number;
  /** Display string: "5", "8-12", "Burn", "AMAP", etc. */
  targetReps: string;
}

export interface WorkoutDay {
  id: DayId;
  label: string;
  title: string;
  exercises: Exercise[];
}

function slug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function ex(
  dayId: DayId,
  name: string,
  setsRaw: string,
  repsRaw: string,
): Exercise {
  const sets = setsRaw.trim();
  const reps = repsRaw.trim();
  const id = `${dayId}-${slug(name)}`;

  if (/minute/i.test(sets) || /burn/i.test(reps)) {
    return {
      id,
      name,
      kind: "burn",
      targetSets: 1,
      targetReps: reps || "Burn",
    };
  }

  if (/amap/i.test(reps)) {
    return {
      id,
      name,
      kind: "amap",
      targetSets: Number.parseInt(sets, 10) || 3,
      targetReps: "AMAP",
    };
  }

  return {
    id,
    name,
    kind: "normal",
    targetSets: Number.parseInt(sets, 10) || 3,
    targetReps: reps || "—",
  };
}

export const ROUTINE: WorkoutDay[] = [
  {
    id: "day1",
    label: "Day 1",
    title: "Back and Biceps",
    exercises: [
      ex("day1", "Deadlift", "2", "5"),
      ex("day1", "One Arm Dumbbell Row", "3", "8-12"),
      ex("day1", "Wide Grip Pull Up or Lat Pull Down", "3", "10-12"),
      ex("day1", "Barbell Row", "3", "8-12"),
      ex("day1", "Seated Cable Row or Machine Row", "5 minutes", "Burn"),
      ex("day1", "EZ Bar Preacher Curl", "3", "10-12"),
      ex("day1", "Concentration Curl", "3", "10-12"),
      ex("day1", "Seated Dumbbell Curl", "5 minutes", "Burn"),
    ],
  },
  {
    id: "day2",
    label: "Day 2",
    title: "Chest and Triceps",
    exercises: [
      ex("day2", "Bench Press", "3", "6-10"),
      ex("day2", "Incline Dumbbell Bench Press", "3", "8-12"),
      ex("day2", "Chest Dip", "3", "AMAP"),
      ex("day2", "Cable Crossover or Pec Dec", "3", "12-15"),
      ex("day2", "Machine Press or Dumbbell Bench Press", "5 minutes", "Burn"),
      ex("day2", "EZ Bar Skullcrusher", "3", "8-12"),
      ex("day2", "Two Arm Seated Dumbbell Extension", "3", "8-12"),
      ex("day2", "Cable Tricep Extension", "5 minutes", "Burn"),
    ],
  },
  {
    id: "day3",
    label: "Day 3",
    title: "Quads, Hamstrings and Calves",
    exercises: [
      ex("day3", "Squat", "3", "6-10"),
      ex("day3", "Leg Press", "3", "15-20"),
      ex("day3", "Hack Squat or Dumbbell Lunge", "3", "8-12"),
      ex("day3", "Leg Extension", "5 minutes", "Burn"),
      ex("day3", "Stiff Leg Deadlift", "3", "8-12"),
      ex("day3", "Leg Curl", "5 minutes", "Burn"),
      ex("day3", "Standing Calf Raise", "3", "10-15"),
      ex("day3", "Seated Calf Raise", "5 minutes", "Burn"),
    ],
  },
  {
    id: "day4",
    label: "Day 4",
    title: "Shoulders, Traps and Forearms",
    exercises: [
      ex("day4", "Seated Barbell Press", "3", "6-10"),
      ex("day4", "Seated Arnold Press", "3", "8-12"),
      ex("day4", "Dumbbell Lateral Raise", "3", "10-15"),
      ex("day4", "Hammer Strength Press or Smith Press", "5 minutes", "Burn"),
      ex("day4", "Upright Row", "3", "8-12"),
      ex("day4", "Barbell Shrug or Dumbbell Shrug", "5 minutes", "Burn"),
      ex("day4", "Seated Barbell Wrist Curl", "3", ""),
      ex("day4", "Barbell Static Hold", "5 minutes", "Burn"),
    ],
  },
];

export function getDay(dayId: string): WorkoutDay | undefined {
  return ROUTINE.find((d) => d.id === dayId);
}

export function getExercise(
  dayId: string,
  exerciseId: string,
): Exercise | undefined {
  return getDay(dayId)?.exercises.find((e) => e.id === exerciseId);
}

export function isDayId(value: string): value is DayId {
  return ROUTINE.some((d) => d.id === value);
}
