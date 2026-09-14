import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { cbtListAvailableExams, cbtStartExam, cbtMyResults } from "../../services/cbt";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";

export default function CbtExamListPage() {
  const { schoolSlug } = useParams();
  const navigate = useNavigate();
  const [exams, setExams] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState<string | null>(null);

  const token = schoolSlug ? localStorage.getItem(`cbt_token_${schoolSlug}`) : null;

  useEffect(() => {
    if (!token || !schoolSlug) { navigate(`/cbt/${schoolSlug}`, { replace: true }); return; }
    Promise.all([cbtListAvailableExams(token), cbtMyResults(token)])
      .then(([e, r]) => { setExams(e); setResults(r); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleStart(examId: string) {
    if (!token || !schoolSlug) return;
    setStarting(examId);
    const { session, error } = await cbtStartExam(token, examId);
    setStarting(null);
    if (error || !session) { setError(error || "Could not start exam"); return; }
    localStorage.setItem(`cbt_expires_${session.session_id}`, session.expires_at);
    navigate(`/cbt/${schoolSlug}/exam/${session.session_id}`);
  }

  if (loading) return <p className="p-6 text-center text-sm text-slate-400">Loading…</p>;

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 sm:p-6">
      <div>
        <h1 className="font-display text-xl font-bold">Available Exams</h1>
        <p className="text-sm text-slate-500">One attempt per exam — once started, the timer cannot be paused.</p>
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <div className="space-y-3">
        {exams.length === 0 && <p className="text-sm text-slate-400">No exams available right now.</p>}
        {exams.map((e) => (
          <Card key={e.id} className="flex items-center justify-between">
            <div>
              <p className="font-medium">{e.title}</p>
              <p className="text-xs text-slate-500">{e.subject_name || "—"} · {e.duration_minutes} minutes</p>
            </div>
            {e.already_attempted ? (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">Completed</span>
            ) : (
              <Button disabled={starting === e.id} onClick={() => handleStart(e.id)}>
                {starting === e.id ? "Starting…" : "Start"}
              </Button>
            )}
          </Card>
        ))}
      </div>

      {results.length > 0 && (
        <div>
          <h2 className="mb-2 mt-6 font-display text-base font-semibold">Past Results</h2>
          <Card className="overflow-x-auto p-0">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <tr><th className="px-4 py-2">Exam</th><th className="px-4 py-2">Score</th><th className="px-4 py-2">Date</th></tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-2">{r.exam_title}</td>
                    <td className="px-4 py-2 font-semibold">{r.score} / {r.max_score}</td>
                    <td className="px-4 py-2 text-xs text-slate-500">{new Date(r.submitted_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}
    </div>
  );
}