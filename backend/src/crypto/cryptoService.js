import crypto from "crypto"; // Node.js built-in crypto module for encryption primitives

const ALGO = "aes-256-gcm"; // authenticated encryption algorithm (confidentiality + integrity)

// Derives a fixed 32-byte key from a passphrase using SHA-256
function deriveKey(passphrase) {
  return crypto.createHash("sha256").update(passphrase).digest();
}

export function encrypt(text, passphrase) {
  const iv = crypto.randomBytes(12); // random 96-bit IV required for AES-GCM

  const cipher = crypto.createCipheriv(
      ALGO,
      deriveKey(passphrase), // symmetric key derived from passphrase
      iv // initialization vector ensures uniqueness per encryption
  );

  let encrypted = cipher.update(text, "utf8", "hex"); // encrypt input text
  encrypted += cipher.final("hex"); // finalize encryption stream

  const authTag = cipher.getAuthTag(); // authentication tag for integrity verification

  return {
    iv: iv.toString("hex"), // IV stored as hex string for persistence
    content: encrypted, // encrypted ciphertext
    tag: authTag.toString("hex") // auth tag used during decryption
  };
}

export function decrypt(data, passphrase) {
  const decipher = crypto.createDecipheriv(
      ALGO,
      deriveKey(passphrase), // same derived key must be used for decryption
      Buffer.from(data.iv, "hex") // reconstruct IV from stored hex
  );

  decipher.setAuthTag(Buffer.from(data.tag, "hex")); // set authentication tag for integrity check

  let decrypted = decipher.update(data.content, "hex", "utf8"); // decrypt ciphertext
  decrypted += decipher.final("utf8"); // finalize and verify integrity

  return decrypted; // returns original plaintext if authentication succeeds
}