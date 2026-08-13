import assert from "node:assert/strict";
import test from "node:test";

import { handler } from "../../src/handlers/query.js";

test("health route returns the service status", async () => {
    const response = await handler();

    assert.equal(response.statusCode, 200);
    assert.deepEqual(JSON.parse(response.body), {
        data: {
            service: "location-catalog",
            status: "ok",
        },
    });
});
