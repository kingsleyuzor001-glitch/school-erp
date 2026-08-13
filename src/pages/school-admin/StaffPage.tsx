import { useEffect, useState } from "react";
import {
  StaffMember,
  listStaff,
  inviteStaff,
  updateStaff,
  setStaffStatus
} from "../../services/staff";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";

const STAFF_ROLES = [
  "teacher",
  "vice_principal",
  "principal",
  "school_admin"
];

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<StaffMember | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      setStaff(await listStaff());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleStatusChange(member: StaffMember) {
    const currentStatus = member.profiles?.status ?? "active";
    const newStatus = currentStatus === "active" ? "inactive" : "active";

    const action =
      newStatus === "inactive" ? "deactivate" : "activate";

    if (!window.confirm(`Are you sure you want to ${action} this staff member?`)) {
      return;
    }

    setMessage(null);

    const { error } = await setStaffStatus(
      member.profile_id,
      newStatus
    );

    if (error) {
      setMessage(error);
      return;
    }

    setMessage(
      newStatus === "inactive"
        ? "Staff member deactivated successfully."
        : "Staff member activated successfully."
    );

    await load();
  }

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold">Staff</h1>
          <p className="text-sm text-slate-500">
            {staff.length} member{staff.length === 1 ? "" : "s"}
          </p>
        </div>

        <Button
          onClick={() => {
            setShowForm((v) => !v);
            setEditing(null);
          }}
        >
          {showForm ? "Close" : "Invite staff"}
        </Button>
      </div>

      {message && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          {message}
        </div>
      )}

      {showForm && (
        <InviteForm
          onInvited={() => {
            setShowForm(false);
            load();
          }}
        />
      )}

      {editing && (
        <EditStaffForm
          member={editing}
          onSaved={async () => {
            setEditing(null);
            setMessage("Staff details updated successfully.");
            await load();
          }}
          onCancel={() => setEditing(null)}
        />
      )}

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[950px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Staff ID</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3">Position</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>

          <tbody>
            {loading && (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-6 text-center text-slate-400"
                >
                  Loading…
                </td>
              </tr>
            )}

            {!loading && staff.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-6 text-center text-slate-400"
                >
                  No staff yet.
                </td>
              </tr>
            )}

            {staff.map((s) => {
              const status = s.profiles?.status ?? "active";
              const active = status === "active";

              return (
                <tr
                  key={s.id}
                  className="border-b border-slate-100 last:border-0"
                >
                  <td className="px-4 py-3 font-mono text-xs">
                    {s.staff_id_code}
                  </td>

                  <td className="px-4 py-3 font-medium">
                    {s.profiles?.full_name || "—"}
                  </td>

                  <td className="px-4 py-3 text-slate-500">
                    {s.profiles?.email || "—"}
                  </td>

                  <td className="px-4 py-3 text-slate-500">
                    {s.profiles?.role?.replace("_", " ") || "—"}
                  </td>

                  <td className="px-4 py-3 text-slate-500">
                    {s.department || "—"}
                  </td>

                  <td className="px-4 py-3 text-slate-500">
                    {s.position || "—"}
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${
                        active
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {active ? "Active" : "Inactive"}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(s);
                          setShowForm(false);
                        }}
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => handleStatusChange(s)}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                          active
                            ? "border-rose-200 text-rose-600 hover:bg-rose-50"
                            : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                        }`}
                      >
                        {active ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function EditStaffForm({
  member,
  onSaved,
  onCancel
}: {
  member: StaffMember;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    fullName: member.profiles?.full_name ?? "",
    role: member.profiles?.role ?? "teacher",
    department: member.department ?? "",
    position: member.position ?? "",
    qualification: "",
    employmentDate: member.employment_date ?? "",
    status: member.profiles?.status ?? "active"
  });

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    setSaving(true);
    setError(null);

    const { error } = await updateStaff({
      staffId: member.id,
      profileId: member.profile_id,
      ...form
    });

    setSaving(false);

    if (error) {
      setError(error);
      return;
    }

    onSaved();
  }

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="font-display text-base font-semibold">
            Edit staff member
          </h2>
          <p className="text-sm text-slate-500">
            {member.staff_id_code}
          </p>
        </div>

        <button
          type="button"
          onClick={onCancel}
          className="text-sm text-slate-500 hover:text-slate-800"
        >
          Cancel
        </button>
      </div>

      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
        <input
          required
          placeholder="Full name"
          value={form.fullName}
          onChange={(e) =>
            setForm({ ...form, fullName: e.target.value })
          }
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />

        <select
          value={form.role}
          onChange={(e) =>
            setForm({ ...form, role: e.target.value })
          }
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          {STAFF_ROLES.map((r) => (
            <option key={r} value={r}>
              {r.replace("_", " ")}
            </option>
          ))}
        </select>

        <input
          placeholder="Department"
          value={form.department}
          onChange={(e) =>
            setForm({ ...form, department: e.target.value })
          }
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />

        <input
          placeholder="Position"
          value={form.position}
          onChange={(e) =>
            setForm({ ...form, position: e.target.value })
          }
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />

        <input
          type="date"
          value={form.employmentDate}
          onChange={(e) =>
            setForm({ ...form, employmentDate: e.target.value })
          }
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />

        <select
          value={form.status}
          onChange={(e) =>
            setForm({ ...form, status: e.target.value })
          }
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        {error && (
          <p className="text-sm text-rose-600 sm:col-span-2">
            {error}
          </p>
        )}

        <div className="flex gap-2 sm:col-span-2">
          <Button type="submit" loading={saving}>
            Save changes
          </Button>

          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm"
          >
            Cancel
          </button>
        </div>
      </form>
    </Card>
  );
}

function InviteForm({ onInvited }: { onInvited: () => void }) {
  const [form, setForm] = useState({
    email: "",
    fullName: "",
    role: "teacher",
    department: "",
    position: "",
    qualification: ""
  });

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    setSaving(true);
    setError(null);

    const { error } = await inviteStaff(form);

    setSaving(false);

    if (error) {
      setError(error);
      return;
    }

    onInvited();
  }

  return (
    <Card>
      <p className="mb-3 text-sm text-slate-500">
        Sends an email invite. The staff member sets their own password
        and is created with the role you choose.
      </p>

      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
        <input
          required
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={(e) =>
            setForm({ ...form, email: e.target.value })
          }
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-2"
        />

        <input
          required
          placeholder="Full name"
          value={form.fullName}
          onChange={(e) =>
            setForm({ ...form, fullName: e.target.value })
          }
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />

        <select
          value={form.role}
          onChange={(e) =>
            setForm({ ...form, role: e.target.value })
          }
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          {STAFF_ROLES.map((r) => (
            <option key={r} value={r}>
              {r.replace("_", " ")}
            </option>
          ))}
        </select>

        <input
          placeholder="Department (optional)"
          value={form.department}
          onChange={(e) =>
            setForm({ ...form, department: e.target.value })
          }
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />

        <input
          placeholder="Position (optional)"
          value={form.position}
          onChange={(e) =>
            setForm({ ...form, position: e.target.value })
          }
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />

        {error && (
          <p className="text-sm text-rose-600 sm:col-span-2">
            {error}
          </p>
        )}

        <Button
          type="submit"
          loading={saving}
          className="sm:col-span-2"
        >
          Send invite
        </Button>
      </form>
    </Card>
  );
}