import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

export function createDynamoDBClient() {
    return new DynamoDBClient({
        region: "ap-southeast-1",
    });
}