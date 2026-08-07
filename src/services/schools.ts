import { supabase } from "../lib/supabase";

export interface School {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone: string | null;
  address: string | null;
  website: string | null;
  motto: string | null;
  logo_url: string | null;
  brand_primary_color: string | null;
  brand_secondary_color: string | null;
  principal_signature_url: string | null;
  official_stamp_url: string | null;
  status: "pending" | "active" | "suspended" | "expired";
  created_at: string;
  approved_at: string | null;
}

export async function registerSchool(input: {
  schoolName: string;
  schoolEmail: string;
  schoolPhone: string;
  ownerFullName: string;
  ownerEmail: string;
  password: string;
}) {
  // Step 1: create the auth user. They're signed in immediately
  // (assuming email confirmations are off, or confirmed already).
  const { error: signUpError } = await supabase.auth.signUp({
    email: input.ownerEmail,
    password: input.password
  });
  if (signUpError) return { error: signUpError.message };

  // Step 2: create the school + owner profile atomically via RPC.
  const { error: rpcError } = await supabase.rpc("register_school", {
    p_school_name: input.schoolName,
    p_school_email: input.schoolEmail,
    p_school_phone: input.schoolPhone,
    p_owner_full_name: input.ownerFullName
  });
  if (rpcError) return { error: rpcError.message };

  // Step 3: the token issued at sign-up predates the profile row,
  // so it has no school_id/role claim yet — force a refresh so RLS
  // resolves correctly on the very next request.
  await supabase.auth.refreshSession();

  return { error: null };
}

export async function fetchSchools(): Promise<School[]> {
  const { data, error } = await supabase
    .from("schools")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as School[];
}

export async function fetchMySchool(schoolId: string): Promise<School | null> {
  const { data } = await supabase.from("schools").select("*").eq("id", schoolId).single();
  return data as School | null;
}

export const approveSchool = async (id: string) => supabase.rpc("approve_school", { p_school_id: id });
export const suspendSchool = async (id: string) => supabase.rpc("suspend_school", { p_school_id: id });
export const activateSchool = async (id: string) => supabase.rpc("activate_school", { p_school_id: id });
export const deleteSchool = async (id: string) => supabase.rpc("delete_school", { p_school_id: id });
