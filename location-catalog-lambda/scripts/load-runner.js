import { performance } from "node:perf_hooks";

const LIMITS = Object.freeze({
    requests: 200,
    concurrency: 10,
    rps: 20,
    timeoutMs: 10_000,
});

const DEFAULTS = Object.freeze({
    url: "https://locations-api.nomad-diary.site/v1/provinces",
    requests: 50,
    concurrency: 5,
    rps: 10,
    timeoutMs: 5_000,
});

const ALLOWED_PUBLIC_HOSTS = new Set(["locations-api.nomad-diary.site"]);
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

function printHelp() {
    console.log(`Usage:
  npm run test:load -- [options]

Options:
  --url <url>              Target URL (default: ${DEFAULTS.url})
  --requests <number>      Total requests, max ${LIMITS.requests} (default: ${DEFAULTS.requests})
  --concurrency <number>   Concurrent workers, max ${LIMITS.concurrency} (default: ${DEFAULTS.concurrency})
  --rps <number>           Aggregate requests/second, max ${LIMITS.rps} (default: ${DEFAULTS.rps})
  --timeout-ms <number>    Timeout per request, max ${LIMITS.timeoutMs} (default: ${DEFAULTS.timeoutMs})
  --help                   Show this help

Only GET requests to locations-api.nomad-diary.site or loopback hosts are allowed.`);
}

function parsePositiveInteger(value, name, maximum) {
    const parsed = Number(value);

    if (!Number.isInteger(parsed) || parsed < 1 || parsed > maximum) {
        throw new Error(`${name} must be an integer between 1 and ${maximum}`);
    }

    return parsed;
}

function parseArguments(argv) {
    const options = { ...DEFAULTS };

    for (let index = 0; index < argv.length; index += 1) {
        const argument = argv[index];

        if (argument === "--help") {
            return { help: true };
        }

        const value = argv[index + 1];
        if (!value || value.startsWith("--")) {
            throw new Error(`Missing value for ${argument}`);
        }

        switch (argument) {
            case "--url":
                options.url = value;
                break;
            case "--requests":
                options.requests = parsePositiveInteger(value, "requests", LIMITS.requests);
                break;
            case "--concurrency":
                options.concurrency = parsePositiveInteger(value, "concurrency", LIMITS.concurrency);
                break;
            case "--rps":
                options.rps = parsePositiveInteger(value, "rps", LIMITS.rps);
                break;
            case "--timeout-ms":
                options.timeoutMs = parsePositiveInteger(value, "timeout-ms", LIMITS.timeoutMs);
                break;
            default:
                throw new Error(`Unknown option: ${argument}`);
        }

        index += 1;
    }

    return options;
}

function validateTarget(value) {
    const url = new URL(value);
    const isLoopback = LOOPBACK_HOSTS.has(url.hostname);
    const isAllowedPublicHost = ALLOWED_PUBLIC_HOSTS.has(url.hostname);

    if (!isLoopback && !isAllowedPublicHost) {
        throw new Error(`Target host is not allowed: ${url.hostname}`);
    }

    if (isAllowedPublicHost && url.protocol !== "https:") {
        throw new Error("The public API must be tested over HTTPS");
    }

    if (isAllowedPublicHost && !/^\/v1\/(health|provinces(?:\/\d{2}\/wards)?)\/?$/.test(url.pathname)) {
        throw new Error(`Target path is not an allowed read-only route: ${url.pathname}`);
    }

    if (!isLoopback && url.username) {
        throw new Error("Credentials are not allowed in the target URL");
    }

    return url;
}

function percentile(sortedValues, percentage) {
    if (sortedValues.length === 0) return 0;
    const index = Math.min(sortedValues.length - 1, Math.ceil(sortedValues.length * percentage) - 1);
    return sortedValues[index];
}

function wait(milliseconds) {
    if (milliseconds <= 0) return Promise.resolve();
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function run(options) {
    const url = validateTarget(options.url);
    const durations = [];
    const statusCounts = new Map();
    const errors = new Map();
    const startedAt = performance.now();
    let nextRequestIndex = 0;

    console.log("Bounded API load check");
    console.log(`Target:      ${url}`);
    console.log(`Requests:    ${options.requests}`);
    console.log(`Concurrency: ${options.concurrency}`);
    console.log(`Rate:        ${options.rps} requests/second`);

    async function worker() {
        while (true) {
            const requestIndex = nextRequestIndex;
            nextRequestIndex += 1;

            if (requestIndex >= options.requests) return;

            const scheduledAt = startedAt + (requestIndex * 1_000) / options.rps;
            await wait(scheduledAt - performance.now());

            const requestStartedAt = performance.now();

            try {
                const response = await fetch(url, {
                    method: "GET",
                    headers: { accept: "application/json" },
                    redirect: "error",
                    signal: AbortSignal.timeout(options.timeoutMs),
                });

                durations.push(performance.now() - requestStartedAt);
                statusCounts.set(response.status, (statusCounts.get(response.status) || 0) + 1);
                await response.body?.cancel();
            } catch (error) {
                durations.push(performance.now() - requestStartedAt);
                const name = error?.name || "RequestError";
                errors.set(name, (errors.get(name) || 0) + 1);
            }
        }
    }

    const workerCount = Math.min(options.concurrency, options.requests);
    await Promise.all(Array.from({ length: workerCount }, () => worker()));

    const elapsedMs = performance.now() - startedAt;
    const sortedDurations = durations.toSorted((left, right) => left - right);
    const responseCount = [...statusCounts.values()].reduce((sum, count) => sum + count, 0);
    const errorCount = [...errors.values()].reduce((sum, count) => sum + count, 0);

    console.log("\nResults");
    console.log(`Elapsed:     ${(elapsedMs / 1_000).toFixed(2)}s`);
    console.log(`Throughput:  ${(options.requests / (elapsedMs / 1_000)).toFixed(2)} requests/second`);
    console.log(`Responses:   ${responseCount}`);
    console.log(`Errors:      ${errorCount}`);
    console.log(`Latency p50: ${percentile(sortedDurations, 0.5).toFixed(0)}ms`);
    console.log(`Latency p95: ${percentile(sortedDurations, 0.95).toFixed(0)}ms`);
    console.log(`Latency p99: ${percentile(sortedDurations, 0.99).toFixed(0)}ms`);

    for (const [status, count] of [...statusCounts.entries()].sort(([left], [right]) => left - right)) {
        console.log(`HTTP ${status}:    ${count}`);
    }

    for (const [name, count] of errors) {
        console.log(`${name}: ${count}`);
    }

    if (errorCount > 0 || [...statusCounts.keys()].some((status) => status >= 500)) {
        process.exitCode = 1;
    }
}

try {
    const options = parseArguments(process.argv.slice(2));

    if (options.help) {
        printHelp();
    } else {
        await run(options);
    }
} catch (error) {
    console.error(`Load test configuration error: ${error.message}`);
    process.exitCode = 1;
}
