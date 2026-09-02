import { LoginForm } from "@/components/LoginForm";

type Props = {
  searchParams: Promise<{ next?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const { next } = await searchParams;
  const nextPath =
    typeof next === "string" && next.startsWith("/") && !next.startsWith("//")
      ? next
      : "/";

  return (
    <main className="page login-page">
      <header className="home-hero">
        <p className="brand">Fall 2026</p>
        <h1>Unlock</h1>
        <p className="lede">Enter the app password to log workouts.</p>
      </header>
      <LoginForm nextPath={nextPath} />
    </main>
  );
}
