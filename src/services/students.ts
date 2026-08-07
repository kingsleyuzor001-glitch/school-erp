import { supabase } from "../lib/supabase";

export interface Student {
  id: string;
  admission_number: string;
  full_name: string;
  date_of_birth: string | null;
  gender: string | null;
  class_id: string | null;
  session_id: string | null;
  status: string;
  passport_url: string | null;
}

export async function listStudents(classId?: string, search?: string): Promise<Student[]> {
  let q = supabase.from("students").select("*").order("full_name");
  if (classId) q = q.eq("class_id", classId);
  if (search) q = q.or(`full_name.ilike.%${search}%,admission_number.ilike.%${search}%`);
  const { data, error } = await q;
  if (error) throw error;
  return data as Student[];
}

export async function createStudent(input: {
  fullName: string; dateOfBirth: string; gender: string;
  classId: string; sessionId: string; address?: string;
}) {
  return supabase.rpc("create_student", {
    p_full_name: input.fullName,
    p_date_of_birth: input.dateOfBirth || null,
    p_gender: input.gender || null,
    p_class_id: input.classId || null,
    p_session_id: input.sessionId || null,
    p_address: input.address || null
  });
}

export async function getStudentById(id: string): Promise<Student | null> {
  const { data, error } = await supabase.from("students").select("*").eq("id", id).single();
  if (error) return null;
  return data as Student;
}

export async function moveStudent(studentId: string, toClassId: string, eventType: "promotion" | "transfer", notes?: string) {
  return supabase.rpc("move_student", {
    p_student_id: studentId, p_to_class_id: toClassId, p_event_type: eventType, p_notes: notes || null
  });
}

// `passports` is a private bucket (Phase 4) — students' photos aren't
// public the way branding assets are, so ID card rendering needs a
// signed URL fetched on demand rather than a stable public link.
export async function uploadStudentPassport(schoolId: string, studentId: string, file: File) {
  const path = `${schoolId}/students/${studentId}-${Date.now()}-${file.name}`;
  const { error: uploadError } = await supabase.storage.from("passports").upload(path, file, { upsert: true });
  if (uploadError) return { error: uploadError.message };
  const { error } = await supabase.from("students").update({ passport_url: path }).eq("id", studentId);
  if (error) return { error: error.message };
  return { error: null };
}

export async function getSignedPassportUrl(path: string) {
  const { data, error } = await supabase.storage.from("passports").createSignedUrl(path, 60 * 15);
  if (error) throw error;
  return data.signedUrl;
}
