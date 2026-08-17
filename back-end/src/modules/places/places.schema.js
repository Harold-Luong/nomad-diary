import { z } from "zod";

import { PAGINATION } from "../../shared/pagination/pagination.js";

export const listPlacesQuerySchema = z.object({
    provinceCode: z.string().trim().min(1).max(50),
    wardCode: z.string().trim().min(1).max(50),
    wardName: z.string().trim().min(1).max(255).optional(),
    page: z.coerce.number().int().min(1).optional(),
    pageSize: z.coerce.number().int().min(1).max(PAGINATION.MAX_PAGE_SIZE).optional(),
});
