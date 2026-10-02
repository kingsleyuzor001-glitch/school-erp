import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { listStudents, Student } from "../../services/students";
import {
  Incident, HomeroomStudent,
  listIncidents, getMyHomeroomStudents, createIncident, updateIncident, deleteIncident
} from "../../services/incidents";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";

const CATEGORY_LABEL: Record<string, string> = {
  bullying: "Bullying", accident: "Accident", health: "Health", discipline: "Discipline", complaint: "Complaint", other: "Other"
};

function severityStyle(s: string) {
  if (s === "high") return "bg-rose-100 text-rose-700";
  if (s === "medium") return "bg-amber-100 text-amber-700";
  return "bg-slate-100 text-slate-600";
}

function statusStyle(s: string) {
  if (s === "open") return "bg-rose-100 text-rose-700";
  if (s === "under_review") return "bg-amber-100 text-amber-700";
  return "bg-emerald-100 text-emerald-700";
}

export default function IncidentsPage() {
  const { profile } = useAuth();
  const isStaffLeadership = profile && ["school_owner", "school_admin", "principal", "vice_principal", "super_admin"].includes(profile.role);

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [pickerStudents, setPickerStudents] = useState<(HomeroomStudent | Student)[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<Incident | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [form, setForm] = useState({ studentId: "", category: "discipline", severity: "low", description: "" });
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    const [i, students] = await Promise.all([
      listIncidents(),
      isStaffLeadership ? listStudents() : getMyHomeroomStudents().catch(() => [])
    ]);
    setIncidents(i);
    setPickerStudents(students);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!profile?.school_id || !profile?.id || !form.studentId) return;
    setBusy(true);
    const { error } = await createIncident({
      schoolId: profile.school_id, studentId: form.studentId, reportedBy: profile.id,
      category: form.category as Incident["category"], severity: form.severity as Incident["severity"],
      description: form.description
    });
    setBusy(false);
    setMessage(error ?? "Incident recorded.");
    if (!error) {
      setForm({ studentId: "", category: "discipline", severity: "low", description: "" });
      setShowForm(false);
      load();
    }
  }

  async function handleUpdate(patch: Parameters<typeof updateIncident>[1]) {
    if (!selected) return;
    const { error } = await updateIncident(selected.id, patch);
    if (!error) { setSelected(null); load(); }
    else setMessage(error);
  }

  async function handleDelete(id: string) {
    await deleteIncident(id);
    setSelected(null);
    load();
  }

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="font-display text-xl font-bold">Student Incidents</h1>
          <p className="text-sm text-slate-500">
            {isStaffLeadership ? "Confidential — visible to school leadership." : "You see only incidents for your own class."}
          </p>
        </div>
        <Button onClick={() => setShowForm((s) => !s)}>{showForm ? "Cancel" : "Report incident"}</Button>
      </div>

      {message && <p className="text-sm text-slate-600">{message}</p>}

      {showForm && (
        <Card>
          <h2 className="mb-3 font-display text-base font-semibold">Report an incident</h2>
          <form onSubmit={handleCreate} className="space-y-3">
            <select required value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="">Select student…</option>
              {pickerStudents.map((s) => <option key={s.id} value={s.id}>{s.full_name} ({s.admission_number})</option>)}
            </select>
            {!isStaffLeadership && pickerStudents.length === 0 && (
              <p className="text-xs text-amber-600">No homeroom class is assigned to you, so no students are available to select.</p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
                {Object.entries(CATEGORY_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
                <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
              </select>
            </div>
            <textarea required placeholder="What happened?" value={form.description} rows={4}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <Button type="submit" loading={busy}>Submit</Button>
          </form>
        </Card>
      )}

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Student</th><th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Severity</th><th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Reported</th><th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400">Loading…</td></tr>}
            {!loading && incidents.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400">No incidents recorded.</td></tr>}
            {incidents.map((i) => (
              <tr key={i.id} className="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50" onClick={() => setSelected(i)}>
                <td className="px-4 py-3 font-medium">{i.student_name} <span className="text-xs text-slate-400">{i.class_name}</span></td>
                <td className="px-4 py-3 text-slate-600">{CATEGORY_LABEL[i.category]}</td>
                <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${severityStyle(i.severity)}`}>{i.severity}</span></td>
                <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusStyle(i.status)}`}>{i.status.replace("_", " ")}</span></td>
                <td className="px-4 py-3 text-slate-500">{new Date(i.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-xs text-brand-600">View →</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {selected && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/30 px-4">
          <Card className="w-full max-w-lg">
            <div className="mb-3 flex items-start justify-between">
              <div>
                <h2 className="font-display text-base font-semibold">{selected.student_name}</h2>
                <p className="text-xs text-slate-500">{selected.class_name} · {CATEGORY_LABEL[selected.category]} · reported by {selected.reported_by_name ?? "—"}</p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${severityStyle(selected.severity)}`}>{selected.severity}</span>
            </div>

            <p className="mb-4 whitespace-pre-wrap text-sm text-slate-700">{selected.description}</p>

            {isStaffLeadership ? (
              <div className="space-y-3 border-t border-slate-100 pt-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">Action taken</label>
                  <textarea defaultValue={selected.action_taken ?? ""} rows={2} id="action-taken"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <select defaultValue={selected.status} id="status-select" className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
                    <option value="open">Open</option><option value="under_review">Under review</option><option value="resolved">Resolved</option>
                  </select>
                  <input type="date" defaultValue={selected.follow_up_date ?? ""} id="followup-date"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input type="checkbox" defaultChecked={selected.visible_to_parent} id="visible-checkbox" />
                  Share with parent
                </label>
                <div className="flex gap-2">
                  <Button onClick={() => {
                    const actionTaken = (document.getElementById("action-taken") as HTMLTextAreaElement).value;
                    const status = (document.getElementById("status-select") as HTMLSelectElement).value as Incident["status"];
                    const followUpDate = (document.getElementById("followup-date") as HTMLInputElement).value || null;
                    const visibleToParent = (document.getElementById("visible-checkbox") as HTMLInputElement).checked;
                    handleUpdate({ actionTaken, status, followUpDate, visibleToParent });
                  }}>Save</Button>
                  <Button variant="secondary" onClick={() => handleDelete(selected.id)}>Delete</Button>
                  <Button variant="secondary" onClick={() => setSelected(null)}>Close</Button>
                </div>
              </div>
            ) : (
              <div className="flex justify-end">
                <Button variant="secondary" onClick={() => setSelected(null)}>Close</Button>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}