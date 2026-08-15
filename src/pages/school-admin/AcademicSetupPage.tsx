import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  Session,
  Term,
  listSessions,
  listTerms
} from "../../services/academic";
import {
  updateSchoolAcademicSelection
} from "../../services/schools";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";

export default function AcademicSetupPage() {
  const { profile } = useAuth();

  const [sessions, setSessions] = useState<Session[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);

  const [selectedSession, setSelectedSession] = useState("");
  const [selectedTerm, setSelectedTerm] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function loadAcademicOptions() {
    setLoading(true);

    const [sessionData, termData] = await Promise.all([
      listSessions(),
      listTerms()
    ]);

    setSessions(sessionData);
    setTerms(termData);

    const currentSession =
      sessionData.find((s) => s.is_current) ?? sessionData[0];

    const currentTerm =
      termData.find((t) => t.is_current) ?? termData[0];

    if (currentSession) {
      setSelectedSession(currentSession.id);
    }

    if (currentTerm) {
      setSelectedTerm(currentTerm.id);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadAcademicOptions();
  }, []);

  async function saveSelection() {
    if (!profile?.school_id) return;

    if (!selectedSession || !selectedTerm) return;

    setSaving(true);

    const { error } = await updateSchoolAcademicSelection(
      profile.school_id,
      selectedSession,
      selectedTerm
    );

    setSaving(false);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Academic selection updated successfully.");
  }


  if (!profile?.school_id) {
    return null;
  }


  return (
    <div className="space-y-4 p-4 sm:p-6">

      <div>
        <h1 className="font-display text-xl font-bold">
          Academic Setup
        </h1>

        <p className="text-sm text-slate-500">
          Your school can select from the academic structure created by
          the Super Admin. Sessions, terms, classes and subjects are
          managed centrally by the platform.
        </p>
      </div>


      {loading ? (

        <p className="text-sm text-slate-400">
          Loading academic options...
        </p>

      ) : (

        <Card>

          <div className="space-y-4">

            <div>
              <label className="mb-1 block text-sm font-medium">
                Current Session
              </label>

              <select
                value={selectedSession}
                onChange={(e)=>setSelectedSession(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              >
                <option value="">
                  Select session
                </option>

                {sessions.map((s)=>(
                  <option key={s.id} value={s.id}>
                    {s.name}
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
                onChange={(e)=>setSelectedTerm(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              >

                <option value="">
                  Select term
                </option>

                {terms
                  .filter(
                    (t)=>
                      !selectedSession ||
                      t.session_id === selectedSession
                  )
                  .map((t)=>(

                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>

                  ))}

              </select>

            </div>


            <Button
              onClick={saveSelection}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Selection"}
            </Button>


          </div>

        </Card>

      )}

    </div>
  );
}