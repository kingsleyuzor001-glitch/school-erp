import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { listTerms } from "../../services/academic";
import { supabase } from "../../lib/supabase";
import { Card } from "../../components/ui/Card";

interface ResultRow {
  student_id: string;
  student_name: string;
  admission_number: string;
  subject_name: string;
  assignment_score: number | null;
  classwork_score: number | null;
  ca_score: number | null;
  exam_score: number | null;
  total_score: number;
  grade: string | null;
  status: string;
  teacher_comment: string | null;
}

export default function ResultsViewerPage() {
  const { profile } = useAuth();

  const [terms, setTerms] = useState<any[]>([]);
  const [termId, setTermId] = useState("");
  const [classes, setClasses] = useState<any[]>([]);
  const [classId, setClassId] = useState("");
  const [rows, setRows] = useState<ResultRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const schoolId = profile?.school_id;

    if (!schoolId) return;

    async function loadSetup() {
      try {
        setError(null);

        const [termData, classData] = await Promise.all([
          listTerms(),
          supabase
            .from("classes")
            .select("id, name, arm")
            .eq("school_id", schoolId)
            .order("name")
        ]);

        if (classData.error) {
          throw classData.error;
        }

        setTerms(termData);
        setClasses(classData.data ?? []);

        if (termData.length > 0) {
          setTermId(
            (termData.find((term: any) => term.is_current) ??
              termData[0]).id
          );
        }

        if ((classData.data ?? []).length > 0) {
          setClassId(classData.data[0].id);
        }
      } catch (err: any) {
        setError(
          err.message || "Unable to load result setup."
        );
      }
    }

    loadSetup();
  }, [profile?.school_id]);

  useEffect(() => {
    const schoolId = profile?.school_id;

    if (!schoolId || !classId || !termId) {
      setRows([]);
      return;
    }

    async function loadResults() {
      try {
        setLoading(true);
        setError(null);

        const { data, error: resultsError } = await supabase
          .from("result_scores")
          .select(
            `
              student_id,
              assignment_score,
              classwork_score,
              ca_score,
              exam_score,
              total_score,
              grade,
              status,
              teacher_comment,
              students (
                full_name,
                admission_number
              ),
              subjects (
                name
              )
            `
          )
          .eq("school_id", schoolId)
          .eq("class_id", classId)
          .eq("term_id", termId)
          .in("status", [
            "submitted",
            "approved",
            "published"
          ]);

        if (resultsError) {
          throw resultsError;
        }

        const mapped: ResultRow[] = (data ?? []).map(
          (row: any) => ({
            student_id: row.student_id,
            student_name:
              row.students?.full_name ?? "Unknown student",
            admission_number:
              row.students?.admission_number ?? "—",
            subject_name:
              row.subjects?.name ?? "Unknown subject",
            assignment_score: row.assignment_score,
            classwork_score: row.classwork_score,
            ca_score: row.ca_score,
            exam_score: row.exam_score,
            total_score: row.total_score,
            grade: row.grade,
            status: row.status,
            teacher_comment: row.teacher_comment
          })
        );

        setRows(mapped);
      } catch (err: any) {
        setError(
          err.message || "Unable to load results."
        );
      } finally {
        setLoading(false);
      }
    }

    loadResults();
  }, [profile?.school_id, classId, termId]);

  const selectedClass = classes.find(
    (item) => item.id === classId
  );

  const selectedTerm = terms.find(
    (item) => item.id === termId
  );

  const approvedCount = rows.filter(
    (row) => row.status === "approved"
  ).length;

  const submittedCount = rows.filter(
    (row) => row.status === "submitted"
  ).length;

  const publishedCount = rows.filter(
    (row) => row.status === "published"
  ).length;

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <div>
        <h1 className="font-display text-xl font-bold">
          View Results
        </h1>

        <p className="text-sm text-slate-500">
          Review student results before or after approval.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          value={classId}
          onChange={(event) =>
            setClassId(event.target.value)
          }
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          {classes.length === 0 && (
            <option value="">
              No classes available
            </option>
          )}

          {classes.map((schoolClass) => (
            <option
              key={schoolClass.id}
              value={schoolClass.id}
            >
              {schoolClass.name}
              {schoolClass.arm
                ? ` ${schoolClass.arm}`
                : ""}
            </option>
          ))}
        </select>

        <select
          value={termId}
          onChange={(event) =>
            setTermId(event.target.value)
          }
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          {terms.map((term) => (
            <option
              key={term.id}
              value={term.id}
            >
              {term.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <p className="text-xs font-medium uppercase text-slate-400">
            Submitted
          </p>

          <p className="mt-1 text-2xl font-bold text-amber-600">
            {submittedCount}
          </p>
        </Card>

        <Card>
          <p className="text-xs font-medium uppercase text-slate-400">
            Approved
          </p>

          <p className="mt-1 text-2xl font-bold text-emerald-600">
            {approvedCount}
          </p>
        </Card>

        <Card>
          <p className="text-xs font-medium uppercase text-slate-400">
            Published
          </p>

          <p className="mt-1 text-2xl font-bold text-brand-600">
            {publishedCount}
          </p>
        </Card>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="border-b border-slate-200 px-4 py-4">
          <h2 className="font-semibold text-slate-800">
            {selectedClass
              ? `${selectedClass.name}${
                  selectedClass.arm
                    ? ` ${selectedClass.arm}`
                    : ""
                }`
              : "Results"}
          </h2>

          <p className="text-xs text-slate-500">
            {selectedTerm?.name ?? "Selected term"}
          </p>
        </div>

        {error && (
          <div className="border-b border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="px-4 py-8 text-center text-sm text-slate-400">
            Loading results...
          </div>
        ) : rows.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-slate-400">
            No submitted, approved, or published results
            found for this class and term.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">
                    Student
                  </th>

                  <th className="px-4 py-3">
                    Subject
                  </th>

                  <th className="px-4 py-3">
                    Assign.
                  </th>

                  <th className="px-4 py-3">
                    Classwork
                  </th>

                  <th className="px-4 py-3">
                    CA
                  </th>

                  <th className="px-4 py-3">
                    Exam
                  </th>

                  <th className="px-4 py-3">
                    Total
                  </th>

                  <th className="px-4 py-3">
                    Grade
                  </th>

                  <th className="px-4 py-3">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody>
                {rows.map((row, index) => (
                  <tr
                    key={`${row.student_id}-${row.subject_name}-${index}`}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">
                        {row.student_name}
                      </div>

                      <div className="text-xs text-slate-400">
                        {row.admission_number}
                      </div>
                    </td>

                    <td className="px-4 py-3 font-medium text-slate-700">
                      {row.subject_name}
                    </td>

                    <td className="px-4 py-3">
                      {row.assignment_score ?? "—"}
                    </td>

                    <td className="px-4 py-3">
                      {row.classwork_score ?? "—"}
                    </td>

                    <td className="px-4 py-3">
                      {row.ca_score ?? "—"}
                    </td>

                    <td className="px-4 py-3">
                      {row.exam_score ?? "—"}
                    </td>

                    <td className="px-4 py-3 font-semibold">
                      {row.total_score}
                    </td>

                    <td className="px-4 py-3">
                      {row.grade ?? "—"}
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          row.status === "approved"
                            ? "bg-emerald-100 text-emerald-700"
                            : row.status === "published"
                              ? "bg-brand-100 text-brand-700"
                              : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}