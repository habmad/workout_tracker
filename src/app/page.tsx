import Link from "next/link";
import { ROUTINE } from "@/data/routine";

export default function HomePage() {
  return (
    <main className="page home-page">
      <header className="home-hero">
        <p className="brand">Fall 2026</p>
        <h1>Workout</h1>
        <p className="lede">Pick today&apos;s day. Last week&apos;s lifts show as you log.</p>
      </header>

      <nav className="day-list" aria-label="Workout days">
        {ROUTINE.map((day) => (
          <Link
            key={day.id}
            href={`/workout/${day.id}`}
            className="day-card"
          >
            <span className="day-label">{day.label}</span>
            <span className="day-title">{day.title}</span>
            <span className="day-count">{day.exercises.length} exercises</span>
          </Link>
        ))}
      </nav>
    </main>
  );
}
