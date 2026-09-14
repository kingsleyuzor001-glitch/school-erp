import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import PlatformLogo from "../../components/layout/PlatformLogo";
import PlatformName from "../../components/layout/PlatformName";

export default function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);
    setError(null);

    const { error } = await signIn(email, password);

    setLoading(false);

    if (error) {
      setError(error);
      return;
    }

    const from = (location.state as any)?.from?.pathname;

    navigate(from || "/", { replace: true });
  }

  async function handleForgotPassword() {
    if (!email) {
      setError(
        "Enter your email above first, then tap Forgot password."
      );
      return;
    }

    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/set-password`
    });

    setError(null);

    alert(
      "If that email exists, a password reset link has been sent."
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <Card className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <PlatformLogo
            className="mx-auto mb-3 h-14 w-14"
            imageClassName="h-full w-full object-contain"
          />

          <h1 className="font-display text-xl font-bold">
            <PlatformName />
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Sign in to your dashboard
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Email
            </label>

            <input
              type="email"
              required
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Password
            </label>

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-16 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-500 hover:text-brand-600"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-rose-600">
              {error}
            </p>
          )}

          <Button
            type="submit"
            loading={loading}
            className="w-full"
          >
            Sign In
          </Button>

          <button
            type="button"
            onClick={handleForgotPassword}
            className="w-full text-center text-xs text-slate-500 hover:text-brand-600"
          >
            Forgot password?
          </button>

          <Link
            to="/register"
            className="block text-center text-xs font-medium text-brand-600 hover:text-brand-700"
          >
            Register your school →
          </Link>
        </form>
      </Card>
    </div>
  );
}