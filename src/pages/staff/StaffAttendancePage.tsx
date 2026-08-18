import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export interface StaffAttendance {
  id: string;
  school_id: string;
  staff_id: string;
  clock_in: string | null;
  clock_out: string | null;
  date: string;
}

export interface StaffAttendanceWithStaff extends StaffAttendance {
  staff?: {
    id: string;
    profile_id: string;
    staff_id_code?: string | null;
    department?: string | null;
    position?: string | null;
    profile?: {
      full_name?: string | null;
      email?: string | null;
    } | null;
  } | null;
}

// =====================================================
// GET CURRENT STAFF
// =====================================================

async function getCurrentStaff() {
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("You are not logged in.");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, school_id")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    throw new Error("Your profile could not be found.");
  }

  const { data: staff, error: staffError } = await supabase
    .from("staff")
    .select("id, profile_id, school_id, staff_id_code, department, position")
    .eq("profile_id", user.id)
    .eq("school_id", profile.school_id)
    .single();

  if (staffError || !staff) {
    throw new Error(
      "Your staff record could not be found. Please contact the school administrator."
    );
  }

  return {
    user,
    profile,
    staff
  };
}

// =====================================================
// GET TODAY'S ATTENDANCE FOR CURRENT STAFF
// =====================================================

export async function getMyTodayAttendance(): Promise<StaffAttendance | null> {
  try {
    const { staff } = await getCurrentStaff();

    const today = new Date().toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from("staff_attendance")
      .select("*")
      .eq("staff_id", staff.id)
      .eq("date", today)
      .maybeSingle();

    if (error) {
      console.error("getMyTodayAttendance error:", error);
      throw new Error(error.message);
    }

    return data;
  } catch (error: any) {
    console.error("getMyTodayAttendance error:", error);
    throw error;
  }
}

// =====================================================
// CLOCK IN
// =====================================================

export async function clockInStaff(): Promise<StaffAttendance> {
  try {
    const { staff, profile } = await getCurrentStaff();

    const today = new Date().toISOString().slice(0, 10);

    // Check whether the staff member already has an attendance
    // record for today.
    const { data: existing, error: existingError } = await supabase
      .from("staff_attendance")
      .select("*")
      .eq("staff_id", staff.id)
      .eq("date", today)
      .maybeSingle();

    if (existingError) {
      console.error("clockInStaff existing check error:", existingError);
      throw new Error(existingError.message);
    }

    if (existing) {
      if (existing.clock_in) {
        throw new Error("You have already clocked in today.");
      }

      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from("staff_attendance")
        .update({
          clock_in: now
        })
        .eq("id", existing.id)
        .select("*")
        .single();

      if (error) {
        console.error("clockInStaff update error:", error);
        throw new Error(error.message);
      }

      return data;
    }

    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("staff_attendance")
      .insert({
        school_id: profile.school_id,
        staff_id: staff.id,
        clock_in: now,
        date: today
      })
      .select("*")
      .single();

    if (error) {
      console.error("clockInStaff insert error:", error);
      throw new Error(error.message);
    }

    return data;
  } catch (error: any) {
    console.error("clockInStaff error:", error);
    throw error;
  }
}

// =====================================================
// CLOCK OUT
// =====================================================

export async function clockOutStaff(): Promise<StaffAttendance> {
  try {
    const { staff } = await getCurrentStaff();

    const today = new Date().toISOString().slice(0, 10);

    const { data: existing, error: existingError } = await supabase
      .from("staff_attendance")
      .select("*")
      .eq("staff_id", staff.id)
      .eq("date", today)
      .maybeSingle();

    if (existingError) {
      console.error("clockOutStaff existing check error:", existingError);
      throw new Error(existingError.message);
    }

    if (!existing) {
      throw new Error("You have not clocked in today.");
    }

    if (!existing.clock_in) {
      throw new Error("You have not clocked in today.");
    }

    if (existing.clock_out) {
      throw new Error("You have already clocked out today.");
    }

    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("staff_attendance")
      .update({
        clock_out: now
      })
      .eq("id", existing.id)
      .select("*")
      .single();

    if (error) {
      console.error("clockOutStaff update error:", error);
      throw new Error(error.message);
    }

    return data;
  } catch (error: any) {
    console.error("clockOutStaff error:", error);
    throw error;
  }
}

// =====================================================
// SCHOOL ADMIN / OWNER ATTENDANCE REPORT
// =====================================================

export async function listStaffAttendance(
  date?: string
): Promise<StaffAttendanceWithStaff[]> {
  try {
    const { profile } = await getCurrentStaff();

    const targetDate =
      date || new Date().toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from("staff_attendance")
      .select(`
        *,
        staff:staff_id (
          id,
          profile_id,
          staff_id_code,
          department,
          position,
          profile:profile_id (
            full_name,
            email
          )
        )
      `)
      .eq("school_id", profile.school_id)
      .eq("date", targetDate)
      .order("clock_in", {
        ascending: true,
        nullsFirst: false
      });

    if (error) {
      console.error("listStaffAttendance error:", error);
      throw new Error(error.message);
    }

    return (data || []) as StaffAttendanceWithStaff[];
  } catch (error: any) {
    console.error("listStaffAttendance error:", error);
    throw error;
  }
}

