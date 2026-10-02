import { supabase } from "../lib/supabase";

export type Thread = {
  thread_id: string;
  student_id: string;
  student_name: string;
  other_profile_id: string;
  other_name: string;
  other_role: string;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
};

export type Message = {
  id: string;
  thread_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
};

export type ChildForMessaging = {
  student_id: string;
  full_name: string;
  class_teacher_id: string | null;
  class_teacher_name: string | null;
};

export type StudentGuardian = { guardian_profile_id: string; guardian_name: string; relationship: string };

export type AvailableSlot = { id: string; staff_id: string; staff_name: string; starts_at: string; ends_at: string };
export type MyMeeting = { booking_id: string; slot_id: string; starts_at: string; ends_at: string; status: string; student_name: string; other_name: string };
export type MySlot = { id: string; starts_at: string; ends_at: string; status: string };

export async function listMyThreads(): Promise<Thread[]> {
  const { data, error } = await supabase.rpc("list_my_threads");
  if (error) throw error;
  return data ?? [];
}

export async function startOrGetThread(studentId: string, otherProfileId: string): Promise<string> {
  const { data, error } = await supabase.rpc("start_or_get_thread", { p_student_id: studentId, p_other_profile_id: otherProfileId });
  if (error) throw error;
  return data as string;
}

export async function listThreadMessages(threadId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function sendMessage(threadId: string, senderId: string, body: string) {
  const { error } = await supabase.from("messages").insert({ thread_id: threadId, sender_id: senderId, body });
  return { error: error?.message ?? null };
}

export async function markThreadRead(threadId: string) {
  await supabase.rpc("mark_thread_read", { p_thread_id: threadId });
}

export async function getMyChildrenWithClassTeacher(): Promise<ChildForMessaging[]> {
  const { data, error } = await supabase.rpc("get_my_children_with_class_teacher");
  if (error) throw error;
  return data ?? [];
}

export async function getStudentGuardiansForMessaging(studentId: string): Promise<StudentGuardian[]> {
  const { data, error } = await supabase.rpc("get_student_guardians_for_messaging", { p_student_id: studentId });
  if (error) throw error;
  return data ?? [];
}

export async function publishMeetingSlot(startsAt: string, endsAt: string) {
  const { data, error } = await supabase.rpc("publish_meeting_slot", { p_starts_at: startsAt, p_ends_at: endsAt });
  return { data: data as string | null, error: error?.message ?? null };
}

export async function listAvailableSlots(staffId?: string): Promise<AvailableSlot[]> {
  const { data, error } = await supabase.rpc("list_available_slots", { p_staff_id: staffId ?? null });
  if (error) throw error;
  return data ?? [];
}

export async function bookMeetingSlot(slotId: string, studentId: string) {
  const { data, error } = await supabase.rpc("book_meeting_slot", { p_slot_id: slotId, p_student_id: studentId });
  return { data: data as string | null, error: error?.message ?? null };
}

export async function cancelMeetingBooking(bookingId: string) {
  const { error } = await supabase.rpc("cancel_meeting_booking", { p_booking_id: bookingId });
  return { error: error?.message ?? null };
}

export async function cancelMeetingSlot(slotId: string) {
  const { error } = await supabase.rpc("cancel_meeting_slot", { p_slot_id: slotId });
  return { error: error?.message ?? null };
}

export async function listMyMeetings(): Promise<MyMeeting[]> {
  const { data, error } = await supabase.rpc("list_my_meetings");
  if (error) throw error;
  return data ?? [];
}

export async function listMyPublishedSlots(): Promise<MySlot[]> {
  const { data, error } = await supabase.rpc("list_my_published_slots");
  if (error) throw error;
  return data ?? [];
}