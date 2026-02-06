import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Briefcase, 
  Users, 
  Search, 
  FileText, 
  MessageSquare,
  Sparkles,
  Target,
  CheckCircle2,
  PlayCircle,
  HelpCircle
} from "lucide-react";

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  route?: string;
  action?: string;
  tips?: string[];
}

const tutorialSteps: TutorialStep[] = [
  {
    id: "welcome",
    title: "Welcome to Avatar Human Capital",
    description: "Your AI-powered HR management platform. This quick tutorial will guide you through the key features to help you get started.",
    icon: <Sparkles className="h-8 w-8 text-blue-600 dark:text-blue-400" />,
    tips: [
      "The platform automates your entire recruitment process",
      "AI helps create job specs, find candidates, and conduct interviews",
      "Everything is organized in the sidebar navigation"
    ]
  },
  {
    id: "hr-command",
    title: "HR Command Centre",
    description: "Your central hub for managing job specifications. Create new jobs using AI Research to automatically generate complete job specs from just a job title.",
    icon: <Target className="h-8 w-8 text-blue-600 dark:text-blue-400" />,
    route: "/hr-dashboard",
    action: "Click 'Create New Job' and select 'AI Research' mode",
    tips: [
      "Enter a job title and AI will research industry standards",
      "Auto-generates duties, qualifications, and salary ranges",
      "Click on any job card to view full details"
    ]
  },
  {
    id: "job-creation",
    title: "Creating Jobs with AI",
    description: "The AI Job Research feature automatically generates comprehensive job specifications. Just enter the job title and customer name - the AI does the rest!",
    icon: <Briefcase className="h-8 w-8 text-green-600 dark:text-green-400" />,
    route: "/hr-dashboard",
    action: "Try creating a job for 'Senior Software Developer'",
    tips: [
      "AI Research mode is the fastest way to create jobs",
      "Chat mode lets you refine specs conversationally",
      "Paste mode is for importing existing job descriptions"
    ]
  },
  {
    id: "candidate-search",
    title: "Finding Candidates",
    description: "Use the AI Recruitment Agent to search for candidates across multiple sources including PNet, LinkedIn, and your local database.",
    icon: <Search className="h-8 w-8 text-cyan-600 dark:text-cyan-400" />,
    route: "/recruitment-agent",
    action: "Select a job and start searching for candidates",
    tips: [
      "AI ranks candidates based on job fit",
      "View detailed candidate profiles with skills analysis",
      "Shortlist top candidates with one click"
    ]
  },
  {
    id: "candidates",
    title: "Managing Candidates",
    description: "View all your candidates in one place. Upload CVs, track their progress through the pipeline, and manage applications.",
    icon: <Users className="h-8 w-8 text-amber-600 dark:text-amber-400" />,
    route: "/candidates-list",
    action: "Upload a CV or view existing candidates",
    tips: [
      "Drag and drop CVs for instant AI parsing",
      "Filter candidates by skills, experience, or status",
      "Bulk upload multiple CVs at once"
    ]
  },
  {
    id: "interviews",
    title: "AI-Powered Interviews",
    description: "Conduct voice interviews with Hume AI for emotional analysis, or video interviews with Tavus avatars for a personalized experience.",
    icon: <MessageSquare className="h-8 w-8 text-pink-600 dark:text-pink-400" />,
    route: "/interviews",
    action: "Schedule an interview for a shortlisted candidate",
    tips: [
      "Voice interviews analyze tone and confidence",
      "Video avatars provide consistent interview experiences",
      "All interviews are recorded and transcribed"
    ]
  },
  {
    id: "documents",
    title: "Document Management",
    description: "Generate professional CVs, request documents from candidates, and manage all HR paperwork in one place.",
    icon: <FileText className="h-8 w-8 text-teal-700 dark:text-teal-400" />,
    route: "/document-library",
    action: "Explore document templates and generation",
    tips: [
      "AI generates professional CV templates",
      "Request multiple documents from candidates at once",
      "Automated reminders for missing documents"
    ]
  },
  {
    id: "complete",
    title: "You're Ready!",
    description: "You've completed the tutorial! Start by creating your first job specification using AI Research. The platform will guide you from there.",
    icon: <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />,
    tips: [
      "Click the '?' button anytime to restart this tutorial",
      "Explore the sidebar to discover more features",
      "Contact support if you need help"
    ]
  }
];

interface TutorialWalkthroughProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (route: string) => void;
}

