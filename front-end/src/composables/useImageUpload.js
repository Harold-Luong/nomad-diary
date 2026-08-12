import { computed, ref } from 'vue'

import { uploadsApi } from '@/api/uploads.js'

export function useImageUpload() {
    const status = ref('idle')
    const progress = ref(0)
    const error = ref(null)
    const fileName = ref('')

    const isProcessing = computed(() =>
        ['preparing', 'uploading', 'saving'].includes(status.value),
    )

    function reset() {
        status.value = 'idle'
        progress.value = 0
        error.value = null
        fileName.value = ''
    }

    async function upload(file, purpose) {
        status.value = 'preparing'
        progress.value = 0
        error.value = null
        fileName.value = file.name

        try {
            const result = await uploadsApi.uploadImage(file, purpose, {
                onProgress(value) {
                    progress.value = value
                    status.value = 'uploading'
                },
            })
            status.value = 'saving'
            progress.value = 100
            return result
        } catch (uploadError) {
            status.value = 'error'
            error.value = uploadError
            throw uploadError
        }
    }

    function complete() {
        status.value = 'success'
        progress.value = 100
    }

    function fail(requestError) {
        status.value = 'error'
        error.value = requestError
    }

    return {
        status,
        progress,
        error,
        fileName,
        isProcessing,
        reset,
        upload,
        complete,
        fail,
    }
}
