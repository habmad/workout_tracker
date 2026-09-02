import { AppNav } from "@/components/AppNav";
import { AnalyticsClient } from "@/components/AnalyticsClient";

export default function AnalyticsPage() {
  return (
    <main className="page analytics-page">
      <AppNav />
      <header className="home-hero">
        <p className="brand">Fall 2026</p>
        <h1>Analytics</h1>
        <p className="lede">Consistency, volume, and how your lifts are moving.</p>
      </header>
      <AnalyticsClient />
    </main>
  );
}
