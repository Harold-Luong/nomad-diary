import { ROUTE_NAME, ROUTE_PATH } from '@/constants/routes.js'
import { EDITOR_MODE } from '@/constants/app.js'

export const routes = [
    {
        path: ROUTE_PATH.HOME,
        name: ROUTE_NAME.HOME,
        component: () => import('@/views/HomeView.vue'),
        meta: { title: 'Trang chủ' },
    },
    {
        path: ROUTE_PATH.LOGIN,
        name: ROUTE_NAME.LOGIN,
        component: () => import('@/views/LoginView.vue'),
        meta: { title: 'Đăng nhập', guestOnly: true },
    },
    {
        path: ROUTE_PATH.REGISTER,
        name: ROUTE_NAME.REGISTER,
        component: () => import('@/views/RegisterView.vue'),
        meta: { title: 'Đăng ký', guestOnly: true },
    },
    {
        path: ROUTE_PATH.TRIPS,
        name: ROUTE_NAME.TRIPS,
        component: () => import('@/views/TripsView.vue'),
        meta: { title: 'Chuyến đi', requiresAuth: true },
    },
    {
        path: ROUTE_PATH.TRIP_CREATE,
        name: ROUTE_NAME.TRIP_CREATE,
        component: () => import('@/views/TripEditorView.vue'),
        meta: { title: 'Tạo chuyến đi', requiresAuth: true, mode: EDITOR_MODE.CREATE },
    },
    {
        path: ROUTE_PATH.TRIP_DETAIL,
        name: ROUTE_NAME.TRIP_DETAIL,
        component: () => import('@/views/TripDetailView.vue'),
        props: true,
        meta: { title: 'Chi tiết chuyến đi', requiresAuth: true },
    },
    {
        path: ROUTE_PATH.TRIP_EDIT,
        name: ROUTE_NAME.TRIP_EDIT,
        component: () => import('@/views/TripEditorView.vue'),
        props: true,
        meta: { title: 'Chỉnh sửa chuyến đi', requiresAuth: true, mode: EDITOR_MODE.EDIT },
    },
    {
        path: ROUTE_PATH.TRIP_STOP_REVIEW,
        name: ROUTE_NAME.TRIP_STOP_REVIEW,
        component: () => import('@/views/ReviewEditorView.vue'),
        props: true,
        meta: { title: 'Đánh giá địa điểm', requiresAuth: true },
    },
    {
        path: ROUTE_PATH.PROVINCES,
        name: ROUTE_NAME.PROVINCES,
        component: () => import('@/views/ProvincesView.vue'),
        meta: { title: 'Bản đồ dấu chân', requiresAuth: true },
    },
    {
        path: ROUTE_PATH.PROVINCE_DETAIL,
        name: ROUTE_NAME.PROVINCE_DETAIL,
        component: () => import('@/views/ProvinceDetailView.vue'),
        props: true,
        meta: { title: 'Khám phá tỉnh thành', requiresAuth: true },
    },
    {
        path: ROUTE_PATH.PROFILE,
        name: ROUTE_NAME.PROFILE,
        component: () => import('@/views/ProfileView.vue'),
        meta: { title: 'Hồ sơ', requiresAuth: true },
    },
    {
        path: ROUTE_PATH.CHANGE_PASSWORD,
        name: ROUTE_NAME.CHANGE_PASSWORD,
        component: () => import('@/views/ChangePasswordView.vue'),
        meta: { title: 'Đổi mật khẩu', requiresAuth: true },
    },
    {
        path: ROUTE_PATH.NOT_FOUND,
        name: ROUTE_NAME.NOT_FOUND,
        component: () => import('@/views/NotFoundView.vue'),
        meta: { title: 'Không tìm thấy trang' },
    },
]
