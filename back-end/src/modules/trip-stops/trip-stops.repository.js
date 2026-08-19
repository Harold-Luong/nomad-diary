import { executeQuery, query } from "../../database/pool.js";

const stopSelectColumns = `
    ts.id,
    ts.trip_id,
    ts.place_id,
    ts.visit_order,
    ts.arrived_at,
    ts.departed_at,
    ts.title,
    ts.note,
    ts.created_at,
    ts.updated_at,
    p.name AS place_name,
    p.slug AS place_slug,
    p.catalog_place_id,
    p.ward_code,
    p.ward AS ward_name,
    p.address AS place_address,
    p.latitude AS place_latitude,
    p.longitude AS place_longitude,
    p.province_id,
    pr.country_code,
    pr.name AS province_name,
    pr.code AS province_code
`;

const activeStopJoins = `
    JOIN trips t
      ON t.id = ts.trip_id
     AND t.is_deleted = false
    JOIN places p
      ON p.id = ts.place_id
     AND p.is_deleted = false
    JOIN provinces pr
      ON pr.id = p.province_id
     AND pr.is_deleted = false
`;

export async function findOwnedTrip(id, userId, executor = query) {
    const result = await executeQuery(
        executor,
        `
            SELECT t.id
            FROM trips t
            WHERE t.id = $1
              AND t.user_id = $2
              AND t.is_deleted = false
        `,
        [id, userId],
    );

    return result.rows[0] ?? null;
}

export async function lockOwnedTrip(id, userId, executor = query) {
    const result = await executeQuery(
        executor,
        `
            SELECT t.id
            FROM trips t
            WHERE t.id = $1
              AND t.user_id = $2
              AND t.is_deleted = false
            FOR UPDATE
        `,
        [id, userId],
    );

    return result.rows[0] ?? null;
}

export async function findActivePlace(id, executor = query) {
    const result = await executeQuery(
        executor,
        `
            SELECT p.id
            FROM places p
            JOIN provinces pr
              ON pr.id = p.province_id
             AND pr.is_deleted = false
            WHERE p.id = $1
              AND p.is_deleted = false
        `,
        [id],
    );

    return result.rows[0] ?? null;
}

export async function upsertProvince(data, executor = query) {
    const inserted = await executeQuery(
        executor,
        `
            INSERT INTO provinces (country_code, code, name, slug)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (country_code, code) WHERE is_deleted = false
            DO NOTHING
            RETURNING id
        `,
        [data.countryCode, data.provinceCode, data.provinceName, data.provinceSlug],
    );

    if (inserted.rows[0]) {
        return inserted.rows[0];
    }

    const existing = await executeQuery(
        executor,
        `
            SELECT id
            FROM provinces
            WHERE country_code = $1
              AND code = $2
              AND is_deleted = false
        `,
        [data.countryCode, data.provinceCode],
    );

    return existing.rows[0];
}

export async function findCatalogPlace(data, executor = query) {
    if (!data.catalogPlaceId) {
        return null;
    }

    const result = await executeQuery(
        executor,
        `
            SELECT id
            FROM places
            WHERE catalog_place_id = $1
              AND is_deleted = false
        `,
        [data.catalogPlaceId],
    );

    return result.rows[0] ?? null;
}

export async function findLegacyPlace(data, executor = query) {
    if (!data.catalogPlaceId) {
        return null;
    }

    const result = await executeQuery(
        executor,
        `
            SELECT id
            FROM places
            WHERE province_id = $1
              AND slug = $2
              AND ward_code IS NULL
              AND catalog_place_id IS NULL
              AND is_deleted = false
            ORDER BY id
            LIMIT 1
        `,
        [data.provinceId, data.slug],
    );

    return result.rows[0] ?? null;
}

export async function upsertPlace(data, executor = query) {
    const hasCatalogId = Boolean(data.catalogPlaceId);
    const conflictClause = hasCatalogId
        ? `
            ON CONFLICT (catalog_place_id)
            WHERE is_deleted = false AND catalog_place_id IS NOT NULL
            DO NOTHING
        `
        : `
            ON CONFLICT (province_id, ward_code, slug)
            WHERE is_deleted = false
              AND catalog_place_id IS NULL
              AND ward_code IS NOT NULL
            DO NOTHING
        `;
    const inserted = await executeQuery(
        executor,
        `
            INSERT INTO places (
                province_id,
                name,
                slug,
                ward_code,
                ward,
                address,
                catalog_place_id,
                latitude,
                longitude
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ${conflictClause}
            RETURNING id
        `,
        [
            data.provinceId,
            data.name,
            data.slug,
            data.wardCode,
            data.wardName,
            data.address,
            data.catalogPlaceId,
            data.latitude,
            data.longitude,
        ],
    );

    if (inserted.rows[0]) {
        return inserted.rows[0];
    }

    const existing = await executeQuery(
        executor,
        hasCatalogId
            ? `
                SELECT id
                FROM places
                WHERE catalog_place_id = $1
                  AND is_deleted = false
            `
            : `
                SELECT id
                FROM places
                WHERE province_id = $1
                  AND ward_code = $2
                  AND slug = $3
                  AND catalog_place_id IS NULL
                  AND is_deleted = false
            `,
        hasCatalogId
            ? [data.catalogPlaceId]
            : [data.provinceId, data.wardCode, data.slug],
    );

    return existing.rows[0];
}

