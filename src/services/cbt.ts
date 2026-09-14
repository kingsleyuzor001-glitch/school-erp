import { supabase } from "../lib/supabase";

export interface CbtExam {
  id: string;
  title: string;
  subject_id: string | null;
  class_id: string | null;
  term_id: string | null;
  duration_minutes: number;
  pass_mark: number | null;
  status: "draft" | "published" | "closed";
  starts_at: string | null;
  ends_at: string | null;
}

export interface CbtQuestion {
  id: string;
  question_text: string;
  marks: number;
  order_index: number;
}

export interface CbtOption {
  id: string;
  question_id: string;
  option_text: string;
  is_correct: boolean;
  order_index: number;
}

export async function listExams(): Promise<CbtExam[]> {
  const { data, error } = await supabase.from("cbt_exams").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data as CbtExam[];
}

export async function createExam(input: {
  schoolId: string; title: string; subjectId: string; classId: string; termId: string;
  durationMinutes: number; createdBy: string;
}) {
  return supabase.from("cbt_exams").insert({
    school_id: input.schoolId, title: input.title, subject_id: input.subjectId,
    class_id: input.classId, term_id: input.termId, duration_minutes: input.durationMinutes,
    created_by: input.createdBy, status: "draft"
  }).select("id").single();
}

export async function publishExam(examId: string) {
  return supabase.from("cbt_exams").update({ status: "published" }).eq("id", examId);
}

export async function closeExam(examId: string) {
  return supabase.from("cbt_exams").update({ status: "closed" }).eq("id", examId);
}

export async function listQuestions(examId: string): Promise<CbtQuestion[]> {
  const { data, error } = await supabase.from("cbt_questions").select("*").eq("exam_id", examId).order("order_index");
  if (error) throw error;
  return data as CbtQuestion[];
}

export async function addQuestion(examId: string, text: string, marks: number, orderIndex: number) {
  return supabase.from("cbt_questions").insert({
    exam_id: examId, question_text: text, marks, order_index: orderIndex
  }).select("id").single();
}

export async function listOptions(questionId: string): Promise<CbtOption[]> {
  const { data, error } = await supabase.from("cbt_options").select("*").eq("question_id", questionId).order("order_index");
  if (error) throw error;
  return data as CbtOption[];
}

export async function addOption(questionId: string, text: string, isCorrect: boolean, orderIndex: number) {
  return supabase.from("cbt_options").insert({
    question_id: questionId, option_text: text, is_correct: isCorrect, order_index: orderIndex
  });
}

export async function setStudentPin(studentId: string, pin: string) {
  return supabase.rpc("set_student_cbt_pin", { p_student_id: studentId, p_pin: pin });
}

export async function listExamSessions(examId: string) {
  const { data, error } = await supabase
    .from("cbt_sessions")
    .select("id, student_id, score, max_score, submitted_at, students(full_name, admission_number)")
    .eq("exam_id", examId)
    .order("submitted_at", { ascending: false });
  if (error) throw error;
  return data as any[];
}

export async function cbtLogin(schoolSlug: string, admissionNumber: string, pin: string) {
  const { data, error } = await supabase.rpc("cbt_login", {
    p_school_slug: schoolSlug, p_admission_number: admissionNumber, p_pin: pin
  });
  if (error) return { token: null, error: error.message };
  return { token: data as string, error: null };
}

export async function cbtListAvailableExams(token: string) {
  const { data, error } = await supabase.rpc("cbt_list_available_exams", { p_token: token });
  if (error) throw error;
  return data as { id: string; title: string; subject_name: string | null; duration_minutes: number; already_attempted: boolean }[];
}

export async function cbtStartExam(token: string, examId: string) {
  const { data, error } = await supabase.rpc("cbt_start_exam", { p_token: token, p_exam_id: examId });
  if (error) return { session: null, error: error.message };
  const row = Array.isArray(data) ? data[0] : data;
  return { session: row as { session_id: string; expires_at: string }, error: null };
}

export async function cbtGetExamQuestions(token: string, sessionId: string) {
  const { data, error } = await supabase.rpc("cbt_get_exam_questions", { p_token: token, p_session_id: sessionId });
  if (error) throw error;
  return data as { question_id: string; question_text: string; marks: number; option_id: string; option_text: string }[];
}

export async function cbtSubmitAnswer(token: string, sessionId: string, questionId: string, optionId: string) {
  return supabase.rpc("cbt_submit_answer", {
    p_token: token, p_session_id: sessionId, p_question_id: questionId, p_option_id: optionId
  });
}

export async function cbtSubmitExam(token: string, sessionId: string) {
  const { data, error } = await supabase.rpc("cbt_submit_exam", { p_token: token, p_session_id: sessionId });
  if (error) return { result: null, error: error.message };
  const row = Array.isArray(data) ? data[0] : data;
  return { result: row as { score: number; max_score: number }, error: null };
}

export async function cbtMyResults(token: string) {
  const { data, error } = await supabase.rpc("cbt_my_results", { p_token: token });
  if (error) throw error;
  return data as { exam_title: string; score: number; max_score: number; submitted_at: string }[];
}