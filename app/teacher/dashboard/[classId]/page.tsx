"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface RosterRow {
  id: string;
  prn_number: string;
  name: string;
  xp: number;
  api_key_valid: boolean;
  api_key_last4: string | null;
  api_key_updated_at: string | null;
  attempt_count: number;
}

interface ClassInfo {
  id: string;
  name: string;
  class_code: string;
  secret_code: string;
  max_attempts: number;
  active: boolean;
}

interface ClassSummary {
  id: string;
  class_name: string;
  class_code: string;
}

export default function TeacherDashboard({
  params,
}: {
  params: { classId: string };
}) {
  const router = useRouter();
  const [sections, setSections] = useState<ClassSummary[]>([]);
  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null);
  const [roster, setRoster] = useState<RosterRow[]>([]);
  const [newSecret, setNewSecret] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load all sections for tab navigation
  useEffect(() => {
    async function loadSections() {
      try {
        const res = await fetch("/api/teacher/classes");
        if (res.ok) {
          const data = await res.json();
          setSections(data.classes ?? []);
        }
      } catch (err) {
        console.error("Error loading sections:", err);
      }
    }
    loadSections();
  }, []);

  const loadClassData = useCallback(async () => {
    if (!params.classId || params.classId === "select") {
      router.replace("/teacher/dashboard");
      return;
    }

    try {
      const res = await fetch(`/api/teacher/class/${params.classId}`);
      if (res.status === 401) {
        router.push("/teacher/login");
        return;
      }
      if (res.status === 403 || res.status === 404) {
        router.replace("/teacher/dashboard");
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setClassInfo(data.class);
        setRoster(data.roster);
      }
    } catch (err) {
      console.error("Error fetching class:", err);
    } finally {
      setLoading(false);
    }
  }, [params.classId, router]);

  useEffect(() => {
    loadClassData();
    const interval = setInterval(loadClassData, 10000);
    return () => clearInterval(interval);
  }, [loadClassData]);

  async function updateSecret() {
    if (!classInfo || !newSecret.trim()) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/teacher/secret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ class_id: classInfo.id, new_secret: newSecret }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "Could not update secret.");
        return;
      }
      setMessage("Secret updated.");
      setNewSecret("");
      loadClassData();
    } finally {
      setSaving(false);
    }
  }

  if (loading && !classInfo) {
    return (
      <main className="min-h-screen flex items-center justify-center text-lab-dim">
        Loading section...
      </main>
    );
  }

  if (!classInfo) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center text-lab-dim gap-4">
        <p>Section not found.</p>
        <Link
          href="/teacher/dashboard"
          className="bg-lab-panel border border-lab-line px-4 py-2 rounded-lg text-lab-text text-sm hover:border-lab-signal transition"
        >
          Go to Sections List
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-6 md:p-10 max-w-5xl mx-auto">
      {/* Sections switcher tabs */}
      {sections.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2 border-b border-lab-line pb-4">
          {sections.map((sec) => {
            const isCurrent = sec.id === params.classId;
            return (
              <button
                key={sec.id}
                onClick={() => router.push(`/teacher/dashboard/${sec.id}`)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  isCurrent
                    ? "bg-lab-signal text-lab-bg font-semibold shadow-sm"
                    : "bg-lab-panel text-lab-dim border border-lab-line hover:border-lab-signal hover:text-lab-text"
                }`}
              >
                {sec.class_name}
              </button>
            );
          })}
        </div>
      )}

      <header className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{classInfo.name}</h1>
          <p className="mono text-lab-dim text-sm mt-1">
            Class code: <span className="text-lab-signal font-bold">{classInfo.class_code}</span>{" "}
            (Give this to students to join this section)
          </p>
        </div>
      </header>

      <section className="bg-lab-panel border border-lab-line rounded-xl p-6 mb-8">
        <h2 className="font-semibold mb-4">🔐 Classroom secret</h2>
        <p className="text-lab-dim text-sm mb-4">
          Current: <span className="mono text-lab-text bg-lab-bg px-2 py-1 rounded border border-lab-line">{classInfo.secret_code}</span>
        </p>
        <div className="flex gap-2 max-w-md">
          <input
            value={newSecret}
            onChange={(e) => setNewSecret(e.target.value)}
            placeholder="New secret code"
            className="mono flex-1 bg-lab-bg border border-lab-line rounded-lg px-3 py-2 focus:outline-none focus:border-lab-signal"
          />
          <button
            onClick={updateSecret}
            disabled={saving || !newSecret.trim()}
            className="bg-lab-signal text-lab-bg font-semibold rounded-lg px-5 hover:opacity-90 transition disabled:opacity-50"
          >
            {saving ? "Saving..." : "Update"}
          </button>
        </div>
        {message && <p className="text-lab-signal text-sm mt-3">{message}</p>}
      </section>

      <section className="bg-lab-panel border border-lab-line rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">📊 Section Roster ({roster.length} students)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-lab-dim border-b border-lab-line">
                <th className="py-2 pr-4">PRN</th>
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Key</th>
                <th className="py-2 pr-4">Attempts</th>
                <th className="py-2 pr-4">XP</th>
              </tr>
            </thead>
            <tbody>
              {roster.map((s) => (
                <tr key={s.id} className="border-b border-lab-line/50 hover:bg-lab-bg/40">
                  <td className="mono py-2.5 pr-4">{s.prn_number}</td>
                  <td className="py-2.5 pr-4">{s.name}</td>
                  <td className="py-2.5 pr-4">
                    {s.api_key_valid ? (
                      <span className="text-lab-signal font-medium">
                        Connected (…{s.api_key_last4})
                      </span>
                    ) : (
                      <span className="text-lab-dim">Not connected</span>
                    )}
                  </td>
                  <td className="py-2.5 pr-4">{s.attempt_count}</td>
                  <td className="py-2.5 pr-4 font-mono font-semibold">{s.xp}</td>
                </tr>
              ))}
              {roster.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-lab-dim">
                    No students have joined this section yet. Share class code <span className="mono text-lab-signal font-bold">{classInfo.class_code}</span> with students.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
