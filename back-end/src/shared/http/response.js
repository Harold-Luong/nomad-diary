const toJsonSafe = (value) => {
    if (typeof value === "bigint") {
        return value.toString();
    }

    if (value instanceof Date) {
        return value.toISOString();
    }

    if (Array.isArray(value)) {
        return value.map(toJsonSafe);
    }

    if (value && typeof value === "object") {
        return Object.fromEntries(
            Object.entries(value).map(([key, nestedValue]) => [key, toJsonSafe(nestedValue)]),
        );
    }

    return value;
};

export const sendSuccess = (res, data = null, options = {}) => {
    const { status = 200, meta } = options;
    const body = { success: true, data: toJsonSafe(data) };

    if (meta) {
        body.meta = toJsonSafe(meta);
    }

    return res.status(status).json(body);
};

export const sendNoContent = (res) => res.status(204).send();
