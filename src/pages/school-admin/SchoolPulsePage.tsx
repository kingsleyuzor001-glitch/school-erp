import { useEffect, useState } from "react";
import { listTerms } from "../../services/academic";
import { getSchoolPulse, getAtRiskStudents, SchoolPulse, AtRiskStudent } from "../../services/pulse";
import { Card, StatCard } from "../../components/ui/Card";

const fmt = (n: number) => `₦${n.toLocaleString("en-NG", { minimumFractionDigits: 0 })}`;

function healthColor(pct: number) {
  if (pct >= 85) return "text-emerald-600";
  if (pct >= 70) return "text-amber-600";
  return "text-rose-600";
}

export default function SchoolPulsePage() {
  const [terms, setTerms] = useState<any[]>([]);
  const [termId, setTermId] = useState("");
  const [pulse, setPulse] = useState<SchoolPulse | null>(null);
  const [atRisk, setAtRisk] = useState<AtRiskStudent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listTerms().then((t) => {
      setTerms(t);
      if (t.length) setTermId((t.find((x: any) => x.is_current) ?? t[0]).id);
    });
  }, []);

  useEffect(() => {
    if (!termId) return;
    setLoading(true);
    Promise.all([getSchoolPulse(termId), getAtRiskStudents(termId)]).then(([p, r]) => {
      setPulse(p); setAtRisk(r); setLoading(false);
    });
  }, [termId]);

  const collectionRate = pulse && pulse.fee_expected > 0 ? Math.round((pulse.fee_collected / pulse.fee_expected) * 100) : 0;
  const staffRate = pulse && pulse.staff_total > 0 ? Math.round((pulse.staff_present_today / pulse.staff_total) * 100) : 0;

  const actionItems: string[] = [];
  if (pulse) {
    if (pulse.classes_not_marked_today > 0) actionItems.push(`${pulse.classes_not_marked_today} class${pulse.classes_not_marked_today > 1 ? "es" : ""} haven't marked attendance today.`);
    if (pulse.staff_absent_today > 0) actionItems.push(`${pulse.staff_absent_today} staff absent today.`);
    if (pulse.teachers_unsubmitted_results > 0) actionItems.push(`${pulse.teachers_unsubmitted_results} subject/class combinations haven't submitted results this term.`);
    if (pulse.fee_outstanding > 0) actionItems.push(`${fmt(pulse.fee_outstanding)} in fees still outstanding this term.`);
    if (pulse.at_risk_count > 0) actionItems.push(`${pulse.at_risk_count} student${pulse.at_risk_count > 1 ? "s" : ""} flagged as needing academic attention.`);
  }

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="font-display text-xl font-bold">School Pulse</h1>
          <p className="text-sm text-slate-500">How is my school doing today?</p>
        </div>
        <select value={termId} onChange={(e) => setTermId(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">
          {terms.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>

      {loading || !pulse ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Attendance today" value={`${pulse.attendance_rate_today}%`} />
            <StatCard label="Staff present today" value={`${staffRate}%`} />
            <StatCard label="Fee collection (term)" value={`${collectionRate}%`} />
            <StatCard label="Academic average" value={`${pulse.academic_average}%`} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <h2 className="mb-3 font-display text-base font-semibold">Today</h2>
              <ul className="space-y-1.5 text-sm text-slate-600">
                <li>{pulse.students_present_today} of {pulse.students_total} students present</li>
                <li>{pulse.students_absent_today} students absent</li>
                <li>{pulse.staff_present_today} of {pulse.staff_total} staff clocked in</li>
                <li className={pulse.classes_not_marked_today > 0 ? "font-medium text-amber-600" : ""}>
                  {pulse.classes_not_marked_today} class{pulse.classes_not_marked_today !== 1 ? "es" : ""} haven't marked attendance
                </li>
              </ul>
            </Card>

            <Card>
              <h2 className="mb-3 font-display text-base font-semibold">Finance</h2>
              <ul className="space-y-1.5 text-sm text-slate-600">
                <li>{fmt(pulse.fee_collected)} collected so far</li>
                <li>{fmt(pulse.fee_outstanding)} outstanding</li>
                <li className={healthColor(collectionRate)}>{collectionRate}% collection rate this term</li>
              </ul>
            </Card>
          </div>

          {actionItems.length > 0 && (
            <Card>
              <h2 className="mb-3 font-display text-base font-semibold text-rose-700">🔥 Attention needed</h2>
              <ul className="space-y-1.5 text-sm text-slate-700">
                {actionItems.map((item, i) => <li key={i}>• {item}</li>)}
              </ul>
            </Card>
          )}

          <Card className="overflow-x-auto p-0">
            <div className="border-b border-slate-200 px-4 py-3">
              <h2 className="font-display text-base font-semibold">Students needing attention</h2>
              <p className="text-xs text-slate-500">Flagged by low attendance, a declining average, or an average below 50%.</p>
            </div>
            <table className="w-full min-w-[650px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Class</th>
                  <th className="px-4 py-3">Attendance</th>
                  <th className="px-4 py-3">Current avg</th>
                  <th className="px-4 py-3">Trend</th>
                  <th className="px-4 py-3">Risk</th>
                </tr>
              </thead>
              <tbody>
                {atRisk.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400">No students currently flagged — nice work.</td></tr>
                )}
                {atRisk.map((s) => (
                  <tr key={s.student_id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 font-medium">{s.full_name}</td>
                    <td className="px-4 py-3 text-slate-500">{s.class_name}</td>
                    <td className={`px-4 py-3 ${s.attendance_rate < 80 ? "text-rose-600 font-medium" : ""}`}>{s.attendance_rate}%</td>
                    <td className={`px-4 py-3 ${s.current_average < 50 ? "text-rose-600 font-medium" : ""}`}>{s.current_average}%</td>
                    <td className="px-4 py-3 text-slate-500">
                      {s.trend === "declining" ? "↓ Declining" : s.trend === "improving" ? "↑ Improving" : "→ Stable"}
                      {s.previous_average != null && <span className="ml-1 text-xs text-slate-400">(was {s.previous_average}%)</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.risk_level === "HIGH" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}>
                        {s.risk_level}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  );
}