import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { cbtGetExamQuestions, cbtSubmitAnswer, cbtSubmitExam } from "../../services/cbt";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";

interface QuestionGroup {
  question_id: string;
  question_text: string;
  marks: number;
  options: { option_id: string; option_text: string }[];
}

export default function CbtExamPage() {
  const { schoolSlug, sessionId } = useParams();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<QuestionGroup[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ score: number; max_score: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submittedRef = useRef(false);

  const token = schoolSlug ? localStorage.getItem(`cbt_token_${schoolSlug}`) : null;

  useEffect(() => {
    if (!token || !sessionId) { navigate(`/cbt/${schoolSlug}`, { replace: true }); return; }
    cbtGetExamQuestions(token, sessionId)
      .then((rows) => {
        const grouped = new Map<string, QuestionGroup>();
        for (const r of rows) {
          if (!grouped.has(r.question_id)) grouped.set(r.question_id, { question_id: r.question_id, question_text: r.question_text, marks: r.marks, options: [] });
          grouped.get(r.question_id)!.options.push({ option_id: r.option_id, option_text: r.option_text });
        }
        setQuestions(Array.from(grouped.values()));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleSelect(questionId: string, optionId: string) {
    setAnswers((a) => ({ ...a, [questionId]: optionId }));
    if (token && sessionId) await cbtSubmitAnswer(token, sessionId, questionId, optionId);
  }

  async function handleSubmit() {
    if (!token || !sessionId || submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    const { result, error } = await cbtSubmitExam(token, sessionId);
    setSubmitting(false);
    if (error) { setError(error); return; }
    setResult(result);
  }

  if (loading) return <p className="p-6 text-center text-sm text-slate-400">Loading exam…</p>;

  if (result) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="max-w-sm text-center">
          <h1 className="font-display text-lg font-bold">Exam submitted</h1>
          <p className="mt-3 font-display text-3xl font-bold text-brand-600">{result.score} / {result.max_score}</p>
          <p className="mt-2 text-sm text-slate-500">Your score has been recorded.</p>
          <Button className="mt-4" onClick={() => navigate(`/cbt/${schoolSlug}/exams`)}>Back to exams</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 pb-24 sm:p-6">
      <div className="sticky top-0 z-10 -mx-4 border-b border-slate-200 bg-white px-4 py-3 sm:-mx-6 sm:px-6">
        <ExamTimer sessionId={sessionId!} onExpire={handleSubmit} />
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      {questions.map((q, i) => (
        <Card key={q.question_id}>
          <p className="mb-3 text-sm font-medium">{i + 1}. {q.question_text} <span className="text-xs text-slate-400">({q.marks} mark{q.marks === 1 ? "" : "s"})</span></p>
          <div className="space-y-2">
            {q.options.map((o) => (
              <label key={o.option_id} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${answers[q.question_id] === o.option_id ? "border-brand-500 bg-brand-50" : "border-slate-200"}`}>
                <input type="radio" name={q.question_id} checked={answers[q.question_id] === o.option_id}
                  onChange={() => handleSelect(q.question_id, o.option_id)} />
                {o.option_text}
              </label>
            ))}
          </div>
        </Card>
      ))}

      <Button onClick={handleSubmit} loading={submitting} className="w-full">Submit exam</Button>
    </div>
  );
}

function ExamTimer({ sessionId, onExpire }: { sessionId: string; onExpire: () => void }) {
  const [remaining, setRemaining] = useState<number | null>(null);
  const expiredRef = useRef(false);

  useEffect(() => {
    const stored = localStorage.getItem(`cbt_expires_${sessionId}`);
    const expiresAt = stored ? new Date(stored).getTime() : Date.now() + 30 * 60 * 1000;

    const tick = () => {
      const secondsLeft = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setRemaining(secondsLeft);
      if (secondsLeft === 0 && !expiredRef.current) {
        expiredRef.current = true;
        onExpire();
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [sessionId]);

  if (remaining === null) return null;
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  return (
    <p className={`text-center font-display text-lg font-bold ${remaining < 60 ? "text-rose-600" : "text-slate-800"}`}>
      {minutes}:{seconds.toString().padStart(2, "0")}
    </p>
  );
}