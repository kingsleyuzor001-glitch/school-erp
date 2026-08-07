import { QuickLinksDashboard } from "../../components/layout/QuickLinksDashboard";

export default function TeacherDashboardPage() {
  return (
    <QuickLinksDashboard
      title="Teacher Dashboard"
      links={[
        { label: "Attendance", to: "/teacher/attendance", description: "Mark attendance for your classes." },
        { label: "Results Entry", to: "/teacher/results", description: "Enter and submit scores for approval." },
        { label: "Lesson Notes", to: "/teacher/lesson-notes", description: "Upload and browse lesson notes." },
        { label: "Announcements", to: "/announcements", description: "View school announcements." },
        { label: "School Activities", to: "/activities", description: "Photos and videos from school life." }
      ]}
    />
  );
}
