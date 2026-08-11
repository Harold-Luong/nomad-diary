import { executeQuery, query } from "../../database/pool.js";
import { IMAGE_SORT } from "./images.schema.js";

const imageRecordColumns = `
    id,
    trip_id,
    trip_stop_id,
    image_key,
    thumbnail_key,
    original_filename,
    description,
    captured_at,
    latitude,
    longitude,
    width,
    height,
    file_size,
    mime_type,
    sort_order,
    is_cover,
    is_favorite,
    ai_tags,
    created_at,
    updated_at
`;

const imageSelectColumns = `
    i.id,
    i.trip_id,
    i.trip_stop_id,
    i.image_key,
    i.thumbnail_key,
    i.original_filename,
    i.description,
    i.captured_at,
    i.latitude,
    i.longitude,
    i.width,
    i.height,
    i.file_size,
    i.mime_type,
    i.sort_order,
    i.is_cover,
    i.is_favorite,
    i.ai_tags,
    i.created_at,
    i.updated_at,
    ts.place_id,
    p.name AS place_name,
    p.slug AS place_slug,
    p.province_id,
    pr.name AS province_name,
    pr.code AS province_code
`;

const activeImageJoins = `
    JOIN trips t
      ON t.id = i.trip_id
     AND t.is_deleted = false
    LEFT JOIN trip_stops ts
      ON ts.id = i.trip_stop_id
     AND ts.trip_id = i.trip_id
     AND ts.is_deleted = false
    LEFT JOIN places p
      ON p.id = ts.place_id
     AND p.is_deleted = false
    LEFT JOIN provinces pr
      ON pr.id = p.province_id
     AND pr.is_deleted = false
`;

const SORT_SQL = {
    [IMAGE_SORT.CREATED_AT_DESC]: "i.created_at DESC, i.id DESC",
    [IMAGE_SORT.CREATED_AT_ASC]: "i.created_at ASC, i.id ASC",
    [IMAGE_SORT.CAPTURED_AT_DESC]: "i.captured_at DESC NULLS LAST, i.id DESC",
    [IMAGE_SORT.CAPTURED_AT_ASC]: "i.captured_at ASC NULLS LAST, i.id ASC",
    [IMAGE_SORT.SORT_ORDER_ASC]: "i.sort_order ASC, i.id ASC",
    [IMAGE_SORT.SORT_ORDER_DESC]: "i.sort_order DESC, i.id DESC",
};

function buildFilters(filters) {
    const values = [filters.userId];
    const clauses = ["t.user_id = $1", "i.is_deleted = false"];

    const addFilter = (value, sql) => {
        if (value === undefined) {
            return;
        }

        values.push(value);
        clauses.push(sql.replace("?", `$${values.length}`));
    };

    addFilter(filters.tripId, "i.trip_id = ?");
    addFilter(filters.tripStopId, "i.trip_stop_id = ?");
    addFilter(filters.placeId, "ts.place_id = ?");
    addFilter(filters.provinceId, "p.province_id = ?");
    addFilter(filters.favorite, "i.is_favorite = ?");
    addFilter(filters.cover, "i.is_cover = ?");
    addFilter(filters.from, "i.captured_at >= ?::date");
    addFilter(filters.to, "i.captured_at < (?::date + INTERVAL '1 day')");

    return { clauses, values };
}

export async function listForUser(filters, executor = query) {
    const { clauses, values } = buildFilters(filters);
    const listValues = [...values, filters.limit, filters.offset];
    const where = clauses.join(" AND ");
    const orderBy = SORT_SQL[filters.sort] ?? SORT_SQL[IMAGE_SORT.CREATED_AT_DESC];

    const [listResult, countResult] = await Promise.all([
        executeQuery(
            executor,
            `
                SELECT ${imageSelectColumns}
                FROM images i
                ${activeImageJoins}
                WHERE ${where}
                ORDER BY ${orderBy}
                LIMIT $${listValues.length - 1}
                OFFSET $${listValues.length}
            `,
            listValues,
        ),
        executeQuery(
            executor,
            `
                SELECT COUNT(*) AS total
                FROM images i
                ${activeImageJoins}
                WHERE ${where}
            `,
            values,
        ),
    ]);

    return {
        rows: listResult.rows,
        total: Number(countResult.rows[0].total),
    };
}

