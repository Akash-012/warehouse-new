import axios from 'axios';
// Keep runtime target configurable via env; fallback to same-origin /api when env is not set.
const rawApiBaseUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
const apiBaseUrl = rawApiBaseUrl ? rawApiBaseUrl.replace(/\/$/, '') : '';
const api = axios.create({
    baseURL: apiBaseUrl ? `${apiBaseUrl}/api` : '/api',
});
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('wms_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});
api.interceptors.response.use((response) => response, (error) => {
    // 401 = token expired / not authenticated → force re-login
    // 403 = authenticated but lacks permission → let the page handle it gracefully
    if (error.response?.status === 401) {
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
            window.location.href = '/login';
        }
    }
    return Promise.reject(error);
});
export default api;
