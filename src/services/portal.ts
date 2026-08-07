import { supabase } from "../lib/supabase";

// Both rely entirely on RLS to do the actual filtering — a student's
// own students_select policy only matches their own row, and a
// parent's only matches their guardian-linked children, so these are
// deliberately unfiltered queries. No student_id/parent_id needs to
// be passed in; the database already knows who's asking.

export async function getMyStudentRecord() {
  const { data, error } = await supabase.from("students").select("*").single();
  if (error) return null;
  return data;
}

export async function getMyChildren() {
  const { data, error } = await supabase.from("students").select("*").order("full_name");
  if (error) throw error;
  return data;
}

export async function invitePortalUser(input:
  | { kind: "parent"; email: string; fullName: string; studentId: string; relationship: string }
  | { kind: "student"; email: string; studentId: string }
) {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) return { error: "Not signed in" };

  const { data, error } = await supabase.functions.invoke("invite-portal-user", {
    body: input,
    headers: { Authorization: `Bearer ${token}` }
  });
  if (error) return { error: error.message };
  if (data?.error) return { error: data.error };
  return { error: null };
}
