import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  getSchoolBySlug, getPublicClasses, uploadApplicationFile, submitApplication,
  PublicSchool, PublicClass
} from "../../services/admissions";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";

export default function ApplyPage() {
  const { schoolSlug } = useParams();
  const [school, setSchool] = useState<PublicSchool | null | "not-found">(null);
  const [classes, setClasses] = useState<PublicClass[]>([]);
  const [form, setForm] = useState({
    applicantName: "", dateOfBirth: "", gender: "", guardianName: "",
    guardianPhone: "", guardianEmail: "", classAppliedFor: ""
  });
  const [passportFile, setPassportFile] = useState<File | null>(null);
  const [documentFiles, setDocumentFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!schoolSlug) return;
    getSchoolBySlug(schoolSlug).then((s) => {
      setSchool(s ?? "not-found");
      if (s) getPublicClasses(s.id).then(setClasses);
    });
  }, [schoolSlug]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (school === "not-found" || !school) return;
    setSubmitting(true);
    setError(null);

    let passportPath: string | null = null;
    if (passportFile) {
      const { path, error: upErr } = await uploadApplicationFile(school.id, passportFile);
      if (upErr) { setError(upErr); setSubmitting(false); return; }
      passportPath = path;
    }
    const documentPaths: string[] = [];
    for (const f of documentFiles) {
      const { path, error: upErr } = await uploadApplicationFile(school.id, f);
      if (upErr) { setError(upErr); setSubmitting(false); return; }
      if (path) documentPaths.push(path);
    }

    const { error: subErr } = await submitApplication({ schoolId: school.id, passportPath, documentPaths, ...form });
    setSubmitting(false);
    if (subErr) { setError(subErr.message); return; }
    setDone(true);
  }

  if (school === null) return <p className="p-6 text-center text-sm text-slate-400">Loading…</p>;
  if (school === "not-found") return <p className="p-6 text-center text-sm text-slate-500">This admissions link isn't valid or the school isn't currently accepting applications.</p>;

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="max-w-sm text-center">
          <h1 className="font-display text-lg font-bold">Application received</h1>
          <p className="mt-2 text-sm text-slate-500">
            {school.name} will review your application and contact your guardian's phone or email with next steps.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen justify-center bg-slate-50 px-4 py-10">
      <Card className="w-full max-w-lg">
        <div className="mb-6 text-center">
          {school.logo_url && <img src={school.logo_url} alt="" className="mx-auto mb-2 h-12 w-12 object-contain" />}
          <h1 className="font-display text-xl font-bold">{school.name}</h1>
          <p className="text-sm text-slate-500">{school.motto || "Admission Application"}</p>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2">
          <input required placeholder="Applicant full name" value={form.applicantName}
            onChange={(e) => setForm({ ...form, applicantName: e.target.value })}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-2" />
          <input type="date" placeholder="Date of birth" value={form.dateOfBirth}
            onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="">Gender</option><option>Male</option><option>Female</option>
          </select>
          <select required value={form.classAppliedFor} onChange={(e) => setForm({ ...form, classAppliedFor: e.target.value })}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-2">
            <option value="">Class applying for…</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}{c.arm ? ` ${c.arm}` : ""}</option>)}
          </select>
          <hr className="border-slate-200 sm:col-span-2" />
          <input required placeholder="Guardian full name" value={form.guardianName}
            onChange={(e) => setForm({ ...form, guardianName: e.target.value })}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-2" />
          <input required type="tel" placeholder="Guardian phone" value={form.guardianPhone}
            onChange={(e) => setForm({ ...form, guardianPhone: e.target.value })}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <input type="email" placeholder="Guardian email" value={form.guardianEmail}
            onChange={(e) => setForm({ ...form, guardianEmail: e.target.value })}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <hr className="border-slate-200 sm:col-span-2" />
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Passport photo</label>
            <input type="file" accept="image/*" onChange={(e) => setPassportFile(e.target.files?.[0] ?? null)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Supporting documents (optional)</label>
            <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setDocumentFiles(Array.from(e.target.files ?? []))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
          {error && <p className="text-sm text-rose-600 sm:col-span-2">{error}</p>}
          <Button type="submit" loading={submitting} className="sm:col-span-2">Submit application</Button>
        </form>
      </Card>
    </div>
  );
}
