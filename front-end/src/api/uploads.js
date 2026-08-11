import axios from 'axios'

import {
    CLIENT_ERROR_CODE,
    IMAGE_CONTENT_TYPES,
    IMAGE_MAX_SIZE_BYTES,
} from '@/constants/app.js'
import { ApiError, api } from '@/services/api.js'

function assertSupportedImage(file) {
    if (!file || !IMAGE_CONTENT_TYPES.includes(file.type)) {
        throw new ApiError({
            code: CLIENT_ERROR_CODE.UNSUPPORTED_IMAGE,
            message: 'Chỉ hỗ trợ ảnh JPEG, PNG, WebP hoặc AVIF',
            status: 422,
        })
    }

    if (!Number.isFinite(file.size) || file.size <= 0) {
        throw new ApiError({
            code: CLIENT_ERROR_CODE.EMPTY_IMAGE,
            message: 'Tệp ảnh đang trống hoặc không thể đọc',
            status: 422,
        })
    }

    if (file.size > IMAGE_MAX_SIZE_BYTES) {
        throw new ApiError({
            code: CLIENT_ERROR_CODE.IMAGE_TOO_LARGE,
            message: 'Ảnh không được vượt quá 10 MB',
            status: 422,
        })
    }
}

function uploadPercent(progressEvent, fileSize) {
    const total = progressEvent.total || fileSize
    if (!total) return 0

    return Math.min(100, Math.max(0, Math.round((progressEvent.loaded * 100) / total)))
}

async function putFile(presignedUpload, file, { onProgress, signal } = {}) {
    try {
        await axios.request({
            url: presignedUpload.uploadUrl,
            method: presignedUpload.method || 'PUT',
            headers: presignedUpload.headers,
            data: file,
            signal,
            onUploadProgress: (event) => onProgress?.(uploadPercent(event, file.size)),
        })
    } catch (error) {
        if (axios.isCancel(error)) throw error

        throw new ApiError({
            code: error.response
                ? CLIENT_ERROR_CODE.IMAGE_UPLOAD_FAILED
                : CLIENT_ERROR_CODE.NETWORK,
            message: error.response
                ? 'Không thể tải ảnh lên nơi lưu trữ'
                : 'Không thể kết nối đến nơi lưu trữ ảnh',
            status: error.response?.status || 0,
            cause: error,
        })
    }
}

function createPresignedUpload(file, purpose) {
    assertSupportedImage(file)
    return api.post('/uploads/presigned-url', {
        fileName: file.name,
        contentType: file.type,
        fileSize: file.size,
        purpose,
    })
}

async function uploadImage(file, purpose, options = {}) {
    options.onProgress?.(0)
    const uploadResponse = await createPresignedUpload(file, purpose)
    await putFile(uploadResponse.data, file, options)
    options.onProgress?.(100)

    return { objectKey: uploadResponse.data.objectKey }
}

export const uploadsApi = {
    createPresignedUpload,
    uploadImage,
}
