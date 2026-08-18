export type UserRole =
  | "super_admin"
  | "school_owner"
  | "school_admin"
  | "principal"
  | "vice_principal"
  | "teacher"
  | "staff"
  | "parent"
  | "student";

export interface Profile {
  id: string;
  school_id: string | null;
  role: UserRole;
  full_name: string;
  email: string;
  phone?: string;
  passport_url?: string;
  status: "active" | "inactive";
}

// Central role -> default landing route map, used by the router
// and by the login redirect logic.
export const ROLE_HOME: Record<UserRole, string> = {
  super_admin: "/super-admin/dashboard",
  school_owner: "/school-admin/dashboard",
  school_admin: "/school-admin/dashboard",
  principal: "/principal/dashboard",
  vice_principal: "/principal/dashboard",
  teacher: "/teacher/dashboard",
  staff: "/staff/attendance",
  parent: "/parent/dashboard",
  student: "/student/dashboard"
};

// Which roles may access which top-level route prefixes.
// Enforced in <ProtectedRoute> — never trust the client alone,
// RLS is the real boundary, this is just UX-level gating.
export const ROUTE_ACCESS: Record<string, UserRole[]> = {
  "/super-admin": ["super_admin"],
  "/school-admin": ["school_owner", "school_admin"],
  "/principal": ["principal", "vice_principal"],
  "/teacher": ["teacher"],
  "/staff": ["staff"],
  "/parent": ["parent"],
  "/student": ["student"]
};
