import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { listActivities, uploadActivity, getSignedActivityUrl, ActivityItem } from "../../services/activities";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";

const CAN_UPLOAD = ["school_owner", "school_admin", "teacher", "principal", "vice_principal"];

export default function ActivitiesPage() {
  const { profile } = useAuth();
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    setLoading(true);
    const data = await listActivities();
    setItems(data);
    // Signed URLs are fetched lazily per item since each is a network
    // round trip — no point signing everything if the user never scrolls to it.
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function ensureUrl(item: ActivityItem) {
    if (urls[item.id]) return;
    const url = await getSignedActivityUrl(item.media_url);
    setUrls((u) => ({ ...u, [item.id]: url }));
  }

  const canUpload = profile && CAN_UPLOAD.includes(profile.role);

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold">School Activities</h1>
          <p className="text-sm text-slate-500">Photos and videos from school life.</p>
        </div>
        {canUpload && <Button onClick={() => setShowForm((v) => !v)}>{showForm ? "Close" : "Upload"}</Button>}
      </div>

      {showForm && profile?.school_id && (
        <UploadForm schoolId={profile.school_id} uploadedBy={profile.id} onUploaded={() => { setShowForm(false); load(); }} />
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading && <p className="text-sm text-slate-400">Loading…</p>}
        {!loading && items.length === 0 && <p className="text-sm text-slate-400">Nothing uploaded yet.</p>}
        {items.map((item) => (
          <Card key={item.id} className="p-0 overflow-hidden" >
            <div onMouseEnter={() => ensureUrl(item)} className="aspect-video bg-slate-100">
              {urls[item.id] ? (
                item.media_type === "video" ? (
                  <video src={urls[item.id]} controls className="h-full w-full object-cover" />
                ) : (
                  <img src={urls[item.id]} alt={item.title ?? ""} className="h-full w-full object-cover" />
                )
              ) : (
                <button onClick={() => ensureUrl(item)} className="flex h-full w-full items-center justify-center text-sm text-slate-400">
                  Tap to load {item.media_type}
                </button>
              )}
            </div>
            {item.title && <p className="p-3 text-sm font-medium">{item.title}</p>}
          </Card>
        ))}
      </div>
    </div>
  );
}

function UploadForm({
  schoolId, uploadedBy, onUploaded
}: { schoolId: string; uploadedBy: string; onUploaded: () => void }) {
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setSaving(true);
    const mediaType = file.type.startsWith("video") ? "video" : "photo";
    const { error } = await uploadActivity({ schoolId, uploadedBy, title, file, mediaType });
    setSaving(false);
    if (error) { setError(error); return; }
    onUploaded();
  }

  return (
    <Card>
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
        <input placeholder="Title (optional)" value={title} onChange={(e) => setTitle(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-2" />
        <input required type="file" accept="image/*,video/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-2" />
        {error && <p className="text-sm text-rose-600 sm:col-span-2">{error}</p>}
        <Button type="submit" loading={saving} className="sm:col-span-2">Upload</Button>
      </form>
    </Card>
  );
}
