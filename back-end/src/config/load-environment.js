import dotenv from "dotenv";
import { fileURLToPath } from "node:url";

const ENVIRONMENT_FILES = Object.freeze({
    development: ".env.example",
    production: ".env",
});

export const getNodeEnvironment = (nodeEnv = process.env.NODE_ENV) => {
    const environment = nodeEnv || "development";

    if (!Object.hasOwn(ENVIRONMENT_FILES, environment)) {
        throw new Error(
            `Unsupported NODE_ENV "${environment}". Use "development" or "production".`,
        );
    }

    return environment;
};

export const getEnvironmentFile = (nodeEnv = process.env.NODE_ENV) =>
    ENVIRONMENT_FILES[getNodeEnvironment(nodeEnv)];

export const getEnvironmentPath = (nodeEnv = process.env.NODE_ENV) =>
    fileURLToPath(new URL(`../../${getEnvironmentFile(nodeEnv)}`, import.meta.url));

export const loadEnvironment = (nodeEnv = process.env.NODE_ENV) => {
    const environment = getNodeEnvironment(nodeEnv);
    const environmentFile = getEnvironmentFile(environment);
    const environmentPath = getEnvironmentPath(environment);

    // NODE_ENV from the process selects the file. Values already supplied by
    // the OS, container, or PM2 take precedence over values in that file.
    process.env.NODE_ENV = environment;
    const result = dotenv.config({
        path: environmentPath,
        override: false,
        quiet: true,
    });

    if (result.error) {
        const error = new Error(
            `Unable to load ${environment} environment from ${environmentFile}.`,
            { cause: result.error },
        );
        error.code = "ENVIRONMENT_FILE_LOAD_FAILED";
        throw error;
    }

    return {
        environment,
        environmentFile,
        environmentPath,
    };
};
