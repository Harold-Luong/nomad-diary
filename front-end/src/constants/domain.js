export const TRIP_STATUS = Object.freeze({
    DRAFT: 0,
    PLANNED: 1,
    ONGOING: 2,
    COMPLETED: 3,
    CANCELLED: 4,
})

export const TRIP_STATUS_VALUES = Object.freeze(Object.values(TRIP_STATUS))

export const TRIP_STATUS_OPTIONS = Object.freeze([
    Object.freeze({ value: TRIP_STATUS.DRAFT, label: 'Bản nháp' }),
    Object.freeze({ value: TRIP_STATUS.PLANNED, label: 'Dự kiến' }),
    Object.freeze({ value: TRIP_STATUS.ONGOING, label: 'Đang đi' }),
    Object.freeze({ value: TRIP_STATUS.COMPLETED, label: 'Hoàn thành' }),
    Object.freeze({ value: TRIP_STATUS.CANCELLED, label: 'Đã hủy' }),
])

export const TRIP_STATUS_LABEL = Object.freeze(
    Object.fromEntries(TRIP_STATUS_OPTIONS.map(({ value, label }) => [value, label])),
)

export const REVISIT_STATUS = Object.freeze({
    NOT_REVIEWED: 0,
    RECOMMENDED: 1,
    CONSIDER: 2,
    NOT_RECOMMENDED: 3,
})

export const REVISIT_STATUS_VALUES = Object.freeze(Object.values(REVISIT_STATUS))

export const VISIT_ORDER = Object.freeze({
    MIN: 1,
    MAX: 2_147_483_647,
})

export const REVISIT_STATUS_OPTIONS = Object.freeze([
    Object.freeze({ value: REVISIT_STATUS.NOT_REVIEWED, label: 'Chưa đánh giá' }),
    Object.freeze({ value: REVISIT_STATUS.RECOMMENDED, label: 'Nên quay lại' }),
    Object.freeze({ value: REVISIT_STATUS.CONSIDER, label: 'Cân nhắc' }),
    Object.freeze({ value: REVISIT_STATUS.NOT_RECOMMENDED, label: 'Không nên quay lại' }),
])