export function TutorialWalkthrough({ isOpen, onClose, onNavigate }: TutorialWalkthroughProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [hasSeenTutorial, setHasSeenTutorial] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem("ahc_tutorial_completed");
    if (seen) {
      setHasSeenTutorial(true);
    }
  }, []);

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem("ahc_tutorial_completed", "true");
    setHasSeenTutorial(true);
    onClose();
  };

  const handleSkip = () => {
    localStorage.setItem("ahc_tutorial_completed", "true");
    onClose();
  };

  const handleGoToStep = (route: string) => {
    if (onNavigate) {
      onNavigate(route);
    }
  };

  if (!isOpen) return null;

  const step = tutorialSteps[currentStep];
  const progress = ((currentStep + 1) / tutorialSteps.length) * 100;
  const isLastStep = currentStep === tutorialSteps.length - 1;
  const isFirstStep = currentStep === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <Card className="w-full max-w-lg mx-4 bg-gray-100 dark:bg-zinc-900 border-gray-300 dark:border-zinc-700 shadow-2xl" data-testid="tutorial-card">
        <CardHeader className="relative pb-2">
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute right-4 top-4 text-zinc-400 hover:text-white"
            onClick={handleSkip}
            data-testid="button-close-tutorial"
          >
            <X className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="text-xs border-blue-500/50 text-blue-600 dark:text-blue-400">
              Step {currentStep + 1} of {tutorialSteps.length}
            </Badge>
          </div>
          
          <Progress value={progress} className="h-1 mb-4" />
          
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gray-200 dark:bg-zinc-800/50 border border-gray-300 dark:border-zinc-700">
              {step.icon}
            </div>
            <CardTitle className="text-xl text-white">{step.title}</CardTitle>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <p className="text-zinc-300 leading-relaxed">
            {step.description}
          </p>
          
          {step.action && (
            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
              <p className="text-sm text-blue-300 flex items-center gap-2">
                <PlayCircle className="h-4 w-4" />
                <span className="font-medium">Try it:</span> {step.action}
              </p>
            </div>
          )}
          
          {step.tips && step.tips.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                <HelpCircle className="h-4 w-4" />
                Quick Tips
              </p>
              <ul className="space-y-1.5">
                {step.tips.map((tip, index) => (
                  <li key={index} className="text-sm text-zinc-400 flex items-start gap-2">
                    <span className="text-green-600 dark:text-green-400 mt-0.5">•</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {step.route && !isLastStep && (
            <Button 
              variant="outline" 
              size="sm"
              className="w-full border-gray-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-zinc-800"
              onClick={() => handleGoToStep(step.route!)}
              data-testid={`button-goto-${step.id}`}
            >
              Go to {step.title}
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </CardContent>
        
        <CardFooter className="flex justify-between pt-4 border-t border-gray-200 dark:border-zinc-800">
          <Button 
            variant="ghost" 
            onClick={handlePrevious}
            disabled={isFirstStep}
            className="text-zinc-400 hover:text-white disabled:opacity-30"
            data-testid="button-previous-step"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          
          <div className="flex gap-2">
            {!isLastStep && (
              <Button 
                variant="ghost"
                onClick={handleSkip}
                className="text-zinc-500 hover:text-zinc-300"
                data-testid="button-skip-tutorial"
              >
                Skip Tutorial
              </Button>
            )}
            
            {isLastStep ? (
              <Button 
                onClick={handleComplete}
                className="bg-green-600 hover:bg-green-700 text-white"
                data-testid="button-complete-tutorial"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Get Started
              </Button>
            ) : (
              <Button 
                onClick={handleNext}
                className="bg-blue-600 hover:bg-blue-700 text-white"
                data-testid="button-next-step"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}

export function TutorialButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg z-40"
      title="Start Tutorial"
      data-testid="button-start-tutorial"
    >
      <PlayCircle className="h-7 w-7" />
    </Button>
  );
}

export function useTutorial(tenantId?: string) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasSeenTutorial, setHasSeenTutorial] = useState(true);

  const storageKey = tenantId 
    ? `ahc_tutorial_completed_${tenantId}` 
    : "ahc_tutorial_completed";

  useEffect(() => {
    const seen = localStorage.getItem(storageKey);
    if (!seen) {
      setHasSeenTutorial(false);
      setTimeout(() => setIsOpen(true), 1500);
    } else {
      setHasSeenTutorial(true);
    }
  }, [storageKey]);

  const openTutorial = () => setIsOpen(true);
  const closeTutorial = () => {
    setIsOpen(false);
  };
  
  const completeTutorial = () => {
    localStorage.setItem(storageKey, "true");
    setHasSeenTutorial(true);
    setIsOpen(false);
  };
  
  const resetTutorial = () => {
    localStorage.removeItem(storageKey);
    setHasSeenTutorial(false);
    setIsOpen(true);
  };

  return {
    isOpen,
    openTutorial,
    closeTutorial,
    completeTutorial,
    resetTutorial,
    hasSeenTutorial
  };
}