export async function findByIdForUser(id, userId, executor = query) {
    const result = await executeQuery(
        executor,
        `
            SELECT ${imageSelectColumns}
            FROM images i
            ${activeImageJoins}
            WHERE i.id = $1
              AND t.user_id = $2
              AND i.is_deleted = false
        `,
        [id, userId],
    );

    return result.rows[0] ?? null;
}

export async function findOwnedTrip(tripId, userId, executor = query) {
    const result = await executeQuery(
        executor,
        `
            SELECT t.id
            FROM trips t
            WHERE t.id = $1
              AND t.user_id = $2
              AND t.is_deleted = false
        `,
        [tripId, userId],
    );

    return result.rows[0] ?? null;
}

export async function findOwnedTripStopForTrip(
    tripStopId,
    tripId,
    userId,
    executor = query,
) {
    const result = await executeQuery(
        executor,
        `
            SELECT ts.id
            FROM trip_stops ts
            JOIN trips t
              ON t.id = ts.trip_id
             AND t.is_deleted = false
            WHERE ts.id = $1
              AND ts.trip_id = $2
              AND t.user_id = $3
              AND ts.is_deleted = false
        `,
        [tripStopId, tripId, userId],
    );

    return result.rows[0] ?? null;
}

export async function create(userId, data, executor = query) {
    const result = await executeQuery(
        executor,
        `
            INSERT INTO images (
                trip_id,
                trip_stop_id,
                image_key,
                thumbnail_key,
                original_filename,
                description,
                captured_at,
                latitude,
                longitude,
                width,
                height,
                file_size,
                mime_type,
                sort_order,
                is_cover,
                is_favorite,
                ai_tags
            )
            SELECT
                t.id,
                $3,
                $4,
                $5,
                $6,
                $7,
                $8,
                $9,
                $10,
                $11,
                $12,
                $13,
                $14,
                $15,
                $16,
                $17,
                $18
            FROM trips t
            WHERE t.id = $1
              AND t.user_id = $2
              AND t.is_deleted = false
            RETURNING ${imageRecordColumns}
        `,
        [
            data.tripId,
            userId,
            data.tripStopId,
            data.imageObjectKey,
            data.thumbnailObjectKey,
            data.originalFilename,
            data.description,
            data.capturedAt,
            data.latitude,
            data.longitude,
            data.width,
            data.height,
            data.fileSize,
            data.mimeType,
            data.sortOrder,
            data.isCover,
            data.isFavorite,
            data.aiTags,
        ],
    );

    return result.rows[0] ?? null;
}

export async function update(id, userId, data, executor = query) {
    const columns = {
        tripStopId: "trip_stop_id",
        imageObjectKey: "image_key",
        thumbnailObjectKey: "thumbnail_key",
        originalFilename: "original_filename",
        description: "description",
        capturedAt: "captured_at",
        latitude: "latitude",
        longitude: "longitude",
        width: "width",
        height: "height",
        fileSize: "file_size",
        mimeType: "mime_type",
        sortOrder: "sort_order",
        isCover: "is_cover",
        isFavorite: "is_favorite",
        aiTags: "ai_tags",
    };
    const values = [id, userId];
    const setClauses = [];

    for (const [key, column] of Object.entries(columns)) {
        if (Object.hasOwn(data, key)) {
            values.push(data[key]);
            setClauses.push(`${column} = $${values.length}`);
        }
    }

    const result = await executeQuery(
        executor,
        `
            UPDATE images i
            SET ${setClauses.join(", ")}, updated_at = now()
            FROM trips t
            WHERE i.id = $1
              AND i.trip_id = t.id
              AND t.user_id = $2
              AND t.is_deleted = false
              AND i.is_deleted = false
            RETURNING i.id
        `,
        values,
    );

    return result.rows[0] ?? null;
}

export async function softDelete(id, userId, executor = query) {
    const result = await executeQuery(
        executor,
        `
            UPDATE images i
            SET is_deleted = true,
                updated_at = now()
            FROM trips t
            WHERE i.id = $1
              AND i.trip_id = t.id
              AND t.user_id = $2
              AND t.is_deleted = false
              AND i.is_deleted = false
            RETURNING i.id
        `,
        [id, userId],
    );

    return result.rows[0] ?? null;
}
