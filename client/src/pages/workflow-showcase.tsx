import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { jobsService, candidateService, api } from "@/lib/api";
import { useTenantQueryKey } from "@/hooks/useTenant";
import { Navbar } from "@/components/layout/navbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Link } from "wouter";
import { 
  Briefcase,
  Users,
  Search,
  FileCheck,
  Video,
  Send,
  ShieldCheck,
  CheckCircle2,
  GraduationCap,
  Award,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Plus,
  Play,
  Star,
  Clock,
  Target,
  Sparkles,
  Zap,
  CircleDot,
  Wand2,
  UploadCloud,
  FileText,
  Mail,
  Download,
  Trash2,
  MoreHorizontal,
  Mic,
  Calendar,
  FileSignature,
  AlertTriangle,
  Shield,
  CreditCard,
  UserCheck,
  Laptop,
  ClipboardList,
  FileArchive,
  TrendingUp,
  BarChart3,
  ExternalLink,
  Eye,
  ArrowRight
} from "lucide-react";
import { toast } from "sonner";
import type { Candidate, Job } from "@shared/schema";

const WORKFLOW_STEPS = [
  { 
    id: 1, 
    key: "create_job", 
    name: "Create Job", 
    shortName: "Job", 
    icon: Briefcase, 
    color: "from-blue-500 to-blue-600", 
    bgColor: "bg-blue-500/10", 
    borderColor: "border-blue-500/30", 
    textColor: "text-blue-400" 
  },
  { 
    id: 2, 
    key: "sourcing", 
    name: "Candidate Sourcing", 
    shortName: "Source", 
    icon: Users, 
    color: "from-purple-500 to-purple-600", 
    bgColor: "bg-purple-500/10", 
    borderColor: "border-purple-500/30", 
    textColor: "text-purple-400" 
  },
  { 
    id: 3, 
    key: "screening", 
    name: "AI Screening", 
    shortName: "Screen", 
    icon: Sparkles, 
    color: "from-violet-500 to-violet-600", 
    bgColor: "bg-violet-500/10", 
    borderColor: "border-violet-500/30", 
    textColor: "text-violet-400" 
  },
  { 
    id: 4, 
    key: "shortlisted", 
    name: "Shortlisted", 
    shortName: "Short", 
    icon: Star, 
    color: "from-yellow-500 to-amber-500", 
    bgColor: "bg-yellow-500/10", 
    borderColor: "border-yellow-500/30", 
    textColor: "text-yellow-400" 
  },
  { 
    id: 5, 
    key: "interviewing", 
    name: "Interview Stage", 
    shortName: "Interview", 
    icon: Video, 
    color: "from-indigo-500 to-indigo-600", 
    bgColor: "bg-indigo-500/10", 
    borderColor: "border-indigo-500/30", 
    textColor: "text-indigo-400" 
  },
  { 
    id: 6, 
    key: "integrity", 
    name: "Background Checks", 
    shortName: "Verify", 
    icon: Shield, 
    color: "from-cyan-500 to-cyan-600", 
    bgColor: "bg-cyan-500/10", 
    borderColor: "border-cyan-500/30", 
    textColor: "text-cyan-400" 
  },
  { 
    id: 7, 
    key: "offer", 
    name: "Job Offer", 
    shortName: "Offer", 
    icon: FileSignature, 
    color: "from-orange-500 to-orange-600", 
    bgColor: "bg-orange-500/10", 
    borderColor: "border-orange-500/30", 
    textColor: "text-orange-400" 
  },
  { 
    id: 8, 
    key: "onboarding", 
    name: "Employee Onboarding", 
    shortName: "Onboard", 
    icon: Laptop, 
    color: "from-teal-500 to-teal-600", 
    bgColor: "bg-teal-500/10", 
    borderColor: "border-teal-500/30", 
    textColor: "text-teal-400" 
  },
  { 
    id: 9, 
    key: "hired", 
    name: "Successfully Hired", 
    shortName: "Hired", 
    icon: Award, 
    color: "from-green-500 to-green-600", 
    bgColor: "bg-green-500/10", 
    borderColor: "border-green-500/30", 
    textColor: "text-green-400" 
  },
];

const STAGE_ACTIONS: Record<string, { title: string; description: string; automations: string[] }> = {
  "create_job": { 
    title: "Define the Position", 
    description: "Create a comprehensive job requisition with detailed requirements, qualifications, and role specifications. AI assists in crafting compelling job descriptions.", 
    automations: ["Auto-generate JD from template", "Parse job specifications", "Set interview questions", "Define evaluation criteria"] 
  },
  "sourcing": { 
    title: "Find Top Talent", 
    description: "AI-powered candidate discovery across multiple platforms. Automatically import, parse, and match qualified candidates from LinkedIn, job boards, and databases.", 
    automations: ["Multi-platform sourcing", "Intelligent CV parsing", "Skills matching algorithm", "Bulk candidate import", "Duplicate detection"] 
  },
  "screening": { 
    title: "Intelligent Analysis", 
    description: "Advanced AI analyzes CVs, extracts key information, matches candidates against job requirements, and identifies potential concerns. Get ranked recommendations instantly.", 
    automations: ["Deep skills extraction", "Experience validation", "Education verification", "Red flag detection", "Automated ranking"] 
  },
  "shortlisted": { 
    title: "Best Candidates", 
    description: "Review AI-curated top candidates with detailed match scores and insights. Compare qualifications side-by-side and select the best fits for interviews.", 
    automations: ["Smart ranking system", "Side-by-side comparison", "Collaborative notes", "Schedule interviews", "Automated notifications"] 
  },
  "interviewing": { 
    title: "AI-Powered Interviews", 
    description: "Conduct professional voice and video interviews with AI assistance. Get real-time transcription, sentiment analysis, and automated evaluation reports.", 
    automations: ["One-click scheduling", "AI voice screening", "Video interview platform", "Live transcription", "Sentiment analysis", "Interview scorecards"] 
  },
  "integrity": { 
    title: "Comprehensive Verification", 
    description: "Thorough background screening including criminal records, credit checks, employment history, education verification, and professional references. Ensure candidate integrity before extending offers.", 
    automations: ["Criminal background check", "Credit verification", "Employment history validation", "Education confirmation", "Reference checking", "Social media screening", "Compliance reports"] 
  },
  "offer": { 
    title: "Extend Job Offers", 
    description: "Generate professional offer letters with customizable templates, manage salary negotiations, and track offer status. Digital signatures make acceptance seamless.", 
    automations: ["Generate offer letter from template", "E-signature integration", "Compensation calculator", "Negotiation tracking", "Automated reminders"] 
  },
  "onboarding": { 
    title: "Seamless Onboarding", 
    description: "Welcome new hires with a structured onboarding experience. Automate document collection, IT setup, training schedules, and first-day preparation.", 
    automations: ["Welcome email sequence", "Document collection portal", "IT account provisioning", "Training enrollment", "Equipment requests", "First day checklist"] 
  },
  "hired": { 
    title: "Successfully Hired!", 
    description: "Employee is fully onboarded, verified, and ready to contribute. Seamlessly transition to HR management with automated workforce integration and performance tracking.", 
    automations: ["Add to HRIS", "Assign reporting structure", "Set initial KPIs", "Schedule check-ins", "Performance tracking"] 
  }
};

