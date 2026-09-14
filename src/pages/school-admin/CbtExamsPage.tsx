import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  CbtExam, CbtQuestion, CbtOption, listExams, createExam, publishExam, closeExam,
  listQuestions, addQuestion, listOptions, addOption, listExamSessions
} from "../../services/cbt";
import { listClasses, listSubjects, listTerms } from "../../services/academic";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";

export default function CbtExamsPage() {
  const { profile } = useAuth();
  const [exams, setExams] = useState<CbtExam[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [e, c, s, t] = await Promise.all([listExams(), listClasses(), listSubjects(), listTerms()]);
    setExams(e); setClasses(c); setSubjects(s); setTerms(t);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const selectedExam = exams.find((e) => e.id === selectedExamId);

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold">CBT Exams</h1>
          <p className="text-sm text-slate-500">Create exams, add multiple-choice questions, and publish for students.</p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>{showForm ? "Close" : "New exam"}</Button>
      </div>

      {showForm && profile?.school_id && (
        <NewExamForm
          schoolId={profile.school_id} createdBy={profile.id} classes={classes} subjects={subjects} terms={terms}
          onCreated={() => { setShowForm(false); load(); }}
        />
      )}

      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="p-0">
            <div className="border-b border-slate-100 p-4">
              <h2 className="font-display text-base font-semibold">Exams</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {exams.length === 0 && <p className="p-4 text-sm text-slate-400">No exams yet.</p>}
              {exams.map((e) => (
                <button
                  key={e.id}
                  onClick={() => setSelectedExamId(e.id)}
                  className={`block w-full px-4 py-3 text-left text-sm hover:bg-slate-50 ${selectedExamId === e.id ? "bg-brand-50" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{e.title}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      e.status === "published" ? "bg-emerald-100 text-emerald-700" :
                      e.status === "closed" ? "bg-slate-200 text-slate-600" : "bg-amber-100 text-amber-700"
                    }`}>{e.status}</span>
                  </div>
                  <p className="text-xs text-slate-500">{e.duration_minutes} min</p>
                </button>
              ))}
            </div>
          </Card>

          {selectedExam && (
            <ExamDetail exam={selectedExam} onChanged={load} />
          )}
        </div>
      )}
    </div>
  );
}

