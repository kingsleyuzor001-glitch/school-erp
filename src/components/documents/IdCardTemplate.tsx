import { forwardRef } from "react";
import { QRCodeSVG } from "qrcode.react";

export interface IdCardData {
  kind: "student" | "staff";
  fullName: string;
  idCode: string;
  subLine: string;       // class+arm for students, department/position for staff
  extraLine?: string;    // session for students
  photoUrl: string | null;
  schoolName: string;
  schoolLogoUrl: string | null;
  brandColor: string;
}

// forwardRef so the page can grab the underlying DOM node for
// html2canvas — the card itself has no interactivity of its own.
export const IdCardTemplate = forwardRef<HTMLDivElement, { data: IdCardData }>(function IdCardTemplate({ data }, ref) {
  return (
    <div
      ref={ref}
      className="relative flex h-[212px] w-[336px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white font-body shadow-sm"
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      <div className="flex items-center gap-2 px-3 py-2 text-white" style={{ backgroundColor: data.brandColor }}>
        {data.schoolLogoUrl && <img src={data.schoolLogoUrl} alt="" className="h-6 w-6 rounded-full bg-white object-contain" />}
        <div className="min-w-0">
          <p className="truncate text-[11px] font-bold leading-tight">{data.schoolName}</p>
          <p className="text-[9px] uppercase tracking-wide opacity-90">{data.kind === "student" ? "Student ID" : "Staff ID"}</p>
        </div>
      </div>

      <div className="flex flex-1 gap-3 p-3">
        <div className="h-20 w-16 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-slate-100">
          {data.photoUrl ? (
            <img src={data.photoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[9px] text-slate-400">No photo</div>
          )}
        </div>
        <div className="flex-1 space-y-0.5">
          <p className="text-[12px] font-bold leading-tight text-slate-900">{data.fullName}</p>
          <p className="text-[10px] text-slate-500">{data.subLine}</p>
          {data.extraLine && <p className="text-[10px] text-slate-500">{data.extraLine}</p>}
          <p className="mt-1 font-mono text-[10px] text-slate-700">{data.idCode}</p>
        </div>
        <div className="flex flex-col items-center justify-end">
          <QRCodeSVG value={data.idCode} size={44} />
        </div>
      </div>
    </div>
  );
});
