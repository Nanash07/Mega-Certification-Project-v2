import axios from "axios";
import qs from "qs"; // npm install qs

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api",
    withCredentials: true,
    paramsSerializer: (params) => {
        // 👉 bikin array jadi certIds=1&certIds=2
        return qs.stringify(params, { arrayFormat: "repeat" });
    },
});

// ===== Request Interceptor: inject Bearer token
api.interceptors.request.use(
    (cfg) => {
        const token = localStorage.getItem("token");
        if (token) {
            cfg.headers.Authorization = `Bearer ${token}`;
        }
        return cfg;
    },
    (err) => Promise.reject(err)
);

// ===== Response Interceptor: normalisasi error
api.interceptors.response.use(
    (res) => res,
    (err) => {
        const msg = err?.response?.data?.message || err?.response?.data?.error || err?.message || "Request error";

        // log ke console biar gampang debug
        console.error("API error:", msg, err?.config?.url);

        return Promise.reject({ ...err, message: msg });
    }
);

export default api;
