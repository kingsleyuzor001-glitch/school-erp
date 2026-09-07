import { supabase } from "../lib/supabase";

export interface StudentAttendanceClass {
  id: string;
  name: string;
  arm: string | null;
}

export interface StudentAttendanceRow {
  student_id: string;
  full_name: string;
  admission_number: string;
  clock_in: string | null;
  clock_out: string | null;
  status: string;
}

export interface SchoolAttendanceOverviewRow {
  student_id: string;
  full_name: string;
  admission_number: string;
  class_id: string | null;
  class_name: string;
  class_arm: string | null;
  clock_in: string | null;
  clock_out: string | null;
  status: string;
}

export async function listStudentAttendanceClasses(
  schoolId: string
): Promise<StudentAttendanceClass[]> {
  const { data, error } = await supabase
    .from("classes")
    .select("id, name, arm")
    .eq("school_id", schoolId)
    .order("name");

  if (error) throw error;

  return (data ?? []) as StudentAttendanceClass[];
}

export async function listStudentAttendanceForClass(
  schoolId: string,
  classId: string,
  date: string
): Promise<StudentAttendanceRow[]> {
  const { data, error } = await supabase
    .from("students")
    .select(
      `
      id,
      full_name,
      admission_number,
      student_attendance (
        clock_in,
        clock_out,
        status,
        attendance_date
      )
    `
    )
    .eq("school_id", schoolId)
    .eq("class_id", classId)
    .eq("status", "active")
    .order("full_name");

  if (error) throw error;

  return (data ?? []).map((student: any) => {
    const attendance =
      student.student_attendance?.find(
        (record: any) => record.attendance_date === date
      ) ?? null;

    return {
      student_id: student.id,
      full_name: student.full_name,
      admission_number: student.admission_number,
      clock_in: attendance?.clock_in ?? null,
      clock_out: attendance?.clock_out ?? null,
      status: attendance?.status ?? "absent"
    };
  });
}

/**
 * Returns today's attendance for every active student
 * in the school.
 *
 * This is used by the school-wide attendance dashboard.
 */
export async function listSchoolStudentAttendance(
  schoolId: string,
  date: string
): Promise<SchoolAttendanceOverviewRow[]> {
  const { data: students, error: studentsError } = await supabase
    .from("students")
    .select(
      `
      id,
      full_name,
      admission_number,
      class_id
    `
    )
    .eq("school_id", schoolId)
    .eq("status", "active")
    .order("full_name");

  if (studentsError) throw studentsError;

  const { data: classes, error: classesError } = await supabase
    .from("classes")
    .select("id, name, arm")
    .eq("school_id", schoolId);

  if (classesError) throw classesError;

  const { data: attendance, error: attendanceError } = await supabase
    .from("student_attendance")
    .select(
      `
      student_id,
      clock_in,
      clock_out,
      status,
      attendance_date
    `
    )
    .eq("school_id", schoolId)
    .eq("attendance_date", date);

  if (attendanceError) throw attendanceError;

  const classMap = new Map(
    (classes ?? []).map((schoolClass: any) => [
      schoolClass.id,
      schoolClass
    ])
  );

  const attendanceMap = new Map(
    (attendance ?? []).map((record: any) => [
      record.student_id,
      record
    ])
  );

  return (students ?? []).map((student: any) => {
    const schoolClass = classMap.get(student.class_id);
    const record = attendanceMap.get(student.id);

    return {
      student_id: student.id,
      full_name: student.full_name,
      admission_number: student.admission_number,
      class_id: student.class_id ?? null,
      class_name: schoolClass?.name ?? "Unassigned",
      class_arm: schoolClass?.arm ?? null,
      clock_in: record?.clock_in ?? null,
      clock_out: record?.clock_out ?? null,
      status: record?.status ?? "absent"
    };
  });
}

export async function clockStudentIn(studentId: string) {
  const { data, error } = await supabase.rpc("student_clock_in", {
    p_student_id: studentId
  });

  if (error) throw error;

  return data;
}

export async function clockStudentOut(studentId: string) {
  const { data, error } = await supabase.rpc("student_clock_out", {
    p_student_id: studentId
  });

  if (error) throw error;

  return data;
}