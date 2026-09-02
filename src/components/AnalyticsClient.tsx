"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AnalyticsPayload, LiftSeries } from "@/lib/analytics";

function formatWeight(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function formatDate(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function formatVolume(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return String(n);
}

const chartTooltipStyle = {
  background: "#1c2018",
  border: "1px solid #2e3528",
  borderRadius: 10,
  color: "#eef1e6",
  fontSize: 12,
};

export function AnalyticsClient() {
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/analytics");
        if (!res.ok) throw new Error("Failed to load analytics");
        const payload = (await res.json()) as AnalyticsPayload;
        if (cancelled) return;
        setData(payload);
        setSelectedExerciseId(payload.lifts[0]?.exerciseId ?? null);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Something went wrong");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedLift: LiftSeries | null = useMemo(() => {
    if (!data || !selectedExerciseId) return null;
    return data.lifts.find((l) => l.exerciseId === selectedExerciseId) ?? null;
  }, [data, selectedExerciseId]);

  const maxSplit = useMemo(() => {
    if (!data) return 1;
    return Math.max(1, ...data.splitBalance.map((d) => d.count));
  }, [data]);

  if (loading) {
    return <p className="muted analytics-status">Loading trends…</p>;
  }

  if (error) {
    return <p className="error">{error}</p>;
  }

  if (!data || data.summary.lastWorkoutDate == null) {
    return (
      <section className="analytics-empty">
        <p className="muted">
          Finish a workout to unlock trends — volume, PRs, and lift progress will
          show up here.
        </p>
        <Link href="/" className="primary-btn analytics-empty-cta">
          Go to Workouts
        </Link>
      </section>
    );
  }

  const { summary, weeklyVolume, recentPrs, splitBalance, lifts } = data;
  const hasVolume = weeklyVolume.some((w) => w.volumeKg > 0);

  return (
    <div className="analytics-stack">
      <section className="stat-grid" aria-label="Summary">
        <div className="stat-card">
          <span className="stat-label">This week</span>
          <span className="stat-value">{summary.workoutsThisWeek}</span>
          <span className="stat-hint">workouts</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Last 28 days</span>
          <span className="stat-value">{summary.workoutsLast28Days}</span>
          <span className="stat-hint">workouts</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Weekly streak</span>
          <span className="stat-value">{summary.weeklyStreak}</span>
          <span className="stat-hint">
            {summary.weeklyStreak === 1 ? "week" : "weeks"}
          </span>
        </div>
      </section>

      <section className="analytics-panel">
        <header className="analytics-panel-header">
          <h2>Weekly volume</h2>
          <p className="muted">Total kg × reps over the last 12 weeks</p>
        </header>
        {hasVolume ? (
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={weeklyVolume} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "var(--muted)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fill: "var(--muted)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={formatVolume}
                />
                <Tooltip
                  contentStyle={chartTooltipStyle}
                  cursor={{ fill: "color-mix(in srgb, var(--accent) 12%, transparent)" }}
                  formatter={(value) => [
                    `${Number(value).toLocaleString()} kg`,
                    "Volume",
                  ]}
                  labelFormatter={(label, payload) => {
                    const point = payload?.[0]?.payload as
                      | { workouts?: number }
                      | undefined;
                    const workouts = point?.workouts ?? 0;
                    return `${label} · ${workouts} workout${workouts === 1 ? "" : "s"}`;
                  }}
                />
                <Bar
                  dataKey="volumeKg"
                  fill="var(--accent)"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={28}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="muted analytics-panel-empty">
            Log weight and reps to track volume.
          </p>
        )}
      </section>

      <section className="analytics-panel">
        <header className="analytics-panel-header">
          <h2>Recent PRs</h2>
          <p className="muted">New best weights on an exercise</p>
        </header>
        {recentPrs.length === 0 ? (
          <p className="muted analytics-panel-empty">No PRs yet.</p>
        ) : (
          <ul className="pr-list">
            {recentPrs.map((pr) => (
              <li key={`${pr.exerciseId}-${pr.performedOn}-${pr.weight}`}>
                <div className="pr-main">
                  <span className="pr-name">{pr.name}</span>
                  <span className="pr-lift">
                    {formatWeight(pr.weight)} kg
                    {pr.reps != null ? ` × ${pr.reps}` : ""}
                  </span>
                </div>
                <div className="pr-meta">
                  <span>{formatDate(pr.performedOn)}</span>
                  {pr.delta != null && pr.delta > 0 ? (
                    <span className="pr-delta">+{formatWeight(pr.delta)} kg</span>
                  ) : (
                    <span className="pr-delta first">First logged</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="analytics-panel">
        <header className="analytics-panel-header">
          <h2>Lift progress</h2>
          <p className="muted">Best set weight across sessions</p>
        </header>
        {lifts.length === 0 ? (
          <p className="muted analytics-panel-empty">
            No weighted lifts logged yet.
          </p>
        ) : (
          <>
            <label className="lift-select-label">
              <span className="sr-only">Exercise</span>
              <select
                className="lift-select"
                value={selectedExerciseId ?? ""}
                onChange={(e) => setSelectedExerciseId(e.target.value)}
              >
                {lifts.map((lift) => (
                  <option key={lift.exerciseId} value={lift.exerciseId}>
                    {lift.name} ({lift.sessionCount})
                  </option>
                ))}
              </select>
            </label>
            {selectedLift && selectedLift.points.length > 0 ? (
              <div className="chart-wrap">
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart
                    data={selectedLift.points}
                    margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
                  >
                    <CartesianGrid
                      stroke="var(--border)"
                      strokeDasharray="3 3"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "var(--muted)", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={formatDate}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fill: "var(--muted)", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      domain={["auto", "auto"]}
                      tickFormatter={(v) => formatWeight(Number(v))}
                    />
                    <Tooltip
                      contentStyle={chartTooltipStyle}
                      labelFormatter={(label) => formatDate(String(label))}
                      formatter={(value, _name, item) => {
                        const point = item?.payload as
                          | { bestReps?: number | null }
                          | undefined;
                        const reps =
                          point?.bestReps != null ? ` × ${point.bestReps}` : "";
                        return [`${formatWeight(Number(value))} kg${reps}`, "Best"];
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="bestWeight"
                      stroke="var(--accent)"
                      strokeWidth={2.5}
                      dot={{ r: 3.5, fill: "var(--accent)", strokeWidth: 0 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : null}
          </>
        )}
      </section>

      <section className="analytics-panel">
        <header className="analytics-panel-header">
          <h2>Split balance</h2>
          <p className="muted">Completed sessions by day</p>
        </header>
        <ul className="split-list">
          {splitBalance.map((day) => (
            <li key={day.dayId}>
              <div className="split-row">
                <span className="split-label">
                  <span className="day-label">{day.label}</span>
                  <span className="split-title">{day.title}</span>
                </span>
                <span className="split-count">{day.count}</span>
              </div>
              <div className="split-bar-track" aria-hidden>
                <div
                  className="split-bar-fill"
                  style={{ width: `${(day.count / maxSplit) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
