import request from "supertest";
import { buildApp } from "../server.js";
import { prisma } from "../db/prismaClient.js";

let app;

// starts Fastify app before running integration test
beforeAll(async () => {
    app = buildApp();
    await app.ready();
});

// ensures Prisma connection is closed and allows async cleanup to finish
afterAll(async () => {
    await prisma.$disconnect();
    await new Promise(resolve => setTimeout(resolve, 200));
});

test("create and retrieve note", async () => {
    // tests full encryption storage + retrieval workflow via API

    const resCreate = await request(app.server)
        .post("/notes")
        .send({ text: "hello", passphrase: "pw" });

    expect(resCreate.statusCode).toBe(200); // note creation must succeed

    const id = resCreate.body.id; // stored note identifier

    const resGet = await request(app.server)
        .get(`/notes/${id}`)
        .query({ passphrase: "pw" });

    expect(resGet.statusCode).toBe(200); // successful retrieval and decryption expected
    expect(resGet.body.content).toBe("hello"); // decrypted content must match original input
});