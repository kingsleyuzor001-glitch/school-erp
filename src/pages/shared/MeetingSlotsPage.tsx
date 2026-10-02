import { useEffect, useState } from "react";
import {
  MySlot, MyMeeting, listMyPublishedSlots, publishMeetingSlot, cancelMeetingSlot, listMyMeetings
} from "../../services/messaging";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";

export default function MeetingSlotsPage() {
  const [slots, setSlots] = useState<MySlot[]>([]);
  const [bookings, setBookings] = useState<MyMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ date: "", startTime: "", endTime: "" });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const [s, b] = await Promise.all([listMyPublishedSlots(), listMyMeetings()]);
    setSlots(s); setBookings(b);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handlePublish(e: React.FormEvent) {
    e.preventDefault();
    if (!form.date || !form.startTime || !form.endTime) return;
    const startsAt = new Date(`${form.date}T${form.startTime}`).toISOString();
    const endsAt = new Date(`${form.date}T${form.endTime}`).toISOString();
    setBusy(true);
    const { error } = await publishMeetingSlot(startsAt, endsAt);
    setBusy(false);
    setMessage(error ?? "Slot published.");
    if (!error) { setForm({ date: "", startTime: "", endTime: "" }); load(); }
  }

  async function handleCancel(slotId: string) {
    await cancelMeetingSlot(slotId);
    load();
  }

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div>
        <h1 className="font-display text-xl font-bold">Meeting Slots</h1>
        <p className="text-sm text-slate-500">Publish times parents can book to meet with you.</p>
      </div>

      {message && <p className="text-sm text-slate-600">{message}</p>}

      <Card>
        <h2 className="mb-3 font-display text-base font-semibold">Publish a slot</h2>
        <form onSubmit={handlePublish} className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Date</label>
            <input required type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Start time</label>
            <input required type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">End time</label>
            <input required type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <Button type="submit" loading={busy}>Publish</Button>
        </form>
      </Card>

      <Card className="overflow-x-auto p-0">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="font-display text-base font-semibold">Your published slots</h2>
        </div>
        <table className="w-full min-w-[500px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr><th className="px-4 py-3">Date & time</th><th className="px-4 py-3">Status</th><th className="px-4 py-3"></th></tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={3} className="px-4 py-6 text-center text-slate-400">Loading…</td></tr>}
            {!loading && slots.length === 0 && <tr><td colSpan={3} className="px-4 py-6 text-center text-slate-400">No slots published yet.</td></tr>}
            {slots.map((s) => (
              <tr key={s.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3">{new Date(s.starts_at).toLocaleString()} – {new Date(s.ends_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    s.status === "open" ? "bg-emerald-100 text-emerald-700" : s.status === "booked" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"
                  }`}>{s.status}</span>
                </td>
                <td className="px-4 py-3">
                  {s.status !== "cancelled" && <Button variant="secondary" onClick={() => handleCancel(s.id)}>Cancel</Button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card className="overflow-x-auto p-0">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="font-display text-base font-semibold">Booked meetings</h2>
        </div>
        <table className="w-full min-w-[500px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr><th className="px-4 py-3">Date & time</th><th className="px-4 py-3">Parent</th><th className="px-4 py-3">Student</th></tr>
          </thead>
          <tbody>
            {bookings.filter((b) => b.status === "booked").length === 0 && (
              <tr><td colSpan={3} className="px-4 py-6 text-center text-slate-400">No meetings booked yet.</td></tr>
            )}
            {bookings.filter((b) => b.status === "booked").map((b) => (
              <tr key={b.booking_id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3">{new Date(b.starts_at).toLocaleString()}</td>
                <td className="px-4 py-3">{b.other_name}</td>
                <td className="px-4 py-3">{b.student_name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}