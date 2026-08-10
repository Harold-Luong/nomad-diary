import assert from "node:assert/strict";
import test from "node:test";

import {
    create,
    listForUser,
} from "../../src/modules/images/images.repository.js";

test("image lists scope every filter to active trips owned by the user", async () => {
    const calls = [];
    const executor = async (text, values) => {
        calls.push({ text, values });

        if (/COUNT\(\*\) AS total/.test(text)) {
            return { rows: [{ total: "0" }] };
        }

        return { rows: [] };
    };

    const result = await listForUser(
        {
            userId: "42",
            tripId: "7",
            provinceId: "3",
            favorite: true,
            sort: "capturedAtDesc",
            limit: 20,
            offset: 0,
        },
        executor,
    );

    assert.equal(result.total, 0);
    assert.equal(calls.length, 2);

    for (const call of calls) {
        assert.match(call.text, /t\.user_id = \$1/);
        assert.match(call.text, /t\.is_deleted = false/);
        assert.match(call.text, /i\.is_deleted = false/);
        assert.match(call.text, /i\.trip_id = \$2/);
        assert.match(call.text, /p\.province_id = \$3/);
        assert.match(call.text, /i\.is_favorite = \$4/);
        assert.deepEqual(call.values.slice(0, 4), ["42", "7", "3", true]);
    }
});

test("image creation writes keys only through an owned active trip", async () => {
    let captured;
    const executor = async (text, values) => {
        captured = { text, values };
        return { rows: [{ id: "9", trip_id: "7" }] };
    };
    const data = {
        tripId: "7",
        tripStopId: null,
        imageObjectKey:
            "users/42/images/2bb95131-6918-4d70-813a-33f916edb781.jpg",
        thumbnailObjectKey: null,
        originalFilename: "photo.jpg",
        description: null,
        capturedAt: null,
        latitude: null,
        longitude: null,
        width: 1920,
        height: 1080,
        fileSize: 2048,
        mimeType: "image/jpeg",
        sortOrder: 0,
        isCover: false,
        isFavorite: false,
        aiTags: null,
    };

    const image = await create("42", data, executor);

    assert.equal(image.id, "9");
    assert.match(captured.text, /image_key/);
    assert.match(captured.text, /thumbnail_key/);
    assert.match(captured.text, /t\.user_id = \$2/);
    assert.match(captured.text, /t\.is_deleted = false/);
    assert.deepEqual(captured.values.slice(0, 5), [
        "7",
        "42",
        null,
        data.imageObjectKey,
        null,
    ]);
});
