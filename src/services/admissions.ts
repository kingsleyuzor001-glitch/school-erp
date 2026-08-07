import { supabase } from "../lib/supabase";

export interface PublicSchool { id: string; name: string; logo_url: string | null; brand_primary_color: string | null; motto: string | null; }
export interface PublicClass { id: string; name: string; arm: string | null; }

export interface AdmissionApplication {
  id: string;
  applicant_name: string;
  date_of_birth: string | null;
  gender: string | null;
  guardian_name: string | null;
  guardian_phone: string | null;
  guardian_email: string | null;
  passport_url: string | null;
  documents: string[];
  class_applied_for: string | null;
  status: "pending" | "approved" | "rejected";
  admission_number: string | null;
  student_id: string | null;
  review_notes: string | null;
  created_at: string;
}

// --- Public (unauthenticated) side ---

export async function getSchoolBySlug(slug: string): Promise<PublicSchool | null> {
  const { data, error } = await supabase.rpc("get_school_by_slug", { p_slug: slug });
  if (error || !data?.length) return null;
  return data[0] as PublicSchool;
}

export async function getPublicClasses(schoolId: string): Promise<PublicClass[]> {
  const { data, error } = await supabase.rpc("get_public_school_classes", { p_school_id: schoolId });
  if (error) return [];
  return data as PublicClass[];
}

// Uploaded before the application row exists — path is keyed by a
// client-generated id rather than an application id we don't have yet.
export async function uploadApplicationFile(schoolId: string, file: File) {
  const path = `${schoolId}/admissions/${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name}`;
  const { error } = await supabase.storage.from("admission-uploads").upload(path, file);
  if (error) return { path: null, error: error.message };
  return { path, error: null };
}

export async function submitApplication(input: {
  schoolId: string; applicantName: string; dateOfBirth: string; gender: string;
  guardianName: string; guardianPhone: string; guardianEmail: string;
  classAppliedFor: string; passportPath: string | null; documentPaths: string[];
}) {
  return supabase.from("admission_applications").insert({
    school_id: input.schoolId, applicant_name: input.applicantName, date_of_birth: input.dateOfBirth || null,
    gender: input.gender || null, guardian_name: input.guardianName, guardian_phone: input.guardianPhone,
    guardian_email: input.guardianEmail, class_applied_for: input.classAppliedFor || null,
    passport_url: input.passportPath, documents: input.documentPaths, status: "pending"
  });
}

// --- Admin (authenticated) side ---

export async function listApplications(status: "pending" | "approved" | "rejected"): Promise<AdmissionApplication[]> {
  const { data, error } = await supabase.from("admission_applications").select("*").eq("status", status).order("created_at", { ascending: false });
  if (error) throw error;
  return data as AdmissionApplication[];
}

export const approveApplication = async (id: string, classId: string, sessionId: string) =>
  supabase.rpc("approve_application", { p_application_id: id, p_class_id: classId, p_session_id: sessionId });

export const rejectApplication = async (id: string, reason: string) =>
  supabase.rpc("reject_application", { p_application_id: id, p_reason: reason || null });

// Admin-only bucket read — RLS on admission-uploads restricts this to
// the applicant's own school's admin/principal roles.
export async function getSignedApplicationFileUrl(path: string) {
  const { data, error } = await supabase.storage.from("admission-uploads").createSignedUrl(path, 60 * 15);
  if (error) throw error;
  return data.signedUrl;
}
