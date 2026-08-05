import { executeQuery, query } from "../../database/pool.js";

const reviewColumns = `
    pr.id,
    pr.trip_stop_id,
    pr.rating,
    pr.revisit_status,
    pr.is_favorite,
    pr.note,
    pr.warning_note,
    pr.created_at,
    pr.updated_at
`;

export async function findOwnedActiveStop(tripStopId, userId, executor = query) {
    const result = await executeQuery(
        executor,
        `
            SELECT ts.id
            FROM trip_stops ts
            JOIN trips t
              ON t.id = ts.trip_id
             AND t.is_deleted = false
            WHERE ts.id = $1
              AND t.user_id = $2
              AND ts.is_deleted = false
        `,
        [tripStopId, userId],
    );

    return result.rows[0] ?? null;
}

export async function findActiveForOwnedStop(
    tripStopId,
    userId,
    executor = query,
) {
    const result = await executeQuery(
        executor,
        `
            SELECT ${reviewColumns}
            FROM place_reviews pr
            JOIN trip_stops ts
              ON ts.id = pr.trip_stop_id
             AND ts.is_deleted = false
            JOIN trips t
              ON t.id = ts.trip_id
             AND t.is_deleted = false
            WHERE pr.trip_stop_id = $1
              AND t.user_id = $2
              AND pr.is_deleted = false
        `,
        [tripStopId, userId],
    );

    return result.rows[0] ?? null;
}

export async function upsertForOwnedStop(
    tripStopId,
    userId,
    data,
    executor = query,
) {
    const result = await executeQuery(
        executor,
        `
            INSERT INTO place_reviews (
                trip_stop_id,
                rating,
                revisit_status,
                is_favorite,
                note,
                warning_note
            )
            SELECT
                ts.id,
                $3,
                $4,
                $5,
                $6,
                $7
            FROM trip_stops ts
            JOIN trips t
              ON t.id = ts.trip_id
             AND t.is_deleted = false
            WHERE ts.id = $1
              AND t.user_id = $2
              AND ts.is_deleted = false
            ON CONFLICT (trip_stop_id) WHERE is_deleted = false
            DO UPDATE
            SET rating = EXCLUDED.rating,
                revisit_status = EXCLUDED.revisit_status,
                is_favorite = EXCLUDED.is_favorite,
                note = EXCLUDED.note,
                warning_note = EXCLUDED.warning_note,
                updated_at = now()
            RETURNING ${reviewColumns.replaceAll("pr.", "")}
        `,
        [
            tripStopId,
            userId,
            data.rating,
            data.revisitStatus,
            data.isFavorite,
            data.note,
            data.warningNote,
        ],
    );

    return result.rows[0] ?? null;
}

export async function softDeleteForOwnedStop(
    tripStopId,
    userId,
    executor = query,
) {
    const result = await executeQuery(
        executor,
        `
            UPDATE place_reviews pr
            SET is_deleted = true,
                updated_at = now()
            FROM trip_stops ts
            JOIN trips t
              ON t.id = ts.trip_id
             AND t.is_deleted = false
            WHERE pr.trip_stop_id = $1
              AND pr.trip_stop_id = ts.id
              AND t.user_id = $2
              AND ts.is_deleted = false
              AND pr.is_deleted = false
            RETURNING pr.id
        `,
        [tripStopId, userId],
    );

    return result.rows[0] ?? null;
}
