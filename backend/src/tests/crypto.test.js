import { encrypt, decrypt } from "../crypto/cryptoService.js";

test("encrypt and decrypt roundtrip", () => {
  const passphrase = "my-secret-password";
  const text = "secret message";

  const encrypted = encrypt(text, passphrase);
  const decrypted = decrypt(encrypted, passphrase);

  expect(decrypted).toBe(text);
});