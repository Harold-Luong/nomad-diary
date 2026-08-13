import assert from "node:assert/strict";
import test from "node:test";

import { createLocationCatalogTableDefinition } from "../../infra/dynamodb/tables/location-catalog.table.js";
import { findTableSchemaDifferences } from "../../infra/dynamodb/utils/table-helper.js";

test("defines LocationCatalog with PK, SK, GSI1, GSI2, and on-demand billing", () => {
    const definition = createLocationCatalogTableDefinition("LocationCatalogTest");

    assert.equal(definition.TableName, "LocationCatalogTest");
    assert.equal(definition.BillingMode, "PAY_PER_REQUEST");
    assert.deepEqual(definition.KeySchema, [
        { AttributeName: "PK", KeyType: "HASH" },
        { AttributeName: "SK", KeyType: "RANGE" },
    ]);
    assert.deepEqual(
        definition.GlobalSecondaryIndexes.map(({ IndexName }) => IndexName),
        ["GSI1", "GSI2"],
    );
});

test("accepts a matching DynamoDB table description", () => {
    const definition = createLocationCatalogTableDefinition();
    const description = {
        AttributeDefinitions: definition.AttributeDefinitions,
        KeySchema: definition.KeySchema,
        GlobalSecondaryIndexes: definition.GlobalSecondaryIndexes.map((index) => ({
            ...index,
            IndexStatus: "ACTIVE",
        })),
        BillingModeSummary: { BillingMode: "PAY_PER_REQUEST" },
    };

    assert.deepEqual(findTableSchemaDifferences(definition, description), []);
});

test("detects a missing Ward-to-Place GSI", () => {
    const definition = createLocationCatalogTableDefinition();
    const description = {
        AttributeDefinitions: definition.AttributeDefinitions,
        KeySchema: definition.KeySchema,
        GlobalSecondaryIndexes: definition.GlobalSecondaryIndexes.slice(0, 1),
        BillingModeSummary: { BillingMode: "PAY_PER_REQUEST" },
    };

    assert.deepEqual(findTableSchemaDifferences(definition, description), ["index GSI2: missing"]);
});
