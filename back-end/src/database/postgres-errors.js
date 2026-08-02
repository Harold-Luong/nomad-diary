const UNIQUE_VIOLATION_CODE = "23505";

export function isUniqueViolation(error) {
    return error?.code === UNIQUE_VIOLATION_CODE;
}
