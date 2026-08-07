// supabase/functions/invite-portal-user/index.ts
// Deploy with: supabase functions deploy invite-portal-user
//
// Same reasoning as invite-staff: creating another person's auth
// account needs the service role key, so it can't run client-side.
// Handles two cases via `kind`:
//   "parent"  — invite a guardian, link them to an existing student
//   "student" — give an existing student record its own portal login

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

    const callerClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } }
    });
    const { data: userData, error: userErr } = await callerClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Invalid session" }, 401);

    const { data: callerProfile } = await callerClient
      .from("profiles").select("role, school_id").eq("id", userData.user.id).single();

    if (!callerProfile || !["school_owner", "school_admin"].includes(callerProfile.role)) {
      return json({ error: "Not authorized to create portal accounts" }, 403);
    }
    const schoolId = callerProfile.school_id;
    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const body = await req.json();
    const { kind } = body;

    // Confirm the target student actually belongs to the caller's
    // school before doing anything — the service-role client bypasses
    // RLS, so this check has to happen explicitly here.
    async function assertStudentInSchool(studentId: string) {
      const { data } = await adminClient.from("students").select("id").eq("id", studentId).eq("school_id", schoolId).single();
      if (!data) throw new Error("Student not found in this school");
    }

    if (kind === "parent") {
      const { email, fullName, studentId, relationship } = body;
      if (!email || !fullName || !studentId) return json({ error: "Missing required fields" }, 400);
      await assertStudentInSchool(studentId);

      const { data: invited, error: inviteErr } = await adminClient.auth.admin.inviteUserByEmail(email);
      if (inviteErr) return json({ error: inviteErr.message }, 400);
      const newUserId = invited.user.id;

      const { error: profileErr } = await adminClient.from("profiles").insert({
        id: newUserId, school_id: schoolId, role: "parent", full_name: fullName, email, status: "active"
      });
      if (profileErr) return json({ error: profileErr.message }, 400);

      const { data: guardian, error: guardianErr } = await adminClient.from("guardians").insert({
        school_id: schoolId, profile_id: newUserId, full_name: fullName, relationship, email
      }).select("id").single();
      if (guardianErr) return json({ error: guardianErr.message }, 400);

      const { error: linkErr } = await adminClient.from("student_guardians").insert({
        student_id: studentId, guardian_id: guardian.id
      });
      if (linkErr) return json({ error: linkErr.message }, 400);

      await adminClient.from("audit_logs").insert({
        school_id: schoolId, actor_id: userData.user.id, action: "parent_portal_invited",
        entity: "guardians", entity_id: guardian.id
      });

      return json({ success: true, userId: newUserId });
    }

    if (kind === "student") {
      const { email, studentId } = body;
      if (!email || !studentId) return json({ error: "Missing required fields" }, 400);
      await assertStudentInSchool(studentId);

      const { data: student } = await adminClient.from("students").select("full_name, profile_id").eq("id", studentId).single();
      if (student?.profile_id) return json({ error: "This student already has a portal account" }, 400);

      const { data: invited, error: inviteErr } = await adminClient.auth.admin.inviteUserByEmail(email);
      if (inviteErr) return json({ error: inviteErr.message }, 400);
      const newUserId = invited.user.id;

      const { error: profileErr } = await adminClient.from("profiles").insert({
        id: newUserId, school_id: schoolId, role: "student", full_name: student?.full_name ?? "Student", email, status: "active"
      });
      if (profileErr) return json({ error: profileErr.message }, 400);

      const { error: linkErr } = await adminClient.from("students").update({ profile_id: newUserId }).eq("id", studentId);
      if (linkErr) return json({ error: linkErr.message }, 400);

      await adminClient.from("audit_logs").insert({
        school_id: schoolId, actor_id: userData.user.id, action: "student_portal_invited",
        entity: "students", entity_id: studentId
      });

      return json({ success: true, userId: newUserId });
    }

    return json({ error: "kind must be 'parent' or 'student'" }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
