import { useState } from "react";
import { Newspaper, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthProvider";

// Cuentas de demo del seeder (sólo para desarrollo local)
const DEMO_ACCOUNTS = [
  { label: "Super admin", email: "admin@tickwise.io" },
  { label: "Organization 1 (owner)", email: "dan@tickwise.io" },
];

export function LoginPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await signIn(email.trim(), password);
    if (error) {
      setError(error);
      setLoading(false);
    }
    // En éxito, el AuthProvider actualiza la sesión y re-renderiza la app
  }

  // Prefill rápido de una cuenta de demo
  function useDemo(demoEmail: string) {
    setEmail(demoEmail);
    setPassword("password");
    setError("");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-sm">
        {/* Marca */}
        <div className="mb-6 flex flex-col items-center gap-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Newspaper className="h-5 w-5" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Tickwise</h1>
          <p className="text-sm text-muted-foreground">
            Sign in to your workspace
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="grid gap-4 rounded-xl border bg-card p-6 shadow-sm"
        >
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign in"
            )}
          </Button>
        </form>

        {/* Atajos de demo (local) */}
        <div className="mt-4 space-y-2 rounded-lg border border-dashed p-3">
          <p className="text-xs font-medium text-muted-foreground">
            Demo accounts · password "password"
          </p>
          <div className="flex flex-wrap gap-2">
            {DEMO_ACCOUNTS.map((a) => (
              <button
                key={a.email}
                type="button"
                onClick={() => useDemo(a.email)}
                className="rounded-md border px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
