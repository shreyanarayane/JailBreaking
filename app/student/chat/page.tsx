"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface Craft {
  role: boolean;
  context: boolean;
  action: boolean;
  format: boolean;
  tone: boolean;
}

interface Turn {
  prompt: string;
  botReply: string;
  craft: Craft;
  jailbreak: { detected: boolean; label: string | null };
  score: number;
  feedback: string;
  secretRevealed: boolean;
  bonusXp: number;
}

interface Win {
  secret: string | null;
  bonusXp: number;
}

const CRAFT_ROWS: { key: keyof Craft; label: string }[] = [
  { key: "role", label: "Role" },
  { key: "context", label: "Context" },
  { key: "action", label: "Action" },
  { key: "format", label: "Format" },
  { key: "tone", label: "Tone" },
];

export default function ChatPage() {
  const router = useRouter();
  const [studentId, setStudentId] = useState<string | null>(null);
  const [className, setClassName] = useState("");
  const [xp, setXp] = useState(0);
  const [prompt, setPrompt] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [win, setWin] = useState<Win | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = sessionStorage.getItem("pjl_student_id");
    if (!id) {
      router.push("/student/join");
      return;
    }
    setStudentId(id);
    setClassName(sessionStorage.getItem("pjl_class_name") ?? "");
    setXp(Number(sessionStorage.getItem("pjl_xp") ?? 0));
  }, [router]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!studentId || !prompt.trim() || sending) return;
    setError(null);
    setSending(true);
    const sentPrompt = prompt;
    setPrompt("");

    try {
      const res = await fetch("/api/student/attempt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_id: studentId, prompt: sentPrompt }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        setPrompt(sentPrompt);
        return;
      }
      setTurns((t) => [
        ...t,
        {
          prompt: sentPrompt,
          botReply: data.bot_reply,
          craft: data.craft,
          jailbreak: data.jailbreak,
          score: data.score,
          feedback: data.feedback,
          secretRevealed: Boolean(data.secret_revealed),
          bonusXp: data.bonus_xp ?? 0,
        },
      ]);
      setXp(data.xp);
      sessionStorage.setItem("pjl_xp", String(data.xp));
      if (data.secret_revealed) {
        setWin({
          secret: data.revealed_secret ?? null,
          bonusXp: data.bonus_xp ?? 0,
        });
      }
    } catch {
      setError("Network error — please try again.");
      setPrompt(sentPrompt);
    } finally {
      setSending(false);
    }
  }

  const latest = turns[turns.length - 1];

  return (
    <main className="min-h-screen flex flex-col">
      {win && (
        <div className="fixed inset-0 z-50 bg-lab-bg/90 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-lab-panel border border-lab-signal/50 rounded-2xl px-8 py-10 max-w-lg w-full text-center">
            <div className="text-7xl mb-4" role="img" aria-label="trophy">
              🏆
            </div>
            <h2 className="text-3xl font-bold text-lab-signal mb-2">
              Congrats, you won!
            </h2>
            <p className="text-sm text-lab-dim mb-6">
              You cracked the classroom code with a prompt ClassBot could
              legitimately answer.
            </p>
            {win.secret && (
              <>
                <p className="mono text-[10px] uppercase tracking-wide text-lab-dim mb-2">
                  The secret code is
                </p>
                <p className="mono text-4xl sm:text-5xl font-bold break-words mb-6">
                  {win.secret}
                </p>
              </>
            )}
            <p className="text-lab-signal text-sm mb-6">
              +{win.bonusXp} bonus XP · total {xp} XP
            </p>
            <button
              onClick={() => setWin(null)}
              className="bg-lab-signal text-lab-bg font-semibold rounded-lg px-6 py-2.5 hover:opacity-90 transition"
            >
              Keep practising
            </button>
          </div>
        </div>
      )}

      <header className="border-b border-lab-line px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="font-semibold">🤖 ClassBot</h1>
          <p className="text-lab-dim text-xs">{className}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="mono text-xs text-lab-dim">
            Attempts: {turns.length}
          </div>
          <div className="mono text-xs bg-lab-panel border border-lab-line rounded-full px-3 py-1 text-lab-signal">
            XP: {xp}
          </div>
          <button
            onClick={() => router.push("/student/key")}
            className="text-lab-dim text-xs underline"
          >
            Update key
          </button>
        </div>
      </header>

      <div className="flex-1 grid md:grid-cols-[1fr_320px]">
        {/* Chat column */}
        <div className="flex flex-col p-6 gap-4 max-w-2xl mx-auto w-full">
          {turns.length === 0 && (
            <div className="bg-lab-panel border border-lab-line rounded-xl p-5">
              <p className="text-sm">
                Hello! I&apos;m ClassBot. I hold a secret classroom code and I
                won&apos;t reveal it directly. Try experimenting with your
                prompts — the CRAFT panel on the right will show you what
                each attempt is missing.
              </p>
            </div>
          )}

          {turns.map((t, i) => (
            <div key={i} className="flex flex-col gap-2">
              <div className="self-end bg-lab-signal/10 border border-lab-signal/30 rounded-xl rounded-br-sm px-4 py-2.5 max-w-[85%] text-sm">
                {t.prompt}
              </div>
              <div className="self-start bg-lab-panel border border-lab-line rounded-xl rounded-bl-sm px-4 py-2.5 max-w-[85%] text-sm whitespace-pre-wrap">
                {t.botReply}
              </div>
              {t.secretRevealed && (
                <div className="self-start bg-lab-signal/10 border border-lab-signal/40 rounded-xl px-4 py-2.5 max-w-[85%] text-sm text-lab-signal">
                  🔓 Secret cracked! +{t.bonusXp} bonus XP
                </div>
              )}
            </div>
          ))}
          <div ref={bottomRef} />

          {error && <p className="text-lab-danger text-sm">{error}</p>}

          <form onSubmit={handleSend} className="mt-auto flex gap-2 pt-4">
            <input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Type your prompt here..."
              className="flex-1 bg-lab-panel border border-lab-line rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-lab-signal"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={sending || !prompt.trim()}
              className="bg-lab-signal text-lab-bg font-semibold rounded-lg px-5 hover:opacity-90 transition disabled:opacity-50"
            >
              {sending ? "..." : "Send"}
            </button>
          </form>
        </div>

        {/* CRAFT analyzer sidebar */}
        <aside className="border-t md:border-t-0 md:border-l border-lab-line p-6">
          <h2 className="mono text-xs uppercase tracking-wide text-lab-dim mb-4">
            CRAFT Analyzer
          </h2>

          <div className="flex flex-col gap-2 mb-6">
            {CRAFT_ROWS.map((row) => {
              const hit = latest?.craft[row.key];
              return (
                <div
                  key={row.key}
                  className="flex items-center justify-between bg-lab-panel border border-lab-line rounded-lg px-3 py-2"
                >
                  <span className="text-sm">{row.label}</span>
                  <span className={hit ? "text-lab-signal" : "text-lab-dim"}>
                    {hit ? "✅" : "❌"}
                  </span>
                </div>
              );
            })}
          </div>

          {latest?.jailbreak.detected && (
            <div className="bg-lab-warn/10 border border-lab-warn/30 rounded-lg p-3 mb-4">
              <p className="mono text-[10px] uppercase tracking-wide text-lab-warn mb-1">
                Technique detected
              </p>
              <p className="text-sm">{latest.jailbreak.label}</p>
            </div>
          )}

          <div className="bg-lab-bg border border-lab-line rounded-lg p-3">
            <p className="mono text-[10px] uppercase tracking-wide text-lab-dim mb-1">
              💡 Feedback
            </p>
            <p className="text-sm text-lab-dim">
              {latest?.feedback ??
                "Send a prompt to see how it scores against Role, Context, Action, Format and Tone."}
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
