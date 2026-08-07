import { useEffect, useState } from "react";
import { listTerms } from "../../services/academic";
import { listPendingBatches, approveResults, publishResults } from "../../services/results";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";

export function ApproveResultsPage() {
  return <ResultsQueue stage="submitted" title="Approve Results" actionLabel="Approve" />;
}

export function PublishResultsPage() {
  return <ResultsQueue stage="approved" title="Publish Results" actionLabel="Publish" />;
}

function ResultsQueue({
  stage, title, actionLabel
}: { stage: "submitted" | "approved"; title: string; actionLabel: string }) {
  const [terms, setTerms] = useState<any[]>([]);
  const [termId, setTermId] = useState("");
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  useEffect(() => { listTerms().then((t) => { setTerms(t); if (t.length) setTermId((t.find((x: any) => x.is_current) ?? t[0]).id); }); }, []);

  async function load() {
    if (!termId) return;
    setLoading(true);
    let data = await listPendingBatches(stage, termId);
    if (stage === "approved") {
      // publish_results() operates on a whole class+term at once, so
      // collapse to one row per class rather than one per subject —
      // otherwise it'd look like each row publishes just that subject.
      const byClass = new Map<string, any>();
      for (const row of data) if (!byClass.has(row.class_id)) byClass.set(row.class_id, row);
      data = Array.from(byClass.values());
    }
    setBatches(data);
    setLoading(false);
  }
  useEffect(() => { load(); }, [termId]);

  async function act(classId: string, subjectId: string) {
    const key = `${classId}:${subjectId}`;
    setBusyKey(key);
    const { error } = stage === "submitted" ? await approveResults(classId, subjectId, termId) : await publishResults(classId, termId);
    if (error) alert(error.message);
    await load();
    setBusyKey(null);
  }

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div>
        <h1 className="font-display text-xl font-bold">{title}</h1>
        <p className="text-sm text-slate-500">
          {stage === "submitted" ? "Results waiting for principal sign-off." : "Approved results ready to release to parents and students."}
        </p>
      </div>

      <select value={termId} onChange={(e) => setTermId(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">
        {terms.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
      </select>

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[500px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr><th className="px-4 py-3">Class</th><th className="px-4 py-3">{stage === "approved" ? "Subjects" : "Subject"}</th><th className="px-4 py-3">Action</th></tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={3} className="px-4 py-6 text-center text-slate-400">Loading…</td></tr>}
            {!loading && batches.length === 0 && <tr><td colSpan={3} className="px-4 py-6 text-center text-slate-400">Nothing pending.</td></tr>}
            {batches.map((b) => {
              const key = `${b.class_id}:${b.subject_id}`;
              return (
                <tr key={key} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-medium">{b.classes?.name}{b.classes?.arm ? ` ${b.classes.arm}` : ""}</td>
                  <td className="px-4 py-3 text-slate-500">{stage === "approved" ? "All approved subjects" : b.subjects?.name}</td>
                  <td className="px-4 py-3">
                    <Button disabled={busyKey === key} onClick={() => act(b.class_id, b.subject_id)}>{actionLabel}</Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
