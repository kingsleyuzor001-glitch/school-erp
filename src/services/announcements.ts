import { supabase } from "../lib/supabase";

export interface Announcement {
  id: string;
  title: string;
  message: string;
  target_audience: string;
  is_pinned: boolean;
  created_at: string;
}

export async function listAnnouncements() {
  const { data, error } = await supabase
    .from("announcements").select("*").order("is_pinned", { ascending: false }).order("created_at", { ascending: false });
  if (error) throw error;
  return data as Announcement[];
}

export async function createAnnouncement(input: {
  schoolId: string; createdBy: string; title: string; message: string;
  targetAudience: string; isPinned: boolean;
}) {
  return supabase.from("announcements").insert({
    school_id: input.schoolId, created_by: input.createdBy, title: input.title,
    message: input.message, target_audience: input.targetAudience, is_pinned: input.isPinned
  });
}
