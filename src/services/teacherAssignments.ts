import { supabase } from "../lib/supabase";

export interface Teacher {
  id: string;
  full_name: string;
  email: string;
  role: string;
}

export interface ClassRoom {
  id: string;
  name: string;
  arm: string | null;
  class_teacher_id: string | null;
}

export interface Subject {
  id: string;
  name: string;
}

export async function getTeachers(): Promise<Teacher[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, role")
    .eq("role", "teacher")
    .order("full_name");

  if (error) throw error;

  return data as Teacher[];
}


export async function getClasses(): Promise<ClassRoom[]> {
  const { data, error } = await supabase
    .from("classes")
    .select("id, name, arm, class_teacher_id")
    .order("name");

  if (error) throw error;

  return data as ClassRoom[];
}


export async function getSubjects(): Promise<Subject[]> {
  const { data, error } = await supabase
    .from("subjects")
    .select("id, name")
    .order("name");

  if (error) throw error;

  return data as Subject[];
}


export async function assignClassTeacher(
  classId: string,
  teacherId: string
) {
  const { data, error } = await supabase.rpc(
    "assign_class_teacher",
    {
      p_class_id: classId,
      p_teacher_id: teacherId
    }
  );

  if (error) throw error;

  return data;
}


export async function assignSubjectTeacher(
  classId: string,
  subjectId: string,
  teacherId: string
) {
  const { data, error } = await supabase.rpc(
    "assign_subject_teacher",
    {
      p_class_id: classId,
      p_subject_id: subjectId,
      p_teacher_id: teacherId
    }
  );

  if (error) throw error;

  return data;
}


export async function getAssignments() {
  const { data, error } = await supabase
    .from("class_subject_teachers")
    .select(`
      id,
      classes(name),
      subjects(name),
      profiles:teacher_id(full_name,email)
    `);

  if (error) throw error;

  return data;
}