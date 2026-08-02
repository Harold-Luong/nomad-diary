import assert from "node:assert/strict";
import test from "node:test";

import { loginSchema } from "../../src/modules/auth/auth.schema.js";

test("login accepts an identifier", () => {
    const result = loginSchema.parse({
        identifier: " Nomad ",
        password: "registered-password",
    });

    assert.deepEqual(result, {
        identifier: "Nomad",
        password: "registered-password",
    });
});

test("legacy email input remains supported and wins if both fields are sent", () => {
    const result = loginSchema.parse({
        identifier: "string",
        email: " NOMAD@EXAMPLE.COM ",
        password: "registered-password",
    });

    assert.deepEqual(result, {
        identifier: "nomad@example.com",
        password: "registered-password",
    });
});
