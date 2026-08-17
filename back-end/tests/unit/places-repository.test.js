import assert from "node:assert/strict";
import test from "node:test";

import { listVisitedForUser } from "../../src/modules/places/places.repository.js";

test("place history is scoped to the authenticated user and location codes", async () => {
    const calls = [];
    const executor = async (text, values) => {
        calls.push({ text, values });
        return /COUNT\(\*\)/.test(text)
            ? { rows: [{ total: "1" }] }
            : { rows: [{ id: "25", name: "Núi Bà Đen" }] };
    };

    const result = await listVisitedForUser(
        {
            userId: "7",
            provinceCode: "70",
            wardCode: "25180",
            wardName: "Phường Bình Minh",
            limit: 100,
            offset: 0,
        },
        executor,
    );

    assert.equal(result.total, 1);
    for (const call of calls) {
        assert.match(call.text, /t\.user_id = \$1/);
        assert.match(call.text, /pr\.code = \$2/);
        assert.match(call.text, /p\.ward_code = \$3/);
        assert.match(call.text, /p\.ward_code IS NULL/);
        assert.match(call.text, /lower\(btrim\(p\.ward\)\)/);
        assert.match(call.text, /ts\.is_deleted = false/);
        assert.deepEqual(call.values.slice(0, 4), [
            "7",
            "70",
            "25180",
            "Phường Bình Minh",
        ]);
    }
});
