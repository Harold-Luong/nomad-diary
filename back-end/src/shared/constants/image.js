export const IMAGE_FILE_EXTENSIONS = Object.freeze({
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/avif": "avif",
});

export const UPLOAD_PURPOSES = Object.freeze([
    "avatar",
    "trip-cover",
    "images",
]);

export const PRESIGNED_UPLOAD_EXPIRES_IN_SECONDS = 5 * 60;
