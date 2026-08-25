import { count, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { parseWorkoutInfo } from "@/lib/parseWorkoutInfo";
import { setLogs, workoutSessions } from "./schema";

/** Day 1 CSV "Workout info" seed — prior lifts for last-time display.
 * Normal sets: (reps, kg). Burn / timed blocks: (, kg) — weight only, no reps.
 */
const DAY1_SEED: Record<string, string> = {
  "day1-deadlift": "(5,60)(5,60)",
  "day1-one-arm-dumbbell-row": "(12,24)(10,26)(11,26)",
  "day1-wide-grip-pull-up-or-lat-pull-down": "(12,45)(10,45)(10,45)",
  "day1-barbell-row": "(12,20)(12,40)(12,40)",
  "day1-seated-cable-row-or-machine-row": "(,39)",
  "day1-concentration-curl": "(10,10) (10,10) (10,10)",
  "day1-seated-dumbbell-curl": "(,10)",
};

function yesterdayISO(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function seedDay1IfEmpty(db: NodePgDatabase<any>) {
  const [{ value: existing }] = await db
    .select({ value: count() })
    .from(workoutSessions);

  if (Number(existing) > 0) {
    console.log("Seed skipped — sessions already exist.");
    return;
  }

  console.log("Seeding Day 1 prior session from CSV...");

  const [session] = await db
    .insert(workoutSessions)
    .values({
      dayId: "day1",
      performedOn: yesterdayISO(),
      status: "completed",
    })
    .returning();

  const rows: (typeof setLogs.$inferInsert)[] = [];

  for (const [exerciseId, raw] of Object.entries(DAY1_SEED)) {
    const sets = parseWorkoutInfo(raw);
    sets.forEach((set, setIndex) => {
      rows.push({
        sessionId: session.id,
        exerciseId,
        setIndex,
        reps: set.reps,
        weight: set.weight != null ? String(set.weight) : null,
        note: null,
      });
    });
  }

  if (rows.length > 0) {
    await db.insert(setLogs).values(rows);
  }

  console.log(
    `Seeded completed Day 1 session ${session.id} with ${rows.length} set logs.`,
  );
}

export async function ensureSeeded() {
  const { db } = await import("./index");
  const existing = await db
    .select({ id: workoutSessions.id })
    .from(workoutSessions)
    .where(eq(workoutSessions.dayId, "day1"))
    .limit(1);

  if (existing.length === 0) {
    await seedDay1IfEmpty(db);
  }
}
