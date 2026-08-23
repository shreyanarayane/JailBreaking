"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function TeacherLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/teacher/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Login failed.");
        return;
      }
      router.push("/teacher/dashboard");
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-sm bg-lab-panel border border-lab-line rounded-xl p-8"
      >
        <h1 className="text-xl font-semibold mb-1">👨‍🏫 Teacher login</h1>
        <p className="text-lab-dim text-sm mb-6">
          Manage your classes and the ClassBot secret.
        </p>

        <label className="block text-xs uppercase tracking-wide text-lab-dim mb-1">
          Email
        </label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          className="w-full bg-lab-bg border border-lab-line rounded-lg px-3 py-2 mb-4 focus:outline-none focus:border-lab-signal"
          required
        />

        <label className="block text-xs uppercase tracking-wide text-lab-dim mb-1">
          Password
        </label>
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          className="w-full bg-lab-bg border border-lab-line rounded-lg px-3 py-2 mb-6 focus:outline-none focus:border-lab-signal"
          required
        />

        {error && <p className="text-lab-danger text-sm mb-4">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-lab-signal text-lab-bg font-semibold rounded-lg py-2.5 hover:opacity-90 transition disabled:opacity-50"
        >
          {loading ? "Logging in..." : "Log in"}
        </button>
      </form>
    </main>
  );
}
