import crypto from "crypto";

// AES-256-GCM: authenticated encryption, so tampering with ciphertext is
// detectable, not just decryptable-into-garbage.
//
// ENCRYPTION_KEY must be a 64-char hex string (32 bytes). Generate once with:
//   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
// Store it only in Vercel's environment variables — never in the database,
// never in git. If you ever rotate it, every existing stored key becomes
// undecryptable, so students would need to re-enter their keys.

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      "ENCRYPTION_KEY must be set to a 64-character hex string (32 bytes)."
    );
  }
  return Buffer.from(hex, "hex");
}

export interface EncryptedPayload {
  ciphertext: string; // base64
  iv: string; // base64
  tag: string; // base64
}

export function encrypt(plaintext: string): EncryptedPayload {
  const key = getKey();
  const iv = crypto.randomBytes(12); // 96-bit IV is recommended for GCM
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return {
    ciphertext: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
  };
}

export function decrypt(payload: EncryptedPayload): string {
  const key = getKey();
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(payload.iv, "base64")
  );
  decipher.setAuthTag(Buffer.from(payload.tag, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, "base64")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

// Only ever show this in the UI — never the full key, never round-tripped
// back to the browser.
export function last4(key: string): string {
  return key.slice(-4);
}
