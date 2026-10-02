import { supabase } from "../lib/supabase";

export type Incident = {
  id: string;
  student_id: string;
  student_name: string;
  class_name: string;
  category: "bullying" | "accident" | "health" | "discipline" | "complaint" | "other";
  severity: "low" | "medium" | "high";
  description: string;
  action_taken: string | null;
  status: "open" | "under_review" | "resolved";
  follow_up_date: string | null;
  visible_to_parent: boolean;
  reported_by_name: string | null;
  created_at: string;
  updated_at: string;
};

export type HomeroomStudent = { id: string; full_name: string; admission_number: string };

export async function listIncidents(): Promise<Incident[]> {
  const { data, error } = await supabase.rpc("list_incidents");
  if (error) throw error;
  return data ?? [];
}

export async function listStudentIncidents(studentId: string) {
  const { data, error } = await supabase.rpc("list_student_incidents", { p_student_id: studentId });
  if (error) throw error;
  return data ?? [];
}

export async function getMyHomeroomStudents(): Promise<HomeroomStudent[]> {
  const { data, error } = await supabase.rpc("get_my_homeroom_students");
  if (error) throw error;
  return data ?? [];
}

export async function createIncident(input: {
  schoolId: string;
  studentId: string;
  reportedBy: string;
  category: Incident["category"];
  severity: Incident["severity"];
  description: string;
}) {
  const { error } = await supabase.from("incidents").insert({
    school_id: input.schoolId,
    student_id: input.studentId,
    reported_by: input.reportedBy,
    category: input.category,
    severity: input.severity,
    description: input.description
  });
  return { error: error?.message ?? null };
}

export async function updateIncident(id: string, patch: {
  actionTaken?: string;
  status?: Incident["status"];
  followUpDate?: string | null;
  visibleToParent?: boolean;
}) {
  const payload: Record<string, unknown> = {};
  if (patch.actionTaken !== undefined) payload.action_taken = patch.actionTaken;
  if (patch.status !== undefined) payload.status = patch.status;
  if (patch.followUpDate !== undefined) payload.follow_up_date = patch.followUpDate;
  if (patch.visibleToParent !== undefined) payload.visible_to_parent = patch.visibleToParent;

  const { error } = await supabase.from("incidents").update(payload).eq("id", id);
  return { error: error?.message ?? null };
}

export async function deleteIncident(id: string) {
  const { error } = await supabase.from("incidents").delete().eq("id", id);
  return { error: error?.message ?? null };
}