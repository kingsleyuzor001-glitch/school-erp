import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { cbtLogin } from "../../services/cbt";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";

export default function CbtLoginPage() {
  const { schoolSlug } = useParams();
  const navigate = useNavigate();
  const [admissionNumber, setAdmissionNumber] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!schoolSlug) return;
    setLoading(true);
    setError(null);
    const { token, error } = await cbtLogin(schoolSlug, admissionNumber.trim(), pin.trim());
    setLoading(false);
    if (error || !token) { setError(error || "Login failed"); return; }
    localStorage.setItem(`cbt_token_${schoolSlug}`, token);
    navigate(`/cbt/${schoolSlug}/exams`);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <Card className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="font-display text-xl font-bold">CBT Portal</h1>
          <p className="mt-1 text-sm text-slate-500">Enter your admission number and PIN to begin.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input required placeholder="Admission number" value={admissionNumber} onChange={(e) => setAdmissionNumber(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <input required type="password" placeholder="PIN" value={pin} onChange={(e) => setPin(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <Button type="submit" loading={loading} className="w-full">Continue</Button>
        </form>
      </Card>
    </div>
  );
}