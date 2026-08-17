import { useEffect, useState } from "react";
import {
  SchoolClass,
  Subject,
  listClasses,
  createClass,
  updateClass,
  deleteClass,
  listSubjects,
  createSubject,
  updateSubject,
  deleteSubject
} from "../../services/academic";
import {
  uploadLessonNotesBatch,
  BatchLessonNote,
  LessonNote,
  listLessonNotes,
  updateLessonNote,
  deleteLessonNote,
  getSignedNoteUrl
} from "../../services/lessonNotes";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";

export default function CurriculumPage() {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadAll() {
    setLoading(true);

    try {
      const [c, s] = await Promise.all([
        listClasses(),
        listSubjects()
      ]);

      setClasses(c);
      setSubjects(s);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div>
        <h1 className="font-display text-xl font-bold">
          Curriculum
        </h1>

        <p className="text-sm text-slate-500">
          Classes, subjects, and lesson notes are shared
          platform-wide. Every school automatically sees the
          curriculum created here.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">
          Loading…
        </p>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <ClassesPanel
              classes={classes}
              onChanged={loadAll}
            />

            <SubjectsPanel
              subjects={subjects}
              onChanged={loadAll}
            />
          </div>

          <LessonNotesPanel
            classes={classes}
            subjects={subjects}
          />
        </div>
      )}
    </div>
  );
}

