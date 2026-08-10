import { S3Client } from "@aws-sdk/client-s3";

import { env } from "./env.js";

let s3Client;

export function getS3Client() {
    if (!s3Client) {
        s3Client = new S3Client({ region: env.s3.region });
    }

    return s3Client;
}
