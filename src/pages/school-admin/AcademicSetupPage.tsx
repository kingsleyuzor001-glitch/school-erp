import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  Session,
  Term,
  SchoolClass,
  listSessions,
  listTerms,
  listClasses
} from "../../services/academic";
import {
  updateSchoolAcademicSelection
} from "../../services/schools";
import {
  ClassSubjectCatalogItem,
  getClassSubjectCatalog,
  addSubjectToClass,
  removeSubjectFromClass
} from "../../services/classSubjects";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";

export default function AcademicSetupPage() {
  const { profile } = useAuth();

  const [sessions, setSessions] = useState<Session[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);

  const [selectedSession, setSelectedSession] = useState("");
  const [selectedTerm, setSelectedTerm] = useState("");
  const [selectedClass, setSelectedClass] = useState("");

  const [subjectCatalog, setSubjectCatalog] = useState<
    ClassSubjectCatalogItem[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [saving, setSaving] = useState(false);
  const [subjectSaving, setSubjectSaving] = useState<string | null>(null);

  async function loadAcademicOptions() {
    setLoading(true);

    try {
      const [
        sessionData,
        termData,
        classData
      ] = await Promise.all([
        listSessions(),
        listTerms(),
        listClasses()
      ]);

      setSessions(sessionData);
      setTerms(termData);
      setClasses(classData);

      const currentSession =
        sessionData.find((s) => s.is_current) ??
        sessionData[0];

      const currentTerm =
        termData.find((t) => t.is_current) ??
        termData[0];

      if (currentSession) {
        setSelectedSession(currentSession.id);
      }

      if (currentTerm) {
        setSelectedTerm(currentTerm.id);
      }

      if (classData.length) {
        setSelectedClass(classData[0].id);
      }
    } catch (error) {
      console.error(
        "Academic setup loading error:",
        error
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAcademicOptions();
  }, []);

  async function loadSubjectCatalog(classId: string) {
    if (!classId) {
      setSubjectCatalog([]);
      return;
    }

    setLoadingSubjects(true);

    try {
      const catalog =
        await getClassSubjectCatalog(classId);

      setSubjectCatalog(catalog);
    } catch (error: any) {
      console.error(
        "Class subject catalog error:",
        error
      );

      alert(
        error?.message ||
          "Unable to load subjects for this class."
      );

      setSubjectCatalog([]);
    } finally {
      setLoadingSubjects(false);
    }
  }

  useEffect(() => {
    if (!selectedClass) {
      setSubjectCatalog([]);
      return;
    }

    loadSubjectCatalog(selectedClass);
  }, [selectedClass]);

  async function saveSelection() {
    if (!profile?.school_id) return;

    if (!selectedSession || !selectedTerm) {
      alert(
        "Please select both an academic session and term."
      );
      return;
    }

    setSaving(true);

    const { error } =
      await updateSchoolAcademicSelection(
        profile.school_id,
        selectedSession,
        selectedTerm
      );

    setSaving(false);

    if (error) {
      alert(error.message);
      return;
    }

    alert(
      "Academic selection updated successfully."
    );
  }

  async function toggleSubject(
    subject: ClassSubjectCatalogItem
  ) {
    if (!selectedClass) return;

    setSubjectSaving(subject.subject_id);

    try {
      if (subject.assigned) {
        await removeSubjectFromClass(
          selectedClass,
          subject.subject_id
        );
      } else {
        await addSubjectToClass(
          selectedClass,
          subject.subject_id
        );
      }

      await loadSubjectCatalog(selectedClass);
    } catch (error: any) {
      console.error(
        "Subject assignment error:",
        error
      );

      alert(
        error?.message ||
          "Unable to update this subject."
      );
    } finally {
      setSubjectSaving(null);
    }
  }

  if (!profile?.school_id) {
    return null;
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">

      {/* =====================================================
          PAGE HEADER
      ===================================================== */}

      <div>
        <h1 className="font-display text-xl font-bold">
          Academic Setup
        </h1>

        <p className="text-sm text-slate-500">
          Configure your school's current academic session,
          term and the subjects offered in each class.
        </p>
      </div>


      {/* =====================================================
          SESSION / TERM
      ===================================================== */}

      {loading ? (

        <p className="text-sm text-slate-400">
          Loading academic options...
        </p>

      ) : (

        <Card>

          <div className="space-y-4">

            <div>
              <h2 className="font-semibold">
                Current Academic Period
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Select the session and term currently being
                used by your school.
              </p>
            </div>


            <div>

              <label className="mb-1 block text-sm font-medium">
                Current Session
              </label>

              <select
                value={selectedSession}
                onChange={(e) =>
                  setSelectedSession(e.target.value)
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              >

                <option value="">
                  Select session
                </option>

                {sessions.map((session) => (
                  <option
                    key={session.id}
                    value={session.id}
                  >
                    {session.name}
                  </option>
                ))}

              </select>

            </div>


            <div>

              <label className="mb-1 block text-sm font-medium">
                Current Term
              </label>

              <select
                value={selectedTerm}
                onChange={(e) =>
                  setSelectedTerm(e.target.value)
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              >

                <option value="">
                  Select term
                </option>

                {terms
                  .filter(
                    (term) =>
                      !selectedSession ||
                      term.session_id ===
                        selectedSession
                  )
                  .map((term) => (

                    <option
                      key={term.id}
                      value={term.id}
                    >
                      {term.name}
                    </option>

                  ))}

              </select>

            </div>


            <Button
              onClick={saveSelection}
              disabled={saving}
            >
              {saving
                ? "Saving..."
                : "Save Selection"}
            </Button>

          </div>

        </Card>

      )}


      {/* =====================================================
          CLASS SUBJECTS
      ===================================================== */}

      <Card>

        <div className="space-y-5">

          <div>
            <h2 className="font-semibold">
              Class Subjects
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Select the subjects that belong to each class.
              These subjects will appear in the class teacher's
              result-entry screen.
            </p>
          </div>


          {/* CLASS SELECTOR */}

          <div>

            <label className="mb-1 block text-sm font-medium">
              Select Class
            </label>

            <select
              value={selectedClass}
              onChange={(e) =>
                setSelectedClass(e.target.value)
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            >

              <option value="">
                Select class
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

          </div>


          {/* SUBJECT LIST */}

          {!selectedClass ? (

            <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center">

              <p className="text-sm text-slate-500">
                Select a class to manage its subjects.
              </p>

            </div>

          ) : loadingSubjects ? (

            <p className="text-sm text-slate-400">
              Loading subjects...
            </p>

          ) : subjectCatalog.length === 0 ? (

            <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center">

              <p className="text-sm text-slate-500">
                No subjects are available for this school.
              </p>

            </div>

          ) : (

            <div className="space-y-2">

              {subjectCatalog.map((subject) => {

                const busy =
                  subjectSaving ===
                  subject.subject_id;

                return (
                  <div
                    key={subject.subject_id}
                    className={`flex items-center justify-between gap-3 rounded-lg border p-3 transition ${
                      subject.assigned
                        ? "border-emerald-200 bg-emerald-50"
                        : "border-slate-200 bg-white"
                    }`}
                  >

                    <div className="flex min-w-0 items-center gap-3">

                      <input
                        type="checkbox"
                        checked={subject.assigned}
                        disabled={busy}
                        onChange={() =>
                          toggleSubject(subject)
                        }
                        className="h-4 w-4"
                      />

                      <div className="min-w-0">

                        <p className="text-sm font-medium">
                          {subject.subject_name}
                        </p>

                        <p className="text-xs text-slate-500">
                          {subject.assigned
                            ? "Assigned to this class"
                            : "Not assigned"}
                        </p>

                      </div>

                    </div>


                    <span
                      className={`shrink-0 rounded-full px-2 py-1 text-xs font-medium ${
                        subject.assigned
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {busy
                        ? "Updating..."
                        : subject.assigned
                        ? "Assigned"
                        : "Available"}
                    </span>

                  </div>
                );
              })}

            </div>

          )}


          {/* SUMMARY */}

          {selectedClass &&
            !loadingSubjects &&
            subjectCatalog.length > 0 && (

              <div className="rounded-lg bg-slate-50 p-3">

                <p className="text-sm text-slate-600">

                  <span className="font-semibold">
                    {
                      subjectCatalog.filter(
                        (subject) =>
                          subject.assigned
                      ).length
                    }
                  </span>{" "}
                  subject
                  {
                    subjectCatalog.filter(
                      (subject) =>
                        subject.assigned
                    ).length === 1
                      ? ""
                      : "s"
                  }{" "}
                  assigned to this class.

                </p>

              </div>

            )}

        </div>

      </Card>

    </div>
  );
}