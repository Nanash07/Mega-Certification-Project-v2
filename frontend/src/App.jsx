// src/App.jsx
import React from "react";
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
import EmployeeResignedPage from "./pages/employees/EmployeeResignedPage"; // 🔹 NEW

// ================= ORGANIZATION =================
import RegionalPage from "./pages/organizations/RegionalPage";
import DivisionPage from "./pages/organizations/DivisionPage";
import UnitPage from "./pages/organizations/UnitPage";
import JobPositionPage from "./pages/organizations/JobPositionPage";

// ================= SERTIFIKAT (MASTER) =================
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

// ================= SETTINGS / NOTIFICATIONS =================
import EmailConfigPage from "./pages/notifications/EmailConfigPage";
import NotificationSettingsPage from "./pages/notifications/NotificationSettingsPage";
import NotificationPage from "./pages/notifications/NotificationPage";

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                {/* ===== AUTH ===== */}
                <Route path="/login" element={<Login />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />

                {/* ===== ROOT REDIRECT ===== */}
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
                {/* 🔹 Halaman pegawai resign */}
                <Route
                    path="/employee/resigned"
                    element={
                        <ProtectedRoute roles={["SUPERADMIN", "PIC"]}>
                            <MainLayout>
                                <EmployeeResignedPage />
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
                        <ProtectedRoute roles={["SUPERADMIN", "PIC", "PEGAWAI"]}>
                            <MainLayout>
                                <EmployeeEligibilityPage />
                            </MainLayout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/employee/exception"
                    element={
                        <ProtectedRoute roles={["SUPERADMIN", "PIC"]}>
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
                        <ProtectedRoute roles={["SUPERADMIN", "PIC"]}>
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
                        <ProtectedRoute roles={["SUPERADMIN", "PIC"]}>
                            <MainLayout>
                                <JobCertificationMappingPage />
                            </MainLayout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/mapping/job-certification/histories"
                    element={
                        <ProtectedRoute roles={["SUPERADMIN", "PIC"]}>
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
                        <ProtectedRoute roles={["SUPERADMIN", "PIC"]}>
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

                {/* ===== SERTIFIKAT (MASTER) ===== */}
                <Route
                    path="/sertifikat/jenis"
                    element={
                        <ProtectedRoute roles={["SUPERADMIN"]}>
                            <MainLayout>
                                <CertificationPage />
                            </MainLayout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/sertifikat/jenjang"
                    element={
                        <ProtectedRoute roles={["SUPERADMIN"]}>
                            <MainLayout>
                                <CertificationLevelPage />
                            </MainLayout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/sertifikat/sub-bidang"
                    element={
                        <ProtectedRoute roles={["SUPERADMIN"]}>
                            <MainLayout>
                                <SubFieldPage />
                            </MainLayout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/sertifikat/aturan-sertifikat"
                    element={
                        <ProtectedRoute roles={["SUPERADMIN", "PIC"]}>
                            <MainLayout>
                                <CertificationRulePage />
                            </MainLayout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/sertifikat/aturan-sertifikat/histories"
                    element={
                        <ProtectedRoute roles={["SUPERADMIN", "PIC"]}>
                            <MainLayout>
                                <CertificationRuleHistoryPage />
                            </MainLayout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/sertifikat/lembaga"
                    element={
                        <ProtectedRoute roles={["SUPERADMIN", "PIC"]}>
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
                        <ProtectedRoute roles={["SUPERADMIN", "PIC"]}>
                            <MainLayout>
                                <UserPage />
                            </MainLayout>
                        </ProtectedRoute>
                    }
                />

                {/* ===== SETTINGS / NOTIFIKASI ===== */}
                <Route
                    path="/settings/email-config"
                    element={
                        <ProtectedRoute roles={["SUPERADMIN", "PIC"]}>
                            <MainLayout>
                                <EmailConfigPage />
                            </MainLayout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/settings/notification-settings"
                    element={
                        <ProtectedRoute roles={["SUPERADMIN", "PIC"]}>
                            <MainLayout>
                                <NotificationSettingsPage />
                            </MainLayout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/notifications"
                    element={
                        <ProtectedRoute>
                            <MainLayout>
                                <NotificationPage />
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
