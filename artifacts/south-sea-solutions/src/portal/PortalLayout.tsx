import { type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { LogOut, Compass, ArrowLeft, GraduationCap, Eye, LogOut as ExitIcon, Loader2 } from "lucide-react";
import { useAuth, useLogout, useExitOrg } from "./auth-hooks";
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

export function PortalLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const logout = useLogout();
  const exitOrg = useExitOrg();
  const [, setLocation] = useLocation();

  function handleLogout() {
    logout.mutate(undefined, {
      onSuccess: () => setLocation("/login"),
    });
  }

  function handleExitOrg() {
    exitOrg.mutate(undefined, {
      onSuccess: () => setLocation("/console"),
    });
  }

  return (
    <div className="aftrak min-h-screen bg-background font-sans text-foreground">
      {user?.impersonating ? (
        <div className="sticky top-0 z-30 flex flex-wrap items-center justify-center gap-2 bg-[#8a3a12] px-4 py-2 text-center text-sm text-white">
          <Eye className="h-4 w-4" />
          <span>
            Viewing <span className="font-semibold">{user.orgName}</span> as superadmin.
          </span>
          <button
            type="button"
            onClick={handleExitOrg}
            disabled={exitOrg.isPending}
            className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 font-medium transition-colors hover:bg-white/25 disabled:opacity-60"
          >
            {exitOrg.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ExitIcon className="h-3.5 w-3.5" />}
            Exit to console
          </button>
        </div>
      ) : null}
      <header className="sticky top-0 z-20 border-b bg-card/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/portal" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Compass className="h-5 w-5" />
            </span>
            <span className="flex flex-col leading-tight">
              <span className="font-display text-base font-bold tracking-tight">Aftrak</span>
              <span className="text-[11px] text-muted-foreground">{user?.orgName}</span>
            </span>
          </Link>

          {user ? (
            <div className="flex items-center gap-3">
              <Link
                href="/training"
                className="hidden items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground sm:flex"
              >
                <GraduationCap className="h-4 w-4" />
                Training
              </Link>
              <Link
                href="/"
                className="hidden items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground sm:flex"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to site
              </Link>
              <span className="mx-1 hidden h-5 w-px bg-border sm:block" aria-hidden="true" />
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
