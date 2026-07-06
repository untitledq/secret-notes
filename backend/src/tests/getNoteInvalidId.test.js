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

test("POST /notes/:id/decrypt rejects non-integer id formats", async () => {
    const passphrase = "pw";

    const cases = [
        "abc",
        "1.5",
        "NaN",
        "undefined",
        "null",
    ];

    for (const id of cases) {
        const res = await request(app.server)
            .post(`/notes/${id}/decrypt`)
            .send({ passphrase });

        expect(res.statusCode).toBe(400);
        expect(res.body.error).toBe("Invalid input");
    }
});

test("POST /notes/:id/decrypt rejects a missing passphrase", async () => {
    const res = await request(app.server)
        .post("/notes/1/decrypt")
        .send({});

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("Invalid input");
});