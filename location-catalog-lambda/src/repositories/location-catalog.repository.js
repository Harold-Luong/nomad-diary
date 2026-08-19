import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";

import { normalizeSearchKey } from "../shared/normalize.js";

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

function mapPlace(item) {
    return {
        placeId: item.placeId,
        provinceCode: item.provinceCode,
        wardCode: item.wardCode,
        name: item.name
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

        async getActiveWard(provinceCode, wardCode) {
            const response = await documentClient.send(
                new GetCommand({
                    TableName: TABLE_NAME,
                    Key: {
                        PK: `PROVINCE#${provinceCode}`,
                        SK: `WARD#${wardCode}`,
                    },
                    ProjectionExpression: "#code, provinceCode, #name, #status, entityType",
                    ExpressionAttributeNames: {
                        "#code": "code",
                        "#name": "name",
                        "#status": "status",
                    },
                }),
            );

            if (response.Item?.entityType !== "WARD" || response.Item?.status !== "ACTIVE") {
                return null;
            }

            return mapWard(response.Item);
        },

        async listPlacesByWard(
            provinceCode,
            wardCode,
            { search, featured, limit, exclusiveStartKey } = {},
        ) {
            const searchKey = search ? normalizeSearchKey(search) : "";
            const expressionAttributeNames = {
                "#name": "name",
                "#description": "description",
                "#address": "address",
            };
            const expressionAttributeValues = {
                ":wardPlaces": `PROVINCE#${provinceCode}#WARD#${wardCode}#PLACES`,
                ":activeNamePrefix": `STATUS#ACTIVE#NAME#${searchKey}`,
            };
            const input = {
                TableName: TABLE_NAME,
                IndexName: "GSI2",
                KeyConditionExpression:
                    "GSI2PK = :wardPlaces AND begins_with(GSI2SK, :activeNamePrefix)",
                ProjectionExpression:
                    "placeId, provinceCode, wardCode, #name, #description, #address, latitude, longitude, isFeatured",
                ExpressionAttributeNames: expressionAttributeNames,
                ExpressionAttributeValues: expressionAttributeValues,
                Limit: limit,
                ExclusiveStartKey: exclusiveStartKey,
            };

            if (featured !== undefined) {
                input.FilterExpression = "isFeatured = :isFeatured";
                input.ExpressionAttributeValues[":isFeatured"] = featured;
            }

            const response = await documentClient.send(new QueryCommand(input));

            return {
                items: (response.Items || []).map(mapPlace),
                lastEvaluatedKey: response.LastEvaluatedKey,
            };
        },

        async getActivePlace(provinceCode, placeId) {
            const response = await documentClient.send(
                new GetCommand({
                    TableName: TABLE_NAME,
                    Key: {
                        PK: `PROVINCE#${provinceCode}`,
                        SK: `PLACE#${placeId}`,
                    },
                    ProjectionExpression:
                        "placeId, provinceCode, wardCode, #name, #description, #address, latitude, longitude, isFeatured, #status, entityType",
                    ExpressionAttributeNames: {
                        "#name": "name",
                        "#description": "description",
                        "#address": "address",
                        "#status": "status",
                    },
                }),
            );

            if (response.Item?.entityType !== "PLACE" || response.Item?.status !== "ACTIVE") {
                return null;
            }

            return mapPlace(response.Item);
        },
    };
}
