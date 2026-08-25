"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ExerciseCard } from "@/components/ExerciseCard";
import type { WorkoutDay } from "@/data/routine";
import type { SetLogDTO } from "@/lib/sessions";

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
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dayId: day.id }),
        });
        if (!res.ok) throw new Error("Could not start workout");
        const data = (await res.json()) as Bundle;
        if (!cancelled) setBundle(data);
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
        {day.exercises.map((exercise) => (
          <ExerciseCard
            key={exercise.id}
            exercise={exercise}
            sessionId={bundle.session.id}
            currentSets={setsByExercise.get(exercise.id) ?? []}
            previousSets={prevByExercise.get(exercise.id) ?? []}
            onSetSaved={onSetSaved}
          />
        ))}
      </div>

      <footer className="workout-footer">
        <button
          type="button"
          className="primary-btn"
          disabled={done || completing}
          onClick={() => void complete()}
        >
          {done ? "Workout complete" : completing ? "Saving…" : "Finish workout"}
        </button>
      </footer>
    </main>
  );
}
