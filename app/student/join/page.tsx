"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function JoinPage() {
  const router = useRouter();
  const [classCode, setClassCode] = useState("");
  const [prn, setPrn] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/student/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ class_code: classCode, prn_number: prn, name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      sessionStorage.setItem("pjl_student_id", data.student_id);
      sessionStorage.setItem("pjl_class_name", data.class_name);
      sessionStorage.setItem("pjl_xp", String(data.xp));
      router.push(data.has_key ? "/student/chat" : "/student/key");
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <form
        onSubmit={handleJoin}
        className="w-full max-w-sm bg-lab-panel border border-lab-line rounded-xl p-8"
      >
        <h1 className="text-xl font-semibold mb-1">Join your class</h1>
        <p className="text-lab-dim text-sm mb-6">
          Ask your teacher for today&apos;s class code.
        </p>

        <label className="block text-xs uppercase tracking-wide text-lab-dim mb-1">
          Class code
        </label>
        <input
          value={classCode}
          onChange={(e) => setClassCode(e.target.value.toUpperCase())}
          placeholder="7XK4P"
          className="mono w-full bg-lab-bg border border-lab-line rounded-lg px-3 py-2 mb-4 tracking-widest uppercase focus:outline-none focus:border-lab-signal"
          maxLength={8}
          required
        />

        <label className="block text-xs uppercase tracking-wide text-lab-dim mb-1">
          PRN number
        </label>
        <input
          value={prn}
          onChange={(e) => setPrn(e.target.value)}
          placeholder="e.g. 24CS1042"
          className="mono w-full bg-lab-bg border border-lab-line rounded-lg px-3 py-2 mb-4 focus:outline-none focus:border-lab-signal"
          required
        />

        <label className="block text-xs uppercase tracking-wide text-lab-dim mb-1">
          Your name
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your full name"
          className="w-full bg-lab-bg border border-lab-line rounded-lg px-3 py-2 mb-6 focus:outline-none focus:border-lab-signal"
          required
        />

        {error && (
          <p className="text-lab-danger text-sm mb-4">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-lab-signal text-lab-bg font-semibold rounded-lg py-2.5 hover:opacity-90 transition disabled:opacity-50"
        >
          {loading ? "Joining..." : "Join class"}
        </button>
      </form>
    </main>
  );
}
