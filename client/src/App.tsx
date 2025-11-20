import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import HRDashboard from "@/pages/hr-dashboard";
import RecruitmentAgent from "@/pages/recruitment-agent";
import IntegrityAgent from "@/pages/integrity-agent";
import OnboardingAgent from "@/pages/onboarding-agent";
import HRManagementAgent from "@/pages/hr-management-agent";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/hr-dashboard" component={HRDashboard} />
      <Route path="/recruitment-agent" component={RecruitmentAgent} />
      <Route path="/integrity-agent" component={IntegrityAgent} />
      <Route path="/onboarding-agent" component={OnboardingAgent} />
      <Route path="/hr-management-agent" component={HRManagementAgent} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;