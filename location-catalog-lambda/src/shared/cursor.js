const MAX_CURSOR_LENGTH = 2_048;

export function encodeCursor(value) {
    if (!value) return null;
    return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

export function decodeCursor(value) {
    if (typeof value !== "string" || value.length === 0 || value.length > MAX_CURSOR_LENGTH) {
        throw new Error("Invalid cursor");
    }

    if (!/^[A-Za-z0-9_-]+$/.test(value)) {
        throw new Error("Invalid cursor");
    }

    try {
        const decoded = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));

        if (!decoded || typeof decoded !== "object" || Array.isArray(decoded)) {
            throw new Error("Invalid cursor");
        }

        return decoded;
    } catch {
        throw new Error("Invalid cursor");
    }
}
