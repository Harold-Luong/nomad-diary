import assert from "node:assert/strict";
import test from "node:test";

import { isUniqueViolation } from "../../src/database/postgres-errors.js";
import { getAuthenticatedUserId } from "../../src/shared/http/auth-context.js";
import { positiveIntegerIdSchema } from "../../src/shared/validation/schemas.js";

test("shared ID schema accepts only positive integer strings", () => {
    assert.equal(positiveIntegerIdSchema.safeParse("42").success, true);
    assert.equal(positiveIntegerIdSchema.safeParse("0").success, false);
    assert.equal(positiveIntegerIdSchema.safeParse("1.5").success, false);
    assert.equal(positiveIntegerIdSchema.safeParse(42).success, false);
});

test("PostgreSQL unique violations use one shared classifier", () => {
    assert.equal(isUniqueViolation({ code: "23505" }), true);
    assert.equal(isUniqueViolation({ code: "23503" }), false);
    assert.equal(isUniqueViolation(null), false);
});

test("authenticated user IDs use one shared request helper", () => {
    assert.equal(getAuthenticatedUserId({ auth: { userId: "7" } }), "7");
    assert.throws(
        () => getAuthenticatedUserId({}),
        (error) => error.code === "UNAUTHENTICATED" && error.statusCode === 401,
    );
});
