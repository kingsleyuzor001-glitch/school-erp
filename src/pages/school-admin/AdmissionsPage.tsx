import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  listApplications, approveApplication, rejectApplication, getSignedApplicationFileUrl, AdmissionApplication
} from "../../services/admissions";
import { listClasses, listSessions } from "../../services/academic";
import { getStudentById } from "../../services/students";
import { getBranding } from "../../services/branding";
import { logDocumentGenerated } from "../../services/documents";
import { AdmissionLetterTemplate, AdmissionLetterData } from "../../components/documents/AdmissionLetterTemplate";
import { exportElementToPdf } from "../../lib/pdf";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";

const TABS = ["pending", "approved", "rejected"] as const;

export default function AdmissionsPage() {
  const { profile } = useAuth();
  const [tab, setTab] = useState<(typeof TABS)[number]>("pending");
  const [apps, setApps] = useState<AdmissionApplication[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [decisionState, setDecisionState] = useState<Record<string, { classId: string; sessionId: string; reason: string }>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [letterData, setLetterData] = useState<AdmissionLetterData | null>(null);
  const [letterStudentId, setLetterStudentId] = useState<string | null>(null);
  const letterRef = useRef<HTMLDivElement>(null);

  async function load() {
    setLoading(true);
    setApps(await listApplications(tab));
    setLoading(false);
  }
  useEffect(() => { load(); }, [tab]);
  useEffect(() => { listClasses().then(setClasses); listSessions().then(setSessions); }, []);

  function decisionFor(id: string) {
    return decisionState[id] ?? { classId: "", sessionId: (sessions.find((s) => s.is_current) ?? sessions[0])?.id ?? "", reason: "" };
  }

  async function handleApprove(id: string) {
    const d = decisionFor(id);
    if (!d.classId || !d.sessionId) { alert("Select a class and session first."); return; }
    setBusyId(id);
    const { error } = await approveApplication(id, d.classId, d.sessionId);
    setBusyId(null);
    if (error) { alert(error.message); return; }
    load();
  }

  async function handleReject(id: string) {
    const d = decisionFor(id);
    setBusyId(id);
    const { error } = await rejectApplication(id, d.reason);
    setBusyId(null);
    if (error) { alert(error.message); return; }
    load();
  }

  async function handleGenerateLetter(app: AdmissionApplication) {
    if (!profile?.school_id || !app.student_id) return;
    setBusyId(app.id);
    const [student, branding] = await Promise.all([getStudentById(app.student_id), getBranding(profile.school_id)]);
    setBusyId(null);
    if (!student || !branding) return;
    const cls = classes.find((c) => c.id === student.class_id);
    const session = sessions.find((s) => s.id === student.session_id);
    setLetterData({
      applicantName: app.applicant_name, admissionNumber: app.admission_number ?? "",
      className: cls ? `${cls.name}${cls.arm ? ` ${cls.arm}` : ""}` : "—",
      sessionName: session?.name ?? "—", schoolName: branding.name, schoolAddress: branding.address,
      schoolLogoUrl: branding.logo_url, principalSignatureUrl: branding.principal_signature_url,
      officialStampUrl: branding.official_stamp_url, brandColor: branding.brand_primary_color || "#0f766e",
      dateGenerated: new Date().toLocaleDateString()
    });
    setLetterStudentId(app.student_id);
  }

  // Renders off-screen once letterData is set, then exports — a ref
  // can't be attached to an element that doesn't exist yet, so the
  // export has to wait one render cycle after the data arrives.
  useEffect(() => {
    if (!letterData || !letterRef.current || !profile?.school_id || !letterStudentId) return;
    (async () => {
      await exportElementToPdf(letterRef.current!, `${letterData.admissionNumber}-admission-letter.pdf`, "a4");
      await logDocumentGenerated({
        schoolId: profile.school_id!, documentType: "admission_letter", generatedBy: profile.id,
        relatedStudentId: letterStudentId
      });
      setLetterData(null);
      setLetterStudentId(null);
    })();
  }, [letterData, letterStudentId]);

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div>
        <h1 className="font-display text-xl font-bold">Admissions</h1>
        <p className="text-sm text-slate-500">Review online applications and admit students.</p>
      </div>

      <div className="flex gap-2 border-b border-slate-200">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-2 text-sm font-medium capitalize ${tab === t ? "border-b-2 border-brand-600 text-brand-700" : "text-slate-500"}`}>
            {t}
          </button>
        ))}
      </div>

      {loading && <p className="text-sm text-slate-400">Loading…</p>}
      {!loading && apps.length === 0 && <p className="text-sm text-slate-400">No {tab} applications.</p>}

      <div className="space-y-3">
        {apps.map((app) => {
          const d = decisionFor(app.id);
          const expanded = expandedId === app.id;
          return (
            <Card key={app.id}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-display text-base font-semibold">{app.applicant_name}</p>
                  <p className="text-sm text-slate-500">{app.guardian_name} · {app.guardian_phone}</p>
                  {app.admission_number && <p className="mt-1 font-mono text-xs text-emerald-700">{app.admission_number}</p>}
                </div>
                <button onClick={() => setExpandedId(expanded ? null : app.id)} className="text-xs text-brand-600 hover:underline">
                  {expanded ? "Hide" : "Details"}
                </button>
              </div>

              {expanded && (
                <div className="mt-3 space-y-3 border-t border-slate-100 pt-3">
                  <p className="text-sm text-slate-600">DOB: {app.date_of_birth || "—"} · Gender: {app.gender || "—"}</p>
                  <p className="text-sm text-slate-600">Guardian email: {app.guardian_email || "—"}</p>
                  <DocumentLinks passportPath={app.passport_url} documentPaths={app.documents} />

                  {tab === "pending" && (
                    <div className="flex flex-wrap items-end gap-2">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">Admit into class</label>
                        <select value={d.classId} onChange={(e) => setDecisionState((s) => ({ ...s, [app.id]: { ...d, classId: e.target.value } }))}
                          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">
                          <option value="">Class…</option>
                          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}{c.arm ? ` ${c.arm}` : ""}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">Session</label>
                        <select value={d.sessionId} onChange={(e) => setDecisionState((s) => ({ ...s, [app.id]: { ...d, sessionId: e.target.value } }))}
                          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">
                          {sessions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                      </div>
                      <Button disabled={busyId === app.id} onClick={() => handleApprove(app.id)}>Approve &amp; enroll</Button>
                      <input placeholder="Rejection reason (optional)" value={d.reason}
                        onChange={(e) => setDecisionState((s) => ({ ...s, [app.id]: { ...d, reason: e.target.value } }))}
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
                      <Button variant="danger" disabled={busyId === app.id} onClick={() => handleReject(app.id)}>Reject</Button>
                    </div>
                  )}
                  {tab === "approved" && app.student_id && (
                    <Button variant="secondary" disabled={busyId === app.id} onClick={() => handleGenerateLetter(app)}>
                      Download admission letter
                    </Button>
                  )}
                  {app.review_notes && <p className="text-sm text-slate-500">Note: {app.review_notes}</p>}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Off-screen render target for the letter being exported — kept
          out of the visible flow but still in the DOM so html2canvas
          has something to capture. */}
      {letterData && (
        <div className="fixed left-[-9999px] top-0">
          <AdmissionLetterTemplate ref={letterRef} data={letterData} />
        </div>
      )}
    </div>
  );
}

function DocumentLinks({ passportPath, documentPaths }: { passportPath: string | null; documentPaths: string[] }) {
  const [urls, setUrls] = useState<Record<string, string>>({});

  async function reveal(path: string) {
    if (urls[path]) return;
    const url = await getSignedApplicationFileUrl(path);
    setUrls((u) => ({ ...u, [path]: url }));
  }

  const all = [...(passportPath ? [passportPath] : []), ...documentPaths];
  if (all.length === 0) return <p className="text-sm text-slate-400">No files uploaded.</p>;

  return (
    <div className="flex flex-wrap gap-2">
      {all.map((path) => (
        urls[path] ? (
          <a key={path} href={urls[path]} target="_blank" rel="noreferrer" className="text-xs text-brand-600 underline">
            {path.split("/").pop()}
          </a>
        ) : (
          <button key={path} onClick={() => reveal(path)} className="text-xs text-slate-500 underline">
            View {path.split("/").pop()}
          </button>
        )
      ))}
    </div>
  );
}
