import { ValidationError } from "../errors/app-error.js";
import { ERRORS, errorArgs } from "../constants/errors.js";

const MAX_PAGE_SIZE = 100;

const asPositiveInteger = (value, fallback) => {
    if (value === undefined) {
        return fallback;
    }

    const parsed = Number.parseInt(value, 10);
    if (!Number.isInteger(parsed) || parsed < 1) {
        throw new ValidationError(...errorArgs(ERRORS.INVALID_PAGINATION));
    }

    return parsed;
};

export const parsePagination = (query) => {
    const page = asPositiveInteger(query.page, 1);
    const pageSize = Math.min(asPositiveInteger(query.pageSize, 20), MAX_PAGE_SIZE);

    return {
        page,
        pageSize,
        limit: pageSize,
        offset: (page - 1) * pageSize,
    };
};

export const paginationMeta = ({ page, pageSize, total }) => ({
    page,
    pageSize,
    total: Number(total),
    totalPages: Math.ceil(Number(total) / pageSize),
});
