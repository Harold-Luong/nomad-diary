import pg from "pg";

import { env } from "../config/env.js";

const { Pool } = pg;

export const pool = new Pool({
    ...env.database,
    ssl: env.database.ssl ? { rejectUnauthorized: false } : false,
    application_name: "nomad-diary-api",
    // PostgreSQL applies this before accepting normal queries on the connection.
    options: "-c search_path=nomad_diary,public",
});

pool.on("error", (error) => {
    console.error({
        event: "database_pool_error",
        code: error.code,
        message: error.message,
    });
});

export const query = (text, values) => pool.query(text, values);

export const executeQuery = (executor, text, values = []) => {
    if (typeof executor === "function") {
        return executor(text, values);
    }

    if (executor && typeof executor.query === "function") {
        return executor.query(text, values);
    }

    throw new TypeError("Database executor must be a query function or pg client");
};

export const closePool = () => pool.end();
