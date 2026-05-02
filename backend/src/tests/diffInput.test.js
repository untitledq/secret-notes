import { encrypt } from "../crypto/cryptoService.js";

test("different IV produces different ciphertext", () => {
    const a = encrypt("text", "key");
    const b = encrypt("text", "key");
    expect(a).not.toEqual(b);
});