import { useEffect, useState } from "react";
import { listStudents, Student } from "../../services/students";
import { invitePortalUser } from "../../services/portal";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";

export default function PortalAccessPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [studentId, setStudentId] = useState("");
  const [parentForm, setParentForm] = useState({ email: "", fullName: "", relationship: "Parent" });
  const [studentForm, setStudentForm] = useState({ email: "" });
  const [busy, setBusy] = useState<"parent" | "student" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => { listStudents().then(setStudents); }, []);

  async function inviteParent(e: React.FormEvent) {
    e.preventDefault();
    if (!studentId) return;
    setBusy("parent"); setMessage(null);
    const { error } = await invitePortalUser({ kind: "parent", studentId, ...parentForm });
    setBusy(null);
    setMessage(error ?? "Parent invite sent.");
    if (!error) setParentForm({ email: "", fullName: "", relationship: "Parent" });
  }

  async function inviteStudent(e: React.FormEvent) {
    e.preventDefault();
    if (!studentId) return;
    setBusy("student"); setMessage(null);
    const { error } = await invitePortalUser({ kind: "student", studentId, email: studentForm.email });
    setBusy(null);
    setMessage(error ?? "Student portal invite sent.");
    if (!error) setStudentForm({ email: "" });
  }

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div>
        <h1 className="font-display text-xl font-bold">Portal Access</h1>
        <p className="text-sm text-slate-500">Give a parent or student a login for the parent/student portal.</p>
      </div>

      <select value={studentId} onChange={(e) => setStudentId(e.target.value)} className="w-full max-w-sm rounded-lg border border-slate-300 px-3 py-2 text-sm sm:w-auto">
        <option value="">Select a student…</option>
        {students.map((s) => <option key={s.id} value={s.id}>{s.full_name} ({s.admission_number})</option>)}
      </select>

      {message && <p className="text-sm text-slate-600">{message}</p>}

      {studentId && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <h2 className="mb-3 font-display text-base font-semibold">Invite parent/guardian</h2>
            <form onSubmit={inviteParent} className="space-y-3">
              <input required type="email" placeholder="Parent email" value={parentForm.email}
                onChange={(e) => setParentForm({ ...parentForm, email: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              <input required placeholder="Parent full name" value={parentForm.fullName}
                onChange={(e) => setParentForm({ ...parentForm, fullName: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              <select value={parentForm.relationship} onChange={(e) => setParentForm({ ...parentForm, relationship: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                <option>Parent</option><option>Guardian</option><option>Grandparent</option><option>Other</option>
              </select>
              <Button type="submit" loading={busy === "parent"} className="w-full">Send parent invite</Button>
            </form>
          </Card>

          <Card>
            <h2 className="mb-3 font-display text-base font-semibold">Give student their own login</h2>
            <p className="mb-3 text-xs text-slate-500">Only needed if the student should log in directly (older students, for example).</p>
            <form onSubmit={inviteStudent} className="space-y-3">
              <input required type="email" placeholder="Student email" value={studentForm.email}
                onChange={(e) => setStudentForm({ email: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              <Button type="submit" loading={busy === "student"} className="w-full">Send student invite</Button>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
