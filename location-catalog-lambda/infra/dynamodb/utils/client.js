import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

export function createDynamoDBClient() {
  const region = "ap-southeast-1"
  const config = { region };
  const endpoint = process.env.DYNAMODB_ENDPOINT?.trim();

  if (endpoint) {
    config.endpoint = endpoint;
    config.credentials = {
      accessKeyId: "local",
      secretAccessKey: "local",
    };
  }

  return new DynamoDBClient(config);
}
