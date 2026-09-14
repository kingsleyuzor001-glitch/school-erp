import { forwardRef } from "react";

export interface ReceiptData {
  receiptNumber: string;
  studentName: string;
  admissionNumber: string;
  amount: number;
  method: string;
  date: string;
  schoolName: string;
  schoolLogoUrl: string | null;
  brandColor: string;
}

const METHOD_LABELS: Record<string, string> = {
  cash: "Cash", bank_transfer: "Bank Transfer", pos: "POS", other: "Other"
};

export const ReceiptTemplate = forwardRef<HTMLDivElement, { data: ReceiptData }>(function ReceiptTemplate({ data }, ref) {
  return (
    <div ref={ref} className="mx-auto w-[210mm] bg-white p-16 font-body text-slate-800" style={{ fontFamily: "Inter, sans-serif" }}>
      <div className="mb-8 flex items-center justify-between border-b-4 pb-4" style={{ borderColor: data.brandColor }}>
        <div className="flex items-center gap-3">
          {data.schoolLogoUrl && <img src={data.schoolLogoUrl} alt="" className="h-14 w-14 object-contain" />}
          <h1 className="font-display text-lg font-bold" style={{ fontFamily: "Sora, sans-serif" }}>{data.schoolName}</h1>
        </div>
        <div className="text-right text-xs text-slate-500">
          <p>Receipt No.</p>
          <p className="font-mono text-sm font-semibold text-slate-800">{data.receiptNumber}</p>
        </div>
      </div>

      <h2 className="mb-6 text-center font-display text-base font-bold uppercase tracking-wide" style={{ fontFamily: "Sora, sans-serif" }}>
        Payment Receipt
      </h2>

      <table className="w-full text-sm">
        <tbody>
          <tr className="border-b border-slate-100">
            <td className="py-2 text-slate-500">Student</td>
            <td className="py-2 text-right font-medium">{data.studentName}</td>
          </tr>
          <tr className="border-b border-slate-100">
            <td className="py-2 text-slate-500">Admission Number</td>
            <td className="py-2 text-right font-mono">{data.admissionNumber}</td>
          </tr>
          <tr className="border-b border-slate-100">
            <td className="py-2 text-slate-500">Payment Method</td>
            <td className="py-2 text-right">{METHOD_LABELS[data.method] || data.method}</td>
          </tr>
          <tr className="border-b border-slate-100">
            <td className="py-2 text-slate-500">Date</td>
            <td className="py-2 text-right">{data.date}</td>
          </tr>
          <tr>
            <td className="py-3 text-base font-semibold">Amount Paid</td>
            <td className="py-3 text-right font-display text-xl font-bold" style={{ color: data.brandColor }}>
              ₦{data.amount.toLocaleString("en-NG")}
            </td>
          </tr>
        </tbody>
      </table>

      <p className="mt-10 text-center text-xs text-slate-400">This receipt confirms payment received. Keep it for your records.</p>
    </div>
  );
});