// =====================================================
// ATTENDANCE SUMMARY
// =====================================================

export async function getStaffAttendanceSummary(date?: string) {
  try {
    const { profile } = await getCurrentStaff();

    const targetDate =
      date || new Date().toISOString().slice(0, 10);

    const { data: staffList, error: staffError } = await supabase
      .from("staff")
      .select("id")
      .eq("school_id", profile.school_id);

    if (staffError) {
      console.error("getStaffAttendanceSummary staff error:", staffError);
      throw new Error(staffError.message);
    }

    const { data: attendance, error: attendanceError } = await supabase
      .from("staff_attendance")
      .select("*")
      .eq("school_id", profile.school_id)
      .eq("date", targetDate);

    if (attendanceError) {
      console.error(
        "getStaffAttendanceSummary attendance error:",
        attendanceError
      );
      throw new Error(attendanceError.message);
    }

    const totalStaff = staffList?.length || 0;
    const present = attendance?.filter(
      (item: any) => item.clock_in
    ).length || 0;

    const clockedOut = attendance?.filter(
      (item: any) => item.clock_in && item.clock_out
    ).length || 0;

    const currentlyPresent = attendance?.filter(
      (item: any) => item.clock_in && !item.clock_out
    ).length || 0;

    const absent = Math.max(totalStaff - present, 0);

    return {
      date: targetDate,
      totalStaff,
      present,
      absent,
      clockedOut,
      currentlyPresent
    };
  } catch (error: any) {
    console.error("getStaffAttendanceSummary error:", error);
    throw error;
  }
}

export default function StaffAttendancePage() {
  const [attendance, setAttendance] = useState<StaffAttendance | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");

  async function loadAttendance() {
    try {
      setLoading(true);
      setMessage("");

      const data = await getMyTodayAttendance();
      setAttendance(data);
    } catch (error: any) {
      console.error("Staff attendance page load error:", error);
      setMessage(error?.message || "Unable to load today's attendance.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAttendance();
  }, []);

  async function handleClockIn() {
    try {
      setWorking(true);
      setMessage("");

      const result = await clockInStaff();

      setAttendance(result);
      setMessage("Clock-in recorded successfully.");
    } catch (error: any) {
      console.error("Clock in error:", error);
      setMessage(error?.message || "Unable to clock in.");
    } finally {
      setWorking(false);
    }
  }

  async function handleClockOut() {
    try {
      setWorking(true);
      setMessage("");

      const result = await clockOutStaff();

      setAttendance(result);
      setMessage("Clock-out recorded successfully.");
    } catch (error: any) {
      console.error("Clock out error:", error);
      setMessage(error?.message || "Unable to clock out.");
    } finally {
      setWorking(false);
    }
  }

  function formatTime(value: string | null) {
    if (!value) return "—";

    return new Date(value).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="max-w-xl mx-auto">
          <h1 className="text-2xl font-bold mb-2">
            Staff Attendance
          </h1>
          <p className="text-gray-600">
            Loading today's attendance...
          </p>
        </div>
      </div>
    );
  }

  const hasClockedIn = !!attendance?.clock_in;
  const hasClockedOut = !!attendance?.clock_out;

  return (
    <div className="p-6">
      <div className="max-w-xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">
          Staff Attendance
        </h1>

        <p className="text-gray-600 mb-6">
          Record your attendance for today.
        </p>

        {message && (
          <div className="mb-4 rounded-lg border bg-gray-50 p-3 text-sm">
            {message}
          </div>
        )}

        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-5">
            Today's Attendance
          </h2>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="rounded-lg bg-gray-50 p-4">
              <div className="text-sm text-gray-500">
                Clock In
              </div>
              <div className="text-xl font-semibold mt-1">
                {formatTime(attendance?.clock_in || null)}
              </div>
            </div>

            <div className="rounded-lg bg-gray-50 p-4">
              <div className="text-sm text-gray-500">
                Clock Out
              </div>
              <div className="text-xl font-semibold mt-1">
                {formatTime(attendance?.clock_out || null)}
              </div>
            </div>
          </div>

          {!hasClockedIn && (
            <button
              type="button"
              disabled={working}
              onClick={handleClockIn}
              className="w-full rounded-lg bg-green-600 px-4 py-3 font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {working ? "Clocking In..." : "Clock In"}
            </button>
          )}

          {hasClockedIn && !hasClockedOut && (
            <button
              type="button"
              disabled={working}
              onClick={handleClockOut}
              className="w-full rounded-lg bg-red-600 px-4 py-3 font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {working ? "Clocking Out..." : "Clock Out"}
            </button>
          )}

          {hasClockedIn && hasClockedOut && (
            <div className="rounded-lg bg-green-50 p-4 text-center text-green-700">
              Your attendance for today is complete.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
