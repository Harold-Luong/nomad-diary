import assert from "node:assert/strict";
import test from "node:test";

import {
    batchWriteItems,
    mapAdministrativeItems,
} from "../../infra/dynamodb/importers/province-ward.importer.js";

test("maps Province and Ward codes to stable string keys", () => {
    const result = mapAdministrativeItems(
        [
            {
                code: 1,
                name: "Thành phố Hà Nội",
                wards: [{ code: 4, name: "Phường Ba Đình" }],
            },
        ],
        "2026-08-13T00:00:00.000Z",
    );

    assert.equal(result.provinceCount, 1);
    assert.equal(result.wardCount, 1);
    assert.deepEqual(result.items[0], {
        PK: "PROVINCE#01",
        SK: "META",
        entityType: "PROVINCE",
        countryCode: "VN",
        code: "01",
        name: "Thành phố Hà Nội",
        normalizedName: "thanh pho ha noi",
        administrativeVersion: "2025-v2",
        status: "ACTIVE",
        source: "PROVINCE_OPEN_API",
        syncedAt: "2026-08-13T00:00:00.000Z",
        GSI1PK: "COUNTRY#VN",
        GSI1SK: "PROVINCE#01",
    });
    assert.deepEqual(result.items[1], {
        PK: "PROVINCE#01",
        SK: "WARD#00004",
        entityType: "WARD",
        code: "00004",
        provinceCode: "01",
        name: "Phường Ba Đình",
        normalizedName: "phuong ba dinh",
        administrativeVersion: "2025-v2",
        status: "ACTIVE",
        source: "PROVINCE_OPEN_API",
        syncedAt: "2026-08-13T00:00:00.000Z",
    });
});

test("writes at most 25 DynamoDB operations per batch", async () => {
    const batchSizes = [];
    const documentClient = {
        async send(command) {
            const requests = command.input.RequestItems.LocationCatalog;
            batchSizes.push(requests.length);
            return {};
        },
    };

    const items = Array.from({ length: 26 }, (_, index) => ({
        PK: `P#${index}`,
        SK: "META",
    }));

    const writtenCount = await batchWriteItems(documentClient, items);

    assert.equal(writtenCount, 26);
    assert.deepEqual(batchSizes, [25, 1]);
});

test("retries DynamoDB unprocessed items", async () => {
    let callCount = 0;
    const item = { PK: "PROVINCE#01", SK: "META" };
    const documentClient = {
        async send() {
            callCount += 1;
            if (callCount === 1) {
                return {
                    UnprocessedItems: {
                        LocationCatalog: [{ PutRequest: { Item: item } }],
                    },
                };
            }
            return {};
        },
    };

    const writtenCount = await batchWriteItems(documentClient, [item], {
        sleep: async () => { },
    });

    assert.equal(callCount, 2);
    assert.equal(writtenCount, 1);
});
