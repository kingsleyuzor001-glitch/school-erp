import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  listLessonNotes,
  uploadLessonNote,
  getSignedNoteUrl,
  LessonNote
} from "../../services/lessonNotes";
import { listClasses, listSubjects } from "../../services/academic";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";

export default function LessonNotesPage() {
  const { profile } = useAuth();
  const [notes, setNotes] = useState<LessonNote[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [openingId, setOpeningId] = useState<string | null>(null);

  async function load() {
    setLoading(true);

    try {
      const [n, c, sub] = await Promise.all([
        listLessonNotes(),
        listClasses(),
        listSubjects()
      ]);

      setNotes(n);
      setClasses(c);
      setSubjects(sub);
    } catch (error) {
      console.error("Failed to load lesson notes:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function openNote(note: LessonNote) {
    if (!note.file_url) {
      alert("This lesson note does not have a file attached.");
      return;
    }

    try {
      setOpeningId(note.id);

      const signedUrl = await getSignedNoteUrl(note.file_url);

      window.open(signedUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      console.error("Failed to open lesson note:", error);
      alert("Unable to open this lesson note. Please try again.");
    } finally {
      setOpeningId(null);
    }
  }

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold">Lesson Notes</h1>
          <p className="text-sm text-slate-500">
            Shared platform-wide, organized by class, subject, and week.
          </p>
        </div>

        {profile?.role === "super_admin" && (
          <Button onClick={() => setShowForm((v) => !v)}>
            {showForm ? "Close" : "Upload note"}
          </Button>
        )}
      </div>

      {showForm && profile && (
        <UploadForm
          teacherId={profile.id}
          classes={classes}
          subjects={subjects}
          onUploaded={() => {
            setShowForm(false);
            load();
          }}
        />
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {loading && (
          <p className="text-sm text-slate-400">
            Loading…
          </p>
        )}

        {!loading && notes.length === 0 && (
          <p className="text-sm text-slate-400">
            No lesson notes yet.
          </p>
        )}

        {notes.map((n) => (
          <Card key={n.id}>
            <p className="font-medium">{n.title}</p>

            <p className="mt-1 text-xs text-slate-500">
              Week {n.week ?? "—"} · {n.file_type || "File"}
            </p>

            <p className="mt-2 text-xs text-slate-400">
              {new Date(n.created_at).toLocaleDateString()}
            </p>

            <div className="mt-4">
              <Button
                type="button"
                onClick={() => openNote(n)}
                loading={openingId === n.id}
                className="w-full cursor-pointer"
              >
                {openingId === n.id ? "Opening…" : "Open lesson note"}
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function UploadForm({
  teacherId,
  classes,
  subjects,
  onUploaded
}: {
  teacherId: string;
  classes: any[];
  subjects: any[];
  onUploaded: () => void;
}) {
  const [form, setForm] = useState({
    classId: "",
    subjectId: "",
    week: "1",
    title: ""
  });

  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    if (!file) return;

    setSaving(true);
    setError(null);

    const { error } = await uploadLessonNote({
      teacherId,
      classId: form.classId,
      subjectId: form.subjectId,
      week: Number(form.week),
      title: form.title,
      file
    });

    setSaving(false);

    if (error) {
      setError(error);
      return;
    }

    onUploaded();
  }

  return (
    <Card>
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
        <input
          required
          placeholder="Title"
          value={form.title}
          onChange={(e) =>
            setForm({ ...form, title: e.target.value })
          }
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-2"
        />

        <select
          required
          value={form.classId}
          onChange={(e) =>
            setForm({ ...form, classId: e.target.value })
          }
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Class…</option>

          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.arm ? ` ${c.arm}` : ""}
            </option>
          ))}
        </select>

        <select
          required
          value={form.subjectId}
          onChange={(e) =>
            setForm({ ...form, subjectId: e.target.value })
          }
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Subject…</option>

          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        <input
          type="number"
          min={1}
          max={16}
          value={form.week}
          onChange={(e) =>
            setForm({ ...form, week: e.target.value })
          }
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          placeholder="Week"
        />

        <input
          required
          type="file"
          accept=".pdf,.doc,.docx,image/*"
          onChange={(e) =>
            setFile(e.target.files?.[0] ?? null)
          }
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />

        {error && (
          <p className="text-sm text-rose-600 sm:col-span-2">
            {error}
          </p>
        )}

        <Button
          type="submit"
          loading={saving}
          className="sm:col-span-2"
        >
          Upload
        </Button>
      </form>
    </Card>
  );
}
