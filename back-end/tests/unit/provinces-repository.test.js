import assert from "node:assert/strict";
import test from "node:test";

import {
    listPlacesForUser,
    listVisitedForUser,
} from "../../src/modules/provinces/provinces.repository.js";

test("visited province tracking is scoped to the authenticated user", async () => {
    let captured;
    const executor = async (text, values) => {
        captured = { text, values };
        return { rows: [] };
    };

    await listVisitedForUser("7", { countryCode: "VN" }, executor);

    assert.deepEqual(captured.values, ["7", "VN"]);
    assert.match(captured.text, /t\.user_id = \$1/);
    assert.match(captured.text, /t\.is_deleted = false/);
    assert.match(captured.text, /ts\.is_deleted = false/);
    assert.match(captured.text, /visited_place\.is_deleted = false/);
    assert.match(captured.text, /pr\.is_deleted = false/);
    assert.match(captured.text, /COUNT\(DISTINCT ts\.place_id\)/);
    assert.match(captured.text, /tracking\.visit_count > 0/);
});

test("province place tracking supports visited and search filters", async () => {
    const calls = [];
    const executor = async (text, values) => {
        calls.push({ text, values });

        if (/SELECT COUNT\(\*\) AS total/.test(text)) {
            return { rows: [{ total: "1" }] };
        }

        return {
            rows: [{ id: "10", province_id: "1", visit_count: 2 }],
        };
    };

    const result = await listPlacesForUser(
        {
            userId: "7",
            provinceId: "1",
            search: "Lake",
            visited: true,
            limit: 20,
            offset: 0,
        },
        executor,
    );

    assert.equal(result.total, 1);
    assert.equal(result.rows[0].id, "10");
    assert.equal(calls.length, 2);

    for (const call of calls) {
        assert.match(call.text, /t\.user_id = \$1/);
        assert.match(call.text, /p\.province_id = \$2/);
        assert.match(call.text, /p\.is_deleted = false/);
        assert.match(call.text, /ts\.is_deleted = false/);
        assert.match(call.text, /tracking\.visit_count > 0/);
        assert.deepEqual(call.values.slice(0, 3), ["7", "1", "%Lake%"]);
    }
});
