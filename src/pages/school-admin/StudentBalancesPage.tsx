import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  StudentBalance, StudentPayment, getStudentBalances, getStudentPayments, recordPayment
} from "../../services/finance";
import { listTerms } from "../../services/academic";
import { getBranding } from "../../services/branding";
import { ReceiptTemplate, ReceiptData } from "../../components/documents/ReceiptTemplate";
import { exportElementToPdf } from "../../lib/pdf";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";

const fmt = (n: number) => `₦${n.toLocaleString("en-NG", { minimumFractionDigits: 0 })}`;

export default function StudentBalancesPage() {
  const { profile } = useAuth();
  const [terms, setTerms] = useState<any[]>([]);
  const [termId, setTermId] = useState("");
  const [balances, setBalances] = useState<StudentBalance[]>([]);
  const [debtorsOnly, setDebtorsOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeStudent, setActiveStudent] = useState<StudentBalance | null>(null);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listTerms().then((t) => { setTerms(t); if (t.length) setTermId((t.find((x: any) => x.is_current) ?? t[0]).id); });
  }, []);

  async function load() {
    if (!termId) return;
    setLoading(true);
    setBalances(await getStudentBalances(termId));
    setLoading(false);
  }
  useEffect(() => { load(); }, [termId]);

  useEffect(() => {
    if (!receiptData || !receiptRef.current) return;
    exportElementToPdf(receiptRef.current, `${receiptData.receiptNumber}.pdf`, "a4").then(() => setReceiptData(null));
  }, [receiptData]);

  const visible = debtorsOnly ? balances.filter((b) => b.balance > 0) : balances;

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="font-display text-xl font-bold">Student Balances</h1>
          <p className="text-sm text-slate-500">Record payments and track who still owes.</p>
        </div>
        <div className="flex gap-2">
          <select value={termId} onChange={(e) => setTermId(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">
            {terms.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <label className="flex items-center gap-1.5 text-sm text-slate-600">
            <input type="checkbox" checked={debtorsOnly} onChange={(e) => setDebtorsOnly(e.target.checked)} />
            Debtors only
          </label>
        </div>
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[600px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr><th className="px-4 py-3">Student</th><th className="px-4 py-3">Class</th><th className="px-4 py-3">Expected</th><th className="px-4 py-3">Paid</th><th className="px-4 py-3">Balance</th><th className="px-4 py-3">Action</th></tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400">Loading…</td></tr>}
            {!loading && visible.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400">No students found.</td></tr>}
            {visible.map((b) => (
              <tr key={b.student_id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3 font-medium">{b.full_name} <span className="text-xs text-slate-400">{b.admission_number}</span></td>
                <td className="px-4 py-3 text-slate-500">{b.class_name}</td>
                <td className="px-4 py-3">{fmt(b.expected)}</td>
                <td className="px-4 py-3">{fmt(b.paid)}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${b.balance > 0 ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}>
                    {fmt(b.balance)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Button onClick={() => setActiveStudent(b)}>Record payment</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {activeStudent && termId && (
        <RecordPaymentModal
          student={activeStudent} termId={termId}
          onClose={() => setActiveStudent(null)}
          onRecorded={async (receiptNumber, amount, method) => {
            setActiveStudent(null);
            load();
            if (profile?.school_id) {
              const branding = await getBranding(profile.school_id);
              if (branding) {
                setReceiptData({
                  receiptNumber, studentName: activeStudent.full_name, admissionNumber: activeStudent.admission_number,
                  amount, method, date: new Date().toLocaleDateString(),
                  schoolName: branding.name, schoolLogoUrl: branding.logo_url, brandColor: branding.brand_primary_color || "#0f766e"
                });
              }
            }
          }}
        />
      )}

      {receiptData && (
        <div className="fixed left-[-9999px] top-0">
          <ReceiptTemplate ref={receiptRef} data={receiptData} />
        </div>
      )}
    </div>
  );
}

function RecordPaymentModal({
  student, termId, onClose, onRecorded
}: { student: StudentBalance; termId: string; onClose: () => void; onRecorded: (receiptNumber: string, amount: number, method: string) => void }) {
  const [amount, setAmount] = useState(String(student.balance > 0 ? student.balance : ""));
  const [method, setMethod] = useState("cash");
  const [note, setNote] = useState("");
  const [history, setHistory] = useState<StudentPayment[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { getStudentPayments(student.student_id, termId).then(setHistory); }, [student.student_id, termId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const amt = Number(amount);
    if (!amt || amt <= 0) { setError("Enter a valid amount."); return; }
    setSaving(true);
    const { receipt, error } = await recordPayment({ studentId: student.student_id, termId, amount: amt, method, note });
    setSaving(false);
    if (error || !receipt) { setError(error || "Failed to record payment"); return; }
    onRecorded(receipt.receipt_number, amt, method);
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/30 px-4">
      <Card className="w-full max-w-md">
        <h2 className="mb-1 font-display text-base font-semibold">{student.full_name}</h2>
        <p className="mb-4 text-xs text-slate-500">Balance: {fmt(student.balance)}</p>

        <form onSubmit={submit} className="space-y-3">
          <input required type="number" min={1} placeholder="Amount paid" value={amount} onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <select value={method} onChange={(e) => setMethod(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="cash">Cash</option><option value="bank_transfer">Bank Transfer</option><option value="pos">POS</option><option value="other">Other</option>
          </select>
          <input placeholder="Note / reference (optional)" value={note} onChange={(e) => setNote(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" loading={saving}>Record & download receipt</Button>
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          </div>
        </form>

        {history.length > 0 && (
          <div className="mt-4 border-t border-slate-100 pt-3">
            <p className="mb-1 text-xs font-medium text-slate-500">Previous payments this term</p>
            <ul className="space-y-1">
              {history.map((h) => (
                <li key={h.id} className="text-xs text-slate-600">{fmt(h.amount_paid)} · {h.receipt_number} · {new Date(h.payment_date).toLocaleDateString()}</li>
              ))}
            </ul>
          </div>
        )}
      </Card>
    </div>
  );
}