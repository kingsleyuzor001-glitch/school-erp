import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  Session, Term, SchoolClass, Subject,
  listSessions, createSession, setCurrentSession,
  listTerms, createTerm, listClasses, createClass, listSubjects, createSubject
} from "../../services/academic";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";

const TABS = ["Sessions & Terms", "Classes", "Subjects"] as const;

export default function AcademicSetupPage() {
  const { profile } = useAuth();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Sessions & Terms");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadAll() {
    setLoading(true);
    const [s, t, c, sub] = await Promise.all([listSessions(), listTerms(), listClasses(), listSubjects()]);
    setSessions(s); setTerms(t); setClasses(c); setSubjects(sub);
    setLoading(false);
  }
  useEffect(() => { loadAll(); }, []);

  if (!profile?.school_id) return null;

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div>
        <h1 className="font-display text-xl font-bold">Academic Setup</h1>
        <p className="text-sm text-slate-500">Sessions, terms, classes, and subjects for your school.</p>
      </div>

      <div className="flex gap-2 border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-sm font-medium ${tab === t ? "border-b-2 border-brand-600 text-brand-700" : "text-slate-500"}`}
          >
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : tab === "Sessions & Terms" ? (
        <SessionsTerms
          schoolId={profile.school_id} sessions={sessions} terms={terms}
          onChanged={loadAll}
        />
      ) : tab === "Classes" ? (
        <ClassesTab schoolId={profile.school_id} classes={classes} onChanged={loadAll} />
      ) : (
        <SubjectsTab schoolId={profile.school_id} subjects={subjects} onChanged={loadAll} />
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

function ClassesTab({ schoolId, classes, onChanged }: { schoolId: string; classes: SchoolClass[]; onChanged: () => void }) {
  const [name, setName] = useState("");
  const [arm, setArm] = useState("");
  return (
    <Card>
      <h2 className="mb-3 font-display text-base font-semibold">Classes</h2>
      <table className="mb-4 w-full text-left text-sm">
        <thead className="text-xs uppercase text-slate-500"><tr><th className="py-1">Class</th><th className="py-1">Arm</th></tr></thead>
        <tbody>
          {classes.map((c) => <tr key={c.id} className="border-t border-slate-100"><td className="py-1.5">{c.name}</td><td className="py-1.5">{c.arm || "—"}</td></tr>)}
          {classes.length === 0 && <tr><td colSpan={2} className="py-3 text-slate-400">No classes yet.</td></tr>}
        </tbody>
      </table>
      <div className="flex gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Class name, e.g. JSS 1" className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
        <input value={arm} onChange={(e) => setArm(e.target.value)} placeholder="Arm (optional)" className="w-32 rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
        <Button onClick={async () => { if (!name) return; await createClass(schoolId, name, arm); setName(""); setArm(""); onChanged(); }}>Add</Button>
      </div>
    </Card>
  );
}

function SubjectsTab({ schoolId, subjects, onChanged }: { schoolId: string; subjects: Subject[]; onChanged: () => void }) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  return (
    <Card>
      <h2 className="mb-3 font-display text-base font-semibold">Subjects</h2>
      <table className="mb-4 w-full text-left text-sm">
        <thead className="text-xs uppercase text-slate-500"><tr><th className="py-1">Subject</th><th className="py-1">Code</th></tr></thead>
        <tbody>
          {subjects.map((s) => <tr key={s.id} className="border-t border-slate-100"><td className="py-1.5">{s.name}</td><td className="py-1.5">{s.code || "—"}</td></tr>)}
          {subjects.length === 0 && <tr><td colSpan={2} className="py-3 text-slate-400">No subjects yet.</td></tr>}
        </tbody>
      </table>
      <div className="flex gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Subject name" className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Code (optional)" className="w-32 rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
        <Button onClick={async () => { if (!name) return; await createSubject(schoolId, name, code); setName(""); setCode(""); onChanged(); }}>Add</Button>
      </div>
    </Card>
  );
}
