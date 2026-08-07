import { useEffect, useState } from "react";
import {
  School, fetchSchools, approveSchool, suspendSchool, activateSchool, deleteSchool
} from "../../services/schools";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";

const STATUS_STYLE: Record<School["status"], string> = {
  pending: "bg-amber-100 text-amber-700",
  active: "bg-emerald-100 text-emerald-700",
  suspended: "bg-rose-100 text-rose-700",
  expired: "bg-slate-100 text-slate-600"
};

export default function SchoolsPage() {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setSchools(await fetchSchools());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function runAction(id: string, action: (id: string) => Promise<any>) {
    setBusyId(id);
    const { error } = await action(id);
    if (error) alert(error.message);
    await load();
    setBusyId(null);
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Permanently delete "${name}" and all of its data? This cannot be undone.`)) return;
    await runAction(id, deleteSchool);
  }

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div>
        <h1 className="font-display text-xl font-bold">Schools</h1>
        <p className="text-sm text-slate-500">Review registrations and manage school access.</p>
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">School</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Registered</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">Loading…</td></tr>
            )}
            {!loading && schools.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">No schools yet.</td></tr>
            )}
            {schools.map((s) => (
              <tr key={s.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3 font-medium">{s.name}</td>
                <td className="px-4 py-3 text-slate-500">{s.email}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[s.status]}`}>
                    {s.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500">{new Date(s.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    {s.status === "pending" && (
                      <Button variant="primary" disabled={busyId === s.id} onClick={() => runAction(s.id, approveSchool)}>
                        Approve
                      </Button>
                    )}
                    {s.status === "active" && (
                      <Button variant="secondary" disabled={busyId === s.id} onClick={() => runAction(s.id, suspendSchool)}>
                        Suspend
                      </Button>
                    )}
                    {s.status === "suspended" && (
                      <Button variant="secondary" disabled={busyId === s.id} onClick={() => runAction(s.id, activateSchool)}>
                        Reactivate
                      </Button>
                    )}
                    <Button variant="danger" disabled={busyId === s.id} onClick={() => handleDelete(s.id, s.name)}>
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
