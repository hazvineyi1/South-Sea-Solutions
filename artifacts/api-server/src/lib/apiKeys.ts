import { randomBytes, createHash } from "node:crypto";

// API keys are high-entropy random tokens, so a fast one-way hash is sufficient
// (unlike user passwords, there is nothing to brute force). We store only the
// hash and a short visible prefix used to identify the key in listings.
const PREFIX = "aftrak";

export interface GeneratedKey {
  plaintext: string;
  prefix: string;
  hash: string;
}

export function generateApiKey(): GeneratedKey {
  const random = randomBytes(24).toString("base64url");
  const plaintext = `${PREFIX}_${random}`;
  return {
    plaintext,
    prefix: plaintext.slice(0, 14),
    hash: hashApiKey(plaintext),
  };
}

export function hashApiKey(plaintext: string): string {
  return createHash("sha256").update(plaintext).digest("hex");
}
