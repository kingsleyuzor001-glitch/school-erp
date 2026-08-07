import { useEffect, useState } from "react";
import { getMyChildren } from "../../services/portal";
import { getAttendanceHistory, AttendanceRecord } from "../../services/attendance";
import { Card, StatCard } from "../../components/ui/Card";

export default function ParentPortalPage() {
  const [children, setChildren] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyChildren().then((c) => {
      setChildren(c);
      if (c.length) setSelectedId(c[0].id);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    getAttendanceHistory(selectedId).then(setAttendance);
  }, [selectedId]);

  const child = children.find((c) => c.id === selectedId);
  const presentCount = attendance.filter((a) => a.status === "present").length;
  const attendanceRate = attendance.length ? Math.round((presentCount / attendance.length) * 100) : null;

  if (loading) return <p className="p-6 text-sm text-slate-400">Loading…</p>;
  if (children.length === 0) return <p className="p-6 text-sm text-slate-400">No children linked to your account yet — contact the school office.</p>;

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-bold">My Children</h1>
        {children.length > 1 && (
          <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">
            {children.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
          </select>
        )}
      </div>

      {child && (
        <>
          <Card>
            <h2 className="font-display text-base font-semibold">{child.full_name}</h2>
            <p className="mt-1 text-sm text-slate-500">Admission No. {child.admission_number} · {child.status}</p>
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

          <p className="text-sm text-slate-500">
            Full report cards and lesson notes are available from the Results and Lesson Notes tabs.
          </p>
        </>
      )}
    </div>
  );
}
