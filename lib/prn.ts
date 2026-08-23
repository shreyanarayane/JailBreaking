// The class roster is a contiguous block of PRNs, so membership is a range
// check rather than a list. Shared by the join form and the join API — the
// API check is the authoritative one.
export const PRN_MIN = 202621001;
export const PRN_MAX = 202621495;

export interface PrnCheck {
  valid: boolean;
  prn?: string; // normalized (trimmed) value to store
  error?: string;
}

export function validatePrn(raw: string): PrnCheck {
  const prn = raw.trim();

  if (!/^\d+$/.test(prn)) {
    return {
      valid: false,
      error: `Your PRN should be a 9-digit number between ${PRN_MIN} and ${PRN_MAX}.`,
    };
  }

  const value = Number(prn);
  if (value < PRN_MIN || value > PRN_MAX) {
    return {
      valid: false,
      error: `PRN ${prn} isn't on this class roster. Valid PRNs run from ${PRN_MIN} to ${PRN_MAX}.`,
    };
  }

  return { valid: true, prn };
}
