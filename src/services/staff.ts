import { supabase } from "../lib/supabase";

export interface StaffMember {
  id: string;
  profile_id: string;
  staff_id_code: string;
  department: string | null;
  position: string | null;
  employment_date: string | null;
  profiles: { full_name: string; email: string; role: string; status: string; passport_url: string | null } | null;
}

export async function listStaff(): Promise<StaffMember[]> {
  const { data, error } = await supabase
    .from("staff")
    .select("id, profile_id, staff_id_code, department, position, employment_date, profiles(full_name, email, role, status, passport_url)")
    .order("staff_id_code");
  if (error) throw error;
  return data as unknown as StaffMember[];
}

export async function inviteStaff(input: {
  email: string; fullName: string; role: string;
  department?: string; position?: string; qualification?: string; employmentDate?: string;
}) {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) return { error: "Not signed in" };

  const { data, error } = await supabase.functions.invoke("invite-staff", {
    body: {
      email: input.email, fullName: input.fullName, role: input.role,
      department: input.department, position: input.position,
      qualification: input.qualification, employmentDate: input.employmentDate
    },
    headers: { Authorization: `Bearer ${token}` }
  });

  if (error) return { error: error.message };
  if (data?.error) return { error: data.error };
  return { error: null };
}

// Staff photos live on `profiles.passport_url`, not the staff table
// itself — the staff row is employment data, the profile is identity
// data, and the photo belongs with identity.
export async function uploadStaffPassport(schoolId: string, profileId: string, file: File) {
  const path = `${schoolId}/staff/${profileId}-${Date.now()}-${file.name}`;
  const { error: uploadError } = await supabase.storage.from("passports").upload(path, file, { upsert: true });
  if (uploadError) return { error: uploadError.message };
  const { error } = await supabase.from("profiles").update({ passport_url: path }).eq("id", profileId);
  if (error) return { error: error.message };
  return { error: null };
}
