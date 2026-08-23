import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { encrypt, last4 } from "@/lib/crypto";
import { validateGeminiKey } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  const { student_id, gemini_api_key } = await req.json();

  if (!student_id || !gemini_api_key) {
    return NextResponse.json(
      { error: "student_id and gemini_api_key are required." },
      { status: 400 }
    );
  }

  const trimmedKey = gemini_api_key.trim();

  // Confirm the key actually works BEFORE saving anything, so students get
  // immediate feedback instead of a silent failure mid-game.
  const validationResult = await validateGeminiKey(trimmedKey);
  if (!validationResult.valid) {
    return NextResponse.json(
      {
        error:
          validationResult.error ??
          "That key didn't work. Get a free key at aistudio.google.com/apikey and make sure you copied the whole thing.",
      },
      { status: 400 }
    );
  }

  const { ciphertext, iv, tag } = encrypt(trimmedKey);
  const supabase = getSupabaseAdmin();

  const { error } = await supabase
    .from("students")
    .update({
      gemini_api_key_encrypted: ciphertext,
      gemini_api_key_iv: iv,
      gemini_api_key_tag: tag,
      api_key_last4: last4(trimmedKey),
      api_key_valid: true,
      api_key_updated_at: new Date().toISOString(),
    })
    .eq("id", student_id);

  if (error) {
    return NextResponse.json(
      { error: "Key was valid but could not be saved. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, key_last4: last4(trimmedKey) });
}
