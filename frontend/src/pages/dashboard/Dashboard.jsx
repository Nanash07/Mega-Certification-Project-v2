// src/pages/Dashboard.jsx
import SuperadminDashboard from "./SuperadminDashboard";
import PICDashboard from "./PICDashboard";
import EmployeeDashboard from "./EmployeeDashboard";

function getStoredUser() {
    try {
        return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
        return {};
    }
}

function getCurrentRole() {
    const storedUser = getStoredUser();

    return (
        storedUser.role ||
        localStorage.getItem("role") || // backward compatibility
        ""
    )
        .toString()
        .toUpperCase();
}

export default function Dashboard() {
    const role = getCurrentRole();

    if (role === "SUPERADMIN") return <SuperadminDashboard />;
    if (role === "PIC") return <PICDashboard />;

    // EMPLOYEE / PEGAWAI / default lain jatuh ke sini
    return <EmployeeDashboard />;
}
