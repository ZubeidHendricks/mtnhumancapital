import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { ScrollToTop } from "@/components/ui/scroll-to-top";
import { TenantProvider } from "@/contexts/TenantContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AppLayout } from "@/components/layout/app-layout";
import { TutorialWalkthrough, TutorialButton, useTutorial } from "@/components/tutorial-walkthrough";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Login from "@/pages/login";
import HRDashboard from "@/pages/hr-dashboard";
import RecruitmentAgent from "@/pages/recruitment-agent";
import IntegrityAgent from "@/pages/integrity-agent";
import OnboardingAgent from "@/pages/onboarding-agent";
import HRManagementAgent from "@/pages/hr-management-agent";
import ExecutiveDashboard from "@/pages/executive-dashboard";
import RecruitmentDashboard from "@/pages/recruitment-dashboard";
import InterviewVoice from "@/pages/interview-voice";
import InterviewVideo from "@/pages/interview-video";
import InterviewFaceToFace from "@/pages/interview-face-to-face";
import OfferSetup from "@/pages/offer-setup";
import OnboardingSetup from "@/pages/onboarding-setup";
import CustomerOnboarding from "@/pages/customer-onboarding";
import CandidatesList from "@/pages/candidates-list";
import CandidateDetail from "@/pages/candidate-detail";
import ShortlistedCandidates from "@/pages/shortlisted-candidates";
import CandidatePipeline from "@/pages/candidate-pipeline";
import PipelineBoard from "@/pages/pipeline-board";
import AdminDashboard from "@/pages/admin-dashboard";
import PersonaManagement from "@/pages/persona-management";
import TenantRequests from "@/pages/tenant-requests";
import TenantManagement from "@/pages/tenant-management";
import PlatformDocs from "@/pages/platform-docs";
import WorkforceIntelligence from "@/pages/workforce-intelligence";
import LearningManagement from "@/pages/learning-management";
import CertificateTemplates from "@/pages/certificate-templates";
import MyCertificates from "@/pages/my-certificates";
import VerifyCertificate from "@/pages/verify-certificate";
import PlatformSettings from "@/pages/platform-settings";
import Certificates from "@/pages/certificates";
import CourseCatalogue from "@/pages/course-catalogue";
import Leaderboard from "@/pages/leaderboard";
import SystemDocs from "@/pages/system-docs";
import DocumentAutomation from "@/pages/document-automation";
import WhatsAppMonitor from "@/pages/whatsapp-monitor";
import InterviewInvite from "@/pages/interview-invite";
import OnboardingDashboard from "@/pages/onboarding-dashboard";
import HRConversations from "@/pages/hr-conversations";
import InterviewConsole from "@/pages/interview-console";
import Recommendations from "@/pages/recommendations";
import KpiManagement from "@/pages/kpi-management";
import KpiReview from "@/pages/kpi-review";
import KpiManagerReview from "@/pages/kpi-manager-review";
import KpiHRDashboard from "@/pages/kpi-hr-dashboard";
import DocumentLibrary from "@/pages/document-library";
import SocialScreening from "@/pages/social-screening";
import SocialScreeningAgent from "@/pages/social-screening-agent";
import CVTemplatePage from "@/pages/cv-template";
import CVTemplatesPage from "@/pages/cv-templates";
import DataSourcesPage from "@/pages/data-sources";
import DataSourceDetailPage from "@/pages/data-source-detail";
import SelfAssessment from "@/pages/self-assessment";
import WorkflowShowcase from "@/pages/workflow-showcase";
import DashboardBuilder from "@/pages/dashboard-builder";
import ExternalCandidates from "@/pages/external-candidates";
import { FleetLogixDashboard } from "@/components/FleetLogixDashboard";
import RecruitmentSetup from "@/pages/recruitment-setup";
import IntegritySetup from "@/pages/integrity-setup";
import OfferManagement from "@/pages/offer-management";
import EmployeeOnboarding from "@/pages/employee-onboarding";
import TemplatesPage from "@/pages/templates";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/onboarding" component={CustomerOnboarding} />
      <Route path="/hr" component={HRDashboard} />
      <Route path="/hr-dashboard" component={HRDashboard} />
      <Route path="/executive-dashboard" component={ExecutiveDashboard} />
      <Route path="/recruitment-dashboard" component={RecruitmentDashboard} />
      <Route path="/admin-dashboard" component={AdminDashboard} />
      <Route path="/tenant-requests" component={TenantRequests} />
      <Route path="/tenant-management" component={TenantManagement} />
      <Route path="/platform-docs" component={PlatformDocs} />
      <Route path="/learning-management" component={LearningManagement} />
      <Route path="/certificate-templates" component={CertificateTemplates} />
      <Route path="/my-certificates" component={MyCertificates} />
      <Route path="/verify-certificate/:number" component={VerifyCertificate} />
      <Route path="/certificates" component={Certificates} />
      <Route path="/courses" component={CourseCatalogue} />
      <Route path="/leaderboard" component={Leaderboard} />
      <Route path="/system-docs" component={SystemDocs} />
      <Route path="/persona-management" component={PersonaManagement} />
      <Route path="/recruitment-agent" component={RecruitmentAgent} />
      <Route path="/integrity-agent" component={IntegrityAgent} />
      <Route path="/onboarding-agent" component={OnboardingAgent} />
      <Route path="/hr-management-agent" component={HRManagementAgent} />
      <Route path="/interview/voice" component={InterviewVoice} />
      <Route path="/interview/video" component={InterviewVideo} />
      <Route path="/interview/face-to-face" component={InterviewFaceToFace} />
      <Route path="/interview/invite/:token" component={InterviewInvite} />
      <Route path="/candidates-list" component={CandidatesList} />
      <Route path="/candidates/:id" component={CandidateDetail} />
      <Route path="/shortlisted-candidates" component={ShortlistedCandidates} />
      <Route path="/candidate-pipeline" component={CandidatePipeline} />
      <Route path="/pipeline-board" component={PipelineBoard} />
      <Route path="/workforce-intelligence" component={WorkforceIntelligence} />
      <Route path="/platform-settings" component={PlatformSettings} />
      <Route path="/document-automation" component={DocumentAutomation} />
      <Route path="/whatsapp-monitor" component={WhatsAppMonitor} />
      <Route path="/onboarding-dashboard" component={OnboardingDashboard} />
      <Route path="/hr-conversations" component={HRConversations} />
      <Route path="/interview-console" component={InterviewConsole} />
      <Route path="/recommendations" component={Recommendations} />
      <Route path="/kpi-management" component={KpiManagement} />
      <Route path="/kpi-review/:id?" component={KpiReview} />
      <Route path="/kpi-manager-review" component={KpiManagerReview} />
      <Route path="/kpi-hr-dashboard" component={KpiHRDashboard} />
      <Route path="/document-library" component={DocumentLibrary} />
      <Route path="/social-screening" component={SocialScreening} />
      <Route path="/social-screening-agent" component={SocialScreeningAgent} />
      <Route path="/cv-template" component={CVTemplatePage} />
      <Route path="/cv-templates" component={CVTemplatesPage} />
      <Route path="/templates" component={TemplatesPage} />
      <Route path="/data-sources" component={DataSourcesPage} />
      <Route path="/data-sources/:id" component={DataSourceDetailPage} />
      <Route path="/self-assessment/:token" component={SelfAssessment} />
      <Route path="/workflow-showcase" component={WorkflowShowcase} />
      <Route path="/dashboard-builder" component={DashboardBuilder} />
      <Route path="/external-candidates" component={ExternalCandidates} />
      <Route path="/fleetlogix" component={FleetLogixDashboard} />
      <Route path="/recruitment-setup" component={RecruitmentSetup} />
      <Route path="/integrity-setup" component={IntegritySetup} />
      <Route path="/offer-management" component={OfferManagement} />
      <Route path="/offer-setup" component={OfferSetup} />
      <Route path="/employee-onboarding" component={EmployeeOnboarding} />
      <Route path="/onboarding-setup" component={OnboardingSetup} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppWithLayout() {
  const [location, setLocation] = useLocation();
  
  const publicRoutes = ['/', '/login', '/interview/invite', '/self-assessment', '/verify-certificate'];
  const exactPublicRoutes = ['/onboarding'];
  const isPublicRoute = publicRoutes.some(route => {
    if (route === '/') return location === '/';
    return location.startsWith(route);
  }) || exactPublicRoutes.includes(location);

  if (isPublicRoute) {
    return <Router />;
  }

  return <AuthenticatedApp />;
}

function AuthenticatedApp() {
  const [location, setLocation] = useLocation();
  const { isOpen, openTutorial, closeTutorial } = useTutorial();

  const handleNavigate = (route: string) => {
    setLocation(route);
    closeTutorial();
  };

  return (
    <>
      <AppLayout>
        <Router />
      </AppLayout>
      <TutorialWalkthrough 
        isOpen={isOpen} 
        onClose={closeTutorial}
        onNavigate={handleNavigate}
      />
      <TutorialButton onClick={openTutorial} />
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TenantProvider>
          <AppWithLayout />
          <Toaster />
          <ScrollToTop />
        </TenantProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
