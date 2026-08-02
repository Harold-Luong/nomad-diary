import { executeQuery, query } from "../../database/pool.js";

const provinceTrackingJoin = `
    LEFT JOIN LATERAL (
        SELECT
            COUNT(DISTINCT t.id)::integer AS trip_count,
            COUNT(DISTINCT ts.place_id)::integer AS place_count,
            COUNT(ts.id)::integer AS visit_count,
            MIN(ts.arrived_at) AS first_visited_at,
            MAX(ts.arrived_at) AS last_visited_at
        FROM places visited_place
        JOIN trip_stops ts
          ON ts.place_id = visited_place.id
         AND ts.is_deleted = false
        JOIN trips t
          ON t.id = ts.trip_id
         AND t.user_id = $1
         AND t.is_deleted = false
        WHERE visited_place.province_id = pr.id
          AND visited_place.is_deleted = false
    ) tracking ON true
`;

const provinceSelectColumns = `
    pr.id,
    pr.country_code,
    pr.code,
    pr.name,
    pr.slug,
    pr.center_latitude,
    pr.center_longitude,
    COALESCE(tracking.trip_count, 0)::integer AS trip_count,
    COALESCE(tracking.place_count, 0)::integer AS place_count,
    COALESCE(tracking.visit_count, 0)::integer AS visit_count,
    tracking.first_visited_at,
    tracking.last_visited_at
`;

function buildProvinceFilters({ userId, countryCode, search, visited }) {
    const values = [userId];
    const clauses = ["pr.is_deleted = false"];

    if (countryCode !== undefined) {
        values.push(countryCode);
        clauses.push(`pr.country_code = $${values.length}`);
    }

    if (search !== undefined) {
        values.push(`%${search}%`);
        clauses.push(
            `(pr.name ILIKE $${values.length} OR pr.code ILIKE $${values.length})`,
        );
    }

    if (visited !== undefined) {
        clauses.push(
            visited ? "tracking.visit_count > 0" : "tracking.visit_count = 0",
        );
    }

    return { values, where: clauses.join(" AND ") };
}

export async function listForUser(
    { userId, countryCode, search, visited, limit, offset },
    executor = query,
) {
    const { values, where } = buildProvinceFilters({
        userId,
        countryCode,
        search,
        visited,
    });
    const listValues = [...values, limit, offset];

    const [listResult, countResult] = await Promise.all([
        executeQuery(
            executor,
            `
                SELECT ${provinceSelectColumns}
                FROM provinces pr
                ${provinceTrackingJoin}
                WHERE ${where}
                ORDER BY
                    (tracking.visit_count > 0) DESC,
                    tracking.last_visited_at DESC NULLS LAST,
                    lower(pr.name) ASC,
                    pr.id ASC
                LIMIT $${listValues.length - 1}
                OFFSET $${listValues.length}
            `,
            listValues,
        ),
        executeQuery(
            executor,
            `
                SELECT COUNT(*) AS total
                FROM provinces pr
                ${provinceTrackingJoin}
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

export async function listVisitedForUser(
    userId,
    { countryCode },
    executor = query,
) {
    const values = [userId];
    let countryClause = "";

    if (countryCode !== undefined) {
        values.push(countryCode);
        countryClause = `AND pr.country_code = $${values.length}`;
    }

    const result = await executeQuery(
        executor,
        `
            SELECT ${provinceSelectColumns}
            FROM provinces pr
            ${provinceTrackingJoin}
            WHERE pr.is_deleted = false
              AND tracking.visit_count > 0
              ${countryClause}
            ORDER BY
                tracking.last_visited_at DESC NULLS LAST,
                lower(pr.name) ASC,
                pr.id ASC
        `,
        values,
    );

    return result.rows;
}

export async function findByIdForUser(id, userId, executor = query) {
    const result = await executeQuery(
        executor,
        `
            SELECT ${provinceSelectColumns}
            FROM provinces pr
            ${provinceTrackingJoin}
            WHERE pr.id = $2
              AND pr.is_deleted = false
        `,
        [userId, id],
    );

    return result.rows[0] ?? null;
}

export async function activeProvinceExists(id, executor = query) {
    const result = await executeQuery(
        executor,
        `
            SELECT 1
            FROM provinces pr
            WHERE pr.id = $1
              AND pr.is_deleted = false
        `,
        [id],
    );

    return result.rowCount > 0;
}

const placeTrackingJoin = `
    LEFT JOIN LATERAL (
        SELECT
            COUNT(DISTINCT t.id)::integer AS trip_count,
            COUNT(ts.id)::integer AS visit_count,
            MIN(ts.arrived_at) AS first_visited_at,
            MAX(ts.arrived_at) AS last_visited_at
        FROM trip_stops ts
        JOIN trips t
          ON t.id = ts.trip_id
         AND t.user_id = $1
         AND t.is_deleted = false
        WHERE ts.place_id = p.id
          AND ts.is_deleted = false
    ) tracking ON true
`;

const placeSelectColumns = `
    p.id,
    p.province_id,
    p.name,
    p.slug,
    p.description,
    p.district,
    p.ward,
    p.address,
    p.latitude,
    p.longitude,
    p.website_url,
    p.map_url,
    COALESCE(tracking.trip_count, 0)::integer AS trip_count,
    COALESCE(tracking.visit_count, 0)::integer AS visit_count,
    tracking.first_visited_at,
    tracking.last_visited_at
`;

function buildPlaceFilters({ userId, provinceId, search, visited }) {
    const values = [userId, provinceId];
    const clauses = ["p.province_id = $2", "p.is_deleted = false"];

    if (search !== undefined) {
        values.push(`%${search}%`);
        clauses.push(`(
            p.name ILIKE $${values.length}
            OR COALESCE(p.district, '') ILIKE $${values.length}
            OR COALESCE(p.address, '') ILIKE $${values.length}
        )`);
    }

    if (visited !== undefined) {
        clauses.push(
            visited ? "tracking.visit_count > 0" : "tracking.visit_count = 0",
        );
    }

    return { values, where: clauses.join(" AND ") };
}

export async function listPlacesForUser(
    { userId, provinceId, search, visited, limit, offset },
    executor = query,
) {
    const { values, where } = buildPlaceFilters({
        userId,
        provinceId,
        search,
        visited,
    });
    const listValues = [...values, limit, offset];

    const [listResult, countResult] = await Promise.all([
        executeQuery(
            executor,
            `
                SELECT ${placeSelectColumns}
                FROM places p
                ${placeTrackingJoin}
                WHERE ${where}
                ORDER BY
                    (tracking.visit_count > 0) DESC,
                    tracking.last_visited_at DESC NULLS LAST,
                    lower(p.name) ASC,
                    p.id ASC
                LIMIT $${listValues.length - 1}
                OFFSET $${listValues.length}
            `,
            listValues,
        ),
        executeQuery(
            executor,
            `
                SELECT COUNT(*) AS total
                FROM places p
                ${placeTrackingJoin}
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
