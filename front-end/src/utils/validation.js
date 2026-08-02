export function issuesToFieldErrors(issues = []) {
    return issues.reduce((errors, issue) => {
        const field = issue.path.length > 0 ? issue.path.join('.') : '_form'
        errors[field] ??= []
        errors[field].push(issue.message)
        return errors
    }, {})
}

export function validateSchema(schema, input) {
    const result = schema.safeParse(input)

    if (result.success) {
        return { success: true, data: result.data, errors: {} }
    }

    return {
        success: false,
        data: null,
        errors: issuesToFieldErrors(result.error.issues),
    }
}
