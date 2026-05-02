import { buildApp } from "./server.js";

const app = buildApp();

app.listen({ port: 3000, host: "0.0.0.0" }, (error, address) => {
    if (error) {
        app.log.error(error);
        process.exit(1);
    }
    console.log(`Backend running at ${address}`);
});