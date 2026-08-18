import { supabase } from "../lib/supabase";

export interface StaffAttendance {
  id: string;
  school_id: string;
  staff_id: string;
  clock_in: string | null;
  clock_out: string | null;
  date: string;
}

export interface TodayStaffAttendance extends StaffAttendance {
  staff_name: string;
  staff_email: string;
  position: string | null;
  department: string | null;
}

/**
 * Get the staff record belonging to the currently logged-in user.
 *
 * auth.users.id -> profiles.id -> staff.profile_id
 */
async function getCurrentStaff() {
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Unable to identify the current user.");
  }

  const { data: staff, error: staffError } = await supabase
    .from("staff")
    .select("id, school_id, profile_id")
    .eq("profile_id", user.id)
    .single();

  if (staffError || !staff) {
    throw new Error(
      "No staff record was found for the currently logged-in user."
    );
  }

  return staff;
}

/**
 * Clock the current staff member in for today.
 */
export async function clockInStaff() {
  const staff = await getCurrentStaff();

  const today = new Date().toISOString().slice(0, 10);

  const { data: existing, error: existingError } = await supabase
    .from("staff_attendance")
    .select("*")
    .eq("staff_id", staff.id)
    .eq("date", today)
    .maybeSingle();

  if (existingError) {
    console.error("clockInStaff existing record error:", existingError);
    return {
      success: false,
      error: existingError.message
    };
  }

  if (existing) {
    return {
      success: false,
      error: "You already have an attendance record for today."
    };
  }

  const { data, error } = await supabase
    .from("staff_attendance")
    .insert({
      school_id: staff.school_id,
      staff_id: staff.id,
      clock_in: new Date().toISOString(),
      clock_out: null,
      date: today
    })
    .select()
    .single();

  if (error) {
    console.error("clockInStaff error:", error);

    return {
      success: false,
      error: error.message
    };
  }

  return {
    success: true,
    data
  };
}

/**
 * Clock the current staff member out for today.
 */
export async function clockOutStaff() {
  const staff = await getCurrentStaff();

  const today = new Date().toISOString().slice(0, 10);

  const { data: attendance, error: findError } = await supabase
    .from("staff_attendance")
    .select("*")
    .eq("staff_id", staff.id)
    .eq("date", today)
    .maybeSingle();

  if (findError) {
    console.error("clockOutStaff find error:", findError);

    return {
      success: false,
      error: findError.message
    };
  }

  if (!attendance) {
    return {
      success: false,
      error: "You have not clocked in today."
    };
  }

  if (attendance.clock_out) {
    return {
      success: false,
      error: "You have already clocked out today."
    };
  }

  const { data, error } = await supabase
    .from("staff_attendance")
    .update({
      clock_out: new Date().toISOString()
    })
    .eq("id", attendance.id)
    .select()
    .single();

  if (error) {
    console.error("clockOutStaff error:", error);

    return {
      success: false,
      error: error.message
    };
  }

  return {
    success: true,
    data
  };
}

/**
 * Get today's attendance record for the current staff member.
 */
export async function getMyTodayAttendance(): Promise<StaffAttendance | null> {
  const staff = await getCurrentStaff();

  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("staff_attendance")
    .select("*")
    .eq("staff_id", staff.id)
    .eq("date", today)
    .maybeSingle();

  if (error) {
    console.error("getMyTodayAttendance error:", error);
    return null;
  }

  return data;
}

/**
 * Get attendance records for a particular date.
 *
 * This is intended for school admin / school owner reporting.
 */
export async function getStaffAttendanceByDate(
  date: string
): Promise<TodayStaffAttendance[]> {
  const { data, error } = await supabase
    .from("staff_attendance")
    .select(`
      id,
      school_id,
      staff_id,
      clock_in,
      clock_out,
      date,
      staff (
        id,
        department,
        position,
        profiles (
          full_name,
          email
        )
      )
    `)
    .eq("date", date)
    .order("clock_in", {
      ascending: true,
      nullsFirst: false
    });

  if (error) {
    console.error("getStaffAttendanceByDate error:", error);
    return [];
  }

  return (data || []).map((item: any) => ({
    id: item.id,
    school_id: item.school_id,
    staff_id: item.staff_id,
    clock_in: item.clock_in,
    clock_out: item.clock_out,
    date: item.date,
    staff_name: item.staff?.profiles?.full_name || "Unknown Staff",
    staff_email: item.staff?.profiles?.email || "",
    position: item.staff?.position || null,
    department: item.staff?.department || null
  }));
}