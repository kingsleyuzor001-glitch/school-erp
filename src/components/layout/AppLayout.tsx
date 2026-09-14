import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import type { UserRole } from "../../types/auth";
import PlatformLogo from "./PlatformLogo";

const NAV: Record<UserRole, { label: string; to: string }[]> = {
  super_admin: [
    { label: "Schools", to: "/super-admin/dashboard" },
    { label: "Curriculum", to: "/super-admin/curriculum" },
    { label: "Sessions", to: "/super-admin/sessions" },
    { label: "Terms", to: "/super-admin/terms" },
    { label: "Platform Settings", to: "/super-admin/platform-settings" },
    { label: "Announcements", to: "/announcements" }
  ],
  school_owner: [
    { label: "Dashboard", to: "/school-admin/dashboard" },
    { label: "Students", to: "/school-admin/students" },
    { label: "Staff", to: "/school-admin/staff" },
    { label: "Staff Attendance", to: "/school-admin/staff-attendance" },
    { label: "Student Attendance", to: "/school-admin/student-attendance" },
    { label: "Teacher Assignments", to: "/school-admin/teacher-assignments" },
    { label: "Academic Setup", to: "/school-admin/academic-setup" },
    { label: "Lesson Notes", to: "/school-admin/lesson-notes" },
    { label: "CBT Exams", to: "/school-admin/cbt-exams" },
    { label: "CBT PINs", to: "/school-admin/cbt-pins" },
    { label: "Admissions", to: "/school-admin/admissions" },
    { label: "Finance", to: "/school-admin/finance" },
    { label: "View Results", to: "/principal/results" },
    { label: "Publish Results", to: "/school-admin/publish-results" },
    { label: "Portal Access", to: "/school-admin/portal-access" },
    { label: "Student ID Cards", to: "/school-admin/id-cards/students" },
    { label: "Staff ID Cards", to: "/school-admin/id-cards/staff" },
    { label: "Branding", to: "/school-admin/branding" },
    { label: "Announcements", to: "/announcements" },
    { label: "Activities", to: "/activities" }
  ],
  school_admin: [
    { label: "Dashboard", to: "/school-admin/dashboard" },
    { label: "Students", to: "/school-admin/students" },
    { label: "Staff", to: "/school-admin/staff" },
    { label: "Staff Attendance", to: "/school-admin/staff-attendance" },
    { label: "Student Attendance", to: "/school-admin/student-attendance" },
    { label: "Teacher Assignments", to: "/school-admin/teacher-assignments" },
    { label: "Academic Setup", to: "/school-admin/academic-setup" },
    { label: "Lesson Notes", to: "/school-admin/lesson-notes" },
    { label: "CBT Exams", to: "/school-admin/cbt-exams" },
    { label: "CBT PINs", to: "/school-admin/cbt-pins" },
    { label: "Admissions", to: "/school-admin/admissions" },
    { label: "Finance", to: "/school-admin/finance" },
    { label: "View Results", to: "/principal/results" },
    { label: "Publish Results", to: "/school-admin/publish-results" },
    { label: "Portal Access", to: "/school-admin/portal-access" },
    { label: "Student ID Cards", to: "/school-admin/id-cards/students" },
    { label: "Staff ID Cards", to: "/school-admin/id-cards/staff" },
    { label: "Branding", to: "/school-admin/branding" },
    { label: "Announcements", to: "/announcements" },
    { label: "Activities", to: "/activities" }
  ],
  principal: [
    { label: "Dashboard", to: "/principal/dashboard" },
    { label: "Approve Results", to: "/principal/approve-results" },
    { label: "Announcements", to: "/announcements" },
    { label: "Activities", to: "/activities" },
    { label: "Report Card", to: "/report-card" }
  ],
  vice_principal: [],
  teacher: [
    { label: "Dashboard", to: "/teacher/dashboard" },
    { label: "Attendance", to: "/teacher/attendance" },
    { label: "Student Attendance", to: "/teacher/student-attendance" },
    { label: "Results Entry", to: "/teacher/results" },
    { label: "CBT Exams", to: "/school-admin/cbt-exams" },
    { label: "Announcements", to: "/announcements" },
    { label: "Activities", to: "/activities" }
  ],
  staff: [
    { label: "Attendance", to: "/staff/attendance" },
    { label: "Announcements", to: "/announcements" },
    { label: "Activities", to: "/activities" }
  ],
  parent: [
    { label: "My Children", to: "/parent/dashboard" },
    { label: "Report Card", to: "/report-card" },
    { label: "Announcements", to: "/announcements" },
    { label: "Activities", to: "/activities" }
  ],
  student: [
    { label: "My Profile", to: "/student/dashboard" },
    { label: "Report Card", to: "/report-card" },
    { label: "Announcements", to: "/announcements" },
    { label: "Activities", to: "/activities" }
  ]
};

NAV.vice_principal = NAV.principal;

export function AppLayout() {
  const { profile, signOut } = useAuth();

  if (!profile) {
    return null;
  }

  const items = NAV[profile.role] ?? [];

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white p-5 sm:flex">
        <div className="mb-8 flex items-center gap-3">
          <PlatformLogo
            className="h-10 w-10 shrink-0"
            imageClassName="h-full w-full object-contain"
          />
          <span className="font-display text-base font-bold">
            School ERP
          </span>
        </div>

        <nav className="flex-1 space-y-1">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `block rounded-lg px-3 py-2 text-sm font-medium ${
                  isActive
                    ? "bg-brand-50 text-brand-700"
                    : "text-slate-600 hover:bg-slate-50"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <button
          onClick={signOut}
          className="rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-500 hover:bg-slate-50"
        >
          Sign out
        </button>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 sm:hidden">
          <div className="flex items-center gap-2">
            <PlatformLogo
              className="h-8 w-8 shrink-0"
              imageClassName="h-full w-full object-contain"
            />
            <span className="font-display text-base font-bold">
              School ERP
            </span>
          </div>

          <button
            onClick={signOut}
            className="text-xs font-medium text-slate-500"
          >
            Sign out
          </button>
        </header>

        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}