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

test("reject missing text field", async () => {
    const res = await request(app.server)
        .post("/notes")
        .send({ passphrase: "pw" });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("Invalid input types");
});

test("reject missing passphrase field", async () => {
    const res = await request(app.server)
        .post("/notes")
        .send({ text: "hello" });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("Invalid input types");
});