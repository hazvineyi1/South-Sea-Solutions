import { type ReactNode } from "react";
import { Redirect } from "wouter";
import { Loader2 } from "lucide-react";
import { useAuth } from "./auth-hooks";

function FullScreenLoader() {
  return (
    <div className="aftrak flex min-h-screen items-center justify-center bg-background text-foreground">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  );
}

export function RequireAuth({
  roles,
  children,
}: {
  roles?: string[];
  children: ReactNode;
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <FullScreenLoader />;
  }
  if (!user) {
    return <Redirect to="/login" />;
  }
  if (roles && !roles.includes(user.role)) {
    return <Redirect to="/portal" />;
  }
  return <>{children}</>;
}

export function RequireSuperadmin({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <FullScreenLoader />;
  }
  if (!user) {
    return <Redirect to="/login" />;
  }
  if (user.realRole !== "SUPERADMIN") {
    return <Redirect to="/portal" />;
  }
  return <>{children}</>;
}

export function PortalIndex() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <FullScreenLoader />;
  }
  if (!user) {
    return <Redirect to="/login" />;
  }
  const dest =
    user.realRole === "SUPERADMIN" && !user.impersonating
      ? "/console"
      : user.role === "DRIVER"
        ? "/portal/me"
        : "/portal/command";
  return <Redirect to={dest} />;
}
