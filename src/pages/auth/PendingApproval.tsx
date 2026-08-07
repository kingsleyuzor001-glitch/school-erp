import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { fetchMySchool, School } from "../../services/schools";
import { Button } from "../../components/ui/Button";

const COPY: Record<School["status"], { title: string; body: string }> = {
  pending: {
    title: "Your school is awaiting approval",
    body: "A platform administrator is reviewing your registration. This usually doesn't take long — check back soon."
  },
  suspended: {
    title: "This school's access is suspended",
    body: "Contact the platform team to resolve this before continuing."
  },
  expired: {
    title: "Subscription expired",
    body: "Renew your school's subscription to regain access."
  },
  active: {
    title: "You're all set",
    body: "This shouldn't normally show while active — try refreshing."
  }
};

export default function PendingApproval() {
  const { profile, signOut } = useAuth();
  const [school, setSchool] = useState<School | null>(null);

  useEffect(() => {
    if (profile?.school_id) fetchMySchool(profile.school_id).then(setSchool);
  }, [profile?.school_id]);

  const status = school?.status ?? "pending";
  const copy = COPY[status];

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <div className="mb-4 h-12 w-12 rounded-full bg-amber-100 text-amber-600" />
      <h1 className="font-display text-xl font-bold">{copy.title}</h1>
      <p className="mt-2 max-w-sm text-sm text-slate-500">{copy.body}</p>
      <Button variant="secondary" className="mt-6" onClick={() => window.location.reload()}>
        Check again
      </Button>
      <button onClick={signOut} className="mt-3 text-xs text-slate-400 hover:text-slate-600">
        Sign out
      </button>
    </div>
  );
}
