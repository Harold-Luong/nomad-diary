import {
  CreateTableCommand,
  DescribeTableCommand,
  waitUntilTableExists,
} from "@aws-sdk/client-dynamodb";

function keySchemaMap(keySchema = []) {
  return new Map(keySchema.map(({ AttributeName, KeyType }) => [AttributeName, KeyType]));
}

function attributeDefinitionMap(attributeDefinitions = []) {
  return new Map(
    attributeDefinitions.map(({ AttributeName, AttributeType }) => [
      AttributeName,
      AttributeType,
    ]),
  );
}

function compareKeySchema(label, expected, actual, differences) {
  const actualKeys = keySchemaMap(actual);

  for (const expectedKey of expected) {
    const actualKeyType = actualKeys.get(expectedKey.AttributeName);

    if (actualKeyType !== expectedKey.KeyType) {
      differences.push(
        `${label}.${expectedKey.AttributeName}: expected ${expectedKey.KeyType}, received ${actualKeyType || "missing"}`,
      );
    }
  }

  if (actualKeys.size !== expected.length) {
    differences.push(`${label}: expected ${expected.length} keys, received ${actualKeys.size}`);
  }
}

export function findTableSchemaDifferences(tableDefinition, tableDescription) {
  const differences = [];

  compareKeySchema("table key", tableDefinition.KeySchema, tableDescription.KeySchema, differences);

  const actualAttributes = attributeDefinitionMap(tableDescription.AttributeDefinitions);
  for (const expectedAttribute of tableDefinition.AttributeDefinitions) {
    const actualType = actualAttributes.get(expectedAttribute.AttributeName);
    if (actualType !== expectedAttribute.AttributeType) {
      differences.push(
        `attribute ${expectedAttribute.AttributeName}: expected ${expectedAttribute.AttributeType}, received ${actualType || "missing"}`,
      );
    }
  }

  const actualIndexes = new Map(
    (tableDescription.GlobalSecondaryIndexes || []).map((index) => [index.IndexName, index]),
  );

  for (const expectedIndex of tableDefinition.GlobalSecondaryIndexes || []) {
    const actualIndex = actualIndexes.get(expectedIndex.IndexName);
    if (!actualIndex) {
      differences.push(`index ${expectedIndex.IndexName}: missing`);
      continue;
    }

    compareKeySchema(
      `index ${expectedIndex.IndexName}`,
      expectedIndex.KeySchema,
      actualIndex.KeySchema,
      differences,
    );

    if (actualIndex.Projection?.ProjectionType !== expectedIndex.Projection.ProjectionType) {
      differences.push(
        `index ${expectedIndex.IndexName} projection: expected ${expectedIndex.Projection.ProjectionType}, received ${actualIndex.Projection?.ProjectionType || "missing"}`,
      );
    }
  }

  const billingMode = tableDescription.BillingModeSummary?.BillingMode || "PROVISIONED";
  if (billingMode !== tableDefinition.BillingMode) {
    differences.push(
      `billing mode: expected ${tableDefinition.BillingMode}, received ${billingMode}`,
    );
  }

  return differences;
}

export function assertTableSchema(tableDefinition, tableDescription) {
  const differences = findTableSchemaDifferences(tableDefinition, tableDescription);

  if (differences.length > 0) {
    throw new Error(
      `DynamoDB table "${tableDefinition.TableName}" has schema drift:\n- ${differences.join("\n- ")}`,
    );
  }
}

export async function describeTable(client, tableName) {
  try {
    const response = await client.send(new DescribeTableCommand({ TableName: tableName }));
    return response.Table;
  } catch (error) {
    if (error?.name === "ResourceNotFoundException") {
      return null;
    }
    throw error;
  }
}

export async function createOrVerifyTable(client, tableDefinition) {
  let tableDescription = await describeTable(client, tableDefinition.TableName);

  if (!tableDescription) {
    console.log(`Creating DynamoDB table "${tableDefinition.TableName}"...`);
    await client.send(new CreateTableCommand(tableDefinition));
    await waitUntilTableExists(
      { client, maxWaitTime: 120 },
      { TableName: tableDefinition.TableName },
    );
    tableDescription = await describeTable(client, tableDefinition.TableName);
    console.log(`Table "${tableDefinition.TableName}" created successfully.`);
  } else {
    console.log(`Table "${tableDefinition.TableName}" already exists. Verifying schema...`);
  }

  assertTableSchema(tableDefinition, tableDescription);
  console.log(`Table "${tableDefinition.TableName}" schema is valid.`);
}
