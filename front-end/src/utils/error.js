export function getErrorMessage(error, fallback = 'Đã xảy ra lỗi không mong muốn') {
    return error?.message || fallback
}

export function getFieldError(fieldErrors, field) {
    return fieldErrors?.[field]?.[0] ?? null
}

export function toErrorDetails(error) {
    return {
        code: error?.code || CLIENT_ERROR_CODE.UNEXPECTED,
        message: getErrorMessage(error),
        details: error?.details ?? null,
        status: error?.status ?? 500,
    }
}
import { CLIENT_ERROR_CODE } from '@/constants/app.js'
