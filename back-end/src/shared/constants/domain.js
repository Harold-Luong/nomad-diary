export const TRIP_STATUS = Object.freeze({
    DRAFT: 0,
    PLANNED: 1,
    ONGOING: 2,
    COMPLETED: 3,
    CANCELLED: 4,
});

export const TRIP_STATUS_VALUES = Object.freeze(Object.values(TRIP_STATUS));

export const REVISIT_STATUS = Object.freeze({
    NOT_REVIEWED: 0,
    RECOMMENDED: 1,
    CONSIDER: 2,
    NOT_RECOMMENDED: 3,
});

export const REVISIT_STATUS_VALUES = Object.freeze(
    Object.values(REVISIT_STATUS),
);

export const VISIT_ORDER = Object.freeze({
    MIN: 1,
    MAX: 2_147_483_647,
});

export const TRIP_SORT = Object.freeze({
    CREATED_AT_DESC: "createdAtDesc",
    CREATED_AT_ASC: "createdAtAsc",
    START_DATE_DESC: "startDateDesc",
    START_DATE_ASC: "startDateAsc",
    TITLE_ASC: "titleAsc",
    TITLE_DESC: "titleDesc",
});

export const TRIP_SORT_VALUES = Object.freeze(Object.values(TRIP_SORT));

export const JWT_TOKEN_TYPE = Object.freeze({
    ACCESS: "access",
    REFRESH: "refresh",
});

export const JWT_ALGORITHM = "HS256";

export const AUTH_SCHEME = Object.freeze({
    BEARER: "Bearer",
});
