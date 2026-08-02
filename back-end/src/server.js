import "dotenv/config";

import app from "./app.js";
import { env } from "./config/env.js";
import { closePool } from "./database/pool.js";

const server = app.listen(env.port, () => {
    console.log(`Nomad Diary API listening on http://localhost:${env.port}`);
    console.log(`Swagger UI is available at http://localhost:${env.port}/api-docs`);
});

const shutdown = async (signal) => {
    console.log(`${signal} received. Shutting down gracefully.`);
    server.close(async () => {
        await closePool();
        process.exit(0);
    });
};

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));
