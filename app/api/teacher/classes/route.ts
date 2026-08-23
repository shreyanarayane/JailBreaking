import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getTeacherFromRequest } from "@/lib/auth";
import crypto from "crypto";

// Short and easy to read aloud / off a projector, e.g. "SEC1-A1". Ambiguous
// characters (I, O, 0) are left out so students don't mistype them.
const CODE_LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const CODE_DIGITS = "123456789";

function pick(alphabet: string): string {
  return alphabet[crypto.randomInt(alphabet.length)];
}

function generateClassCode(prefix: string): string {
  return `${prefix}-${pick(CODE_LETTERS)}${pick(CODE_DIGITS)}`;
}

export async function GET(req: NextRequest) {
  const teacher = getTeacherFromRequest(req);
  if (!teacher) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();

  // Fetch all classes for this teacher
  let { data: classes, error } = await supabase
    .from("classes")
    .select("id, class_name, class_code, secret_code, max_attempts, active")
    .eq("teacher_id", teacher.teacherId)
    .order("class_name", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: "Could not fetch classes." },
      { status: 500 }
    );
  }

  // If no classes exist yet, automatically seed Section 1 to Section 6
  if (!classes || classes.length === 0) {
    const defaultSections = [
      { name: "Section 1", codePrefix: "SEC1" },
      { name: "Section 2", codePrefix: "SEC2" },
      { name: "Section 3", codePrefix: "SEC3" },
      { name: "Section 4", codePrefix: "SEC4" },
      { name: "Section 5", codePrefix: "SEC5" },
      { name: "Section 6", codePrefix: "SEC6" },
    ];

    const toInsert = defaultSections.map((sec) => ({
      teacher_id: teacher.teacherId,
      class_name: sec.name,
      class_code: generateClassCode(sec.codePrefix),
      secret_code: "bucket biryani",
      max_attempts: 10,
      active: true,
    }));

    const { data: inserted, error: insertErr } = await supabase
      .from("classes")
      .insert(toInsert)
      .select("id, class_name, class_code, secret_code, max_attempts, active")
      .order("class_name", { ascending: true });

    if (!insertErr && inserted) {
      classes = inserted;
    }
  }

  return NextResponse.json({ classes: classes ?? [] });
}
