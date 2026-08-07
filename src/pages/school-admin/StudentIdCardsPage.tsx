import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { listStudents, Student, uploadStudentPassport, getSignedPassportUrl } from "../../services/students";
import { listClasses, listSessions } from "../../services/academic";
import { getBranding } from "../../services/branding";
import { logDocumentGenerated } from "../../services/documents";
import { IdCardTemplate, IdCardData } from "../../components/documents/IdCardTemplate";
import { exportElementToPdf } from "../../lib/pdf";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";

export default function StudentIdCardsPage() {
  const { profile } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [studentId, setStudentId] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [branding, setBranding] = useState<{ name: string; logo_url: string | null; brand_primary_color: string | null } | null>(null);
  const [uploading, setUploading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listStudents().then(setStudents);
    listClasses().then(setClasses);
    listSessions().then(setSessions);
    if (profile?.school_id) getBranding(profile.school_id).then((s) => s && setBranding(s));
  }, []);

  const student = students.find((s) => s.id === studentId);
  const cls = classes.find((c) => c.id === student?.class_id);
  const session = sessions.find((s) => s.id === student?.session_id);

  useEffect(() => {
    setPhotoUrl(null);
    if (student?.passport_url) getSignedPassportUrl(student.passport_url).then(setPhotoUrl).catch(() => {});
  }, [studentId]);

  async function handlePhotoUpload(file: File) {
    if (!profile?.school_id || !studentId) return;
    setUploading(true);
    const { error } = await uploadStudentPassport(profile.school_id, studentId, file);
    setUploading(false);
    if (error) { alert(error); return; }
    const updated = await listStudents();
    setStudents(updated);
  }

  async function handleDownload() {
    if (!cardRef.current || !student || !profile?.school_id) return;
    await exportElementToPdf(cardRef.current, `${student.admission_number}-id-card.pdf`, "card");
    await logDocumentGenerated({
      schoolId: profile.school_id, documentType: "student_id_card", generatedBy: profile.id, relatedStudentId: student.id
    });
  }

  const cardData: IdCardData | null = student && branding ? {
    kind: "student", fullName: student.full_name, idCode: student.admission_number,
    subLine: cls ? `${cls.name}${cls.arm ? ` ${cls.arm}` : ""}` : "—",
    extraLine: session?.name, photoUrl,
    schoolName: branding.name, schoolLogoUrl: branding.logo_url, brandColor: branding.brand_primary_color || "#0f766e"
  } : null;

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div>
        <h1 className="font-display text-xl font-bold">Student ID Cards</h1>
        <p className="text-sm text-slate-500">Includes a QR code encoding the admission number.</p>
      </div>

      <select value={studentId} onChange={(e) => setStudentId(e.target.value)} className="w-full max-w-sm rounded-lg border border-slate-300 px-3 py-2 text-sm">
        <option value="">Select a student…</option>
        {students.map((s) => <option key={s.id} value={s.id}>{s.full_name} ({s.admission_number})</option>)}
      </select>

      {student && (
        <div className="space-y-3">
          <Card className="w-fit p-4">
            {cardData && <IdCardTemplate ref={cardRef} data={cardData} />}
          </Card>
          <div className="flex flex-wrap items-center gap-3">
            <label className="cursor-pointer text-sm font-medium text-brand-600 hover:text-brand-700">
              {uploading ? "Uploading…" : student.passport_url ? "Replace photo" : "Upload photo"}
              <input type="file" accept="image/*" className="hidden" disabled={uploading}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhotoUpload(f); }} />
            </label>
            <Button onClick={handleDownload}>Download PDF</Button>
          </div>
        </div>
      )}
    </div>
  );
}
