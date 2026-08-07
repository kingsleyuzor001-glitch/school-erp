import { QuickLinksDashboard } from "../../components/layout/QuickLinksDashboard";

export default function PrincipalDashboardPage() {
  return (
    <QuickLinksDashboard
      title="Principal Dashboard"
      links={[
        { label: "Approve Results", to: "/principal/approve-results", description: "Sign off on results submitted by teachers." },
        { label: "Report Card", to: "/report-card", description: "View a student's published report card." },
        { label: "Announcements", to: "/announcements", description: "Post and view school announcements." },
        { label: "School Activities", to: "/activities", description: "Photos and videos from school life." }
      ]}
    />
  );
}
