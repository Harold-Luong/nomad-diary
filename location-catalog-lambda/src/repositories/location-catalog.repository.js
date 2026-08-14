import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const AWS_REGION = "ap-southeast-1";
const TABLE_NAME = "LocationCatalog";

const dynamoDBClient = new DynamoDBClient({ region: AWS_REGION });
const defaultDocumentClient = DynamoDBDocumentClient.from(dynamoDBClient, {
    marshallOptions: {
        removeUndefinedValues: true,
    },
});

function mapProvince(item) {
    return {
        code: item.code,
        name: item.name,
    };
}

function mapWard(item) {
    return {
        code: item.code,
        provinceCode: item.provinceCode,
        name: item.name,
    };
}

export function createLocationCatalogRepository(documentClient = defaultDocumentClient) {
    return {
        async listProvinces() {
            const response = await documentClient.send(
                new QueryCommand({
                    TableName: TABLE_NAME,
                    IndexName: "GSI1",
                    KeyConditionExpression: "GSI1PK = :country",
                    FilterExpression: "#status = :active",
                    ProjectionExpression: "#code, #name",
                    ExpressionAttributeNames: {
                        "#code": "code",
                        "#name": "name",
                        "#status": "status",
                    },
                    ExpressionAttributeValues: {
                        ":country": "COUNTRY#VN",
                        ":active": "ACTIVE",
                    },
                }),
            );

            return (response.Items || []).map(mapProvince);
        },

        async listWards(provinceCode) {
            const response = await documentClient.send(
                new QueryCommand({
                    TableName: TABLE_NAME,
                    KeyConditionExpression: "PK = :province AND begins_with(SK, :ward)",
                    FilterExpression: "#status = :active",
                    ProjectionExpression: "#code, #name, provinceCode",
                    ExpressionAttributeNames: {
                        "#code": "code",
                        "#name": "name",
                        "#status": "status",
                    },
                    ExpressionAttributeValues: {
                        ":province": `PROVINCE#${provinceCode}`,
                        ":ward": "WARD#",
                        ":active": "ACTIVE",
                    },
                }),
            );

            return (response.Items || []).map(mapWard);
        },
    };
}
