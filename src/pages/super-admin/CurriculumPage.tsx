import { useEffect, useState } from "react";
import { SchoolClass, Subject, listClasses, createClass, listSubjects, createSubject } from "../../services/academic";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";

export default function CurriculumPage() {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadAll() {
    setLoading(true);
    const [c, s] = await Promise.all([listClasses(), listSubjects()]);
    setClasses(c); setSubjects(s);
    setLoading(false);
  }
  useEffect(() => { loadAll(); }, []);

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div>
        <h1 className="font-display text-xl font-bold">Curriculum</h1>
        <p className="text-sm text-slate-500">
          Classes and subjects are shared platform-wide — every school automatically sees what's created here.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <ClassesPanel classes={classes} onChanged={loadAll} />
          <SubjectsPanel subjects={subjects} onChanged={loadAll} />
        </div>
      )}
    </div>
  );
}

function ClassesPanel({ classes, onChanged }: { classes: SchoolClass[]; onChanged: () => void }) {
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
        <Button onClick={async () => { if (!name) return; await createClass(name, arm); setName(""); setArm(""); onChanged(); }}>Add</Button>
      </div>
    </Card>
  );
}

function SubjectsPanel({ subjects, onChanged }: { subjects: Subject[]; onChanged: () => void }) {
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
        <Button onClick={async () => { if (!name) return; await createSubject(name, code); setName(""); setCode(""); onChanged(); }}>Add</Button>
      </div>
    </Card>
  );
}
