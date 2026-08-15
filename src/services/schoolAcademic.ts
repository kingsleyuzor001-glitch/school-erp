import { supabase } from "../lib/supabase";

export async function getSchoolAcademicSelection(
  schoolId: string
) {
  const { data, error } = await supabase
    .from("schools")
    .select(`
      current_session_id,
      current_term_id
    `)
    .eq("id", schoolId)
    .single();

  if (error) {
    throw error;
  }

  return data;
}
