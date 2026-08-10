import { supabase } from "../lib/supabase";
import type { AttendanceStatus } from "./types";

export interface AttendanceRecord {
  id: string;
  student_id: string;
  date: string;
  status: AttendanceStatus;
}

// Classes are now global (Phase 10) — SELECT-level RLS no longer
// narrows this to "my classes," so a dedicated RPC does that
// filtering explicitly instead.
export async function listMyClasses() {
  const { data, error } = await supabase.rpc("get_my_teaching_classes");
  if (error) throw error;
  return data;
}

export async function listStudentsForAttendance(classId: string) {
  const { data, error } = await supabase.from("students").select("id, full_name, admission_number").eq("class_id", classId).order("full_name");
  if (error) throw error;
  return data;
}

export async function getAttendanceForDate(classId: string, date: string) {
  const { data, error } = await supabase.from("attendance_records").select("student_id, status").eq("class_id", classId).eq("date", date);
  if (error) throw error;
  return data;
}

export async function markAttendance(input: {
  classId: string; sessionId: string; termId: string; date: string;
  records: { student_id: string; status: AttendanceStatus }[];
}) {
  return supabase.rpc("mark_attendance", {
    p_class_id: input.classId, p_session_id: input.sessionId, p_term_id: input.termId,
    p_date: input.date, p_records: input.records
  });
}

// For parent/student views — RLS already restricts this to the
// caller's own child or own record, so no student_id filter is
// needed client-side beyond "give me this student's history".
export async function getAttendanceHistory(studentId: string) {
  const { data, error } = await supabase
    .from("attendance_records").select("id, date, status").eq("student_id", studentId).order("date", { ascending: false });
  if (error) throw error;
  return data as AttendanceRecord[];
}
