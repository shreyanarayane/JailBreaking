import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getTeacherFromRequest } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const teacher = getTeacherFromRequest(req);
  if (!teacher) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { class_id, new_secret, max_attempts } = await req.json();
  if (!class_id || !new_secret) {
    return NextResponse.json(
      { error: "class_id and new_secret are required." },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdmin();

  // Confirm this class actually belongs to the logged-in teacher.
  const { data: klass } = await supabase
    .from("classes")
    .select("id, teacher_id")
    .eq("id", class_id)
    .single();

  if (!klass || klass.teacher_id !== teacher.teacherId) {
    return NextResponse.json(
      { error: "You don't have access to that class." },
      { status: 403 }
    );
  }

  const update: Record<string, unknown> = {
    secret_code: new_secret.trim(),
    updated_at: new Date().toISOString(),
  };
  if (typeof max_attempts === "number") update.max_attempts = max_attempts;

  const { error } = await supabase
    .from("classes")
    .update(update)
    .eq("id", class_id);

  if (error) {
    return NextResponse.json(
      { error: "Could not update the class secret." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
