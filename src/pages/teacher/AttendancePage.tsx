import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { listMyClasses, listStudentsForAttendance, getAttendanceForDate, markAttendance } from "../../services/attendance";
import { listSessions, listTerms } from "../../services/academic";
import { getSchoolAcademicSelection } from "../../services/schoolAcademic";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import type { AttendanceStatus } from "../../services/types";

const STATUSES: AttendanceStatus[] = ["present", "absent", "late", "excused"];

const STATUS_COLOR: Record<AttendanceStatus, string> = {
  present: "bg-emerald-600",
  absent: "bg-rose-600",
  late: "bg-amber-500",
  excused: "bg-slate-400"
};

export default function AttendancePage() {
  const { profile } = useAuth();

  const [classes, setClasses] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [academicSelection, setAcademicSelection] = useState<any>(null);

  const [classId, setClassId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [students, setStudents] = useState<any[]>([]);
  const [marks, setMarks] = useState<Record<string, AttendanceStatus>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!profile?.school_id) return;

    Promise.all([
      listMyClasses(),
      listSessions(),
      listTerms(),
      getSchoolAcademicSelection(profile.school_id)
    ]).then(([c, s, t, academic]) => {
      setClasses(c);
      setSessions(s);
      setTerms(t);
      setAcademicSelection(academic);

      if (c.length && !classId) {
        setClassId(c[0].id);
      }
    });
  }, [profile?.school_id]);

  useEffect(() => {
    if (!classId) return;

    (async () => {
      const [studentList, existing] = await Promise.all([
        listStudentsForAttendance(classId),
        getAttendanceForDate(classId, date)
      ]);

      setStudents(studentList);

      const initial: Record<string, AttendanceStatus> = {};

      studentList.forEach((s: any) => {
        initial[s.id] = "present";
      });

      existing.forEach((e: any) => {
        initial[e.student_id] = e.status;
      });

      setMarks(initial);
      setSaved(false);
    })();

  }, [classId, date]);

  const currentSession =
    sessions.find(
      (s) => s.id === academicSelection?.current_session_id
    );

  const currentTerm =
    terms.find(
      (t) => t.id === academicSelection?.current_term_id
    );

  async function handleSave() {
    if (!currentSession || !currentTerm) {
      alert("Please select academic session and term in School Academic Setup.");
      return;
    }

    setSaving(true);

    const records = Object.entries(marks).map(
      ([student_id, status]) => ({
        student_id,
        status
      })
    );

    const { error } = await markAttendance({
      classId,
      sessionId: currentSession.id,
      termId: currentTerm.id,
      date,
      records
    });

    setSaving(false);

    if (error) {
      alert(error.message);
      return;
    }

    setSaved(true);
  }

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div>
        <h1 className="font-display text-xl font-bold">
          Attendance
        </h1>

        <p className="text-sm text-slate-500">
          Mark attendance for {profile?.full_name}'s classes.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          value={classId}
          onChange={(e) => setClassId(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
        >
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}{c.arm ? ` ${c.arm}` : ""}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
        />
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[500px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Student</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>

          <tbody>
            {students.length === 0 && (
              <tr>
                <td colSpan={2} className="px-4 py-6 text-center text-slate-400">
                  No students in this class yet.
                </td>
              </tr>
            )}

            {students.map((s) => (
              <tr key={s.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3 font-medium">
                  {s.full_name}
                  <span className="text-xs text-slate-400">
                    {s.admission_number}
                  </span>
                </td>

                <td className="px-4 py-3">
                  <div className="flex gap-1.5">
                    {STATUSES.map((st) => (
                      <button
                        key={st}
                        onClick={() =>
                          setMarks((m) => ({
                            ...m,
                            [s.id]: st
                          }))
                        }
                        className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize text-white ${
                          marks[s.id] === st
                            ? STATUS_COLOR[st]
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {students.length > 0 && (
        <div className="flex items-center gap-3">
          <Button onClick={handleSave} loading={saving}>
            Save attendance
          </Button>

          {saved && (
            <span className="text-sm text-emerald-600">
              Saved.
            </span>
          )}
        </div>
      )}
    </div>
  );
}
