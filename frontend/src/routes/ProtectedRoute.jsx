// src/pages/routes/ProtectedRoute.jsx
import { Navigate, useLocation } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

const isTokenExpired = (token) => {
    try {
        const { exp } = jwtDecode(token);
        if (!exp) return false;
        return exp < Math.floor(Date.now() / 1000);
    } catch {
        return true;
    }
};

const extractRoles = (payload) => {
    let raw = payload?.roles ?? payload?.authorities ?? payload?.role ?? payload?.scope ?? payload?.scopes;

    if (!raw) return [];
    if (Array.isArray(raw))
        return raw.map((r) =>
            String(r)
                .replace(/^ROLE_/, "")
                .toUpperCase()
        );
    if (typeof raw === "string")
        return raw
            .split(/[,\s]+/)
            .filter(Boolean)
            .map((r) => r.replace(/^ROLE_/, "").toUpperCase());

    return [];
};

const getStoredUser = () => {
    try {
        const raw = localStorage.getItem("user");
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
};

export default function ProtectedRoute({ children, roles }) {
    const location = useLocation();
    const token = localStorage.getItem("token");

    // Token check
    if (!token || isTokenExpired(token)) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        return <Navigate to="/login" replace />;
    }

    // Role check
    if (roles?.length) {
        try {
            const payload = jwtDecode(token);
            const userRoles = extractRoles(payload);
            const allowed = userRoles.some((r) => roles.includes(r));
            if (!allowed) return <Navigate to="/dashboard" replace />;
        } catch {
            return <Navigate to="/login" replace />;
        }
    }

    // FIRST LOGIN CHECK (only addition)
    const user = getStoredUser();
    if (
        user &&
        String(user.role).toUpperCase() === "PEGAWAI" &&
        user.isFirstLogin === true &&
        location.pathname !== "/first-login/change-password"
    ) {
        return <Navigate to="/first-login/change-password" replace />;
    }

    return children;
}
