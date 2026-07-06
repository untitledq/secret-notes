import Fastify from "fastify"; // Fastify web framework instance
import rateLimit from "@fastify/rate-limit"; // Request rate limiting plugin
import cors from "@fastify/cors";
import { prisma } from "./db/prismaClient.js"; // Prisma database client
import { encrypt, decrypt } from "./crypto/cryptoService.js"; // AES-GCM encryption utilities
import { captureEvent, posthog } from "./analytics/posthog.js";

export function buildApp() { // Factory function to create configured Fastify app
  const app = Fastify({ // Create Fastify instance with base config
    logger: true, // Enable request/response logging
    trustProxy: true, // Required for correct IP handling behind proxies
  });

  app.register(cors, {
    origin: true
  });

  app.setErrorHandler((error, request, reply) => { // Global error handler (overrides default Fastify errors)
    if (error.validation || error.code === "FST_ERR_CTP_EMPTY_JSON_BODY") { // Schema validation errors (params/query/body) incl. empty JSON body
      return reply.status(400).send({
        error: "Invalid input", // Unified validation error response for API consistency
      });
    }

    request.log.error(error); // Log unexpected server-side errors
    return reply.status(500).send({
      error: "Internal server error", // Generic response to avoid leaking internals
    });
  });
  
  app.register(rateLimit, { // Global rate limiting middleware
    max: Number(process.env.RATE_LIMIT_MAX || 100), // Max requests per time window per IP (staging raises this for k6 load tests)
    timeWindow: "1 minute", // Rate limit window duration
    allowList: [], // Optional whitelist of IPs (none configured)
    errorResponseBuilder: () => ({ // Custom rate limit error response
      error: "Too many requests",
    }),
  });

  app.addHook("onClose", async () => { // Lifecycle hook on server shutdown
    await prisma.$disconnect(); // Ensure DB connection is closed cleanly
    await posthog?.shutdown();
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
      
      // POSTHOG Capture Event for activities measurement
      captureEvent(request, "note created", {
        note_id: note.id,
        note_length: text.length,
      });

      return {
        id: note.id, // Return generated note ID
        message: "Note stored securely", // Success confirmation
      };
    } catch (error) {
      // POSTHOG Capture Event for activities measurement
      captureEvent(request, "note create failed", {
        reason: "server_error",
      });
      request.log.error({ error }, "POST /notes failed"); // Log unexpected failure
      return reply.status(500).send({ error: "Internal server error" }); // Generic error response
    }
  });

  app.post(
      "/notes/:id/decrypt", // Retrieve and decrypt note by ID (passphrase in body so it never appears in URLs/logs)
      {
        schema: { // Fastify schema validation for params and body
          params: {
            type: "object",
            required: ["id"],
            properties: {
              id: { type: "integer" }, // Enforce numeric ID at validation layer
            },
          },
          body: {
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
        const { passphrase } = request.body; // Passphrase from request body

        if (!passphrase.trim()) { // Ensure passphrase is usable
          return reply.status(400).send({ error: "Missing passphrase" }); // Reject missing key
        }

        let note;
        try {
          note = await prisma.note.findUnique({ // Fetch note from database
            where: { id },
          });
        } catch (error) {
          request.log.error({ error }, "POST /notes/:id/decrypt DB lookup failed"); // Log unexpected DB failure
          return reply.status(500).send({ error: "Internal server error" }); // DB errors are server errors, not key errors
        }

        if (!note) { // Handle missing record
          return reply.status(404).send({ error: "Note not found" }); // Not found response
        }

        try {
          const decrypted = decrypt( // Decrypt stored ciphertext
              {
                content: note.content,
                iv: note.iv,
                tag: note.tag,
              },
              passphrase
          );

          // POSTHOG Capture Event for activities measurement
          captureEvent(request, "note loaded", {
            note_id: note.id,
          });

          return { id: note.id, content: decrypted }; // Return plaintext note
        } catch (error) {
          // POSTHOG Capture Event for activities measurement
          captureEvent(request, "note load failed", {
            note_id: id,
            reason: "invalid_key_or_corrupted_data",
          });
          request.log.warn({ error }, "POST /notes/:id/decrypt failed decryption"); // Log crypto failure
          return reply.status(403).send({ error: "Invalid key or corrupted data" }); // Decryption failure response
        }
      }
  );

  return app; // Export configured Fastify application
}