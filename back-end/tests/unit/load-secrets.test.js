import assert from "node:assert/strict";
import test from "node:test";

import {
    getSecrets,
    SECRET_ENVIRONMENT_VARIABLES,
} from "../../src/config/load-secrets.js";

const createSecretValue = () => Object.fromEntries(
    SECRET_ENVIRONMENT_VARIABLES.map((name) => [name, `${name}-value`]),
);

test("Secrets Manager is queried for the current version", async () => {
    const calls = [];
    const variables = await getSecrets({
        secretId: "test-secret",
        client: {
            send: async (command) => {
                calls.push(command.input);
                return { SecretString: JSON.stringify(createSecretValue()) };
            },
        },
    });

    assert.deepEqual(calls, [{
        SecretId: "test-secret",
        VersionStage: "AWSCURRENT",
    }]);
    assert.equal(variables.DATABASE_NAME, "DATABASE_NAME-value");
});

test("secret JSON is validated and limited to supported variables", async () => {
    const client = (value) => ({
        send: async () => ({ SecretString: JSON.stringify(value) }),
    });
    const variables = await getSecrets({ client: client({
        ...createSecretValue(),
        UNEXPECTED_VARIABLE: "must-not-be-applied",
    }) });

    assert.deepEqual(Object.keys(variables), [...SECRET_ENVIRONMENT_VARIABLES]);

    const missingSecret = createSecretValue();
    delete missingSecret.JWT_ACCESS_SECRET;
    await assert.rejects(
        getSecrets({ client: client(missingSecret) }),
        (error) => error.code === "SECRET_VALUE_INVALID"
            && error.message.includes("JWT_ACCESS_SECRET"),
    );
    await assert.rejects(
        getSecrets({ client: { send: async () => ({ SecretString: "not-json" }) } }),
        (error) => error.code === "SECRET_VALUE_INVALID",
    );
});
