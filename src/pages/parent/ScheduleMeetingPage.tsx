import { useEffect, useState } from "react";
import {
  AvailableSlot, MyMeeting, listAvailableSlots, bookMeetingSlot, cancelMeetingBooking, listMyMeetings,
  ChildForMessaging, getMyChildrenWithClassTeacher
} from "../../services/messaging";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";

export default function ScheduleMeetingPage() {
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [myMeetings, setMyMeetings] = useState<MyMeeting[]>([]);
  const [children, setChildren] = useState<ChildForMessaging[]>([]);
  const [studentId, setStudentId] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const [s, m, c] = await Promise.all([listAvailableSlots(), listMyMeetings(), getMyChildrenWithClassTeacher()]);
    setSlots(s); setMyMeetings(m); setChildren(c);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleBook(slotId: string) {
    if (!studentId) { setMessage("Select which child this meeting is about first."); return; }
    setBusy(slotId);
    const { error } = await bookMeetingSlot(slotId, studentId);
    setBusy(null);
    setMessage(error ?? "Meeting booked.");
    if (!error) load();
  }

  async function handleCancel(bookingId: string) {
    await cancelMeetingBooking(bookingId);
    load();
  }

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div>
        <h1 className="font-display text-xl font-bold">Schedule a Meeting</h1>
        <p className="text-sm text-slate-500">Book a time to speak with your child's teacher or school staff.</p>
      </div>

      {message && <p className="text-sm text-slate-600">{message}</p>}

      <Card>
        <label className="mb-1 block text-xs font-medium text-slate-500">Which child is this about?</label>
        <select value={studentId} onChange={(e) => setStudentId(e.target.value)}
          className="w-full max-w-sm rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <option value="">Select child…</option>
          {children.map((c) => <option key={c.student_id} value={c.student_id}>{c.full_name}</option>)}
        </select>
      </Card>

      <Card>
        <h2 className="mb-3 font-display text-base font-semibold">Your upcoming meetings</h2>
        {myMeetings.filter((m) => m.status === "booked").length === 0 ? (
          <p className="text-sm text-slate-400">No meetings booked.</p>
        ) : (
          <ul className="space-y-2">
            {myMeetings.filter((m) => m.status === "booked").map((m) => (
              <li key={m.booking_id} className="flex items-center justify-between rounded-lg border border-slate-200 p-3 text-sm">
                <div>
                  <p className="font-medium">{new Date(m.starts_at).toLocaleString()}</p>
                  <p className="text-xs text-slate-500">with {m.other_name} — re: {m.student_name}</p>
                </div>
                <Button variant="secondary" onClick={() => handleCancel(m.booking_id)}>Cancel</Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="overflow-x-auto p-0">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="font-display text-base font-semibold">Available slots</h2>
        </div>
        <table className="w-full min-w-[500px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr><th className="px-4 py-3">Staff</th><th className="px-4 py-3">Date & time</th><th className="px-4 py-3"></th></tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={3} className="px-4 py-6 text-center text-slate-400">Loading…</td></tr>}
            {!loading && slots.length === 0 && <tr><td colSpan={3} className="px-4 py-6 text-center text-slate-400">No open slots right now.</td></tr>}
            {slots.map((s) => (
              <tr key={s.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3 font-medium">{s.staff_name}</td>
                <td className="px-4 py-3 text-slate-600">{new Date(s.starts_at).toLocaleString()} – {new Date(s.ends_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</td>
                <td className="px-4 py-3"><Button loading={busy === s.id} onClick={() => handleBook(s.id)}>Book</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}