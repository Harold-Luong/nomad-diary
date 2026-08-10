import { ref } from 'vue'

import { getFieldError, validateSchema } from '@/utils/index.js'

export function useFormValidation(schema) {
    const fieldErrors = ref({})

    function validate(input) {
        const result = validateSchema(schema, input)
        fieldErrors.value = result.errors
        return result.success ? result.data : null
    }

    function errorFor(field) {
        return getFieldError(fieldErrors.value, field)
    }

    function clearFieldError(field) {
        if (!fieldErrors.value[field]) return
        const nextErrors = { ...fieldErrors.value }
        delete nextErrors[field]
        fieldErrors.value = nextErrors
    }

    function resetValidation() {
        fieldErrors.value = {}
    }

    return {
        fieldErrors,
        validate,
        errorFor,
        clearFieldError,
        resetValidation,
    }
}
