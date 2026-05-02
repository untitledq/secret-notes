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

    for (let i = 0; i < 5; i++) {
        const res = await request(app.server)
            .post("/notes")
            .send({ text: bigText, passphrase: "pw" });

        expect(res.statusCode).toBe(413);
    }
});