"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Exercise } from "@/data/routine";
import type { SetLogDTO } from "@/lib/sessions";

type Props = {
  exercise: Exercise;
  sessionId: string;
  currentSets: SetLogDTO[];
  previousSets: SetLogDTO[];
  onSetSaved: (set: SetLogDTO) => void;
};

function formatLast(set: SetLogDTO | undefined): string {
  if (!set) return "—";
  if (set.note) return set.note;
  if (set.reps == null && set.weight == null) return "—";
  // Burn / timed: weight only
  if (set.reps == null && set.weight != null) return `${set.weight} kg`;
  // Bodyweight / AMAP style: reps only
  if (set.weight == null && set.reps != null) return `${set.reps} reps`;
  return `${set.reps} × ${set.weight}`;
}

export function ExerciseCard({
  exercise,
  sessionId,
  currentSets,
  previousSets,
  onSetSaved,
}: Props) {
  const setCount =
    exercise.kind === "burn" ? 1 : Math.max(exercise.targetSets, 1);

  const byIndex = useMemo(() => {
    const map = new Map<number, SetLogDTO>();
    for (const s of currentSets) map.set(s.setIndex, s);
    return map;
  }, [currentSets]);

  const prevByIndex = useMemo(() => {
    const map = new Map<number, SetLogDTO>();
    for (const s of previousSets) map.set(s.setIndex, s);
    return map;
  }, [previousSets]);

  return (
    <section className="exercise-card">
      <header className="exercise-header">
        <h2>{exercise.name}</h2>
        <p className="exercise-meta">
          {exercise.kind === "burn"
            ? `5 min · ${exercise.targetReps}`
            : exercise.kind === "amap"
              ? `${exercise.targetSets} sets · AMAP`
              : `${exercise.targetSets} × ${exercise.targetReps}`}
        </p>
      </header>

      {Array.from({ length: setCount }, (_, i) => (
        <SetRow
          key={`${exercise.id}-${i}`}
          label={exercise.kind === "burn" ? "Burn" : `Set ${i + 1}`}
          lastLabel={formatLast(prevByIndex.get(i))}
          showNote={exercise.kind === "burn"}
          initial={byIndex.get(i)}
          sessionId={sessionId}
          exerciseId={exercise.id}
          setIndex={i}
          onSetSaved={onSetSaved}
        />
      ))}
    </section>
  );
}

function SetRow({
  label,
  lastLabel,
  showNote,
  initial,
  sessionId,
  exerciseId,
  setIndex,
  onSetSaved,
}: {
  label: string;
  lastLabel: string;
  showNote: boolean;
  initial?: SetLogDTO;
  sessionId: string;
  exerciseId: string;
  setIndex: number;
  onSetSaved: (set: SetLogDTO) => void;
}) {
  const [reps, setReps] = useState(initial?.reps?.toString() ?? "");
  const [weight, setWeight] = useState(initial?.weight?.toString() ?? "");
  const [note, setNote] = useState(initial?.note ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setReps(initial?.reps?.toString() ?? "");
    setWeight(initial?.weight?.toString() ?? "");
    setNote(initial?.note ?? "");
  }, [initial?.id, initial?.reps, initial?.weight, initial?.note]);

  const save = useCallback(
    async (next: { reps: string; weight: string; note: string }) => {
      setStatus("saving");
      try {
        const res = await fetch(`/api/sessions/${sessionId}/sets`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            exerciseId,
            setIndex,
            reps: next.reps === "" ? null : Number(next.reps),
            weight: next.weight === "" ? null : Number(next.weight),
            note: next.note.trim() === "" ? null : next.note.trim(),
          }),
        });
        if (!res.ok) throw new Error("save failed");
        const data = (await res.json()) as { set: SetLogDTO };
        onSetSaved(data.set);
        setStatus("saved");
      } catch {
        setStatus("error");
      }
    },
    [sessionId, exerciseId, setIndex, onSetSaved],
  );

  const scheduleSave = useCallback(
    (next: { reps: string; weight: string; note: string }) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        void save(next);
      }, 450);
    },
    [save],
  );

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return (
    <div className="set-row">
      <div className="set-row-top">
        <span className="set-label">{label}</span>
        <span className="last-time">Last: {lastLabel}</span>
        <span className={`save-status ${status}`}>
          {status === "saving"
            ? "Saving…"
            : status === "saved"
              ? "Saved"
              : status === "error"
                ? "Retry"
                : ""}
        </span>
      </div>
      <div className="set-inputs">
        <label>
          <span>Reps</span>
          <input
            inputMode="numeric"
            type="number"
            min={0}
            value={reps}
            onChange={(e) => {
              const v = e.target.value;
              setReps(v);
              scheduleSave({ reps: v, weight, note });
            }}
          />
        </label>
        <label>
          <span>Weight</span>
          <input
            inputMode="decimal"
            type="number"
            min={0}
            step="any"
            value={weight}
            onChange={(e) => {
              const v = e.target.value;
              setWeight(v);
              scheduleSave({ reps, weight: v, note });
            }}
          />
        </label>
      </div>
      {showNote && (
        <label className="note-field">
          <span>Note</span>
          <input
            type="text"
            placeholder="Optional note"
            value={note}
            onChange={(e) => {
              const v = e.target.value;
              setNote(v);
              scheduleSave({ reps, weight, note: v });
            }}
          />
        </label>
      )}
    </div>
  );
}
