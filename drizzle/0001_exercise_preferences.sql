CREATE TABLE IF NOT EXISTS "exercise_preferences" (
	"exercise_id" text PRIMARY KEY NOT NULL,
	"day_id" text NOT NULL,
	"custom_name" text,
	"sort_order" integer NOT NULL,
	"collapsed" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
