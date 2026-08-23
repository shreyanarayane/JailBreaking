import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { validatePrn } from "@/lib/prn";

export async function POST(req: NextRequest) {
  const { class_code, prn_number, name } = await req.json();

  if (!class_code || !prn_number || !name) {
    return NextResponse.json(
      { error: "class_code, prn_number and name are all required." },
      { status: 400 }
    );
  }

  const prnCheck = validatePrn(String(prn_number));
  if (!prnCheck.valid) {
    return NextResponse.json({ error: prnCheck.error }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  const { data: klass, error: classErr } = await supabase
    .from("classes")
    .select("id, class_name, active, secret_code")
    .eq("class_code", class_code.trim().toUpperCase())
    .single();

  if (classErr || !klass) {
    return NextResponse.json(
      { error: "That class code wasn't found. Double-check with your teacher." },
      { status: 404 }
    );
  }
  if (!klass.active) {
    return NextResponse.json(
      { error: "This class session isn't active right now." },
      { status: 403 }
    );
  }

  // Upsert so a student can rejoin without creating duplicate rows.
  const { data: student, error: studentErr } = await supabase
    .from("students")
    .upsert(
      {
        class_id: klass.id,
        prn_number: prnCheck.prn,
        name: name.trim(),
      },
      { onConflict: "class_id,prn_number", ignoreDuplicates: false }
    )
    .select("id, api_key_valid, api_key_last4, xp")
    .single();

  if (studentErr || !student) {
    return NextResponse.json(
      { error: "Could not join the class. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    student_id: student.id,
    class_name: klass.class_name,
    has_key: student.api_key_valid,
    key_last4: student.api_key_last4,
    xp: student.xp,
  });
}
