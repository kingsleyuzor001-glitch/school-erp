import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { listAnnouncements, createAnnouncement, Announcement } from "../../services/announcements";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";

const CAN_CREATE = ["school_owner", "school_admin", "principal", "vice_principal"];
const AUDIENCES = ["everyone", "teachers", "parents", "students"];

export default function AnnouncementsPage() {
  const { profile } = useAuth();
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    setLoading(true);
    setItems(await listAnnouncements());
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const canCreate = profile && CAN_CREATE.includes(profile.role);

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold">Announcements</h1>
          <p className="text-sm text-slate-500">Pinned items appear first.</p>
        </div>
        {canCreate && <Button onClick={() => setShowForm((v) => !v)}>{showForm ? "Close" : "New announcement"}</Button>}
      </div>

      {showForm && profile?.school_id && (
        <NewAnnouncementForm schoolId={profile.school_id} createdBy={profile.id} onCreated={() => { setShowForm(false); load(); }} />
      )}

      <div className="space-y-3">
        {loading && <p className="text-sm text-slate-400">Loading…</p>}
        {!loading && items.length === 0 && <p className="text-sm text-slate-400">No announcements yet.</p>}
        {items.map((a) => (
          <Card key={a.id}>
            <div className="flex items-start justify-between">
              <h3 className="font-display text-base font-semibold">{a.title}</h3>
              {a.is_pinned && <span className="rounded-full bg-accent-500/10 px-2 py-0.5 text-xs font-medium text-accent-600">Pinned</span>}
            </div>
            <p className="mt-1 text-sm text-slate-600">{a.message}</p>
            <p className="mt-2 text-xs text-slate-400">{new Date(a.created_at).toLocaleString()} · {a.target_audience}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}

function NewAnnouncementForm({
  schoolId, createdBy, onCreated
}: { schoolId: string; createdBy: string; onCreated: () => void }) {
  const [form, setForm] = useState({ title: "", message: "", targetAudience: "everyone", isPinned: false });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { error } = await createAnnouncement({ schoolId, createdBy, ...form });
    setSaving(false);
    if (error) { setError(error.message); return; }
    onCreated();
  }

  return (
    <Card>
      <form onSubmit={submit} className="space-y-3">
        <input required placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <textarea required placeholder="Message" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })}
          rows={3} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <div className="flex flex-wrap items-center gap-3">
          <select value={form.targetAudience} onChange={(e) => setForm({ ...form, targetAudience: e.target.value })}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">
            {AUDIENCES.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <label className="flex items-center gap-1.5 text-sm text-slate-600">
            <input type="checkbox" checked={form.isPinned} onChange={(e) => setForm({ ...form, isPinned: e.target.checked })} />
            Pin this
          </label>
        </div>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <Button type="submit" loading={saving}>Post announcement</Button>
      </form>
    </Card>
  );
}
