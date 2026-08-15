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

export async function listLessonNotes(
  classId?: string,
  subjectId?: string
): Promise<LessonNote[]> {
  let q = supabase
    .from("lesson_notes")
    .select("*")
    .order("week", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (classId) {
    q = q.eq("class_id", classId);
  }

  if (subjectId) {
    q = q.eq("subject_id", subjectId);
  }

  const { data, error } = await q;

  if (error) {
    throw error;
  }

  return data as LessonNote[];
}

export async function uploadLessonNote(input: {
  teacherId: string;
  classId: string;
  subjectId: string;
  week: number;
  title: string;
  file: File;
}) {
  const safeName = input.file.name.replace(
    /[^a-zA-Z0-9._-]/g,
    "_"
  );

  const path =
    `global/lesson-notes/${input.classId}/${input.subjectId}/` +
    `${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from("lesson-notes")
    .upload(path, input.file);

  if (uploadError) {
    return { error: uploadError.message };
  }

  const { error } = await supabase
    .from("lesson_notes")
    .insert({
      school_id: null,
      teacher_id: input.teacherId,
      class_id: input.classId,
      subject_id: input.subjectId,
      session_id: null,
      term_id: null,
      week: input.week,
      title: input.title,
      file_url: path,
      file_type: input.file.type
    });

  if (error) {
    await supabase.storage
      .from("lesson-notes")
      .remove([path]);

    return { error: error.message };
  }

  return { error: null };
}

export interface BatchLessonNote {
  file: File;
  week: number;
  title: string;
}

export async function uploadLessonNotesBatch(input: {
  classId: string;
  subjectId: string;
  notes: BatchLessonNote[];
  onProgress?: (
    completed: number,
    total: number,
    currentFile: string
  ) => void;
}) {
  if (!input.notes.length) {
    return {
      uploaded: 0,
      failed: [],
      error: "No files selected."
    };
  }

  if (input.notes.length > 15) {
    return {
      uploaded: 0,
      failed: [],
      error:
        "You can upload a maximum of 15 lesson-note files at once."
    };
  }

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      uploaded: 0,
      failed: [],
      error: "Unable to identify the current user."
    };
  }

  const failed: Array<{
    file: string;
    error: string;
  }> = [];

  let uploaded = 0;

  for (let i = 0; i < input.notes.length; i++) {
    const note = input.notes[i];

    input.onProgress?.(
      uploaded,
      input.notes.length,
      note.file.name
    );

    const result = await uploadLessonNote({
      teacherId: user.id,
      classId: input.classId,
      subjectId: input.subjectId,
      week: note.week,
      title: note.title,
      file: note.file
    });

    if (result.error) {
      failed.push({
        file: note.file.name,
        error: result.error
      });
    } else {
      uploaded++;
    }

    input.onProgress?.(
      uploaded,
      input.notes.length,
      note.file.name
    );
  }

  return {
    uploaded,
    failed,
    error: null
  };
}

export async function updateLessonNote(input: {
  id: string;
  title: string;
  week: number;
}) {
  const { error } = await supabase
    .from("lesson_notes")
    .update({
      title: input.title,
      week: input.week
    })
    .eq("id", input.id);

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}

export async function deleteLessonNote(id: string) {
  const { data: note, error: findError } = await supabase
    .from("lesson_notes")
    .select("file_url")
    .eq("id", id)
    .single();

  if (findError) {
    return { error: findError.message };
  }

  const { error: deleteError } = await supabase
    .from("lesson_notes")
    .delete()
    .eq("id", id);

  if (deleteError) {
    return { error: deleteError.message };
  }

  if (note?.file_url) {
    const { error: storageError } = await supabase.storage
      .from("lesson-notes")
      .remove([note.file_url]);

    if (storageError) {
      console.warn(
        "Lesson note record deleted, but file cleanup failed:",
        storageError.message
      );
    }
  }

  return { error: null };
}

export async function getSignedNoteUrl(path: string) {
  const { data, error } = await supabase.storage
    .from("lesson-notes")
    .createSignedUrl(path, 60 * 10);

  if (error) {
    throw error;
  }

  return data.signedUrl;
}
