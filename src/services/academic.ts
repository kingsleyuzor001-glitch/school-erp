import { supabase } from "../lib/supabase";

export interface Session { id: string; name: string; is_current: boolean; is_archived: boolean; }
export interface Term { id: string; session_id: string; name: string; is_current: boolean; }
export interface SchoolClass { id: string; name: string; arm: string | null; class_teacher_id: string | null; }
export interface Subject { id: string; name: string; code: string | null; }

// All four are plain tenant tables — RLS from 0001 already restricts
// reads/writes to the caller's school_id, so these are direct queries,
// no RPC needed. `school_id` on insert comes from the caller's profile.

export async function listSessions(): Promise<Session[]> {
  const { data, error } = await supabase.from("sessions").select("*").order("name", { ascending: false });
  if (error) throw error;
  return data as Session[];
}
export async function createSession(schoolId: string, name: string) {
  return supabase.from("sessions").insert({ school_id: schoolId, name });
}
export async function setCurrentSession(schoolId: string, sessionId: string) {
  await supabase.from("sessions").update({ is_current: false }).eq("school_id", schoolId);
  return supabase.from("sessions").update({ is_current: true }).eq("id", sessionId);
}

export async function listTerms(sessionId?: string): Promise<Term[]> {
  let q = supabase.from("terms").select("*").order("name");
  if (sessionId) q = q.eq("session_id", sessionId);
  const { data, error } = await q;
  if (error) throw error;
  return data as Term[];
}
export async function createTerm(schoolId: string, sessionId: string, name: string) {
  return supabase.from("terms").insert({ school_id: schoolId, session_id: sessionId, name });
}

export async function listClasses(): Promise<SchoolClass[]> {
  const { data, error } = await supabase.from("classes").select("*").order("name");
  if (error) throw error;
  return data as SchoolClass[];
}
export async function createClass(name: string, arm: string) {
  return supabase.from("classes").insert({ school_id: null, name, arm: arm || null });
}

export async function listSubjects(): Promise<Subject[]> {
  const { data, error } = await supabase.from("subjects").select("*").order("name");
  if (error) throw error;
  return data as Subject[];
}
export async function createSubject(name: string, code: string) {
  return supabase.from("subjects").insert({ school_id: null, name, code: code || null });
}
