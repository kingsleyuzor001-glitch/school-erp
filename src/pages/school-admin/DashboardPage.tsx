import { QuickLinksDashboard } from "../../components/layout/QuickLinksDashboard";

export default function SchoolAdminDashboardPage() {
  return (
    <QuickLinksDashboard
      title="School Dashboard"
      links={[
        { label: "Students", to: "/school-admin/students", description: "Enroll and manage student records." },
        { label: "Staff", to: "/school-admin/staff", description: "Invite and manage teachers and staff." },
        { label: "Academic Setup", to: "/school-admin/academic-setup", description: "Sessions, terms, classes, subjects." },
        { label: "Admissions", to: "/school-admin/admissions", description: "Review and approve applications." },
        { label: "Publish Results", to: "/school-admin/publish-results", description: "Release approved results to parents and students." },
        { label: "Portal Access", to: "/school-admin/portal-access", description: "Grant parent and student portal logins." },
        { label: "Student ID Cards", to: "/school-admin/id-cards/students", description: "Generate and download ID cards." },
        { label: "Staff ID Cards", to: "/school-admin/id-cards/staff", description: "Generate and download staff ID cards." },
        { label: "Branding", to: "/school-admin/branding", description: "Logo, signature, stamp, and colors." },
        { label: "Announcements", to: "/announcements", description: "Post updates to the school." },
        { label: "School Activities", to: "/activities", description: "Photos and videos from school life." }
      ]}
    />
  );
}
