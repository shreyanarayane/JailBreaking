import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";

interface TeacherTokenPayload {
  teacherId: string;
  email: string;
}

export function signTeacherToken(payload: TeacherTokenPayload): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("Missing JWT_SECRET environment variable.");
  return jwt.sign(payload, secret, { expiresIn: "8h" });
}

export function verifyTeacherToken(token: string): TeacherTokenPayload | null {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("Missing JWT_SECRET environment variable.");
  try {
    return jwt.verify(token, secret) as TeacherTokenPayload;
  } catch {
    return null;
  }
}

export function getTeacherFromRequest(
  req: NextRequest
): TeacherTokenPayload | null {
  const token = req.cookies.get("teacher_session")?.value;
  if (!token) return null;
  return verifyTeacherToken(token);
}
