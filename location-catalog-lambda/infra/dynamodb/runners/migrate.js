import { pathToFileURL } from "node:url";

import { createLocationCatalogTableDefinition } from "../tables/location-catalog.table.js";
import { createDynamoDBClient } from "../utils/client.js";
import { createOrVerifyTable } from "../utils/table-helper.js";

export async function runMigration(client) {
    console.log("Starting Location Catalog DynamoDB migration...");
    await createOrVerifyTable(client, createLocationCatalogTableDefinition());
    console.log("Location Catalog DynamoDB migration completed.");
}

const isMainModule =
    process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
    const client = createDynamoDBClient();

    runMigration(client)
        .catch((error) => {
            console.error(error);
            process.exitCode = 1;
        })
        .finally(() => client.destroy());
}
