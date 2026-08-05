import dotenv from "dotenv";

export const getEnvironmentFile = (nodeEnv = process.env.NODE_ENV) =>
    nodeEnv === "production" ? ".env" : ".env.example";

export const loadEnvironment = () =>
    dotenv.config({ path: getEnvironmentFile() });
