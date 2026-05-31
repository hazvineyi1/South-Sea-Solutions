import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Compass, Loader2 } from "lucide-react";
import { useAuth, useLogin } from "@/portal/auth-hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function destinationFor(user: { role: string; realRole: string; impersonating: boolean }): string {
  if (user.realRole === "SUPERADMIN" && !user.impersonating) return "/console";
  if (user.role === "DRIVER") return "/portal/me";
  return "/portal/command";
}

export default function LoginPage() {
  const { user, isLoading } = useAuth();
  const login = useLogin();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setLocation(destinationFor(user));
    }
  }, [user, setLocation]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    login.mutate(
      { data: { email, password } },
      {
        onError: () => setError("Those credentials did not match. Please try again."),
      },
    );
  }

  return (
    <div className="drivewise flex min-h-screen items-center justify-center bg-background px-4 font-sans text-foreground">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Compass className="h-6 w-6" />
          </span>
          <h1 className="mt-4 font-display text-2xl font-bold tracking-tight">Drivewise portal</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in to manage your fleet and driver certification.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-3xl border bg-card p-6 shadow-sm"
        >
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              required
            />
          </div>

          {error ? (
            <p className="rounded-lg bg-[#f6e0dd] px-3 py-2 text-sm text-[#a8392e]">{error}</p>
          ) : null}

          <Button type="submit" className="w-full" disabled={login.isPending || isLoading}>
            {login.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          South Sea Solutions secure portal
        </p>
      </div>
    </div>
  );
}
