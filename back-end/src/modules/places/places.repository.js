import { executeQuery, query } from "../../database/pool.js";

const locationFilter = `
    pr.country_code = 'VN'
    AND pr.code = $2
    AND pr.is_deleted = false
    AND (
        p.ward_code = $3
        OR (
            $4::text IS NOT NULL
            AND p.ward_code IS NULL
            AND lower(btrim(p.ward)) = lower(btrim($4))
        )
    )
    AND p.is_deleted = false
    AND EXISTS (
        SELECT 1
        FROM trip_stops ts
        JOIN trips t
          ON t.id = ts.trip_id
         AND t.user_id = $1
         AND t.is_deleted = false
        WHERE ts.place_id = p.id
          AND ts.is_deleted = false
    )
`;

export async function listVisitedForUser(
    { userId, provinceCode, wardCode, wardName, limit, offset },
    executor = query,
) {
    const values = [userId, provinceCode, wardCode, wardName ?? null];
    const listValues = [...values, limit, offset];
    const [listResult, countResult] = await Promise.all([
        executeQuery(
            executor,
            `
                SELECT
                    p.id,
                    p.name,
                    p.slug,
                    p.address,
                    p.latitude,
                    p.longitude,
                    p.catalog_place_id,
                    p.ward_code,
                    p.ward AS ward_name,
                    pr.code AS province_code,
                    pr.name AS province_name
                FROM places p
                JOIN provinces pr ON pr.id = p.province_id
                WHERE ${locationFilter}
                ORDER BY lower(p.name), p.id
                LIMIT $5 OFFSET $6
            `,
            listValues,
        ),
        executeQuery(
            executor,
            `
                SELECT COUNT(*) AS total
                FROM places p
                JOIN provinces pr ON pr.id = p.province_id
                WHERE ${locationFilter}
            `,
            values,
        ),
    ]);

    return {
        rows: listResult.rows,
        total: Number(countResult.rows[0].total),
    };
}
