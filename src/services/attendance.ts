import { supabase } from "../lib/supabase";
import type { AttendanceStatus } from "./types";

export interface AttendanceRecord {
  id: string;
  student_id: string;
  date: string;
  status: AttendanceStatus;
}

// Classes the current teacher actually teaches — relies on
// classes_select RLS (Phase 4), which already scopes this correctly;
// no separate "my classes" flag needed, the query just reflects
// whatever the teacher is allowed to see.
export async function listMyClasses() {
  const { data, error } = await supabase.from("classes").select("*").order("name");
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
