"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ExerciseCard } from "@/components/ExerciseCard";
import type { WorkoutDay } from "@/data/routine";
import type { SetLogDTO } from "@/lib/sessions";
import {
  mergeExercisesWithPrefs,
  type DisplayExercise,
  type ExercisePreferenceDTO,
} from "@/lib/preference-types";

type Bundle = {
  session: {
    id: string;
    dayId: string;
    performedOn: string;
    status: string;
  };
  sets: SetLogDTO[];
  previous: {
    session: { id: string; performedOn: string };
    sets: SetLogDTO[];
  } | null;
};

export function WorkoutClient({ day }: { day: WorkoutDay }) {
  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [prefs, setPrefs] = useState<ExercisePreferenceDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [sessionRes, prefsRes] = await Promise.all([
          fetch("/api/sessions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ dayId: day.id }),
          }),
          fetch(`/api/preferences/${day.id}`),
        ]);
        if (!sessionRes.ok) throw new Error("Could not start workout");
        if (!prefsRes.ok) throw new Error("Could not load preferences");
        const data = (await sessionRes.json()) as Bundle;
        const prefsData = (await prefsRes.json()) as {
          preferences: ExercisePreferenceDTO[];
        };
        if (!cancelled) {
          setBundle(data);
          setPrefs(prefsData.preferences);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [day.id]);

  const orderedExercises = useMemo(
    () => mergeExercisesWithPrefs(day, prefs),
    [day, prefs],
  );

  const persistPrefs = useCallback(
    async (
      updates: Array<{
        exerciseId: string;
        customName?: string | null;
        sortOrder?: number;
        collapsed?: boolean;
      }>,
      optimistic: ExercisePreferenceDTO[],
    ) => {
      const previous = prefs;
      setPrefs(optimistic);
      try {
        const res = await fetch(`/api/preferences/${day.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ exercises: updates }),
        });
        if (!res.ok) throw new Error("Failed to save preferences");
        const data = (await res.json()) as {
          preferences: ExercisePreferenceDTO[];
        };
        setPrefs(data.preferences);
      } catch {
        setPrefs(previous);
        setError("Could not save preferences");
      }
    },
    [day.id, prefs],
  );

  const ensurePrefRows = useCallback(
    (list: DisplayExercise[]): ExercisePreferenceDTO[] => {
      return list.map((ex, index) => {
        const existing = prefs.find((p) => p.exerciseId === ex.id);
        return {
          exerciseId: ex.id,
          customName:
            existing?.customName ??
            (ex.name !== ex.defaultName ? ex.name : null),
          sortOrder: existing?.sortOrder ?? index,
          collapsed: existing?.collapsed ?? ex.collapsed,
        };
      });
    },
    [prefs],
  );

  const onRename = useCallback(
    (exerciseId: string, name: string) => {
      const trimmed = name.trim();
      const exercise = day.exercises.find((e) => e.id === exerciseId);
      const customName =
        !trimmed || trimmed === exercise?.name ? null : trimmed;

      const base = ensurePrefRows(orderedExercises);
      const optimistic = base.map((p) =>
        p.exerciseId === exerciseId ? { ...p, customName } : p,
      );
      void persistPrefs([{ exerciseId, customName }], optimistic);
    },
    [day.exercises, ensurePrefRows, orderedExercises, persistPrefs],
  );

  const onToggleCollapse = useCallback(
    (exerciseId: string) => {
      const current = orderedExercises.find((e) => e.id === exerciseId);
      if (!current) return;
      const collapsed = !current.collapsed;
      const base = ensurePrefRows(orderedExercises);
      const optimistic = base.map((p) =>
        p.exerciseId === exerciseId ? { ...p, collapsed } : p,
      );
      void persistPrefs([{ exerciseId, collapsed }], optimistic);
    },
    [ensurePrefRows, orderedExercises, persistPrefs],
  );

  const onMove = useCallback(
    (exerciseId: string, direction: "up" | "down") => {
      const ids = orderedExercises.map((e) => e.id);
      const index = ids.indexOf(exerciseId);
      if (index < 0) return;
      const swapWith = direction === "up" ? index - 1 : index + 1;
      if (swapWith < 0 || swapWith >= ids.length) return;

      const nextIds = [...ids];
      [nextIds[index], nextIds[swapWith]] = [nextIds[swapWith], nextIds[index]];

      const updates = nextIds.map((id, sortOrder) => ({
        exerciseId: id,
        sortOrder,
      }));

      const byId = new Map(ensurePrefRows(orderedExercises).map((p) => [p.exerciseId, p]));
      const optimistic = updates.map(({ exerciseId: id, sortOrder }) => ({
        ...byId.get(id)!,
        sortOrder,
      }));

      void persistPrefs(updates, optimistic);
    },
    [ensurePrefRows, orderedExercises, persistPrefs],
  );

  const setsByExercise = useMemo(() => {
    const map = new Map<string, SetLogDTO[]>();
    for (const s of bundle?.sets ?? []) {
      const list = map.get(s.exerciseId) ?? [];
      list.push(s);
      map.set(s.exerciseId, list);
    }
    return map;
  }, [bundle?.sets]);

  const prevByExercise = useMemo(() => {
    const map = new Map<string, SetLogDTO[]>();
    for (const s of bundle?.previous?.sets ?? []) {
      const list = map.get(s.exerciseId) ?? [];
      list.push(s);
      map.set(s.exerciseId, list);
    }
    return map;
  }, [bundle?.previous?.sets]);

  const onSetSaved = useCallback((set: SetLogDTO) => {
    setBundle((prev) => {
      if (!prev) return prev;
      const others = prev.sets.filter(
        (s) =>
          !(
            s.exerciseId === set.exerciseId && s.setIndex === set.setIndex
          ),
      );
      return { ...prev, sets: [...others, set] };
    });
  }, []);

  const complete = async () => {
    if (!bundle) return;
    setCompleting(true);
    try {
      const res = await fetch(`/api/sessions/${bundle.session.id}/complete`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to complete");
      const data = (await res.json()) as { session: Bundle["session"] };
      setBundle((prev) =>
        prev ? { ...prev, session: data.session } : prev,
      );
    } catch {
      setError("Could not mark workout complete");
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <main className="page">
        <p className="muted">Starting workout…</p>
      </main>
    );
  }

  if (error && !bundle) {
    return (
      <main className="page">
        <p className="error">{error}</p>
        <Link href="/" className="back-link">
          ← Back
        </Link>
      </main>
    );
  }

  if (!bundle) return null;

  const done = bundle.session.status === "completed";

  return (
    <main className="page workout-page">
      <header className="sticky-header">
        <Link href="/" className="back-link">
          ← Days
        </Link>
        <div>
          <p className="eyebrow">{day.label}</p>
          <h1>{day.title}</h1>
          <p className="muted">
            {bundle.session.performedOn}
            {bundle.previous
              ? ` · Last: ${bundle.previous.session.performedOn}`
              : " · First time"}
            {done ? " · Done" : ""}
          </p>
        </div>
      </header>

      {error && <p className="error">{error}</p>}

      <div className="exercise-list">
        {orderedExercises.map((exercise, index) => (
          <ExerciseCard
            key={exercise.id}
            exercise={exercise}
            sessionId={bundle.session.id}
            currentSets={setsByExercise.get(exercise.id) ?? []}
            previousSets={prevByExercise.get(exercise.id) ?? []}
            onSetSaved={onSetSaved}
            canMoveUp={index > 0}
            canMoveDown={index < orderedExercises.length - 1}
            onRename={onRename}
            onToggleCollapse={onToggleCollapse}
            onMoveUp={() => onMove(exercise.id, "up")}
            onMoveDown={() => onMove(exercise.id, "down")}
          />
        ))}
      </div>

      <div className="workout-end">
        <button
          type="button"
          className="primary-btn"
          disabled={done || completing}
          onClick={() => void complete()}
        >
          {done ? "Workout complete" : completing ? "Saving…" : "Finish workout"}
        </button>
      </div>
    </main>
  );
}
