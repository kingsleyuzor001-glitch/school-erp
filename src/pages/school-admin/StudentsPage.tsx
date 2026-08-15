import { useEffect, useState } from "react";
import {
  Student,
  listStudents,
  createStudent,
  updateStudent,
  setStudentStatus,
  moveStudent,
} from "../../services/students";
import {
  listClasses,
  listSessions,
  SchoolClass,
  Session,
} from "../../services/academic";
import { Card } from "../../components/ui/Card";
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
                  {s.full_name}
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

function NewStudentForm({
  classes,
  sessions,
  onCreated,
}: {
  classes: SchoolClass[];
  sessions: Session[];
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    fullName: "",
    dateOfBirth: "",
    gender: "",
    classId: "",
    sessionId: "",
    address: "",
  });

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const { error } = await createStudent(form);

      if (error) {
        setError(error.message);
        return;
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

      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Edit student" onClose={onClose}>
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
