import assert from "node:assert/strict";
import test from "node:test";

import {
    AUTH_SCHEME,
    JWT_TOKEN_TYPE,
    REVISIT_STATUS,
    REVISIT_STATUS_VALUES,
    TRIP_SORT,
    TRIP_SORT_VALUES,
    TRIP_STATUS,
    TRIP_STATUS_VALUES,
} from "../../src/shared/constants/domain.js";
import { ERRORS, errorArgs } from "../../src/shared/constants/errors.js";

test("domain enums use the values enforced by PostgreSQL", () => {
    assert.deepEqual(TRIP_STATUS, {
        DRAFT: 0,
        PLANNED: 1,
        ONGOING: 2,
        COMPLETED: 3,
        CANCELLED: 4,
    });
    assert.deepEqual(TRIP_STATUS_VALUES, [0, 1, 2, 3, 4]);
    assert.deepEqual(REVISIT_STATUS_VALUES, [0, 1, 2, 3]);
    assert.equal(REVISIT_STATUS.NOT_RECOMMENDED, 3);
});

test("query and authentication enums expose stable API values", () => {
    assert.equal(TRIP_SORT.CREATED_AT_DESC, "createdAtDesc");
    assert.ok(TRIP_SORT_VALUES.includes(TRIP_SORT.TITLE_DESC));
    assert.equal(JWT_TOKEN_TYPE.ACCESS, "access");
    assert.equal(JWT_TOKEN_TYPE.REFRESH, "refresh");
    assert.equal(AUTH_SCHEME.BEARER, "Bearer");
});

test("enum objects and their value lists cannot be mutated", () => {
    assert.equal(Object.isFrozen(TRIP_STATUS), true);
    assert.equal(Object.isFrozen(TRIP_STATUS_VALUES), true);
    assert.equal(Object.isFrozen(REVISIT_STATUS), true);
    assert.equal(Object.isFrozen(TRIP_SORT), true);
    assert.equal(Object.isFrozen(JWT_TOKEN_TYPE), true);
});

test("error catalog contains immutable and unique code/message pairs", () => {
    const definitions = Object.values(ERRORS);
    const codes = definitions.map((definition) => definition.code);

    assert.equal(new Set(codes).size, codes.length);
    assert.equal(Object.isFrozen(ERRORS), true);
    assert.equal(definitions.every(Object.isFrozen), true);
    assert.deepEqual(errorArgs(ERRORS.TRIP_NOT_FOUND), [
        "TRIP_NOT_FOUND",
        "Trip not found",
    ]);
});
