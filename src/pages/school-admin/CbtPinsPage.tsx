import { useEffect, useState } from "react";
import { setStudentPin } from "../../services/cbt";
import { supabase } from "../../lib/supabase";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";

interface StudentRow {
  id: string;
  full_name: string;
  admission_number: string;
  cbt_pin_hash: string | null;
}

export default function CbtPinsPage() {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [pins, setPins] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("students")
      .select("id, full_name, admission_number, cbt_pin_hash")
      .order("full_name");
    if (!error) setStudents(data as StudentRow[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function handleSetPin(studentId: string) {
    const pin = pins[studentId];
    if (!pin || pin.length < 4) { setMessage("PIN must be at least 4 digits."); return; }
    setSavingId(studentId);
    const { error } = await setStudentPin(studentId, pin);
    setSavingId(null);
    if (error) { setMessage(error.message); return; }
    setMessage(`PIN set for that student.`);
    setPins((p) => ({ ...p, [studentId]: "" }));
    load();
  }

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div>
        <h1 className="font-display text-xl font-bold">CBT PINs</h1>
        <p className="text-sm text-slate-500">Set a PIN for each student — they'll use it with their admission number to log into the CBT portal.</p>
      </div>

      {message && <p className="text-sm text-slate-600">{message}</p>}

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[500px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr><th className="px-4 py-3">Student</th><th className="px-4 py-3">Admission No.</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Set PIN</th></tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">Loading…</td></tr>}
            {!loading && students.length === 0 && <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">No students yet.</td></tr>}
            {students.map((s) => (
              <tr key={s.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3 font-medium">{s.full_name}</td>
                <td className="px-4 py-3 font-mono text-xs">{s.admission_number}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.cbt_pin_hash ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                    {s.cbt_pin_hash ? "PIN set" : "No PIN"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <input
                      type="text" placeholder="4+ digit PIN" value={pins[s.id] || ""}
                      onChange={(e) => setPins((p) => ({ ...p, [s.id]: e.target.value }))}
                      className="w-28 rounded-lg border border-slate-300 px-2 py-1 text-sm"
                    />
                    <Button disabled={savingId === s.id} onClick={() => handleSetPin(s.id)}>
                      {savingId === s.id ? "Saving…" : "Set"}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}