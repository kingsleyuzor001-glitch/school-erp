import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { getBranding, updateBranding, uploadBrandingAsset, BrandingAssetKind } from "../../services/branding";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import type { School } from "../../services/schools";

export default function BrandingPage() {
  const { profile } = useAuth();
  const [school, setSchool] = useState<School | null>(null);
  const [form, setForm] = useState({ address: "", phone: "", website: "", motto: "", brandPrimaryColor: "#0f766e", brandSecondaryColor: "#f59e0b" });
  const [uploading, setUploading] = useState<BrandingAssetKind | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    if (!profile?.school_id) return;
    const s = await getBranding(profile.school_id);
    setSchool(s);
    if (s) setForm({
      address: s.address ?? "", phone: s.phone ?? "", website: s.website ?? "",
      motto: s.motto ?? "", brandPrimaryColor: s.brand_primary_color ?? "#0f766e",
      brandSecondaryColor: s.brand_secondary_color ?? "#f59e0b"
    });
  }
  useEffect(() => { load(); }, [profile?.school_id]);

  async function saveDetails(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { error } = await updateBranding(form);
    setSaving(false);
    setMessage(error ? error.message : "Saved.");
    load();
  }

  async function handleAssetUpload(kind: BrandingAssetKind, file: File) {
    if (!profile?.school_id) return;
    setUploading(kind);
    const { url, error } = await uploadBrandingAsset(profile.school_id, kind, file);
    if (error) { setMessage(error); setUploading(null); return; }
    const fieldMap = { logo: "logoUrl", signature: "principalSignatureUrl", stamp: "officialStampUrl" } as const;
    await updateBranding({ [fieldMap[kind]]: url } as any);
    setUploading(null);
    load();
  }

  if (!school) return <p className="p-6 text-sm text-slate-400">Loading…</p>;
  const applicationUrl = `${window.location.origin}/apply/${school.slug}`;

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div>
        <h1 className="font-display text-xl font-bold">School Branding</h1>
        <p className="text-sm text-slate-500">Used across generated documents — ID cards, letters, and report cards.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-display text-base font-semibold">Assets</h2>
          <div className="space-y-4">
            <AssetRow label="Logo" url={school.logo_url} uploading={uploading === "logo"} onUpload={(f) => handleAssetUpload("logo", f)} />
            <AssetRow label="Principal signature" url={school.principal_signature_url} uploading={uploading === "signature"} onUpload={(f) => handleAssetUpload("signature", f)} />
            <AssetRow label="Official stamp" url={school.official_stamp_url} uploading={uploading === "stamp"} onUpload={(f) => handleAssetUpload("stamp", f)} />
          </div>
        </Card>

        <Card>
          <h2 className="mb-3 font-display text-base font-semibold">Details</h2>
          <form onSubmit={saveDetails} className="space-y-3">
            <input placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <input placeholder="Website" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <input placeholder="Motto" value={form.motto} onChange={(e) => setForm({ ...form, motto: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <div className="flex gap-3">
              <label className="flex flex-1 items-center gap-2 text-sm text-slate-600">
                Primary
                <input type="color" value={form.brandPrimaryColor} onChange={(e) => setForm({ ...form, brandPrimaryColor: e.target.value })} className="h-8 w-12 rounded border border-slate-300" />
              </label>
              <label className="flex flex-1 items-center gap-2 text-sm text-slate-600">
                Secondary
                <input type="color" value={form.brandSecondaryColor} onChange={(e) => setForm({ ...form, brandSecondaryColor: e.target.value })} className="h-8 w-12 rounded border border-slate-300" />
              </label>
            </div>
            {message && <p className="text-sm text-slate-500">{message}</p>}
            <Button type="submit" loading={saving}>Save details</Button>
          </form>
        </Card>
      </div>

      <Card>
        <h2 className="mb-2 font-display text-base font-semibold">Public application link</h2>
        <p className="mb-3 text-sm text-slate-500">Share this with prospective applicants — no login required to apply.</p>
        <div className="flex flex-wrap items-center gap-2">
          <code className="rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-700">{applicationUrl}</code>
          <Button variant="secondary" onClick={() => { navigator.clipboard.writeText(applicationUrl); setMessage("Link copied."); }}>
            Copy link
          </Button>
        </div>
      </Card>
    </div>
  );
}

function AssetRow({
  label, url, uploading, onUpload
}: { label: string; url: string | null; uploading: boolean; onUpload: (f: File) => void }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
        {url ? <img src={url} alt={label} className="h-full w-full object-contain" /> : <span className="text-[10px] text-slate-400">None</span>}
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium">{label}</p>
        <label className="mt-1 inline-block cursor-pointer text-xs font-medium text-brand-600 hover:text-brand-700">
          {uploading ? "Uploading…" : "Upload"}
          <input type="file" accept="image/*" className="hidden" disabled={uploading}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); }} />
        </label>
      </div>
    </div>
  );
}
