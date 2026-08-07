// supabase/functions/invite-staff/index.ts
// Deploy with: supabase functions deploy invite-staff
//
// Why this has to be an Edge Function and not a client RPC:
// creating another person's auth account (inviteUserByEmail) requires
// the service role key. That key must never reach the browser, so this
// one narrow action lives server-side. It re-checks the caller's role
// itself — it does NOT trust the client, even though the client's own
// RLS would already block a non-admin from most other things.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

    // Client bound to the CALLER's token — used only to verify who's asking.
    const callerClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } }
    });
    const { data: userData, error: userErr } = await callerClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Invalid session" }, 401);

    const { data: callerProfile } = await callerClient
      .from("profiles")
      .select("role, school_id")
      .eq("id", userData.user.id)
      .single();

    if (!callerProfile || !["school_owner", "school_admin"].includes(callerProfile.role)) {
      return json({ error: "Not authorized to invite staff" }, 403);
    }

    const body = await req.json();
    const { email, fullName, role, department, position, qualification, employmentDate } = body;

    if (!email || !fullName || !role) return json({ error: "Missing required fields" }, 400);
    const allowedRoles = ["school_admin", "principal", "vice_principal", "teacher"];
    if (!allowedRoles.includes(role)) return json({ error: "Invalid role for staff invite" }, 400);

    // Admin client — service role, bypasses RLS. Used only for the two
    // writes this function is explicitly responsible for.
    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: invited, error: inviteErr } = await adminClient.auth.admin.inviteUserByEmail(email);
    if (inviteErr) return json({ error: inviteErr.message }, 400);

    const newUserId = invited.user.id;
    const schoolId = callerProfile.school_id;

    const { error: profileErr } = await adminClient.from("profiles").insert({
      id: newUserId, school_id: schoolId, role, full_name: fullName, email, status: "active"
    });
    if (profileErr) return json({ error: profileErr.message }, 400);

    const { data: staffIdCode } = await adminClient.rpc("generate_staff_id_code", { p_school_id: schoolId });

    const { error: staffErr } = await adminClient.from("staff").insert({
      school_id: schoolId, profile_id: newUserId, staff_id_code: staffIdCode,
      department, position, qualification, employment_date: employmentDate
    });
    if (staffErr) return json({ error: staffErr.message }, 400);

    await adminClient.from("audit_logs").insert({
      school_id: schoolId, actor_id: userData.user.id, action: "staff_invited",
      entity: "staff", entity_id: newUserId
    });

    return json({ success: true, userId: newUserId, staffIdCode });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
