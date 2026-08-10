import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import { AppLayout } from "./components/layout/AppLayout";
import { ROLE_HOME, type UserRole } from "./types/auth";

import LoginPage from "./pages/auth/LoginPage";
import RegisterSchool from "./pages/auth/RegisterSchool";
import PendingApproval from "./pages/auth/PendingApproval";
import AccountSuspendedPage from "./pages/auth/AccountSuspendedPage";
import ApplyPage from "./pages/public/ApplyPage";

import SchoolsPage from "./pages/super-admin/SchoolsPage";
import CurriculumPage from "./pages/super-admin/CurriculumPage";

import SchoolAdminDashboardPage from "./pages/school-admin/DashboardPage";
import StudentsPage from "./pages/school-admin/StudentsPage";
import StaffPage from "./pages/school-admin/StaffPage";
import AcademicSetupPage from "./pages/school-admin/AcademicSetupPage";
import AdmissionsPage from "./pages/school-admin/AdmissionsPage";
import PortalAccessPage from "./pages/school-admin/PortalAccessPage";
import BrandingPage from "./pages/school-admin/BrandingPage";
import StudentIdCardsPage from "./pages/school-admin/StudentIdCardsPage";
import StaffIdCardsPage from "./pages/school-admin/StaffIdCardsPage";

import PrincipalDashboardPage from "./pages/principal/DashboardPage";
import { ApproveResultsPage, PublishResultsPage } from "./pages/shared/ResultsWorkflowPage";

import TeacherDashboardPage from "./pages/teacher/DashboardPage";
import AttendancePage from "./pages/teacher/AttendancePage";
import ResultsEntryPage from "./pages/teacher/ResultsEntryPage";
import LessonNotesPage from "./pages/teacher/LessonNotesPage";

import ParentPortalPage from "./pages/parent/ParentPortalPage";
import StudentPortalPage from "./pages/student/StudentPortalPage";

import AnnouncementsPage from "./pages/shared/AnnouncementsPage";
import ActivitiesPage from "./pages/shared/ActivitiesPage";
import ReportCardPage from "./pages/shared/ReportCardPage";

const ALL_ROLES: UserRole[] = [
  "super_admin", "school_owner", "school_admin", "principal",
  "vice_principal", "teacher", "parent", "student"
];
const NON_ADMISSION_STAFF: UserRole[] = [
  "school_owner", "school_admin", "principal", "vice_principal", "teacher", "parent", "student"
];

// Guards /pending-approval and /account-suspended — these ARE the
// pages ProtectedRoute redirects to when it blocks someone, so they
// can't be wrapped in ProtectedRoute itself (that would just redirect
// back to itself). They only need a live session, not full clearance.
function RequireSession() {
  const { session, loading } = useAuth();
  if (loading) return null;
  if (!session) return <Navigate to="/login" replace />;
  return <Outlet />;
}

function RootRedirect() {
  const { session, profile, loading } = useAuth();
  if (loading) return null;
  if (!session) return <Navigate to="/login" replace />;
  if (!profile) return null;
  return <Navigate to={ROLE_HOME[profile.role]} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterSchool />} />
      <Route path="/apply/:schoolSlug" element={<ApplyPage />} />

      <Route element={<RequireSession />}>
        <Route path="/pending-approval" element={<PendingApproval />} />
        <Route path="/account-suspended" element={<AccountSuspendedPage />} />
      </Route>

      <Route element={<ProtectedRoute allowed={["super_admin"]} />}>
        <Route element={<AppLayout />}>
          <Route path="/super-admin/dashboard" element={<SchoolsPage />} />
          <Route path="/super-admin/curriculum" element={<CurriculumPage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowed={["school_owner", "school_admin"]} />}>
        <Route element={<AppLayout />}>
          <Route path="/school-admin/dashboard" element={<SchoolAdminDashboardPage />} />
          <Route path="/school-admin/students" element={<StudentsPage />} />
          <Route path="/school-admin/staff" element={<StaffPage />} />
          <Route path="/school-admin/academic-setup" element={<AcademicSetupPage />} />
      <Route path="/school-admin/lesson-notes" element={<LessonNotesPage />} />
          <Route path="/school-admin/admissions" element={<AdmissionsPage />} />
          <Route path="/school-admin/publish-results" element={<PublishResultsPage />} />
          <Route path="/school-admin/portal-access" element={<PortalAccessPage />} />
          <Route path="/school-admin/branding" element={<BrandingPage />} />
          <Route path="/school-admin/id-cards/students" element={<StudentIdCardsPage />} />
          <Route path="/school-admin/id-cards/staff" element={<StaffIdCardsPage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowed={["principal", "vice_principal"]} />}>
        <Route element={<AppLayout />}>
          <Route path="/principal/dashboard" element={<PrincipalDashboardPage />} />
          <Route path="/principal/approve-results" element={<ApproveResultsPage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowed={["teacher"]} />}>
        <Route element={<AppLayout />}>
          <Route path="/teacher/dashboard" element={<TeacherDashboardPage />} />
          <Route path="/teacher/attendance" element={<AttendancePage />} />
          <Route path="/teacher/results" element={<ResultsEntryPage />} />
        </Route>
      </Route>

      {/* Lesson notes: shared platform-wide (Phase 10) — super admin
          uploads, everyone else reads. One shared route rather than
          duplicating the page under every role's prefix. */}
      <Route element={<ProtectedRoute allowed={ALL_ROLES} />}>
        <Route element={<AppLayout />}>
          <Route path="/teacher/lesson-notes" element={<LessonNotesPage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowed={["parent"]} />}>
        <Route element={<AppLayout />}>
          <Route path="/parent/dashboard" element={<ParentPortalPage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowed={["student"]} />}>
        <Route element={<AppLayout />}>
          <Route path="/student/dashboard" element={<StudentPortalPage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowed={ALL_ROLES} />}>
        <Route element={<AppLayout />}>
          <Route path="/announcements" element={<AnnouncementsPage />} />
          <Route path="/activities" element={<ActivitiesPage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowed={NON_ADMISSION_STAFF} />}>
        <Route element={<AppLayout />}>
          <Route path="/report-card" element={<ReportCardPage />} />
        </Route>
      </Route>

      <Route path="/" element={<RootRedirect />} />
      <Route path="*" element={<RootRedirect />} />
    </Routes>
  );
}







