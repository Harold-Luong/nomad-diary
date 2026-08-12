import assert from "node:assert/strict";
import test from "node:test";

import { loadEnvironment } from "../../src/config/load-environment.js";

await loadEnvironment("development");

const { executeQuery } = await import("../../src/database/pool.js");

test("executeQuery supports a pool-style query function", async () => {
    const result = await executeQuery(async (text, values) => ({ text, values }), "SELECT $1", [1]);

    assert.deepEqual(result, { text: "SELECT $1", values: [1] });
});

test("executeQuery supports a pg client object inside transactions", async () => {
    const client = {
        query: async (text, values) => ({ text, values }),
    };

    const result = await executeQuery(client, "SELECT $1", [2]);

    assert.deepEqual(result, { text: "SELECT $1", values: [2] });
});
