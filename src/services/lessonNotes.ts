import { supabase } from "../lib/supabase";

export interface LessonNote {
  id: string;
  title: string;
  week: number | null;
  file_url: string | null;
  file_type: string | null;
  class_id: string;
  subject_id: string;
  created_at: string;
}

export async function listLessonNotes(classId?: string) {
  let q = supabase.from("lesson_notes").select("*").order("created_at", { ascending: false });
  if (classId) q = q.eq("class_id", classId);
  const { data, error } = await q;
  if (error) throw error;
  return data as LessonNote[];
}

export async function uploadLessonNote(input: {
  schoolId: string; teacherId: string; classId: string; subjectId: string;
  sessionId: string; termId: string; week: number; title: string; file: File;
}) {
  // Path starts with school_id so the storage RLS from 0004 applies.
  const path = `${input.schoolId}/lesson-notes/${input.classId}/${Date.now()}-${input.file.name}`;
  const { error: uploadError } = await supabase.storage.from("lesson-notes").upload(path, input.file);
  if (uploadError) return { error: uploadError.message };

  const { error } = await supabase.from("lesson_notes").insert({
    school_id: input.schoolId, teacher_id: input.teacherId, class_id: input.classId,
    subject_id: input.subjectId, session_id: input.sessionId, term_id: input.termId,
    week: input.week, title: input.title, file_url: path, file_type: input.file.type
  });
  if (error) return { error: error.message };
  return { error: null };
}

// Bucket is private, so viewers need a signed URL rather than a public link.
export async function getSignedNoteUrl(path: string) {
  const { data, error } = await supabase.storage.from("lesson-notes").createSignedUrl(path, 60 * 10);
  if (error) throw error;
  return data.signedUrl;
}
