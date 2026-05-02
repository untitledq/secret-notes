import { encrypt, decrypt } from "../crypto/cryptoService.js";

test("wrong passphrase fails", () => {
    const encrypted = encrypt("hello", "correct");
    expect(() => decrypt(encrypted, "wrong")).toThrow();
});