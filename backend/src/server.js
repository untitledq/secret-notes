import Fastify from "fastify";
import rateLimit from "@fastify/rate-limit";
import { prisma } from "./db/prismaClient.js";
import { encrypt, decrypt } from "./crypto/cryptoService.js";

export function buildApp() {
  const app = Fastify({
    logger: true,
    trustProxy: true
  });

  // register global plugins first
  app.register(rateLimit, {
    max: 5,
    timeWindow: "1 minute",
    allowList: [],
    errorResponseBuilder: () => ({
      error: "Too many requests",
    }),
  });

  // Ensure DB connection lifecycle is handled
  app.addHook("onClose", async () => {
    await prisma.$disconnect();
  });

  app.get("/health", async () => {
    return { status: "ok" };
  });

  app.post("/notes", async (request, reply) => {
    const { text, passphrase } = request.body || {};

    // Basic validation (Suggestion #4)
    if (typeof text !== "string" || typeof passphrase !== "string") {
      return reply.status(400).send({ error: "Invalid input types" });
    }

    if (!text.trim() || !passphrase.trim()) {
      return reply.status(400).send({ error: "Empty text or passphrase" });
    }

    // Optional size limits (protect DB / abuse)
    if (text.length > 10_000) {
      return reply.status(413).send({ error: "Text too large" });
    }

    if (passphrase.length > 1_000) {
      return reply.status(413).send({ error: "Passphrase too large" });
    }

    try {
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
    } catch (error) {
      request.log.error({ error }, "POST /notes failed");
      return reply.status(500).send({ error: "Internal server error" });
    }
  });

  app.get("/notes/:id", async (request, reply) => {
    const { id } = request.params;
    const { passphrase } = request.query || {};

    // Validation
    const numericId = Number(id);
    if (!Number.isInteger(numericId)) {
      return reply.status(400).send({ error: "Invalid id" });
    }

    if (typeof passphrase !== "string" || !passphrase.trim()) {
      return reply.status(400).send({ error: "Missing passphrase" });
    }

    try {
      const note = await prisma.note.findUnique({
        where: { id: numericId },
      });

      if (!note) {
        return reply.status(404).send({ error: "Note not found" });
      }

      const decrypted = decrypt(
          {
            content: note.content,
            iv: note.iv,
            tag: note.tag,
          },
          passphrase
      );

      return { id: note.id, content: decrypted };
    } catch (error) {
      request.log.warn({ error }, "GET /notes/:id failed decryption");
      return reply.status(403).send({ error: "Invalid key or corrupted data" });
    }
  });

  return app;
}