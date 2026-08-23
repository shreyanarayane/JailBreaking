import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getTeacherFromRequest } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const teacher = getTeacherFromRequest(req);
  if (!teacher) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const { data: klass, error: classErr } = await supabase
    .from("classes")
    .select("id, class_name, class_code, secret_code, max_attempts, active, teacher_id")
    .eq("id", params.id)
    .single();

  if (classErr || !klass || klass.teacher_id !== teacher.teacherId) {
    return NextResponse.json(
      { error: "You don't have access to that class." },
      { status: 403 }
    );
  }

  // Roster with attempt counts. Note: we deliberately select api_key_valid
  // (yes/no) and api_key_updated_at, never the key itself or its ciphertext.
  const { data: students } = await supabase
    .from("students")
    .select(
      "id, prn_number, name, xp, api_key_valid, api_key_last4, api_key_updated_at"
    )
    .eq("class_id", klass.id)
    .order("xp", { ascending: false });

  const studentIds = (students ?? []).map((s) => s.id);

  const { data: attempts } = await supabase
    .from("attempts")
    .select(
      "id, student_id, prompt, score, jailbreak_technique, feedback, created_at"
    )
    .in("student_id", studentIds.length ? studentIds : ["00000000-0000-0000-0000-000000000000"])
    .order("created_at", { ascending: false })
    .limit(200);

  const attemptsByStudent: Record<string, number> = {};
  (attempts ?? []).forEach((a) => {
    attemptsByStudent[a.student_id] = (attemptsByStudent[a.student_id] ?? 0) + 1;
  });

  return NextResponse.json({
    class: {
      id: klass.id,
      name: klass.class_name,
      class_code: klass.class_code,
      secret_code: klass.secret_code,
      max_attempts: klass.max_attempts,
      active: klass.active,
    },
    roster: (students ?? []).map((s) => ({
      ...s,
      attempt_count: attemptsByStudent[s.id] ?? 0,
    })),
    recent_attempts: attempts ?? [],
  });
}
