import { asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { setLogs, workoutSessions } from "@/db/schema";
import { ROUTINE, type DayId, type ExerciseKind } from "@/data/routine";
import { todayISO } from "@/lib/sessions";

export type AnalyticsSummary = {
  workoutsThisWeek: number;
  workoutsLast28Days: number;
  weeklyStreak: number;
  lastWorkoutDate: string | null;
};

export type WeeklyVolumePoint = {
  weekStart: string;
  label: string;
  volumeKg: number;
  workouts: number;
};

export type SplitBalanceItem = {
  dayId: DayId;
  label: string;
  title: string;
  count: number;
};

export type PersonalRecord = {
  exerciseId: string;
  name: string;
  weight: number;
  reps: number | null;
  performedOn: string;
  previousBest: number | null;
  delta: number | null;
};

export type LiftPoint = {
  date: string;
  bestWeight: number;
  bestReps: number | null;
  volume: number;
};

export type LiftSeries = {
  exerciseId: string;
  name: string;
  dayId: DayId;
  kind: ExerciseKind;
  sessionCount: number;
  points: LiftPoint[];
};

export type AnalyticsPayload = {
  summary: AnalyticsSummary;
  weeklyVolume: WeeklyVolumePoint[];
  splitBalance: SplitBalanceItem[];
  recentPrs: PersonalRecord[];
  lifts: LiftSeries[];
};

type SessionRow = {
  id: string;
  dayId: string;
  performedOn: string;
};

type SetRow = {
  sessionId: string;
  exerciseId: string;
  setIndex: number;
  reps: number | null;
  weight: number | null;
};

const exerciseMeta = new Map(
  ROUTINE.flatMap((day) =>
    day.exercises.map((ex) => [
      ex.id,
      { name: ex.name, dayId: day.id, kind: ex.kind },
    ]),
  ),
);

function parseDate(iso: string): Date {
  return new Date(`${iso}T12:00:00Z`);
}

/** Monday of the ISO week containing `iso` (YYYY-MM-DD). */
function weekStartMonday(iso: string): string {
  const d = parseDate(iso);
  const day = d.getUTCDay(); // 0 Sun .. 6 Sat
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

function addDays(iso: string, days: number): string {
  const d = parseDate(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function weekLabel(weekStart: string): string {
  const d = parseDate(weekStart);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function setVolume(reps: number | null, weight: number | null): number {
  if (reps == null || weight == null || reps <= 0 || weight <= 0) return 0;
  return reps * weight;
}

export async function getAnalytics(): Promise<AnalyticsPayload> {
  const sessions = await db
    .select({
      id: workoutSessions.id,
      dayId: workoutSessions.dayId,
      performedOn: workoutSessions.performedOn,
    })
    .from(workoutSessions)
    .where(eq(workoutSessions.status, "completed"))
    .orderBy(asc(workoutSessions.performedOn), asc(workoutSessions.createdAt));

  if (sessions.length === 0) {
    return emptyPayload();
  }

  const sessionIds = sessions.map((s) => s.id);
  const logs = await db
    .select({
      sessionId: setLogs.sessionId,
      exerciseId: setLogs.exerciseId,
      setIndex: setLogs.setIndex,
      reps: setLogs.reps,
      weight: setLogs.weight,
    })
    .from(setLogs)
    .where(inArray(setLogs.sessionId, sessionIds));

  const setRows: SetRow[] = logs.map((row) => ({
    sessionId: row.sessionId,
    exerciseId: row.exerciseId,
    setIndex: row.setIndex,
    reps: row.reps,
    weight: row.weight != null ? Number(row.weight) : null,
  }));

  const setsBySession = new Map<string, SetRow[]>();
  for (const row of setRows) {
    const list = setsBySession.get(row.sessionId) ?? [];
    list.push(row);
    setsBySession.set(row.sessionId, list);
  }

  const today = todayISO(process.env.APP_TZ || "Europe/Berlin");
  const summary = buildSummary(sessions, today);
  const weeklyVolume = buildWeeklyVolume(sessions, setsBySession, today);
  const splitBalance = buildSplitBalance(sessions);
  const { recentPrs, lifts } = buildLiftsAndPrs(sessions, setsBySession);

  return { summary, weeklyVolume, splitBalance, recentPrs, lifts };
}

function emptyPayload(): AnalyticsPayload {
  return {
    summary: {
      workoutsThisWeek: 0,
      workoutsLast28Days: 0,
      weeklyStreak: 0,
      lastWorkoutDate: null,
    },
    weeklyVolume: [],
    splitBalance: ROUTINE.map((day) => ({
      dayId: day.id,
      label: day.label,
      title: day.title,
      count: 0,
    })),
    recentPrs: [],
    lifts: [],
  };
}

function buildSummary(
  sessions: SessionRow[],
  today: string,
): AnalyticsSummary {
  const thisWeekStart = weekStartMonday(today);
  const cutoff28 = addDays(today, -27);

  let workoutsThisWeek = 0;
  let workoutsLast28Days = 0;

  for (const s of sessions) {
    if (s.performedOn >= thisWeekStart && s.performedOn <= today) {
      workoutsThisWeek += 1;
    }
    if (s.performedOn >= cutoff28 && s.performedOn <= today) {
      workoutsLast28Days += 1;
    }
  }

  const weeksWithWorkouts = new Set(
    sessions.map((s) => weekStartMonday(s.performedOn)),
  );

  let weeklyStreak = 0;
  let cursor = thisWeekStart;
  // If current week has no workout yet, start from last completed week
  if (!weeksWithWorkouts.has(cursor)) {
    cursor = addDays(cursor, -7);
  }
  while (weeksWithWorkouts.has(cursor)) {
    weeklyStreak += 1;
    cursor = addDays(cursor, -7);
  }

  const lastWorkoutDate =
    sessions.length > 0 ? sessions[sessions.length - 1].performedOn : null;

  return {
    workoutsThisWeek,
    workoutsLast28Days,
    weeklyStreak,
    lastWorkoutDate,
  };
}

function buildWeeklyVolume(
  sessions: SessionRow[],
  setsBySession: Map<string, SetRow[]>,
  today: string,
): WeeklyVolumePoint[] {
  const thisWeekStart = weekStartMonday(today);
  const points: WeeklyVolumePoint[] = [];

  for (let i = 11; i >= 0; i -= 1) {
    const weekStart = addDays(thisWeekStart, -7 * i);
    const weekEnd = addDays(weekStart, 6);
    let volumeKg = 0;
    let workouts = 0;

    for (const s of sessions) {
      if (s.performedOn < weekStart || s.performedOn > weekEnd) continue;
      workouts += 1;
      const sets = setsBySession.get(s.id) ?? [];
      for (const set of sets) {
        volumeKg += setVolume(set.reps, set.weight);
      }
    }

    points.push({
      weekStart,
      label: weekLabel(weekStart),
      volumeKg: Math.round(volumeKg),
      workouts,
    });
  }

  return points;
}

function buildSplitBalance(sessions: SessionRow[]): SplitBalanceItem[] {
  const counts = new Map<string, number>();
  for (const s of sessions) {
    counts.set(s.dayId, (counts.get(s.dayId) ?? 0) + 1);
  }

  return ROUTINE.map((day) => ({
    dayId: day.id,
    label: day.label,
    title: day.title,
    count: counts.get(day.id) ?? 0,
  }));
}

function buildLiftsAndPrs(
  sessions: SessionRow[],
  setsBySession: Map<string, SetRow[]>,
): { recentPrs: PersonalRecord[]; lifts: LiftSeries[] } {
  const bestEver = new Map<string, number>();
  const prs: PersonalRecord[] = [];
  const liftPoints = new Map<
    string,
    {
      name: string;
      dayId: DayId;
      kind: ExerciseKind;
      points: LiftPoint[];
    }
  >();

  for (const session of sessions) {
    const sets = setsBySession.get(session.id) ?? [];
    const byExercise = new Map<string, SetRow[]>();
    for (const set of sets) {
      const list = byExercise.get(set.exerciseId) ?? [];
      list.push(set);
      byExercise.set(set.exerciseId, list);
    }

    for (const [exerciseId, exerciseSets] of byExercise) {
      let bestWeight = 0;
      let bestReps: number | null = null;
      let volume = 0;

      for (const set of exerciseSets) {
        volume += setVolume(set.reps, set.weight);
        if (set.weight != null && set.weight > bestWeight) {
          bestWeight = set.weight;
          bestReps = set.reps;
        } else if (
          set.weight != null &&
          set.weight === bestWeight &&
          set.reps != null &&
          (bestReps == null || set.reps > bestReps)
        ) {
          bestReps = set.reps;
        }
      }

      if (bestWeight <= 0) continue;

      const meta = exerciseMeta.get(exerciseId);
      const name = meta?.name ?? exerciseId;
      const dayId = (meta?.dayId ?? (session.dayId as DayId)) as DayId;
      const kind = meta?.kind ?? "normal";

      const existing = liftPoints.get(exerciseId) ?? {
        name,
        dayId,
        kind,
        points: [] as LiftPoint[],
      };
      existing.points.push({
        date: session.performedOn,
        bestWeight,
        bestReps,
        volume: Math.round(volume),
      });
      liftPoints.set(exerciseId, existing);

      const prior = bestEver.get(exerciseId);
      if (prior == null || bestWeight > prior) {
        prs.push({
          exerciseId,
          name,
          weight: bestWeight,
          reps: bestReps,
          performedOn: session.performedOn,
          previousBest: prior ?? null,
          delta: prior != null ? Math.round((bestWeight - prior) * 100) / 100 : null,
        });
        bestEver.set(exerciseId, bestWeight);
      }
    }
  }

  const recentPrs = prs.slice(-8).reverse();

  const lifts: LiftSeries[] = [...liftPoints.entries()]
    .map(([exerciseId, data]) => ({
      exerciseId,
      name: data.name,
      dayId: data.dayId,
      kind: data.kind,
      sessionCount: data.points.length,
      points: data.points,
    }))
    .sort((a, b) => b.sessionCount - a.sessionCount || a.name.localeCompare(b.name));

  return { recentPrs, lifts };
}
