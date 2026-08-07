import { supabase } from "../lib/supabase";

export interface ActivityItem {
  id: string;
  title: string | null;
  media_type: "photo" | "video";
  media_url: string; // storage path, not a public URL — see getSignedActivityUrl
  created_at: string;
}

export async function listActivities() {
  const { data, error } = await supabase.from("school_activities").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data as ActivityItem[];
}

export async function uploadActivity(input: {
  schoolId: string; uploadedBy: string; title: string; file: File; mediaType: "photo" | "video";
}) {
  const path = `${input.schoolId}/activities/${Date.now()}-${input.file.name}`;
  const { error: uploadError } = await supabase.storage.from("school-activities").upload(path, input.file);
  if (uploadError) return { error: uploadError.message };

  const { error } = await supabase.from("school_activities").insert({
    school_id: input.schoolId, uploaded_by: input.uploadedBy, title: input.title,
    media_type: input.mediaType, media_url: path
  });
  if (error) return { error: error.message };
  return { error: null };
}

// Videos stream more smoothly from a signed URL fetched on demand
// than from re-signing on every render, so callers should cache this
// per item for the ~1hr expiry rather than re-fetching per frame.
export async function getSignedActivityUrl(path: string) {
  const { data, error } = await supabase.storage.from("school-activities").createSignedUrl(path, 60 * 60);
  if (error) throw error;
  return data.signedUrl;
}
