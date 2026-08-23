"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface ClassSummary {
  id: string;
  class_name: string;
  class_code: string;
}

export default function TeacherDashboardIndex() {
  const router = useRouter();
  const [classes, setClasses] = useState<ClassSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadClasses() {
      try {
        const res = await fetch("/api/teacher/classes");
        if (!res.ok) {
          if (res.status === 401) {
            router.push("/teacher/login");
            return;
          }
          setError("Failed to load sections.");
          return;
        }
        const data = await res.json();
        if (data.classes && data.classes.length > 0) {
          router.replace(`/teacher/dashboard/${data.classes[0].id}`);
        } else {
          setClasses([]);
        }
      } catch {
        setError("Network error loading sections.");
      } finally {
        setLoading(false);
      }
    }

    loadClasses();
  }, [router]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center text-lab-dim">
        Loading sections...
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center text-lab-dim gap-4">
        <p className="text-lab-danger">{error}</p>
        <button
          onClick={() => router.push("/teacher/login")}
          className="bg-lab-panel border border-lab-line px-4 py-2 rounded-lg text-lab-text text-sm hover:border-lab-signal transition"
        >
          Back to Login
        </button>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-6 md:p-10 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">Select a Section</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {classes.map((c) => (
          <button
            key={c.id}
            onClick={() => router.push(`/teacher/dashboard/${c.id}`)}
            className="p-6 bg-lab-panel border border-lab-line rounded-xl text-left hover:border-lab-signal transition"
          >
            <h2 className="text-lg font-semibold mb-1">{c.class_name}</h2>
            <p className="text-sm mono text-lab-dim">Code: {c.class_code}</p>
          </button>
        ))}
      </div>
    </main>
  );
}
