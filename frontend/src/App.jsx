import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Auth
import Login from "./pages/auth/Login";
import ForgotPassword from "./pages/auth/ForgotPassword";

// Layouts & Guards
import ProtectedRoute from "./routes/ProtectedRoute";
import MainLayout from "./layouts/MainLayout";

// Dashboard
import Dashboard from "./pages/dashboard/Dashboard";

// Profile
import ProfilePage from "./pages/profile/ProfilePage";

// ================= EMPLOYEE =================
import EmployeeDataPage from "./pages/employees/EmployeeDataPage";
import EmployeeDetailPage from "./pages/employees/EmployeeDetailPage";
import EmployeeEligibilityPage from "./pages/employees/EmployeeEligibilityPage";
import EmployeeExceptionPage from "./pages/employees/EmployeeExceptionPage";
import EmployeeCertificationPage from "./pages/employees/EmployeeCertificationPage";
import EmployeeCertificationHistoryPage from "./pages/employees/EmployeeCertificationHistoryPage";
import EmployeeHistoryPage from "./pages/employees/EmployeeHistoryPage";

// ================= ORGANIZATION =================
import RegionalPage from "./pages/organizations/RegionalPage";
import DivisionPage from "./pages/organizations/DivisionPage";
import UnitPage from "./pages/organizations/UnitPage";
import JobPositionPage from "./pages/organizations/JobPositionPage";

// ================= CERTIFICATION MASTER =================
import CertificationPage from "./pages/certifications/CertificationPage";
import CertificationLevelPage from "./pages/certifications/CertificationLevelPage";
import SubFieldPage from "./pages/certifications/SubFieldPage";
import CertificationRulePage from "./pages/certifications/CertificationRulePage";
import CertificationRuleHistoryPage from "./pages/certifications/CertificationRuleHistoryPage";
import InstitutionPage from "./pages/certifications/InstitutionPage";

// ================= MAPPINGS =================
import JobCertificationMappingPage from "./pages/mappings/JobCertificationMappingPage";
import JobCertificationMappingHistoryPage from "./pages/mappings/JobCertificationMappingHistoryPage";
import PicCertificationScopePage from "./pages/pic/PicCertificationScopePage";

// ================= BATCH =================
import BatchPage from "./pages/batch/BatchPage";
import DetailBatchPage from "./pages/batch/DetailBatchPage";

// ================= USERS =================
import UserPage from "./pages/users/UserPage";

