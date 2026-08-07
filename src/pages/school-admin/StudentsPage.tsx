import { useEffect, useState } from "react";
import { Student, listStudents, createStudent } from "../../services/students";
import { listClasses, listSessions, SchoolClass, Session } from "../../services/academic";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { SearchBar } from "../../components/shared/SearchBar";

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filterClass, setFilterClass] = useState("");
  const [search, setSearch] = useState("");

  async function load() {
    setLoading(true);
    const [s, c, sess] = await Promise.all([listStudents(filterClass || undefined, search || undefined), listClasses(), listSessions()]);
    setStudents(s); setClasses(c); setSessions(sess);
    setLoading(false);
  }
  useEffect(() => { load(); }, [filterClass, search]);

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold">Students</h1>
          <p className="text-sm text-slate-500">{students.length} student{students.length === 1 ? "" : "s"}</p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>{showForm ? "Close" : "Add student"}</Button>
      </div>

      {showForm && (
        <NewStudentForm
          classes={classes}
          sessions={sessions}
          onCreated={() => { setShowForm(false); load(); }}
        />
      )}

      <div className="flex flex-wrap gap-2">
        <SearchBar placeholder="Search by name or admission number…" onSearch={setSearch} />
        <select value={filterClass} onChange={(e) => setFilterClass(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">
          <option value="">All classes</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}{c.arm ? ` ${c.arm}` : ""}</option>)}
        </select>
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[600px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr><th className="px-4 py-3">Admission No.</th><th className="px-4 py-3">Name</th><th className="px-4 py-3">Gender</th><th className="px-4 py-3">Status</th></tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">Loading…</td></tr>}
            {!loading && students.length === 0 && <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">No students yet.</td></tr>}
            {students.map((s) => (
              <tr key={s.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3 font-mono text-xs">{s.admission_number}</td>
                <td className="px-4 py-3 font-medium">{s.full_name}</td>
                <td className="px-4 py-3 text-slate-500">{s.gender || "—"}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">{s.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function NewStudentForm({
  classes, sessions, onCreated
}: { classes: SchoolClass[]; sessions: Session[]; onCreated: () => void }) {
  const [form, setForm] = useState({ fullName: "", dateOfBirth: "", gender: "", classId: "", sessionId: "", address: "" });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { error } = await createStudent(form);
    setSaving(false);
    if (error) { setError(error.message); return; }
    onCreated();
  }

  return (
    <Card>
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
        <input required placeholder="Full name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-2" />
        <input type="date" placeholder="Date of birth" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <option value="">Gender</option><option>Male</option><option>Female</option>
        </select>
        <select required value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <option value="">Class…</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}{c.arm ? ` ${c.arm}` : ""}</option>)}
        </select>
        <select required value={form.sessionId} onChange={(e) => setForm({ ...form, sessionId: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <option value="">Session…</option>
          {sessions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <input placeholder="Address (optional)" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-2" />
        {error && <p className="text-sm text-rose-600 sm:col-span-2">{error}</p>}
        <Button type="submit" loading={saving} className="sm:col-span-2">Create student — admission number auto-generated</Button>
      </form>
    </Card>
  );
}
