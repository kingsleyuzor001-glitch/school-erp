import { useEffect, useState } from "react";
import { StaffMember, listStaff, inviteStaff } from "../../services/staff";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";

const STAFF_ROLES = ["teacher", "vice_principal", "principal", "school_admin"];

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    setLoading(true);
    setStaff(await listStaff());
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold">Staff</h1>
          <p className="text-sm text-slate-500">{staff.length} member{staff.length === 1 ? "" : "s"}</p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>{showForm ? "Close" : "Invite staff"}</Button>
      </div>

      {showForm && <InviteForm onInvited={() => { setShowForm(false); load(); }} />}

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[600px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr><th className="px-4 py-3">Staff ID</th><th className="px-4 py-3">Name</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Department</th></tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">Loading…</td></tr>}
            {!loading && staff.length === 0 && <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">No staff yet.</td></tr>}
            {staff.map((s) => (
              <tr key={s.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3 font-mono text-xs">{s.staff_id_code}</td>
                <td className="px-4 py-3 font-medium">{s.profiles?.full_name}</td>
                <td className="px-4 py-3 text-slate-500">{s.profiles?.role}</td>
                <td className="px-4 py-3 text-slate-500">{s.department || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function InviteForm({ onInvited }: { onInvited: () => void }) {
  const [form, setForm] = useState({ email: "", fullName: "", role: "teacher", department: "", position: "", qualification: "" });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { error } = await inviteStaff(form);
    setSaving(false);
    if (error) { setError(error); return; }
    onInvited();
  }

  return (
    <Card>
      <p className="mb-3 text-sm text-slate-500">
        Sends an email invite. The staff member sets their own password and is created with the role you choose.
      </p>
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
        <input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-2" />
        <input required placeholder="Full name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          {STAFF_ROLES.map((r) => <option key={r} value={r}>{r.replace("_", " ")}</option>)}
        </select>
        <input placeholder="Department (optional)" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <input placeholder="Position (optional)" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        {error && <p className="text-sm text-rose-600 sm:col-span-2">{error}</p>}
        <Button type="submit" loading={saving} className="sm:col-span-2">Send invite</Button>
      </form>
    </Card>
  );
}
