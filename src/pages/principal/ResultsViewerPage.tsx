import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { listTerms } from "../../services/academic";
import { getReportCard, ReportCard } from "../../services/results";
import { supabase } from "../../lib/supabase";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";

interface Student {
  id: string;
  full_name: string;
  admission_number: string;
  class_id: string | null;
  status: string;
}

interface SchoolClass {
  id: string;
  name: string;
  arm?: string | null;
}

interface Subject {
  id: string;
  name: string;
  code?: string | null;
}

interface ResultRow {
  id: string;
  student_id: string;
  subject_id: string;
  subject_name: string;
  assignment_score: number | null;
  classwork_score: number | null;
  ca_score: number | null;
  exam_score: number | null;
  total_score: number;
  grade: string | null;
  status: "draft" | "submitted" | "approved" | "published";
  teacher_comment: string | null;
  session_id: string;
}

type ScoreField =
  | "assignment_score"
  | "classwork_score"
  | "ca_score"
  | "exam_score"
  | "teacher_comment";

function displayClassName(schoolClass: SchoolClass | undefined) {
  if (!schoolClass) return "Class";
  return `${schoolClass.name}${schoolClass.arm ? ` ${schoolClass.arm}` : ""}`;
}

function numberValue(value: number | null | undefined) {
  return value === null || value === undefined ? "" : String(value);
}

