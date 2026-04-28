import crypto from "crypto";

const ALGO = "aes-256-gcm";

export function encrypt(text, key) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, Buffer.from(key, "hex"), iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  return {
    iv: iv.toString("hex"),
    content: encrypted,
    tag: authTag.toString("hex")
  };
}

export function decrypt(data, key) {
  const decipher = crypto.createDecipheriv(
    ALGO,
    Buffer.from(key, "hex"),
    Buffer.from(data.iv, "hex")
  );

  decipher.setAuthTag(Buffer.from(data.tag, "hex"));

  let decrypted = decipher.update(data.content, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}