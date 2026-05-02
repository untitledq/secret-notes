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

test("rate limiting blocks excessive requests", async () => {
    const promises = [];

    for (let i = 0; i < 12; i++) {
        promises.push(
            request(app.server)
                .post("/notes")
                .send({ text: "x", passphrase: "pw" })
        );
    }

    const results = await Promise.all(promises);

    const statuses = results.map(r => r.statusCode);

    const has429 = statuses.includes(429);

    expect(has429).toBe(true);
});