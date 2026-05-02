import { buildApp } from "./server.js"; // imports Fastify app factory

const app = buildApp(); // creates configured Fastify instance

// starts HTTP server on port 3000, bound to all interfaces
app.listen({ port: 3000, host: "0.0.0.0" }, (error, address) => {
    if (error) {
        app.log.error(error); // logs startup failure details
        process.exit(1); // exits process on fatal startup error
    }

    console.log(`Backend running at ${address}`); // confirms successful startup
});