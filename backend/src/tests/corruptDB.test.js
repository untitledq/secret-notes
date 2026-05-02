import request from "supertest";
import { buildApp } from "../server.js";
import { prisma } from "../db/prismaClient.js";

let app;

beforeAll(async () => {
    app = buildApp();
    await app.ready();
});

afterAll(async () => {
    await prisma.$disconnect();
});

test("corrupted stored ciphertext returns 403", async () => {
    // create valid note
    const createRes = await request(app.server)
        .post("/notes")
        .send({ text: "secret", passphrase: "pw" });

    const id = createRes.body.id;

    // simulate DB corruption
    await prisma.note.update({
        where: { id },
        data: {
            content: "corrupted-data",
        },
    });

    const res = await request(app.server)
        .get(`/notes/${id}`)
        .query({ passphrase: "pw" });

    expect(res.statusCode).toBe(403);
    expect(res.body.error).toBe("Invalid key or corrupted data");
});