const PIPELINE_STAGES_MAP: Record<string, string[]> = {
  "sourcing": ["sourcing"],
  "screening": ["screening"],
  "shortlisted": ["shortlisted"],
  "interviewing": ["interviewing"],
  "offer": ["offer_pending", "offer_accepted"],
  "integrity": ["integrity_checks", "integrity_passed"],
  "onboarding": ["onboarding"],
  "hired": ["hired"],
};

const onboardingTasks = [
  { id: 1, task: "Send Welcome Letter", assignee: "AI Agent", status: "Completed", icon: Mail },
  { id: 2, task: "Distribute Employee Handbook", assignee: "AI Agent", status: "Completed", icon: FileText },
  { id: 3, task: "Procure Tax Forms", assignee: "AI Agent", status: "In Progress", icon: ClipboardList },
  { id: 4, task: "IT Equipment Setup", assignee: "IT Dept", status: "Pending", icon: Laptop },
  { id: 5, task: "Benefits Enrollment", assignee: "HR", status: "Pending", icon: Shield },
  { id: 6, task: "Training Schedule", assignee: "L&D", status: "Pending", icon: GraduationCap },
];

export default function WorkflowShowcase() {
  const queryClient = useQueryClient();
  const [activeStep, setActiveStep] = useState(1);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [advancingCandidate, setAdvancingCandidate] = useState<string | null>(null);
  
  const [jobTitle, setJobTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isEmailOpen, setIsEmailOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [showComparisonView, setShowComparisonView] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const jobsKey = useTenantQueryKey(['jobs']);
  const candidatesKey = useTenantQueryKey(['candidates']);
  const integrityKey = useTenantQueryKey(['integrity-checks']);
  const socialScreeningsKey = useTenantQueryKey(['social-screenings']);

  const { data: jobs = [], isLoading: loadingJobs } = useQuery({ 
    queryKey: jobsKey, 
    queryFn: jobsService.getAll 
  });
  
  const { data: candidates = [], isLoading: loadingCandidates } = useQuery({ 
    queryKey: candidatesKey, 
    queryFn: candidateService.getAll 
  });
  
  const { data: integrityChecks = [] } = useQuery({
    queryKey: integrityKey,
    queryFn: async () => { 
      try { 
        const r = await fetch('/api/integrity-checks'); 
        return r.ok ? r.json() : []; 
      } catch { return []; } 
    }
  });

  const { data: socialScreenings = [] } = useQuery({
    queryKey: socialScreeningsKey,
    queryFn: async () => {
      try {
        const res = await fetch('/api/social-screenings');
        if (!res.ok) throw new Error('Failed to fetch social screenings');
        return res.json();
      } catch (e) {
        console.error("Failed to fetch social screenings:", e);
        return [];
      }
    },
    retry: 1,
  });

  const createJobMutation = useMutation({
    mutationFn: jobsService.create,
    onSuccess: (newJob) => {
      queryClient.invalidateQueries({ queryKey: jobsKey });
      setSelectedJobId(newJob.id);
      setJobTitle(""); 
      setDepartment(""); 
      setJobDescription("");
      toast.success("Job created successfully!");
      setActiveStep(2);
    },
    onError: () => toast.error("Failed to create job")
  });

  const createCandidateMutation = useMutation({
    mutationFn: candidateService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: candidatesKey });
    },
  });

  const deleteCandidateMutation = useMutation({
    mutationFn: candidateService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: candidatesKey });
      toast.success("Candidate removed successfully");
    },
    onError: () => {
      toast.error("Failed to remove candidate");
    }
  });

  const activeJobs = jobs.filter((j: Job) => j.status === 'Active');
  const selectedJob = activeJobs.find((j: Job) => j.id === selectedJobId);
  const jobCandidates = selectedJobId 
    ? candidates.filter((c: Candidate) => c.jobId === selectedJobId) 
    : candidates;

  const getCandidatesForStep = (stepKey: string): Candidate[] => {
    const stages = PIPELINE_STAGES_MAP[stepKey] || [];
    return jobCandidates.filter((c: Candidate) => {
      const stage = (c.stage || 'sourcing').toLowerCase().replace(/\s+/g, '_');
      return stages.some(s => stage === s || stage.includes(s.replace('_', '')));
    });
  };

  const getStepStats = (stepKey: string) => {
    const count = getCandidatesForStep(stepKey).length;
    return { count, percentage: jobCandidates.length ? Math.round((count / jobCandidates.length) * 100) : 0 };
  };

  const handleAdvanceCandidate = async (candidate: Candidate, toStage: string) => {
    setAdvancingCandidate(candidate.id);
    try {
      const response = await api.post(`/api/pipeline/candidates/${candidate.id}/transition`, { toStage });
      if (response.data.success) {
        queryClient.invalidateQueries({ queryKey: candidatesKey });
        toast.success(`${candidate.fullName} advanced to ${toStage}!`, {
          description: response.data.triggeredActions?.join(", ") || undefined
        });
      } else {
        toast.error("Cannot advance", { description: response.data.blockers?.[0] || response.data.error });
      }
    } catch (error: any) {
      toast.error("Cannot advance", { description: error.response?.data?.blockers?.[0] || "Failed to advance" });
    } finally {
      setAdvancingCandidate(null);
    }
  };

  const handleGenerateJD = async () => {
    if (!jobTitle) {
      toast.error("Please enter a Job Title first.");
      return;
    }
    
    setIsGenerating(true);
    
    await new Promise(resolve => setTimeout(resolve, 2000));

    const generatedText = `JOB TITLE: ${jobTitle}
DEPARTMENT: ${department || 'General'}

ROLE OVERVIEW:
We are looking for a highly motivated ${jobTitle} to join our ${department || 'growing'} team. In this role, you will be responsible for driving key initiatives and contributing to our mission of excellence.

KEY RESPONSIBILITIES:
• ${jobDescription ? jobDescription.split('\n')[0] : 'Lead and manage projects from conception to completion.'}
• Collaborate with cross-functional teams to deliver high-quality results.
• Analyze data to identify trends and opportunities for improvement.
• Mentor junior team members and foster a culture of continuous learning.
• Ensure compliance with industry standards and company policies.

QUALIFICATIONS:
• Bachelor's degree in a related field or equivalent practical experience.
• 3+ years of experience in a similar role.
• Strong problem-solving skills and attention to detail.
• Excellent communication and interpersonal skills.
• Proficiency with relevant tools and technologies.

BENEFITS:
• Competitive salary and equity package.
• Comprehensive health, dental, and vision insurance.
• Flexible work arrangements (Remote/Hybrid).
• Professional development budget.
`;

    setJobDescription(generatedText);
    setIsGenerating(false);
    toast.success("Job Description generated successfully!");
  };

  const handleCreateJob = () => {
    if (!jobTitle) { 
      toast.error("Please enter a job title"); 
      return; 
    }
    createJobMutation.mutate({
      title: jobTitle, 
      department: department || "General",
      description: jobDescription || `Position for ${jobTitle}`,
      status: "Active", 
      salaryMin: 800000, 
      salaryMax: 1200000, 
      location: "Johannesburg, Gauteng"
    });
  };

  const handleFileUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);

    await new Promise(resolve => setTimeout(resolve, 2500));

    try {
      for (const file of Array.from(files)) {
        let name = file.name.split('.')[0];
        
        name = name
          .replace(/resume of/i, '')
          .replace(/cv of/i, '')
          .replace(/resume/i, '')
          .replace(/cv/i, '')
          .replace(/\(\d+\)/g, '')
          .replace(/compressed/i, '')
          .replace(/copy/i, '')
          .replace(/final/i, '')
          .replace(/[-_]/g, ' ')
          .trim();

        name = name.replace(/\b\w/g, (l) => l.toUpperCase());

        if (!name || name.length < 2) {
          name = "Unknown Candidate";
        }

        await createCandidateMutation.mutateAsync({
          fullName: name,
          role: selectedJob?.title || "Developer",
          source: "Uploaded",
          status: "New",
          stage: "screening",
          match: Math.floor(Math.random() * (98 - 70 + 1)) + 70,
          jobId: selectedJobId || undefined,
        });
      }

      setIsUploading(false);
      setIsUploadOpen(false);
      toast.success(`Processed ${files.length} CVs successfully!`);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      console.error("Failed to upload candidates:", error);
      setIsUploading(false);
      toast.error("Failed to process CVs. Please try again.");
    }
  };

  const handleSendEmail = (candidate: any) => {
    setSelectedCandidate(candidate);
    setEmailSubject(`Regarding Your Application - ${candidate.role || 'Position'}`);
    setEmailMessage(`Dear ${candidate.fullName},\n\nThank you for your interest in the ${candidate.role || 'position'} role at Avatar Human Capital.\n\nBest regards,\nHR Team`);
    setIsEmailOpen(true);
  };

  const handleSendEmailSubmit = () => {
    toast.success(`Email sent to ${selectedCandidate?.email || selectedCandidate?.fullName || 'candidate'}`);
    setIsEmailOpen(false);
    setSelectedCandidate(null);
    setEmailSubject("");
    setEmailMessage("");
  };

  const handleDownloadCV = (candidate: any) => {
    if (candidate?.cvUrl) {
      window.open(candidate.cvUrl, '_blank');
      toast.success("Opening CV...");
    } else {
      toast.error("CV not available for this candidate");
    }
  };

  const handleStart = () => {
    if (activeJobs.length > 0 && !selectedJobId) {
      setSelectedJobId(activeJobs[0].id);
      setActiveStep(2);
      toast.success("Started with existing job: " + activeJobs[0].title);
    } else if (selectedJobId) {
      setActiveStep(2);
      toast.success("Continuing with selected job");
    } else {
      toast.info("Create a job first to start the workflow");
    }
  };

  const currentStep = WORKFLOW_STEPS[activeStep - 1];
  const stepAction = STAGE_ACTIONS[currentStep.key];
  const progressPercent = ((activeStep - 1) / (WORKFLOW_STEPS.length - 1)) * 100;
  const IconComponent = currentStep.icon;

  const getIntegrityForCandidate = (candidateId: string) => 
    integrityChecks.find((ic: any) => ic.candidateId === candidateId);

  const getSocialScreeningForCandidate = (candidateId: string) =>
    socialScreenings.find((ss: any) => ss.candidateId === candidateId);

  const getCandidateRiskData = (candidateId: string) => {
    const integrityCheck = getIntegrityForCandidate(candidateId);
    const socialScreening = getSocialScreeningForCandidate(candidateId);
    
    let overallRiskScore = 0;
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    let hasData = false;

    if (integrityCheck) {
      hasData = true;
      overallRiskScore = (integrityCheck as any).riskScore || 0;
    }

    if ((socialScreening as any)?.results?.aggregatedResults) {
      hasData = true;
      const socialScore = 100 - ((socialScreening as any).results.aggregatedResults.overallScore || 50);
      overallRiskScore = integrityCheck 
        ? Math.round((overallRiskScore + socialScore) / 2)
        : socialScore;
    }

    if (overallRiskScore <= 25) riskLevel = 'low';
    else if (overallRiskScore <= 50) riskLevel = 'medium';
    else if (overallRiskScore <= 75) riskLevel = 'high';
    else riskLevel = 'critical';

    return {
      hasData,
      integrityCheck,
      socialScreening,
      overallRiskScore,
      riskLevel
    };
  };

  const renderStepContent = () => {
    if (loadingJobs || loadingCandidates) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }

    if (currentStep.key === "create_job") {
      return (
        <div className="space-y-4">
          {activeJobs.length > 0 && (
            <div>
              <Label className="text-sm mb-2 block">Select existing job:</Label>
              <Select value={selectedJobId || ""} onValueChange={(v) => { setSelectedJobId(v); setActiveStep(2); }}>
                <SelectTrigger data-testid="select-existing-job">
                  <SelectValue placeholder="Choose a job..." />
                </SelectTrigger>
                <SelectContent>
                  {activeJobs.map((job: Job) => (
                    <SelectItem key={job.id} value={job.id}>
                      {job.title} - {job.department}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          <div className={activeJobs.length > 0 ? "border-t border-white/10 pt-4" : ""}>
            <h4 className="font-medium mb-4 flex items-center gap-2">
              <Plus className="h-4 w-4" /> Create New Job
            </h4>
            <div className="grid gap-3">
              <div>
                <Label>Job Title *</Label>
                <Input 
                  value={jobTitle} 
                  onChange={e => setJobTitle(e.target.value)} 
                  placeholder="e.g., Senior Developer" 
                  data-testid="input-job-title" 
                />
              </div>
              <div>
                <Label>Department</Label>
                <Input 
                  value={department} 
                  onChange={e => setDepartment(e.target.value)} 
                  placeholder="e.g., Engineering" 
                  data-testid="input-department" 
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label>Description</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleGenerateJD}
                    disabled={isGenerating || !jobTitle}
                    className="text-primary hover:text-primary/80"
                    data-testid="button-generate-jd"
                  >
                    {isGenerating ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Wand2 className="h-4 w-4 mr-1" />
                    )}
                    Generate with AI
                  </Button>
                </div>
                <Textarea 
                  value={jobDescription} 
                  onChange={e => setJobDescription(e.target.value)} 
                  placeholder="Job requirements..." 
                  rows={6}
                  data-testid="input-description" 
                />
              </div>
              <Button 
                onClick={handleCreateJob} 
                disabled={createJobMutation.isPending || !jobTitle}
                className="bg-gradient-to-r from-blue-500 to-blue-600"
                data-testid="button-create-job"
              >
                {createJobMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Briefcase className="h-4 w-4 mr-2" />
                )}
                Create Job & Continue
              </Button>
            </div>
          </div>
        </div>
      );
    }

    if (!selectedJobId && activeJobs.length > 0) {
      return (
        <div className="text-center py-12">
          <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-medium mb-2">No Job Selected</h3>
          <p className="text-muted-foreground mb-4">Create or select a job to continue</p>
          <Button onClick={() => setActiveStep(1)} variant="outline" data-testid="button-go-step-1">Go to Step 1</Button>
        </div>
      );
    }

    if (currentStep.key === "sourcing") {
      return (
        <div className="space-y-4">
          <div className="rounded-lg bg-gradient-to-r from-primary/20 to-purple-500/20 border border-primary/20 p-4 flex items-center justify-between">
            <div>
              <h3 className="text-md font-bold flex items-center gap-2 text-white">
                <Sparkles className="w-4 h-4 text-primary" />
                Need to find candidates fast?
              </h3>
              <p className="text-muted-foreground text-sm mt-1">
                Launch the AI Recruitment Agent to source, screen, and rank candidates.
              </p>
            </div>
            <Link href="/recruitment-agent">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90" data-testid="button-launch-recruiter">
                Launch AI Recruiter
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="h-24 flex-col gap-2" data-testid="button-upload-cv">
                  <UploadCloud className="h-6 w-6" />
                  <span>Upload CVs</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Upload Candidate CVs</DialogTitle>
                  <DialogDescription>Upload PDF or DOCX files to add candidates to the pipeline</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                    data-testid="input-file-upload"
                  />
                  <div 
                    onClick={handleFileUploadClick}
                    className="border-2 border-dashed border-white/20 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  >
                    {isUploading ? (
                      <div className="flex flex-col items-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                        <p>Processing CVs...</p>
                      </div>
                    ) : (
                      <>
                        <UploadCloud className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">Click to upload or drag and drop</p>
                        <p className="text-xs text-muted-foreground mt-1">PDF, DOC, DOCX (max 10MB each)</p>
                      </>
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Button variant="outline" className="h-24 flex-col gap-2" asChild data-testid="button-bulk-import">
              <Link href="/recruitment-agent">
                <FileArchive className="h-6 w-6" />
                <span>Bulk Import</span>
              </Link>
            </Button>
          </div>

          {renderCandidateList("sourcing")}
        </div>
      );
    }

    if (currentStep.key === "screening") {
      const stepCandidates = getCandidatesForStep("screening");
      
      if (stepCandidates.length === 0) {
        return (
          <div className="text-center py-8">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">No Candidates at Screening Stage</h3>
            <p className="text-sm text-muted-foreground">Upload CVs or advance candidates from sourcing</p>
          </div>
        );
      }

      return (
        <ScrollArea className="h-[400px]">
          <div className="space-y-3">
            {stepCandidates.map((candidate: Candidate) => (
              <Card key={candidate.id} className="bg-background/50 border-white/10" data-testid={`screening-card-${candidate.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12 border border-white/10">
                        <AvatarFallback className="bg-purple-500/20 text-purple-400 text-sm">
                          {candidate.fullName?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{candidate.fullName}</p>
                        <p className="text-sm text-muted-foreground">{candidate.role}</p>
                        {(candidate as any).skills && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {((candidate as any).skills || []).slice(0, 3).map((skill: string, i: number) => (
                              <Badge key={i} variant="outline" className="text-xs bg-purple-500/10 border-purple-500/30">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {candidate.match && (
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-bold text-purple-400">{candidate.match}%</span>
                          <span className="text-xs text-muted-foreground">Match</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => handleSendEmail(candidate)}
                          data-testid={`button-email-${candidate.id}`}
                        >
                          <Mail className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => handleDownloadCV(candidate)}
                          data-testid={`button-download-cv-${candidate.id}`}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          className="bg-gradient-to-r from-yellow-500 to-amber-500"
                          onClick={() => handleAdvanceCandidate(candidate, "shortlisted")}
                          disabled={advancingCandidate === candidate.id}
                          data-testid={`button-advance-${candidate.id}`}
                        >
                          {advancingCandidate === candidate.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <ChevronRight className="h-4 w-4 mr-1" />
                              Shortlist
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      );
    }

    if (currentStep.key === "shortlisted") {
      const stepCandidates = getCandidatesForStep("shortlisted");
      
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-400" />
              <span className="font-medium">Top Candidates ({stepCandidates.length})</span>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowComparisonView(!showComparisonView)}
              data-testid="button-comparison-view"
            >
              <Eye className="h-4 w-4 mr-1" />
              {showComparisonView ? "Card View" : "Compare"}
            </Button>
          </div>

          {stepCandidates.length === 0 ? (
            <div className="text-center py-8">
              <Star className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium mb-2">No Shortlisted Candidates</h3>
              <p className="text-sm text-muted-foreground">Advance candidates from screening stage</p>
            </div>
          ) : showComparisonView ? (
            <div className="grid grid-cols-2 gap-4">
              {stepCandidates.slice(0, 4).map((candidate: Candidate) => (
                <Card key={candidate.id} className="bg-background/50 border-yellow-500/20" data-testid={`compare-card-${candidate.id}`}>
                  <CardContent className="p-4 text-center">
                    <Avatar className="h-16 w-16 mx-auto mb-2 border-2 border-yellow-500/30">
                      <AvatarFallback className="bg-yellow-500/20 text-yellow-400">
                        {candidate.fullName?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <p className="font-medium">{candidate.fullName}</p>
                    <p className="text-sm text-muted-foreground mb-2">{candidate.role}</p>
                    {candidate.match && (
                      <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 mb-2">
                        <Star className="h-3 w-3 mr-1" />{candidate.match}% Match
                      </Badge>
                    )}
                    <Button size="sm" className="w-full mt-2" asChild data-testid={`button-schedule-${candidate.id}`}>
                      <Link href="/interview-invite">
                        <Calendar className="h-4 w-4 mr-1" />
                        Schedule Interview
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <ScrollArea className="h-[320px]">
              <div className="space-y-3">
                {stepCandidates.map((candidate: Candidate) => (
                  <Card key={candidate.id} className="bg-background/50 border-yellow-500/20" data-testid={`shortlist-card-${candidate.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <Avatar className="h-10 w-10 border border-yellow-500/30">
                              <AvatarFallback className="bg-yellow-500/20 text-yellow-400 text-sm">
                                {candidate.fullName?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <Star className="h-4 w-4 text-yellow-400 absolute -top-1 -right-1" />
                          </div>
                          <div>
                            <p className="font-medium">{candidate.fullName}</p>
                            <p className="text-sm text-muted-foreground">{candidate.role}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {candidate.match && (
                            <Badge variant="outline" className="bg-yellow-500/10 border-yellow-500/30">
                              <Star className="h-3 w-3 mr-1 text-yellow-400" />{candidate.match}%
                            </Badge>
                          )}
                          <Button size="sm" variant="outline" asChild data-testid={`button-schedule-interview-${candidate.id}`}>
                            <Link href="/interview-invite">
                              <Calendar className="h-4 w-4 mr-1" />
                              Schedule
                            </Link>
                          </Button>
                          <Button
                            size="sm"
                            className="bg-gradient-to-r from-indigo-500 to-indigo-600"
                            onClick={() => handleAdvanceCandidate(candidate, "interviewing")}
                            disabled={advancingCandidate === candidate.id}
                            data-testid={`button-to-interview-${candidate.id}`}
                          >
                            {advancingCandidate === candidate.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      );
    }

    if (currentStep.key === "interviewing") {
      const stepCandidates = getCandidatesForStep("interviewing");
      
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Link href="/interview-voice">
              <Button variant="outline" className="w-full h-20 flex-col gap-2 border-indigo-500/30 hover:bg-indigo-500/10" data-testid="button-ai-voice-interview">
                <Mic className="h-6 w-6 text-indigo-400" />
                <span>AI Voice Interview</span>
              </Button>
            </Link>
            <Link href="/interview-video">
              <Button variant="outline" className="w-full h-20 flex-col gap-2 border-indigo-500/30 hover:bg-indigo-500/10" data-testid="button-video-interview">
                <Video className="h-6 w-6 text-indigo-400" />
                <span>Video Interview</span>
              </Button>
            </Link>
          </div>

          {stepCandidates.length === 0 ? (
            <div className="text-center py-8">
              <Video className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium mb-2">No Candidates in Interview Stage</h3>
              <p className="text-sm text-muted-foreground">Schedule interviews for shortlisted candidates</p>
            </div>
          ) : (
            <ScrollArea className="h-[280px]">
              <div className="space-y-3">
                {stepCandidates.map((candidate: Candidate) => (
                  <Card key={candidate.id} className="bg-background/50 border-indigo-500/20" data-testid={`interview-card-${candidate.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 border border-indigo-500/30">
                            <AvatarFallback className="bg-indigo-500/20 text-indigo-400 text-sm">
                              {candidate.fullName?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{candidate.fullName}</p>
                            <p className="text-sm text-muted-foreground">{candidate.role}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={(candidate as any).interviewStatus === 'completed' 
                            ? 'bg-green-500/10 border-green-500/30 text-green-400'
                            : (candidate as any).interviewStatus === 'scheduled'
                              ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                              : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
                          }>
                            {(candidate as any).interviewStatus || 'Pending'}
                          </Badge>
                          <Button
                            size="sm"
                            className="bg-gradient-to-r from-orange-500 to-orange-600"
                            onClick={() => handleAdvanceCandidate(candidate, "offer_pending")}
                            disabled={advancingCandidate === candidate.id}
                            data-testid={`button-to-offer-${candidate.id}`}
                          >
                            {advancingCandidate === candidate.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Send className="h-4 w-4 mr-1" />
                                Offer
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      );
    }

    if (currentStep.key === "offer") {
      const stepCandidates = getCandidatesForStep("offer");
      
      return (
        <div className="space-y-4">
          {stepCandidates.length === 0 ? (
            <div className="text-center py-8">
              <Send className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium mb-2">No Candidates at Offer Stage</h3>
              <p className="text-sm text-muted-foreground">Complete interviews to extend offers</p>
            </div>
          ) : (
            <ScrollArea className="h-[350px]">
              <div className="space-y-3">
                {stepCandidates.map((candidate: Candidate) => {
                  const candidateOfferStatus = (candidate as any).offerStatus;
                  const offerStatus: string = candidateOfferStatus || (candidate.stage?.includes('accepted') ? 'accepted' : 'pending');
                  
                  return (
                    <Card key={candidate.id} className="bg-background/50 border-orange-500/20" data-testid={`offer-card-${candidate.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 border border-orange-500/30">
                              <AvatarFallback className="bg-orange-500/20 text-orange-400 text-sm">
                                {candidate.fullName?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{candidate.fullName}</p>
                              <p className="text-sm text-muted-foreground">{candidate.role}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={
                              offerStatus === 'accepted' 
                                ? 'bg-green-500/10 border-green-500/30 text-green-400'
                                : offerStatus === 'declined'
                                  ? 'bg-red-500/10 border-red-500/30 text-red-400'
                                  : 'bg-orange-500/10 border-orange-500/30 text-orange-400'
                            }>
                              {offerStatus === 'accepted' ? 'Offer Accepted' : offerStatus === 'declined' ? 'Declined' : 'Offer Pending'}
                            </Badge>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="sm" variant="outline" data-testid={`button-offer-actions-${candidate.id}`}>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuItem data-testid={`menu-generate-offer-${candidate.id}`}>
                                  <FileText className="h-4 w-4 mr-2" />
                                  Generate Offer Letter
                                </DropdownMenuItem>
                                <DropdownMenuItem data-testid={`menu-esign-${candidate.id}`}>
                                  <FileSignature className="h-4 w-4 mr-2" />
                                  Send for E-Signature
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleSendEmail(candidate)} data-testid={`menu-email-offer-${candidate.id}`}>
                                  <Mail className="h-4 w-4 mr-2" />
                                  Send Email
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                            {offerStatus === 'accepted' && (
                              <Button
                                size="sm"
                                className="bg-gradient-to-r from-cyan-500 to-cyan-600"
                                onClick={() => handleAdvanceCandidate(candidate, "integrity_checks")}
                                disabled={advancingCandidate === candidate.id}
                                data-testid={`button-to-integrity-${candidate.id}`}
                              >
                                {advancingCandidate === candidate.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <ShieldCheck className="h-4 w-4 mr-1" />
                                    Checks
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </div>
      );
    }

    if (currentStep.key === "integrity") {
      const stepCandidates = getCandidatesForStep("integrity");
      
      return (
        <div className="space-y-4">
          {stepCandidates.length === 0 ? (
            <div className="text-center py-8">
              <ShieldCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium mb-2">No Candidates in Integrity Checks</h3>
              <p className="text-sm text-muted-foreground">Candidates with accepted offers will appear here</p>
            </div>
          ) : (
            <ScrollArea className="h-[350px]">
              <div className="space-y-3">
                {stepCandidates.map((candidate: Candidate) => {
                  const riskData = getCandidateRiskData(candidate.id);
                  const integrity = riskData.integrityCheck as any;
                  const social = riskData.socialScreening as any;
                  
                  return (
                    <Card key={candidate.id} className="bg-background/50 border-cyan-500/20" data-testid={`integrity-card-${candidate.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 border border-cyan-500/30">
                              <AvatarFallback className="bg-cyan-500/20 text-cyan-400 text-sm">
                                {candidate.fullName?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{candidate.fullName}</p>
                              <p className="text-sm text-muted-foreground">{candidate.role}</p>
                            </div>
                          </div>
                          <Badge variant="outline" className={
                            riskData.riskLevel === 'low' ? 'bg-green-500/10 border-green-500/30 text-green-400' :
                            riskData.riskLevel === 'medium' ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400' :
                            riskData.riskLevel === 'high' ? 'bg-orange-500/10 border-orange-500/30 text-orange-400' :
                            'bg-red-500/10 border-red-500/30 text-red-400'
                          } data-testid={`risk-badge-${candidate.id}`}>
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Risk: {riskData.overallRiskScore}%
                          </Badge>
                        </div>
                        
                        <div className="mt-3 grid grid-cols-4 gap-2">
                          <div className="flex items-center gap-1 text-xs" data-testid={`criminal-check-${candidate.id}`}>
                            <Shield className={`h-4 w-4 ${integrity?.criminalCheckStatus === 'clear' ? 'text-green-400' : integrity?.criminalCheckStatus === 'failed' ? 'text-red-400' : 'text-yellow-400'}`} />
                            <span className="text-muted-foreground">Criminal</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs" data-testid={`credit-check-${candidate.id}`}>
                            <CreditCard className={`h-4 w-4 ${integrity?.creditCheckStatus === 'clear' ? 'text-green-400' : integrity?.creditCheckStatus === 'failed' ? 'text-red-400' : 'text-yellow-400'}`} />
                            <span className="text-muted-foreground">Credit</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs" data-testid={`reference-check-${candidate.id}`}>
                            <UserCheck className={`h-4 w-4 ${integrity?.referenceCheckStatus === 'clear' ? 'text-green-400' : integrity?.referenceCheckStatus === 'failed' ? 'text-red-400' : 'text-yellow-400'}`} />
                            <span className="text-muted-foreground">Reference</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs" data-testid={`social-check-${candidate.id}`}>
                            <Search className={`h-4 w-4 ${social?.status === 'completed' ? 'text-green-400' : social?.status === 'flagged' ? 'text-red-400' : 'text-yellow-400'}`} />
                            <span className="text-muted-foreground">Social</span>
                          </div>
                        </div>
                        
                        <div className="mt-3 flex justify-end gap-2">
                          <Button size="sm" variant="outline" asChild data-testid={`button-view-integrity-${candidate.id}`}>
                            <Link href="/integrity-agent">
                              <Eye className="h-4 w-4 mr-1" />
                              View Details
                            </Link>
                          </Button>
                          {riskData.riskLevel === 'low' && (
                            <Button
                              size="sm"
                              className="bg-gradient-to-r from-teal-500 to-teal-600"
                              onClick={() => handleAdvanceCandidate(candidate, "onboarding")}
                              disabled={advancingCandidate === candidate.id}
                              data-testid={`button-to-onboarding-${candidate.id}`}
                            >
                              {advancingCandidate === candidate.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <GraduationCap className="h-4 w-4 mr-1" />
                                  Onboard
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </div>
      );
    }

    if (currentStep.key === "onboarding") {
      const stepCandidates = getCandidatesForStep("onboarding");
      
      return (
        <div className="space-y-4">
          <Card className="bg-background/50 border-teal-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-teal-400" />
                Onboarding Checklist
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {onboardingTasks.map((task) => {
                  const TaskIcon = task.icon;
                  return (
                    <div 
                      key={task.id} 
                      className="flex items-center justify-between p-2 rounded-lg bg-muted/30"
                      data-testid={`onboarding-task-${task.id}`}
                    >
                      <div className="flex items-center gap-2">
                        <TaskIcon className="h-4 w-4 text-teal-400" />
                        <span className="text-sm">{task.task}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{task.assignee}</span>
                        <Badge variant="outline" className={
                          task.status === 'Completed' ? 'bg-green-500/10 border-green-500/30 text-green-400' :
                          task.status === 'In Progress' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' :
                          'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
                        }>
                          {task.status}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {stepCandidates.length === 0 ? (
            <div className="text-center py-4">
              <GraduationCap className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No candidates in onboarding</p>
            </div>
          ) : (
            <div className="space-y-3">
              {stepCandidates.map((candidate: Candidate) => (
                <Card key={candidate.id} className="bg-background/50 border-teal-500/20" data-testid={`onboarding-card-${candidate.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border border-teal-500/30">
                          <AvatarFallback className="bg-teal-500/20 text-teal-400 text-sm">
                            {candidate.fullName?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{candidate.fullName}</p>
                          <p className="text-sm text-muted-foreground">{candidate.role}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 text-xs">
                          <Laptop className="h-4 w-4 text-teal-400" />
                          <span className="text-muted-foreground">IT Ready</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs">
                          <FileText className="h-4 w-4 text-teal-400" />
                          <span className="text-muted-foreground">Docs</span>
                        </div>
                        <Button
                          size="sm"
                          className="bg-gradient-to-r from-green-500 to-green-600"
                          onClick={() => handleAdvanceCandidate(candidate, "hired")}
                          disabled={advancingCandidate === candidate.id}
                          data-testid={`button-to-hired-${candidate.id}`}
                        >
                          {advancingCandidate === candidate.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Award className="h-4 w-4 mr-1" />
                              Complete
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (currentStep.key === "hired") {
      const stepCandidates = getCandidatesForStep("hired");
      
      return (
        <div className="space-y-4">
          {stepCandidates.length === 0 ? (
            <div className="text-center py-12">
              <Award className="h-16 w-16 mx-auto text-green-400 mb-4" />
              <h3 className="text-xl font-bold mb-2 text-green-400">Ready to Hire!</h3>
              <p className="text-muted-foreground">Complete the onboarding process to add employees to your workforce</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center py-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 mb-4">
                  <CheckCircle2 className="h-8 w-8 text-green-400" />
                </div>
                <h3 className="text-xl font-bold text-green-400">Congratulations!</h3>
                <p className="text-muted-foreground">{stepCandidates.length} employee(s) successfully hired</p>
              </div>
              
              <ScrollArea className="h-[280px]">
                <div className="space-y-3">
                  {stepCandidates.map((candidate: Candidate) => (
                    <Card key={candidate.id} className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/30" data-testid={`hired-card-${candidate.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <Avatar className="h-12 w-12 border-2 border-green-500/50">
                                <AvatarFallback className="bg-green-500/20 text-green-400">
                                  {candidate.fullName?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                </AvatarFallback>
                              </Avatar>
                              <CheckCircle2 className="h-5 w-5 text-green-400 absolute -bottom-1 -right-1 bg-background rounded-full" />
                            </div>
                            <div>
                              <p className="font-medium">{candidate.fullName}</p>
                              <p className="text-sm text-muted-foreground">{candidate.role}</p>
                              <Badge className="mt-1 bg-green-500/20 text-green-400 border-green-500/30">
                                <Award className="h-3 w-3 mr-1" />
                                Hired
                              </Badge>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2">
                            <Button size="sm" variant="outline" className="border-green-500/30" asChild data-testid={`button-workforce-${candidate.id}`}>
                              <Link href="/workforce-intelligence">
                                <Users className="h-4 w-4 mr-1" />
                                Add to Workforce
                              </Link>
                            </Button>
                            <Button size="sm" variant="outline" className="border-green-500/30" asChild data-testid={`button-kpi-${candidate.id}`}>
                              <Link href="/kpi-management">
                                <BarChart3 className="h-4 w-4 mr-1" />
                                Assign KPIs
                              </Link>
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      );
    }

    return renderCandidateList(currentStep.key);
  };

  const renderCandidateList = (stepKey: string) => {
    const stepCandidates = getCandidatesForStep(stepKey);
    const nextStep = WORKFLOW_STEPS[activeStep];
    const nextStages = nextStep ? PIPELINE_STAGES_MAP[nextStep.key] : [];
    const nextStage = nextStages[0];

    if (stepCandidates.length === 0) {
      return (
        <div className="text-center py-8">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-medium mb-2">No Candidates at This Stage</h3>
          <p className="text-sm text-muted-foreground">
            {stepKey === "sourcing" 
              ? "Upload CVs or use AI sourcing to add candidates"
              : "Advance candidates from the previous stage"}
          </p>
        </div>
      );
    }

    return (
      <ScrollArea className="h-[350px]">
        <div className="space-y-3">
          {stepCandidates.map((candidate: Candidate) => {
            const integrity = getIntegrityForCandidate(candidate.id);
            
            return (
              <Card key={candidate.id} className="bg-background/50 border-white/10" data-testid={`workflow-card-${candidate.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 border border-white/10">
                        <AvatarFallback className="bg-primary/20 text-primary text-sm">
                          {candidate.fullName?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{candidate.fullName}</p>
                        <p className="text-sm text-muted-foreground">{candidate.role}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {candidate.match && (
                        <Badge variant="outline" className="bg-yellow-500/10 border-yellow-500/30">
                          <Star className="h-3 w-3 mr-1 text-yellow-400" />{candidate.match}%
                        </Badge>
                      )}
                      
                      {stepKey === "integrity" && integrity && (
                        <Badge variant="outline" className={
                          (integrity as any).status === 'completed' || (integrity as any).status === 'passed'
                            ? 'bg-green-500/10 border-green-500/30 text-green-400'
                            : (integrity as any).status === 'failed'
                              ? 'bg-red-500/10 border-red-500/30 text-red-400'
                              : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
                        }>
                          <ShieldCheck className="h-3 w-3 mr-1" />{(integrity as any).status}
                        </Badge>
                      )}

                      <Badge variant="outline" className={`${currentStep.bgColor} ${currentStep.borderColor}`}>
                        {candidate.stage}
                      </Badge>
                      
                      {nextStage && stepKey !== "hired" && (
                        <Button
                          size="sm"
                          className={`bg-gradient-to-r ${nextStep?.color || 'from-primary to-primary'}`}
                          onClick={() => handleAdvanceCandidate(candidate, nextStage)}
                          disabled={advancingCandidate === candidate.id}
                          data-testid={`button-advance-${candidate.id}`}
                        >
                          {advancingCandidate === candidate.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <ChevronRight className="h-4 w-4 mr-1" />
                              {nextStep?.shortName}
                            </>
                          )}
                        </Button>
                      )}
                      
                      {stepKey === "hired" && (
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                          <CheckCircle2 className="h-3 w-3 mr-1" />Hired
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-6 pt-24 pb-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-1">HR Workflow</h1>
            <p className="text-muted-foreground">Complete hiring process from job to hired</p>
          </div>
          <div className="flex items-center gap-3">
            {selectedJob && (
              <Badge variant="secondary" className="text-sm py-1 px-3">
                <Briefcase className="h-3 w-3 mr-1" />
                {selectedJob.title}
              </Badge>
            )}
            <Button 
              onClick={handleStart}
              disabled={loadingJobs || activeJobs.length === 0}
              className="bg-gradient-to-r from-purple-500 to-pink-500"
              data-testid="button-start"
            >
              <Play className="h-4 w-4 mr-2" />
              Start
            </Button>
          </div>
        </div>

        <Card className="mb-6 bg-gradient-to-r from-card/80 to-card/60 border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => activeStep > 1 && setActiveStep(activeStep - 1)} 
                  disabled={activeStep === 1}
                  data-testid="button-prev-step"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-xl bg-gradient-to-r ${currentStep.color}`}>
                    <IconComponent className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Step {activeStep}/{WORKFLOW_STEPS.length}</span>
                      <Badge variant="outline" className={currentStep.bgColor}>{currentStep.name}</Badge>
                    </div>
                    <h2 className="text-xl font-bold">{stepAction.title}</h2>
                  </div>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="icon" 
                onClick={() => activeStep < WORKFLOW_STEPS.length && setActiveStep(activeStep + 1)} 
                disabled={activeStep === WORKFLOW_STEPS.length}
                data-testid="button-next-step"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <Progress value={progressPercent} className="h-2 mb-4" />

            <div className="flex justify-between gap-1">
              {WORKFLOW_STEPS.map((step) => {
                const isActive = step.id === activeStep;
                // Only mark as completed if we're past this step AND there's actual data
                const hasData = step.key !== "create_job" ? getStepStats(step.key).count > 0 : selectedJobId !== null;
                const isCompleted = step.id < activeStep && hasData;
                const StepIcon = step.icon;
                const stats = step.key !== "create_job" ? getStepStats(step.key) : null;
                
                return (
                  <button
                    key={step.id}
                    onClick={() => setActiveStep(step.id)}
                    className={`flex-1 flex flex-col items-center p-2 rounded-lg transition-all ${isActive ? 'bg-white/10' : 'hover:bg-white/5'}`}
                    data-testid={`wizard-step-${step.key}`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-1 transition-all ${
                      isActive ? `bg-gradient-to-r ${step.color} shadow-lg` : isCompleted ? 'bg-green-500/20 border border-green-500' : 'bg-muted/50'
                    }`}>
                      {isCompleted ? <CheckCircle2 className="h-4 w-4 text-green-400" /> : <StepIcon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-muted-foreground'}`} />}
                    </div>
                    <span className={`text-[10px] font-medium ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>{step.shortName}</span>
                    {stats && stats.count > 0 && <span className={`text-[10px] ${step.textColor}`}>{stats.count}</span>}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-card/50 border-white/10">
              <CardHeader className="pb-3">
                <CardDescription>{stepAction.description}</CardDescription>
              </CardHeader>
              <CardContent>
                {renderStepContent()}
              </CardContent>
            </Card>

            <Card className="bg-card/50 border-white/10">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Zap className="h-4 w-4 text-yellow-400" />Automations at This Stage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {stepAction.automations.map((a, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 text-sm">
                      <CircleDot className="h-3 w-3 text-primary" />{a}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="bg-card/50 border-white/10">
              <CardHeader>
                <CardTitle className="text-sm">Pipeline Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {selectedJob ? (
                  <>
                    <div className="flex justify-between p-2 rounded bg-muted/30 text-sm">
                      <span className="text-muted-foreground">Job</span>
                      <span className="font-medium truncate max-w-[120px]">{selectedJob.title}</span>
                    </div>
                    <div className="flex justify-between p-2 rounded bg-muted/30 text-sm">
                      <span className="text-muted-foreground">Candidates</span>
                      <span className="font-medium">{jobCandidates.length}</span>
                    </div>
                    <div className="border-t border-white/10 pt-2 mt-2">
                      {WORKFLOW_STEPS.filter(s => s.key !== "create_job").map(step => {
                        const stats = getStepStats(step.key);
                        return (
                          <div key={step.key} className="flex items-center gap-2 py-1">
                            <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${step.color}`} />
                            <span className="text-xs text-muted-foreground flex-1">{step.shortName}</span>
                            <span className="text-xs font-medium">{stats.count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-4">
                    <Clock className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-xs text-muted-foreground">Select a job to see summary</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-card/50 border-white/10">
              <CardHeader><CardTitle className="text-sm">Quick Actions</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start text-sm h-9" onClick={() => setActiveStep(1)} data-testid="button-quick-new-job">
                  <Briefcase className="h-3 w-3 mr-2" />New Job
                </Button>
                <Button variant="outline" className="w-full justify-start text-sm h-9" asChild data-testid="button-quick-pipeline">
                  <Link href="/pipeline-board"><Target className="h-3 w-3 mr-2" />Pipeline Board</Link>
                </Button>
                <Button variant="outline" className="w-full justify-start text-sm h-9" asChild data-testid="button-quick-hr-dashboard">
                  <Link href="/hr-dashboard"><Sparkles className="h-3 w-3 mr-2" />HR Dashboard</Link>
                </Button>
                <Button variant="outline" className="w-full justify-start text-sm h-9" asChild data-testid="button-quick-recruitment-agent">
                  <Link href="/recruitment-agent"><TrendingUp className="h-3 w-3 mr-2" />AI Recruiter</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Dialog open={isEmailOpen} onOpenChange={setIsEmailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Email to {selectedCandidate?.fullName}</DialogTitle>
            <DialogDescription>Compose and send an email to the candidate</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Subject</Label>
              <Input 
                value={emailSubject} 
                onChange={(e) => setEmailSubject(e.target.value)}
                data-testid="input-email-subject"
              />
            </div>
            <div>
              <Label>Message</Label>
              <Textarea 
                value={emailMessage} 
                onChange={(e) => setEmailMessage(e.target.value)}
                rows={6}
                data-testid="input-email-message"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEmailOpen(false)} data-testid="button-cancel-email">Cancel</Button>
            <Button onClick={handleSendEmailSubmit} data-testid="button-send-email">
              <Send className="h-4 w-4 mr-2" />
              Send Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
