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

test("stores and retrieves unicode + emoji correctly", async () => {
    const text = "秘密 🔐 — üñîçødé ✔️";

    const create = await request(app.server)
        .post("/notes")
        .send({
            text,
            passphrase: "pw"
        });

    expect(create.statusCode).toBe(200);

    const id = create.body.id;

    const fetch = await request(app.server)
        .get(`/notes/${id}`)
        .query({ passphrase: "pw" });

    expect(fetch.statusCode).toBe(200);
    expect(fetch.body.content).toBe(text);
});