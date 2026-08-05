import assert from "node:assert/strict";
import test from "node:test";

import { createTripStopSchema } from "../../src/modules/trip-stops/trip-stops.schema.js";

test("trip stop timestamps require real ISO-8601 calendar values with offsets", () => {
    const valid = createTripStopSchema.safeParse({
        placeId: "1",
        arrivedAt: "2024-02-29T08:00:00+07:00",
    });

    assert.equal(valid.success, true);

    for (const arrivedAt of [
        "2026-02-29T08:00:00+07:00",
        "2026-02-30T08:00:00+07:00",
        "2026-08-02T08:00:00",
        "2026-08-02T08:00:00+14:01",
    ]) {
        assert.equal(
            createTripStopSchema.safeParse({ placeId: "1", arrivedAt }).success,
            false,
            `${arrivedAt} must be rejected`,
        );
    }
});

test("trip stop timestamps reject a departedAt value before arrivedAt", () => {
    const result = createTripStopSchema.safeParse({
        placeId: "1",
        arrivedAt: "2026-08-02T10:00:00+07:00",
        departedAt: "2026-08-02T09:00:00+07:00",
    });

    assert.equal(result.success, false);
    assert.deepEqual(result.error.issues[0].path, ["departedAt"]);
});
