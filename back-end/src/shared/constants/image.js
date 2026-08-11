export const IMAGE_FILE_EXTENSIONS = Object.freeze({
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/avif": "avif",
});

export const UPLOAD_PURPOSES = Object.freeze([
    "avatar",
    "trip-cover",
    "image",
]);

export const PRESIGNED_UPLOAD_EXPIRES_IN_SECONDS = 5 * 60;
export const PRESIGNED_IMAGE_EXPIRES_IN_SECONDS = PRESIGNED_UPLOAD_EXPIRES_IN_SECONDS;