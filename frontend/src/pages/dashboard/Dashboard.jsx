// src/pages/Dashboard.jsx
import SuperadminDashboard from "./SuperadminDashboard";
import PICDashboard from "./PICDashboard";
import EmployeeDashboard from "./EmployeeDashboard";
import { getCurrentRole } from "../../utils/helpers";

export default function Dashboard() {
    const role = getCurrentRole();

    if (role === "SUPERADMIN") return <SuperadminDashboard />;
    if (role === "PIC") return <PICDashboard />;

    // EMPLOYEE / PEGAWAI / default lain jatuh ke sini
    return <EmployeeDashboard />;
}
