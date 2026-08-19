import assert from "node:assert/strict";
import test from "node:test";

import { loadEnvironment } from "../../src/config/load-environment.js";

await loadEnvironment("development");

const {
    loginSchema,
    updateProfileSchema,
} = await import("../../src/modules/auth/auth.schema.js");

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

test("profile updates accept avatar object keys returned by the upload API", () => {
    const avatarObjectKey =
        "users/42/avatar/2bb95131-6918-4d70-813a-33f916edb781.webp";

    assert.deepEqual(updateProfileSchema.parse({ avatarObjectKey }), {
        avatarObjectKey,
    });
    assert.equal(
        updateProfileSchema.safeParse({ avatarUrl: "https://example.com/avatar.jpg" }).success,
        false,
    );
});
