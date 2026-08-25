import { and, desc, eq, lt, ne } from "drizzle-orm";
import { db } from "@/db";
import { setLogs, workoutSessions, type SetLog } from "@/db/schema";
import type { DayId } from "@/data/routine";

export function todayISO(timeZone = "UTC"): string {
  // Use local-ish date via env override or UTC; Railway/user can set TZ
  const tz = process.env.APP_TZ || timeZone;
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

export type SetLogDTO = {
  id: string;
  exerciseId: string;
  setIndex: number;
  reps: number | null;
  weight: number | null;
  note: string | null;
};

function toDTO(row: SetLog): SetLogDTO {
  return {
    id: row.id,
    exerciseId: row.exerciseId,
    setIndex: row.setIndex,
    reps: row.reps,
    weight: row.weight != null ? Number(row.weight) : null,
    note: row.note,
  };
}

export async function getPreviousCompletedSession(
  dayId: DayId,
  beforeDate: string,
) {
  const [prev] = await db
    .select()
    .from(workoutSessions)
    .where(
      and(
        eq(workoutSessions.dayId, dayId),
        eq(workoutSessions.status, "completed"),
        lt(workoutSessions.performedOn, beforeDate),
      ),
    )
    .orderBy(desc(workoutSessions.performedOn))
    .limit(1);

  if (!prev) return null;

  const logs = await db
    .select()
    .from(setLogs)
    .where(eq(setLogs.sessionId, prev.id));

  return {
    session: prev,
    sets: logs.map(toDTO),
  };
}

export async function getOrCreateTodaySession(dayId: DayId) {
  const performedOn = todayISO(process.env.APP_TZ || "Europe/Berlin");

  const [existing] = await db
    .select()
    .from(workoutSessions)
    .where(
      and(
        eq(workoutSessions.dayId, dayId),
        eq(workoutSessions.performedOn, performedOn),
        ne(workoutSessions.status, "abandoned"),
      ),
    )
    .orderBy(desc(workoutSessions.createdAt))
    .limit(1);

  if (existing) {
    const logs = await db
      .select()
      .from(setLogs)
      .where(eq(setLogs.sessionId, existing.id));

    const previous = await getPreviousCompletedSession(dayId, performedOn);

    return {
      session: existing,
      sets: logs.map(toDTO),
      previous,
    };
  }

  const [created] = await db
    .insert(workoutSessions)
    .values({
      dayId,
      performedOn,
      status: "in_progress",
    })
    .returning();

  const previous = await getPreviousCompletedSession(dayId, performedOn);

  return {
    session: created,
    sets: [] as SetLogDTO[],
    previous,
  };
}

export async function getSessionBundle(sessionId: string) {
  const [session] = await db
    .select()
    .from(workoutSessions)
    .where(eq(workoutSessions.id, sessionId))
    .limit(1);

  if (!session) return null;

  const logs = await db
    .select()
    .from(setLogs)
    .where(eq(setLogs.sessionId, sessionId));

  const previous = await getPreviousCompletedSession(
    session.dayId as DayId,
    session.performedOn,
  );

  return {
    session,
    sets: logs.map(toDTO),
    previous,
  };
}

export async function upsertSetLog(input: {
  sessionId: string;
  exerciseId: string;
  setIndex: number;
  reps: number | null;
  weight: number | null;
  note: string | null;
}) {
  const [row] = await db
    .insert(setLogs)
    .values({
      sessionId: input.sessionId,
      exerciseId: input.exerciseId,
      setIndex: input.setIndex,
      reps: input.reps,
      weight: input.weight != null ? String(input.weight) : null,
      note: input.note,
    })
    .onConflictDoUpdate({
      target: [setLogs.sessionId, setLogs.exerciseId, setLogs.setIndex],
      set: {
        reps: input.reps,
        weight: input.weight != null ? String(input.weight) : null,
        note: input.note,
      },
    })
    .returning();

  await db
    .update(workoutSessions)
    .set({ updatedAt: new Date() })
    .where(eq(workoutSessions.id, input.sessionId));

  return toDTO(row);
}

export async function completeSession(sessionId: string) {
  const [row] = await db
    .update(workoutSessions)
    .set({ status: "completed", updatedAt: new Date() })
    .where(eq(workoutSessions.id, sessionId))
    .returning();

  return row ?? null;
}
