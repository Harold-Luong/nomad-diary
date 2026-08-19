import assert from "node:assert/strict";
import test from "node:test";

import {
    findLegacyPlace,
    upsertPlace,
    upsertProvince,
} from "../../src/modules/trip-stops/trip-stops.repository.js";

test("trip stop location persistence upserts province and ward-scoped place", async () => {
    const calls = [];
    const executor = async (text, values) => {
        calls.push({ text, values });
        return { rows: [{ id: calls.length === 1 ? "9" : "25" }] };
    };

    const province = await upsertProvince(
        {
            countryCode: "VN",
            provinceCode: "70",
            provinceName: "Tây Ninh",
            provinceSlug: "tay-ninh",
        },
        executor,
    );
    await upsertPlace(
        {
            provinceId: province.id,
            name: "Núi Bà Đen",
            slug: "nui-ba-den",
            wardCode: "25180",
            wardName: "Phường Bình Minh",
            address: null,
            catalogPlaceId: "catalog-ba-den",
            latitude: null,
            longitude: null,
        },
        executor,
    );

    assert.match(calls[0].text, /ON CONFLICT \(country_code, code\)/);
    assert.match(calls[0].text, /DO NOTHING/);
    assert.deepEqual(calls[0].values, ["VN", "70", "Tây Ninh", "tay-ninh"]);
    assert.match(calls[1].text, /ON CONFLICT \(catalog_place_id\)/);
    assert.match(calls[1].text, /DO NOTHING/);
    assert.deepEqual(calls[1].values, [
        "9",
        "Núi Bà Đen",
        "nui-ba-den",
        "25180",
        "Phường Bình Minh",
        null,
        "catalog-ba-den",
        null,
        null,
    ]);
});

test("existing shared location rows are returned without overwriting their metadata", async () => {
    const calls = [];
    const executor = async (text, values) => {
        calls.push({ text, values });
        return calls.length % 2 === 1
            ? { rows: [] }
            : { rows: [{ id: calls.length === 2 ? "9" : "25" }] };
    };

    const province = await upsertProvince(
        {
            countryCode: "VN",
            provinceCode: "70",
            provinceName: "Tên không đáng tin cậy",
            provinceSlug: "ten-khong-dang-tin-cay",
        },
        executor,
    );
    const place = await upsertPlace(
        {
            provinceId: province.id,
            name: "Tên không đáng tin cậy",
            slug: "ten-khong-dang-tin-cay",
            wardCode: "25180",
            wardName: "Phường giả",
            address: "Địa chỉ giả",
            catalogPlaceId: "catalog-ba-den",
            latitude: 1,
            longitude: 1,
        },
        executor,
    );

    assert.equal(place.id, "25");
    assert.equal(calls.length, 4);
    assert.doesNotMatch(calls[0].text, /DO UPDATE/);
    assert.doesNotMatch(calls[2].text, /DO UPDATE/);
    assert.match(calls[1].text, /SELECT id\s+FROM provinces/);
    assert.match(calls[3].text, /SELECT id\s+FROM places/);
});

test("catalog locations can reuse a pre-ward-code legacy place", async () => {
    let captured;
    const executor = async (text, values) => {
        captured = { text, values };
        return { rows: [{ id: "6" }] };
    };

    const place = await findLegacyPlace(
        {
            provinceId: "2",
            slug: "cau-rong",
            catalogPlaceId: "catalog-cau-rong",
        },
        executor,
    );

    assert.equal(place.id, "6");
    assert.match(captured.text, /ward_code IS NULL/);
    assert.match(captured.text, /catalog_place_id IS NULL/);
    assert.deepEqual(captured.values, ["2", "cau-rong"]);
});
