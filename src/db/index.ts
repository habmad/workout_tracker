import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

declare global {
  // eslint-disable-next-line no-var
  var __workoutPgPool: Pool | undefined;
}

function createPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  return new Pool({
    connectionString,
    // Railway / managed Postgres often needs SSL
    ssl:
      process.env.DATABASE_SSL === "false"
        ? false
        : connectionString.includes("localhost")
          ? false
          : { rejectUnauthorized: false },
  });
}

const pool = global.__workoutPgPool ?? createPool();

if (process.env.NODE_ENV !== "production") {
  global.__workoutPgPool = pool;
}

export const db = drizzle(pool, { schema });
export { pool };
