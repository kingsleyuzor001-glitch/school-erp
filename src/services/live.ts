import { supabase } from "../lib/supabase";

export type LiveStream = {
  id: string;
  school_id: string;
  title: string;
  youtube_video_id: string;
  status: "scheduled" | "live" | "ended";
  scheduled_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
};

export type PublicLiveStream = {
  id: string;
  title: string;
  youtube_video_id: string;
  status: "live" | "scheduled";
  scheduled_at: string | null;
  started_at: string | null;
};

export async function listLiveStreams(): Promise<LiveStream[]> {
  const { data, error } = await supabase
    .from("live_streams")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function goLiveNow(input: { schoolId: string; createdBy: string; title: string; youtubeVideoId: string }) {
  const { error } = await supabase.from("live_streams").insert({
    school_id: input.schoolId,
    created_by: input.createdBy,
    title: input.title,
    youtube_video_id: input.youtubeVideoId,
    status: "live",
    started_at: new Date().toISOString()
  });
  return { error: error?.message ?? null };
}

export async function scheduleLiveStream(input: { schoolId: string; createdBy: string; title: string; youtubeVideoId: string; scheduledAt: string }) {
  const { error } = await supabase.from("live_streams").insert({
    school_id: input.schoolId,
    created_by: input.createdBy,
    title: input.title,
    youtube_video_id: input.youtubeVideoId,
    status: "scheduled",
    scheduled_at: input.scheduledAt
  });
  return { error: error?.message ?? null };
}

export async function endLiveStream(id: string) {
  const { error } = await supabase
    .from("live_streams")
    .update({ status: "ended", ended_at: new Date().toISOString() })
    .eq("id", id);
  return { error: error?.message ?? null };
}

export async function deleteLiveStream(id: string) {
  const { error } = await supabase.from("live_streams").delete().eq("id", id);
  return { error: error?.message ?? null };
}

export async function getPublicLiveStream(schoolSlug: string): Promise<PublicLiveStream | null> {
  const { data, error } = await supabase.rpc("get_school_live_stream", { p_school_slug: schoolSlug });
  if (error) return null;
  const row = Array.isArray(data) ? data[0] : data;
  return row ?? null;
}