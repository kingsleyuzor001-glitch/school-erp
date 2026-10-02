import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { getBranding } from "../../services/branding";
import {
  LiveStream, listLiveStreams, goLiveNow, scheduleLiveStream, endLiveStream, deleteLiveStream
} from "../../services/live";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";

function extractYouTubeId(input: string): string | null {
  const trimmed = input.trim();
  if (/^[\w-]{11}$/.test(trimmed)) return trimmed;
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([\w-]{11})/,
    /(?:youtu\.be\/)([\w-]{11})/,
    /(?:youtube\.com\/live\/)([\w-]{11})/,
    /(?:youtube\.com\/embed\/)([\w-]{11})/
  ];
  for (const p of patterns) {
    const m = trimmed.match(p);
    if (m) return m[1];
  }
  return null;
}

export default function LiveStreamPage() {
  const { profile } = useAuth();
  const [schoolSlug, setSchoolSlug] = useState<string | null>(null);
  const [streams, setStreams] = useState<LiveStream[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const [goLiveForm, setGoLiveForm] = useState({ title: "", url: "" });
  const [scheduleForm, setScheduleForm] = useState({ title: "", url: "", scheduledAt: "" });
  const [busy, setBusy] = useState<"live" | "schedule" | null>(null);

  async function load() {
    setLoading(true);
    setStreams(await listLiveStreams());
    setLoading(false);
  }

  useEffect(() => {
    load();
    if (profile?.school_id) getBranding(profile.school_id).then((s) => setSchoolSlug(s?.slug ?? null));
  }, [profile?.school_id]);

  const liveUrl = schoolSlug ? `${window.location.origin}/live/${schoolSlug}` : "";

  async function handleGoLive(e: React.FormEvent) {
    e.preventDefault();
    if (!profile?.school_id) return;
    const videoId = extractYouTubeId(goLiveForm.url);
    if (!videoId) { setMessage("Couldn't read a YouTube video ID from that link."); return; }
    setBusy("live");
    const { error } = await goLiveNow({
      schoolId: profile.school_id, createdBy: profile.id, title: goLiveForm.title, youtubeVideoId: videoId
    });
    setBusy(null);
    setMessage(error ?? "You're live! Share the link below with parents.");
    if (!error) { setGoLiveForm({ title: "", url: "" }); load(); }
  }

  async function handleSchedule(e: React.FormEvent) {
    e.preventDefault();
    if (!profile?.school_id || !scheduleForm.scheduledAt) return;
    const videoId = extractYouTubeId(scheduleForm.url);
    if (!videoId) { setMessage("Couldn't read a YouTube video ID from that link."); return; }
    setBusy("schedule");
    const { error } = await scheduleLiveStream({
      schoolId: profile.school_id, createdBy: profile.id, title: scheduleForm.title,
      youtubeVideoId: videoId, scheduledAt: new Date(scheduleForm.scheduledAt).toISOString()
    });
    setBusy(null);
    setMessage(error ?? "Stream scheduled.");
    if (!error) { setScheduleForm({ title: "", url: "", scheduledAt: "" }); load(); }
  }

  async function handleEnd(id: string) {
    await endLiveStream(id);
    load();
  }

  async function handleDelete(id: string) {
    await deleteLiveStream(id);
    load();
  }

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div>
        <h1 className="font-display text-xl font-bold">Live Stream</h1>
        <p className="text-sm text-slate-500">Stream assemblies, events, and classes via YouTube Live — parents watch from one link, no app or login needed.</p>
      </div>

      {schoolSlug && (
        <Card>
          <h2 className="mb-2 font-display text-base font-semibold">Public viewing link</h2>
          <p className="mb-3 text-sm text-slate-500">Share this once — it always shows whatever is currently live or scheduled next.</p>
          <div className="flex flex-wrap items-center gap-2">
            <code className="rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-700">{liveUrl}</code>
            <Button variant="secondary" onClick={() => { navigator.clipboard.writeText(liveUrl); setMessage("Link copied."); }}>
              Copy link
            </Button>
          </div>
        </Card>
      )}

      {message && <p className="text-sm text-slate-600">{message}</p>}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="mb-1 font-display text-base font-semibold">Go live now</h2>
          <p className="mb-3 text-xs text-slate-500">Start a YouTube Live stream from your phone or camera first, then paste its link here.</p>
          <form onSubmit={handleGoLive} className="space-y-3">
            <input required placeholder="Title (e.g. Founders Day Assembly)" value={goLiveForm.title}
              onChange={(e) => setGoLiveForm({ ...goLiveForm, title: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <input required placeholder="YouTube Live link or video ID" value={goLiveForm.url}
              onChange={(e) => setGoLiveForm({ ...goLiveForm, url: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <Button type="submit" loading={busy === "live"} className="w-full">Go live</Button>
          </form>
        </Card>

        <Card>
          <h2 className="mb-1 font-display text-base font-semibold">Schedule a stream</h2>
          <p className="mb-3 text-xs text-slate-500">Let parents see "Starting soon" ahead of the event.</p>
          <form onSubmit={handleSchedule} className="space-y-3">
            <input required placeholder="Title" value={scheduleForm.title}
              onChange={(e) => setScheduleForm({ ...scheduleForm, title: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <input required placeholder="YouTube Live link or video ID" value={scheduleForm.url}
              onChange={(e) => setScheduleForm({ ...scheduleForm, url: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <input required type="datetime-local" value={scheduleForm.scheduledAt}
              onChange={(e) => setScheduleForm({ ...scheduleForm, scheduledAt: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <Button type="submit" loading={busy === "schedule"} className="w-full">Schedule</Button>
          </form>
        </Card>
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[600px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr><th className="px-4 py-3">Title</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">When</th><th className="px-4 py-3">Action</th></tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">Loading…</td></tr>}
            {!loading && streams.length === 0 && <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">No streams yet.</td></tr>}
            {streams.map((s) => (
              <tr key={s.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3 font-medium">{s.title}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    s.status === "live" ? "bg-rose-100 text-rose-700" : s.status === "scheduled" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"
                  }`}>{s.status}</span>
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {s.status === "scheduled" && s.scheduled_at ? new Date(s.scheduled_at).toLocaleString() :
                   s.status === "live" && s.started_at ? `Started ${new Date(s.started_at).toLocaleString()}` :
                   s.ended_at ? `Ended ${new Date(s.ended_at).toLocaleString()}` : "—"}
                </td>
                <td className="px-4 py-3 flex gap-2">
                  {s.status === "live" && <Button variant="secondary" onClick={() => handleEnd(s.id)}>End stream</Button>}
                  {s.status !== "live" && <Button variant="secondary" onClick={() => handleDelete(s.id)}>Delete</Button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}