import { encrypt, decrypt } from "../src/crypto/cryptoService.js";

test("encrypt and decrypt roundtrip", () => {
  const key = "1234567890abcdef1234567890abcdef"; // 32 bytes hex
  const text = "secret message";

  const encrypted = encrypt(text, key);
  const decrypted = decrypt(encrypted, key);

  expect(decrypted).toBe(text);
});