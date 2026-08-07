import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { listMyClasses, listStudentsForAttendance } from "../../services/attendance";
import { listSubjects, listTerms, listSessions } from "../../services/academic";
import { ResultScore, listResultsForEntry, saveScore, submitResults } from "../../services/results";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";

export default function ResultsEntryPage() {
  const { profile } = useAuth();
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [termId, setTermId] = useState("");
  const [students, setStudents] = useState<any[]>([]);
  const [scores, setScores] = useState<Record<string, Partial<ResultScore>>>({});
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([listMyClasses(), listSubjects(), listTerms(), listSessions()]).then(([c, s, t, sess]) => {
      setClasses(c); setSubjects(s); setTerms(t); setSessions(sess);
    });
  }, []);

  const currentSessionId = (sessions.find((s) => s.is_current) ?? sessions[0])?.id ?? "";

  useEffect(() => {
    if (!classId || !subjectId || !termId) return;
    (async () => {
      const [studentList, existing] = await Promise.all([
        listStudentsForAttendance(classId), listResultsForEntry(classId, subjectId, termId)
      ]);
      setStudents(studentList);
      const byStudent: Record<string, Partial<ResultScore>> = {};
      studentList.forEach((s: any) => {
        byStudent[s.id] = { assignment_score: 0, classwork_score: 0, ca_score: 0, exam_score: 0, teacher_comment: "" };
      });
      existing.forEach((r) => { byStudent[r.student_id] = r; });
      setScores(byStudent);
      setMessage(null);
    })();
  }, [classId, subjectId, termId]);

  function update(studentId: string, field: keyof ResultScore, value: string) {
    setScores((s) => ({ ...s, [studentId]: { ...s[studentId], [field]: Number(value) || value } }));
  }

  async function saveAll() {
    if (!profile?.school_id) return;
    setSaving(true);
    for (const [studentId, sc] of Object.entries(scores)) {
      await saveScore({
        schoolId: profile.school_id, studentId, subjectId, classId, sessionId: currentSessionId, termId,
        assignment: Number(sc.assignment_score) || 0, classwork: Number(sc.classwork_score) || 0,
        ca: Number(sc.ca_score) || 0, exam: Number(sc.exam_score) || 0,
        teacherComment: (sc.teacher_comment as string) || "", enteredBy: profile.id
      });
    }
    setSaving(false);
    setMessage("Draft saved.");
  }

  async function handleSubmit() {
    setSubmitting(true);
    await saveAll();
    const { error } = await submitResults(classId, subjectId, termId);
    setSubmitting(false);
    if (error) { setMessage(error.message); return; }
    setMessage("Submitted for principal approval.");
  }

  const total = (sc: Partial<ResultScore>) =>
    (Number(sc.assignment_score) || 0) + (Number(sc.classwork_score) || 0) + (Number(sc.ca_score) || 0) + (Number(sc.exam_score) || 0);

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div>
        <h1 className="font-display text-xl font-bold">Enter Results</h1>
        <p className="text-sm text-slate-500">Scores auto-calculate a total and grade; submit when ready for approval.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <select value={classId} onChange={(e) => setClassId(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">
          <option value="">Class…</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}{c.arm ? ` ${c.arm}` : ""}</option>)}
        </select>
        <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">
          <option value="">Subject…</option>{subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={termId} onChange={(e) => setTermId(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">
          <option value="">Term…</option>{terms.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>

      {students.length > 0 && (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-3">Student</th><th className="px-3 py-3">Assign.</th><th className="px-3 py-3">Classwork</th>
                <th className="px-3 py-3">CA</th><th className="px-3 py-3">Exam</th><th className="px-3 py-3">Total</th><th className="px-3 py-3">Comment</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => {
                const sc = scores[s.id] || {};
                return (
                  <tr key={s.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-3 py-2 font-medium">{s.full_name}</td>
                    {(["assignment_score", "classwork_score", "ca_score", "exam_score"] as const).map((f) => (
                      <td key={f} className="px-3 py-2">
                        <input type="number" min={0} max={100} value={sc[f] as number ?? 0}
                          onChange={(e) => update(s.id, f, e.target.value)}
                          className="w-16 rounded border border-slate-300 px-2 py-1 text-sm" />
                      </td>
                    ))}
                    <td className="px-3 py-2 font-semibold">{total(sc)}</td>
                    <td className="px-3 py-2">
                      <input value={sc.teacher_comment as string ?? ""} onChange={(e) => update(s.id, "teacher_comment", e.target.value)}
                        className="w-32 rounded border border-slate-300 px-2 py-1 text-sm" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      {students.length > 0 && (
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={saveAll} loading={saving}>Save draft</Button>
          <Button onClick={handleSubmit} loading={submitting}>Submit for approval</Button>
          {message && <span className="text-sm text-slate-500">{message}</span>}
        </div>
      )}
    </div>
  );
}
