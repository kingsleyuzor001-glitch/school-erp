import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { Card } from "../ui/Card";

export function QuickLinksDashboard({
  title, links
}: { title: string; links: { label: string; to: string; description: string }[] }) {
  const { profile } = useAuth();
  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div>
        <h1 className="font-display text-xl font-bold">{title}</h1>
        <p className="text-sm text-slate-500">Welcome back, {profile?.full_name}.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {links.map((l) => (
          <Link key={l.to} to={l.to}>
            <Card className="h-full transition hover:border-brand-300 hover:shadow-md">
              <p className="font-display text-base font-semibold">{l.label}</p>
              <p className="mt-1 text-sm text-slate-500">{l.description}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