// ================= SETTINGS =================
import EmailConfigPage from "./pages/Settings/EmailConfigPage";

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                {/* ===== AUTH ===== */}
                <Route path="/login" element={<Login />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />

                {/* ===== REDIRECT ROOT ===== */}
                <Route path="/" element={<Navigate to="/dashboard" replace />} />

                {/* ===== DASHBOARD ===== */}
                <Route
                    path="/dashboard"
                    element={
                        <ProtectedRoute>
                            <MainLayout>
                                <Dashboard />
                            </MainLayout>
                        </ProtectedRoute>
                    }
                />

                {/* ===== PROFILE ===== */}
                <Route
                    path="/profile"
                    element={
                        <ProtectedRoute>
                            <MainLayout>
                                <ProfilePage />
                            </MainLayout>
                        </ProtectedRoute>
                    }
                />

                {/* ===== EMPLOYEE ===== */}
                <Route
                    path="/employee/data"
                    element={
                        <ProtectedRoute>
                            <MainLayout>
                                <EmployeeDataPage />
                            </MainLayout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/employee/:id"
                    element={
                        <ProtectedRoute>
                            <MainLayout>
                                <EmployeeDetailPage />
                            </MainLayout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/employee/eligibility"
                    element={
                        <ProtectedRoute roles={["SUPERADMIN"]}>
                            <MainLayout>
                                <EmployeeEligibilityPage />
                            </MainLayout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/employee/exception"
                    element={
                        <ProtectedRoute roles={["SUPERADMIN"]}>
                            <MainLayout>
                                <EmployeeExceptionPage />
                            </MainLayout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/employee/certification"
                    element={
                        <ProtectedRoute roles={["SUPERADMIN", "PIC"]}>
                            <MainLayout>
                                <EmployeeCertificationPage />
                            </MainLayout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/employee/certification/histories"
                    element={
                        <ProtectedRoute roles={["SUPERADMIN", "PIC"]}>
                            <MainLayout>
                                <EmployeeCertificationHistoryPage />
                            </MainLayout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/employee/data/histories"
                    element={
                        <ProtectedRoute roles={["SUPERADMIN"]}>
                            <MainLayout>
                                <EmployeeHistoryPage />
                            </MainLayout>
                        </ProtectedRoute>
                    }
                />

                {/* ===== ORGANIZATION ===== */}
                <Route
                    path="/organization/regional"
                    element={
                        <ProtectedRoute roles={["SUPERADMIN"]}>
                            <MainLayout>
                                <RegionalPage />
                            </MainLayout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/organization/division"
                    element={
                        <ProtectedRoute roles={["SUPERADMIN"]}>
                            <MainLayout>
                                <DivisionPage />
                            </MainLayout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/organization/unit"
                    element={
                        <ProtectedRoute roles={["SUPERADMIN"]}>
                            <MainLayout>
                                <UnitPage />
                            </MainLayout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/organization/job-position"
                    element={
                        <ProtectedRoute roles={["SUPERADMIN"]}>
                            <MainLayout>
                                <JobPositionPage />
                            </MainLayout>
                        </ProtectedRoute>
                    }
                />

                {/* ===== MAPPING ===== */}
                <Route
                    path="/mapping/job-certification"
                    element={
                        <ProtectedRoute roles={["SUPERADMIN"]}>
                            <MainLayout>
                                <JobCertificationMappingPage />
                            </MainLayout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/mapping/job-certification/histories"
                    element={
                        <ProtectedRoute roles={["SUPERADMIN"]}>
                            <MainLayout>
                                <JobCertificationMappingHistoryPage />
                            </MainLayout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/mapping/pic-certification-scope"
                    element={
                        <ProtectedRoute roles={["SUPERADMIN"]}>
                            <MainLayout>
                                <PicCertificationScopePage />
                            </MainLayout>
                        </ProtectedRoute>
                    }
                />

                {/* ===== BATCH ===== */}
                <Route
                    path="/batch"
                    element={
                        <ProtectedRoute roles={["SUPERADMIN"]}>
                            <MainLayout>
                                <BatchPage />
                            </MainLayout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/batch/:id"
                    element={
                        <ProtectedRoute roles={["SUPERADMIN", "PIC"]}>
                            <MainLayout>
                                <DetailBatchPage />
                            </MainLayout>
                        </ProtectedRoute>
                    }
                />

                {/* ===== CERTIFICATION MASTER ===== */}
                <Route
                    path="/sertifikasi/jenis"
                    element={
                        <ProtectedRoute roles={["SUPERADMIN"]}>
                            <MainLayout>
                                <CertificationPage />
                            </MainLayout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/sertifikasi/jenjang"
                    element={
                        <ProtectedRoute roles={["SUPERADMIN"]}>
                            <MainLayout>
                                <CertificationLevelPage />
                            </MainLayout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/sertifikasi/sub-bidang"
                    element={
                        <ProtectedRoute roles={["SUPERADMIN"]}>
                            <MainLayout>
                                <SubFieldPage />
                            </MainLayout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/sertifikasi/aturan-sertifikat"
                    element={
                        <ProtectedRoute roles={["SUPERADMIN"]}>
                            <MainLayout>
                                <CertificationRulePage />
                            </MainLayout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/sertifikasi/aturan-sertifikat/histories"
                    element={
                        <ProtectedRoute roles={["SUPERADMIN"]}>
                            <MainLayout>
                                <CertificationRuleHistoryPage />
                            </MainLayout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/sertifikasi/lembaga"
                    element={
                        <ProtectedRoute roles={["SUPERADMIN"]}>
                            <MainLayout>
                                <InstitutionPage />
                            </MainLayout>
                        </ProtectedRoute>
                    }
                />

                {/* ===== USERS ===== */}
                <Route
                    path="/user"
                    element={
                        <ProtectedRoute roles={["SUPERADMIN"]}>
                            <MainLayout>
                                <UserPage />
                            </MainLayout>
                        </ProtectedRoute>
                    }
                />

                {/* ===== SETTINGS (EMAIL CONFIG) ===== */}
                <Route
                    path="/settings/email-config"
                    element={
                        <ProtectedRoute roles={["SUPERADMIN"]}>
                            <MainLayout>
                                <EmailConfigPage />
                            </MainLayout>
                        </ProtectedRoute>
                    }
                />

                {/* ===== FALLBACK ===== */}
                <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
        </BrowserRouter>
    );
}
