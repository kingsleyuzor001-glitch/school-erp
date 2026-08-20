import { supabase } from "../lib/supabase";

export interface ResultScore {
  id: string;
  student_id: string;
  assignment_score: number;
  classwork_score: number;
  ca_score: number;
  exam_score: number;
  total_score: number;
  grade: string | null;
  status: "draft" | "submitted" | "approved" | "published";
  teacher_comment: string | null;
}

export interface ReportCard {
  subjects: {
    subject: string;
    assignment: number;
    classwork: number;
    ca: number;
    exam: number;
    total: number;
    grade: string;
    teacher_comment: string | null;
    status: string;
  }[];
  position: number | null;
  class_size: number | null;
  comments: {
    principal_comment?: string;
    class_teacher_comment?: string;
  };
}


/* ============================================================
   RESULT ENTRY CLASSES

   Only class teachers can prepare results for their own classes.
   ============================================================ */

export async function listMyResultClasses() {
  const { data, error } = await supabase.rpc(
    "get_my_result_classes"
  );

  if (error) throw error;

  return data || [];
}


/* ============================================================
   RESULT ENTRY SUBJECTS

   Returns only subjects assigned to the selected class.
   ============================================================ */

export async function listMyResultSubjects(
  classId: string
) {
  const { data, error } = await supabase.rpc(
    "get_my_result_subjects",
    {
      p_class_id: classId
    }
  );

  if (error) throw error;

  return data || [];
}


/* ============================================================
   RESULT SCORES
   ============================================================ */

export async function listResultsForEntry(
  classId: string,
  subjectId: string,
  termId: string
) {
  const { data, error } = await supabase
    .from("result_scores")
    .select(
      "id, student_id, assignment_score, classwork_score, ca_score, exam_score, total_score, grade, status, teacher_comment"
    )
    .eq("class_id", classId)
    .eq("subject_id", subjectId)
    .eq("term_id", termId);

  if (error) throw error;

  return data as ResultScore[];
}


/* ============================================================
   SAVE RESULT SCORE
   ============================================================ */

export async function saveScore(input: {
  schoolId: string;
  studentId: string;
  subjectId: string;
  classId: string;
  sessionId: string;
  termId: string;
  assignment: number;
  classwork: number;
  ca: number;
  exam: number;
  teacherComment: string;
  enteredBy: string;
}) {
  return supabase
    .from("result_scores")
    .upsert(
      {
        school_id: input.schoolId,
        student_id: input.studentId,
        subject_id: input.subjectId,
        class_id: input.classId,
        session_id: input.sessionId,
        term_id: input.termId,
        assignment_score: input.assignment,
        classwork_score: input.classwork,
        ca_score: input.ca,
        exam_score: input.exam,
        teacher_comment: input.teacherComment,
        entered_by: input.enteredBy,
        status: "draft"
      },
      {
        onConflict: "student_id,subject_id,term_id"
      }
    );
}


/* ============================================================
   RESULT WORKFLOW
   ============================================================ */

export const submitResults = async (
  classId: string,
  subjectId: string,
  termId: string
) =>
  supabase.rpc("submit_results", {
    p_class_id: classId,
    p_subject_id: subjectId,
    p_term_id: termId
  });


export const approveResults = async (
  classId: string,
  subjectId: string,
  termId: string
) =>
  supabase.rpc("approve_results", {
    p_class_id: classId,
    p_subject_id: subjectId,
    p_term_id: termId
  });


export const publishResults = async (
  classId: string,
  termId: string
) =>
  supabase.rpc("publish_results", {
    p_class_id: classId,
    p_term_id: termId
  });


/* ============================================================
   REPORT CARD
   ============================================================ */

export async function getReportCard(
  studentId: string,
  termId: string
): Promise<ReportCard> {
  const { data, error } = await supabase.rpc(
    "get_report_card",
    {
      p_student_id: studentId,
      p_term_id: termId
    }
  );

  if (error) throw error;

  return data as ReportCard;
}


/* ============================================================
   PENDING RESULT BATCHES

   Used by principal/admin approval queues.
   ============================================================ */

export async function listPendingBatches(
  status: "submitted" | "approved",
  termId: string
) {
  const { data, error } = await supabase
    .from("result_scores")
    .select(
      "class_id, subject_id, classes(name, arm), subjects(name)"
    )
    .eq("status", status)
    .eq("term_id", termId);

  if (error) throw error;

  const seen = new Map<string, any>();

  for (const row of data as any[]) {
    const key = `${row.class_id}:${row.subject_id}`;

    if (!seen.has(key)) {
      seen.set(key, row);
    }
  }

  return Array.from(seen.values());
}