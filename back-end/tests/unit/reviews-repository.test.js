import assert from "node:assert/strict";
import test from "node:test";

import { loadEnvironment } from "../../src/config/load-environment.js";

await loadEnvironment("development");

const { upsertForOwnedStop } = await import("../../src/modules/reviews/reviews.repository.js");

const reviewData = {
    rating: 5,
    revisitStatus: 1,
    isFavorite: true,
    note: "Worth returning",
    warningNote: null,
};

test("review upsert scopes the write to an active stop owned by the user", async () => {
    let captured;
    const executor = async (text, values) => {
        captured = { text, values };
        return { rows: [{ id: "9", trip_stop_id: "3" }] };
    };

    const review = await upsertForOwnedStop("3", "7", reviewData, executor);

    assert.equal(review.id, "9");
    assert.match(captured.text, /t\.user_id = \$2/);
    assert.match(captured.text, /t\.is_deleted = false/);
    assert.match(captured.text, /ts\.is_deleted = false/);
    assert.deepEqual(captured.values, ["3", "7", 5, 1, true, "Worth returning", null]);
});

test("review upsert returns null when the owned stop selector writes no row", async () => {
    const review = await upsertForOwnedStop(
        "3",
        "7",
        reviewData,
        async () => ({ rows: [] }),
    );

    assert.equal(review, null);
});
