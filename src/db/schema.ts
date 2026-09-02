import {
  boolean,
  date,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

export const workoutSessions = pgTable("workout_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  dayId: text("day_id").notNull(),
  performedOn: date("performed_on").notNull(),
  status: text("status").notNull().default("in_progress"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const setLogs = pgTable(
  "set_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => workoutSessions.id, { onDelete: "cascade" }),
    exerciseId: text("exercise_id").notNull(),
    setIndex: integer("set_index").notNull(),
    reps: integer("reps"),
    weight: numeric("weight", { precision: 8, scale: 2 }),
    note: text("note"),
  },
  (table) => [
    unique("set_logs_session_exercise_set_uidx").on(
      table.sessionId,
      table.exerciseId,
      table.setIndex,
    ),
  ],
);

export const exercisePreferences = pgTable("exercise_preferences", {
  exerciseId: text("exercise_id").primaryKey(),
  dayId: text("day_id").notNull(),
  customName: text("custom_name"),
  sortOrder: integer("sort_order").notNull(),
  collapsed: boolean("collapsed").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type WorkoutSession = typeof workoutSessions.$inferSelect;
export type SetLog = typeof setLogs.$inferSelect;
export type ExercisePreference = typeof exercisePreferences.$inferSelect;
