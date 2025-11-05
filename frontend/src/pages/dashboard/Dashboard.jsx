import SuperadminDashboard from "./SuperadminDashboard";
import PICDashboard from "./PICDashboard";
import EmployeeDashboard from "./EmployeeDashboard";

export default function Dashboard() {
    const role = localStorage.getItem("role");
    if (role === "SUPERADMIN") return <SuperadminDashboard />;
    if (role === "PIC") return <PICDashboard />;
    return <EmployeeDashboard />;
}
