import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { registerSchool } from "../../services/schools";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";

export default function RegisterSchool() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    schoolName: "", schoolEmail: "", schoolPhone: "",
    ownerFullName: "", ownerEmail: "", password: ""
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await registerSchool(form);
    setLoading(false);
    if (error) {
      setError(error);
      return;
    }
    // New schools start in "pending" status — route to the waiting screen.
    navigate("/pending-approval", { replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <Card className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="font-display text-xl font-bold">Register your school</h1>
          <p className="mt-1 text-sm text-slate-500">
            A Super Admin will review and approve your school before it goes live.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="School name" value={form.schoolName} onChange={update("schoolName")} required />
          <Field label="School email" type="email" value={form.schoolEmail} onChange={update("schoolEmail")} required />
          <Field label="School phone" value={form.schoolPhone} onChange={update("schoolPhone")} />
          <hr className="border-slate-200" />
          <Field label="Your full name (School Owner)" value={form.ownerFullName} onChange={update("ownerFullName")} required />
          <Field label="Your login email" type="email" value={form.ownerEmail} onChange={update("ownerEmail")} required />
          <Field label="Password" type="password" value={form.password} onChange={update("password")} required minLength={8} />

          {error && <p className="text-sm text-rose-600">{error}</p>}

          <Button type="submit" loading={loading} className="w-full">
            Register school
          </Button>
        </form>
      </Card>
    </div>
  );
}

function Field({
  label, ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      <input
        {...props}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
      />
    </div>
  );
}
