import { useAuth } from "../../contexts/AuthContext";
import { Button } from "../../components/ui/Button";

export default function AccountSuspendedPage() {
  const { signOut } = useAuth();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <h1 className="font-display text-xl font-bold text-rose-600">Account inactive</h1>
      <p className="mt-2 max-w-sm text-sm text-slate-500">
        Your account has been deactivated. Contact your school administrator if you believe this is a mistake.
      </p>
      <Button variant="secondary" className="mt-6" onClick={signOut}>Sign out</Button>
    </div>
  );
}
