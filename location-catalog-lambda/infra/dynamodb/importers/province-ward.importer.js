import { BatchWriteCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

import { normalizeName } from "../../../src/shared/normalize.js";

export const PROVINCES_API_URL = "https://provinces.open-api.vn/api/v2/?depth=2";
export const TABLE_NAME = "LocationCatalog";

const ADMINISTRATIVE_VERSION = "2025-v2";
const SOURCE = "PROVINCE_OPEN_API";
const MAX_BATCH_SIZE = 25;
const MAX_BATCH_ATTEMPTS = 5;

function normalizeCode(value, width, label) {
  const numericCode = Number(value);

  if (!Number.isSafeInteger(numericCode) || numericCode < 0) {
    throw new Error(`${label} must be a non-negative integer.`);
  }

  return String(numericCode).padStart(width, "0");
}

function requireName(value, label) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} name is required.`);
  }

  return value.trim();
}

export function mapProvince(province, syncedAt) {
  const code = normalizeCode(province?.code, 2, "Province code");
  const name = requireName(province?.name, `Province ${code}`);

  return {
    PK: `PROVINCE#${code}`,
    SK: "META",
    entityType: "PROVINCE",
    countryCode: "VN",
    code,
    name,
    normalizedName: normalizeName(name),
    administrativeVersion: ADMINISTRATIVE_VERSION,
    status: "ACTIVE",
    source: SOURCE,
    syncedAt,
    GSI1PK: "COUNTRY#VN",
    GSI1SK: `PROVINCE#${code}`,
  };
}

export function mapWard(ward, provinceCode, syncedAt) {
  const code = normalizeCode(ward?.code, 5, "Ward code");
  const name = requireName(ward?.name, `Ward ${code}`);

  return {
    PK: `PROVINCE#${provinceCode}`,
    SK: `WARD#${code}`,
    entityType: "WARD",
    code,
    provinceCode,
    name,
    normalizedName: normalizeName(name),
    administrativeVersion: ADMINISTRATIVE_VERSION,
    status: "ACTIVE",
    source: SOURCE,
    syncedAt,
  };
}

export function mapAdministrativeItems(provinces, syncedAt = new Date().toISOString()) {
  if (!Array.isArray(provinces) || provinces.length === 0) {
    throw new Error("Province Open API response must be a non-empty array.");
  }

  const items = [];
  let wardCount = 0;

  for (const province of provinces) {
    if (!Array.isArray(province?.wards)) {
      throw new Error(`Province ${province?.code ?? "unknown"} wards must be an array.`);
    }

    const provinceItem = mapProvince(province, syncedAt);
    items.push(provinceItem);

    for (const ward of province.wards) {
      items.push(mapWard(ward, provinceItem.code, syncedAt));
      wardCount += 1;
    }
  }

  return {
    items,
    provinceCount: provinces.length,
    wardCount,
    syncedAt,
  };
}

export async function fetchAdministrativeData({
  fetchImpl = fetch,
  timeoutMs = 10_000,
  maxAttempts = 3,
} = {}) {
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetchImpl(PROVINCES_API_URL, {
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (!response.ok) {
        throw new Error(`Province Open API returned HTTP ${response.status}.`);
      }

      const data = await response.json();
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error("Province Open API returned an invalid response.");
      }

      return data;
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** (attempt - 1)));
      }
    }
  }

  throw new Error(`Could not fetch Province Open API after ${maxAttempts} attempts.`, {
    cause: lastError,
  });
}

function chunk(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

export async function batchWriteItems(
  documentClient,
  items,
  {
    tableName = TABLE_NAME,
    maxAttempts = MAX_BATCH_ATTEMPTS,
    sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
  } = {},
) {
  let writtenCount = 0;

  for (const batch of chunk(items, MAX_BATCH_SIZE)) {
    let pending = batch.map((Item) => ({ PutRequest: { Item } }));

    for (let attempt = 1; pending.length > 0 && attempt <= maxAttempts; attempt += 1) {
      const response = await documentClient.send(
        new BatchWriteCommand({ RequestItems: { [tableName]: pending } }),
      );

      const unprocessed = response.UnprocessedItems?.[tableName] || [];
      writtenCount += pending.length - unprocessed.length;
      pending = unprocessed;

      if (pending.length > 0 && attempt < maxAttempts) {
        await sleep(100 * 2 ** (attempt - 1));
      }
    }

    if (pending.length > 0) {
      throw new Error(`DynamoDB did not process ${pending.length} items after ${maxAttempts} attempts.`);
    }
  }

  return writtenCount;
}

export async function importProvinceAndWardData(dynamoDBClient, options = {}) {
  const provinces = await fetchAdministrativeData(options);
  const mapped = mapAdministrativeItems(provinces);
  const documentClient =
    options.documentClient ||
    DynamoDBDocumentClient.from(dynamoDBClient, {
      marshallOptions: { removeUndefinedValues: true },
    });

  const writtenCount = await batchWriteItems(documentClient, mapped.items, options);

  return {
    provinceCount: mapped.provinceCount,
    wardCount: mapped.wardCount,
    writtenCount,
    syncedAt: mapped.syncedAt,
  };
}
