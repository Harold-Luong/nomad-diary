import assert from "node:assert/strict";
import test from "node:test";

import { errorHandler } from "../../src/middleware/error-handler.js";

test("PostgreSQL datetime overflow errors become a safe 422 response", () => {
    let status;
    let body;
    const response = {
        status(value) {
            status = value;
            return this;
        },
        json(value) {
            body = value;
            return this;
        },
    };

    errorHandler(
        { code: "22008", message: "date/time field value out of range" },
        { requestId: "request-1", method: "POST", originalUrl: "/api/trips/1/stops" },
        response,
        () => {},
    );

    assert.equal(status, 422);
    assert.equal(body.success, false);
    assert.equal(body.error.code, "INVALID_VALUE");
    assert.equal(body.error.details, null);
});
