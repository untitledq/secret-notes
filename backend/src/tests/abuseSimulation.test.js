import request from "supertest";
import { buildApp } from "../server.js";

let app;

// initializes Fastify app before tests run
beforeAll(async () => {
    app = buildApp();
    await app.ready();
});

// cleanly shuts down server and DB connections after tests
afterAll(async () => {
    await app.close();
});

test("reject repeated oversized payload attempts", async () => {
    const bigText = "a".repeat(20000); // payload exceeding 10k character limit defined in API

    // verifies that repeated abuse attempts with oversized payload are consistently rejected
    for (let i = 0; i < 5; i++) {
        const res = await request(app.server)
            .post("/notes")
            .send({ text: bigText, passphrase: "pw" });

        expect(res.statusCode).toBe(413); // HTTP 413 Payload Too Large expected
    }
});