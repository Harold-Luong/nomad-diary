import assert from "node:assert/strict";
import test from "node:test";

import { QueryCommand } from "@aws-sdk/lib-dynamodb";

import { createLocationCatalogRepository } from "../../src/repositories/location-catalog.repository.js";

test("listProvinces queries GSI1 without returning DynamoDB keys", async () => {
    let command;
    const documentClient = {
        async send(receivedCommand) {
            command = receivedCommand;
            return {
                Items: [
                    {
                        PK: "PROVINCE#01",
                        SK: "META",
                        code: "01",
                        name: "Thành phố Hà Nội",
                    },
                ],
            };
        },
    };
    const repository = createLocationCatalogRepository(documentClient);

    const provinces = await repository.listProvinces();

    assert.ok(command instanceof QueryCommand);
    assert.equal(command.input.TableName, "LocationCatalog");
    assert.equal(command.input.IndexName, "GSI1");
    assert.equal(command.input.ExpressionAttributeValues[":country"], "COUNTRY#VN");
    assert.deepEqual(provinces, [{ code: "01", name: "Thành phố Hà Nội" }]);
});

test("listWards queries only ward items inside the selected province", async () => {
    let command;
    const documentClient = {
        async send(receivedCommand) {
            command = receivedCommand;
            return {
                Items: [
                    {
                        PK: "PROVINCE#01",
                        SK: "WARD#00004",
                        code: "00004",
                        provinceCode: "01",
                        name: "Phường Ba Đình",
                    },
                ],
            };
        },
    };
    const repository = createLocationCatalogRepository(documentClient);

    const wards = await repository.listWards("01");

    assert.ok(command instanceof QueryCommand);
    assert.equal(command.input.TableName, "LocationCatalog");
    assert.equal(command.input.IndexName, undefined);
    assert.equal(command.input.ExpressionAttributeValues[":province"], "PROVINCE#01");
    assert.equal(command.input.ExpressionAttributeValues[":ward"], "WARD#");
    assert.deepEqual(wards, [
        { code: "00004", provinceCode: "01", name: "Phường Ba Đình" },
    ]);
});
