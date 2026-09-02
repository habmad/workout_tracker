"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SetLogDTO } from "@/lib/sessions";
import type { DisplayExercise } from "@/lib/preference-types";

type Props = {
  exercise: DisplayExercise;
  sessionId: string;
  currentSets: SetLogDTO[];
  previousSets: SetLogDTO[];
  onSetSaved: (set: SetLogDTO) => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onRename: (exerciseId: string, name: string) => void;
  onToggleCollapse: (exerciseId: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
};

function formatLast(set: SetLogDTO | undefined): string {
  if (!set) return "—";
  if (set.note) return set.note;
  if (set.reps == null && set.weight == null) return "—";
  if (set.reps == null && set.weight != null) return `${set.weight} kg`;
  if (set.weight == null && set.reps != null) return `${set.reps} reps`;
  return `${set.reps}×${set.weight}`;
}

export function ExerciseCard({
  exercise,
  sessionId,
  currentSets,
  previousSets,
  onSetSaved,
  canMoveUp,
  canMoveDown,
  onRename,
  onToggleCollapse,
  onMoveUp,
  onMoveDown,
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

  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(exercise.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const startRename = () => {
    setDraftName(exercise.name);
    setEditing(true);
  };

  const commitRename = () => {
    setEditing(false);
    onRename(exercise.id, draftName);
  };

  const cancelRename = () => {
    setDraftName(exercise.name);
    setEditing(false);
  };

  return (
    <section
      className={`exercise-card${exercise.collapsed ? " is-collapsed" : ""}`}
    >
      <header className="exercise-header">
        <div className="exercise-title-row">
          <button
            type="button"
            className="collapse-btn"
            aria-expanded={!exercise.collapsed}
            aria-label={
              exercise.collapsed
                ? `Expand ${exercise.name}`
                : `Collapse ${exercise.name}`
            }
            onClick={() => onToggleCollapse(exercise.id)}
          >
            <span aria-hidden="true">{exercise.collapsed ? "▸" : "▾"}</span>
          </button>

          <div className="exercise-title-block">
            {editing ? (
              <input
                ref={inputRef}
                className="rename-input"
                value={draftName}
                aria-label="Exercise name"
                onChange={(e) => setDraftName(e.target.value)}
                onBlur={commitRename}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commitRename();
                  } else if (e.key === "Escape") {
                    e.preventDefault();
                    cancelRename();
                  }
                }}
              />
            ) : (
              <h2>
                <button
                  type="button"
                  className="rename-trigger"
                  onClick={startRename}
                  title="Rename exercise"
                >
                  {exercise.name}
                </button>
              </h2>
            )}
            {!exercise.collapsed && (
              <p className="exercise-meta">
                {exercise.kind === "burn"
                  ? `5 min · ${exercise.targetReps}`
                  : exercise.kind === "amap"
                    ? `${exercise.targetSets} · AMAP`
                    : `${exercise.targetSets} × ${exercise.targetReps}`}
              </p>
            )}
          </div>

          <div className="reorder-controls">
            <button
              type="button"
              className="icon-btn"
              aria-label={`Move ${exercise.name} up`}
              disabled={!canMoveUp}
              onClick={onMoveUp}
            >
              ↑
            </button>
            <button
              type="button"
              className="icon-btn"
              aria-label={`Move ${exercise.name} down`}
              disabled={!canMoveDown}
              onClick={onMoveDown}
            >
              ↓
            </button>
          </div>
        </div>
      </header>

      <div
        className="set-table"
        role="table"
        aria-label={`${exercise.name} sets`}
        hidden={exercise.collapsed}
      >
        <div className="set-table-head" role="row">
          <span role="columnheader">Set</span>
          <span role="columnheader">Last</span>
          <span role="columnheader">Reps</span>
          <span role="columnheader">kg</span>
        </div>

          {Array.from({ length: setCount }, (_, i) => {
            const initial = byIndex.get(i);
            return (
              <SetRow
                key={`${exercise.id}-${i}-${initial?.id ?? "empty"}`}
                label={exercise.kind === "burn" ? "B" : String(i + 1)}
                lastLabel={formatLast(prevByIndex.get(i))}
                showNote={exercise.kind === "burn"}
                initial={initial}
                sessionId={sessionId}
                exerciseId={exercise.id}
                setIndex={i}
                onSetSaved={onSetSaved}
              />
            );
          })}
      </div>
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
    <div className={`set-row${status === "saved" ? " is-saved" : ""}${status === "error" ? " is-error" : ""}`}>
      <div className="set-row-main" role="row">
        <span className="set-num" role="cell">
          {label}
        </span>
        <span className="last-time" role="cell" title={`Last: ${lastLabel}`}>
          {lastLabel}
        </span>
        <label className="set-field" role="cell">
          <span className="sr-only">Reps</span>
          <input
            inputMode="numeric"
            type="number"
            min={0}
            placeholder="—"
            value={reps}
            onChange={(e) => {
              const v = e.target.value;
              setReps(v);
              scheduleSave({ reps: v, weight, note });
            }}
          />
        </label>
        <label className="set-field" role="cell">
          <span className="sr-only">Weight kg</span>
          <input
            inputMode="decimal"
            type="number"
            min={0}
            step="any"
            placeholder="—"
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
          <span className="sr-only">Note</span>
          <input
            type="text"
            placeholder="Note (optional)"
            value={note}
            onChange={(e) => {
              const v = e.target.value;
              setNote(v);
              scheduleSave({ reps, weight, note: v });
            }}
          />
        </label>
      )}
      <span className={`save-status ${status}`} aria-live="polite">
        {status === "saving"
          ? "Saving…"
          : status === "saved"
            ? "Saved"
            : status === "error"
              ? "Retry"
              : ""}
      </span>
    </div>
  );
}
