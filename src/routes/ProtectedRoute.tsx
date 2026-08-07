import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { ROLE_HOME, ROUTE_ACCESS, type UserRole } from "../types/auth";
import { fetchMySchool } from "../services/schools";

/**
 * Client-side gate. This is a UX convenience only — the real security
 * boundary is Postgres RLS (school_id isolation) enforced by Supabase.
 * A user landing here without permission is redirected, never shown
 * data they could theoretically fetch (RLS would reject the fetch anyway).
 */
export function ProtectedRoute({ allowed }: { allowed?: UserRole[] }) {
  const { session, profile, loading } = useAuth();
  const location = useLocation();
  const [schoolStatus, setSchoolStatus] = useState<"checking" | "ok" | "blocked">("checking");

  useEffect(() => {
    if (!profile) return;
    if (profile.role === "super_admin" || !profile.school_id) {
      setSchoolStatus("ok");
      return;
    }
    fetchMySchool(profile.school_id).then((school) => {
      setSchoolStatus(school?.status === "active" ? "ok" : "blocked");
    });
  }, [profile]);

  if (loading) return <FullScreenSpinner />;
  if (!session) return <Navigate to="/login" state={{ from: location }} replace />;
  if (!profile) return <FullScreenSpinner />;

  const requiredRoles =
    allowed ?? ROUTE_ACCESS[Object.keys(ROUTE_ACCESS).find((p) => location.pathname.startsWith(p)) ?? ""];

  if (requiredRoles && !requiredRoles.includes(profile.role)) {
    return <Navigate to={ROLE_HOME[profile.role]} replace />;
  }

  if (profile.status !== "active") {
    return <Navigate to="/account-suspended" replace />;
  }

  // A school going pending/suspended/expired blocks every non-super-admin
  // role under it, regardless of their own individual profile.status.
  if (schoolStatus === "checking") return <FullScreenSpinner />;
  if (schoolStatus === "blocked") return <Navigate to="/pending-approval" replace />;

  return <Outlet />;
}

function FullScreenSpinner() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
    </div>
  );
}
