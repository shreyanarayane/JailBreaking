import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Guards against one student hammering the "send prompt" button, which
// would otherwise burn through their own Gemini free-tier quota fast and
// hit our DB with pointless load. Scoped per-student (by student id), not
// globally, so one student never affects another's ability to play.
let ratelimit: Ratelimit | null = null;

function getRatelimit(): Ratelimit {
  if (!ratelimit) {
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
    ratelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(1, "3 s"), // 1 request per 3 seconds
      analytics: true,
      prefix: "pjl:attempt",
    });
  }
  return ratelimit;
}

export async function checkAttemptRateLimit(
  studentId: string
): Promise<{ success: boolean; retryAfterMs: number }> {
  const { success, reset } = await getRatelimit().limit(studentId);
  return { success, retryAfterMs: Math.max(0, reset - Date.now()) };
}
