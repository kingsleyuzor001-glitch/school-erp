import { supabase } from "../lib/supabase";

export type SchoolPulse = {
  students_total: number;
  students_present_today: number;
  students_absent_today: number;
  attendance_rate_today: number;
  classes_not_marked_today: number;
  staff_total: number;
  staff_present_today: number;
  staff_absent_today: number;
  fee_expected: number;
  fee_collected: number;
  fee_outstanding: number;
  academic_average: number;
  at_risk_count: number;
  teachers_unsubmitted_results: number;
};

export type AtRiskStudent = {
  student_id: string;
  full_name: string;
  class_name: string;
  attendance_rate: number;
  current_average: number;
  previous_average: number | null;
  trend: "declining" | "improving" | "stable";
  risk_level: "HIGH" | "MEDIUM";
};

export async function getSchoolPulse(termId: string): Promise<SchoolPulse | null> {
  const { data, error } = await supabase.rpc("get_school_pulse", { p_term_id: termId });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return row ?? null;
}

export async function getAtRiskStudents(termId: string): Promise<AtRiskStudent[]> {
  const { data, error } = await supabase.rpc("get_at_risk_students", { p_term_id: termId });
  if (error) throw error;
  return data ?? [];
}