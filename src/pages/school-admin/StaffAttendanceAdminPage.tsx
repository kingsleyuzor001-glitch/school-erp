import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

interface StaffRow {
  id: string;
  staff_id_code: string | null;
  department: string | null;
  position: string | null;
  profile_id: string;
  profile?: {
    full_name: string | null;
    email: string | null;
  } | null;
}

interface AttendanceRow {
  id: string;
  staff_id: string;
  clock_in: string | null;
  clock_out: string | null;
  date: string;
}

export default function StaffAttendanceAdminPage() {
  const [date, setDate] = useState(
    new Date().toISOString().slice(0, 10)
  );

  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadAttendance() {
    try {
      setLoading(true);
      setMessage("");

      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("You are not logged in.");
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("school_id, role")
        .eq("id", user.id)
        .single();

      if (profileError || !profile) {
        throw new Error("Your profile could not be found.");
      }

      if (
        profile.role !== "school_owner" &&
        profile.role !== "school_admin"
      ) {
        throw new Error(
          "You do not have permission to view staff attendance."
        );
      }

      if (!profile.school_id) {
        throw new Error("Your account is not linked to a school.");
      }

      const { data: staffData, error: staffError } = await supabase
        .from("staff")
        .select(`
          id,
          staff_id_code,
          department,
          position,
          profile_id,
          profile:profile_id (
            full_name,
            email
          )
        `)
        .eq("school_id", profile.school_id)
        .order("staff_id_code", { ascending: true });

      if (staffError) {
        throw new Error(staffError.message);
      }

      const { data: attendanceData, error: attendanceError } =
        await supabase
          .from("staff_attendance")
          .select("id, staff_id, clock_in, clock_out, date")
          .eq("school_id", profile.school_id)
          .eq("date", date);

      if (attendanceError) {
        throw new Error(attendanceError.message);
      }

      setStaff((staffData || []).map((item: any) => ({ ...item, profile: Array.isArray(item.profile) ? item.profile[0] || null : item.profile })) as StaffRow[]);
      setAttendance((attendanceData || []) as AttendanceRow[]);
    } catch (error: any) {
      console.error("Staff attendance admin page error:", error);
      setMessage(
        error?.message ||
          "Unable to load staff attendance."
      );
      setStaff([]);
      setAttendance([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAttendance();
  }, [date]);

  const attendanceByStaff = new Map(
    attendance.map((item) => [item.staff_id, item])
  );

  const totalStaff = staff.length;

  const present = staff.filter((item) => {
    const record = attendanceByStaff.get(item.id);
    return !!record?.clock_in;
  }).length;

  const absent = Math.max(totalStaff - present, 0);

  const currentlyIn = staff.filter((item) => {
    const record = attendanceByStaff.get(item.id);
    return !!record?.clock_in && !record?.clock_out;
  }).length;

  const clockedOut = staff.filter((item) => {
    const record = attendanceByStaff.get(item.id);
    return !!record?.clock_in && !!record?.clock_out;
  }).length;

  function formatTime(value: string | null) {
    if (!value) return "—";

    return new Date(value).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function getStatus(staffId: string) {
    const record = attendanceByStaff.get(staffId);

    if (!record?.clock_in) {
      return "Absent";
    }

    if (record.clock_in && !record.clock_out) {
      return "Present";
    }

    return "Clocked Out";
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Staff Attendance
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Monitor daily staff attendance and working status.
          </p>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">
            Attendance Date
          </label>

          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      {message && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {message}
        </div>
      )}

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-xl border bg-white p-5">
          <p className="text-sm text-slate-500">
            Total Staff
          </p>
          <p className="mt-2 text-3xl font-bold">
            {totalStaff}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5">
          <p className="text-sm text-slate-500">
            Present
          </p>
          <p className="mt-2 text-3xl font-bold text-green-600">
            {present}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5">
          <p className="text-sm text-slate-500">
            Absent
          </p>
          <p className="mt-2 text-3xl font-bold text-red-600">
            {absent}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5">
          <p className="text-sm text-slate-500">
            Currently In
          </p>
          <p className="mt-2 text-3xl font-bold text-blue-600">
            {currentlyIn}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5">
          <p className="text-sm text-slate-500">
            Clocked Out
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-700">
            {clockedOut}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white">
        <div className="border-b px-5 py-4">
          <h2 className="font-semibold">
            Staff Attendance Records
          </h2>
        </div>

        {loading ? (
          <div className="p-6 text-sm text-slate-500">
            Loading staff attendance...
          </div>
        ) : staff.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">
            No staff records found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-5 py-3 font-semibold">
                    Staff
                  </th>

                  <th className="px-5 py-3 font-semibold">
                    Staff ID
                  </th>

                  <th className="px-5 py-3 font-semibold">
                    Department
                  </th>

                  <th className="px-5 py-3 font-semibold">
                    Position
                  </th>

                  <th className="px-5 py-3 font-semibold">
                    Clock In
                  </th>

                  <th className="px-5 py-3 font-semibold">
                    Clock Out
                  </th>

                  <th className="px-5 py-3 font-semibold">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {staff.map((item) => {
                  const record = attendanceByStaff.get(item.id);
                  const status = getStatus(item.id);

                  return (
                    <tr key={item.id}>
                      <td className="px-5 py-4">
                        <div className="font-medium">
                          {item.profile?.full_name || "Unnamed Staff"}
                        </div>

                        <div className="text-xs text-slate-500">
                          {item.profile?.email || ""}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        {item.staff_id_code || "—"}
                      </td>

                      <td className="px-5 py-4">
                        {item.department || "—"}
                      </td>

                      <td className="px-5 py-4">
                        {item.position || "—"}
                      </td>

                      <td className="px-5 py-4">
                        {formatTime(record?.clock_in || null)}
                      </td>

                      <td className="px-5 py-4">
                        {formatTime(record?.clock_out || null)}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                            status === "Present"
                              ? "bg-green-100 text-green-700"
                              : status === "Clocked Out"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}



