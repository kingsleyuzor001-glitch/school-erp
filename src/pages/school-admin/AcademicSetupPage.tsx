import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { Session, Term, listSessions, createSession, setCurrentSession, listTerms, createTerm } from "../../services/academic";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";

export default function AcademicSetupPage() {
  const { profile } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadAll() {
    setLoading(true);
    const [s, t] = await Promise.all([listSessions(), listTerms()]);
    setSessions(s); setTerms(t);
    setLoading(false);
  }
  useEffect(() => { loadAll(); }, []);

  if (!profile?.school_id) return null;

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div>
        <h1 className="font-display text-xl font-bold">Academic Setup</h1>
        <p className="text-sm text-slate-500">
          Sessions and terms for your school. Classes, subjects, and lesson notes are managed
          platform-wide by the Super Admin and shared automatically across every school.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : (
        <SessionsTerms schoolId={profile.school_id} sessions={sessions} terms={terms} onChanged={loadAll} />
      )}
    </div>
  );
}

function SessionsTerms({
  schoolId, sessions, terms, onChanged
}: { schoolId: string; sessions: Session[]; terms: Term[]; onChanged: () => void }) {
  const [newSession, setNewSession] = useState("");
  const [termSession, setTermSession] = useState("");
  const [newTerm, setNewTerm] = useState("");

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <h2 className="mb-3 font-display text-base font-semibold">Sessions</h2>
        <ul className="mb-4 space-y-1">
          {sessions.map((s) => (
            <li key={s.id} className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50">
              <span>{s.name} {s.is_current && <span className="ml-1 rounded-full bg-brand-100 px-2 py-0.5 text-xs text-brand-700">current</span>}</span>
              {!s.is_current && (
                <button onClick={async () => { await setCurrentSession(schoolId, s.id); onChanged(); }} className="text-xs text-brand-600 hover:underline">
                  Set current
                </button>
              )}
            </li>
          ))}
          {sessions.length === 0 && <li className="text-sm text-slate-400">No sessions yet.</li>}
        </ul>
        <div className="flex gap-2">
          <input value={newSession} onChange={(e) => setNewSession(e.target.value)} placeholder="e.g. 2026/2027"
            className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
          <Button onClick={async () => { if (!newSession) return; await createSession(schoolId, newSession); setNewSession(""); onChanged(); }}>
            Add
          </Button>
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 font-display text-base font-semibold">Terms</h2>
        <ul className="mb-4 space-y-1">
          {terms.map((t) => (
            <li key={t.id} className="rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50">
              {t.name} {t.is_current && <span className="ml-1 rounded-full bg-brand-100 px-2 py-0.5 text-xs text-brand-700">current</span>}
            </li>
          ))}
          {terms.length === 0 && <li className="text-sm text-slate-400">No terms yet.</li>}
        </ul>
        <div className="space-y-2">
          <select value={termSession} onChange={(e) => setTermSession(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm">
            <option value="">Select session…</option>
            {sessions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <div className="flex gap-2">
            <input value={newTerm} onChange={(e) => setNewTerm(e.target.value)} placeholder="e.g. First Term"
              className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
            <Button
              onClick={async () => { if (!newTerm || !termSession) return; await createTerm(schoolId, termSession, newTerm); setNewTerm(""); onChanged(); }}
            >
              Add
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
