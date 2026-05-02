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
    await app.close();
});

test("POST /notes returns valid contract response", async () => {
    const res = await request(app.server)
        .post("/notes")
        .send({ text: "contract-test", passphrase: "pw" });

    expect(res.statusCode).toBe(200);

    expect(typeof res.body).toBe("object");
    expect(typeof res.body.id).toBe("number");
    expect(res.body.message).toBe("Note stored securely");
});

test("POST /notes persists data in database", async () => {
    const res = await request(app.server)
        .post("/notes")
        .send({ text: "db-check", passphrase: "pw" });

    const id = res.body.id;

    const dbNote = await prisma.note.findUnique({
        where: { id }
    });

    expect(dbNote).not.toBeNull();
    expect(dbNote.content).toBeDefined();
    expect(dbNote.iv).toBeDefined();
    expect(dbNote.tag).toBeDefined();
});