import { supabase } from "../lib/supabase";


// ===============================
// TYPES
// ===============================

export interface Session {
  id: string;
  school_id?: string;
  name: string;
  is_current?: boolean;
  is_archived?: boolean;
  created_at?: string;
  start_year: number;
  end_year: number;
}

export interface Term {
  id: string;
  school_id?: string;
  session_id: string;
  name: string;
  is_current?: boolean;
  start_date?: string;
  end_date?: string;
}

export interface SchoolClass {
  id: string;
  name: string;
  arm?: string;
  level?: string;
}

export interface Subject {
  id: string;
  name: string;
  code?: string;
}


// ===============================
// SESSIONS
// ===============================

export async function listSessions(): Promise<Session[]> {
  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .order("start_year", { ascending: true });

  if (error) {
    console.error("listSessions error:", error);
    return [];
  }

  return data || [];
}


export async function createSession(input: {
  name: string;
  start_year: number;
  end_year: number;
}) {
  const { data, error } = await supabase
    .from("sessions")
    .insert({
      name: input.name,
      start_year: input.start_year,
      end_year: input.end_year,
      is_current: false,
      is_archived: false
    })
    .select()
    .single();

  if (error) {
    console.error("createSession error:", error);
    return null;
  }

  return data;
}


export async function updateSession(
  id: string,
  input: {
    name: string;
    start_year: number;
    end_year: number;
  }
) {
  const { data, error } = await supabase
    .from("sessions")
    .update({
      name: input.name,
      start_year: input.start_year,
      end_year: input.end_year
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("updateSession error:", error);
    return null;
  }

  return data;
}


export async function deleteSession(id: string): Promise<{
  success: boolean;
  message?: string;
}> {
  const { error } = await supabase
    .from("sessions")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("deleteSession error:", error);

    if (error.code === "23503") {
      return {
        success: false,
        message:
          "This academic session cannot be deleted because students, terms, or other records are still linked to it. Remove or reassign those records first."
      };
    }

    return {
      success: false,
      message: error.message || "Unable to delete the academic session."
    };
  }

  return {
    success: true
  };
}


// ===============================
// TERMS
// ===============================

export async function listTerms(): Promise<Term[]> {
  const { data, error } = await supabase
    .from("terms")
    .select("*")
    .order("start_date", { ascending: true });

  if (error) {
    console.error("listTerms error:", error);
    return [];
  }

  return data || [];
}


export async function createTerm(input: {
  session_id: string;
  name: string;
  start_date?: string;
  end_date?: string;
}) {
  const { data, error } = await supabase
    .from("terms")
    .insert({
      session_id: input.session_id,
      name: input.name,
      start_date: input.start_date || null,
      end_date: input.end_date || null,
      is_current: false
    })
    .select()
    .single();

  if (error) {
    console.error("createTerm error:", error);
    return null;
  }

  return data;
}


export async function updateTerm(
  id: string,
  input: {
    name: string;
    start_date?: string;
    end_date?: string;
  }
) {
  const { data, error } = await supabase
    .from("terms")
    .update({
      name: input.name,
      start_date: input.start_date || null,
      end_date: input.end_date || null
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("updateTerm error:", error);
    return null;
  }

  return data;
}


export async function deleteTerm(id: string) {
  const { error } = await supabase
    .from("terms")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("deleteTerm error:", error);
    return false;
  }

  return true;
}


// ===============================
// CLASSES
// ===============================

export async function listClasses(): Promise<SchoolClass[]> {
  const { data, error } = await supabase
    .from("classes")
    .select("*");

  if (error) {
    console.error("listClasses error:", error);
    return [];
  }

  return data || [];
}


export async function createClass(input: {
  name: string;
  arm?: string;
  level?: string;
}) {
  const { data, error } = await supabase
    .from("classes")
    .insert({
      name: input.name,
      arm: input.arm,
      level: input.level
    })
    .select()
    .single();

  if (error) {
    console.error("createClass error:", error);
    return null;
  }

  return data;
}


export async function updateClass(
  id: string,
  input: {
    name: string;
    arm?: string;
    level?: string;
  }
) {
  const { data, error } = await supabase
    .from("classes")
    .update({
      name: input.name,
      arm: input.arm,
      level: input.level
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("updateClass error:", error);
    return null;
  }

  return data;
}


export async function deleteClass(id: string) {
  const { error } = await supabase
    .from("classes")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("deleteClass error:", error);
    return false;
  }

  return true;
}


// ===============================
// SUBJECTS
// ===============================

export async function listSubjects(): Promise<Subject[]> {
  const { data, error } = await supabase
    .from("subjects")
    .select("*");

  if (error) {
    console.error("listSubjects error:", error);
    return [];
  }

  return data || [];
}


export async function createSubject(input: {
  name: string;
  code?: string;
}) {
  const { data, error } = await supabase
    .from("subjects")
    .insert({
      name: input.name,
      code: input.code
    })
    .select()
    .single();

  if (error) {
    console.error("createSubject error:", error);
    return null;
  }

  return data;
}


export async function updateSubject(
  id: string,
  input: {
    name: string;
    code?: string;
  }
) {
  const { data, error } = await supabase
    .from("subjects")
    .update({
      name: input.name,
      code: input.code
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("updateSubject error:", error);
    return null;
  }

  return data;
}


export async function deleteSubject(id: string) {
  const { error } = await supabase
    .from("subjects")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("deleteSubject error:", error);
    return false;
  }

  return true;
}


// ===============================
// TEACHER HELPERS
// ===============================

export async function listMyClasses() {
  return listClasses();
}

