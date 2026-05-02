import Fastify from "fastify";
import { PrismaClient } from "@prisma/client";
import { encrypt, decrypt } from "./crypto/cryptoService.js";

export function buildApp() {
  const app = Fastify({ logger: true });
  const prisma = new PrismaClient();

  app.get("/health", async () => {
    return { status: "ok" };
  });

  app.post("/notes", async (request, reply) => {
    const { text, passphrase } = request.body || {};

    if (!text || !passphrase) {
      return reply.status(400).send({ error: "Missing text or passphrase" });
    }

    const encrypted = encrypt(text, passphrase);

    const note = await prisma.note.create({
      data: {
        content: encrypted.content,
        iv: encrypted.iv,
        tag: encrypted.tag,
      },
    });

    return {
      id: note.id,
      message: "Note stored securely",
    };
  });

  app.get("/notes/:id", async (request, reply) => {
    const { id } = request.params;
    const { passphrase } = request.query || {};

    const note = await prisma.note.findUnique({
      where: { id: Number(id) },
    });

    if (!note) {
      return reply.status(404).send({ error: "Note not found" });
    }

    try {
      const decrypted = decrypt(
          {
            content: note.content,
            iv: note.iv,
            tag: note.tag,
          },
          passphrase
      );

      return { id: note.id, content: decrypted };
    } catch {
      return reply.status(403).send({ error: "Invalid key" });
    }
  });

  return app;
}