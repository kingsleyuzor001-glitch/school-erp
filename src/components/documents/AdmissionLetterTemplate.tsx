import { forwardRef } from "react";

export interface AdmissionLetterData {
  applicantName: string;
  admissionNumber: string;
  className: string;
  sessionName: string;
  schoolName: string;
  schoolAddress: string | null;
  schoolLogoUrl: string | null;
  principalSignatureUrl: string | null;
  officialStampUrl: string | null;
  brandColor: string;
  dateGenerated: string;
}

export const AdmissionLetterTemplate = forwardRef<HTMLDivElement, { data: AdmissionLetterData }>(
  function AdmissionLetterTemplate({ data }, ref) {
    return (
      <div ref={ref} className="mx-auto w-[210mm] bg-white p-12 font-body text-slate-800" style={{ fontFamily: "Inter, sans-serif" }}>
        <div className="mb-8 flex items-center justify-between border-b-4 pb-4" style={{ borderColor: data.brandColor }}>
          <div className="flex items-center gap-3">
            {data.schoolLogoUrl && <img src={data.schoolLogoUrl} alt="" className="h-14 w-14 object-contain" />}
            <div>
              <h1 className="font-display text-lg font-bold" style={{ fontFamily: "Sora, sans-serif" }}>{data.schoolName}</h1>
              {data.schoolAddress && <p className="text-xs text-slate-500">{data.schoolAddress}</p>}
            </div>
          </div>
          <p className="text-xs text-slate-400">{data.dateGenerated}</p>
        </div>

        <h2 className="mb-6 text-center font-display text-base font-bold uppercase tracking-wide" style={{ fontFamily: "Sora, sans-serif" }}>
          Letter of Admission
        </h2>

        <p className="mb-4 text-sm leading-relaxed">Dear {data.applicantName},</p>
        <p className="mb-4 text-sm leading-relaxed">
          We are pleased to inform you that your application for admission to {data.schoolName} has been
          successful. You have been offered a place in <strong>{data.className}</strong> for the {data.sessionName} academic session.
        </p>
        <p className="mb-4 text-sm leading-relaxed">
          Your admission number is <strong className="font-mono">{data.admissionNumber}</strong>. Please
          quote this number in all correspondence with the school.
        </p>
        <p className="mb-10 text-sm leading-relaxed">
          We look forward to welcoming you to our school community. Please contact the school office for
          resumption details and any further requirements.
        </p>

        <div className="mt-16 flex items-end justify-between">
          <div>
            {data.principalSignatureUrl && <img src={data.principalSignatureUrl} alt="" className="mb-1 h-12 object-contain" />}
            <p className="border-t border-slate-400 pt-1 text-xs">Principal</p>
          </div>
          {data.officialStampUrl && <img src={data.officialStampUrl} alt="" className="h-20 w-20 object-contain opacity-90" />}
        </div>
      </div>
    );
  }
);
