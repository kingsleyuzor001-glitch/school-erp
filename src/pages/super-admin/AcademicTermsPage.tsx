import { useEffect, useState } from "react";
import {
  listTerms,
  listSessions,
  createTerm,
  updateTerm,
  deleteTerm
} from "../../services/academic";

export default function AcademicTermsPage() {
  const [terms, setTerms] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);

  const [name, setName] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [editId, setEditId] = useState<string | null>(null);

  async function load() {
    const [termData, sessionData] = await Promise.all([
      listTerms(),
      listSessions()
    ]);

    setTerms(termData || []);
    setSessions(sessionData || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function save() {
    if (!name.trim() || !sessionId) {
      alert("Please select a session and enter the term name.");
      return;
    }

    if (editId) {
      const result = await updateTerm(editId, {
        name: name.trim()
      });

      if (result?.error) {
        alert(result.error.message);
        return;
      }
    } else {
      const result = await createTerm({
        session_id: sessionId,
        name: name.trim()
      });

      if (result?.error) {
        alert(result.error.message);
        return;
      }
    }

    setName("");
    setSessionId("");
    setEditId(null);

    await load();
  }

  function edit(term: any) {
    setEditId(term.id);
    setName(term.name || "");
    setSessionId(term.session_id || "");
  }

  async function remove(id: string) {
    if (!confirm("Delete this academic term?")) return;
    await deleteTerm(id);

    await load();
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">
        Academic Terms
      </h1>

      <div className="space-y-3 mb-8 max-w-xl">
        <select
          className="border p-2 rounded w-full"
          value={sessionId}
          onChange={(e) => setSessionId(e.target.value)}
        >
          <option value="">Select Academic Session</option>

          {sessions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        <input
          className="border p-2 rounded w-full"
          placeholder="Term Name e.g. First Term"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <button
          type="button"
          className="bg-blue-600 text-white px-4 py-2 rounded"
          onClick={save}
        >
          {editId ? "Update Term" : "Create Term"}
        </button>

        {editId && (
          <button
            type="button"
            className="ml-2 bg-gray-500 text-white px-4 py-2 rounded"
            onClick={() => {
              setEditId(null);
              setName("");
              setSessionId("");
            }}
          >
            Cancel
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border">
          <thead>
            <tr>
              <th className="border p-2 text-left">Term</th>
              <th className="border p-2 text-left">Session</th>
              <th className="border p-2 text-left">Actions</th>
            </tr>
          </thead>

          <tbody>
            {terms.map((term) => {
              const session = sessions.find(
                (s) => s.id === term.session_id
              );

              return (
                <tr key={term.id}>
                  <td className="border p-2">{term.name}</td>

                  <td className="border p-2">
                    {session?.name || term.session_id || "—"}
                  </td>

                  <td className="border p-2">
                    <button
                      type="button"
                      className="bg-green-600 text-white px-3 py-1 rounded mr-2"
                      onClick={() => edit(term)}
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      className="bg-red-600 text-white px-3 py-1 rounded"
                      onClick={() => remove(term.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}

            {terms.length === 0 && (
              <tr>
                <td colSpan={3} className="border p-4 text-center">
                  No academic terms found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

