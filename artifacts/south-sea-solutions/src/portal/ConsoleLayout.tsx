import { type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { LayoutDashboard, Building2, GraduationCap, LogOut, ShieldCheck, BookOpen, Mail, ScrollText } from "lucide-react";
import { useAuth, useLogout } from "./auth-hooks";
import { Button } from "@/components/ui/button";

const NAV = [
  { href: "/console", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/console/orgs", label: "Organizations", icon: Building2, exact: false },
  { href: "/console/training", label: "Training content", icon: GraduationCap, exact: false },
  { href: "/console/messages", label: "Messages", icon: Mail, exact: false },
  { href: "/console/audit-logs", label: "Audit log", icon: ScrollText, exact: false },
] as const;

function isActive(current: string, href: string, exact: boolean): boolean {
  if (exact) return current === href;
  return current === href || current.startsWith(href + "/");
}

export function ConsoleLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const logout = useLogout();
  const [location, setLocation] = useLocation();

  function handleLogout() {
    logout.mutate(undefined, { onSuccess: () => setLocation("/login") });
  }

  return (
    <div className="aftrak min-h-screen bg-background font-sans text-foreground">
      <header className="sticky top-0 z-20 border-b bg-card/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/console" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <span className="flex flex-col leading-tight">
              <span className="font-display text-base font-bold tracking-tight">Aftrak console</span>
              <span className="text-[11px] text-muted-foreground">Platform administration</span>
            </span>
          </Link>

          {user ? (
            <div className="flex items-center gap-3">
              <Link
                href="/training"
                className="hidden items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground sm:flex"
              >
                <BookOpen className="h-4 w-4" />
                Training
              </Link>
              <span className="mx-1 hidden h-5 w-px bg-border sm:block" aria-hidden="true" />
              <div className="hidden flex-col items-end leading-tight sm:flex">
                <span className="text-sm font-medium">{user.name}</span>
                <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Superadmin</span>
              </div>
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

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <nav className="mb-6 flex flex-wrap gap-1.5">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = isActive(location, item.href, item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/70"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        {children}
      </div>
    </div>
  );
}
