import Fastify from "fastify"; // Fastify web framework instance
import rateLimit from "@fastify/rate-limit"; // Request rate limiting plugin
import { prisma } from "./db/prismaClient.js"; // Prisma database client
import { encrypt, decrypt } from "./crypto/cryptoService.js"; // AES-GCM encryption utilities

export function buildApp() { // Factory function to create configured Fastify app
  const app = Fastify({ // Create Fastify instance with base config
    logger: true, // Enable request/response logging
    trustProxy: true, // Required for correct IP handling behind proxies
  });

  app.setErrorHandler((error, request, reply) => { // Global error handler (overrides default Fastify errors)
    if (error.validation) { // Schema validation errors (params/query/body)
      return reply.status(400).send({
        error: "Invalid id", // Unified validation error response for API consistency
      });
    }

    request.log.error(error); // Log unexpected server-side errors
    return reply.status(500).send({
      error: "Internal server error", // Generic response to avoid leaking internals
    });
  });

  app.register(rateLimit, { // Global rate limiting middleware
    max: 5, // Max requests per time window per IP
    timeWindow: "1 minute", // Rate limit window duration
    allowList: [], // Optional whitelist of IPs (none configured)
    errorResponseBuilder: () => ({ // Custom rate limit error response
      error: "Too many requests",
    }),
  });

  app.addHook("onClose", async () => { // Lifecycle hook on server shutdown
    await prisma.$disconnect(); // Ensure DB connection is closed cleanly
  });

  app.get("/health", async () => { // Health check endpoint
    return { status: "ok" }; // Simple liveness response
  });

  app.post("/notes", async (request, reply) => { // Create encrypted note endpoint
    const { text, passphrase } = request.body || {}; // Extract request payload

    if (typeof text !== "string" || typeof passphrase !== "string") { // Type validation
      return reply.status(400).send({ error: "Invalid input types" }); // Reject invalid payload structure
    }

    if (!text.trim() || !passphrase.trim()) { // Empty string validation
      return reply.status(400).send({ error: "Empty text or passphrase" }); // Reject blank input
    }

    if (text.length > 10_000) { // Payload size limit for note content
      return reply.status(413).send({ error: "Text too large" }); // Protect DB and memory
    }

    if (passphrase.length > 1_000) { // Passphrase size limit
      return reply.status(413).send({ error: "Passphrase too large" }); // Prevent abuse / DoS
    }

    try {
      const encrypted = encrypt(text, passphrase); // Encrypt plaintext using AES-GCM

      const note = await prisma.note.create({ // Persist encrypted note in database
        data: {
          content: encrypted.content, // Ciphertext
          iv: encrypted.iv, // Initialization vector
          tag: encrypted.tag, // Authentication tag
        },
      });

      return {
        id: note.id, // Return generated note ID
        message: "Note stored securely", // Success confirmation
      };
    } catch (error) {
      request.log.error({ error }, "POST /notes failed"); // Log unexpected failure
      return reply.status(500).send({ error: "Internal server error" }); // Generic error response
    }
  });

  app.get(
      "/notes/:id", // Retrieve and decrypt note by ID
      {
        schema: { // Fastify schema validation for params and query
          params: {
            type: "object",
            required: ["id"],
            properties: {
              id: { type: "integer" }, // Enforce numeric ID at validation layer
            },
          },
          querystring: {
            type: "object",
            required: ["passphrase"],
            properties: {
              passphrase: { type: "string" }, // Required decryption key
            },
          },
        },
      },
      async (request, reply) => { // Route handler
        const { id } = request.params; // Validated numeric ID
        const { passphrase } = request.query; // Passphrase from query string

        if (!passphrase || !passphrase.trim()) { // Ensure passphrase is usable
          return reply.status(400).send({ error: "Missing passphrase" }); // Reject missing key
        }

        try {
          const note = await prisma.note.findUnique({ // Fetch note from database
            where: { id },
          });

          if (!note) { // Handle missing record
            return reply.status(404).send({ error: "Note not found" }); // Not found response
          }

          const decrypted = decrypt( // Decrypt stored ciphertext
              {
                content: note.content,
                iv: note.iv,
                tag: note.tag,
              },
              passphrase
          );

          return { id: note.id, content: decrypted }; // Return plaintext note
        } catch (error) {
          request.log.warn({ error }, "GET /notes/:id failed decryption"); // Log crypto failure
          return reply.status(403).send({ error: "Invalid key or corrupted data" }); // Decryption failure response
        }
      }
  );

  return app; // Export configured Fastify application
}