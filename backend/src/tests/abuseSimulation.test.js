import request from "supertest";
import { buildApp } from "../server.js";

let app;

beforeAll(async () => {
    app = buildApp();
    await app.ready();
});

afterAll(async () => {
    await app.close();
});

test("reject repeated oversized payload attempts", async () => {
    const bigText = "a".repeat(20000);

    const results = await Promise.all(
        Array.from({ length: 5 }).map(() =>
            request(app.server)
                .post("/notes")
                .send({ text: bigText, passphrase: "pw" })
        )
    );

    for (const res of results) {
        expect(res.statusCode).toBe(413);
        expect(res.body.error).toBe("Text too large");
    }
});