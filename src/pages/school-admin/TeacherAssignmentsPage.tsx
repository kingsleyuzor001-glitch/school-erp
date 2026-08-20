import { useEffect, useState } from "react";
import {
  assignClassTeacher,
  assignSubjectTeacher,
  getAssignments,
  getClasses,
  getSubjects,
  getTeachers,
  type ClassRoom,
  type Subject,
  type Teacher,
} from "../../services/teacherAssignments";

export default function TeacherAssignmentsPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);

  const [classTeacherId, setClassTeacherId] = useState("");
  const [classId, setClassId] = useState("");

  const [subjectTeacherId, setSubjectTeacherId] = useState("");
  const [subjectClassId, setSubjectClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");

  const [loading, setLoading] = useState(true);
  const [savingClassTeacher, setSavingClassTeacher] = useState(false);
  const [savingSubjectTeacher, setSavingSubjectTeacher] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const [
        teachersData,
        classesData,
        subjectsData,
        assignmentsData,
      ] = await Promise.all([
        getTeachers(),
        getClasses(),
        getSubjects(),
        getAssignments(),
      ]);

      setTeachers(teachersData);
      setClasses(classesData);
      setSubjects(subjectsData);
      setAssignments(assignmentsData ?? []);
    } catch (err: any) {
      setError(err?.message ?? "Failed to load teacher assignments.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleAssignClassTeacher() {
    if (!classId || !classTeacherId) {
      setError("Please select both a class and a teacher.");
      return;
    }

    try {
      setSavingClassTeacher(true);
      setError("");
      setMessage("");

      await assignClassTeacher(classId, classTeacherId);

      setMessage("Class teacher assigned successfully.");

      await loadData();
    } catch (err: any) {
      setError(err?.message ?? "Failed to assign class teacher.");
    } finally {
      setSavingClassTeacher(false);
    }
  }

  async function handleAssignSubjectTeacher() {
    if (!subjectClassId || !subjectId || !subjectTeacherId) {
      setError("Please select a class, subject and teacher.");
      return;
    }

    try {
      setSavingSubjectTeacher(true);
      setError("");
      setMessage("");

      await assignSubjectTeacher(
        subjectClassId,
        subjectId,
        subjectTeacherId
      );

      setMessage("Subject teacher assigned successfully.");

      await loadData();
    } catch (err: any) {
      setError(err?.message ?? "Failed to assign subject teacher.");
    } finally {
      setSavingSubjectTeacher(false);
    }
  }

  function classLabel(item: ClassRoom) {
    return item.arm ? `${item.name} - ${item.arm}` : item.name;
  }

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold">
          Teacher Assignments
        </h1>

        <p className="mt-4 text-gray-500">
          Loading teachers, classes and subjects...
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          Teacher Assignments
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Assign class teachers and subject teachers.
        </p>
      </div>

      {message && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {message}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* CLASS TEACHER */}
        <section className="rounded-xl border bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">
            Assign Class Teacher
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Assign a teacher to be responsible for a class.
          </p>

          <div className="mt-5 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">
                Class
              </label>

              <select
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                className="w-full rounded-lg border px-3 py-2"
              >
                <option value="">Select class</option>

                {classes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {classLabel(item)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Teacher
              </label>

              <select
                value={classTeacherId}
                onChange={(e) => setClassTeacherId(e.target.value)}
                className="w-full rounded-lg border px-3 py-2"
              >
                <option value="">Select teacher</option>

                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.full_name} — {teacher.email}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleAssignClassTeacher}
              disabled={savingClassTeacher}
              className="rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
            >
              {savingClassTeacher
                ? "Assigning..."
                : "Assign Class Teacher"}
            </button>
          </div>
        </section>

        {/* SUBJECT TEACHER */}
        <section className="rounded-xl border bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">
            Assign Subject Teacher
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Assign a teacher to teach a subject in a class.
          </p>

          <div className="mt-5 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">
                Class
              </label>

              <select
                value={subjectClassId}
                onChange={(e) => setSubjectClassId(e.target.value)}
                className="w-full rounded-lg border px-3 py-2"
              >
                <option value="">Select class</option>

                {classes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {classLabel(item)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Subject
              </label>

              <select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className="w-full rounded-lg border px-3 py-2"
              >
                <option value="">Select subject</option>

                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Teacher
              </label>

              <select
                value={subjectTeacherId}
                onChange={(e) =>
                  setSubjectTeacherId(e.target.value)
                }
                className="w-full rounded-lg border px-3 py-2"
              >
                <option value="">Select teacher</option>

                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.full_name} — {teacher.email}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleAssignSubjectTeacher}
              disabled={savingSubjectTeacher}
              className="rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
            >
              {savingSubjectTeacher
                ? "Assigning..."
                : "Assign Subject Teacher"}
            </button>
          </div>
        </section>
      </div>

      {/* CURRENT ASSIGNMENTS */}
      <section className="rounded-xl border bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">
          Current Subject Assignments
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          Teachers currently assigned to subjects and classes.
        </p>

        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="px-3 py-3 font-medium">Class</th>
                <th className="px-3 py-3 font-medium">Subject</th>
                <th className="px-3 py-3 font-medium">Teacher</th>
                <th className="px-3 py-3 font-medium">Email</th>
              </tr>
            </thead>

            <tbody>
              {assignments.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-3 py-6 text-center text-gray-500"
                  >
                    No subject assignments found.
                  </td>
                </tr>
              ) : (
                assignments.map((assignment) => {
                  const classData = assignment.classes as
                    | { name: string }
                    | null;

                  const subjectData = assignment.subjects as
                    | { name: string }
                    | null;

                  const teacherData = assignment.profiles as
                    | {
                        full_name: string;
                        email: string;
                      }
                    | null;

                  return (
                    <tr
                      key={assignment.id}
                      className="border-b last:border-0"
                    >
                      <td className="px-3 py-3">
                        {classData?.name ?? "—"}
                      </td>

                      <td className="px-3 py-3">
                        {subjectData?.name ?? "—"}
                      </td>

                      <td className="px-3 py-3">
                        {teacherData?.full_name ?? "—"}
                      </td>

                      <td className="px-3 py-3">
                        {teacherData?.email ?? "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}