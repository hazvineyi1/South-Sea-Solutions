import { type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { LogOut, GraduationCap, ArrowLeft } from "lucide-react";
import { useAuth, useLogout } from "./auth-hooks";
import { Button } from "@/components/ui/button";

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function backTarget(user: { role: string; realRole?: string; impersonating?: boolean }): {
  href: string;
  label: string;
} {
  if (user.realRole === "SUPERADMIN" && !user.impersonating) {
    return { href: "/console", label: "Back to console" };
  }
  if (user.role === "DRIVER") {
    return { href: "/portal/me", label: "Back to my portal" };
  }
  return { href: "/portal/command", label: "Back to command center" };
}

export function TrainingLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const logout = useLogout();
  const [, setLocation] = useLocation();

  function handleLogout() {
    logout.mutate(undefined, {
      onSuccess: () => setLocation("/login"),
    });
  }

  const back = user ? backTarget(user) : null;

  return (
    <div className="drivewise min-h-screen bg-background font-sans text-foreground">
      <header className="sticky top-0 z-20 border-b bg-card/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/training" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <GraduationCap className="h-5 w-5" />
            </span>
            <span className="flex flex-col leading-tight">
              <span className="font-display text-base font-bold tracking-tight">Training Center</span>
              <span className="text-[11px] text-muted-foreground">South Sea Solutions</span>
            </span>
          </Link>

          {user ? (
            <div className="flex items-center gap-3">
              {back ? (
                <Link
                  href={back.href}
                  className="hidden items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground sm:flex"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {back.label}
                </Link>
              ) : null}
              <div className="hidden flex-col items-end leading-tight sm:flex">
                <span className="text-sm font-medium">{user.name}</span>
                <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  {user.role}
                </span>
              </div>
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground">
                {initials(user.name)}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                disabled={logout.isPending}
                className="gap-1.5"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sign out</span>
              </Button>
            </div>
          ) : null}
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
