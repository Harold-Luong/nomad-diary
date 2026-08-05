import assert from "node:assert/strict";
import test from "node:test";

import {
    listProvincePlacesQuerySchema,
    listProvincesQuerySchema,
    provinceIdParamsSchema,
} from "../../src/modules/provinces/provinces.schema.js";

test("province query parsing preserves explicit visited booleans", () => {
    const visited = listProvincesQuerySchema.parse({
        countryCode: "vn",
        visited: "true",
    });
    const unvisited = listProvincePlacesQuerySchema.parse({ visited: "false" });

    assert.equal(visited.countryCode, "VN");
    assert.equal(visited.visited, true);
    assert.equal(unvisited.visited, false);
    assert.equal(
        listProvincePlacesQuerySchema.safeParse({ visited: "1" }).success,
        false,
    );
});

test("province schemas validate IDs and pagination bounds", () => {
    assert.equal(provinceIdParamsSchema.safeParse({ id: "1" }).success, true);
    assert.equal(provinceIdParamsSchema.safeParse({ id: "0" }).success, false);
    assert.equal(
        listProvincesQuerySchema.safeParse({ page: "1", pageSize: "100" }).success,
        true,
    );
    assert.equal(
        listProvincesQuerySchema.safeParse({ pageSize: "101" }).success,
        false,
    );
});