function NewExamForm({
  schoolId, createdBy, classes, subjects, terms, onCreated
}: { schoolId: string; createdBy: string; classes: any[]; subjects: any[]; terms: any[]; onCreated: () => void }) {
  const [form, setForm] = useState({ title: "", classId: "", subjectId: "", termId: "", durationMinutes: "30" });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { error } = await createExam({
      schoolId, createdBy, title: form.title, classId: form.classId, subjectId: form.subjectId,
      termId: form.termId, durationMinutes: Number(form.durationMinutes) || 30
    });
    setSaving(false);
    if (error) { setError(error.message); return; }
    onCreated();
  }

  return (
    <Card>
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
        <input required placeholder="Exam title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-2" />
        <select required value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <option value="">Class…</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}{c.arm ? ` ${c.arm}` : ""}</option>)}
        </select>
        <select required value={form.subjectId} onChange={(e) => setForm({ ...form, subjectId: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <option value="">Subject…</option>{subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select required value={form.termId} onChange={(e) => setForm({ ...form, termId: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <option value="">Term…</option>{terms.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <input type="number" min={5} max={180} value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })}
          placeholder="Duration (minutes)" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        {error && <p className="text-sm text-rose-600 sm:col-span-2">{error}</p>}
        <Button type="submit" loading={saving} className="sm:col-span-2">Create exam (draft)</Button>
      </form>
    </Card>
  );
}

function ExamDetail({ exam, onChanged }: { exam: CbtExam; onChanged: () => void }) {
  const [questions, setQuestions] = useState<CbtQuestion[]>([]);
  const [optionsByQuestion, setOptionsByQuestion] = useState<Record<string, CbtOption[]>>({});
  const [sessions, setSessions] = useState<any[]>([]);
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [tab, setTab] = useState<"questions" | "results">("questions");

  async function loadQuestions() {
    const qs = await listQuestions(exam.id);
    setQuestions(qs);
    const opts: Record<string, CbtOption[]> = {};
    for (const q of qs) opts[q.id] = await listOptions(q.id);
    setOptionsByQuestion(opts);
  }
  useEffect(() => { loadQuestions(); }, [exam.id]);
  useEffect(() => { if (tab === "results") listExamSessions(exam.id).then(setSessions); }, [tab, exam.id]);

  async function handlePublish() {
    if (questions.length === 0) { alert("Add at least one question before publishing."); return; }
    await publishExam(exam.id);
    onChanged();
  }

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-base font-semibold">{exam.title}</h2>
        <div className="flex gap-2">
          {exam.status === "draft" && <Button onClick={handlePublish}>Publish</Button>}
          {exam.status === "published" && <Button variant="secondary" onClick={async () => { await closeExam(exam.id); onChanged(); }}>Close</Button>}
        </div>
      </div>

      <div className="mb-3 flex gap-2 border-b border-slate-200">
        <button onClick={() => setTab("questions")} className={`px-2 py-1.5 text-sm font-medium ${tab === "questions" ? "border-b-2 border-brand-600 text-brand-700" : "text-slate-500"}`}>Questions</button>
        <button onClick={() => setTab("results")} className={`px-2 py-1.5 text-sm font-medium ${tab === "results" ? "border-b-2 border-brand-600 text-brand-700" : "text-slate-500"}`}>Results</button>
      </div>

      {tab === "questions" ? (
        <div className="space-y-3">
          {questions.map((q, i) => (
            <div key={q.id} className="rounded-lg border border-slate-200 p-3">
              <p className="text-sm font-medium">{i + 1}. {q.question_text} <span className="text-xs text-slate-400">({q.marks} mark{q.marks === 1 ? "" : "s"})</span></p>
              <ul className="mt-2 space-y-1">
                {(optionsByQuestion[q.id] || []).map((o) => (
                  <li key={o.id} className={`text-xs ${o.is_correct ? "font-medium text-emerald-700" : "text-slate-600"}`}>
                    {o.is_correct ? "✓ " : "— "}{o.option_text}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {exam.status === "draft" && (
            <>
              <Button variant="secondary" onClick={() => setShowAddQuestion((v) => !v)}>{showAddQuestion ? "Close" : "Add question"}</Button>
              {showAddQuestion && (
                <AddQuestionForm examId={exam.id} nextOrder={questions.length} onAdded={() => { setShowAddQuestion(false); loadQuestions(); }} />
              )}
            </>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-500"><tr><th className="py-1">Student</th><th className="py-1">Score</th><th className="py-1">Submitted</th></tr></thead>
            <tbody>
              {sessions.length === 0 && <tr><td colSpan={3} className="py-3 text-slate-400">No submissions yet.</td></tr>}
              {sessions.map((s) => (
                <tr key={s.id} className="border-t border-slate-100">
                  <td className="py-1.5">{s.students?.full_name} <span className="text-xs text-slate-400">{s.students?.admission_number}</span></td>
                  <td className="py-1.5">{s.score ?? "—"} / {s.max_score ?? "—"}</td>
                  <td className="py-1.5 text-xs text-slate-500">{s.submitted_at ? new Date(s.submitted_at).toLocaleString() : "In progress"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function AddQuestionForm({ examId, nextOrder, onAdded }: { examId: string; nextOrder: number; onAdded: () => void }) {
  const [text, setText] = useState("");
  const [marks, setMarks] = useState("1");
  const [options, setOptions] = useState([{ text: "", correct: false }, { text: "", correct: false }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateOption(i: number, field: "text" | "correct", value: string | boolean) {
    setOptions((opts) => opts.map((o, idx) => idx === i ? { ...o, [field]: value } : o));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!options.some((o) => o.correct)) { setError("Mark one option as correct."); return; }
    setSaving(true);
    const { data, error: qErr } = await addQuestion(examId, text, Number(marks) || 1, nextOrder);
    if (qErr || !data) { setSaving(false); setError(qErr?.message || "Failed to add question"); return; }
    for (let i = 0; i < options.length; i++) {
      if (options[i].text) await addOption(data.id, options[i].text, options[i].correct, i);
    }
    setSaving(false);
    onAdded();
  }

  return (
    <Card className="bg-slate-50">
      <form onSubmit={submit} className="space-y-3">
        <input required placeholder="Question text" value={text} onChange={(e) => setText(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <input type="number" min={1} value={marks} onChange={(e) => setMarks(e.target.value)} placeholder="Marks"
          className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        {options.map((o, i) => (
          <div key={i} className="flex items-center gap-2">
            <input type="radio" name="correct" checked={o.correct} onChange={() => setOptions((opts) => opts.map((x, idx) => ({ ...x, correct: idx === i })))} />
            <input required={i < 2} placeholder={`Option ${i + 1}`} value={o.text} onChange={(e) => updateOption(i, "text", e.target.value)}
              className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
          </div>
        ))}
        <button type="button" onClick={() => setOptions((opts) => [...opts, { text: "", correct: false }])} className="text-xs text-brand-600 hover:underline">
          + Add another option
        </button>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <Button type="submit" loading={saving}>Save question</Button>
      </form>
    </Card>
  );
}