export async function listForTrip(tripId, userId, executor = query) {
    const result = await executeQuery(
        executor,
        `
            SELECT ${stopSelectColumns}
            FROM trip_stops ts
            ${activeStopJoins}
            WHERE ts.trip_id = $1
              AND t.user_id = $2
              AND ts.is_deleted = false
            ORDER BY ts.visit_order ASC, ts.id ASC
        `,
        [tripId, userId],
    );

    return result.rows;
}

export async function findByIdForUser(id, userId, executor = query) {
    const result = await executeQuery(
        executor,
        `
            SELECT ${stopSelectColumns}
            FROM trip_stops ts
            ${activeStopJoins}
            WHERE ts.id = $1
              AND t.user_id = $2
              AND ts.is_deleted = false
        `,
        [id, userId],
    );

    return result.rows[0] ?? null;
}

export async function findActiveByTripAndOrder(
    tripId,
    visitOrder,
    excludeStopId,
    executor = query,
) {
    const values = [tripId, visitOrder];
    let excludeClause = "";

    if (excludeStopId !== undefined && excludeStopId !== null) {
        values.push(excludeStopId);
        excludeClause = ` AND ts.id <> $${values.length}`;
    }

    const result = await executeQuery(
        executor,
        `
            SELECT ts.id
            FROM trip_stops ts
            WHERE ts.trip_id = $1
              AND ts.visit_order = $2
              AND ts.is_deleted = false
              ${excludeClause}
            LIMIT 1
        `,
        values,
    );

    return result.rows[0] ?? null;
}

export async function getNextVisitOrder(tripId, executor = query) {
    const result = await executeQuery(
        executor,
        `
            SELECT COALESCE(MAX(ts.visit_order), 0) + 1 AS next_visit_order
            FROM trip_stops ts
            WHERE ts.trip_id = $1
              AND ts.is_deleted = false
        `,
        [tripId],
    );

    return Number(result.rows[0].next_visit_order);
}

export async function create(tripId, data, executor = query) {
    const result = await executeQuery(
        executor,
        `
            INSERT INTO trip_stops (
                trip_id,
                place_id,
                visit_order,
                arrived_at,
                departed_at,
                title,
                note
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING
                id,
                trip_id,
                place_id,
                visit_order,
                arrived_at,
                departed_at,
                title,
                note,
                created_at,
                updated_at
        `,
        [
            tripId,
            data.placeId,
            data.visitOrder,
            data.arrivedAt,
            data.departedAt,
            data.title,
            data.note,
        ],
    );

    return result.rows[0];
}

export async function update(id, userId, data, executor = query) {
    const columns = {
        placeId: "place_id",
        visitOrder: "visit_order",
        arrivedAt: "arrived_at",
        departedAt: "departed_at",
        title: "title",
        note: "note",
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
            UPDATE trip_stops ts
            SET ${setClauses.join(", ")}, updated_at = now()
            FROM trips t
            WHERE ts.id = $1
              AND ts.trip_id = t.id
              AND t.user_id = $2
              AND t.is_deleted = false
              AND ts.is_deleted = false
            RETURNING
                ts.id,
                ts.trip_id,
                ts.place_id,
                ts.visit_order,
                ts.arrived_at,
                ts.departed_at,
                ts.title,
                ts.note,
                ts.created_at,
                ts.updated_at
        `,
        values,
    );

    return result.rows[0] ?? null;
}

export async function softDelete(id, userId, executor = query) {
    const result = await executeQuery(
        executor,
        `
            UPDATE trip_stops ts
            SET is_deleted = true,
                updated_at = now()
            FROM trips t
            WHERE ts.id = $1
              AND ts.trip_id = t.id
              AND t.user_id = $2
              AND t.is_deleted = false
              AND ts.is_deleted = false
            RETURNING ts.id
        `,
        [id, userId],
    );

    return result.rows[0] ?? null;
}

export async function lockActiveStopsForTrip(tripId, executor = query) {
    const result = await executeQuery(
        executor,
        `
            SELECT ts.id, ts.visit_order
            FROM trip_stops ts
            WHERE ts.trip_id = $1
              AND ts.is_deleted = false
            ORDER BY ts.visit_order ASC, ts.id ASC
            FOR UPDATE
        `,
        [tripId],
    );

    return result.rows;
}

export async function moveActiveOrdersOutOfRange(
    tripId,
    offset,
    executor = query,
) {
    await executeQuery(
        executor,
        `
            UPDATE trip_stops
            SET visit_order = visit_order + $2,
                updated_at = now()
            WHERE trip_id = $1
              AND is_deleted = false
        `,
        [tripId, offset],
    );
}

export async function updateVisitOrder(id, visitOrder, executor = query) {
    await executeQuery(
        executor,
        `
            UPDATE trip_stops
            SET visit_order = $2,
                updated_at = now()
            WHERE id = $1
              AND is_deleted = false
        `,
        [id, visitOrder],
    );
}
