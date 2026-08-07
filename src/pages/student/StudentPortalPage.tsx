import { useEffect, useState } from "react";
import { getMyStudentRecord } from "../../services/portal";
import { getAttendanceHistory, AttendanceRecord } from "../../services/attendance";
import { Card, StatCard } from "../../components/ui/Card";

export default function StudentPortalPage() {
  const [student, setStudent] = useState<any>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyStudentRecord().then(async (s) => {
      setStudent(s);
      if (s) setAttendance(await getAttendanceHistory(s.id));
      setLoading(false);
    });
  }, []);

  if (loading) return <p className="p-6 text-sm text-slate-400">Loading…</p>;
  if (!student) return <p className="p-6 text-sm text-slate-400">No student record is linked to this account yet — contact the school office.</p>;

  const presentCount = attendance.filter((a) => a.status === "present").length;
  const attendanceRate = attendance.length ? Math.round((presentCount / attendance.length) * 100) : null;

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div>
        <h1 className="font-display text-xl font-bold">My Profile</h1>
      </div>

      <Card>
        <h2 className="font-display text-base font-semibold">{student.full_name}</h2>
        <p className="mt-1 text-sm text-slate-500">Admission No. {student.admission_number} · {student.status}</p>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Attendance rate" value={attendanceRate !== null ? `${attendanceRate}%` : "—"} />
        <StatCard label="Days recorded" value={attendance.length} />
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Status</th></tr>
          </thead>
          <tbody>
            {attendance.length === 0 && <tr><td colSpan={2} className="px-4 py-6 text-center text-slate-400">No attendance recorded yet.</td></tr>}
            {attendance.slice(0, 15).map((a) => (
              <tr key={a.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3">{new Date(a.date).toLocaleDateString()}</td>
                <td className="px-4 py-3 capitalize">{a.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <p className="text-sm text-slate-500">Your report card and lesson notes are available from their own tabs.</p>
    </div>
  );
}
