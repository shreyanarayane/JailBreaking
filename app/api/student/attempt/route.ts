import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { decrypt } from "@/lib/crypto";
import { callClassBot, GeminiKeyInvalidError } from "@/lib/gemini";
import {
  analyzeCraft,
  detectJailbreakAttempt,
  scoreAttempt,
  buildFeedback,
} from "@/lib/craft-detector";
import { checkAttemptRateLimit } from "@/lib/ratelimit";

export async function POST(req: NextRequest) {
  const { student_id, prompt, mission_id } = await req.json();

  if (!student_id || !prompt?.trim()) {
    return NextResponse.json(
      { error: "student_id and prompt are required." },
      { status: 400 }
    );
  }

  // 1. Rate limit — protects the student's own quota and our DB from spam.
  const { success, retryAfterMs } = await checkAttemptRateLimit(student_id);
  if (!success) {
    return NextResponse.json(
      {
        error: `Slow down a little — try again in ${Math.ceil(
          retryAfterMs / 1000
        )}s.`,
      },
      { status: 429 }
    );
  }

  const supabase = getSupabaseAdmin();

  // 2. Look up the student and their (encrypted) key.
  const { data: student, error: studentErr } = await supabase
    .from("students")
    .select(
      "id, class_id, gemini_api_key_encrypted, gemini_api_key_iv, gemini_api_key_tag, api_key_valid, xp"
    )
    .eq("id", student_id)
    .single();

  if (studentErr || !student) {
    return NextResponse.json({ error: "Student not found." }, { status: 404 });
  }
  if (!student.api_key_valid || !student.gemini_api_key_encrypted) {
    return NextResponse.json(
      { error: "Connect your Gemini API key before chatting with ClassBot." },
      { status: 412 }
    );
  }

  // Fetch the section's secret code
  const { data: klass } = await supabase
    .from("classes")
    .select("secret_code")
    .eq("id", student.class_id)
    .single();

  const secretCode = klass?.secret_code || "bucket biryani";

  // 3. Run CRAFT + jailbreak-pattern analysis locally (fast, free, doesn't
  // depend on Gemini being reachable).
  const craft = analyzeCraft(prompt);
  const jailbreak = detectJailbreakAttempt(prompt);
  const score = scoreAttempt(craft);
  const feedback = buildFeedback(craft, jailbreak);

  // 4. Call ClassBot using the STUDENT'S OWN decrypted key. The plaintext
  // key only ever exists in memory for the duration of this request.
  let botReply = "";
  try {
    const apiKey = decrypt({
      ciphertext: student.gemini_api_key_encrypted,
      iv: student.gemini_api_key_iv,
      tag: student.gemini_api_key_tag,
    });
    botReply = await callClassBot(apiKey, prompt, secretCode);
  } catch (err) {
    if (err instanceof GeminiKeyInvalidError) {
      await supabase
        .from("students")
        .update({ api_key_valid: false })
        .eq("id", student_id);
      return NextResponse.json(
        {
          error:
            "Your saved Gemini key no longer works. Please update it on the key page.",
        },
        { status: 412 }
      );
    }
    botReply = "(ClassBot couldn't respond right now — here's your CRAFT analysis below.)";
  }

  // 5. Store the attempt (truncate the bot reply — we only keep a snippet
  // for teacher review, not the full transcript).
  const { error: insertErr } = await supabase.from("attempts").insert({
    student_id,
    mission_id: mission_id ?? null,
    prompt,
    role_detected: craft.role,
    context_detected: craft.context,
    action_detected: craft.action,
    format_detected: craft.format,
    tone_detected: craft.tone,
    jailbreak_technique: jailbreak.technique,
    score,
    feedback,
    gemini_response_snippet: botReply.slice(0, 1500),
  });

  if (insertErr) {
    console.error("Failed to store attempt:", insertErr.message);
  }

  // 6. Award XP and return everything the UI needs.
  const newXp = student.xp + score;
  await supabase.from("students").update({ xp: newXp }).eq("id", student_id);

  return NextResponse.json({
    bot_reply: botReply,
    craft,
    jailbreak,
    score,
    feedback,
    xp: newXp,
  });
}
