test("tampered ciphertext fails", () => {
    const encrypted = encrypt("hello", "pw");
    encrypted.content = encrypted.content.slice(0, -2) + "ff";

    expect(() => decrypt(encrypted, "pw")).toThrow();
});