import assert from "node:assert/strict";
import test from "node:test";

import { updateActiveUserProfile } from "../../src/modules/auth/auth.repository.js";
import { create as createTrip } from "../../src/modules/trips/trips.repository.js";

test("profile persistence writes avatar object keys to avatar_key", async () => {
    let captured;
    const executor = async (text, values) => {
        captured = { text, values };
        return { rows: [{ id: "42", avatar_key: values[0] }] };
    };
    const avatarObjectKey =
        "users/42/avatar/2bb95131-6918-4d70-813a-33f916edb781.jpg";

    const user = await updateActiveUserProfile(
        "42",
        { avatarObjectKey },
        executor,
    );

    assert.equal(user.avatar_key, avatarObjectKey);
    assert.match(captured.text, /avatar_key = \$1/);
    assert.doesNotMatch(captured.text, /avatar_url/);
    assert.deepEqual(captured.values, [avatarObjectKey, "42"]);
});

test("trip persistence writes thumbnail object keys to thumbnail_key", async () => {
    let captured;
    const executor = async (text, values) => {
        captured = { text, values };
        return { rows: [{ id: "7", thumbnail_key: values[4] }] };
    };
    const thumbnailObjectKey =
        "users/42/trip-cover/2bb95131-6918-4d70-813a-33f916edb781.webp";

    const trip = await createTrip(
        "42",
        {
            title: "Da Lat",
            slug: "da-lat",
            description: null,
            thumbnailObjectKey,
            status: 0,
            startDate: null,
            endDate: null,
            isPublic: false,
        },
        executor,
    );

    assert.equal(trip.thumbnail_key, thumbnailObjectKey);
    assert.match(captured.text, /thumbnail_key/);
    assert.doesNotMatch(captured.text, /thumbnail_url/);
    assert.equal(captured.values[4], thumbnailObjectKey);
});
