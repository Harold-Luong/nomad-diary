import { importProvinceAndWardData } from "../importers/province-ward.importer.js";
import { createDynamoDBClient } from "../utils/client.js";
import { assertTableSchema, describeTable } from "../utils/table-helper.js";
import { createLocationCatalogTableDefinition } from "../tables/location-catalog.table.js";

const client = createDynamoDBClient();
const tableDefinition = createLocationCatalogTableDefinition();

try {
    const tableDescription = await describeTable(client, tableDefinition.TableName);
    if (!tableDescription) {
        throw new Error(`DynamoDB table "${tableDefinition.TableName}" does not exist.`);
    }

    assertTableSchema(tableDefinition, tableDescription);
    const summary = await importProvinceAndWardData(client);

    console.log(
        JSON.stringify({ event: "province_ward_import_completed", ...summary }),
    );
} catch (error) {
    console.error(error);
    process.exitCode = 1;
} finally {
    client.destroy();
}
