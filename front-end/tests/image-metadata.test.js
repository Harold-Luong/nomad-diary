import { describe, expect, test, vi } from 'vitest'

import {
    IMAGE_METADATA_TIMEOUT_MS,
    normalizeImageMetadata,
    readImageMetadata,
} from '@/utils/image-metadata.js'

describe('image metadata normalization', () => {
    test('uses a five-second EXIF timeout', () => {
        expect(IMAGE_METADATA_TIMEOUT_MS).toBe(5_000)
    })

    test('falls back to nullable metadata when parsing exceeds the timeout', async () => {
        const metadata = await readImageMetadata({}, {
            timeoutMs: 1,
            parser: () => new Promise(() => {}),
        })

        expect(metadata).toEqual({
            capturedAt: null,
            latitude: null,
            longitude: null,
            width: null,
            height: null,
        })
    })

    test('terminates a metadata worker when it exceeds the timeout', async () => {
        const worker = {
            onmessage: null,
            onerror: null,
            postMessage: vi.fn(),
            terminate: vi.fn(),
        }

        const metadata = await readImageMetadata({}, {
            timeoutMs: 1,
            workerFactory: () => worker,
        })

        expect(worker.postMessage).toHaveBeenCalledWith({ file: {} })
        expect(worker.terminate).toHaveBeenCalledTimes(1)
        expect(metadata.capturedAt).toBe(null)
    })

    test('maps EXIF capture time, GPS and dimensions to backend fields', () => {
        expect(normalizeImageMetadata({
            DateTimeOriginal: new Date('2026-08-12T01:30:00.000Z'),
            latitude: 11.9404,
            longitude: 108.4583,
            ExifImageWidth: 4032,
            ExifImageHeight: 3024,
        })).toEqual({
            capturedAt: '2026-08-12T01:30:00.000Z',
            latitude: 11.9404,
            longitude: 108.4583,
            width: 4032,
            height: 3024,
        })
    })

    test('returns nullable fields when an image has no usable metadata', () => {
        expect(normalizeImageMetadata({
            DateTimeOriginal: 'invalid-date',
            latitude: 120,
            longitude: 220,
            ImageWidth: 0,
            ImageHeight: -1,
        })).toEqual({
            capturedAt: null,
            latitude: null,
            longitude: null,
            width: null,
            height: null,
        })
    })
})
