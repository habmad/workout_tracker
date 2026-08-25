import "dotenv/config";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { setLogs } from "../src/db/schema";

/** One-shot fix for burn rows that were seeded as reps-only by mistake. */
const FIXES: { exerciseId: string; weight: string }[] = [
  { exerciseId: "day1-seated-cable-row-or-machine-row", weight: "39" },
  { exerciseId: "day1-seated-dumbbell-curl", weight: "10" },
];

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");

  const pool = new Pool({
    connectionString,
    ssl:
      process.env.DATABASE_SSL === "false"
        ? false
        : connectionString.includes("localhost")
          ? false
          : { rejectUnauthorized: false },
  });
  const db = drizzle(pool);

  for (const fix of FIXES) {
    const updated = await db
      .update(setLogs)
      .set({ reps: null, weight: fix.weight })
      .where(
        and(eq(setLogs.exerciseId, fix.exerciseId), eq(setLogs.setIndex, 0)),
      )
      .returning({ id: setLogs.id, reps: setLogs.reps, weight: setLogs.weight });

    console.log(fix.exerciseId, updated);
  }

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
