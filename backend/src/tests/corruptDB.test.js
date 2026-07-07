import request from "supertest";
import { buildApp } from "../server.js";
import { prisma } from "../db/prismaClient.js";

let app;

// initializes Fastify application before test execution
beforeAll(async () => {
    app = buildApp();
    await app.ready();
});

// closes Prisma connection after tests complete
afterAll(async () => {
    await prisma.$disconnect();
});

test("corrupted stored ciphertext returns 403", async () => {
    // tests integrity protection: corrupted encrypted data must fail decryption

    // create valid encrypted note in database via API
    const createRes = await request(app.server)
        .post("/notes")
        .send({ text: "secret", passphrase: "pw" });

    const id = createRes.body.id; // store generated note ID

    // simulate database-level tampering of encrypted content
    await prisma.note.update({
        where: { id },
        data: {
            content: "corrupted-data",
        },
    });

    // attempt to decrypt corrupted data via API
    const res = await request(app.server)
        .post(`/notes/${id}/decrypt`)
        .send({ passphrase: "pw" });

    expect(res.statusCode).toBe(403); // decryption must fail due to authentication check
    expect(res.body.error).toBe("Invalid key or corrupted data"); // expected security error response
});