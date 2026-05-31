import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/portal/auth";
import { RequireAuth, PortalIndex } from "@/portal/guards";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import LoginPage from "@/pages/portal/login";
import CommandPage from "@/pages/portal/command";
import FleetPage from "@/pages/portal/fleet";
import DriverRecordPage from "@/pages/portal/driver-record";
import DriverHomePage from "@/pages/portal/driver-home";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={LoginPage} />
      <Route path="/portal" component={PortalIndex} />
      <Route path="/portal/command">
        <RequireAuth roles={["OWNER"]}>
          <CommandPage />
        </RequireAuth>
      </Route>
      <Route path="/portal/fleet">
        <RequireAuth roles={["OWNER", "OPERATOR"]}>
          <FleetPage />
        </RequireAuth>
      </Route>
      <Route path="/portal/me">
        <RequireAuth roles={["DRIVER"]}>
          <DriverHomePage />
        </RequireAuth>
      </Route>
      <Route path="/portal/drivers/:id">
        <RequireAuth>
          <DriverRecordPage />
        </RequireAuth>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
