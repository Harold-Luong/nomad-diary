import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";

import { env } from "./config/env.js";
import { openApiSpec } from "./docs/openapi.js";
import { errorHandler } from "./middleware/error-handler.js";
import { notFound } from "./middleware/not-found.js";
import { apiRateLimiter } from "./middleware/rate-limit.js";
import { requestId } from "./middleware/request-id.js";
import router from "./routes/index.js";
import { ERRORS, errorArgs } from "./shared/constants/errors.js";
import { AuthorizationError } from "./shared/errors/app-error.js";
import { sendSuccess } from "./shared/http/response.js";

const app = express();

app.disable("x-powered-by");
app.use(requestId);
app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                scriptSrc: ["'self'", "'unsafe-inline'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", "data:"],
            },
        },
    }),
);
app.use(
    cors((req, callback) => {
        const origin = req.get("Origin");
        let isSameHost = false;

        if (origin) {
            try {
                isSameHost = new URL(origin).host === req.get("host");
            } catch {
                isSameHost = false;
            }
        }

        if (!origin || isSameHost || env.corsOrigins.includes(origin)) {
            return callback(null, { origin: true, credentials: true });
        }

        return callback(
            new AuthorizationError(
                ...errorArgs(ERRORS.CORS_ORIGIN_NOT_ALLOWED),
            ),
        );
    }),
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(cookieParser());

app.get("/", (_req, res) => sendSuccess(res, { name: "Nomad Diary API" }));
app.get("/api-docs.json", (_req, res) => res.json(openApiSpec));
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openApiSpec, { explorer: true }));
app.use("/api", apiRateLimiter, router);

app.use(notFound);
app.use(errorHandler);

export default app;
