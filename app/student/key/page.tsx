"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function KeyPage() {
  const router = useRouter();
  const [studentId, setStudentId] = useState<string | null>(null);
  const [key, setKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const id = sessionStorage.getItem("pjl_student_id");
    if (!id) {
      router.push("/student/join");
      return;
    }
    setStudentId(id);
  }, [router]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!studentId) return;
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const res = await fetch("/api/student/key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_id: studentId, gemini_api_key: key }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      setSuccess(`Key saved (ending in ${data.key_last4}). Redirecting...`);
      setKey("");
      setTimeout(() => router.push("/student/chat"), 900);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <form
        onSubmit={handleSave}
        className="w-full max-w-md bg-lab-panel border border-lab-line rounded-xl p-8"
      >
        <h1 className="text-xl font-semibold mb-1">🔑 Connect your Gemini key</h1>
        <p className="text-lab-dim text-sm mb-6">
          Free and personal — nothing here gets billed, and your key is
          encrypted the moment it reaches our server.
        </p>

        <label className="block text-xs uppercase tracking-wide text-lab-dim mb-1">
          Gemini API key
        </label>
        <input
          value={key}
          onChange={(e) => setKey(e.target.value)}
          type="password"
          placeholder="AIza..."
          className="mono w-full bg-lab-bg border border-lab-line rounded-lg px-3 py-2 mb-3 focus:outline-none focus:border-lab-signal"
          required
        />

        <a
          href="https://aistudio.google.com/apikey"
          target="_blank"
          rel="noreferrer"
          className="text-lab-signal text-xs underline mb-6 inline-block"
        >
          Get a free key at aistudio.google.com/apikey →
        </a>

        {error && <p className="text-lab-danger text-sm mb-4">{error}</p>}
        {success && <p className="text-lab-signal text-sm mb-4">{success}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-lab-signal text-lab-bg font-semibold rounded-lg py-2.5 hover:opacity-90 transition disabled:opacity-50"
        >
          {loading ? "Validating..." : "Save & continue"}
        </button>

        <p className="text-lab-dim text-xs mt-4">
          You can come back and update this key any time from this same page.
        </p>
      </form>
    </main>
  );
}
