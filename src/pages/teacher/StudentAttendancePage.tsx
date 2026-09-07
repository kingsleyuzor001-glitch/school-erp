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

function getLocalDate() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default function StudentAttendancePage() {
  const { profile } = useAuth();

  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [classId, setClassId] = useState("");
  const [selectedDate, setSelectedDate] = useState(getLocalDate());
  const [students, setStudents] = useState<StudentAttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingStudent, setSavingStudent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const today = getLocalDate();
  const isToday = selectedDate === today;

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
    if (!isToday) {
      setError("Clock-in is only available for today's attendance.");
      return;
    }

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
    if (!isToday) {
      setError("Clock-out is only available for today's attendance.");
      return;
    }

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

  const totalCount = students.length;

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
    totalCount > 0
      ? Math.round((presentCount / totalCount) * 100)
      : 0;

  const chartMax = Math.max(
    totalCount,
    presentCount,
    absentCount,
    currentlyInSchoolCount,
    clockedOutCount,
    1
  );

  function formatTime(timestamp: string | null) {
    if (!timestamp) return "—";

    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function formatDateLabel(date: string) {
    const parsed = new Date(`${date}T00:00:00`);

    return parsed.toLocaleDateString([], {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  }

  const selectedClass = classes.find(
    (item) => item.id === classId
  );

  return (
    <div className="space-y-5 p-4 sm:p-6">

      {/* PAGE HEADER */}
      <div>
        <h1 className="font-display text-xl font-bold">
          Student Attendance
        </h1>

        <p className="text-sm text-slate-500">
          Monitor class attendance, clock pupils in and out,
          and review attendance trends by date.
        </p>
      </div>

      {/* FILTERS */}
      <div className="flex flex-wrap items-center gap-3">

        <select
          value={classId}
          onChange={(event) => setClassId(event.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          {classes.length === 0 && (
            <option value="">
              No assigned classes available
            </option>
          )}

          {classes.map((schoolClass) => (
            <option
              key={schoolClass.id}
              value={schoolClass.id}
            >
              {schoolClass.name}
              {schoolClass.arm ? ` ${schoolClass.arm}` : ""}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={selectedDate}
          max={today}
          onChange={(event) =>
            setSelectedDate(event.target.value)
          }
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        />

        <div className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-600">
          {formatDateLabel(selectedDate)}
        </div>

      </div>

      {/* HISTORY NOTICE */}
      {!isToday && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          You are viewing historical attendance for{" "}
          <strong>{formatDateLabel(selectedDate)}</strong>.
          Clock-in and clock-out actions are available only for today.
        </div>
      )}

      {/* SUMMARY CARDS */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

        <Card>
          <p className="text-xs font-medium uppercase text-slate-400">
            Total pupils
          </p>

          <p className="mt-1 text-2xl font-bold text-slate-800">
            {totalCount}
          </p>
        </Card>

        <Card>
          <p className="text-xs font-medium uppercase text-slate-400">
            Present
          </p>

          <p className="mt-1 text-2xl font-bold text-emerald-600">
            {presentCount}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            {attendancePercentage}% attendance
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

      </div>

      {/* ATTENDANCE HISTOGRAM */}
      <Card>

        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">

          <div>
            <h2 className="font-semibold text-slate-800">
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
              • {formatDateLabel(selectedDate)}
            </p>
          </div>

          <div className="rounded-lg bg-slate-100 px-3 py-2 text-sm">
            Attendance rate:{" "}
            <span className="font-bold text-slate-800">
              {attendancePercentage}%
            </span>
          </div>

        </div>

        {loading ? (
          <div className="py-10 text-center text-sm text-slate-400">
            Loading attendance chart...
          </div>
        ) : totalCount === 0 ? (
          <div className="py-10 text-center text-sm text-slate-400">
            No pupils found for this class.
          </div>
        ) : (
          <div className="space-y-5">

            {/* CHART */}
            <div className="flex h-64 items-end gap-4 border-b border-slate-200 px-2 pb-0 sm:gap-8">

              {/* PRESENT */}
              <div className="flex h-full flex-1 flex-col justify-end">
                <div className="mb-2 text-center text-sm font-bold text-emerald-600">
                  {presentCount}
                </div>

                <div
                  className="w-full rounded-t-lg bg-emerald-500 transition-all duration-300"
                  style={{
                    height: `${Math.max(
                      (presentCount / chartMax) * 85,
                      presentCount > 0 ? 8 : 0
                    )}%`
                  }}
                />

                <div className="mt-2 pb-3 text-center text-xs font-medium text-slate-500">
                  Present
                </div>
              </div>

              {/* ABSENT */}
              <div className="flex h-full flex-1 flex-col justify-end">
                <div className="mb-2 text-center text-sm font-bold text-rose-600">
                  {absentCount}
                </div>

                <div
                  className="w-full rounded-t-lg bg-rose-500 transition-all duration-300"
                  style={{
                    height: `${Math.max(
                      (absentCount / chartMax) * 85,
                      absentCount > 0 ? 8 : 0
                    )}%`
                  }}
                />

                <div className="mt-2 pb-3 text-center text-xs font-medium text-slate-500">
                  Absent
                </div>
              </div>

              {/* IN SCHOOL */}
              <div className="flex h-full flex-1 flex-col justify-end">
                <div className="mb-2 text-center text-sm font-bold text-brand-600">
                  {currentlyInSchoolCount}
                </div>

                <div
                  className="w-full rounded-t-lg bg-brand-500 transition-all duration-300"
                  style={{
                    height: `${Math.max(
                      (currentlyInSchoolCount / chartMax) * 85,
                      currentlyInSchoolCount > 0 ? 8 : 0
                    )}%`
                  }}
                />

                <div className="mt-2 pb-3 text-center text-xs font-medium text-slate-500">
                  In school
                </div>
              </div>

              {/* CLOCKED OUT */}
              <div className="flex h-full flex-1 flex-col justify-end">
                <div className="mb-2 text-center text-sm font-bold text-slate-600">
                  {clockedOutCount}
                </div>

                <div
                  className="w-full rounded-t-lg bg-slate-400 transition-all duration-300"
                  style={{
                    height: `${Math.max(
                      (clockedOutCount / chartMax) * 85,
                      clockedOutCount > 0 ? 8 : 0
                    )}%`
                  }}
                />

                <div className="mt-2 pb-3 text-center text-xs font-medium text-slate-500">
                  Clocked out
                </div>
              </div>

            </div>

            {/* CHART DESCRIPTION */}
            <div className="grid gap-2 text-xs text-slate-500 sm:grid-cols-2 lg:grid-cols-4">

              <div className="rounded-lg bg-emerald-50 px-3 py-2">
                <span className="font-semibold text-emerald-700">
                  Present:
                </span>{" "}
                {presentCount} pupil(s)
              </div>

              <div className="rounded-lg bg-rose-50 px-3 py-2">
                <span className="font-semibold text-rose-700">
                  Absent:
                </span>{" "}
                {absentCount} pupil(s)
              </div>

              <div className="rounded-lg bg-slate-50 px-3 py-2">
                <span className="font-semibold text-slate-700">
                  Clocked out:
                </span>{" "}
                {clockedOutCount} pupil(s)
              </div>

              <div className="rounded-lg bg-blue-50 px-3 py-2">
                <span className="font-semibold text-blue-700">
                  In school:
                </span>{" "}
                {currentlyInSchoolCount} pupil(s)
              </div>

            </div>

          </div>
        )}

      </Card>

      {/* STUDENT TABLE */}
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
            {isToday
              ? "Today's attendance"
              : `Attendance for ${formatDateLabel(selectedDate)}`}
            {" • "}
            Clocked out: {clockedOutCount}
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
            No pupils found in this class.
          </div>
        ) : (
          <div className="overflow-x-auto">

            <table className="w-full min-w-[800px] text-left text-sm">

              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">

                <tr>
                  <th className="px-4 py-3">
                    Pupil
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
                            disabled={!isToday}
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
                            disabled={!isToday}
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