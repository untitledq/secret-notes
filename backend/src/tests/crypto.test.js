import { encrypt, decrypt } from "../crypto/cryptoService.js";

test("encrypt and decrypt roundtrip", () => {
  const key = "00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff"; // 32 bytes hex
  const text = "secret message";

  const encrypted = encrypt(text, key);
  const decrypted = decrypt(encrypted, key);

  expect(decrypted).toBe(text);
});