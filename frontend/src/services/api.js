import axios from "axios";
import qs from "qs";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api",
    withCredentials: true,
    paramsSerializer: (params) => qs.stringify(params, { arrayFormat: "repeat" }),
});

// ===== Request Interceptor: inject Bearer token
api.interceptors.request.use(
    (cfg) => {
        const token = localStorage.getItem("token");
        if (token) cfg.headers.Authorization = `Bearer ${token}`;
        return cfg;
    },
    (err) => Promise.reject(err)
);

// ===== Response Interceptor: normalize error
api.interceptors.response.use(
    (res) => res,
    (err) => {
        const msg = err?.response?.data?.message || err?.response?.data?.error || err?.message || "Request error";

        console.error("API error:", msg, err?.config?.url);

        return Promise.reject({ ...err, message: msg });
    }
);

export default api;
