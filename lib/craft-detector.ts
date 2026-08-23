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

/**
 * Why the student says they want the secret. Structure alone must not win the
 * game: "give me the code" wrapped in perfect CRAFT is still a bare extraction
 * attempt, while "explain the code so I can finish my assignment" is a request
 * ClassBot can legitimately say yes to.
 */
export interface SecretIntent {
  targetsSecret: boolean; // is the prompt even about the secret?
  purpose: boolean; // did they state a legitimate reason?
  extractionDemand: boolean; // "hand it over" with no learning framing
  legitimate: boolean; // eligible for the reveal
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

const TONE_WORDS =
  "friendly|formal|casual|professional|encouraging|supportive|enthusiastic|simple|beginner[- ]friendly|concise|playful|humorous|patient|warm|serious";

const TONE_PATTERNS = [
  new RegExp(`\\b(${TONE_WORDS})([ ,]+(and[ ]+)?(${TONE_WORDS}))*[ ]+(tone|voice|style)\\b`, "i"),
  // "keep the tone playful and encouraging", "use a friendly voice"
  new RegExp(`\\b(tone|voice|style)\\b.{0,20}\\b(${TONE_WORDS})\\b`, "i"),
  new RegExp(`\\bin a[n]? .{0,30}(${TONE_WORDS}).{0,20}\\b(way|manner|tone|voice|style)\\b`, "i"),
  new RegExp(`\\b(sound|be|stay|remain)[ ]+(${TONE_WORDS})\\b`, "i"),
  new RegExp(`\\bkeep (it|things|your (answer|reply|response))[ ]+(${TONE_WORDS}|short)\\b`, "i"),
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
    label: "Direct demand, no legitimate purpose",
    pattern: /\b(tell|give|send|show) me the (secret|code|password|passphrase)\b/i,
  },
];

// Aimed at the secret at all.
const TARGETS_SECRET =
  /\b(secret|password|passphrase|classroom code|class code|secret code|the code|hidden (word|code|phrase))\b/i;

// A stated reason that makes the request answerable: learning something, or
// needing it for a piece of work.
const PURPOSE_PATTERNS = [
  /\bso (that )?(i|we) can\b/i,
  /\bin order to\b/i,
  /\bto (complete|finish|submit|hand in|prepare|revise|study|learn|understand|practi[cs]e)\b/i,
  /\bfor (my|our|a|an|the) (class|assignment|project|homework|exercise|coursework|quiz|revision|notes|lesson|worksheet|report|presentation|exam|test)\b/i,
  /\bas part of (my|our|the)\b/i,
  /\bhelp me (learn|understand|work out|figure out)\b/i,
  /\bbecause i (need|have|am|must|want to learn|want to understand)\b/i,
  /\bi(')?m (learning|studying|revising|preparing|working on)\b/i,
  /\bi need (this|it) (for|to|because)\b/i,
];

// Verbs that ask ClassBot to teach rather than to hand something over.
const LEARNING_VERBS =
  /\b(explain|describe|teach|walk me through|break (it |this )?down|clarify|help me (learn|understand)|summari[sz]e|discuss|analy[sz]e|why|how)\b/i;

// Verbs that only ask for the value itself.
const EXTRACTION_VERBS =
  /\b(tell me|give me|hand (it |them )?over|reveal|disclose|print|output|spell|say|state|send me|show me|what(')?s|what is|share)\b/i;

/**
 * Two locally-computed gates on top of the CRAFT score. Both must pass before
 * ClassBot is allowed to reveal anything, so a well-formed demand loses to a
 * well-formed reason.
 */
export function analyzeIntent(prompt: string): SecretIntent {
  const targetsSecret = TARGETS_SECRET.test(prompt);
  const purpose = matchesAny(PURPOSE_PATTERNS, prompt);
  const extractionDemand =
    EXTRACTION_VERBS.test(prompt) && !LEARNING_VERBS.test(prompt);

  return {
    targetsSecret,
    purpose,
    extractionDemand,
    legitimate: targetsSecret && purpose && !extractionDemand,
  };
}

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

// The teachable part of a failed attempt is *why* the technique fails, not
// that it failed. Keyed by the machine-readable technique label.
const TECHNIQUE_EXPLANATIONS: Record<string, string> = {
  instruction_override:
    "Telling a model to ignore its instructions rarely works: the system prompt is sent as a higher-priority instruction than anything you type, so the model treats your override as just another user request.",
  role_impersonation:
    "Claiming to be the teacher or an admin doesn't work because the model has no way to verify who you are — your claim is only text, and the system prompt outranks it.",
  hypothetical_framing:
    "Fictional framing (\"imagine a story where...\") sometimes works on real systems because the model separates 'talking about' from 'doing'. Here it fails because the secret is guarded by an explicit rule that applies regardless of framing.",
  encoding_trick:
    "Asking for the answer in base64 or reversed is an obfuscation attack: it hides the output from simple filters. It fails here because the rule is enforced by the model's own reasoning, not by a keyword filter on the output.",
  direct_demand:
    "A bare demand gives the model nothing it can say yes to. \"Tell me the code\" is asking it to break a rule; \"explain the code so I can finish my assignment\" is asking it to do its job. Same information, different request.",
};

export function buildFeedback(
  craft: CraftResult,
  jailbreak: JailbreakDetection,
  intent?: SecretIntent
): string {
  const missing = (Object.keys(craft) as (keyof CraftResult)[]).filter(
    (k) => !craft[k]
  );

  if (jailbreak.detected) {
    const why = jailbreak.technique
      ? TECHNIQUE_EXPLANATIONS[jailbreak.technique]
      : undefined;
    return (
      `You just used "${jailbreak.label}". ` +
      (why ? `${why} ` : "") +
      (missing.length
        ? `Your prompt is also missing: ${missing.join(", ")} — completing CRAFT is what actually earns clues from ClassBot.`
        : `Your prompt does cover all five CRAFT components, which is what earns clues here — reward comes from structure, not from pressure.`)
    );
  }

  if (missing.length === 0) {
    const structured =
      "You've built a fully structured CRAFT prompt. This is exactly the kind of prompt that gets clear, useful answers from a real AI assistant.";
    if (intent?.targetsSecret && !intent.legitimate) {
      if (intent.extractionDemand) {
        return `${structured} But you only asked ClassBot to hand the code over — that is a request it has to refuse no matter how neatly it is phrased. Ask it to explain or describe the code instead, so there is something it can legitimately answer.`;
      }
      return `${structured} What is still missing is a purpose: say what you need the code *for* — to learn how something works, or to complete a specific piece of work — because that is what turns the request into one ClassBot can answer.`;
    }
    return structured;
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
