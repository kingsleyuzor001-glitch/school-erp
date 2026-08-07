import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { listStaff, StaffMember, uploadStaffPassport } from "../../services/staff";
import { getSignedPassportUrl } from "../../services/students";
import { getBranding } from "../../services/branding";
import { logDocumentGenerated } from "../../services/documents";
import { IdCardTemplate, IdCardData } from "../../components/documents/IdCardTemplate";
import { exportElementToPdf } from "../../lib/pdf";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";

export default function StaffIdCardsPage() {
  const { profile } = useAuth();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [staffId, setStaffId] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [branding, setBranding] = useState<{ name: string; logo_url: string | null; brand_primary_color: string | null } | null>(null);
  const [uploading, setUploading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listStaff().then(setStaff);
    if (profile?.school_id) getBranding(profile.school_id).then((s) => s && setBranding(s));
  }, []);

  const member = staff.find((s) => s.id === staffId);

  useEffect(() => {
    setPhotoUrl(null);
    if (member?.profiles?.passport_url) getSignedPassportUrl(member.profiles.passport_url).then(setPhotoUrl).catch(() => {});
  }, [staffId]);

  async function handlePhotoUpload(file: File) {
    if (!profile?.school_id || !member) return;
    setUploading(true);
    const { error } = await uploadStaffPassport(profile.school_id, member.profile_id, file);
    setUploading(false);
    if (error) { alert(error); return; }
    setStaff(await listStaff());
  }

  async function handleDownload() {
    if (!cardRef.current || !member || !profile?.school_id) return;
    await exportElementToPdf(cardRef.current, `${member.staff_id_code}-id-card.pdf`, "card");
    await logDocumentGenerated({
      schoolId: profile.school_id, documentType: "staff_id_card", generatedBy: profile.id, relatedStaffId: member.id
    });
  }

  const cardData: IdCardData | null = member && branding ? {
    kind: "staff", fullName: member.profiles?.full_name ?? "", idCode: member.staff_id_code,
    subLine: member.department || member.position || member.profiles?.role || "—",
    photoUrl, schoolName: branding.name, schoolLogoUrl: branding.logo_url, brandColor: branding.brand_primary_color || "#0f766e"
  } : null;

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div>
        <h1 className="font-display text-xl font-bold">Staff ID Cards</h1>
        <p className="text-sm text-slate-500">Includes a QR code encoding the staff ID.</p>
      </div>

      <select value={staffId} onChange={(e) => setStaffId(e.target.value)} className="w-full max-w-sm rounded-lg border border-slate-300 px-3 py-2 text-sm">
        <option value="">Select a staff member…</option>
        {staff.map((s) => <option key={s.id} value={s.id}>{s.profiles?.full_name} ({s.staff_id_code})</option>)}
      </select>

      {member && (
        <div className="space-y-3">
          <Card className="w-fit p-4">
            {cardData && <IdCardTemplate ref={cardRef} data={cardData} />}
          </Card>
          <div className="flex flex-wrap items-center gap-3">
            <label className="cursor-pointer text-sm font-medium text-brand-600 hover:text-brand-700">
              {uploading ? "Uploading…" : member.profiles?.passport_url ? "Replace photo" : "Upload photo"}
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
