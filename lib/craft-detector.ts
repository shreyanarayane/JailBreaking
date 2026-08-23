// Rule-based CRAFT analysis. Deliberately NOT delegated to Gemini —
// keeping it local means: (1) it's free and instant, (2) it's consistent
// and explainable to students, (3) it still works if a student's key is
// invalid or Gemini is rate-limited.

export interface CraftResult {
  role: boolean;
  context: boolean;
  action: boolean;
  format: boolean;
  tone: boolean;
}

export interface JailbreakDetection {
  detected: boolean;
  technique: string | null; // machine-readable label, e.g. "instruction_override"
  label: string | null; // human-readable, shown to the student
}

const ROLE_PATTERNS = [
  /\bact as\b/i,
  /\byou are (a|an|the)\b/i,
  /\bpretend (to be|you('| a)re)\b/i,
  /\bas a\b.{0,20}\b(teacher|student|expert|assistant|analyst)\b/i,
  /\btake on the role\b/i,
];

const CONTEXT_PATTERNS = [
  /\bi('| a)m a\b/i,
  /\bi need this (for|because)\b/i,
  /\bfor (my|a|an) (class|assignment|project|homework|exercise)\b/i,
  /\bbecause\b/i,
  /\bthe (reason|context) is\b/i,
  /\bi'?m (doing|working on)\b/i,
];

const ACTION_PATTERNS = [
  /\b(explain|describe|list|summarize|generate|write|show|tell me|give me|provide)\b/i,
  /\bwhat (information )?can you (reveal|share|tell)\b/i,
];

const FORMAT_PATTERNS = [
  /\bas a (table|list|bullet|json|paragraph|numbered list)\b/i,
  /\bin (the form of|the format of|bullet points|a table|json)\b/i,
  /\b(format|structure) (it|your answer|the response) as\b/i,
  /\busing (bullet points|headings|numbered steps)\b/i,
];

const TONE_PATTERNS = [
  /\b(friendly|formal|casual|professional|encouraging|simple|beginner[- ]friendly|concise|playful) tone\b/i,
  /\bin a (friendly|formal|casual|professional|simple|playful) (way|manner|tone)\b/i,
  /\bkeep it (simple|short|friendly|professional)\b/i,
];

function matchesAny(patterns: RegExp[], text: string): boolean {
  return patterns.some((p) => p.test(text));
}

export function analyzeCraft(prompt: string): CraftResult {
  return {
    role: matchesAny(ROLE_PATTERNS, prompt),
    context: matchesAny(CONTEXT_PATTERNS, prompt),
    action: matchesAny(ACTION_PATTERNS, prompt),
    format: matchesAny(FORMAT_PATTERNS, prompt),
    tone: matchesAny(TONE_PATTERNS, prompt),
  };
}

// Sandbox jailbreak-technique classifier. This is about teaching students
// to recognize manipulation patterns against the FICTIONAL ClassBot game —
// not a tool for testing real model safeguards.
const JAILBREAK_PATTERNS: { technique: string; label: string; pattern: RegExp }[] = [
  {
    technique: "instruction_override",
    label: "Instruction override",
    pattern: /\b(ignore|disregard|forget)\b.{0,30}\b(previous|prior|earlier|above)\b.{0,20}\b(instructions?|rules?|prompt)\b/i,
  },
  {
    technique: "role_impersonation",
    label: "Authority impersonation",
    pattern: /\b(i am|i'm)\b.{0,20}\b(the teacher|the admin|your developer|an admin|the owner)\b/i,
  },
  {
    technique: "hypothetical_framing",
    label: "Hypothetical / fictional framing",
    pattern: /\b(hypothetically|in a fictional|imagine if|in a story where|for a movie script)\b/i,
  },
  {
    technique: "encoding_trick",
    label: "Encoding / obfuscation attempt",
    pattern: /\b(base64|rot13|in reverse|spelled backwards|encode the (secret|answer))\b/i,
  },
  {
    technique: "direct_demand",
    label: "Direct demand, no structure",
    pattern: /\b(tell|give) me the (secret|code|password)\b/i,
  },
];

export function detectJailbreakAttempt(prompt: string): JailbreakDetection {
  for (const { technique, label, pattern } of JAILBREAK_PATTERNS) {
    if (pattern.test(prompt)) {
      return { detected: true, technique, label };
    }
  }
  return { detected: false, technique: null, label: null };
}

export function scoreAttempt(craft: CraftResult): number {
  const weights = { role: 20, context: 20, action: 20, format: 20, tone: 20 };
  let score = 0;
  (Object.keys(craft) as (keyof CraftResult)[]).forEach((k) => {
    if (craft[k]) score += weights[k];
  });
  return score;
}

export function buildFeedback(
  craft: CraftResult,
  jailbreak: JailbreakDetection
): string {
  const missing = (Object.keys(craft) as (keyof CraftResult)[]).filter(
    (k) => !craft[k]
  );

  if (jailbreak.detected) {
    return (
      `Nice attempt! You are testing "${jailbreak.label}". ` +
      `ClassBot won't reveal the classroom secret this way, but let's look at your prompt's structure. ` +
      (missing.length
        ? `You're still missing: ${missing.join(", ")}.`
        : `You actually hit all five CRAFT components — the technique just isn't how ClassBot is designed to respond.`)
    );
  }

  if (missing.length === 0) {
    return "You've built a fully structured CRAFT prompt. This is exactly the kind of prompt that gets clear, useful answers from a real AI assistant.";
  }

  const tips: Record<keyof CraftResult, string> = {
    role: "Try giving ClassBot a role to play, e.g. \"Act as a...\"",
    context: "Add context: who you are and why you need this.",
    action: "State the action clearly: what exactly should ClassBot do?",
    format: "Specify a format, e.g. \"as a table\" or \"as a numbered list\".",
    tone: "Mention a tone, e.g. \"in a friendly, simple tone\".",
  };

  return `Good start. Next, try: ${missing.map((k) => tips[k]).join(" ")}`;
}
