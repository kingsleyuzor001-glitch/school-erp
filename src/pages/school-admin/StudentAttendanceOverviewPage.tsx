import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { listSchoolStudentAttendance } from "../../services/studentAttendance";

interface AttendanceRow {
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

interface ClassSummary {
  classId: string;
  className: string;
  classArm: string | null;
  total: number;
  present: number;
  currentlyInSchool: number;
  clockedOut: number;
  absent: number;
  percentage: number;
}

export default function StudentAttendanceOverviewPage() {
  const { profile } = useAuth();

  const [date, setDate] = useState(
    () => new Date().toISOString().slice(0, 10)
  );

  const [students, setStudents] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadAttendance() {
    if (!profile?.school_id) return;

    try {
      setLoading(true);
      setError(null);

      const data = await listSchoolStudentAttendance(
        profile.school_id,
        date
      );

      setStudents(data);
    } catch (err: any) {
      setError(
        err.message || "Unable to load school attendance."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAttendance();
  }, [profile?.school_id, date]);

  const totalStudents = students.length;

  const presentCount = students.filter(
    (student) => student.clock_in !== null
  ).length;

  const absentCount = students.filter(
    (student) => student.clock_in === null
  ).length;

  const currentlyInSchoolCount = students.filter(
    (student) =>
      student.clock_in !== null &&
      student.clock_out === null
  ).length;

  const clockedOutCount = students.filter(
    (student) =>
      student.clock_in !== null &&
      student.clock_out !== null
  ).length;

  const attendancePercentage =
    totalStudents > 0
      ? Math.round((presentCount / totalStudents) * 100)
      : 0;

  const classSummaries = useMemo<ClassSummary[]>(() => {
    const groups = new Map<string, AttendanceRow[]>();

    students.forEach((student) => {
      const key = student.class_id ?? "unassigned";

      if (!groups.has(key)) {
        groups.set(key, []);
      }

      groups.get(key)!.push(student);
    });

    return Array.from(groups.entries())
      .map(([classId, rows]) => {
        const total = rows.length;

        const present = rows.filter(
          (student) => student.clock_in !== null
        ).length;

        const currentlyInSchool = rows.filter(
          (student) =>
            student.clock_in !== null &&
            student.clock_out === null
        ).length;

        const clockedOut = rows.filter(
          (student) =>
            student.clock_in !== null &&
            student.clock_out !== null
        ).length;

        const absent = total - present;

        const percentage =
          total > 0
            ? Math.round((present / total) * 100)
            : 0;

        const first = rows[0];

        return {
          classId,
          className: first.class_name,
          classArm: first.class_arm,
          total,
          present,
          currentlyInSchool,
          clockedOut,
          absent,
          percentage
        };
      })
      .sort((a, b) =>
        `${a.className} ${a.classArm ?? ""}`.localeCompare(
          `${b.className} ${b.classArm ?? ""}`
        )
      );
  }, [students]);

  function formatTime(timestamp: string | null) {
    if (!timestamp) return "—";

    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold">
            Student Attendance Overview
          </h1>

          <p className="text-sm text-slate-500">
            School-wide student attendance for the selected date.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={date}
            onChange={(event) =>
              setDate(event.target.value)
            }
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          />

          <Button
            onClick={loadAttendance}
            loading={loading}
          >
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card>
          <p className="text-xs font-medium uppercase text-slate-400">
            Total pupils
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-800">
            {totalStudents}
          </p>
        </Card>

        <Card>
          <p className="text-xs font-medium uppercase text-slate-400">
            Present
          </p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">
            {presentCount}
          </p>
        </Card>

        <Card>
          <p className="text-xs font-medium uppercase text-slate-400">
            Not clocked in
          </p>
          <p className="mt-1 text-2xl font-bold text-rose-600">
            {absentCount}
          </p>
        </Card>

        <Card>
          <p className="text-xs font-medium uppercase text-slate-400">
            Currently in school
          </p>
          <p className="mt-1 text-2xl font-bold text-brand-600">
            {currentlyInSchoolCount}
          </p>
        </Card>

        <Card>
          <p className="text-xs font-medium uppercase text-slate-400">
            Clocked out
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-600">
            {clockedOutCount}
          </p>
        </Card>

        <Card>
          <p className="text-xs font-medium uppercase text-slate-400">
            Attendance
          </p>
          <p className="mt-1 text-2xl font-bold text-brand-600">
            {attendancePercentage}%
          </p>
        </Card>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="border-b border-slate-200 px-4 py-4">
          <h2 className="font-semibold text-slate-800">
            Attendance by class
          </h2>

          <p className="text-xs text-slate-500">
            {date}
          </p>
        </div>

        {loading ? (
          <div className="px-4 py-8 text-center text-sm text-slate-400">
            Loading attendance...
          </div>
        ) : classSummaries.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-slate-400">
            No active students found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">
                    Class
                  </th>

                  <th className="px-4 py-3">
                    Total
                  </th>

                  <th className="px-4 py-3">
                    Present
                  </th>

                  <th className="px-4 py-3">
                    In school
                  </th>

                  <th className="px-4 py-3">
                    Clocked out
                  </th>

                  <th className="px-4 py-3">
                    Not clocked in
                  </th>

                  <th className="px-4 py-3">
                    Attendance
                  </th>
                </tr>
              </thead>

              <tbody>
                {classSummaries.map((summary) => (
                  <tr
                    key={summary.classId}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {summary.className}
                      {summary.classArm
                        ? ` ${summary.classArm}`
                        : ""}
                    </td>

                    <td className="px-4 py-3">
                      {summary.total}
                    </td>

                    <td className="px-4 py-3 font-medium text-emerald-600">
                      {summary.present}
                    </td>

                    <td className="px-4 py-3 text-brand-600">
                      {summary.currentlyInSchool}
                    </td>

                    <td className="px-4 py-3 text-slate-600">
                      {summary.clockedOut}
                    </td>

                    <td className="px-4 py-3 text-rose-600">
                      {summary.absent}
                    </td>

                    <td className="px-4 py-3">
                      <span className="font-semibold">
                        {summary.percentage}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="border-b border-slate-200 px-4 py-4">
          <h2 className="font-semibold text-slate-800">
            Student attendance details
          </h2>

          <p className="text-xs text-slate-500">
            Detailed attendance records for {date}.
          </p>
        </div>

        {loading ? (
          <div className="px-4 py-8 text-center text-sm text-slate-400">
            Loading attendance...
          </div>
        ) : students.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-slate-400">
            No active students found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">
                    Student
                  </th>

                  <th className="px-4 py-3">
                    Class
                  </th>

                  <th className="px-4 py-3">
                    Status
                  </th>

                  <th className="px-4 py-3">
                    Clock in
                  </th>

                  <th className="px-4 py-3">
                    Clock out
                  </th>
                </tr>
              </thead>

              <tbody>
                {students.map((student) => {
                  const isPresent =
                    student.clock_in !== null;

                  const isInside =
                    isPresent &&
                    student.clock_out === null;

                  return (
                    <tr
                      key={student.student_id}
                      className="border-b border-slate-100 last:border-0"
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">
                          {student.full_name}
                        </div>

                        <div className="text-xs text-slate-400">
                          {student.admission_number}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-slate-600">
                        {student.class_name}
                        {student.class_arm
                          ? ` ${student.class_arm}`
                          : ""}
                      </td>

                      <td className="px-4 py-3">
                        {!isPresent && (
                          <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-medium text-rose-700">
                            Not clocked in
                          </span>
                        )}

                        {isInside && (
                          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
                            In school
                          </span>
                        )}

                        {isPresent &&
                          !isInside && (
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                              Clocked out
                            </span>
                          )}
                      </td>

                      <td className="px-4 py-3 text-slate-600">
                        {formatTime(student.clock_in)}
                      </td>

                      <td className="px-4 py-3 text-slate-600">
                        {formatTime(student.clock_out)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}