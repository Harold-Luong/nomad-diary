import exifr from 'exifr'

export const IMAGE_METADATA_TIMEOUT_MS = 5_000

const PARSE_OPTIONS = {
    tiff: true,
    exif: true,
    gps: true,
    ifd1: false,
    xmp: false,
    icc: false,
    iptc: false,
    jfif: false,
}

function firstPositiveNumber(...values) {
    const value = values.map(Number).find((item) => Number.isFinite(item) && item > 0)
    return value ? Math.round(value) : null
}

function coordinate(value, minimum, maximum) {
    const numericValue = Number(value)
    return Number.isFinite(numericValue) && numericValue >= minimum && numericValue <= maximum
        ? numericValue
        : null
}

function isoTimestamp(value) {
    if (!value) return null
    const date = value instanceof Date ? value : new Date(value)
    return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

export function normalizeImageMetadata(metadata = {}) {
    return {
        capturedAt: isoTimestamp(
            metadata.DateTimeOriginal ||
            metadata.DateTimeDigitized ||
            metadata.CreateDate,
        ),
        latitude: coordinate(metadata.latitude, -90, 90),
        longitude: coordinate(metadata.longitude, -180, 180),
        width: firstPositiveNumber(
            metadata.ExifImageWidth,
            metadata.PixelXDimension,
            metadata.ImageWidth,
        ),
        height: firstPositiveNumber(
            metadata.ExifImageHeight,
            metadata.PixelYDimension,
            metadata.ImageHeight,
        ),
    }
}

async function settleWithin(promise, timeoutMs) {
    let timeoutId
    const timeout = new Promise((resolve) => {
        timeoutId = setTimeout(() => resolve(null), timeoutMs)
    })

    try {
        return await Promise.race([promise, timeout])
    } finally {
        clearTimeout(timeoutId)
    }
}

function createMetadataWorker() {
    if (typeof Worker === 'undefined') return null
    return new Worker(
        new URL('../workers/image-metadata.worker.js', import.meta.url),
        { type: 'module' },
    )
}

function parseInWorker(file, timeoutMs, workerFactory) {
    return new Promise((resolve) => {
        const worker = workerFactory()
        if (!worker) {
            resolve(undefined)
            return
        }

        let settled = false
        const finish = (metadata) => {
            if (settled) return
            settled = true
            clearTimeout(timeoutId)
            worker.terminate()
            resolve(metadata || null)
        }
        const timeoutId = setTimeout(() => finish(null), timeoutMs)

        worker.onmessage = ({ data }) => finish(data?.metadata)
        worker.onerror = () => finish(null)
        worker.postMessage({ file })
    })
}

export async function readImageMetadata(
    file,
    {
        timeoutMs = IMAGE_METADATA_TIMEOUT_MS,
        parser = exifr.parse,
        workerFactory = createMetadataWorker,
    } = {},
) {
    try {
        const workerMetadata = await parseInWorker(file, timeoutMs, workerFactory)
        const metadata = workerMetadata === undefined
            ? await settleWithin(parser(file, PARSE_OPTIONS), timeoutMs)
            : workerMetadata
        return normalizeImageMetadata(metadata || {})
    } catch {
        return normalizeImageMetadata()
    }
}
