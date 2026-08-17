const UNIQUE_VIOLATION_CODE = "23505";

export function isUniqueViolation(error, constraint) {
    return error?.code === UNIQUE_VIOLATION_CODE &&
        (!constraint || error?.constraint === constraint);
}
