import { createLocationCatalogTableDefinition } from "../tables/location-catalog.table.js";
import { createDynamoDBClient } from "../utils/client.js";
import { assertTableSchema, describeTable } from "../utils/table-helper.js";

const client = createDynamoDBClient();
const tableDefinition = createLocationCatalogTableDefinition();

try {
  const tableDescription = await describeTable(client, tableDefinition.TableName);
  if (!tableDescription) {
    throw new Error(`DynamoDB table "${tableDefinition.TableName}" does not exist.`);
  }

  assertTableSchema(tableDefinition, tableDescription);
  console.log(`Table "${tableDefinition.TableName}" schema is valid.`);
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  client.destroy();
}
