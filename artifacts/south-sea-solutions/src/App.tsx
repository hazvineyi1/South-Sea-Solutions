import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";

/**
 * South Sea Solutions: the public site, and nothing else.
 *
 * This app used to carry a second product inside it. Aftrak was a fleet and
 * driver-certification portal (/login, /portal/*, /console/*) with its own auth,
 * its own superadmin console, and twenty database tables behind it. It has been
 * removed: Beltari replaces it, and the site now sends people there instead.
 *
 * What is deliberately NOT here any more: AuthProvider, RequireAuth,
 * RequireSuperadmin. This is a marketing site. It has no logged-in state, so it
 * should not carry the machinery for one. Leaving an auth context wrapped around
 * a set of purely public pages is how a codebase keeps a login system alive long
 * after the thing it protected has gone.
 */

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