export default function ResultsViewerPage() {
  const { profile } = useAuth();

  const [terms, setTerms] = useState<any[]>([]);
  const [termId, setTermId] = useState("");

  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [classId, setClassId] = useState("");

  const [students, setStudents] = useState<Student[]>([]);
  const [studentId, setStudentId] = useState("");

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [rows, setRows] = useState<ResultRow[]>([]);

  const [card, setCard] = useState<ReportCard | null>(null);

  const [loadingSetup, setLoadingSetup] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingResults, setLoadingResults] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const [editing, setEditing] = useState(false);

  const selectedClass = useMemo(
    () => classes.find((item) => item.id === classId),
    [classes, classId]
  );

  const selectedStudent = useMemo(
    () => students.find((item) => item.id === studentId),
    [students, studentId]
  );

  const selectedTerm = useMemo(
    () => terms.find((item) => item.id === termId),
    [terms, termId]
  );

  const resultStatus = useMemo(() => {
    if (rows.some((row) => row.status === "published")) {
      return "published";
    }

    if (rows.some((row) => row.status === "approved")) {
      return "approved";
    }

    if (rows.some((row) => row.status === "submitted")) {
      return "submitted";
    }

    return "draft";
  }, [rows]);

  const missingSubjects = useMemo(() => {
    const existingSubjectIds = new Set(
      rows.map((row) => row.subject_id)
    );

    return subjects.filter(
      (subject) => !existingSubjectIds.has(subject.id)
    );
  }, [subjects, rows]);

  useEffect(() => {
    const schoolId = profile?.school_id;

    if (!schoolId) return;

    async function loadSetup() {
      try {
        setLoadingSetup(true);
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

        setTerms(termData || []);
        setClasses((classData.data || []) as SchoolClass[]);

        if (termData?.length) {
          const currentTerm =
            termData.find((term: any) => term.is_current) ??
            termData[0];

          setTermId(currentTerm.id);
        }

        if (classData.data?.length) {
          setClassId(classData.data[0].id);
        }
      } catch (err: any) {
        setError(
          err.message || "Unable to load result setup."
        );
      } finally {
        setLoadingSetup(false);
      }
    }

    loadSetup();
  }, [profile?.school_id]);

  useEffect(() => {
    if (!classId) {
      setStudents([]);
      setStudentId("");
      setSubjects([]);
      setRows([]);
      setCard(null);
      return;
    }

    async function loadStudentsAndSubjects() {
      try {
        setLoadingStudents(true);
        setError(null);
        setMessage("");
        setEditing(false);

        const [studentData, subjectData] = await Promise.all([
          supabase
            .from("students")
            .select(
              "id, full_name, admission_number, class_id, status"
            )
            .eq("class_id", classId)
            .eq("status", "active")
            .order("full_name"),

          supabase
            .from("class_subjects")
            .select(
              `
                subject_id,
                subjects (
                  id,
                  name,
                  code
                )
              `
            )
            .eq("class_id", classId)
        ]);

        if (studentData.error) {
          throw studentData.error;
        }

        if (subjectData.error) {
          throw subjectData.error;
        }

        const loadedStudents =
          (studentData.data || []) as Student[];

        setStudents(loadedStudents);

        const loadedSubjects: Subject[] = (
          subjectData.data || []
        )
          .map((row: any) => row.subjects)
          .filter(Boolean)
          .sort((a: Subject, b: Subject) =>
            a.name.localeCompare(b.name)
          );

        setSubjects(loadedSubjects);

        setStudentId((current) =>
          loadedStudents.some(
            (student) => student.id === current
          )
            ? current
            : loadedStudents[0]?.id ?? ""
        );
      } catch (err: any) {
        setError(
          err.message ||
            "Unable to load students and subjects."
        );
        setStudents([]);
        setSubjects([]);
        setStudentId("");
      } finally {
        setLoadingStudents(false);
      }
    }

    loadStudentsAndSubjects();
  }, [classId]);

  useEffect(() => {
    if (!studentId || !termId || !classId) {
      setRows([]);
      setCard(null);
      return;
    }

    async function loadStudentResult() {
      try {
        setLoadingResults(true);
        setError(null);
        setMessage("");
        setEditing(false);

        const [resultData, reportCard] = await Promise.all([
          supabase
            .from("result_scores")
            .select(
              `
                id,
                student_id,
                subject_id,
                assignment_score,
                classwork_score,
                ca_score,
                exam_score,
                total_score,
                grade,
                status,
                teacher_comment,
                session_id,
                subjects (
                  name
                )
              `
            )
            .eq("school_id", profile?.school_id)
            .eq("class_id", classId)
            .eq("student_id", studentId)
            .eq("term_id", termId)
            .order("subject_id"),

          getReportCard(studentId, termId)
        ]);

        if (resultData.error) {
          throw resultData.error;
        }

        const mapped: ResultRow[] = (
          resultData.data || []
        ).map((row: any) => ({
          id: row.id,
          student_id: row.student_id,
          subject_id: row.subject_id,
          subject_name:
            row.subjects?.name ?? "Unknown subject",
          assignment_score: row.assignment_score,
          classwork_score: row.classwork_score,
          ca_score: row.ca_score,
          exam_score: row.exam_score,
          total_score: row.total_score ?? 0,
          grade: row.grade,
          status: row.status,
          teacher_comment: row.teacher_comment,
          session_id: row.session_id
        }));

        setRows(mapped);
        setCard(reportCard);
      } catch (err: any) {
        setError(
          err.message ||
            "Unable to load this student's result."
        );
        setRows([]);
        setCard(null);
      } finally {
        setLoadingResults(false);
      }
    }

    loadStudentResult();
  }, [
    profile?.school_id,
    classId,
    studentId,
    termId
  ]);

  function updateRow(
    rowId: string,
    field: ScoreField,
    value: string
  ) {
    setRows((current) =>
      current.map((row) => {
        if (row.id !== rowId) return row;

        if (field === "teacher_comment") {
          return {
            ...row,
            teacher_comment: value
          };
        }

        const parsed =
          value === "" ? null : Number(value);

        return {
          ...row,
          [field]: parsed
        };
      })
    );
  }

  async function saveChanges() {
    if (!profile?.school_id || !studentId || !termId) {
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setMessage("");

      for (const row of rows) {
        const { error: updateError } = await supabase
          .from("result_scores")
          .update({
            assignment_score:
              row.assignment_score ?? 0,
            classwork_score:
              row.classwork_score ?? 0,
            ca_score: row.ca_score ?? 0,
            exam_score: row.exam_score ?? 0,
            teacher_comment:
              row.teacher_comment ?? ""
          })
          .eq("id", row.id)
          .eq("school_id", profile.school_id)
          .eq("student_id", studentId)
          .eq("term_id", termId);

        if (updateError) {
          throw updateError;
        }
      }

      const { data: refreshedRows, error: refreshError } =
        await supabase
          .from("result_scores")
          .select(
            `
              id,
              student_id,
              subject_id,
              assignment_score,
              classwork_score,
              ca_score,
              exam_score,
              total_score,
              grade,
              status,
              teacher_comment,
              session_id,
              subjects (
                name
              )
            `
          )
          .eq("school_id", profile.school_id)
          .eq("class_id", classId)
          .eq("student_id", studentId)
          .eq("term_id", termId)
          .order("subject_id");

      if (refreshError) {
        throw refreshError;
      }

      const mapped: ResultRow[] = (
        refreshedRows || []
      ).map((row: any) => ({
        id: row.id,
        student_id: row.student_id,
        subject_id: row.subject_id,
        subject_name:
          row.subjects?.name ?? "Unknown subject",
        assignment_score: row.assignment_score,
        classwork_score: row.classwork_score,
        ca_score: row.ca_score,
        exam_score: row.exam_score,
        total_score: row.total_score ?? 0,
        grade: row.grade,
        status: row.status,
        teacher_comment: row.teacher_comment,
        session_id: row.session_id
      }));

      setRows(mapped);

      const refreshedCard = await getReportCard(
        studentId,
        termId
      );

      setCard(refreshedCard);
      setEditing(false);
      setMessage(
        "Result corrections saved successfully."
      );
    } catch (err: any) {
      setError(
        err.message ||
          "Unable to save the result corrections."
      );
    } finally {
      setSaving(false);
    }
  }

  async function addMissingSubject(subject: Subject) {
    if (
      !profile?.school_id ||
      !studentId ||
      !classId ||
      !termId
    ) {
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setMessage("");

      const existingSessionId =
        rows.find((row) => row.session_id)?.session_id;

      const selectedTermSessionId =
        selectedTerm?.session_id;

      const sessionId =
        existingSessionId ?? selectedTermSessionId;

      if (!sessionId) {
        throw new Error(
          "This term does not have an academic session. Please check School Academic Setup."
        );
      }

      const statusToUse =
        resultStatus === "published"
          ? "published"
          : resultStatus === "approved"
            ? "approved"
            : resultStatus === "submitted"
              ? "submitted"
              : "draft";

      const { error: insertError } = await supabase
        .from("result_scores")
        .insert({
          school_id: profile.school_id,
          student_id: studentId,
          subject_id: subject.id,
          class_id: classId,
          session_id: sessionId,
          term_id: termId,
          assignment_score: 0,
          classwork_score: 0,
          ca_score: 0,
          exam_score: 0,
          teacher_comment: "",
          entered_by: profile.id,
          status: statusToUse
        });

      if (insertError) {
        throw insertError;
      }

      const { data: refreshedRows, error: refreshError } =
        await supabase
          .from("result_scores")
          .select(
            `
              id,
              student_id,
              subject_id,
              assignment_score,
              classwork_score,
              ca_score,
              exam_score,
              total_score,
              grade,
              status,
              teacher_comment,
              session_id,
              subjects (
                name
              )
            `
          )
          .eq("school_id", profile.school_id)
          .eq("class_id", classId)
          .eq("student_id", studentId)
          .eq("term_id", termId)
          .order("subject_id");

      if (refreshError) {
        throw refreshError;
      }

      const mapped: ResultRow[] = (
        refreshedRows || []
      ).map((row: any) => ({
        id: row.id,
        student_id: row.student_id,
        subject_id: row.subject_id,
        subject_name:
          row.subjects?.name ?? "Unknown subject",
        assignment_score: row.assignment_score,
        classwork_score: row.classwork_score,
        ca_score: row.ca_score,
        exam_score: row.exam_score,
        total_score: row.total_score ?? 0,
        grade: row.grade,
        status: row.status,
        teacher_comment: row.teacher_comment,
        session_id: row.session_id
      }));

      setRows(mapped);

      const refreshedCard = await getReportCard(
        studentId,
        termId
      );

      setCard(refreshedCard);
      setMessage(
        `${subject.name} has been added to this student's result.`
      );
      setEditing(true);
    } catch (err: any) {
      setError(
        err.message ||
          `Unable to add ${subject.name}.`
      );
    } finally {
      setSaving(false);
    }
  }

  function total(row: ResultRow) {
    return (
      (Number(row.assignment_score) || 0) +
      (Number(row.classwork_score) || 0) +
      (Number(row.ca_score) || 0) +
      (Number(row.exam_score) || 0)
    );
  }

  function statusClasses(
    status: ResultRow["status"]
  ) {
    if (status === "published") {
      return "bg-brand-100 text-brand-700";
    }

    if (status === "approved") {
      return "bg-emerald-100 text-emerald-700";
    }

    if (status === "submitted") {
      return "bg-amber-100 text-amber-700";
    }

    return "bg-slate-100 text-slate-600";
  }

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <div>
        <h1 className="font-display text-xl font-bold">
          View Results
        </h1>

        <p className="text-sm text-slate-500">
          Select a class and student to view the complete
          compiled result. School Owner and School Admin can
          correct result errors or omissions.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          value={termId}
          onChange={(event) =>
            setTermId(event.target.value)
          }
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">Select term</option>

          {terms.map((term) => (
            <option key={term.id} value={term.id}>
              {term.name}
            </option>
          ))}
        </select>

        <select
          value={classId}
          onChange={(event) =>
            setClassId(event.target.value)
          }
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">Select class</option>

          {classes.map((schoolClass) => (
            <option
              key={schoolClass.id}
              value={schoolClass.id}
            >
              {displayClassName(schoolClass)}
            </option>
          ))}
        </select>

        <select
          value={studentId}
          onChange={(event) =>
            setStudentId(event.target.value)
          }
          disabled={!classId || loadingStudents}
          className="min-w-[220px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-100"
        >
          <option value="">
            {loadingStudents
              ? "Loading students..."
              : "Select student"}
          </option>

          {students.map((student) => (
            <option
              key={student.id}
              value={student.id}
            >
              {student.full_name}
              {student.admission_number
                ? ` — ${student.admission_number}`
                : ""}
            </option>
          ))}
        </select>
      </div>

      {loadingSetup && (
        <p className="text-sm text-slate-400">
          Loading result setup...
        </p>
      )}

      {error && (
        <Card className="border border-rose-200 bg-rose-50">
          <p className="text-sm text-rose-700">
            {error}
          </p>
        </Card>
      )}

      {message && (
        <Card className="border border-emerald-200 bg-emerald-50">
          <p className="text-sm text-emerald-700">
            {message}
          </p>
        </Card>
      )}

      {classId && students.length === 0 && !loadingStudents && (
        <Card>
          <p className="text-sm text-slate-500">
            No active students were found in this class.
          </p>
        </Card>
      )}

      {studentId && (
        <>
          <Card>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {selectedStudent?.full_name ??
                    "Selected student"}
                </h2>

                <div className="mt-1 space-y-1 text-sm text-slate-500">
                  <p>
                    Admission No:{" "}
                    <span className="font-medium text-slate-700">
                      {selectedStudent?.admission_number ??
                        "—"}
                    </span>
                  </p>

                  <p>
                    Class:{" "}
                    <span className="font-medium text-slate-700">
                      {displayClassName(selectedClass)}
                    </span>
                  </p>

                  <p>
                    Term:{" "}
                    <span className="font-medium text-slate-700">
                      {selectedTerm?.name ?? "—"}
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {rows.length > 0 && (
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${statusClasses(
                      resultStatus
                    )}`}
                  >
                    {resultStatus}
                  </span>
                )}

                <Button
                  variant="secondary"
                  onClick={() =>
                    setEditing((current) => !current)
                  }
                  disabled={rows.length === 0}
                >
                  {editing ? "Close Editing" : "Edit Result"}
                </Button>
              </div>
            </div>
          </Card>

          {loadingResults ? (
            <Card>
              <div className="py-8 text-center text-sm text-slate-400">
                Loading student's compiled result...
              </div>
            </Card>
          ) : rows.length === 0 ? (
            <Card>
              <div className="py-8 text-center">
                <p className="text-sm font-medium text-slate-700">
                  No result entries found for this student
                  and term.
                </p>

                {subjects.length > 0 && (
                  <p className="mt-1 text-sm text-slate-500">
                    The class has {subjects.length} assigned
                    subject
                    {subjects.length === 1 ? "" : "s"}, but
                    no result has been entered yet.
                  </p>
                )}
              </div>
            </Card>
          ) : (
            <>
              <Card className="overflow-x-auto p-0">
                <div className="border-b border-slate-200 px-4 py-4">
                  <h3 className="font-semibold text-slate-800">
                    Compiled Result
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    Complete subject-by-subject result for{" "}
                    {selectedStudent?.full_name}.
                  </p>
                </div>

                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
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

                      <th className="px-4 py-3">
                        Comment
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {rows.map((row) => (
                      <tr
                        key={row.id}
                        className="border-b border-slate-100 last:border-0"
                      >
                        <td className="px-4 py-3 font-medium text-slate-800">
                          {row.subject_name}
                        </td>

                        {editing ? (
                          <>
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                min={0}
                                max={100}
                                step="0.01"
                                value={numberValue(
                                  row.assignment_score
                                )}
                                onChange={(event) =>
                                  updateRow(
                                    row.id,
                                    "assignment_score",
                                    event.target.value
                                  )
                                }
                                className="w-20 rounded border border-slate-300 px-2 py-1.5 text-sm"
                              />
                            </td>

                            <td className="px-4 py-3">
                              <input
                                type="number"
                                min={0}
                                max={100}
                                step="0.01"
                                value={numberValue(
                                  row.classwork_score
                                )}
                                onChange={(event) =>
                                  updateRow(
                                    row.id,
                                    "classwork_score",
                                    event.target.value
                                  )
                                }
                                className="w-20 rounded border border-slate-300 px-2 py-1.5 text-sm"
                              />
                            </td>

                            <td className="px-4 py-3">
                              <input
                                type="number"
                                min={0}
                                max={100}
                                step="0.01"
                                value={numberValue(
                                  row.ca_score
                                )}
                                onChange={(event) =>
                                  updateRow(
                                    row.id,
                                    "ca_score",
                                    event.target.value
                                  )
                                }
                                className="w-20 rounded border border-slate-300 px-2 py-1.5 text-sm"
                              />
                            </td>

                            <td className="px-4 py-3">
                              <input
                                type="number"
                                min={0}
                                max={100}
                                step="0.01"
                                value={numberValue(
                                  row.exam_score
                                )}
                                onChange={(event) =>
                                  updateRow(
                                    row.id,
                                    "exam_score",
                                    event.target.value
                                  )
                                }
                                className="w-20 rounded border border-slate-300 px-2 py-1.5 text-sm"
                              />
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-4 py-3">
                              {row.assignment_score ?? 0}
                            </td>

                            <td className="px-4 py-3">
                              {row.classwork_score ?? 0}
                            </td>

                            <td className="px-4 py-3">
                              {row.ca_score ?? 0}
                            </td>

                            <td className="px-4 py-3">
                              {row.exam_score ?? 0}
                            </td>
                          </>
                        )}

                        <td className="px-4 py-3 font-semibold">
                          {editing
                            ? total(row)
                            : row.total_score}
                        </td>

                        <td className="px-4 py-3">
                          <span className="rounded-full bg-brand-100 px-2.5 py-1 text-xs font-semibold text-brand-700">
                            {row.grade ?? "—"}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClasses(
                              row.status
                            )}`}
                          >
                            {row.status}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          {editing ? (
                            <input
                              type="text"
                              value={
                                row.teacher_comment ?? ""
                              }
                              onChange={(event) =>
                                updateRow(
                                  row.id,
                                  "teacher_comment",
                                  event.target.value
                                )
                              }
                              className="w-52 rounded border border-slate-300 px-2 py-1.5 text-sm"
                              placeholder="Teacher comment"
                            />
                          ) : (
                            <span className="text-slate-600">
                              {row.teacher_comment || "—"}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>

              {editing && (
                <Card>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      onClick={saveChanges}
                      loading={saving}
                    >
                      Save Corrections
                    </Button>

                    <Button
                      variant="secondary"
                      onClick={() => setEditing(false)}
                      disabled={saving}
                    >
                      Cancel
                    </Button>

                    <p className="text-xs text-slate-500">
                      Saving corrections keeps the existing
                      result status. Totals and grades are
                      recalculated automatically by the
                      database.
                    </p>
                  </div>
                </Card>
              )}

              {missingSubjects.length > 0 && (
                <Card>
                  <div className="border-b border-slate-200 pb-3">
                    <h3 className="font-semibold text-slate-800">
                      Missing Subject Results
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      These subjects belong to this class but
                      do not yet have a result entry for this
                      student.
                    </p>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {missingSubjects.map((subject) => (
                      <Button
                        key={subject.id}
                        variant="secondary"
                        onClick={() =>
                          addMissingSubject(subject)
                        }
                        loading={saving}
                        disabled={saving}
                      >
                        Add {subject.name}
                      </Button>
                    ))}
                  </div>
                </Card>
              )}

              {card && (
                <Card>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-medium uppercase text-slate-400">
                        Position in Class
                      </p>

                      <p className="mt-1 text-lg font-bold text-slate-900">
                        {card.position ?? "—"}
                        {card.position &&
                        card.class_size
                          ? ` of ${card.class_size}`
                          : ""}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-medium uppercase text-slate-400">
                        Subjects
                      </p>

                      <p className="mt-1 text-lg font-bold text-slate-900">
                        {rows.length}
                        {subjects.length
                          ? ` of ${subjects.length}`
                          : ""}
                      </p>
                    </div>
                  </div>

                  {card.comments
                    .class_teacher_comment && (
                    <p className="mt-4 text-sm">
                      <span className="font-medium">
                        Class teacher:
                      </span>{" "}
                      {
                        card.comments
                          .class_teacher_comment
                      }
                    </p>
                  )}

                  {card.comments
                    .principal_comment && (
                    <p className="mt-2 text-sm">
                      <span className="font-medium">
                        Principal:
                      </span>{" "}
                      {card.comments.principal_comment}
                    </p>
                  )}
                </Card>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}