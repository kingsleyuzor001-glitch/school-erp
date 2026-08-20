import { supabase } from "../lib/supabase";

export interface ClassSubjectCatalogItem {
  subject_id: string;
  subject_name: string;
  assigned: boolean;
}

/**
 * Get every school subject and whether it belongs
 * to the selected class.
 */
export async function getClassSubjectCatalog(
  classId: string
): Promise<ClassSubjectCatalogItem[]> {
  const { data, error } = await supabase.rpc(
    "get_class_subject_catalog",
    {
      p_class_id: classId
    }
  );

  if (error) throw error;

  return (data || []) as ClassSubjectCatalogItem[];
}

/**
 * Add a subject to a class.
 */
export async function addSubjectToClass(
  classId: string,
  subjectId: string
) {
  const { error } = await supabase.rpc(
    "add_subject_to_class",
    {
      p_class_id: classId,
      p_subject_id: subjectId
    }
  );

  if (error) throw error;
}

/**
 * Remove a subject from a class.
 */
export async function removeSubjectFromClass(
  classId: string,
  subjectId: string
) {
  const { error } = await supabase.rpc(
    "remove_subject_from_class",
    {
      p_class_id: classId,
      p_subject_id: subjectId
    }
  );

  if (error) throw error;
}