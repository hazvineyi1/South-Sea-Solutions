import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/portal/auth";
import { RequireAuth, RequireSuperadmin, PortalIndex } from "@/portal/guards";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import LoginPage from "@/pages/portal/login";
import CommandPage from "@/pages/portal/command";
import TrainingPage from "@/pages/portal/training";
import TrainingModulePage from "@/pages/portal/training-module";
import DriverRecordPage from "@/pages/portal/driver-record";
import DriverHomePage from "@/pages/portal/driver-home";
import ConsoleOverviewPage from "@/pages/console/overview";
import ConsoleOrgsPage from "@/pages/console/orgs";
import ConsoleOrgDetailPage from "@/pages/console/org-detail";
import ConsoleTrainingPage from "@/pages/console/training";

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
      <Route path="/portal/training">
        <RequireAuth>
          <TrainingPage />
        </RequireAuth>
      </Route>
      <Route path="/portal/training/:slug">
        <RequireAuth>
          <TrainingModulePage />
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
      <Route path="/console">
        <RequireSuperadmin>
          <ConsoleOverviewPage />
        </RequireSuperadmin>
      </Route>
      <Route path="/console/orgs">
        <RequireSuperadmin>
          <ConsoleOrgsPage />
        </RequireSuperadmin>
      </Route>
      <Route path="/console/orgs/:id">
        <RequireSuperadmin>
          <ConsoleOrgDetailPage />
        </RequireSuperadmin>
      </Route>
      <Route path="/console/training">
        <RequireSuperadmin>
          <ConsoleTrainingPage />
        </RequireSuperadmin>
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
