import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  listMyClasses,
  listClasses,
  listSubjects
} from "../../services/academic";
import {
  listLessonNotes,
  getSignedNoteUrl,
  LessonNote
} from "../../services/lessonNotes";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";

export default function LessonNotesPage() {
  const { profile } = useAuth();

  const [notes, setNotes] = useState<LessonNote[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);

  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [week, setWeek] = useState("");

  const [loading, setLoading] = useState(true);
  const [openingId, setOpeningId] = useState<string | null>(null);

  async function loadNotes() {
    if (!profile) return;

    setLoading(true);

    try {
      const classesPromise =
        profile.role === "teacher"
          ? listMyClasses()
          : listClasses();

      const [
        availableClasses,
        allSubjects,
        lessonNotes
      ] = await Promise.all([
        classesPromise,
        listSubjects(),
        listLessonNotes(
          classId || undefined,
          subjectId || undefined
        )
      ]);

      setClasses(availableClasses);
      setSubjects(allSubjects);
      setNotes(lessonNotes);
    } catch (error) {
      console.error(
        "Failed to load lesson notes:",
        error
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (profile) {
      loadNotes();
    }
  }, [
    classId,
    subjectId,
    profile?.role
  ]);

  async function openNote(note: LessonNote) {
    if (!note.file_url) {
      alert(
        "This lesson note does not have a file attached."
      );
      return;
    }

    try {
      setOpeningId(note.id);

      const signedUrl =
        await getSignedNoteUrl(note.file_url);

      window.open(
        signedUrl,
        "_blank",
        "noopener,noreferrer"
      );
    } catch (error) {
      console.error(
        "Failed to open lesson note:",
        error
      );

      alert(
        "Unable to open this lesson note. Please try again."
      );
    } finally {
      setOpeningId(null);
    }
  }

  const selectedClass = classes.find(
    (item) => item.id === classId
  );

  const selectedSubject = subjects.find(
    (item) => item.id === subjectId
  );

  const visibleNotes = useMemo(() => {
    if (!week) {
      return notes;
    }

    return notes.filter(
      (note) => String(note.week ?? "") === week
    );
  }, [notes, week]);

  const weekNumbers = useMemo(() => {
    return Array.from(
      new Set(
        notes
          .map((note) => note.week)
          .filter(
            (value): value is number =>
              typeof value === "number"
          )
      )
    ).sort((a, b) => a - b);
  }, [notes]);

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <div>
        <h1 className="font-display text-xl font-bold">
          Lesson Notes
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Access the shared curriculum for the classes
          available to you.
        </p>
      </div>

      <Card>
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium uppercase text-slate-500">
              Class
            </label>

            <select
              value={classId}
              onChange={(e) => {
                setClassId(e.target.value);
                setWeek("");
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">
                Select class…
              </option>

              {classes.map((item) => (
                <option
                  key={item.id}
                  value={item.id}
                >
                  {item.name}
                  {item.arm
                    ? ` ${item.arm}`
                    : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium uppercase text-slate-500">
              Subject
            </label>

            <select
              value={subjectId}
              onChange={(e) => {
                setSubjectId(e.target.value);
                setWeek("");
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">
                Select subject…
              </option>

              {subjects.map((item) => (
                <option
                  key={item.id}
                  value={item.id}
                >
                  {item.name}
                  {item.code
                    ? ` (${item.code})`
                    : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium uppercase text-slate-500">
              Week
            </label>

            <select
              value={week}
              onChange={(e) =>
                setWeek(e.target.value)
              }
              disabled={!notes.length}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
            >
              <option value="">
                All weeks
              </option>

              {weekNumbers.map((value) => (
                <option
                  key={value}
                  value={String(value)}
                >
                  Week {value}
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedClass &&
          selectedSubject && (
            <div className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
              <strong>
                {selectedClass.name}
                {selectedClass.arm
                  ? ` ${selectedClass.arm}`
                  : ""}
              </strong>{" "}
              —{" "}
              <strong>
                {selectedSubject.name}
              </strong>
            </div>
          )}
      </Card>

      {!classId || !subjectId ? (
        <Card>
          <div className="py-8 text-center">
            <p className="font-medium text-slate-700">
              Select a class and subject
            </p>

            <p className="mt-1 text-sm text-slate-400">
              Choose the curriculum you want to view.
            </p>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-base font-semibold">
                {selectedSubject?.name ||
                  "Lesson Notes"}
              </h2>

              <p className="text-xs text-slate-500">
                {visibleNotes.length} lesson note
                {visibleNotes.length === 1
                  ? ""
                  : "s"}
                {week
                  ? ` · Week ${week}`
                  : ""}
              </p>
            </div>

            <Button
              type="button"
              onClick={loadNotes}
              disabled={loading}
            >
              {loading
                ? "Refreshing…"
                : "Refresh"}
            </Button>
          </div>

          {loading ? (
            <p className="py-6 text-sm text-slate-400">
              Loading lesson notes…
            </p>
          ) : visibleNotes.length === 0 ? (
            <div className="rounded-lg bg-slate-50 px-4 py-8 text-center">
              <p className="font-medium text-slate-700">
                No lesson notes found
              </p>

              <p className="mt-1 text-sm text-slate-400">
                There are no uploaded notes for this
                class and subject yet.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {visibleNotes.map((note) => (
                <div
                  key={note.id}
                  className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800">
                      {note.title}
                    </p>

                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                      <span>
                        Week {note.week ?? "—"}
                      </span>

                      <span>
                        {note.file_type ||
                          "File"}
                      </span>

                      <span>
                        {new Date(
                          note.created_at
                        ).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    onClick={() =>
                      openNote(note)
                    }
                    loading={
                      openingId === note.id
                    }
                    className="w-full sm:w-auto"
                  >
                    {openingId === note.id
                      ? "Opening…"
                      : "Open lesson note"}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      <p className="text-xs text-slate-400">
        Lesson notes are provided from the central curriculum
        library and are available to your school staff.
      </p>
    </div>
  );
}
