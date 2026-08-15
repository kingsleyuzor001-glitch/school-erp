import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { listTerms } from "../../services/academic";
import { getSchoolAcademicSelection } from "../../services/schoolAcademic";
import { listStudents } from "../../services/students";
import { getMyStudentRecord } from "../../services/portal";
import { getReportCard, ReportCard } from "../../services/results";
import { exportElementToPdf } from "../../lib/pdf";
import { logDocumentGenerated } from "../../services/documents";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";

export default function ReportCardPage() {
  const { profile } = useAuth();
  const [terms, setTerms] = useState<any[]>([]);
  const [termId, setTermId] = useState("");
  const [students, setStudents] = useState<any[]>([]);
  const [studentId, setStudentId] = useState("");
  const [myStudentId, setMyStudentId] = useState<string | null>(null);
  const [card, setCard] = useState<ReportCard | null>(null);
  const [loading, setLoading] = useState(false);

  const needsStudentPicker = profile && profile.role !== "student";

  useEffect(() => {
    if (!profile?.school_id) return;

    (async () => {
      try {
        const [academicSelection, allTerms] = await Promise.all([
          getSchoolAcademicSelection(profile.school_id!),
          listTerms()
        ]);

        setTerms(allTerms);

        if (academicSelection?.current_term_id) {
          setTermId(academicSelection.current_term_id);
        } else if (allTerms.length) {
          setTermId(
            (allTerms.find((t: any) => t.is_current) ?? allTerms[0]).id
          );
        }
      } catch (error: any) {
        alert(error.message);
      }
    })();

    if (needsStudentPicker) {
      listStudents().then(setStudents);
    }

    if (profile.role === "student") {
      getMyStudentRecord().then((s) => {
        setMyStudentId(s?.id ?? null);
      });
    }
  }, [profile?.school_id, profile?.role, needsStudentPicker]);

  useEffect(() => {
    if (!termId) return;

    const targetId =
      profile?.role === "student" ? myStudentId : studentId;

    if (!targetId) {
      setCard(null);
      return;
    }

    setLoading(true);

    getReportCard(targetId, termId)
      .then(setCard)
      .catch((e) => alert(e.message))
      .finally(() => setLoading(false));
  }, [termId, studentId, myStudentId, profile?.role]);

  const printRef = useRef<HTMLDivElement>(null);

  async function handleDownload() {
    if (!printRef.current || !profile?.school_id) return;

    await exportElementToPdf(
      printRef.current,
      "report-card.pdf",
      "a4"
    );

    const targetId =
      profile.role === "student" ? myStudentId : studentId;

    if (targetId) {
      await logDocumentGenerated({
        schoolId: profile.school_id,
        documentType: "report_card",
        generatedBy: profile.id,
        relatedStudentId: targetId
      });
    }
  }

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div>
        <h1 className="font-display text-xl font-bold">
          Report Card
        </h1>

        <p className="text-sm text-slate-500">
          Only published results appear here.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {needsStudentPicker && (
          <select
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
          >
            <option value="">Select student…</option>

            {students.map((s: any) => (
              <option key={s.id} value={s.id}>
                {s.full_name}
              </option>
            ))}
          </select>
        )}

        <select
          value={termId}
          onChange={(e) => setTermId(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
        >
          {terms.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>

        {card && card.subjects.length > 0 && (
          <Button
            variant="secondary"
            onClick={handleDownload}
          >
            Download PDF
          </Button>
        )}
      </div>

      {loading && (
        <p className="text-sm text-slate-400">
          Loading…
        </p>
      )}

      {card && (
        <div
          ref={printRef}
          className="space-y-4 bg-white p-2"
        >
          <Card className="overflow-x-auto p-0">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-3">Subject</th>
                  <th className="px-3 py-3">Assign.</th>
                  <th className="px-3 py-3">Classwork</th>
                  <th className="px-3 py-3">CA</th>
                  <th className="px-3 py-3">Exam</th>
                  <th className="px-3 py-3">Total</th>
                  <th className="px-3 py-3">Grade</th>
                </tr>
              </thead>

              <tbody>
                {card.subjects.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-3 py-6 text-center text-slate-400"
                    >
                      No published results for this term yet.
                    </td>
                  </tr>
                )}

                {card.subjects.map((s, i) => (
                  <tr
                    key={i}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="px-3 py-2 font-medium">
                      {s.subject}
                    </td>

                    <td className="px-3 py-2">
                      {s.assignment}
                    </td>

                    <td className="px-3 py-2">
                      {s.classwork}
                    </td>

                    <td className="px-3 py-2">
                      {s.ca}
                    </td>

                    <td className="px-3 py-2">
                      {s.exam}
                    </td>

                    <td className="px-3 py-2 font-semibold">
                      {s.total}
                    </td>

                    <td className="px-3 py-2">
                      <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700">
                        {s.grade}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {card.position && (
            <Card>
              <p className="text-sm text-slate-600">
                Position in class:{" "}
                <span className="font-semibold text-slate-900">
                  {card.position}
                </span>{" "}
                of {card.class_size}
              </p>

              {card.comments.class_teacher_comment && (
                <p className="mt-2 text-sm">
                  <span className="font-medium">
                    Class teacher:{" "}
                  </span>
                  {card.comments.class_teacher_comment}
                </p>
              )}

              {card.comments.principal_comment && (
                <p className="mt-1 text-sm">
                  <span className="font-medium">
                    Principal:{" "}
                  </span>
                  {card.comments.principal_comment}
                </p>
              )}
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

