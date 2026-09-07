import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import {
  listStudentAttendanceClasses,
  listStudentAttendanceForClass,
  clockStudentIn,
  clockStudentOut
} from "../../services/studentAttendance";

interface SchoolClass {
  id: string;
  name: string;
  arm: string | null;
}

interface StudentAttendanceRow {
  student_id: string;
  full_name: string;
  admission_number: string;
  clock_in: string | null;
  clock_out: string | null;
  status: string;
}

export default function StudentAttendancePage() {
  const { profile } = useAuth();

  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [classId, setClassId] = useState("");
  const [students, setStudents] = useState<StudentAttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingStudent, setSavingStudent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().slice(0, 10)
  );

  async function loadClasses() {
    if (!profile?.school_id) return;

    try {
      setError(null);

      const data = await listStudentAttendanceClasses(profile.school_id);

      setClasses(data);

      if (data.length > 0 && !classId) {
        setClassId(data[0].id);
      }
    } catch (err: any) {
      setError(err.message || "Unable to load classes.");
    }
  }

  async function loadAttendance() {
    if (!profile?.school_id || !classId) return;

    try {
      setLoading(true);
      setError(null);

      const data = await listStudentAttendanceForClass(
        profile.school_id,
        classId,
        selectedDate
      );

      setStudents(data);
    } catch (err: any) {
      setError(err.message || "Unable to load student attendance.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadClasses();
  }, [profile?.school_id]);

  useEffect(() => {
    if (classId) {
      loadAttendance();
    }
  }, [classId, selectedDate, profile?.school_id]);

  async function handleClockIn(studentId: string) {
    try {
      setSavingStudent(studentId);
      setError(null);

      await clockStudentIn(studentId);

      await loadAttendance();
    } catch (err: any) {
      setError(err.message || "Unable to clock student in.");
    } finally {
      setSavingStudent(null);
    }
  }

  async function handleClockOut(studentId: string) {
    try {
      setSavingStudent(studentId);
      setError(null);

      await clockStudentOut(studentId);

      await loadAttendance();
    } catch (err: any) {
      setError(err.message || "Unable to clock student out.");
    } finally {
      setSavingStudent(null);
    }
  }

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

  const totalStudents = students.length;

  const attendancePercentage =
    totalStudents > 0
      ? Math.round((presentCount / totalStudents) * 100)
      : 0;

  function formatTime(timestamp: string | null) {
    if (!timestamp) return "—";

    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function formatDate(date: string) {
    if (!date) return "";

    return new Date(`${date}T00:00:00`).toLocaleDateString([], {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  }

  const selectedClass = classes.find(
    (item) => item.id === classId
  );

  const maxChartValue = Math.max(
    totalStudents,
    1
  );

  const chartBars = [
    {
      label: "Present",
      value: presentCount,
      percentage: (presentCount / maxChartValue) * 100,
      className: "bg-emerald-500"
    },
    {
      label: "Absent",
      value: absentCount,
      percentage: (absentCount / maxChartValue) * 100,
      className: "bg-rose-500"
    },
    {
      label: "Currently In",
      value: currentlyInSchoolCount,
      percentage:
        (currentlyInSchoolCount / maxChartValue) * 100,
      className: "bg-brand-500"
    },
    {
      label: "Clocked Out",
      value: clockedOutCount,
      percentage: (clockedOutCount / maxChartValue) * 100,
      className: "bg-slate-500"
    }
  ];

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <div>
        <h1 className="font-display text-xl font-bold">
          Student Attendance
        </h1>

        <p className="text-sm text-slate-500">
          Monitor student attendance by class and date.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={classId}
          onChange={(event) => setClassId(event.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          {classes.length === 0 && (
            <option value="">
              No classes available
            </option>
          )}

          {classes.map((schoolClass) => (
            <option
              key={schoolClass.id}
              value={schoolClass.id}
            >
              {schoolClass.name}
              {schoolClass.arm
                ? ` ${schoolClass.arm}`
                : ""}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={selectedDate}
          onChange={(event) =>
            setSelectedDate(event.target.value)
          }
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        />

        <div className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-600">
          {formatDate(selectedDate)}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
            Absent
          </p>

          <p className="mt-1 text-2xl font-bold text-rose-600">
            {absentCount}
          </p>
        </Card>

        <Card>
          <p className="text-xs font-medium uppercase text-slate-400">
            Attendance Rate
          </p>

          <p className="mt-1 text-2xl font-bold text-brand-600">
            {attendancePercentage}%
          </p>
        </Card>
      </div>

      <Card>
        <div className="mb-5">
          <h2 className="font-display text-base font-semibold text-slate-800">
            Attendance Overview
          </h2>

          <p className="text-xs text-slate-500">
            {selectedClass
              ? `${selectedClass.name}${
                  selectedClass.arm
                    ? ` ${selectedClass.arm}`
                    : ""
                }`
              : "Selected class"}{" "}
            — {formatDate(selectedDate)}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {chartBars.map((bar) => (
            <div
              key={bar.label}
              className="rounded-xl border border-slate-200 bg-slate-50 p-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">
                  {bar.label}
                </span>

                <span className="text-lg font-bold text-slate-800">
                  {bar.value}
                </span>
              </div>

              <div className="mt-3 h-28 rounded-lg bg-white p-2">
                <div className="flex h-full items-end">
                  <div
                    className={`w-full rounded-md ${bar.className}`}
                    style={{
                      height: `${Math.max(
                        bar.percentage,
                        bar.value > 0 ? 8 : 0
                      )}%`
                    }}
                  />
                </div>
              </div>

              <p className="mt-2 text-center text-xs text-slate-400">
                {totalStudents > 0
                  ? `${Math.round(
                      (bar.value / totalStudents) * 100
                    )}% of pupils`
                  : "0% of pupils"}
              </p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="border-b border-slate-200 px-4 py-4">
          <h2 className="font-semibold text-slate-800">
            {selectedClass
              ? `${selectedClass.name}${
                  selectedClass.arm
                    ? ` ${selectedClass.arm}`
                    : ""
                }`
              : "Student attendance"}
          </h2>

          <p className="text-xs text-slate-500">
            {formatDate(selectedDate)} · Currently in school:{" "}
            {currentlyInSchoolCount} · Clocked out:{" "}
            {clockedOutCount}
          </p>
        </div>

        {error && (
          <div className="border-b border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="px-4 py-8 text-center text-sm text-slate-400">
            Loading attendance...
          </div>
        ) : students.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-slate-400">
            No students found in this class.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">
                    Student
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

                  <th className="px-4 py-3">
                    Action
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

                  const isOut =
                    isPresent &&
                    student.clock_out !== null;

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

                      <td className="px-4 py-3">
                        {!isPresent && (
                          <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-medium text-rose-700">
                            Absent
                          </span>
                        )}

                        {isInside && (
                          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
                            In school
                          </span>
                        )}

                        {isOut && (
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

                      <td className="px-4 py-3">
                        {!isPresent && (
                          <Button
                            onClick={() =>
                              handleClockIn(
                                student.student_id
                              )
                            }
                            loading={
                              savingStudent ===
                              student.student_id
                            }
                          >
                            Clock in
                          </Button>
                        )}

                        {isInside && (
                          <Button
                            onClick={() =>
                              handleClockOut(
                                student.student_id
                              )
                            }
                            loading={
                              savingStudent ===
                              student.student_id
                            }
                          >
                            Clock out
                          </Button>
                        )}

                        {isOut && (
                          <span className="text-xs text-slate-400">
                            Completed
                          </span>
                        )}
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