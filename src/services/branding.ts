import { supabase } from "../lib/supabase";
import { fetchMySchool, School } from "./schools";

export type BrandingAssetKind = "logo" | "signature" | "stamp";

export async function getBranding(schoolId: string): Promise<School | null> {
  return fetchMySchool(schoolId);
}

export async function updateBranding(fields: {
  logoUrl?: string; address?: string; phone?: string; website?: string; motto?: string;
  brandPrimaryColor?: string; brandSecondaryColor?: string;
  principalSignatureUrl?: string; officialStampUrl?: string;
}) {
  return supabase.rpc("update_school_branding", {
    p_logo_url: fields.logoUrl ?? null, p_address: fields.address ?? null, p_phone: fields.phone ?? null,
    p_website: fields.website ?? null, p_motto: fields.motto ?? null,
    p_brand_primary_color: fields.brandPrimaryColor ?? null, p_brand_secondary_color: fields.brandSecondaryColor ?? null,
    p_principal_signature_url: fields.principalSignatureUrl ?? null, p_official_stamp_url: fields.officialStampUrl ?? null
  });
}

// school-assets is a public bucket (see 0007 migration) — the
// returned URL is a stable public link, not a signed one, so it can
// be embedded directly in printable document templates.
export async function uploadBrandingAsset(schoolId: string, kind: BrandingAssetKind, file: File) {
  const path = `${schoolId}/branding/${kind}-${Date.now()}-${file.name}`;
  const { error } = await supabase.storage.from("school-assets").upload(path, file, { upsert: true });
  if (error) return { url: null, error: error.message };
  const { data } = supabase.storage.from("school-assets").getPublicUrl(path);
  return { url: data.publicUrl, error: null };
}
