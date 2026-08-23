import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSupabaseAdmin } from "@/lib/supabase";
import { signTeacherToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required." },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdmin();
  const { data: teacher, error: lookupError } = await supabase
    .from("teachers")
    .select("id, email, password_hash, name")
    .eq("email", email.trim().toLowerCase())
    .single();

  // TEMP DEBUG — remove once login works. Only visible in your terminal,
  // never sent to the browser.
  if (lookupError) {
    console.error("[teacher/login] Supabase lookup error:", lookupError.message);
  }
  if (!teacher) {
    console.error(
      "[teacher/login] No teacher row found for email:",
      email.trim().toLowerCase()
    );
  } else {
    const passwordOk = await bcrypt.compare(password, teacher.password_hash);
    console.error("[teacher/login] Teacher row found. Password match:", passwordOk);
    console.error(
      "[teacher/login] Stored hash starts with:",
      teacher.password_hash?.slice(0, 7)
    );
  }

  if (!teacher || !(await bcrypt.compare(password, teacher.password_hash))) {
    return NextResponse.json(
      { error: "Invalid email or password." },
      { status: 401 }
    );
  }

  const token = signTeacherToken({ teacherId: teacher.id, email: teacher.email });
  const res = NextResponse.json({ success: true, name: teacher.name });
  res.cookies.set("teacher_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 8, // 8 hours
    path: "/",
  });
  return res;
}
