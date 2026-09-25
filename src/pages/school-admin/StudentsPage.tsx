import { useEffect, useRef, useState } from "react";
import {
  Student,
  listStudents,
  createStudent,
  updateStudent,
  setStudentStatus,
  moveStudent,
  uploadStudentPassport,
} from "../../services/students";
import {
  listClasses,
  listSessions,
  SchoolClass,
  Session,
} from "../../services/academic";
import { useAuth } from "../../contexts/AuthContext";
import { Card } from "../../components/ui/Card";
import { getSignedPassportUrl } from "../../services/students";
import { Button } from "../../components/ui/Button";
import { SearchBar } from "../../components/shared/SearchBar";

const STUDENT_STATUSES = [
  "active",
  "transferred",
  "graduated",
  "withdrawn",
] as const;

type StudentStatus = (typeof STUDENT_STATUSES)[number];

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filterClass, setFilterClass] = useState("");
  const [search, setSearch] = useState("");

  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [movingStudent, setMovingStudent] = useState<Student | null>(null);
  const [statusStudent, setStatusStudent] = useState<Student | null>(null);

  async function load() {
    setLoading(true);

    try {
      const [s, c, sess] = await Promise.all([
        listStudents(filterClass || undefined, search || undefined),
        listClasses(),
        listSessions(),
      ]);

      setStudents(s);
      setClasses(c);
      setSessions(sess);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [filterClass, search]);

  function className(classId: string | null) {
    if (!classId) return "—";

    const found = classes.find((c) => c.id === classId);
    if (!found) return "—";

    return `${found.name}${found.arm ? ` ${found.arm}` : ""}`;
  }

  function statusClasses(status: string) {
    switch (status) {
      case "active":
        return "bg-emerald-100 text-emerald-700";
      case "graduated":
        return "bg-blue-100 text-blue-700";
      case "transferred":
        return "bg-amber-100 text-amber-700";
      case "withdrawn":
        return "bg-rose-100 text-rose-700";
      default:
        return "bg-slate-100 text-slate-600";
    }
  }

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold">Students</h1>
          <p className="text-sm text-slate-500">
            {students.length} student{students.length === 1 ? "" : "s"}
          </p>
        </div>

        <Button onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Close" : "Add student"}
        </Button>
      </div>

      {showForm && (
        <NewStudentForm
          classes={classes}
          sessions={sessions}
          onCreated={() => {
            setShowForm(false);
            load();
          }}
        />
      )}

      <div className="flex flex-wrap gap-2">
        <SearchBar
          placeholder="Search by name or admission number…"
          onSearch={setSearch}
        />

        <select
          value={filterClass}
          onChange={(e) => setFilterClass(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
        >
          <option value="">All classes</option>

          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.arm ? ` ${c.arm}` : ""}
            </option>
          ))}
        </select>
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Admission No.</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Gender</th>
              <th className="px-4 py-3">Class</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>

          <tbody>
            {loading && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-6 text-center text-slate-400"
                >
                  Loading…
                </td>
              </tr>
            )}

            {!loading && students.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-6 text-center text-slate-400"
                >
                  No students yet.
                </td>
              </tr>
            )}

            {students.map((s) => (
              <tr
                key={s.id}
                className="border-b border-slate-100 last:border-0"
              >
                <td className="px-4 py-3 font-mono text-xs">
                  {s.admission_number}
                </td>

                <td className="px-4 py-3 font-medium">
                  <StudentNameWithPhoto student={s} />
                </td>

                <td className="px-4 py-3 text-slate-500">
                  {s.gender || "—"}
                </td>

                <td className="px-4 py-3 text-slate-500">
                  {className(s.class_id)}
                </td>

                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusClasses(
                      s.status
                    )}`}
                  >
                    {s.status}
                  </span>
                </td>

                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingStudent(s)}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => setMovingStudent(s)}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Move
                    </button>

                    <button
                      type="button"
                      onClick={() => setStatusStudent(s)}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Status
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {editingStudent && (
        <EditStudentForm
          student={editingStudent}
          classes={classes}
          sessions={sessions}
          onClose={() => setEditingStudent(null)}
          onSaved={() => {
            setEditingStudent(null);
            load();
          }}
        />
      )}

      {movingStudent && (
        <MoveStudentForm
          student={movingStudent}
          classes={classes}
          onClose={() => setMovingStudent(null)}
          onMoved={() => {
            setMovingStudent(null);
            load();
          }}
        />
      )}

      {statusStudent && (
        <StatusStudentForm
          student={statusStudent}
          onClose={() => setStatusStudent(null)}
          onChanged={() => {
            setStatusStudent(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function StudentNameWithPhoto({ student }: { student: Student }) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    if (!student.passport_url) {
      setPhotoUrl(null);
      return;
    }

    getSignedPassportUrl(student.passport_url)
      .then((url) => {
        if (active) setPhotoUrl(url);
      })
      .catch(() => {
        if (active) setPhotoUrl(null);
      });

    return () => {
      active = false;
    };
  }, [student.passport_url]);

  return (
    <div className="flex items-center gap-3">
      {photoUrl ? (
        <img
          src={photoUrl}
          alt={student.full_name}
          className="h-10 w-10 rounded-full object-cover border border-slate-200"
        />
      ) : (
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-400">
          {student.full_name
            .split(" ")
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0]?.toUpperCase())
            .join("")}
        </div>
      )}

      <span>{student.full_name}</span>
    </div>
  );
}
function NewStudentForm({
  classes,
  sessions,
  onCreated,
}: {
  classes: SchoolClass[];
  sessions: Session[];
  onCreated: () => void;
}) {
  const { profile } = useAuth();

  const [form, setForm] = useState({
    fullName: "",
    dateOfBirth: "",
    gender: "",
    classId: "",
    sessionId: "",
    address: "",
  });

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!photoFile) {
      setPhotoPreview(null);
      return;
    }

    const url = URL.createObjectURL(photoFile);
    setPhotoPreview(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [photoFile]);

  function handlePhotoChange(file: File | undefined) {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Photo must be 5 MB or smaller.");
      return;
    }

    setError(null);
    setPhotoFile(file);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (!profile?.school_id) {
        setError("Your school profile could not be found.");
        return;
      }

      const { data: studentId, error: createError } =
        await createStudent(form);

      if (createError) {
        setError(createError.message);
        return;
      }

      if (!studentId) {
        setError(
          "The student was created, but the new student ID could not be obtained."
        );
        return;
      }

      if (photoFile) {
        const photoResult = await uploadStudentPassport(
          profile.school_id,
          studentId,
          photoFile
        );

        if (photoResult.error) {
          setError(
            `Student was created, but the photo could not be saved: ${photoResult.error}`
          );
          return;
        }
      }

      onCreated();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <div className="mb-4">
        <h2 className="font-semibold">Add student</h2>
        <p className="text-sm text-slate-500">
          Admission number is generated automatically.
        </p>
      </div>

      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
        <input
          required
          placeholder="Full name"
          value={form.fullName}
          onChange={(e) =>
            setForm({ ...form, fullName: e.target.value })
          }
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-2"
        />

        <input
          type="date"
          value={form.dateOfBirth}
          onChange={(e) =>
            setForm({ ...form, dateOfBirth: e.target.value })
          }
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />

        <select
          value={form.gender}
          onChange={(e) =>
            setForm({ ...form, gender: e.target.value })
          }
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Gender</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
        </select>

        <select
          required
          value={form.classId}
          onChange={(e) =>
            setForm({ ...form, classId: e.target.value })
          }
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Class…</option>

          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.arm ? ` ${c.arm}` : ""}
            </option>
          ))}
        </select>

        <select
          required
          value={form.sessionId}
          onChange={(e) =>
            setForm({ ...form, sessionId: e.target.value })
          }
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Session…</option>

          {sessions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        <input
          placeholder="Address (optional)"
          value={form.address}
          onChange={(e) =>
            setForm({ ...form, address: e.target.value })
          }
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-2"
        />

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 sm:col-span-2">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white">
              {photoPreview ? (
                <img
                  src={photoPreview}
                  alt="Student passport preview"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-xs text-slate-400">
                  No photo
                </span>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-700">
                Passport photograph
              </p>

              <p className="text-xs text-slate-500">
                Upload a clear student photo or capture one with the camera.
                Maximum size: 5 MB.
              </p>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => uploadInputRef.current?.click()}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  Upload photo
                </button>

                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
                >
                  Take photo
                </button>

                {photoFile && (
                  <button
                    type="button"
                    onClick={() => setPhotoFile(null)}
                    className="rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50"
                  >
                    Remove
                  </button>
                )}
              </div>

              <input
                ref={uploadInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) =>
                  handlePhotoChange(e.target.files?.[0])
                }
              />

              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) =>
                  handlePhotoChange(e.target.files?.[0])
                }
              />
            </div>
          </div>
        </div>

        {error && (
          <p className="text-sm text-rose-600 sm:col-span-2">
            {error}
          </p>
        )}

        <Button
          type="submit"
          loading={saving}
          className="sm:col-span-2"
        >
          Create student
        </Button>
      </form>
    </Card>
  );
}

function EditStudentForm({
  student,
  classes,
  sessions,
  onClose,
  onSaved,
}: {
  student: Student;
  classes: SchoolClass[];
  sessions: Session[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { profile } = useAuth();

  const [form, setForm] = useState({
    fullName: student.full_name,
    dateOfBirth: student.date_of_birth || "",
    gender: student.gender || "",
    address: student.address || "",
    medicalInfo: student.medical_info || "",
    emergencyContact: student.emergency_contact || "",
    classId: student.class_id || "",
    sessionId: student.session_id || "",
    status: student.status,
  });

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [existingPhotoUrl, setExistingPhotoUrl] = useState<string | null>(
    null
  );

  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let active = true;

    async function loadExistingPhoto() {
      if (!student.passport_url) {
        setExistingPhotoUrl(null);
        return;
      }

      try {
        const signedUrl = await getSignedPassportUrl(student.passport_url);

        if (active) {
          setExistingPhotoUrl(signedUrl);
        }
      } catch {
        if (active) {
          setExistingPhotoUrl(null);
        }
      }
    }

    loadExistingPhoto();

    return () => {
      active = false;
    };
  }, [student.passport_url]);

  useEffect(() => {
    if (!photoFile) {
      setPhotoPreview(null);
      return;
    }

    const objectUrl = URL.createObjectURL(photoFile);
    setPhotoPreview(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [photoFile]);

  function handlePhotoChange(file?: File) {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Photo must not be larger than 5 MB.");
      return;
    }

    setError(null);
    setPhotoFile(file);
  }

  function removeSelectedPhoto() {
    setPhotoFile(null);

    if (uploadInputRef.current) {
      uploadInputRef.current.value = "";
    }

    if (cameraInputRef.current) {
      cameraInputRef.current.value = "";
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    setSaving(true);
    setError(null);

    try {
      const result = await updateStudent({
        studentId: student.id,
        fullName: form.fullName,
        dateOfBirth: form.dateOfBirth,
        gender: form.gender,
        address: form.address,
        medicalInfo: form.medicalInfo,
        emergencyContact: form.emergencyContact,
        classId: form.classId,
        sessionId: form.sessionId,
        status: form.status,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      if (photoFile) {
        if (!profile?.school_id) {
          setError(
            "Your school information could not be found. Please sign in again."
          );
          return;
        }

        const uploadResult = await uploadStudentPassport(
          profile.school_id,
          student.id,
          photoFile
        );

        if (uploadResult.error) {
          setError(
            `Student information was saved, but the photo upload failed: ${uploadResult.error}`
          );
          return;
        }
      }

      onSaved();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  const displayedPhoto = photoPreview || existingPhotoUrl;

  return (
    <Modal title="Edit student" onClose={onClose}>
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 sm:col-span-2">
          <div className="flex flex-col items-center gap-3">
            <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border-2 border-slate-200 bg-white">
              {displayedPhoto ? (
                <img
                  src={displayedPhoto}
                  alt={`${student.full_name} passport`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="px-3 text-center text-xs text-slate-400">
                  No passport photo
                </span>
              )}
            </div>

            <p className="text-center text-sm font-medium text-slate-700">
              Student passport photo
            </p>

            <div className="flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={() => uploadInputRef.current?.click()}
                className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
              >
                Upload photo
              </button>

              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Take photo
              </button>

              {photoFile && (
                <button
                  type="button"
                  onClick={removeSelectedPhoto}
                  className="rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50"
                >
                  Remove new photo
                </button>
              )}
            </div>

            <p className="text-center text-xs text-slate-500">
              Select an image up to 5 MB. The existing photo will remain
              unchanged if you do not select a new one.
            </p>

            <input
              ref={uploadInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) =>
                handlePhotoChange(e.target.files?.[0])
              }
            />

            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) =>
                handlePhotoChange(e.target.files?.[0])
              }
            />
          </div>
        </div>

        <input
          required
          placeholder="Full name"
          value={form.fullName}
          onChange={(e) =>
            setForm({ ...form, fullName: e.target.value })
          }
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-2"
        />

        <input
          type="date"
          value={form.dateOfBirth}
          onChange={(e) =>
            setForm({ ...form, dateOfBirth: e.target.value })
          }
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />

        <select
          value={form.gender}
          onChange={(e) =>
            setForm({ ...form, gender: e.target.value })
          }
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Gender</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
        </select>

        <select
          value={form.classId}
          onChange={(e) =>
            setForm({ ...form, classId: e.target.value })
          }
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Class…</option>

          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.arm ? ` ${c.arm}` : ""}
            </option>
          ))}
        </select>

        <select
          value={form.sessionId}
          onChange={(e) =>
            setForm({ ...form, sessionId: e.target.value })
          }
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Session…</option>

          {sessions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        <textarea
          placeholder="Address"
          value={form.address}
          onChange={(e) =>
            setForm({ ...form, address: e.target.value })
          }
          className="min-h-20 rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-2"
        />

        <textarea
          placeholder="Medical information"
          value={form.medicalInfo}
          onChange={(e) =>
            setForm({ ...form, medicalInfo: e.target.value })
          }
          className="min-h-20 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />

        <textarea
          placeholder="Emergency contact"
          value={form.emergencyContact}
          onChange={(e) =>
            setForm({ ...form, emergencyContact: e.target.value })
          }
          className="min-h-20 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />

        <select
          value={form.status}
          onChange={(e) =>
            setForm({ ...form, status: e.target.value })
          }
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          {STUDENT_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>

        {error && (
          <p className="text-sm text-rose-600 sm:col-span-2">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 sm:col-span-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm"
          >
            Cancel
          </button>

          <Button type="submit" loading={saving}>
            Save changes
          </Button>
        </div>
      </form>
    </Modal>
  );
}
function MoveStudentForm({
  student,
  classes,
  onClose,
  onMoved,
}: {
  student: Student;
  classes: SchoolClass[];
  onClose: () => void;
  onMoved: () => void;
}) {
  const [toClassId, setToClassId] = useState(student.class_id || "");
  const [eventType, setEventType] = useState<"promotion" | "transfer">(
    "promotion"
  );
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    if (!toClassId) {
      setError("Please select a destination class.");
      return;
    }

    if (toClassId === student.class_id) {
      setError("Please choose a different class.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const { error } = await moveStudent(
        student.id,
        toClassId,
        eventType,
        notes
      );

      if (error) {
        setError(error.message);
        return;
      }

      onMoved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={`Move ${student.full_name}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div className="rounded-lg bg-slate-50 p-3 text-sm">
          <p className="font-medium">{student.full_name}</p>
          <p className="text-slate-500">
            Current class:{" "}
            {classes.find((c) => c.id === student.class_id)?.name || "—"}
          </p>
        </div>

        <select
          value={eventType}
          onChange={(e) =>
            setEventType(e.target.value as "promotion" | "transfer")
          }
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="promotion">Promotion</option>
          <option value="transfer">Transfer</option>
        </select>

        <select
          required
          value={toClassId}
          onChange={(e) => setToClassId(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Destination class…</option>

          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.arm ? ` ${c.arm}` : ""}
            </option>
          ))}
        </select>

        <textarea
          placeholder="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="min-h-20 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />

        {error && (
          <p className="text-sm text-rose-600">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm"
          >
            Cancel
          </button>

          <Button type="submit" loading={saving}>
            {eventType === "promotion" ? "Promote student" : "Transfer student"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function StatusStudentForm({
  student,
  onClose,
  onChanged,
}: {
  student: Student;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [status, setStatus] = useState<StudentStatus>(
    STUDENT_STATUSES.includes(student.status as StudentStatus)
      ? (student.status as StudentStatus)
      : "active"
  );

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    setSaving(true);
    setError(null);

    try {
      const result = await setStudentStatus(student.id, status);

      if (result.error) {
        setError(result.error);
        return;
      }

      onChanged();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Change student status" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div className="rounded-lg bg-slate-50 p-3 text-sm">
          <p className="font-medium">{student.full_name}</p>
          <p className="text-slate-500">
            Admission No.: {student.admission_number}
          </p>
        </div>

        <select
          value={status}
          onChange={(e) =>
            setStatus(e.target.value as StudentStatus)
          }
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          {STUDENT_STATUSES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>

        {error && (
          <p className="text-sm text-rose-600">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm"
          >
            Cancel
          </button>

          <Button type="submit" loading={saving}>
            Update status
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">{title}</h2>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}






