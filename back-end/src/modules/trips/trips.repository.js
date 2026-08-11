import { executeQuery, query } from "../../database/pool.js";
import { TRIP_SORT } from "../../shared/constants/domain.js";

const tripSelectColumns = `
    t.id,
    t.user_id,
    t.title,
    t.slug,
    t.description,
    t.thumbnail_key,
    t.status,
    t.start_date,
    t.end_date,
    t.is_public,
    t.created_at,
    t.updated_at,
    COALESCE(stop_counts.stop_count, 0)::integer AS stop_count
`;

const SORT_SQL = {
    [TRIP_SORT.CREATED_AT_DESC]: "t.created_at DESC, t.id DESC",
    [TRIP_SORT.CREATED_AT_ASC]: "t.created_at ASC, t.id ASC",
    [TRIP_SORT.START_DATE_DESC]: "t.start_date DESC NULLS LAST, t.id DESC",
    [TRIP_SORT.START_DATE_ASC]: "t.start_date ASC NULLS LAST, t.id ASC",
    [TRIP_SORT.TITLE_ASC]: "lower(t.title) ASC, t.id ASC",
    [TRIP_SORT.TITLE_DESC]: "lower(t.title) DESC, t.id DESC",
};

function buildFilters({ userId, status, year, search }) {
    const values = [userId];
    const clauses = ["t.user_id = $1", "t.is_deleted = false"];

    if (status !== undefined) {
        values.push(status);
        clauses.push(`t.status = $${values.length}`);
    }

    if (year !== undefined) {
        values.push(year);
        clauses.push(`EXTRACT(YEAR FROM t.start_date) = $${values.length}`);
    }

    if (search !== undefined) {
        values.push(`%${search}%`);
        clauses.push(
            `(t.title ILIKE $${values.length} OR COALESCE(t.description, '') ILIKE $${values.length})`,
        );
    }

    return { clauses, values };
}

export async function listForUser(
    { userId, status, year, search, sort, limit, offset },
    executor = query,
) {
    const { clauses, values } = buildFilters({ userId, status, year, search });
    const listValues = [...values, limit, offset];
    const orderBy = SORT_SQL[sort] ?? SORT_SQL[TRIP_SORT.CREATED_AT_DESC];
    const where = clauses.join(" AND ");

    const [listResult, countResult] = await Promise.all([
        executeQuery(
            executor,
            `
                SELECT ${tripSelectColumns}
                FROM trips t
                LEFT JOIN LATERAL (
                    SELECT COUNT(*) AS stop_count
                    FROM trip_stops ts
                    WHERE ts.trip_id = t.id
                      AND ts.is_deleted = false
                ) stop_counts ON true
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
                FROM trips t
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
            SELECT ${tripSelectColumns}
            FROM trips t
            LEFT JOIN LATERAL (
                SELECT COUNT(*) AS stop_count
                FROM trip_stops ts
                WHERE ts.trip_id = t.id
                  AND ts.is_deleted = false
            ) stop_counts ON true
            WHERE t.id = $1
              AND t.user_id = $2
              AND t.is_deleted = false
        `,
        [id, userId],
    );

    return result.rows[0] ?? null;
}

export async function slugExistsForUser(
    userId,
    slug,
    excludeTripId,
    executor = query,
) {
    const values = [userId, slug];
    let excludeClause = "";

    if (excludeTripId !== undefined && excludeTripId !== null) {
        values.push(excludeTripId);
        excludeClause = ` AND t.id <> $${values.length}`;
    }

    const result = await executeQuery(
        executor,
        `
            SELECT 1
            FROM trips t
            WHERE t.user_id = $1
              AND t.slug = $2
              AND t.is_deleted = false
              ${excludeClause}
            LIMIT 1
        `,
        values,
    );

    return result.rowCount > 0;
}

export async function create(userId, data, executor = query) {
    const result = await executeQuery(
        executor,
        `
            INSERT INTO trips (
                user_id,
                title,
                slug,
                description,
                thumbnail_key,
                status,
                start_date,
                end_date,
                is_public
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING
                id,
                user_id,
                title,
                slug,
                description,
                thumbnail_key,
                status,
                start_date,
                end_date,
                is_public,
                created_at,
                updated_at,
                0::integer AS stop_count
        `,
        [
            userId,
            data.title,
            data.slug,
            data.description,
            data.thumbnailObjectKey,
            data.status,
            data.startDate,
            data.endDate,
            data.isPublic,
        ],
    );

    return result.rows[0];
}

export async function update(id, userId, data, executor = query) {
    const columns = {
        title: "title",
        slug: "slug",
        description: "description",
        thumbnailObjectKey: "thumbnail_key",
        status: "status",
        startDate: "start_date",
        endDate: "end_date",
        isPublic: "is_public",
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
            UPDATE trips
            SET ${setClauses.join(", ")}, updated_at = now()
            WHERE id = $1
              AND user_id = $2
              AND is_deleted = false
            RETURNING
                id,
                user_id,
                title,
                slug,
                description,
                thumbnail_key,
                status,
                start_date,
                end_date,
                is_public,
                created_at,
                updated_at
        `,
        values,
    );

    return result.rows[0] ?? null;
}

export async function softDelete(id, userId, executor = query) {
    const result = await executeQuery(
        executor,
        `
            UPDATE trips
            SET is_deleted = true,
                updated_at = now()
            WHERE id = $1
              AND user_id = $2
              AND is_deleted = false
            RETURNING id
        `,
        [id, userId],
    );

    return result.rows[0] ?? null;
}
