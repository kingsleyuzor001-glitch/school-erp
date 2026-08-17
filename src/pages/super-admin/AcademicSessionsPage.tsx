import { useEffect, useState } from "react";
import {
  listSessions,
  createSession,
  updateSession,
  deleteSession
} from "../../services/academic";

export default function AcademicSessionsPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [startYear, setStartYear] = useState("");
  const [endYear, setEndYear] = useState("");
  const [editId, setEditId] = useState<string | null>(null);

  async function load() {
    const data = await listSessions();
    setSessions(data || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function save() {
    if (!name.trim() || !startYear || !endYear) {
      alert("Please enter the session name, start year and end year.");
      return;
    }

    const start = Number(startYear);
    const end = Number(endYear);

    if (
      !Number.isInteger(start) ||
      !Number.isInteger(end) ||
      start < 1900 ||
      end < 1900 ||
      end < start
    ) {
      alert("Please enter valid start and end years.");
      return;
    }

    if (editId) {
      const result = await updateSession(editId, {
        name: name.trim(),
        start_year: start,
        end_year: end
      });

      if (!result) {
        alert("Unable to update the academic session. Check the browser console for the Supabase error.");
        return;
      }
    } else {
      const result = await createSession({
        name: name.trim(),
        start_year: start,
        end_year: end
      });

      if (!result) {
        alert("Unable to create the academic session. Check the browser console for the Supabase error.");
        return;
      }
    }

    setName("");
    setStartYear("");
    setEndYear("");
    setEditId(null);

    await load();
  }

  function edit(item: any) {
    setEditId(item.id);
    setName(item.name || "");
    setStartYear(
      item.start_year !== null && item.start_year !== undefined
        ? String(item.start_year)
        : ""
    );
    setEndYear(
      item.end_year !== null && item.end_year !== undefined
        ? String(item.end_year)
        : ""
    );
  }

  async function remove(id: string) {
    if (!confirm("Delete this academic session?")) return;

    const success = await deleteSession(id);

    if (!success) {
      alert("Unable to delete the academic session. Check the browser console for the Supabase error.");
      return;
    }

    await load();
  }

  function cancelEdit() {
    setEditId(null);
    setName("");
    setStartYear("");
    setEndYear("");
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">
        Academic Sessions
      </h1>

      <div className="space-y-3 mb-8 max-w-xl">
        <input
          className="border p-2 rounded w-full"
          placeholder="Session Name e.g. 2026/2027"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          type="number"
          min="1900"
          max="2100"
          className="border p-2 rounded w-full"
          placeholder="Start Year e.g. 2026"
          value={startYear}
          onChange={(e) => setStartYear(e.target.value)}
        />

        <input
          type="number"
          min="1900"
          max="2100"
          className="border p-2 rounded w-full"
          placeholder="End Year e.g. 2027"
          value={endYear}
          onChange={(e) => setEndYear(e.target.value)}
        />

        <button
          type="button"
          className="bg-blue-600 text-white px-4 py-2 rounded"
          onClick={save}
        >
          {editId ? "Update Session" : "Create Session"}
        </button>

        {editId && (
          <button
            type="button"
            className="ml-2 bg-gray-500 text-white px-4 py-2 rounded"
            onClick={cancelEdit}
          >
            Cancel
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border">
          <thead>
            <tr>
              <th className="border p-2 text-left">Session</th>
              <th className="border p-2 text-left">Start Year</th>
              <th className="border p-2 text-left">End Year</th>
              <th className="border p-2 text-left">Actions</th>
            </tr>
          </thead>

          <tbody>
            {sessions.map((s) => (
              <tr key={s.id}>
                <td className="border p-2">
                  {s.name}
                </td>

                <td className="border p-2">
                  {s.start_year ?? "—"}
                </td>

                <td className="border p-2">
                  {s.end_year ?? "—"}
                </td>

                <td className="border p-2">
                  <button
                    type="button"
                    className="bg-green-600 text-white px-3 py-1 rounded mr-2"
                    onClick={() => edit(s)}
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    className="bg-red-600 text-white px-3 py-1 rounded"
                    onClick={() => remove(s.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}

            {sessions.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="border p-4 text-center"
                >
                  No academic sessions found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
