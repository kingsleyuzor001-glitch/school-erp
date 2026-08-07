import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { listLessonNotes, uploadLessonNote, LessonNote } from "../../services/lessonNotes";
import { listMyClasses } from "../../services/attendance";
import { listSubjects, listSessions, listTerms } from "../../services/academic";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";

export default function LessonNotesPage() {
  const { profile } = useAuth();
  const [notes, setNotes] = useState<LessonNote[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [n, c, sub, sess, t] = await Promise.all([
      listLessonNotes(), listMyClasses(), listSubjects(), listSessions(), listTerms()
    ]);
    setNotes(n); setClasses(c); setSubjects(sub); setSessions(sess); setTerms(t);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold">Lesson Notes</h1>
          <p className="text-sm text-slate-500">Organized by class, subject, and week.</p>
        </div>
        {profile?.role === "teacher" && (
          <Button onClick={() => setShowForm((v) => !v)}>{showForm ? "Close" : "Upload note"}</Button>
        )}
      </div>

      {showForm && profile && (
        <UploadForm
          profile={profile} classes={classes} subjects={subjects} sessions={sessions} terms={terms}
          onUploaded={() => { setShowForm(false); load(); }}
        />
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {loading && <p className="text-sm text-slate-400">Loading…</p>}
        {!loading && notes.length === 0 && <p className="text-sm text-slate-400">No lesson notes yet.</p>}
        {notes.map((n) => (
          <Card key={n.id}>
            <p className="font-medium">{n.title}</p>
            <p className="mt-1 text-xs text-slate-500">Week {n.week ?? "—"} · {n.file_type}</p>
            <p className="mt-2 text-xs text-slate-400">{new Date(n.created_at).toLocaleDateString()}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}

function UploadForm({
  profile, classes, subjects, sessions, terms, onUploaded
}: { profile: { id: string; school_id: string | null }; classes: any[]; subjects: any[]; sessions: any[]; terms: any[]; onUploaded: () => void }) {
  const [form, setForm] = useState({ classId: "", subjectId: "", sessionId: "", termId: "", week: "1", title: "" });
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !profile.school_id) return;
    setSaving(true);
    const { error } = await uploadLessonNote({
      schoolId: profile.school_id, teacherId: profile.id, classId: form.classId, subjectId: form.subjectId,
      sessionId: form.sessionId, termId: form.termId, week: Number(form.week), title: form.title, file
    });
    setSaving(false);
    if (error) { setError(error); return; }
    onUploaded();
  }

  return (
    <Card>
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
        <input required placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-2" />
        <select required value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <option value="">Class…</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}{c.arm ? ` ${c.arm}` : ""}</option>)}
        </select>
        <select required value={form.subjectId} onChange={(e) => setForm({ ...form, subjectId: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <option value="">Subject…</option>{subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select required value={form.sessionId} onChange={(e) => setForm({ ...form, sessionId: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <option value="">Session…</option>{sessions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select required value={form.termId} onChange={(e) => setForm({ ...form, termId: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <option value="">Term…</option>{terms.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <input type="number" min={1} max={16} value={form.week} onChange={(e) => setForm({ ...form, week: e.target.value })}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Week" />
        <input required type="file" accept=".pdf,.doc,.docx,image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-2" />
        {error && <p className="text-sm text-rose-600 sm:col-span-2">{error}</p>}
        <Button type="submit" loading={saving} className="sm:col-span-2">Upload</Button>
      </form>
    </Card>
  );
}
