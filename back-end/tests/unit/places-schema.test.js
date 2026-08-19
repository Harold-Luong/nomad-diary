import assert from "node:assert/strict";
import test from "node:test";

import { listPlacesQuerySchema } from "../../src/modules/places/places.schema.js";

test("place history requires province and ward codes", () => {
    assert.deepEqual(
        listPlacesQuerySchema.parse({
            provinceCode: " 70 ",
            wardCode: " 25180 ",
            wardName: " Phường Bình Minh ",
            pageSize: "100",
        }),
        {
            provinceCode: "70",
            wardCode: "25180",
            wardName: "Phường Bình Minh",
            pageSize: 100,
        },
    );
    assert.equal(listPlacesQuerySchema.safeParse({ provinceCode: "70" }).success, false);
});
