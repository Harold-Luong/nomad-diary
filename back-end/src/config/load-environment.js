import dotenv from "dotenv";
import { fileURLToPath } from "node:url";

import { getSecrets } from "./load-secrets.js";

export function getEnvironment(nodeEnv = process.env.NODE_ENV) {
    return nodeEnv === "production" ? "production" : "development";
}

export function getEnvironmentFile(nodeEnv = process.env.NODE_ENV) {
    return getEnvironment(nodeEnv) === "production" ? ".env" : ".env.development";
}

export function getEnvironmentPath(nodeEnv = process.env.NODE_ENV) {
    return fileURLToPath(new URL(`../../${getEnvironmentFile(nodeEnv)}`, import.meta.url));
}

export async function loadEnvironment(
    nodeEnv = process.env.NODE_ENV,
    { secretLoader = getSecrets } = {},
) {
    const environment = getEnvironment(nodeEnv);
    const environmentFile = getEnvironmentFile(environment);
    const environmentPath = getEnvironmentPath(environment);

    process.env.NODE_ENV = environment;
    const { error: cause } = dotenv.config({
        path: environmentPath,
        override: false,
        quiet: true,
    });

    if (cause) {
        throw new Error(`Unable to load environment file ${environmentFile}.`, { cause });
    }

    if (environment === "production") {
        Object.assign(process.env, await secretLoader());
    }

    return { environment, environmentFile, environmentPath };
}
