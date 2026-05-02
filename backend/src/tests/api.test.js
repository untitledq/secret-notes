import request from "supertest";
import { buildApp } from "../server.js";
import { prisma } from "./prismaClient.js";

let app;

beforeAll(async () => {
    app = buildApp();
    await app.ready();
});

afterAll(async () => {
    await prisma.$disconnect();
    await new Promise(resolve => setTimeout(resolve, 200));
});

test("create and retrieve note", async () => {
    const resCreate = await request(app.server)
        .post("/notes")
        .send({ text: "hello", passphrase: "pw" });

    expect(resCreate.statusCode).toBe(200);

    const id = resCreate.body.id;

    const resGet = await request(app.server)
        .get(`/notes/${id}`)
        .query({ passphrase: "pw" });

    expect(resGet.statusCode).toBe(200);
    expect(resGet.body.content).toBe("hello");
});