import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { listStudentsForAttendance } from "../../services/attendance";
import { listTerms, listSessions } from "../../services/academic";
import { getSchoolAcademicSelection } from "../../services/schoolAcademic";
import {
  ResultScore,
  listMyResultClasses,
  listMyResultSubjects,
  listResultsForEntry,
  saveScore,
  submitResults
} from "../../services/results";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";

export default function ResultsEntryPage() {
  const { profile } = useAuth();

  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);

  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [termId, setTermId] = useState("");
  const [schoolSessionId, setSchoolSessionId] = useState("");

  const [students, setStudents] = useState<any[]>([]);
  const [scores, setScores] =
    useState<Record<string, Partial<ResultScore>>>({});

  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  /*
   * ============================================================
   * LOAD CLASSES / TERMS / SESSIONS
   * ============================================================
   */

  useEffect(() => {
    async function load() {
      if (!profile?.school_id) return;

      try {
        const [
          resultClasses,
          termList,
          sessionList,
          academicSelection
        ] = await Promise.all([
          listMyResultClasses(),
          listTerms(),
          listSessions(),
          getSchoolAcademicSelection(profile.school_id)
        ]);

        setClasses(resultClasses || []);
        setTerms(termList || []);
        setSessions(sessionList || []);

        setSchoolSessionId(
          academicSelection.current_session_id || ""
        );

        if (resultClasses?.length) {
          setClassId(resultClasses[0].id);
        }

        if (academicSelection.current_term_id) {
          setTermId(academicSelection.current_term_id);
        } else if (termList?.length) {
          setTermId(
            (
              termList.find((x: any) => x.is_current) ??
              termList[0]
            ).id
          );
        }
      } catch (error: any) {
        console.error(
          "Results entry loading error:",
          error
        );

        setMessage(
          error?.message ||
            "Unable to load result-entry information."
        );
      }
    }

    load();
  }, [profile?.school_id]);

  /*
   * ============================================================
   * LOAD SUBJECTS FOR SELECTED CLASS
   *
   * IMPORTANT:
   * We intentionally DO NOT use listSubjects().
   *
   * The subject dropdown must contain only subjects belonging
   * to the selected class.
   * ============================================================
   */

  useEffect(() => {
    if (!classId) {
      setSubjects([]);
      setSubjectId("");
      return;
    }

    async function loadSubjects() {
      try {
        setMessage(null);

        const subjectList =
          await listMyResultSubjects(classId);

        setSubjects(subjectList || []);

        /*
         * Automatically select the first subject when available.
         */
        if (subjectList?.length) {
          setSubjectId((current) => {
            const stillExists = subjectList.some(
              (subject: any) =>
                subject.id === current
            );

            return stillExists
              ? current
              : subjectList[0].id;
          });
        } else {
          setSubjectId("");
        }
      } catch (error: any) {
        console.error(
          "Result subjects loading error:",
          error
        );

        setSubjects([]);
        setSubjectId("");

        setMessage(
          error?.message ||
            "Unable to load subjects for this class."
        );
      }
    }

    loadSubjects();
  }, [classId]);

  /*
   * ============================================================
   * LOAD STUDENTS + EXISTING RESULTS
   * ============================================================
   */

  useEffect(() => {
    if (!classId || !subjectId || !termId) {
      setStudents([]);
      setScores({});
      return;
    }

    async function loadResults() {
      try {
        const [
          studentList,
          existing
        ] = await Promise.all([
          listStudentsForAttendance(classId),
          listResultsForEntry(
            classId,
            subjectId,
            termId
          )
        ]);

        setStudents(studentList || []);

        const byStudent:
          Record<string, Partial<ResultScore>> = {};

        (studentList || []).forEach(
          (student: any) => {
            byStudent[student.id] = {
              assignment_score: 0,
              classwork_score: 0,
              ca_score: 0,
              exam_score: 0,
              teacher_comment: ""
            };
          }
        );

        (existing || []).forEach((result) => {
          byStudent[result.student_id] = result;
        });

        setScores(byStudent);
        setMessage(null);
      } catch (error: any) {
        console.error(
          "Results loading error:",
          error
        );

        setStudents([]);
        setScores({});

        setMessage(
          error?.message ||
            "Unable to load results for this class, subject and term."
        );
      }
    }

    loadResults();
  }, [classId, subjectId, termId]);

  /*
   * ============================================================
   * UPDATE SCORE
   * ============================================================
   */

  function update(
    studentId: string,
    field: keyof ResultScore,
    value: string
  ) {
    setScores((current) => ({
      ...current,
      [studentId]: {
        ...current[studentId],
        [field]:
          field === "teacher_comment"
            ? value
            : Number(value) || 0
      }
    }));
  }

  /*
   * ============================================================
   * TOTAL
   * ============================================================
   */

  function total(score: Partial<ResultScore>) {
    return (
      (Number(score.assignment_score) || 0) +
      (Number(score.classwork_score) || 0) +
      (Number(score.ca_score) || 0) +
      (Number(score.exam_score) || 0)
    );
  }

  /*
   * ============================================================
   * SAVE DRAFT
   * ============================================================
   */

  async function saveAll() {
    if (!profile?.school_id) return;

    const currentSessionId =
      schoolSessionId ||
      sessions[0]?.id ||
      "";

    if (!currentSessionId) {
      setMessage(
        "No academic session is selected for this school."
      );
      return;
    }

    if (!classId) {
      setMessage("Please select a class.");
      return;
    }

    if (!subjectId) {
      setMessage("Please select a subject.");
      return;
    }

    if (!termId) {
      setMessage("Please select an academic term.");
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      for (const [
        studentId,
        score
      ] of Object.entries(scores)) {
        const { error } = await saveScore({
          schoolId: profile.school_id,
          studentId,
          subjectId,
          classId,
          sessionId: currentSessionId,
          termId,

          assignment:
            Number(score.assignment_score) || 0,

          classwork:
            Number(score.classwork_score) || 0,

          ca:
            Number(score.ca_score) || 0,

          exam:
            Number(score.exam_score) || 0,

          teacherComment:
            (score.teacher_comment as string) || "",

          enteredBy: profile.id
        });

        if (error) {
          throw error;
        }
      }

      setMessage("Draft saved successfully.");
    } catch (error: any) {
      console.error(
        "Save results error:",
        error
      );

      setMessage(
        error?.message ||
          "Unable to save the result draft."
      );
    } finally {
      setSaving(false);
    }
  }

  /*
   * ============================================================
   * SUBMIT RESULTS
   * ============================================================
   */

  async function handleSubmit() {
    if (!classId || !subjectId || !termId) {
      setMessage(
        "Please select a class, subject and term before submitting."
      );
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      await saveAll();

      const { error } = await submitResults(
        classId,
        subjectId,
        termId
      );

      if (error) {
        throw error;
      }

      setMessage(
        "Results submitted for principal approval."
      );
    } catch (error: any) {
      console.error(
        "Submit results error:",
        error
      );

      setMessage(
        error?.message ||
          "Unable to submit results for approval."
      );
    } finally {
      setSubmitting(false);
    }
  }

  /*
   * ============================================================
   * UI
   * ============================================================
   */

  return (
    <div className="space-y-4 p-4 sm:p-6">

      <div>
        <h1 className="font-display text-xl font-bold">
          Enter Results
        </h1>

        <p className="text-sm text-slate-500">
          Class teachers prepare complete results for every
          subject assigned to their class.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">

        {/* CLASS */}

        <select
          value={classId}
          onChange={(event) => {
            setClassId(event.target.value);
            setSubjectId("");
            setSubjects([]);
            setStudents([]);
            setScores({});
          }}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
        >
          <option value="">
            Class…
          </option>

          {classes.map((classRoom) => (
            <option
              key={classRoom.id}
              value={classRoom.id}
            >
              {classRoom.name}
              {classRoom.arm
                ? ` ${classRoom.arm}`
                : ""}
            </option>
          ))}
        </select>

        {/* SUBJECT */}

        <select
          value={subjectId}
          onChange={(event) =>
            setSubjectId(event.target.value)
          }
          disabled={!classId || subjects.length === 0}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm disabled:bg-slate-100"
        >
          <option value="">
            {classId
              ? subjects.length
                ? "Subject…"
                : "No subjects assigned"
              : "Select class first"}
          </option>

          {subjects.map((subject) => (
            <option
              key={subject.id}
              value={subject.id}
            >
              {subject.name}
            </option>
          ))}
        </select>

        {/* TERM */}

        <select
          value={termId}
          onChange={(event) =>
            setTermId(event.target.value)
          }
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
        >
          <option value="">
            Term…
          </option>

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

      {/* NO CLASSES */}

      {classes.length === 0 && (
        <Card className="p-4">
          <p className="text-sm text-slate-500">
            No classes are currently assigned to you as a
            class teacher.
          </p>
        </Card>
      )}

      {/* NO SUBJECTS */}

      {classId &&
        subjects.length === 0 &&
        !message && (
          <Card className="p-4">
            <p className="text-sm text-slate-500">
              No subjects are assigned to this class yet.
            </p>
          </Card>
        )}

      {/* STUDENTS / RESULTS */}

      {students.length > 0 && (
        <Card className="overflow-x-auto p-0">

          <table className="w-full min-w-[720px] text-left text-sm">

            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-3">
                  Student
                </th>

                <th className="px-3 py-3">
                  Assign.
                </th>

                <th className="px-3 py-3">
                  Classwork
                </th>

                <th className="px-3 py-3">
                  CA
                </th>

                <th className="px-3 py-3">
                  Exam
                </th>

                <th className="px-3 py-3">
                  Total
                </th>

                <th className="px-3 py-3">
                  Comment
                </th>
              </tr>
            </thead>

            <tbody>

              {students.map((student) => {
                const score =
                  scores[student.id] || {};

                return (
                  <tr
                    key={student.id}
                    className="border-b border-slate-100 last:border-0"
                  >

                    <td className="px-3 py-2 font-medium">
                      {student.full_name}
                    </td>

                    {(
                      [
                        "assignment_score",
                        "classwork_score",
                        "ca_score",
                        "exam_score"
                      ] as const
                    ).map((field) => (
                      <td
                        key={field}
                        className="px-3 py-2"
                      >
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={
                            (score[field] as number) ?? 0
                          }
                          onChange={(event) =>
                            update(
                              student.id,
                              field,
                              event.target.value
                            )
                          }
                          className="w-16 rounded border border-slate-300 px-2 py-1 text-sm"
                        />
                      </td>
                    ))}

                    <td className="px-3 py-2 font-semibold">
                      {total(score)}
                    </td>

                    <td className="px-3 py-2">
                      <input
                        value={
                          (score.teacher_comment as string) ??
                          ""
                        }
                        onChange={(event) =>
                          update(
                            student.id,
                            "teacher_comment",
                            event.target.value
                          )
                        }
                        className="w-32 rounded border border-slate-300 px-2 py-1 text-sm"
                      />
                    </td>

                  </tr>
                );
              })}

            </tbody>
          </table>
        </Card>
      )}

      {/* ACTIONS */}

      {students.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">

          <Button
            variant="secondary"
            onClick={saveAll}
            loading={saving}
            disabled={submitting}
          >
            Save draft
          </Button>

          <Button
            onClick={handleSubmit}
            loading={submitting}
            disabled={saving}
          >
            Submit for approval
          </Button>

          {message && (
            <span className="text-sm text-slate-500">
              {message}
            </span>
          )}

        </div>
      )}

      {message &&
        students.length === 0 && (
          <p className="text-sm text-slate-500">
            {message}
          </p>
        )}

    </div>
  );
}
