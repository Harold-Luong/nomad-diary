import { ValidationError } from "../shared/errors/app-error.js";
import { ERRORS, errorArgs } from "../shared/constants/errors.js";

const validate = (schema, target = "body") => (req, _res, next) => {
    const parsed = schema.safeParse(req[target]);

    if (!parsed.success) {
        return next(
            new ValidationError(
                ...errorArgs(ERRORS.VALIDATION_ERROR),
                parsed.error.issues.map((issue) => ({
                    path: issue.path.join("."),
                    message: issue.message,
                })),
            ),
        );
    }

    req.validated = {
        ...(req.validated ?? {}),
        [target]: parsed.data,
    };

    // Express 5 exposes req.query as a getter, so assigning a parsed object to
    // it throws. Body and params remain writable and may contain Zod defaults or
    // transforms that downstream handlers need.
    if (target !== "query") {
        req[target] = parsed.data;
    }

    return next();
};

export default validate;
