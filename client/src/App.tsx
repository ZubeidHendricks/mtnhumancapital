import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { ScrollToTop } from "@/components/ui/scroll-to-top";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Login from "@/pages/login";
import HRDashboard from "@/pages/hr-dashboard";
import RecruitmentAgent from "@/pages/recruitment-agent";
import IntegrityAgent from "@/pages/integrity-agent";
import OnboardingAgent from "@/pages/onboarding-agent";
import HRManagementAgent from "@/pages/hr-management-agent";
import ExecutiveDashboard from "@/pages/executive-dashboard";
import InterviewVoice from "@/pages/interview-voice";
import InterviewVideo from "@/pages/interview-video";
import CustomerOnboarding from "@/pages/customer-onboarding";
import CandidatesList from "@/pages/candidates-list";
import CandidateDetail from "@/pages/candidate-detail";
import ShortlistedCandidates from "@/pages/shortlisted-candidates";
import CandidatePipeline from "@/pages/candidate-pipeline";
import AdminDashboard from "@/pages/admin-dashboard";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/onboarding" component={CustomerOnboarding} />
      <Route path="/hr-dashboard" component={HRDashboard} />
      <Route path="/executive-dashboard" component={ExecutiveDashboard} />
      <Route path="/admin-dashboard" component={AdminDashboard} />
      <Route path="/recruitment-agent" component={RecruitmentAgent} />
      <Route path="/integrity-agent" component={IntegrityAgent} />
      <Route path="/onboarding-agent" component={OnboardingAgent} />
      <Route path="/hr-management-agent" component={HRManagementAgent} />
      <Route path="/interview/voice" component={InterviewVoice} />
      <Route path="/interview/video" component={InterviewVideo} />
      <Route path="/candidates-list" component={CandidatesList} />
      <Route path="/candidates/:id" component={CandidateDetail} />
      <Route path="/shortlisted-candidates" component={ShortlistedCandidates} />
      <Route path="/candidate-pipeline" component={CandidatePipeline} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
      <ScrollToTop />
    </QueryClientProvider>
  );
}

export default App;