function ClassesPanel({
  classes,
  onChanged
}: {
  classes: SchoolClass[];
  onChanged: () => void;
}) {
  const [name, setName] = useState("");
  const [arm, setArm] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingArm, setEditingArm] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function startEdit(item: SchoolClass) {
    setEditingId(item.id);
    setEditingName(item.name);
    setEditingArm(item.arm || "");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingName("");
    setEditingArm("");
  }

  async function saveEdit() {
    if (!editingId) return;

    if (!editingName.trim()) {
      alert("Class name cannot be empty.");
      return;
    }

    setSavingId(editingId);

    try {
      await updateClass(
        editingId,
        {
          name: editingName.trim(),
          arm: editingArm.trim() || undefined
        }
      );

      cancelEdit();
      await onChanged();
    } finally {
      setSavingId(null);
    }
  }

  async function removeClass(item: SchoolClass) {
    const label = `${item.name}${item.arm ? ` ${item.arm}` : ""}`;

    const confirmed = window.confirm(
      `Delete class "${label}"?\n\nThis may also affect curriculum records connected to this class.`
    );

    if (!confirmed) return;

    setDeletingId(item.id);

    try {
      await deleteClass(item.id);

      await onChanged();
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <Card>
      <h2 className="mb-3 font-display text-base font-semibold">
        Classes
      </h2>

      <div className="mb-4 overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="text-xs uppercase text-slate-500">
            <tr>
              <th className="py-1">Class</th>
              <th className="py-1">Arm</th>
              <th className="py-1">Actions</th>
            </tr>
          </thead>

          <tbody>
            {classes.map((c) => {
              const editing = editingId === c.id;
              const saving = savingId === c.id;
              const deleting = deletingId === c.id;

              return (
                <tr
                  key={c.id}
                  className="border-t border-slate-100"
                >
                  {editing ? (
                    <>
                      <td className="py-2 pr-2">
                        <input
                          value={editingName}
                          onChange={(e) =>
                            setEditingName(e.target.value)
                          }
                          disabled={saving}
                          className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                        />
                      </td>

                      <td className="py-2 pr-2">
                        <input
                          value={editingArm}
                          onChange={(e) =>
                            setEditingArm(e.target.value)
                          }
                          disabled={saving}
                          className="w-24 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                        />
                      </td>

                      <td className="py-2">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={saveEdit}
                            disabled={saving}
                            className="text-xs font-medium text-brand-600 hover:underline disabled:opacity-50"
                          >
                            {saving ? "Saving…" : "Save"}
                          </button>

                          <button
                            type="button"
                            onClick={cancelEdit}
                            disabled={saving}
                            className="text-xs font-medium text-slate-600 hover:underline disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="py-1.5">
                        {c.name}
                      </td>

                      <td className="py-1.5">
                        {c.arm || "—"}
                      </td>

                      <td className="py-1.5">
                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={() => startEdit(c)}
                            disabled={deleting}
                            className="text-xs font-medium text-slate-700 hover:underline disabled:opacity-50"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => removeClass(c)}
                            disabled={deleting}
                            className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
                          >
                            {deleting ? "Deleting…" : "Delete"}
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}

            {classes.length === 0 && (
              <tr>
                <td
                  colSpan={3}
                  className="py-3 text-slate-400"
                >
                  No classes yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Class name, e.g. JSS 1"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
        />

        <input
          value={arm}
          onChange={(e) => setArm(e.target.value)}
          placeholder="Arm"
          className="w-28 rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
        />

        <Button
          onClick={async () => {
            if (!name.trim()) return;

            await createClass({
              name: name.trim(),
              arm: arm.trim() || undefined
            });

            setName("");
            setArm("");
            onChanged();
          }}
        >
          Add
        </Button>
      </div>
    </Card>
  );
}

function SubjectsPanel({
  subjects,
  onChanged
}: {
  subjects: Subject[];
  onChanged: () => void;
}) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingCode, setEditingCode] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function startEdit(item: Subject) {
    setEditingId(item.id);
    setEditingName(item.name);
    setEditingCode(item.code || "");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingName("");
    setEditingCode("");
  }

  async function saveEdit() {
    if (!editingId) return;

    if (!editingName.trim()) {
      alert("Subject name cannot be empty.");
      return;
    }

    setSavingId(editingId);

    try {
      await updateSubject(
        editingId,
        {
          name: editingName.trim(),
          code: editingCode.trim() || undefined
        }
      );

      cancelEdit();
      await onChanged();
    } finally {
      setSavingId(null);
    }
  }

  async function removeSubject(item: Subject) {
    const confirmed = window.confirm(
      `Delete subject "${item.name}"?\n\nThis may also affect teacher assignments and lesson notes connected to this subject.`
    );

    if (!confirmed) return;

    setDeletingId(item.id);

    try {
      await deleteSubject(item.id);

      await onChanged();
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <Card>
      <h2 className="mb-3 font-display text-base font-semibold">
        Subjects
      </h2>

      <div className="mb-4 overflow-x-auto">
        <table className="w-full min-w-[600px] text-left text-sm">
          <thead className="text-xs uppercase text-slate-500">
            <tr>
              <th className="py-1">Subject</th>
              <th className="py-1">Code</th>
              <th className="py-1">Actions</th>
            </tr>
          </thead>

          <tbody>
            {subjects.map((s) => {
              const editing = editingId === s.id;
              const saving = savingId === s.id;
              const deleting = deletingId === s.id;

              return (
                <tr
                  key={s.id}
                  className="border-t border-slate-100"
                >
                  {editing ? (
                    <>
                      <td className="py-2 pr-2">
                        <input
                          value={editingName}
                          onChange={(e) =>
                            setEditingName(e.target.value)
                          }
                          disabled={saving}
                          className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                        />
                      </td>

                      <td className="py-2 pr-2">
                        <input
                          value={editingCode}
                          onChange={(e) =>
                            setEditingCode(e.target.value)
                          }
                          disabled={saving}
                          className="w-24 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                        />
                      </td>

                      <td className="py-2">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={saveEdit}
                            disabled={saving}
                            className="text-xs font-medium text-brand-600 hover:underline disabled:opacity-50"
                          >
                            {saving ? "Saving…" : "Save"}
                          </button>

                          <button
                            type="button"
                            onClick={cancelEdit}
                            disabled={saving}
                            className="text-xs font-medium text-slate-600 hover:underline disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="py-1.5">
                        {s.name}
                      </td>

                      <td className="py-1.5">
                        {s.code || "—"}
                      </td>

                      <td className="py-1.5">
                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={() => startEdit(s)}
                            disabled={deleting}
                            className="text-xs font-medium text-slate-700 hover:underline disabled:opacity-50"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => removeSubject(s)}
                            disabled={deleting}
                            className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
                          >
                            {deleting ? "Deleting…" : "Delete"}
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}

            {subjects.length === 0 && (
              <tr>
                <td
                  colSpan={3}
                  className="py-3 text-slate-400"
                >
                  No subjects yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Subject name"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
        />

        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Code"
          className="w-28 rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
        />

        <Button
          onClick={async () => {
            if (!name.trim()) return;

            await createSubject({
              name: name.trim(),
              code: code.trim() || undefined
            });

            setName("");
            setCode("");
            onChanged();
          }}
        >
          Add
        </Button>
      </div>
    </Card>
  );
}

function LessonNotesPanel({
  classes,
  subjects
}: {
  classes: SchoolClass[];
  subjects: Subject[];
}) {
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [notes, setNotes] = useState<BatchLessonNote[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<
    Array<{ file: string; error: string }>
  >([]);

  function detectWeek(filename: string, fallback: number) {
    const match = filename.match(
      /(?:week|wk)[\s_-]*(\d{1,2})/i
    );

    if (match) {
      const detected = Number(match[1]);

      if (detected >= 1 && detected <= 15) {
        return detected;
      }
    }

    return fallback;
  }

  function defaultTitle(
    subjectName: string,
    week: number
  ) {
    return `${subjectName} — Week ${week}`;
  }

  function handleFiles(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const files = Array.from(
      event.target.files || []
    );

    if (!files.length) return;

    if (files.length > 15) {
      alert(
        "Please select no more than 15 lesson-note files at once."
      );

      event.target.value = "";
      return;
    }

    const subject = subjects.find(
      (s) => s.id === subjectId
    );

    const subjectName =
      subject?.name || "Lesson Note";

    const prepared = files.map((file, index) => {
      const week = detectWeek(
        file.name,
        index + 1
      );

      return {
        file,
        week,
        title: defaultTitle(
          subjectName,
          week
        )
      };
    });

    setNotes(prepared);
    setMessage("");
    setErrors([]);
    event.target.value = "";
  }

  function updateNote(
    index: number,
    changes: Partial<BatchLessonNote>
  ) {
    setNotes((current) =>
      current.map((note, i) =>
        i === index
          ? { ...note, ...changes }
          : note
      )
    );
  }

  function removeNote(index: number) {
    setNotes((current) =>
      current.filter((_, i) => i !== index)
    );
  }

  async function uploadAll() {
    if (!classId) {
      alert("Please select a class.");
      return;
    }

    if (!subjectId) {
      alert("Please select a subject.");
      return;
    }

    if (!notes.length) {
      alert("Please select lesson-note files.");
      return;
    }

    for (const note of notes) {
      if (
        !note.week ||
        note.week < 1 ||
        note.week > 15
      ) {
        alert(
          `Invalid week number for ${note.file.name}. Use Week 1–15.`
        );
        return;
      }

      if (!note.title.trim()) {
        alert(
          `Please enter a title for ${note.file.name}.`
        );
        return;
      }
    }

    setUploading(true);
    setProgress(0);
    setMessage("");
    setErrors([]);

    try {
      const result =
        await uploadLessonNotesBatch({
          classId,
          subjectId,
          notes,
          onProgress: (
            completed,
            total,
            current
          ) => {
            setProgress(
              Math.round(
                (completed / total) * 100
              )
            );

            setCurrentFile(current);
          }
        });

      if (result.error) {
        setMessage(result.error);
        return;
      }

      setErrors(result.failed);

      if (result.failed.length === 0) {
        setMessage(
          `${result.uploaded} lesson note${
            result.uploaded === 1 ? "" : "s"
          } uploaded successfully.`
        );

        setNotes([]);
      } else {
        setMessage(
          `${result.uploaded} uploaded successfully. ${result.failed.length} failed.`
        );
      }
    } catch (error) {
      console.error(error);

      setMessage(
        "An unexpected error occurred during upload."
      );
    } finally {
      setUploading(false);
      setCurrentFile("");
    }
  }

  const selectedClass = classes.find(
    (c) => c.id === classId
  );

  const selectedSubject = subjects.find(
    (s) => s.id === subjectId
  );

  return (
    <Card>
      <div className="mb-4">
        <h2 className="font-display text-base font-semibold">
          Lesson Notes
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Upload up to 15 lesson notes together for a
          particular class and subject. Week numbers and
          titles can be edited before uploading.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <select
          value={classId}
          onChange={(e) => {
            setClassId(e.target.value);
            setNotes([]);
            setMessage("");
            setErrors([]);
          }}
          disabled={uploading}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Select class…</option>

          {classes.map((c) => (
            <option
              key={c.id}
              value={c.id}
            >
              {c.name}
              {c.arm ? ` ${c.arm}` : ""}
            </option>
          ))}
        </select>

        <select
          value={subjectId}
          onChange={(e) => {
            setSubjectId(e.target.value);
            setNotes([]);
            setMessage("");
            setErrors([]);
          }}
          disabled={uploading}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Select subject…</option>

          {subjects.map((s) => (
            <option
              key={s.id}
              value={s.id}
            >
              {s.name}
              {s.code ? ` (${s.code})` : ""}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 text-center">
          <span className="font-medium text-slate-700">
            Choose lesson-note files
          </span>

          <span className="text-xs text-slate-500">
            Select up to 15 files. PDF, Word, PowerPoint,
            and other supported files are allowed.
          </span>

          <span className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
            Select Files
          </span>

          <input
            type="file"
            multiple
            onChange={handleFiles}
            disabled={
              uploading ||
              !classId ||
              !subjectId
            }
            className="hidden"
          />
        </label>
      </div>

      {selectedClass && selectedSubject && (
        <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
          Uploading curriculum for{" "}
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

      {notes.length > 0 && (
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">File</th>
                <th className="px-3 py-2">Week</th>
                <th className="px-3 py-2">Title</th>
                <th className="px-3 py-2">Size</th>
                <th className="px-3 py-2">Action</th>
              </tr>
            </thead>

            <tbody>
              {notes.map((note, index) => (
                <tr
                  key={`${note.file.name}-${index}`}
                  className="border-t border-slate-100"
                >
                  <td className="px-3 py-2">
                    <div className="max-w-xs truncate font-medium">
                      {note.file.name}
                    </div>
                  </td>

                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={1}
                      max={15}
                      value={note.week}
                      disabled={uploading}
                      onChange={(e) =>
                        updateNote(index, {
                          week: Number(
                            e.target.value
                          )
                        })
                      }
                      className="w-20 rounded-lg border border-slate-300 px-2 py-1.5"
                    />
                  </td>

                  <td className="px-3 py-2">
                    <input
                      value={note.title}
                      disabled={uploading}
                      onChange={(e) =>
                        updateNote(index, {
                          title: e.target.value
                        })
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-1.5"
                    />
                  </td>

                  <td className="whitespace-nowrap px-3 py-2 text-xs text-slate-500">
                    {(
                      note.file.size /
                      1024 /
                      1024
                    ).toFixed(2)}{" "}
                    MB
                  </td>

                  <td className="px-3 py-2">
                    <button
                      type="button"
                      disabled={uploading}
                      onClick={() =>
                        removeNote(index)
                      }
                      className="text-xs font-medium text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {notes.length > 0 && (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-slate-500">
            {notes.length} file
            {notes.length === 1 ? "" : "s"} ready to upload.
          </div>

          <Button
            onClick={uploadAll}
            disabled={uploading}
          >
            {uploading
              ? `Uploading… ${progress}%`
              : `Upload ${notes.length} Lesson Note${
                  notes.length === 1 ? "" : "s"
                }`}
          </Button>
        </div>
      )}

      {uploading && (
        <div className="mt-4">
          <div className="mb-1 flex justify-between text-xs text-slate-500">
            <span>
              {currentFile
                ? `Uploading ${currentFile}`
                : "Preparing upload…"}
            </span>

            <span>{progress}%</span>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-brand-600 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {message && (
        <div className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
          {message}
        </div>
      )}

      {errors.length > 0 && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="mb-2 text-sm font-semibold text-red-800">
            Files that failed:
          </p>

          <ul className="space-y-1 text-xs text-red-700">
            {errors.map((item) => (
              <li key={item.file}>
                <strong>{item.file}</strong>: {item.error}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-4 text-xs text-slate-400">
        Tip: filenames such as{" "}
        <code>Week 1.pdf</code>,{" "}
        <code>Week_2.docx</code>, or{" "}
        <code>Math-Wk3.pdf</code> automatically receive
        the corresponding week number.
      </p>

      <LessonNotesLibrary
        classes={classes}
        subjects={subjects}
      />
    </Card>
  );
}

function LessonNotesLibrary({
  classes,
  subjects
}: {
  classes: SchoolClass[];
  subjects: Subject[];
}) {
  const [filterClass, setFilterClass] = useState("");
  const [filterSubject, setFilterSubject] = useState("");
  const [filterWeek, setFilterWeek] = useState("");
  const [search, setSearch] = useState("");
  const [lessonNotes, setLessonNotes] = useState<LessonNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function loadNotes() {
    setLoading(true);

    try {
      const data = await listLessonNotes(
        filterClass || undefined,
        filterSubject || undefined
      );

      setLessonNotes(data);
    } catch (error) {
      console.error(error);
      alert("Unable to load lesson notes.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadNotes();
  }, [filterClass, filterSubject]);

  const visibleNotes = lessonNotes.filter((note) => {
    if (
      filterWeek &&
      String(note.week || "") !== filterWeek
    ) {
      return false;
    }

    if (search.trim()) {
      const term = search.trim().toLowerCase();

      if (
        !note.title.toLowerCase().includes(term) &&
        !note.file_url?.toLowerCase().includes(term)
      ) {
        return false;
      }
    }

    return true;
  });

  function classNameFor(id: string) {
    const item = classes.find((c) => c.id === id);

    if (!item) return "Unknown class";

    return `${item.name}${item.arm ? ` ${item.arm}` : ""}`;
  }

  function subjectNameFor(id: string) {
    return (
      subjects.find((s) => s.id === id)?.name ||
      "Unknown subject"
    );
  }

  async function openNote(note: LessonNote) {
    if (!note.file_url) {
      alert("This lesson note has no file attached.");
      return;
    }

    setOpeningId(note.id);

    try {
      const url = await getSignedNoteUrl(
        note.file_url
      );

      window.open(
        url,
        "_blank",
        "noopener,noreferrer"
      );
    } catch (error) {
      console.error(error);
      alert("Unable to open this lesson note.");
    } finally {
      setOpeningId(null);
    }
  }

  async function editNote(note: LessonNote) {
    const title = window.prompt(
      "Lesson note title:",
      note.title
    );

    if (title === null) return;

    const weekText = window.prompt(
      "Week number (1–15):",
      String(note.week || 1)
    );

    if (weekText === null) return;

    const week = Number(weekText);

    if (
      !Number.isInteger(week) ||
      week < 1 ||
      week > 15
    ) {
      alert("Week must be a number from 1 to 15.");
      return;
    }

    if (!title.trim()) {
      alert("Title cannot be empty.");
      return;
    }

    setSavingId(note.id);

    try {
      const result = await updateLessonNote({
        id: note.id,
        title: title.trim(),
        week
      });

      if (result.error) {
        alert(result.error);
        return;
      }

      await loadNotes();
    } finally {
      setSavingId(null);
    }
  }

  async function removeNote(note: LessonNote) {
    const confirmed = window.confirm(
      `Delete "${note.title}"? This will also remove the uploaded file.`
    );

    if (!confirmed) return;

    setDeletingId(note.id);

    try {
      const result = await deleteLessonNote(
        note.id
      );

      if (result.error) {
        alert(result.error);
        return;
      }

      setLessonNotes((current) =>
        current.filter(
          (item) => item.id !== note.id
        )
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="mt-6 border-t border-slate-200 pt-5">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-display text-sm font-semibold">
            Lesson Note Library
          </h3>

          <p className="text-xs text-slate-500">
            Manage lesson notes already uploaded to the platform.
          </p>
        </div>

        <button
          type="button"
          onClick={loadNotes}
          disabled={loading}
          className="self-start rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      <div className="grid gap-2 md:grid-cols-4">
        <select
          value={filterClass}
          onChange={(e) =>
            setFilterClass(e.target.value)
          }
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">All classes</option>

          {classes.map((c) => (
            <option
              key={c.id}
              value={c.id}
            >
              {c.name}
              {c.arm ? ` ${c.arm}` : ""}
            </option>
          ))}
        </select>

        <select
          value={filterSubject}
          onChange={(e) =>
            setFilterSubject(e.target.value)
          }
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">All subjects</option>

          {subjects.map((s) => (
            <option
              key={s.id}
              value={s.id}
            >
              {s.name}
            </option>
          ))}
        </select>

        <select
          value={filterWeek}
          onChange={(e) =>
            setFilterWeek(e.target.value)
          }
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">All weeks</option>

          {Array.from(
            { length: 15 },
            (_, i) => i + 1
          ).map((week) => (
            <option
              key={week}
              value={String(week)}
            >
              Week {week}
            </option>
          ))}
        </select>

        <input
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
          placeholder="Search lesson notes…"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">Week</th>
              <th className="px-3 py-2">Title</th>
              <th className="px-3 py-2">Class</th>
              <th className="px-3 py-2">Subject</th>
              <th className="px-3 py-2">Uploaded</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>

          <tbody>
            {visibleNotes.map((note) => (
              <tr
                key={note.id}
                className="border-t border-slate-100"
              >
                <td className="px-3 py-2">
                  <span className="rounded-full bg-brand-50 px-2 py-1 text-xs font-medium text-brand-700">
                    {note.week
                      ? `Week ${note.week}`
                      : "No week"}
                  </span>
                </td>

                <td className="px-3 py-2 font-medium">
                  {note.title}
                </td>

                <td className="px-3 py-2 text-slate-600">
                  {classNameFor(note.class_id)}
                </td>

                <td className="px-3 py-2 text-slate-600">
                  {subjectNameFor(note.subject_id)}
                </td>

                <td className="whitespace-nowrap px-3 py-2 text-xs text-slate-500">
                  {new Date(
                    note.created_at
                  ).toLocaleDateString()}
                </td>

                <td className="px-3 py-2">
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        openNote(note)
                      }
                      disabled={
                        openingId === note.id
                      }
                      className="text-xs font-medium text-brand-600 hover:underline disabled:opacity-50"
                    >
                      {openingId === note.id
                        ? "Opening…"
                        : "Open"}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        editNote(note)
                      }
                      disabled={
                        savingId === note.id ||
                        deletingId === note.id
                      }
                      className="text-xs font-medium text-slate-700 hover:underline disabled:opacity-50"
                    >
                      {savingId === note.id
                        ? "Saving…"
                        : "Edit"}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        removeNote(note)
                      }
                      disabled={
                        deletingId === note.id ||
                        savingId === note.id
                      }
                      className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
                    >
                      {deletingId === note.id
                        ? "Deleting…"
                        : "Delete"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {!loading &&
              visibleNotes.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-3 py-8 text-center text-sm text-slate-400"
                  >
                    No lesson notes match the current filters.
                  </td>
                </tr>
              )}

            {loading && (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-8 text-center text-sm text-slate-400"
                >
                  Loading lesson notes…
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-2 text-xs text-slate-400">
        Showing {visibleNotes.length} lesson note
        {visibleNotes.length === 1 ? "" : "s"}.
      </p>
    </div>
  );
}





