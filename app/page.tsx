import Link from "next/link";

const CRAFT_LETTERS = [
  { letter: "C", word: "Role" },
  { letter: "R", word: "Context" },
  { letter: "A", word: "Action" },
  { letter: "F", word: "Format" },
  { letter: "T", word: "Tone" },
];

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      <div className="flex-1 max-w-3xl mx-auto px-6 pt-24 pb-16 flex flex-col items-center text-center">
        <div className="mono text-lab-signal text-xs tracking-[0.3em] uppercase mb-6 border border-lab-line rounded-full px-4 py-1.5">
          Classroom sandbox &middot; not a real jailbreak
        </div>

        <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight mb-4">
          🔓 Prompt Jailbreak Lab
        </h1>
        <p className="text-lab-dim text-lg max-w-xl mb-10">
          ClassBot guards a classroom secret. Your job isn&apos;t to break it —
          it&apos;s to learn why structured prompts work, one attempt at a time.
        </p>

        <div className="mono grid grid-cols-5 gap-2 mb-14 w-full max-w-md">
          {CRAFT_LETTERS.map((c) => (
            <div
              key={c.letter}
              className="bg-lab-panel border border-lab-line rounded-lg py-3 flex flex-col items-center gap-1"
            >
              <span className="text-lab-signal text-xl font-bold">{c.letter}</span>
              <span className="text-lab-dim text-[10px] uppercase tracking-wide">
                {c.word}
              </span>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
          <Link
            href="/student/join"
            className="flex-1 bg-lab-signal text-lab-bg font-semibold rounded-lg py-3 px-6 hover:opacity-90 transition shadow-signal"
          >
            I&apos;m a student
          </Link>
          <Link
            href="/teacher/login"
            className="flex-1 border border-lab-line text-lab-text rounded-lg py-3 px-6 hover:border-lab-signal/50 transition"
          >
            I&apos;m the teacher
          </Link>
        </div>
      </div>

      <footer className="mono text-center text-lab-dim text-xs pb-8">
        Each student connects their own free Gemini key — nothing is shared,
        nothing is billed to you.
      </footer>
    </main>
  );
}
