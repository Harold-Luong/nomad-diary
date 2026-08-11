import exifr from 'exifr'

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

self.onmessage = async ({ data }) => {
    try {
        const metadata = await exifr.parse(data.file, PARSE_OPTIONS)
        self.postMessage({
            metadata: metadata
                ? {
                    DateTimeOriginal: metadata.DateTimeOriginal || null,
                    DateTimeDigitized: metadata.DateTimeDigitized || null,
                    CreateDate: metadata.CreateDate || null,
                    latitude: metadata.latitude ?? null,
                    longitude: metadata.longitude ?? null,
                    ExifImageWidth: metadata.ExifImageWidth ?? null,
                    ExifImageHeight: metadata.ExifImageHeight ?? null,
                    PixelXDimension: metadata.PixelXDimension ?? null,
                    PixelYDimension: metadata.PixelYDimension ?? null,
                    ImageWidth: metadata.ImageWidth ?? null,
                    ImageHeight: metadata.ImageHeight ?? null,
                }
                : null,
        })
    } catch {
        self.postMessage({ metadata: null })
    }
}
