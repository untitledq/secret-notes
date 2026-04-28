import crypto from "crypto";

const ALGO = "aes-256-gcm";

// Derive a 32-byte AES key from passphrase.
function deriveKey(passphrase) {
  return crypto.createHash("sha256").update(passphrase).digest();
}

export function encrypt(text, passphrase) {
  const iv = crypto.randomBytes(12);

  const cipher = crypto.createCipheriv(
      ALGO,
      deriveKey(passphrase),
      iv
  );

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  return {
    iv: iv.toString("hex"),
    content: encrypted,
    tag: authTag.toString("hex")
  };
}

export function decrypt(data, passphrase) {
  const decipher = crypto.createDecipheriv(
      ALGO,
      deriveKey(passphrase),
      Buffer.from(data.iv, "hex")
  );

  decipher.setAuthTag(Buffer.from(data.tag, "hex"));

  let decrypted = decipher.update(data.content, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}