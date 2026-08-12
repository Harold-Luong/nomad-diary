import assert from "node:assert/strict";
import test from "node:test";

import { loadEnvironment } from "../../src/config/load-environment.js";
import validate from "../../src/middleware/validate.js";

await loadEnvironment("development");

const { listTripsQuerySchema } = await import("../../src/modules/trips/trips.schema.js");

test("query validation works with the read-only Express 5 req.query getter", () => {
    const req = {};
    Object.defineProperty(req, "query", {
        get: () => ({ page: "2", pageSize: "10", status: "1" }),
    });
    let nextError;

    validate(listTripsQuerySchema, "query")(req, {}, (error) => {
        nextError = error;
    });

    assert.equal(nextError, undefined);
    assert.deepEqual(req.validated.query, { page: 2, pageSize: 10, status: 1 });
});
