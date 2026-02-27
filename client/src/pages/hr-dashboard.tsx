import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { jobsService, candidateService, integrityChecksService, api } from "@/lib/api";
import { useTenantQueryKey } from "@/hooks/useTenant";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link, useLocation } from "wouter";
import { JobCreationChat } from "@/components/job-creation-chat";
import OfferManagement from "@/pages/offer-management";
import EmployeeOnboarding from "@/pages/employee-onboarding";
import { 
  Users, 
  UserPlus, 
  FileCheck, 
  GraduationCap, 
  Briefcase, 
  AlertCircle, 
  CheckCircle2, 
  Search, 
  Filter,
  MoreHorizontal,
  BrainCircuit,
  Brain,
  Sparkles,
  ShieldCheck,
  Laptop,
  TrendingUp,
  Loader2,
  WifiOff,
  UploadCloud,
  FileText,
  Plus,
  Wand2,
  LayoutList,
  Eye,
  Mic,
  Video,
  ArrowRight,
  Mail,
  Download,
  Trash2,
  Send,
  Star,
  Target,
  Clock,
  Award,
  BarChart3,
  MapPin,
  Building2,
  Calendar,
  Grid3X3,
  List,
  FileArchive,
  ExternalLink,
  MessageCircle,
  BookOpen,
  Timer,
  RotateCcw,
  ChevronDown,
  ChevronRight
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { motion } from "framer-motion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

// Format stage names: "offer_pending" → "Offer Pending", "integrity_checks" → "Integrity Checks"
const formatStageName = (stage: string) =>
  stage.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

// Fallback data in case of API error
const MOCK_CANDIDATES = [
  { id: 1, name: "Sarah Jenkins", role: "Senior Project Manager", status: "Interviewing", match: 94, stage: "Screening" },
  { id: 2, name: "David Chen", role: "Financial Analyst", status: "New", match: 88, stage: "Sourcing" },
  { id: 3, name: "Marcus Johnson", role: "Operations Lead", status: "Offer Sent", match: 97, stage: "Onboarding" },
  { id: 4, name: "Emily Davis", role: "UX Designer", status: "Rejected", match: 65, stage: "Archived" },
];

export default function HRDashboard() {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTabState] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('tab') || "jobs";
  });
  const setActiveTab = (tab: string) => {
    setActiveTabState(tab);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    window.history.replaceState({}, '', url.toString());
  };
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isCreateJobOpen, setIsCreateJobOpen] = useState(false);
  const [showArchivedJobs, setShowArchivedJobs] = useState(false);
  const [isEmailOpen, setIsEmailOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
  const [selectedRiskCandidate, setSelectedRiskCandidate] = useState<any>(null);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const candidatesKey = useTenantQueryKey(['candidates']);
  const jobsKey = useTenantQueryKey(['jobs']);
  const jobSpecsKey = useTenantQueryKey(['documents', 'job_spec']);

  const [isGenerating, setIsGenerating] = useState(false);
  const [jobSpecViewMode, setJobSpecViewMode] = useState<"grid" | "list">("grid");
  const [selectedJobSpec, setSelectedJobSpec] = useState<JobSpecDocument | null>(null);
  const [jobTitle, setJobTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [jobDescription, setJobDescription] = useState("");

  const [isUploading, setIsUploading] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [isJobDetailOpen, setIsJobDetailOpen] = useState(false);
  const [pipelineStageFilter, setPipelineStageFilter] = useState<string>("all");

  const createJobMutation = useMutation({
    mutationFn: jobsService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jobsKey });
    },
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

  const updateCandidateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => candidateService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: candidatesKey });
      toast.success("Candidate updated successfully");
    },
    onError: () => {
      toast.error("Failed to update candidate");
    }
  });

  const [verifyingCheckId, setVerifyingCheckId] = useState<string | null>(null);

  const verifyIntegrityCheck = async (checkId: string, candidateId: string) => {
    setVerifyingCheckId(checkId);
    try {
      // Mark the check as Completed/Clear
      await integrityChecksService.update(checkId, { status: "Completed" as any, result: "Clear" as any });
      // Auto-advance pipeline if all checks are done
      await api.post(`/pipeline/candidates/${candidateId}/check-integrity`);
      queryClient.invalidateQueries({ queryKey: integrityChecksKey });
      queryClient.invalidateQueries({ queryKey: candidatesKey });
      toast.success("Verification marked as clear");
    } catch {
      toast.error("Failed to verify check");
    } finally {
      setVerifyingCheckId(null);
    }
  };

  const PIPELINE_STAGES = [
    { key: "sourcing", name: "Sourcing" },
    { key: "screening", name: "Screening" },
    { key: "shortlisted", name: "Shortlisted" },
    { key: "interviewing", name: "Interviewing" },
    { key: "offer_pending", name: "Offer Pending" },
    { key: "offer_declined", name: "Offer Declined" },
    { key: "integrity_checks", name: "Integrity Checks" },
    { key: "integrity_passed", name: "Checks Passed" },
    { key: "onboarding", name: "Onboarding" },
    { key: "hired", name: "Hired" },
  ];

  const getStageIndex = (stage: string): number => {
    const normalizedStage = (stage || '').toLowerCase().replace(/\s+/g, '_');
    const index = PIPELINE_STAGES.findIndex(s => 
      s.key.toLowerCase() === normalizedStage || s.name.toLowerCase() === normalizedStage.replace(/_/g, ' ')
    );
    return index === -1 ? 0 : index;
  };

  const getNextStage = (currentStage: string): string | null => {
    const stageIndex = getStageIndex(currentStage);
    if (stageIndex < 0 || stageIndex >= PIPELINE_STAGES.length - 1) return null;
    return PIPELINE_STAGES[stageIndex + 1].key;
  };

  const getStageName = (stage: string): string => {
    const normalizedStage = (stage || '').toLowerCase().replace(/\s+/g, '_');
    const found = PIPELINE_STAGES.find(s => 
      s.key.toLowerCase() === normalizedStage || s.name.toLowerCase() === normalizedStage.replace(/_/g, ' ')
    );
    return found?.name || stage || 'Sourcing';
  };

  const handleMoveToNextStage = async (candidate: any) => {
    if (!candidate?.id) {
      toast.error("Invalid candidate");
      return;
    }

    const currentStage = (candidate.stage || candidate.status || "sourcing").trim();
    const nextStage = getNextStage(currentStage);

    if (!nextStage) {
      toast.info(`Candidate is already at final stage: ${getStageName(currentStage)}`);
      return;
    }

    try {
      const response = await api.post(`/pipeline/candidates/${candidate.id}/transition`, {
        toStage: nextStage
      });
      
      if (response.data.success) {
        queryClient.invalidateQueries({ queryKey: candidatesKey });
        toast.success(`${candidate.fullName || candidate.name} advanced to ${getStageName(nextStage)}`, {
          description: response.data.triggeredActions?.length 
            ? `Triggered: ${response.data.triggeredActions.join(", ")}`
            : undefined
        });
      } else {
        const blockers = response.data.blockers || [response.data.error || "Cannot advance"];
        toast.error("Cannot advance stage", {
          description: blockers[0]
        });
      }
    } catch (error: any) {
      const message = error.response?.data?.error || error.response?.data?.blockers?.[0] || "Failed to advance stage";
      toast.error("Cannot advance stage", { description: message });
    }
  };

  const handleSendEmail = (candidate: any) => {
    if (!candidate?.id) {
      toast.error("Invalid candidate");
      return;
    }
    setSelectedCandidate(candidate);
    setEmailSubject(`Regarding Your Application - ${candidate.role || 'Position'}`);
    setEmailMessage(`Dear ${candidate.fullName || candidate.name},\n\nThank you for your interest in the ${candidate.role || 'position'} role at MTN - Human Capital.\n\nBest regards,\nHR Team`);
    setIsEmailOpen(true);
  };

  const handleDownloadCV = (candidate: any) => {
    if (candidate?.cvUrl) {
      window.open(candidate.cvUrl, '_blank');
      toast.success("Opening CV...");
    } else {
      toast.error("CV not available for this candidate");
    }
  };

  const handleSendEmailSubmit = () => {
    toast.success(`Email sent to ${selectedCandidate?.email || selectedCandidate?.fullName || 'candidate'}`);
    setIsEmailOpen(false);
    setSelectedCandidate(null);
    setEmailSubject("");
    setEmailMessage("");
  };

  const handleGenerateJD = async () => {
    if (!jobTitle) {
        toast.error("Please enter a Job Title first.");
        return;
    }
    
    setIsGenerating(true);
    
    // Simulate AI Generation Delay
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

  const handlePublishRequisition = async () => {
    if (!jobTitle) {
        toast.error("Please enter a Job Title.");
        return;
    }

    try {
      await createJobMutation.mutateAsync({
        title: jobTitle,
        department: department || "General",
        description: jobDescription,
        status: "Active",
        salaryMin: 850000,
        salaryMax: 1200000,
        location: "Johannesburg, Gauteng"
      });
      
      setIsCreateJobOpen(false);
      setJobTitle("");
      setDepartment("");
      setJobDescription("");
      toast.success("Requisition created successfully!");
    } catch (error) {
      console.error("Failed to create job:", error);
      toast.error("Failed to create requisition. Please try again.");
    }
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
          role: "Backend Developer",
          source: "Uploaded",
          status: "New",
          stage: "Screening",
          match: Math.floor(Math.random() * (98 - 70 + 1)) + 70,
        });
      }

      setIsUploading(false);
      setIsUploadOpen(false);
      toast.success(`Processed ${files.length} CVs successfully!`);
    } catch (error) {
      console.error("Failed to upload candidates:", error);
      setIsUploading(false);
      toast.error("Failed to process CVs. Please try again.");
    }
  };

  // Fetch real data from backend
  const {
    data: jobs,
    isLoading: loadingJobs,
    isError: jobsError
  } = useQuery({
    queryKey: jobsKey,
    queryFn: async () => {
      try {
        return await jobsService.getAll();
      } catch (e) {
        console.error("Failed to fetch jobs:", e);
        throw e;
      }
    },
    retry: 1,
  });

  const archivedJobsKey = useTenantQueryKey("archivedJobs");
  const { 
    data: archivedJobs = [], 
    isLoading: loadingArchivedJobs
  } = useQuery({
    queryKey: archivedJobsKey,
    queryFn: async () => {
      try {
        return await jobsService.getArchived();
      } catch (e) {
        console.error("Failed to fetch archived jobs:", e);
        return [];
      }
    },
    enabled: showArchivedJobs,
    retry: 1,
    placeholderData: [] 
  });

  const { 
    data: candidates, 
    isLoading: loadingCandidates,
    isError: candidatesError
  } = useQuery({
    queryKey: candidatesKey,
    queryFn: async () => {
      try {
        return await candidateService.getAll();
      } catch (e) {
        console.error("Failed to fetch candidates:", e);
        throw e;
      }
    },
    retry: 1,
  });

  // Fetch integrity checks for all candidates
  const integrityChecksKey = useTenantQueryKey(['integrity-checks']);
  const { data: allIntegrityChecks = [] } = useQuery({
    queryKey: integrityChecksKey,
    queryFn: async () => {
      try {
        const res = await fetch('/api/integrity-checks');
        if (!res.ok) throw new Error('Failed to fetch integrity checks');
        return res.json();
      } catch (e) {
        console.error("Failed to fetch integrity checks:", e);
        return [];
      }
    },
    retry: 1,
  });

  // Fetch social screenings for all candidates
  const socialScreeningsKey = useTenantQueryKey(['social-screenings']);
  const { data: allSocialScreenings = [] } = useQuery({
    queryKey: socialScreeningsKey,
    queryFn: async () => {
      try {
        const res = await fetch('/api/social-screening/findings');
        if (!res.ok) throw new Error('Failed to fetch social screenings');
        return res.json();
      } catch (e) {
        console.error("Failed to fetch social screenings:", e);
        return [];
      }
    },
    retry: 1,
  });

  // Get risk data for a specific candidate
  const getCandidateRiskData = (candidateId: string) => {
    const integrityCheck = allIntegrityChecks.find((check: any) => check.candidateId === candidateId && check.riskScore != null);
    const socialScreening = allSocialScreenings.find((screening: any) => screening.candidateId === candidateId);
    
    let overallRiskScore = 0;
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    let hasData = false;

    if (integrityCheck) {
      hasData = true;
      overallRiskScore = integrityCheck.riskScore || 0;
    }

    if (socialScreening?.results?.aggregatedResults) {
      hasData = true;
      const socialScore = 100 - (socialScreening.results.aggregatedResults.overallScore || 50);
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

  interface JobSpecDocument {
    id: string;
    originalFilename: string;
    status: string;
    createdAt: string;
    fileSize: number;
    rawText?: string;
    extractedData?: {
      title?: string;
      jobTitle?: string;
      company?: string;
      department?: string;
      location?: string;
      employmentType?: string;
      salaryRange?: string;
      salary?: string;
      experienceRequired?: string;
      requiredSkills?: string[];
      qualifications?: string[];
      benefits?: string[];
      responsibilities?: string[];
      description?: string;
    };
    linkedJobId?: string;
  }

  const { 
    data: jobSpecDocuments = [], 
    isLoading: loadingJobSpecs 
  } = useQuery<JobSpecDocument[]>({
    queryKey: jobSpecsKey,
    queryFn: async () => {
      const res = await fetch("/api/documents/type/job_spec");
      if (!res.ok) throw new Error("Failed to fetch job specs");
      return res.json();
    },
    retry: 1,
  });

  // KPI & Performance Data Queries
  const reviewCyclesKey = useTenantQueryKey(['reviewCycles']);
  const { data: reviewCycles = [] } = useQuery({
    queryKey: reviewCyclesKey,
    queryFn: async () => {
      const res = await fetch("/api/review-cycles");
      if (!res.ok) return [];
      return res.json();
    },
    retry: 1,
  });

  const kpiAssignmentsKey = useTenantQueryKey(['kpiAssignments']);
  const { data: kpiAssignments = [] } = useQuery({
    queryKey: kpiAssignmentsKey,
    queryFn: async () => {
      const res = await fetch("/api/kpi-assignments");
      if (!res.ok) return [];
      return res.json();
    },
    retry: 1,
  });

  const reviewSubmissionsKey = useTenantQueryKey(['reviewSubmissions']);
  const { data: reviewSubmissions = [] } = useQuery({
    queryKey: reviewSubmissionsKey,
    queryFn: async () => {
      const res = await fetch("/api/review-submissions");
      if (!res.ok) return [];
      return res.json();
    },
    retry: 1,
  });

  const employeesKey = useTenantQueryKey(['employees']);
  const { data: employees = [] } = useQuery({
    queryKey: employeesKey,
    queryFn: async () => {
      const res = await fetch("/api/workforce/employees");
      if (!res.ok) return [];
      return res.json();
    },
    retry: 1,
  });

  const kpiTemplatesKey = useTenantQueryKey(['kpiTemplates']);
  const { data: kpiTemplates = [] } = useQuery({
    queryKey: kpiTemplatesKey,
    queryFn: async () => {
      const res = await fetch("/api/kpi-templates");
      if (!res.ok) return [];
      return res.json();
    },
    retry: 1,
  });

  // Helper function to get employee name by ID
  const getEmployeeName = (employeeId: string) => {
    const employee = employees.find((e: any) => e.id === employeeId);
    return employee?.fullName || 'Unknown Employee';
  };

  // Helper function to get template info by ID
  const getTemplateInfo = (templateId: string) => {
    return kpiTemplates.find((t: any) => t.id === templateId);
  };

  // Calculate KPI statistics
  const activeReviewCycles = reviewCycles.filter((c: any) => c.status === 'active');
  const pendingAssignments = kpiAssignments.filter((a: any) => a.status === 'pending' || a.status === 'in_progress');
  const completedAssignments = kpiAssignments.filter((a: any) => a.status === 'completed');
  const pendingSubmissions = reviewSubmissions.filter((s: any) => s.selfAssessmentStatus === 'pending' || s.managerReviewStatus === 'pending');
  const completedSubmissions = reviewSubmissions.filter((s: any) => s.status === 'completed');
  
  // Calculate average score from completed submissions
  const avgScore = completedSubmissions.length > 0 
    ? (completedSubmissions.reduce((sum: number, s: any) => sum + (s.finalScore || 0), 0) / completedSubmissions.length).toFixed(1)
    : '0.0';
  
  // Calculate completion rate
  const totalAssignments = kpiAssignments.length;
  const completionRate = totalAssignments > 0 
    ? Math.round((completedAssignments.length / totalAssignments) * 100)
    : 0;

  // Social Screening Stats Query
  const socialStatsKey = useTenantQueryKey(['socialScreeningStats']);
  const { data: socialStats } = useQuery({
    queryKey: socialStatsKey,
    queryFn: async () => {
      const res = await fetch("/api/social-screening/stats");
      if (!res.ok) return null;
      return res.json();
    },
    retry: 1,
  });

  // Social Screening Pending Reviews Query
  const socialPendingKey = useTenantQueryKey(['socialScreeningPending']);
  const { data: socialPendingReviews = [] } = useQuery({
    queryKey: socialPendingKey,
    queryFn: async () => {
      const res = await fetch("/api/social-screening/findings/pending-review");
      if (!res.ok) return [];
      return res.json();
    },
    retry: 1,
  });

  // LMS Courses Query
  const lmsCoursesKey = useTenantQueryKey(['lmsCourses']);
  const { data: lmsCourses = [] } = useQuery({
    queryKey: lmsCoursesKey,
    queryFn: async () => {
      const res = await fetch("/api/lms/courses");
      if (!res.ok) return [];
      return res.json();
    },
    retry: 1,
  });

  const displayCandidates = candidatesError ? MOCK_CANDIDATES : (Array.isArray(candidates) ? candidates : []);
  const displayJobs = jobsError ? [] : (Array.isArray(jobs) ? jobs : []);
  const jobCount = displayJobs.length || 12;


  return (
    <div className="min-h-screen bg-background text-foreground">
      
      <main className="pt-24 pb-12 px-6 container mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">HR Command Center</h1>
            <p className="text-foreground font-semibold">AI-Driven Human Capital Management</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/workflow-showcase">
              <Button className="bg-[#FFCB00] hover:bg-[#E6B800] text-black font-semibold" data-testid="button-start-workflow">
                <ArrowRight className="w-4 h-4 mr-2" /> Start Workflow
              </Button>
            </Link>
            <Badge variant="outline" className="bg-muted dark:bg-muted text-primary border-border px-3 py-1">
              <BrainCircuit className="w-3 h-3 mr-2" /> AI Agents Active
            </Badge>
          </div>
        </div>

        {/* Connection Error Alert */}
        {(jobsError || candidatesError) && (
          <Alert variant="destructive" className="mb-6 border-red-500/20 bg-red-500/10 text-red-200">
            <WifiOff className="h-4 w-4" />
            <AlertTitle>Backend Connection Issue</AlertTitle>
            <AlertDescription>
              Unable to connect to the Backend. Showing cached/mock data for demonstration purposes.
            </AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} className="space-y-6" onValueChange={setActiveTab}>
          <div className="flex items-center gap-3 flex-wrap">
            {/* Main Tabs */}
            <TabsList className="grid grid-cols-2 md:grid-cols-5 lg:w-[600px] bg-white dark:bg-background border-2 border-border">
              <TabsTrigger value="jobs" className="data-[state=active]:bg-muted data-[state=active]:text-white dark:data-[state=active]:border dark:data-[state=active]:border-[#FFCB00] dark:data-[state=active]:text-[#FFCB00] dark:data-[state=active]:bg-[#FFCB00]/10 font-semibold">Jobs</TabsTrigger>
              <TabsTrigger value="recruitment" className="data-[state=active]:bg-muted data-[state=active]:text-white dark:data-[state=active]:border dark:data-[state=active]:border-[#FFCB00] dark:data-[state=active]:text-[#FFCB00] dark:data-[state=active]:bg-[#FFCB00]/10 font-semibold">Recruitment</TabsTrigger>
              <TabsTrigger value="offer" className="data-[state=active]:bg-muted data-[state=active]:text-white dark:data-[state=active]:border dark:data-[state=active]:border-[#FFCB00] dark:data-[state=active]:text-[#FFCB00] dark:data-[state=active]:bg-[#FFCB00]/10 font-semibold">Offer</TabsTrigger>
              <TabsTrigger value="integrity" className="data-[state=active]:bg-muted data-[state=active]:text-white dark:data-[state=active]:border dark:data-[state=active]:border-[#FFCB00] dark:data-[state=active]:text-[#FFCB00] dark:data-[state=active]:bg-[#FFCB00]/10 font-semibold">Integrity</TabsTrigger>
              <TabsTrigger value="onboarding" className="data-[state=active]:bg-muted data-[state=active]:text-white dark:data-[state=active]:border dark:data-[state=active]:border-[#FFCB00] dark:data-[state=active]:text-[#FFCB00] dark:data-[state=active]:bg-[#FFCB00]/10 font-semibold">Onboarding</TabsTrigger>
            </TabsList>
          </div>

          {/* RECRUITMENT TAB */}
          <TabsContent value="recruitment" className="space-y-6">
            
            {/* Quick Action Banners */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-lg bg-muted dark:bg-muted border-2 border-border p-6 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold flex items-center gap-2 text-foreground">
                    <Sparkles className="w-5 h-5 text-primary" />
                    Need to find candidates fast?
                  </h3>
                  <p className="text-foreground font-semibold text-sm mt-1">
                    Launch the AI Recruitment Agent to source, screen, and rank candidates.
                  </p>
                </div>
                <Link href="/recruitment-agent">
                  <Button className="bg-[#FFCB00] hover:bg-[#E6B800] text-black font-semibold">
                    Launch AI Recruiter
                  </Button>
                </Link>
              </div>

              <div className="rounded-lg bg-[#FFCB00]/5 dark:bg-[#FFCB00]/10 border-2 border-[#FFCB00]/20 dark:border-[#FFCB00]/30 p-6 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold flex items-center gap-2 text-foreground">
                    <LayoutList className="w-5 h-5 text-[#FFCB00]" />
                    Track candidate progress
                  </h3>
                  <p className="text-foreground font-semibold text-sm mt-1">
                    Monitor document status and pipeline stages for shortlisted candidates.
                  </p>
                </div>
                <Link href="/candidate-pipeline">
                  <Button variant="outline" className="border-[#FFCB00]/30 hover:bg-[#FFCB00]/10 shadow-lg shadow-[#FFCB00]/10">
                    View Pipeline
                  </Button>
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-card border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-foreground font-bold text-sm">Open Roles</CardTitle>
                  <div className="text-2xl font-bold">
                    {loadingJobs ? <Loader2 className="w-6 h-6 animate-spin" /> : jobCount}
                  </div>
                </CardHeader>
              </Card>
              <Card className="bg-card border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-foreground font-bold text-sm">Candidates in Pipeline</CardTitle>
                  <div className="text-2xl font-bold">
                    {loadingCandidates ? <Loader2 className="w-6 h-6 animate-spin" /> : displayCandidates.length}
                  </div>
                </CardHeader>
              </Card>
              <Card className="bg-card border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-foreground font-bold text-sm">Time to Hire (Avg)</CardTitle>
                  <div className="text-2xl font-bold">18 Days</div>
                </CardHeader>
              </Card>
            </div>

            {/* JOBS/ROLES LIST */}
            <Card className="border-border bg-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-foreground font-bold">Open Roles</CardTitle>
                    <CardDescription className="text-gray-700 dark:text-gray-300 font-medium">
                      {loadingJobs ? "Loading positions..." : "Active job requisitions and hiring pipelines"}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      className="gap-2 border-border hover:bg-white/5"
                      onClick={() => setShowArchivedJobs(!showArchivedJobs)}
                      data-testid="toggle-archived-jobs"
                    >
                      <FileArchive className="h-4 w-4" />
                      {showArchivedJobs ? 'Hide Archived' : 'Show Archived'}
                    </Button>
                    <Dialog open={isCreateJobOpen} onOpenChange={setIsCreateJobOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="gap-2 border-border bg-muted dark:bg-muted hover:bg-muted dark:bg-muted">
                          <Plus className="h-4 w-4" />
                          New Role
                        </Button>
                      </DialogTrigger>
                    </Dialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border border-border overflow-hidden">
                  <div className="bg-white/5 px-4 py-3 grid grid-cols-12 text-sm text-foreground font-semibold">
                    <div className="col-span-4">Job Title</div>
                    <div className="col-span-2">Department</div>
                    <div className="col-span-2">Candidates</div>
                    <div className="col-span-2">Status</div>
                    <div className="col-span-2 text-right">Actions</div>
                  </div>
                  <ScrollArea className="h-[300px]">
                    {loadingJobs ? (
                      <div className="flex flex-col items-center justify-center h-32 gap-2 text-foreground font-semibold">
                        <Loader2 className="w-6 h-6 animate-spin" />
                        <p>Loading job requisitions...</p>
                      </div>
                    ) : displayJobs.length > 0 ? (
                      displayJobs.map((job: any) => {
                        const candidateCount = displayCandidates.filter((c: any) => c.jobId === job.id).length;
                        return (
                          <div key={job.id} className="px-4 py-3 grid grid-cols-12 items-center border-t border-border hover:bg-white/5 transition-colors">
                            <div className="col-span-4">
                              <div className="font-medium">{job.title}</div>
                              <div className="text-xs text-foreground font-semibold mt-0.5">
                                {job.location || "Johannesburg, Gauteng"}
                              </div>
                            </div>
                            <div className="col-span-2 text-sm text-foreground font-semibold">{job.department}</div>
                            <div className="col-span-2">
                              <Badge variant="outline" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
                                {candidateCount} {candidateCount === 1 ? 'Candidate' : 'Candidates'}
                              </Badge>
                            </div>
                            <div className="col-span-2">
                              <Badge className={`${job.status === 'Active' ? 'bg-green-500/20 text-green-600 dark:text-green-400' : 'bg-gray-500/20 text-gray-400'} border-0`}>
                                {job.status}
                              </Badge>
                            </div>
                            <div className="col-span-2 text-right flex justify-end gap-2">
                              <Link href={`/recruitment-agent?jobId=${job.id}`}>
                                <Button variant="outline" size="sm" className="gap-2 border-[#FFCB00]/30 bg-[#FFCB00]/10 hover:bg-[#FFCB00]/20 text-[#FFCB00]" data-testid={`button-start-search-${job.id}`}>
                                  <Search className="h-4 w-4" />
                                  Start Search
                                </Button>
                              </Link>
                              <Link href={`/recruitment-agent?jobId=${job.id}`}>
                                <Button variant="outline" size="sm" className="gap-2 border-border hover:bg-white/5" data-testid={`button-view-candidates-${job.id}`}>
                                  <Eye className="h-4 w-4" />
                                  View
                                </Button>
                              </Link>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" data-testid={`button-job-actions-${job.id}`}>
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuLabel>Job Actions</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    onClick={async () => {
                                      try {
                                        await api.post(`/jobs/${job.id}/archive`, { reason: 'Archived from Jobs list' });
                                        queryClient.invalidateQueries({ queryKey: jobsKey });
                                        toast.success("Job archived successfully");
                                      } catch (error) {
                                        toast.error("Failed to archive job");
                                      }
                                    }}
                                    className="cursor-pointer"
                                    data-testid={`button-archive-job-${job.id}`}
                                  >
                                    <FileArchive className="h-4 w-4 mr-2" />
                                    Archive Job
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    onClick={async () => {
                                      if (confirm("Are you sure you want to permanently delete this job? This cannot be undone.")) {
                                        try {
                                          await api.delete(`/jobs/${job.id}`);
                                          queryClient.invalidateQueries({ queryKey: jobsKey });
                                          toast.success("Job deleted successfully");
                                        } catch (error) {
                                          toast.error("Failed to delete job");
                                        }
                                      }
                                    }}
                                    className="cursor-pointer text-red-600 dark:text-red-400 focus:text-red-600 dark:text-red-400"
                                    data-testid={`button-delete-job-${job.id}`}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete Job
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="flex flex-col items-center justify-center h-32 gap-2 text-foreground font-semibold">
                        <Briefcase className="h-8 w-8 opacity-50" />
                        <p>No open roles yet</p>
                        <Button 
                          variant="link" 
                          className="text-primary text-xs"
                          onClick={() => setIsCreateJobOpen(true)}
                        >
                          Create your first role
                        </Button>
                      </div>
                    )}
                  </ScrollArea>
                </div>
              </CardContent>
            </Card>

            {/* ARCHIVED JOBS */}
            {showArchivedJobs && (
              <Card className="border-border bg-card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-foreground font-bold flex items-center gap-2">
                        <FileArchive className="h-5 w-5 text-gray-400" />
                        Archived Roles
                      </CardTitle>
                      <CardDescription className="text-gray-700 dark:text-gray-300 font-medium">
                        {loadingArchivedJobs ? "Loading archived positions..." : `${archivedJobs.length} archived job${archivedJobs.length !== 1 ? 's' : ''}`}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border border-border overflow-hidden">
                    <div className="bg-white/5 px-4 py-3 grid grid-cols-12 text-sm text-foreground font-semibold">
                      <div className="col-span-4">Job Title</div>
                      <div className="col-span-3">Department</div>
                      <div className="col-span-3">Archived On</div>
                      <div className="col-span-2 text-right">Actions</div>
                    </div>
                    <ScrollArea className="h-[200px]">
                      {loadingArchivedJobs ? (
                        <div className="flex flex-col items-center justify-center h-32 gap-2 text-foreground font-semibold">
                          <Loader2 className="w-6 h-6 animate-spin" />
                          <p>Loading archived jobs...</p>
                        </div>
                      ) : archivedJobs.length > 0 ? (
                        archivedJobs.map((job: any) => (
                          <div key={job.id} className="px-4 py-3 grid grid-cols-12 items-center border-t border-border hover:bg-white/5 transition-colors">
                            <div className="col-span-4">
                              <div className="font-medium text-gray-400">{job.title}</div>
                              <div className="text-xs text-foreground font-semibold mt-0.5">
                                {job.location || "No location"}
                              </div>
                            </div>
                            <div className="col-span-3 text-sm text-foreground font-semibold">{job.department || 'General'}</div>
                            <div className="col-span-3 text-sm text-foreground font-semibold">
                              {job.archivedAt ? new Date(job.archivedAt).toLocaleDateString() : 'Unknown'}
                            </div>
                            <div className="col-span-2 text-right flex justify-end gap-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="gap-2 border-green-500/20 hover:bg-green-500/10 text-green-600 dark:text-green-400"
                                onClick={async () => {
                                  try {
                                    await jobsService.restore(job.id);
                                    queryClient.invalidateQueries({ queryKey: jobsKey });
                                    queryClient.invalidateQueries({ queryKey: archivedJobsKey });
                                    toast.success("Job restored successfully");
                                  } catch (error) {
                                    toast.error("Failed to restore job");
                                  }
                                }}
                                data-testid={`button-restore-job-${job.id}`}
                              >
                                <RotateCcw className="h-4 w-4" />
                                Restore
                              </Button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="flex flex-col items-center justify-center h-32 gap-2 text-foreground font-semibold">
                          <FileArchive className="h-8 w-8 opacity-50" />
                          <p>No archived jobs</p>
                        </div>
                      )}
                    </ScrollArea>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* SHORTLISTED CANDIDATES */}
            <Card className="border-border bg-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-foreground font-bold flex items-center gap-2">
                      <Star className="h-5 w-5 text-yellow-600 dark:text-yellow-400 fill-yellow-400" />
                      Shortlisted Candidates
                    </CardTitle>
                    <CardDescription className="text-gray-700 dark:text-gray-300 font-medium">
                      {loadingCandidates ? "Loading..." : "Top talent ready for interviews and offers"}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Link href="/shortlisted-candidates">
                      <Button variant="outline" className="gap-2 border-border hover:bg-white/5">
                        <Star className="h-4 w-4" />
                        View All Shortlisted
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border border-border overflow-hidden">
                  <ScrollArea className="h-[200px]">
                    {loadingCandidates ? (
                      <div className="flex flex-col items-center justify-center h-32 gap-2 text-foreground font-semibold">
                        <Loader2 className="w-6 h-6 animate-spin" />
                        <p>Loading shortlisted candidates...</p>
                      </div>
                    ) : (
                      displayCandidates.filter((c: any) => c.stage === "Shortlisted").length > 0 ? (
                        <div className="divide-y divide-white/5">
                          {displayCandidates
                            .filter((c: any) => c.stage === "Shortlisted")
                            .slice(0, 5)
                            .map((candidate: any) => (
                              <div key={candidate.id} className="px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors">
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-8 w-8 border border-border dark:border-white/20">
                                    {candidate.photoUrl && (
                                      <AvatarImage src={candidate.photoUrl} alt={candidate.fullName} />
                                    )}
                                    <AvatarFallback className="bg-[#0A0A0A] text-white text-xs font-semibold">
                                      {candidate.fullName?.split(' ')?.map((n: string) => n[0])?.join('')?.toUpperCase() || '?'}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="font-medium text-sm">{candidate.fullName}</p>
                                    <p className="text-xs text-foreground font-semibold">{candidate.role || 'No role specified'}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {candidate.match !== null && candidate.match !== undefined && (
                                    <Badge className="bg-yellow-400/10 text-yellow-600 dark:text-yellow-400 border-0 text-xs">
                                      {candidate.match}% Match
                                    </Badge>
                                  )}
                                  <Star className="h-4 w-4 text-yellow-600 dark:text-yellow-400 fill-yellow-400" />
                                </div>
                              </div>
                            ))}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-32 gap-2 text-foreground font-semibold">
                          <Star className="h-8 w-8 opacity-50" />
                          <p className="text-sm">No shortlisted candidates yet</p>
                          <Link href="/candidates-list">
                            <Button variant="link" className="text-primary text-xs">
                              Browse candidates to shortlist
                            </Button>
                          </Link>
                        </div>
                      )
                    )}
                  </ScrollArea>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-foreground font-bold">Candidate Pipeline</CardTitle>
                    <CardDescription className="text-gray-700 dark:text-gray-300 font-medium">
                      {loadingCandidates ? "Fetching data from backend..." : "AI-ranked candidates matched to hiring needs"}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-foreground font-semibold" />
                      <Input placeholder="Search candidates..." className="pl-9 w-[200px] bg-background/50 border-border" />
                    </div>
                    
                    <Link href="/candidates-list">
                      <Button variant="outline" className="gap-2 border-border hover:bg-white/5">
                        <LayoutList className="h-4 w-4" />
                        View Details
                      </Button>
                    </Link>

                    <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="gap-2 border-border bg-muted dark:bg-muted hover:bg-muted dark:bg-muted">
                          <UploadCloud className="h-4 w-4" />
                          Upload CVs
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-card border-border sm:max-w-[500px]">
                        <DialogHeader>
                          <DialogTitle>Upload Candidate Profiles</DialogTitle>
                          <DialogDescription>
                            Drag and drop CVs here. Our AI will extract skills, match to open roles, and rank them instantly.
                          </DialogDescription>
                        </DialogHeader>
                        
                        <div 
                            className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer bg-white/5 relative"
                            onClick={handleFileUploadClick}
                        >
                          <input 
                            type="file" 
                            ref={fileInputRef}
                            className="hidden" 
                            multiple 
                            accept=".pdf,.docx,.txt"
                            onChange={handleFileUpload}
                          />
                          <div className="flex flex-col items-center gap-2">
                            {isUploading ? (
                                <div className="flex flex-col items-center animate-pulse">
                                    <Loader2 className="h-8 w-8 text-primary animate-spin mb-2" />
                                    <p className="text-primary font-medium">AI Analyzing Resumes...</p>
                                    <p className="text-xs text-foreground font-semibold">Extracting skills & calculating match scores</p>
                                </div>
                            ) : (
                                <>
                                    <div className="p-3 rounded-full bg-muted dark:bg-muted">
                                      <UploadCloud className="h-8 w-8 text-primary" />
                                    </div>
                                    <h3 className="font-medium mt-2">Drop files here or click to upload</h3>
                                    <p className="text-sm text-foreground font-semibold">Supports PDF, DOCX, TXT (Max 10MB)</p>
                                </>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2 mt-2">
                           <Label>Or manually add a candidate link</Label>
                           <div className="flex gap-2">
                             <Input placeholder="https://linkedin.com/in/..." className="bg-background/50 border-border" />
                             <Button size="sm" variant="secondary"><Plus className="w-4 h-4" /></Button>
                           </div>
                        </div>

                        <DialogFooter>
                          <Button variant="outline" onClick={() => setIsUploadOpen(false)}>Cancel</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

                    {/* Email Dialog */}
                    <Dialog open={isEmailOpen} onOpenChange={setIsEmailOpen}>
                      <DialogContent className="sm:max-w-[600px]">
                        <DialogHeader>
                          <DialogTitle>Send Email to {selectedCandidate?.fullName || 'Candidate'}</DialogTitle>
                          <DialogDescription>
                            Compose and send an email to {selectedCandidate?.email || 'the candidate'}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="email-to">To</Label>
                            <Input 
                              id="email-to" 
                              value={selectedCandidate?.email || 'No email on file'} 
                              disabled 
                              className="bg-background/50 border-border"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="email-subject">Subject</Label>
                            <Input 
                              id="email-subject" 
                              value={emailSubject}
                              onChange={(e) => setEmailSubject(e.target.value)}
                              placeholder="Email subject..."
                              className="bg-background/50 border-border"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="email-message">Message</Label>
                            <Textarea 
                              id="email-message"
                              value={emailMessage}
                              onChange={(e) => setEmailMessage(e.target.value)}
                              placeholder="Write your message here..."
                              rows={8}
                              className="bg-background/50 border-border"
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setIsEmailOpen(false)}>Cancel</Button>
                          <Button onClick={handleSendEmailSubmit}>
                            <Send className="mr-2 h-4 w-4" />
                            Send Email
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant={pipelineStageFilter !== "all" ? "default" : "outline"} size="icon">
                          <Filter className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuLabel>Filter by Stage</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className={`cursor-pointer ${pipelineStageFilter === "all" ? "font-bold" : ""}`}
                          onClick={() => setPipelineStageFilter("all")}
                        >
                          All Stages
                        </DropdownMenuItem>
                        {(() => {
                          const stages = [...new Set(displayCandidates.map((c: any) => c.stage || "New"))];
                          return stages.map((stage: string) => (
                            <DropdownMenuItem
                              key={stage}
                              className={`cursor-pointer ${pipelineStageFilter === stage ? "font-bold" : ""}`}
                              onClick={() => setPipelineStageFilter(pipelineStageFilter === stage ? "all" : stage)}
                            >
                              {formatStageName(stage)} ({displayCandidates.filter((c: any) => (c.stage || "New") === stage).length})
                            </DropdownMenuItem>
                          ));
                        })()}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {pipelineStageFilter !== "all" && (
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm text-muted-foreground">Filtering:</span>
                    <Badge variant="secondary" className="gap-1">
                      {formatStageName(pipelineStageFilter)}
                      <button onClick={() => setPipelineStageFilter("all")} className="ml-1 hover:text-destructive">&times;</button>
                    </Badge>
                  </div>
                )}
                <div className="rounded-md border border-border overflow-hidden">
                  <div className="bg-white/5 px-4 py-3 grid grid-cols-12 text-sm text-foreground font-semibold">
                    <div className="col-span-3">Candidate</div>
                    <div className="col-span-3">Role Applied</div>
                    <div className="col-span-2">AI Match Score</div>
                    <div className="col-span-2">Stage</div>
                    <div className="col-span-2 text-right">Actions</div>
                  </div>
                  <ScrollArea className="h-[300px]">
                    {loadingCandidates ? (
                       <div className="flex flex-col items-center justify-center h-32 gap-2 text-foreground font-semibold">
                         <Loader2 className="w-6 h-6 animate-spin" />
                         <p>Syncing with DigitalOcean Backend...</p>
                       </div>
                    ) : displayCandidates.filter((c: any) => pipelineStageFilter === "all" || (c.stage || "New") === pipelineStageFilter).length === 0 ? (
                       <div className="flex flex-col items-center justify-center h-32 gap-2 text-muted-foreground">
                         <Filter className="w-6 h-6 opacity-50" />
                         <p>No candidates at "{formatStageName(pipelineStageFilter)}" stage</p>
                         <Button variant="link" size="sm" onClick={() => setPipelineStageFilter("all")}>Clear filter</Button>
                       </div>
                    ) : (
                      // Use explicit array mapping with stage filter
                      displayCandidates.filter((c: any) => pipelineStageFilter === "all" || (c.stage || "New") === pipelineStageFilter).map((candidate: any) => (
                        <div key={candidate.id || Math.random()} className="px-4 py-3 grid grid-cols-12 items-center border-t border-border hover:bg-white/5 transition-colors">
                          <div className="col-span-3 font-medium">{candidate.fullName || candidate.name || "Unknown Candidate"}</div>
                          <div className="col-span-3 text-sm text-foreground font-semibold">{candidate.role || "General Application"}</div>
                          <div className="col-span-2">
                            <Badge className={`${(candidate.match || candidate.overall_score || 0) > 90 ? 'bg-green-500/20 text-green-600 dark:text-green-400 hover:bg-green-500/30' : 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-500/30'} border-0`}>
                              {candidate.match || candidate.overall_score || 0}% Match
                            </Badge>
                          </div>
                          <div className="col-span-2 text-sm">{formatStageName(candidate.stage || candidate.status || "New")}</div>
                          <div className="col-span-2 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`button-actions-${candidate.id}`}>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuLabel>Candidate Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  className="cursor-pointer"
                                  onClick={() => toast.info(`Viewing profile for ${candidate.fullName || 'candidate'}`)}
                                >
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Profile
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild className="cursor-pointer">
                                  <Link href="/interview/voice">
                                    <Mic className="mr-2 h-4 w-4" />
                                    Start Voice Interview
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild className="cursor-pointer">
                                  <Link href="/interview/video">
                                    <Video className="mr-2 h-4 w-4" />
                                    Start Video Interview
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  className="cursor-pointer"
                                  onClick={() => handleMoveToNextStage(candidate)}
                                  disabled={updateCandidateMutation.isPending}
                                >
                                  <ArrowRight className="mr-2 h-4 w-4" />
                                  Move to Next Stage
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  className="cursor-pointer"
                                  onClick={() => handleSendEmail(candidate)}
                                >
                                  <Mail className="mr-2 h-4 w-4" />
                                  Send Email
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  className="cursor-pointer"
                                  onClick={() => handleDownloadCV(candidate)}
                                >
                                  <Download className="mr-2 h-4 w-4" />
                                  Download CV
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  className="cursor-pointer text-red-600 dark:text-red-400 focus:text-red-600 dark:text-red-400"
                                  onClick={() => {
                                    if (candidate?.id && window.confirm(`Remove ${candidate.fullName || 'this candidate'}?`)) {
                                      deleteCandidateMutation.mutate(candidate.id);
                                    } else if (!candidate?.id) {
                                      toast.error("Invalid candidate ID");
                                    }
                                  }}
                                  disabled={deleteCandidateMutation.isPending}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Remove Candidate
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      ))
                    )}
                  </ScrollArea>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* JOBS TAB */}
          <TabsContent value="jobs" className="space-y-6">
            <Card className="bg-gray-100 dark:bg-zinc-900/50 border-gray-200 dark:border-zinc-800">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-foreground font-bold text-lg flex items-center gap-2">
                      <Briefcase className="h-5 w-5 text-[#FFCB00]" />
                      Job Specifications Library
                    </CardTitle>
                    <CardDescription className="text-gray-700 dark:text-gray-300 font-medium">Extracted job requirements from uploaded specifications</CardDescription>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center bg-gray-200 dark:bg-zinc-800 rounded-lg p-1">
                      <Button
                        variant={jobSpecViewMode === "grid" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setJobSpecViewMode("grid")}
                        className={jobSpecViewMode === "grid" ? "bg-[#FFCB00]/20 text-[#FFCB00]" : "text-zinc-400"}
                        data-testid="button-jobs-grid-view"
                      >
                        <Grid3X3 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={jobSpecViewMode === "list" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setJobSpecViewMode("list")}
                        className={jobSpecViewMode === "list" ? "bg-[#FFCB00]/20 text-[#FFCB00]" : "text-zinc-400"}
                        data-testid="button-jobs-list-view"
                      >
                        <List className="h-4 w-4" />
                      </Button>
                    </div>
                    <Badge variant="outline" className="border-zinc-600">
                      {displayJobs.length + jobSpecDocuments.length} Jobs
                    </Badge>
                    <Link href="/recruitment-agent">
                      <Button variant="outline" size="sm" className="border-[#FFCB00]/50 text-[#FFCB00] hover:bg-[#FFCB00]/10">
                        <Briefcase className="h-4 w-4 mr-2" />
                        View Recruitment
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </Link>
                    <Dialog open={isCreateJobOpen} onOpenChange={setIsCreateJobOpen}>
                      <DialogTrigger asChild>
                        <Button data-testid="button-create-job-dialog" className="bg-[#FFCB00] hover:bg-[#E6B800] text-black font-semibold">
                          <Plus className="h-4 w-4 mr-2" />
                          Create New Job
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[95vw] w-[95vw] max-h-[90vh] bg-card border-border p-0">
                        <JobCreationChat 
                          onJobCreated={() => {
                            setIsCreateJobOpen(false);
                            queryClient.invalidateQueries({ queryKey: jobsKey });
                            toast.success("Job created successfully! AI will start sourcing candidates.");
                          }}
                          onCancel={() => setIsCreateJobOpen(false)}
                        />
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loadingJobs || loadingJobSpecs ? (
                  <div className="text-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-[#FFCB00] mx-auto" />
                  </div>
                ) : displayJobs.length === 0 && jobSpecDocuments.length === 0 ? (
                  <div className="text-center py-12">
                    <Briefcase className="h-16 w-16 text-zinc-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-zinc-300 mb-2">No jobs yet</h3>
                    <p className="text-zinc-500 mb-4">Create a job using the AI assistant or upload job specifications</p>
                    <div className="flex gap-3 justify-center">
                      <Button 
                        onClick={() => setIsCreateJobOpen(true)}
                        className="bg-[#FFCB00] hover:bg-[#E6B800] text-black font-semibold"
                      >
                        <Sparkles className="h-4 w-4 mr-2" />
                        Create with AI
                      </Button>
                      <Link href="/document-automation">
                        <Button 
                          variant="outline" 
                          className="border-[#FFCB00]/50 text-[#FFCB00] hover:bg-[#FFCB00]/10"
                        >
                          <UploadCloud className="h-4 w-4 mr-2" />
                          Upload Job Specs
                        </Button>
                      </Link>
                    </div>
                  </div>
                ) : jobSpecViewMode === "grid" ? (
                  <ScrollArea className="h-[600px] pr-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-4">
                      {/* AI-Created Jobs */}
                      {displayJobs.map((job: any) => (
                        <div 
                          key={job.id}
                          className="p-4 rounded-xl bg-card hover:bg-accent transition-all border-2 border-border hover:border-primary group cursor-pointer"
                          data-testid={`card-job-${job.id}`}
                          onClick={() => { setSelectedJob(job); setIsJobDetailOpen(true); }}
                        >
                          <div className="flex items-start gap-3 mb-3">
                            <div className="w-12 h-12 rounded-lg bg-[#0A0A0A] flex items-center justify-center">
                              <Briefcase className="h-6 w-6 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-foreground truncate">{job.title}</h3>
                              <p className="text-[#FFCB00] text-sm truncate flex items-center gap-1">
                                <Building2 className="h-3 w-3" />
                                {job.department || 'General'}
                              </p>
                            </div>
                            <Badge className={`${job.status === 'Active' ? 'bg-green-500/20 text-green-600 dark:text-green-400' : 'bg-gray-500/20 text-gray-400'} border-0 text-xs`}>
                              {job.status}
                            </Badge>
                          </div>

                          <div className="space-y-1.5 mb-3">
                            {(job.city || job.province || job.location) && (
                              <div className="flex items-center gap-2 text-xs text-zinc-400">
                                <MapPin className="h-3 w-3 flex-shrink-0" />
                                <span className="truncate">
                                  {job.city && job.province ? `${job.city}, ${job.province}` : job.location}
                                </span>
                              </div>
                            )}
                            {(job.remuneration || job.salaryMin || job.salaryMax) && (
                              <div className="flex items-center gap-2 text-xs text-zinc-400">
                                <span className="truncate">
                                  {job.remuneration || `R${job.salaryMin?.toLocaleString() || '0'} - R${job.salaryMax?.toLocaleString() || job.salaryMin?.toLocaleString() || '0'} ${job.payRateUnit || 'monthly'}`}
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="flex gap-2 pt-2 border-t border-gray-300 dark:border-zinc-700/50">
                            <Link href={`/recruitment-agent?jobId=${job.id}`} className="flex-1">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="w-full border-[#FFCB00]/30 text-[#FFCB00] hover:bg-[#FFCB00]/10"
                                data-testid={`button-start-search-grid-${job.id}`}
                              >
                                <Search className="h-3 w-3 mr-1" />
                                Start Search
                              </Button>
                            </Link>
                            <Link href={`/recruitment-agent?jobId=${job.id}`}>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="text-zinc-400 hover:text-white"
                                data-testid={`button-view-candidates-grid-${job.id}`}
                              >
                                <Eye className="h-3 w-3" />
                              </Button>
                            </Link>
                          </div>
                        </div>
                      ))}
                      
                      {/* Uploaded Job Spec Documents */}
                      {jobSpecDocuments.map((doc) => {
                        const extracted = doc.extractedData as any;
                        return (
                          <div 
                            key={doc.id}
                            className="p-4 rounded-xl bg-card hover:bg-accent transition-all border-2 border-border hover:border-[#FFCB00] group"
                            data-testid={`card-job-spec-${doc.id}`}
                          >
                            <div className="flex items-start gap-3 mb-3">
                              <div className="w-12 h-12 rounded-lg bg-[#0A0A0A] flex items-center justify-center">
                                <FileText className="h-6 w-6 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-foreground truncate">
                                  {extracted?.title || extracted?.jobTitle || doc.originalFilename}
                                </h3>
                                {extracted?.company && (
                                  <p className="text-[#FFCB00] text-sm truncate flex items-center gap-1">
                                    <Building2 className="h-3 w-3" />
                                    {extracted.company}
                                  </p>
                                )}
                              </div>
                              <Badge className="bg-blue-500/20 text-blue-600 dark:text-blue-400 border-0 text-xs">
                                Uploaded
                              </Badge>
                            </div>

                            <div className="space-y-1.5 mb-3">
                              {extracted?.location && (
                                <div className="flex items-center gap-2 text-xs text-zinc-400">
                                  <MapPin className="h-3 w-3 flex-shrink-0" />
                                  <span className="truncate">{extracted.location}</span>
                                </div>
                              )}
                              {extracted?.department && (
                                <div className="flex items-center gap-2 text-xs text-zinc-400">
                                  <Building2 className="h-3 w-3 flex-shrink-0" />
                                  <span className="truncate">{extracted.department}</span>
                                </div>
                              )}
                            </div>

                            <div className="flex gap-2 pt-2 border-t border-gray-300 dark:border-zinc-700/50">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="flex-1 border-[#FFCB00]/30 text-[#FFCB00] hover:bg-[#FFCB00]/10"
                                onClick={() => setSelectedJobSpec(doc)}
                                data-testid={`button-view-spec-${doc.id}`}
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                View Details
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                ) : (
                  <ScrollArea className="h-[600px]">
                    <div className="overflow-x-auto pb-4">
                      <table className="w-full min-w-[800px]">
                        <thead>
                          <tr className="border-b border-gray-200 dark:border-zinc-800">
                            <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Title</th>
                            <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Department</th>
                            <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Location</th>
                            <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Status</th>
                            <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Created</th>
                            <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/50">
                          {/* AI-Created Jobs */}
                          {displayJobs.map((job: any) => (
                            <tr key={job.id} className="hover:bg-gray-200 dark:bg-zinc-800/30 transition-colors" data-testid={`row-job-${job.id}`}>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-[#0A0A0A] flex items-center justify-center flex-shrink-0">
                                    <Briefcase className="h-4 w-4 text-white" />
                                  </div>
                                  <span className="font-medium text-foreground truncate max-w-[200px]">{job.title}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-zinc-400 text-sm">{job.department || 'General'}</span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-zinc-400 text-sm">
                                  {job.city && job.province ? `${job.city}, ${job.province}` : (job.location || '-')}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <Badge className={`${job.status === 'Active' ? 'bg-green-500/20 text-green-600 dark:text-green-400' : 'bg-gray-500/20 text-gray-400'} border-0 text-xs`}>
                                  {job.status}
                                </Badge>
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-zinc-500 text-xs">{new Date(job.createdAt).toLocaleDateString()}</span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Link href={`/recruitment-agent?jobId=${job.id}`}>
                                    <Button variant="ghost" size="sm" className="h-7 px-2 text-[#FFCB00]">
                                      <Search className="h-3.5 w-3.5 mr-1" />
                                      Search
                                    </Button>
                                  </Link>
                                  <Link href={`/recruitment-agent?jobId=${job.id}`}>
                                    <Button variant="ghost" size="sm" className="h-7 px-2 text-zinc-400">
                                      <Eye className="h-3.5 w-3.5" />
                                    </Button>
                                  </Link>
                                </div>
                              </td>
                            </tr>
                          ))}
                          
                          {/* Uploaded Job Spec Documents */}
                          {jobSpecDocuments.map((doc) => {
                            const extracted = doc.extractedData as any;
                            return (
                              <tr key={doc.id} className="hover:bg-gray-200 dark:bg-zinc-800/30 transition-colors" data-testid={`row-job-spec-${doc.id}`}>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-[#0A0A0A] flex items-center justify-center flex-shrink-0">
                                      <FileText className="h-4 w-4 text-white" />
                                    </div>
                                    <span className="font-medium text-foreground truncate max-w-[200px]">
                                      {extracted?.title || extracted?.jobTitle || doc.originalFilename}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="text-zinc-400 text-sm">{extracted?.department || extracted?.company || '-'}</span>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="text-zinc-400 text-sm">{extracted?.location || '-'}</span>
                                </td>
                                <td className="px-4 py-3">
                                  <Badge className="bg-blue-500/20 text-blue-600 dark:text-blue-400 border-0 text-xs">Uploaded</Badge>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="text-zinc-500 text-xs">{new Date(doc.createdAt).toLocaleDateString()}</span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      className="h-7 px-2 text-zinc-400"
                                      onClick={() => setSelectedJobSpec(doc)}
                                    >
                                      <Eye className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* INTEGRITY TAB */}
          <TabsContent value="integrity" className="space-y-6">
            
            {/* AI Integrity Banner */}
            <div className="rounded-lg bg-[#FFCB00]/5 dark:bg-[#FFCB00]/10 border-2 border-[#FFCB00]/20 dark:border-[#FFCB00]/30 p-6 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2 text-foreground">
                  <ShieldCheck className="w-5 h-5 text-foreground" />
                  Perform automated background checks?
                </h3>
                <p className="text-foreground font-semibold text-sm mt-1">
                  Activate the Integrity Agent to verify fingerprints, criminal records, and credit history instantly.
                </p>
              </div>
              <Link href="/integrity-agent">
                <Button className="bg-[#FFCB00] hover:bg-[#E6B800] text-black">
                  Start Integrity Check
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle className="text-foreground font-bold flex items-center gap-2">
                    <FileCheck className="w-5 h-5 text-[#FFCB00]" />
                    Pending Verifications
                  </CardTitle>
                  <CardDescription className="text-gray-700 dark:text-gray-300 font-medium">Background check results and verification status</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <p className="text-sm text-foreground font-semibold mb-3">Recent integrity checks across all candidates:</p>
                    <ScrollArea className="h-[300px]">
                      <div className="space-y-2">
                        {allIntegrityChecks.length === 0 ? (
                          <div className="text-center text-foreground font-semibold py-8">
                            <FileCheck className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No integrity checks pending</p>
                            <p className="text-xs text-muted-foreground mt-1">Start a check from the button above</p>
                          </div>
                        ) : (
                          allIntegrityChecks.map((check: any) => {
                            const candidateName = check.candidateName || "Unknown Candidate";
                            return (
                              <div
                                key={check.id}
                                className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-border cursor-pointer hover:bg-white/10 transition-colors"
                                onClick={() => navigate(`/integrity-agent?candidateId=${check.candidateId}&readOnly=true`)}
                              >
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-8 w-8">
                                    <AvatarFallback className="bg-[#0A0A0A] text-white text-xs">
                                      {candidateName.substring(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="font-medium text-sm">{candidateName}</p>
                                    <p className="text-xs text-foreground font-semibold">{check.checkType || check.type || "Verification"}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {check.status === "Pending" || check.status === "In Progress" ? (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 text-xs gap-1 border-green-300 dark:border-green-700 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950"
                                      disabled={verifyingCheckId === check.id}
                                      onClick={(e) => { e.stopPropagation(); verifyIntegrityCheck(check.id, check.candidateId); }}
                                    >
                                      {verifyingCheckId === check.id ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      ) : (
                                        <CheckCircle2 className="h-3 w-3" />
                                      )}
                                      Verify
                                    </Button>
                                  ) : null}
                                  <Badge variant={check.status === "Clear" || check.status === "completed" || check.status === "Completed" ? "default" : "secondary"} className={check.status === "Clear" || check.status === "completed" || check.status === "Completed" ? "bg-green-500/20 text-green-600 dark:text-green-400" : "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400"}>
                                    {check.status}
                                  </Badge>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle className="text-foreground font-bold flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-[#FFCB00]" />
                    Risk Assessment Overview
                  </CardTitle>
                  <CardDescription className="text-gray-700 dark:text-gray-300 font-medium">AI-generated risk profiles based on background data</CardDescription>
                </CardHeader>
                <CardContent>
                  {!selectedRiskCandidate ? (
                    <div className="space-y-3">
                      <p className="text-sm text-foreground font-semibold mb-3">Select a candidate to view risk analysis:</p>
                      <ScrollArea className="h-[300px]">
                        <div className="space-y-2">
                          {candidates && candidates.length > 0 ? candidates.slice(0, 20).map((candidate: any) => {
                            const riskData = getCandidateRiskData(candidate.id);
                            return (
                              <div 
                                key={candidate.id}
                                onClick={() => setSelectedRiskCandidate(candidate)}
                                className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-border cursor-pointer hover:bg-white/10 transition-colors"
                                data-testid={`risk-candidate-${candidate.id}`}
                              >
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-8 w-8">
                                    <AvatarFallback className="bg-[#0A0A0A] text-white text-xs">
                                      {(candidate.fullName || candidate.name || 'U').substring(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="font-medium text-sm">{candidate.fullName || candidate.name}</p>
                                    <p className="text-xs text-foreground font-semibold">{candidate.role || 'Candidate'}</p>
                                  </div>
                                </div>
                                {riskData.hasData ? (
                                  <Badge 
                                    data-testid={`badge-risk-level-${candidate.id}`}
                                    className={
                                      riskData.riskLevel === 'low' ? 'bg-green-500/20 text-green-600 dark:text-green-400' :
                                      riskData.riskLevel === 'medium' ? 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400' :
                                      riskData.riskLevel === 'high' ? 'bg-muted/20 text-foreground' :
                                      'bg-red-500/20 text-red-600 dark:text-red-400'
                                    }
                                  >
                                    {riskData.riskLevel.charAt(0).toUpperCase() + riskData.riskLevel.slice(1)}
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-foreground font-semibold" data-testid={`badge-no-data-${candidate.id}`}>No Data</Badge>
                                )}
                              </div>
                            );
                          }) : (
                            <div className="text-center text-foreground font-semibold py-8">
                              <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                              <p className="text-sm">No candidates available</p>
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-[#0A0A0A] text-white">
                              {(selectedRiskCandidate.fullName || selectedRiskCandidate.name || 'U').substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-bold">{selectedRiskCandidate.fullName || selectedRiskCandidate.name}</p>
                            <p className="text-sm text-foreground font-semibold">{selectedRiskCandidate.role || 'Candidate'}</p>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setSelectedRiskCandidate(null)}
                          data-testid="close-risk-view"
                        >
                          <RotateCcw className="w-4 h-4 mr-1" /> Back
                        </Button>
                      </div>
                      
                      {(() => {
                        const riskData = getCandidateRiskData(selectedRiskCandidate.id);
                        if (!riskData.hasData) {
                          return (
                            <div className="text-center text-foreground font-semibold py-6">
                              <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                              <p className="text-sm">No risk assessment data available</p>
                              <p className="text-xs mt-1">Run an integrity check or social screening first</p>
                              <div className="flex gap-2 justify-center mt-3">
                                <Link href={`/integrity-agent?candidateId=${selectedRiskCandidate.id}&autoStart=true`}>
                                  <Button size="sm" variant="outline">
                                    <ShieldCheck className="w-4 h-4 mr-1" /> Start Integrity Check
                                  </Button>
                                </Link>
                                <Link href="/social-screening">
                                  <Button size="sm" variant="outline">
                                    <Search className="w-4 h-4 mr-1" /> Social Screening
                                  </Button>
                                </Link>
                              </div>
                            </div>
                          );
                        }
                        
                        return (
                          <div className="space-y-3" data-testid="risk-detail-view">
                            <div className="flex items-center justify-between p-3 rounded-lg bg-[#FFCB00]/5 dark:bg-[#FFCB00]/10 border-2 border-[#FFCB00]/20 dark:border-[#FFCB00]/30">
                              <span className="text-sm font-medium">Overall Risk Score</span>
                              <div className="flex items-center gap-2">
                                <span className="text-2xl font-bold" data-testid="text-risk-score">{riskData.overallRiskScore}%</span>
                                <Badge 
                                  data-testid="badge-detail-risk-level"
                                  className={
                                    riskData.riskLevel === 'low' ? 'bg-green-500/20 text-green-600 dark:text-green-400' :
                                    riskData.riskLevel === 'medium' ? 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400' :
                                    riskData.riskLevel === 'high' ? 'bg-muted/20 text-foreground' :
                                    'bg-red-500/20 text-red-600 dark:text-red-400'
                                  }
                                >
                                  {riskData.riskLevel.charAt(0).toUpperCase() + riskData.riskLevel.slice(1)} Risk
                                </Badge>
                              </div>
                            </div>
                            
                            {riskData.integrityCheck && (
                              <div className="p-3 rounded-lg bg-white/5 border border-border" data-testid="section-integrity-check">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-sm font-medium flex items-center gap-2">
                                    <FileCheck className="w-4 h-4 text-foreground" /> Integrity Check
                                  </span>
                                  <Badge variant="outline" data-testid="badge-integrity-status">{riskData.integrityCheck.status}</Badge>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  <div>
                                    <span className="text-foreground font-semibold">Criminal: </span>
                                    <span className={riskData.integrityCheck.checks?.criminal?.passed ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'} data-testid="text-criminal-status">
                                      {riskData.integrityCheck.checks?.criminal?.passed ? 'Clear' : 'Review'}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-foreground font-semibold">Credit: </span>
                                    <span className={riskData.integrityCheck.checks?.credit?.passed ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'} data-testid="text-credit-status">
                                      {riskData.integrityCheck.checks?.credit?.passed ? 'Clear' : 'Review'}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-foreground font-semibold">Identity: </span>
                                    <span className={riskData.integrityCheck.checks?.identity?.passed ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'} data-testid="text-identity-status">
                                      {riskData.integrityCheck.checks?.identity?.passed ? 'Verified' : 'Pending'}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-foreground font-semibold">References: </span>
                                    <span className={riskData.integrityCheck.checks?.reference?.passed ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'} data-testid="text-reference-status">
                                      {riskData.integrityCheck.checks?.reference?.passed ? 'Verified' : 'Pending'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            {riskData.socialScreening?.results?.aggregatedResults && (
                              <div className="p-3 rounded-lg bg-white/5 border border-border" data-testid="section-social-screening">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-sm font-medium flex items-center gap-2">
                                    <Users className="w-4 h-4 text-[#FFCB00]" /> Social Screening
                                  </span>
                                  <Badge variant="outline" data-testid="badge-social-status">{riskData.socialScreening.status}</Badge>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  <div>
                                    <span className="text-foreground font-semibold">Culture Fit: </span>
                                    <span className="text-primary" data-testid="text-culture-fit">{riskData.socialScreening.results.aggregatedResults.overallScore || 'N/A'}%</span>
                                  </div>
                                  <div>
                                    <span className="text-foreground font-semibold">Sentiment: </span>
                                    <span 
                                      data-testid="text-sentiment-score"
                                      className={
                                        riskData.socialScreening.results.aggregatedResults.sentimentScore >= 70 ? 'text-green-600 dark:text-green-400' :
                                        riskData.socialScreening.results.aggregatedResults.sentimentScore >= 40 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'
                                    }>
                                      {riskData.socialScreening.results.aggregatedResults.sentimentScore || 'N/A'}%
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Social Screening Section */}
            <div className="rounded-lg bg-[#FFCB00]/5 dark:bg-[#FFCB00]/10 border-2 border-[#FFCB00]/20 dark:border-[#FFCB00]/30 p-6 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2 text-foreground">
                  <Users className="w-5 h-5 text-[#FFCB00]" />
                  Social Intelligence Screening
                </h3>
                <p className="text-foreground font-semibold text-sm mt-1">
                  AI-powered culture fit assessment via social media analysis (LinkedIn, Facebook, X, Instagram) with POPIA compliance.
                </p>
              </div>
              <Link href="/social-screening">
                <Button className="bg-[#FFCB00] text-black hover:bg-[#E6B800] shadow-lg shadow-[#FFCB00]/20">
                  <Search className="w-4 h-4 mr-2" />
                  View Social Screening
                </Button>
              </Link>
            </div>

            {/* Social Screening Dashboard Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="border-border bg-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-foreground font-bold text-sm">Consent Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Granted</span>
                      <Badge className="bg-green-500/20 text-green-600 dark:text-green-400">{socialStats?.consentGranted || 0}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Pending</span>
                      <Badge className="bg-yellow-500/20 text-yellow-600 dark:text-yellow-400">{socialStats?.consentPending || 0}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Denied</span>
                      <Badge className="bg-red-500/20 text-red-600 dark:text-red-400">{socialStats?.consentDenied || 0}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border bg-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-foreground font-bold text-sm">Screening Progress</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Total Screenings</span>
                      <span className="font-bold">{socialStats?.totalScreenings || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Completed</span>
                      <Badge className="bg-green-500/20 text-green-600 dark:text-green-400">{socialStats?.screeningsCompleted || 0}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Pending Review</span>
                      <Badge className="bg-blue-500/20 text-blue-600 dark:text-blue-400">{socialStats?.pendingHumanReview || 0}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border bg-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-foreground font-bold text-sm">Risk Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500"></span> Low Risk
                      </span>
                      <span>{socialStats?.riskDistribution?.low || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-yellow-500"></span> Medium
                      </span>
                      <span>{socialStats?.riskDistribution?.medium || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-foreground"></span> High
                      </span>
                      <span>{socialStats?.riskDistribution?.high || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-500"></span> Critical
                      </span>
                      <span>{socialStats?.riskDistribution?.critical || 0}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Pending Human Reviews */}
              <Card className="border-border bg-card lg:col-span-3">
                <CardHeader>
                  <CardTitle className="text-foreground font-bold flex items-center gap-2">
                    <Eye className="w-5 h-5 text-[#FFCB00]" />
                    Pending Human Reviews
                  </CardTitle>
                  <CardDescription className="text-gray-700 dark:text-gray-300 font-medium">Social screening findings requiring HR review</CardDescription>
                </CardHeader>
                <CardContent>
                  {socialPendingReviews.length === 0 ? (
                    <div className="text-center py-8 text-foreground font-semibold">
                      <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p>No pending reviews. All social screenings are up to date.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {socialPendingReviews.slice(0, 5).map((finding: any) => (
                        <div key={finding.id} className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-border">
                          <div className="flex items-center gap-4">
                            <div className={`w-3 h-3 rounded-full ${
                              finding.riskLevel === 'low' ? 'bg-green-500' :
                              finding.riskLevel === 'medium' ? 'bg-yellow-500' :
                              finding.riskLevel === 'high' ? 'bg-foreground' : 'bg-destructive'
                            }`}></div>
                            <div>
                              <p className="font-medium">{finding.candidateName || 'Unknown Candidate'}</p>
                              <p className="text-sm text-foreground font-semibold">
                                Culture Fit: {finding.cultureFitScore || 'N/A'}% | 
                                Risk: {finding.riskLevel || 'Unknown'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge className={
                              finding.aiRecommendation === 'proceed' ? 'bg-green-500/20 text-green-600 dark:text-green-400' :
                              finding.aiRecommendation === 'review' ? 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400' :
                              finding.aiRecommendation === 'caution' ? 'bg-muted/20 text-foreground' :
                              'bg-red-500/20 text-red-600 dark:text-red-400'
                            }>
                              AI: {finding.aiRecommendation || 'Pending'}
                            </Badge>
                            <Link href="/social-screening?tab=reviews">
                              <Button size="sm" variant="outline">
                                Review
                              </Button>
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* OFFER TAB - Embedded Offer Management Page */}
          <TabsContent value="offer" className="space-y-6">
            <OfferManagement />
          </TabsContent>

          {/* ONBOARDING TAB - Embedded Employee Onboarding Page */}
          <TabsContent value="onboarding" className="space-y-6">
            <EmployeeOnboarding />
          </TabsContent>

          {/* PERFORMANCE TAB - Employee Performance Management */}
           <TabsContent value="performance" className="space-y-6">
            
            {/* Quick Actions Bar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30">
                  {activeReviewCycles.length} Active Cycle{activeReviewCycles.length !== 1 ? 's' : ''}
                </Badge>
                <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30">
                  {pendingSubmissions.length} Pending Review{pendingSubmissions.length !== 1 ? 's' : ''}
                </Badge>
              </div>
              <div className="flex gap-2">
                <Link href="/kpi-management">
                  <Button variant="outline" className="border-border" data-testid="link-kpi-management">
                    <Target className="w-4 h-4 mr-2" />
                    Manage KPIs
                  </Button>
                </Link>
                <Link href="/kpi-hr-dashboard">
                  <Button className="bg-[#FFCB00] hover:bg-[#E6B800] text-black font-semibold" data-testid="link-kpi-dashboard">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Full KPI Dashboard
                  </Button>
                </Link>
              </div>
            </div>

            {/* Performance Overview KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border-border bg-card">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-foreground font-semibold">Active KPI Cycles</p>
                      <h3 className="text-2xl font-bold mt-2" data-testid="metric-active-cycles">
                        {activeReviewCycles.length}
                      </h3>
                      <p className="text-xs text-[#FFCB00] mt-1">
                        {reviewCycles.length} total cycles
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-[#FFCB00]/10">
                      <Calendar className="w-6 h-6 text-[#FFCB00]" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border bg-card">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-foreground font-semibold">Avg Performance</p>
                      <h3 className="text-2xl font-bold mt-2" data-testid="metric-avg-performance">
                        {avgScore}<span className="text-lg text-foreground font-semibold">/5.0</span>
                      </h3>
                      <p className="text-xs text-green-500 mt-1">
                        From {completedSubmissions.length} review{completedSubmissions.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-green-500/10">
                      <Star className="w-6 h-6 text-green-600 dark:text-green-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border bg-card">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-foreground font-semibold">Pending Reviews</p>
                      <h3 className="text-2xl font-bold mt-2" data-testid="metric-pending-reviews">
                        {pendingSubmissions.length}
                      </h3>
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                        {pendingAssignments.length} assignments in progress
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-amber-500/10">
                      <Clock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border bg-card">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-foreground font-semibold">KPI Completion</p>
                      <h3 className="text-2xl font-bold mt-2" data-testid="metric-kpi-achievement">
                        {completionRate}%
                      </h3>
                      <p className="text-xs text-[#FFCB00] mt-1">
                        {completedAssignments.length}/{totalAssignments} completed
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-[#FFCB00]/10">
                      <Target className="w-6 h-6 text-[#FFCB00]" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Active Review Cycles Section */}
            <Card className="border-border bg-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-foreground font-bold flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-primary" />
                      Active Review Cycles
                    </CardTitle>
                    <CardDescription className="text-gray-700 dark:text-gray-300 font-medium">Current KPI review periods</CardDescription>
                  </div>
                  <Link href="/kpi-management?tab=cycles&action=new-cycle">
                    <Button className="bg-[#FFCB00] hover:bg-[#E6B800] text-black font-semibold" data-testid="button-new-cycle">
                      <Plus className="w-4 h-4 mr-2" />
                      New Cycle
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {activeReviewCycles.length > 0 ? (
                    activeReviewCycles.map((cycle: any) => (
                      <div key={cycle.id} className="flex items-center justify-between p-4 rounded-lg border border-border bg-white/5 hover:bg-white/10 transition-colors" data-testid={`cycle-item-${cycle.id}`}>
                        <div className="flex items-center gap-4 flex-1">
                          <div className="p-2 rounded-lg bg-muted dark:bg-muted">
                            <Target className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{cycle.name}</p>
                            <p className="text-sm text-foreground font-semibold">{cycle.cycleType?.replace('_', ' ').toUpperCase() || 'Review Cycle'}</p>
                          </div>
                          <div className="text-sm">
                            <p className="text-foreground font-semibold">Period</p>
                            <p className="font-medium">
                              {cycle.startDate ? new Date(cycle.startDate).toLocaleDateString() : 'N/A'} - {cycle.endDate ? new Date(cycle.endDate).toLocaleDateString() : 'N/A'}
                            </p>
                          </div>
                          <Badge className="bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30">
                            Active
                          </Badge>
                          <Link href="/kpi-hr-dashboard">
                            <Button variant="ghost" size="sm">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-foreground font-semibold">
                      <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No active review cycles</p>
                      <Link href="/kpi-management?tab=cycles&action=new-cycle">
                        <Button variant="link" className="text-primary mt-2">Create a review cycle</Button>
                      </Link>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Review Submissions Section */}
            <Card className="border-border bg-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-foreground font-bold flex items-center gap-2">
                      <FileCheck className="w-5 h-5 text-primary" />
                      Recent Submissions
                    </CardTitle>
                    <CardDescription className="text-gray-700 dark:text-gray-300 font-medium">Employee KPI review submissions</CardDescription>
                  </div>
                  <Link href="/kpi-hr-dashboard">
                    <Button variant="outline" className="border-border" data-testid="button-view-all-submissions">
                      View All
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {reviewSubmissions.length > 0 ? (
                    reviewSubmissions.slice(0, 5).map((submission: any) => (
                      <div key={submission.id} className="flex items-center justify-between p-4 rounded-lg border border-border bg-white/5 hover:bg-white/10 transition-colors" data-testid={`submission-item-${submission.id}`}>
                        <div className="flex items-center gap-4 flex-1">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-[#0A0A0A] text-white">
                              {getEmployeeName(submission.employeeId).slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-medium">{getEmployeeName(submission.employeeId)}</p>
                            <p className="text-sm text-foreground font-semibold">
                              Self: {submission.selfAssessmentStatus || 'pending'} | Manager: {submission.managerReviewStatus || 'pending'}
                            </p>
                          </div>
                          <div className="text-sm">
                            <p className="text-foreground font-semibold">Score</p>
                            <p className="font-medium">
                              {submission.finalScore ? `${submission.finalScore}/5` : 'Pending'}
                            </p>
                          </div>
                          <Badge 
                            className={
                              submission.status === 'completed' ? "bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30" :
                              submission.status === 'in_progress' ? "bg-[#FFCB00]/20 text-[#FFCB00] border-[#FFCB00]/30" :
                              "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30"
                            }
                          >
                            {submission.status || 'Pending'}
                          </Badge>
                          <Link href={`/kpi-review/${submission.id}`}>
                            <Button variant="ghost" size="sm">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-foreground font-semibold">
                      <FileCheck className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No review submissions yet</p>
                      <p className="text-sm mt-1">Submissions will appear here when employees complete their KPI reviews</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* KPI Assignments Section */}
            <Card className="border-border bg-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-foreground font-bold flex items-center gap-2">
                      <Target className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                      KPI Assignments
                    </CardTitle>
                    <CardDescription className="text-gray-700 dark:text-gray-300 font-medium">Current quarter performance objectives</CardDescription>
                  </div>
                  <Link href="/kpi-management">
                    <Button variant="outline" className="border-border" data-testid="button-manage-assignments">
                      Manage
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {kpiAssignments.length > 0 ? (
                    kpiAssignments.slice(0, 4).map((assignment: any) => (
                      <div key={assignment.id} className="p-4 rounded-lg border border-border bg-white/5" data-testid={`kpi-item-${assignment.id}`}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-[#0A0A0A] text-white text-xs">
                                {getEmployeeName(assignment.employeeId).slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-sm">{getEmployeeName(assignment.employeeId)}</p>
                              <p className="text-xs text-foreground font-semibold">{getTemplateInfo(assignment.kpiTemplateId)?.name || 'KPI Assignment'}</p>
                            </div>
                          </div>
                          <Badge 
                            className={
                              assignment.status === 'completed' ? "bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30" :
                              assignment.status === 'in_progress' ? "bg-[#FFCB00]/20 text-[#FFCB00] border-[#FFCB00]/30" :
                              "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30"
                            }
                          >
                            {assignment.status || 'Pending'}
                          </Badge>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-foreground font-semibold">Target</span>
                            <span className="font-medium">{assignment.customTarget || getTemplateInfo(assignment.kpiTemplateId)?.targetValue || 'N/A'}</span>
                          </div>
                          <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all ${
                                assignment.status === 'completed' ? "bg-green-500" :
                                assignment.status === 'in_progress' ? "bg-[#FFCB00]" :
                                "bg-amber-500"
                              }`}
                              style={{ width: assignment.status === 'completed' ? '100%' : assignment.status === 'in_progress' ? '50%' : '0%' }}
                            />
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-foreground font-semibold">
                      <Target className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No KPI assignments</p>
                      <Link href="/kpi-management">
                        <Button variant="link" className="text-primary mt-2">Create KPI assignments</Button>
                      </Link>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* LMS TAB - Learning Management System */}
          <TabsContent value="lms" className="space-y-6">
            {/* LMS Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border-border bg-card">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-foreground font-semibold">Active Courses</p>
                      <h3 className="text-2xl font-bold mt-2">{lmsCourses.filter((c: any) => c.status === "published").length}</h3>
                      <p className="text-xs text-[#FFCB00] mt-1">Published courses</p>
                    </div>
                    <div className="p-3 rounded-lg bg-[#FFCB00]/10">
                      <BookOpen className="w-6 h-6 text-[#FFCB00]" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border bg-card">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-foreground font-semibold">Total Courses</p>
                      <h3 className="text-2xl font-bold mt-2">{lmsCourses.length}</h3>
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1">All courses</p>
                    </div>
                    <div className="p-3 rounded-lg bg-green-500/10">
                      <Users className="w-6 h-6 text-green-600 dark:text-green-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border bg-card">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-foreground font-semibold">Categories</p>
                      <h3 className="text-2xl font-bold mt-2">{new Set(lmsCourses.map((c: any) => c.category)).size}</h3>
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Course categories</p>
                    </div>
                    <div className="p-3 rounded-lg bg-amber-500/10">
                      <TrendingUp className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border bg-card">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-foreground font-semibold">Total Duration</p>
                      <h3 className="text-2xl font-bold mt-2">{Math.round(lmsCourses.reduce((sum: number, c: any) => sum + (c.duration || 0), 0) / 60)}h</h3>
                      <p className="text-xs text-[#FFCB00] mt-1">Learning content</p>
                    </div>
                    <div className="p-3 rounded-lg bg-[#FFCB00]/10">
                      <Award className="w-6 h-6 text-[#FFCB00]" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Active Courses */}
            <Card className="border-border bg-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-foreground font-bold flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-primary" />
                      Active Training Courses
                    </CardTitle>
                    <CardDescription className="text-gray-700 dark:text-gray-300 font-medium">Current learning programs and progress</CardDescription>
                  </div>
                  <Link href="/learning-management">
                    <Button className="bg-[#FFCB00] hover:bg-[#E6B800] text-black font-semibold" data-testid="button-create-course-lms">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Course
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {lmsCourses.length === 0 ? (
                    <div className="text-center py-8 text-foreground font-semibold">
                      <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No courses yet</p>
                      <Link href="/learning-management">
                        <Button variant="link" className="text-primary mt-2">Create your first course</Button>
                      </Link>
                    </div>
                  ) : lmsCourses.map((course: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-4 rounded-lg border border-border bg-white/5 hover:bg-white/10 transition-colors">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="p-2 rounded-lg bg-muted dark:bg-muted">
                          <BookOpen className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{course.title}</p>
                          <p className="text-sm text-foreground font-semibold">{course.category || "General"}</p>
                        </div>
                        <div className="text-sm text-center">
                          <p className="text-foreground font-semibold">Difficulty</p>
                          <p className="font-medium capitalize">{course.difficulty || "beginner"}</p>
                        </div>
                        <div className="text-sm text-center">
                          <p className="text-foreground font-semibold">Duration</p>
                          <p className="font-medium">{course.duration || 0} min</p>
                        </div>
                        <div className="text-sm text-center">
                          <p className="text-foreground font-semibold">Status</p>
                          <Badge variant="outline" className="capitalize">{course.status || "draft"}</Badge>
                        </div>
                        <Link href="/learning-management">
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Employee Learning Progress */}
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-foreground font-bold flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  Employee Learning Progress
                </CardTitle>
                <CardDescription className="text-gray-700 dark:text-gray-300 font-medium">Individual training completion status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { employee: "Sarah Jenkins", courses: 5, completed: 5, inProgress: 0, certificates: 3 },
                    { employee: "Marcus Johnson", courses: 4, completed: 3, inProgress: 1, certificates: 2 },
                    { employee: "David Chen", courses: 6, completed: 4, inProgress: 2, certificates: 4 },
                    { employee: "Emily Davis", courses: 3, completed: 2, inProgress: 1, certificates: 1 },
                  ].map((emp, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 rounded-lg border border-border bg-white/5">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-[#0A0A0A] text-white">
                            {emp.employee.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{emp.employee}</p>
                          <p className="text-sm text-foreground font-semibold">{emp.courses} courses assigned</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{emp.completed}</p>
                          <p className="text-xs text-foreground font-semibold">Completed</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{emp.inProgress}</p>
                          <p className="text-xs text-foreground font-semibold">In Progress</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-[#FFCB00]">{emp.certificates}</p>
                          <p className="text-xs text-foreground font-semibold">Certificates</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TIME & ATTENDANCE TAB */}
          <TabsContent value="time-attendance" className="space-y-6">
            {/* Time & Attendance Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border-border bg-card">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-foreground font-semibold">Present Today</p>
                      <h3 className="text-2xl font-bold mt-2">142</h3>
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1">92% attendance rate</p>
                    </div>
                    <div className="p-3 rounded-lg bg-green-500/10">
                      <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border bg-card">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-foreground font-semibold">On Leave</p>
                      <h3 className="text-2xl font-bold mt-2">8</h3>
                      <p className="text-xs text-[#FFCB00] mt-1">Approved leave</p>
                    </div>
                    <div className="p-3 rounded-lg bg-[#FFCB00]/10">
                      <Calendar className="w-6 h-6 text-[#FFCB00]" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border bg-card">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-foreground font-semibold">Late Arrivals</p>
                      <h3 className="text-2xl font-bold mt-2">5</h3>
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Today</p>
                    </div>
                    <div className="p-3 rounded-lg bg-amber-500/10">
                      <Clock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border bg-card">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-foreground font-semibold">Overtime Hours</p>
                      <h3 className="text-2xl font-bold mt-2">48</h3>
                      <p className="text-xs text-[#FFCB00] mt-1">This week</p>
                    </div>
                    <div className="p-3 rounded-lg bg-[#FFCB00]/10">
                      <Timer className="w-6 h-6 text-[#FFCB00]" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Today's Attendance */}
            <Card className="border-border bg-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-foreground font-bold flex items-center gap-2">
                      <Timer className="w-5 h-5 text-primary" />
                      Today's Attendance
                    </CardTitle>
                    <CardDescription className="text-gray-700 dark:text-gray-300 font-medium">Real-time employee attendance tracking</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="border-border">
                      <Download className="w-4 h-4 mr-2" />
                      Export Report
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { employee: "Sarah Jenkins", clockIn: "08:45 AM", clockOut: "-", status: "Present", hours: "4h 15m", department: "Operations" },
                    { employee: "Marcus Johnson", clockIn: "09:15 AM", clockOut: "-", status: "Late", hours: "3h 45m", department: "Management" },
                    { employee: "David Chen", clockIn: "08:30 AM", clockOut: "-", status: "Present", hours: "4h 30m", department: "Finance" },
                    { employee: "Emily Davis", clockIn: "-", clockOut: "-", status: "On Leave", hours: "-", department: "Design" },
                    { employee: "Robert Brown", clockIn: "08:00 AM", clockOut: "12:30 PM", status: "Left Early", hours: "4h 30m", department: "Engineering" },
                  ].map((record, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 rounded-lg border border-border bg-white/5 hover:bg-white/10 transition-colors">
                      <div className="flex items-center gap-4 flex-1">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-[#0A0A0A] text-white">
                            {record.employee.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-medium">{record.employee}</p>
                          <p className="text-sm text-foreground font-semibold">{record.department}</p>
                        </div>
                        <div className="text-sm text-center">
                          <p className="text-foreground font-semibold">Clock In</p>
                          <p className="font-medium">{record.clockIn}</p>
                        </div>
                        <div className="text-sm text-center">
                          <p className="text-foreground font-semibold">Clock Out</p>
                          <p className="font-medium">{record.clockOut}</p>
                        </div>
                        <div className="text-sm text-center">
                          <p className="text-foreground font-semibold">Hours</p>
                          <p className="font-medium">{record.hours}</p>
                        </div>
                        <Badge 
                          className={
                            record.status === "Present" ? "bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30" :
                            record.status === "Late" ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30" :
                            record.status === "On Leave" ? "bg-[#FFCB00]/20 text-[#FFCB00] border-[#FFCB00]/30" :
                            "bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30"
                          }
                        >
                          {record.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Leave Requests */}
            <Card className="border-border bg-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-foreground font-bold flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-[#FFCB00]" />
                      Pending Leave Requests
                    </CardTitle>
                    <CardDescription className="text-gray-700 dark:text-gray-300 font-medium">Approve or reject employee leave requests</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { employee: "John Smith", type: "Annual Leave", from: "Dec 20, 2024", to: "Dec 27, 2024", days: 5, reason: "Family vacation" },
                    { employee: "Lisa Wong", type: "Sick Leave", from: "Dec 16, 2024", to: "Dec 17, 2024", days: 2, reason: "Medical appointment" },
                    { employee: "Michael Brown", type: "Personal Leave", from: "Dec 18, 2024", to: "Dec 18, 2024", days: 1, reason: "Personal matters" },
                  ].map((leave, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 rounded-lg border border-border bg-white/5">
                      <div className="flex items-center gap-4 flex-1">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-[#0A0A0A] text-white">
                            {leave.employee.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-medium">{leave.employee}</p>
                          <p className="text-sm text-foreground font-semibold">{leave.type}</p>
                        </div>
                        <div className="text-sm">
                          <p className="text-foreground font-semibold">Duration</p>
                          <p className="font-medium">{leave.from} - {leave.to}</p>
                        </div>
                        <div className="text-sm text-center">
                          <p className="text-foreground font-semibold">Days</p>
                          <p className="font-medium">{leave.days}</p>
                        </div>
                        <div className="text-sm max-w-[150px]">
                          <p className="text-foreground font-semibold">Reason</p>
                          <p className="font-medium truncate">{leave.reason}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" className="bg-green-500/20 text-green-600 dark:text-green-400 hover:bg-green-500/30 border border-green-500/30">
                            Approve
                          </Button>
                          <Button size="sm" variant="outline" className="border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/20">
                            Reject
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Job Spec Detail Modal */}
      <Dialog open={!!selectedJobSpec} onOpenChange={() => setSelectedJobSpec(null)}>
        <DialogContent className="max-w-3xl bg-gray-100 dark:bg-zinc-900 border-gray-300 dark:border-zinc-700 max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-[#FFCB00]" />
              {selectedJobSpec?.originalFilename}
            </DialogTitle>
            <DialogDescription>
              Uploaded on {selectedJobSpec && new Date(selectedJobSpec.createdAt).toLocaleString()}
            </DialogDescription>
          </DialogHeader>
          
          {selectedJobSpec && (
            <div className="space-y-6">
              {(() => {
                const data = selectedJobSpec.extractedData as any;
                const formatFileSize = (bytes: number) => {
                  if (bytes === 0) return '0 Bytes';
                  const k = 1024;
                  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
                  const i = Math.floor(Math.log(bytes) / Math.log(k));
                  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
                };
                return (
                  <>
                    {/* Header with Status */}
                    <div className="flex items-center justify-between p-4 bg-gray-200 dark:bg-zinc-800/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge className={
                          selectedJobSpec.status === "processed" 
                            ? "bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30" 
                            : "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/30"
                        }>
                          {selectedJobSpec.status === "processed" ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <AlertCircle className="h-3 w-3 mr-1" />}
                          <span className="capitalize">{selectedJobSpec.status}</span>
                        </Badge>
                        <span className="text-zinc-400 text-sm">{formatFileSize(selectedJobSpec.fileSize || 0)}</span>
                      </div>
                      {selectedJobSpec.linkedJobId && (
                        <Badge className="bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Job Created
                        </Badge>
                      )}
                    </div>

                    {data && (
                      <>
                        {/* Job Information */}
                        <div className="space-y-3">
                          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                            <Briefcase className="h-5 w-5 text-[#FFCB00]" />
                            Job Information
                          </h3>
                          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-200 dark:bg-zinc-800/30 rounded-lg">
                            <div>
                              <p className="text-xs text-zinc-500 mb-1">Job Title</p>
                              <p className="text-foreground font-medium">{data.title || data.jobTitle || "N/A"}</p>
                            </div>
                            <div>
                              <p className="text-xs text-zinc-500 mb-1">Company</p>
                              <p className="text-[#FFCB00]">{data.company || "N/A"}</p>
                            </div>
                            <div>
                              <p className="text-xs text-zinc-500 mb-1">Department</p>
                              <p className="text-foreground">{data.department || "N/A"}</p>
                            </div>
                            <div>
                              <p className="text-xs text-zinc-500 mb-1">Location</p>
                              <p className="text-foreground">{data.location || "N/A"}</p>
                            </div>
                            <div>
                              <p className="text-xs text-zinc-500 mb-1">Employment Type</p>
                              <p className="text-foreground">{data.employmentType || "N/A"}</p>
                            </div>
                            <div>
                              <p className="text-xs text-zinc-500 mb-1">Salary Range</p>
                              <p className="text-green-600 dark:text-green-400">{data.salaryRange || data.salary || "N/A"}</p>
                            </div>
                          </div>
                        </div>

                        {/* Experience Required */}
                        {data.experienceRequired && (
                          <div className="space-y-3">
                            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                              <Clock className="h-5 w-5 text-[#FFCB00]" />
                              Experience Required
                            </h3>
                            <p className="text-zinc-300 text-sm leading-relaxed p-4 bg-gray-200 dark:bg-zinc-800/30 rounded-lg">
                              {data.experienceRequired}
                            </p>
                          </div>
                        )}

                        {/* Job Description */}
                        {data.description && (
                          <div className="space-y-3">
                            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                              <FileText className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                              Job Description
                            </h3>
                            <p className="text-zinc-300 text-sm leading-relaxed p-4 bg-gray-200 dark:bg-zinc-800/30 rounded-lg whitespace-pre-wrap">
                              {data.description}
                            </p>
                          </div>
                        )}

                        {/* Required Skills */}
                        {data.requiredSkills && data.requiredSkills.length > 0 && (
                          <div className="space-y-3">
                            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                              <Award className="h-5 w-5 text-[#FFCB00]" />
                              Required Skills ({data.requiredSkills.length})
                            </h3>
                            <div className="flex flex-wrap gap-2 p-4 bg-gray-200 dark:bg-zinc-800/30 rounded-lg">
                              {data.requiredSkills.map((skill: string, i: number) => (
                                <Badge key={i} className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                                  {skill}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Responsibilities */}
                        {data.responsibilities && data.responsibilities.length > 0 && (
                          <div className="space-y-3">
                            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                              <Target className="h-5 w-5 text-green-600 dark:text-green-400" />
                              Responsibilities ({data.responsibilities.length})
                            </h3>
                            <div className="p-4 bg-gray-200 dark:bg-zinc-800/30 rounded-lg">
                              <ul className="space-y-2">
                                {data.responsibilities.map((resp: string, i: number) => (
                                  <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                                    <span className="text-green-600 dark:text-green-400 mt-1">•</span>
                                    {resp}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        )}

                        {/* Qualifications */}
                        {data.qualifications && data.qualifications.length > 0 && (
                          <div className="space-y-3">
                            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                              <GraduationCap className="h-5 w-5 text-foreground dark:text-foreground" />
                              Qualifications ({data.qualifications.length})
                            </h3>
                            <div className="p-4 bg-gray-200 dark:bg-zinc-800/30 rounded-lg">
                              <ul className="space-y-2">
                                {data.qualifications.map((qual: string, i: number) => (
                                  <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                                    <span className="text-foreground dark:text-foreground mt-1">•</span>
                                    {qual}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        )}

                        {/* Benefits */}
                        {data.benefits && data.benefits.length > 0 && (
                          <div className="space-y-3">
                            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                              <Star className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                              Benefits ({data.benefits.length})
                            </h3>
                            <div className="flex flex-wrap gap-2 p-4 bg-gray-200 dark:bg-zinc-800/30 rounded-lg">
                              {data.benefits.map((benefit: string, i: number) => (
                                <Badge key={i} variant="outline" className="text-xs border-yellow-500/30 text-yellow-300">
                                  {benefit}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {/* Raw Text Preview */}
                    {selectedJobSpec.rawText && (
                      <div className="space-y-2">
                        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                          <FileText className="h-4 w-4 text-zinc-400" />
                          Raw Text Preview
                        </h3>
                        <ScrollArea className="h-40 p-3 bg-gray-200 dark:bg-zinc-800/50 rounded-lg">
                          <p className="text-xs text-zinc-500 whitespace-pre-wrap">
                            {selectedJobSpec.rawText.slice(0, 2000)}
                            {selectedJobSpec.rawText.length > 2000 && "..."}
                          </p>
                        </ScrollArea>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Job Detail Dialog */}
      <Dialog open={isJobDetailOpen} onOpenChange={setIsJobDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-[#FFCB00]" />
              {selectedJob?.title || 'Job Details'}
            </DialogTitle>
            <DialogDescription>
              Full job specification details
            </DialogDescription>
          </DialogHeader>
          
          {selectedJob && (
            <div className="space-y-6 py-4">
              {/* Header Info */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {selectedJob.customer && (
                  <div className="bg-gray-200 dark:bg-zinc-800/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Customer</p>
                    <p className="font-medium text-foreground">{selectedJob.customer}</p>
                  </div>
                )}
                {selectedJob.department && (
                  <div className="bg-gray-200 dark:bg-zinc-800/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Department</p>
                    <p className="font-medium text-foreground">{selectedJob.department}</p>
                  </div>
                )}
                <div className="bg-gray-200 dark:bg-zinc-800/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge className={`${selectedJob.status === 'Active' ? 'bg-green-500/20 text-green-600 dark:text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                    {selectedJob.status}
                  </Badge>
                </div>
                {(selectedJob.city || selectedJob.province || selectedJob.location) && (
                  <div className="bg-gray-200 dark:bg-zinc-800/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Location</p>
                    <p className="font-medium text-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {selectedJob.city && selectedJob.province 
                        ? `${selectedJob.city}, ${selectedJob.province}` 
                        : selectedJob.location}
                    </p>
                  </div>
                )}
                {selectedJob.remuneration && (
                  <div className="bg-gray-200 dark:bg-zinc-800/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Remuneration</p>
                    <p className="font-medium text-green-600 dark:text-green-400">{selectedJob.remuneration}</p>
                  </div>
                )}
                {(selectedJob.salaryMin || selectedJob.salaryMax) && !selectedJob.remuneration && (
                  <div className="bg-gray-200 dark:bg-zinc-800/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Salary Range</p>
                    <p className="font-medium text-green-600 dark:text-green-400">
                      R{selectedJob.salaryMin?.toLocaleString() || '0'} - R{selectedJob.salaryMax?.toLocaleString() || '0'}
                    </p>
                  </div>
                )}
                {selectedJob.gender && (
                  <div className="bg-gray-200 dark:bg-zinc-800/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Gender</p>
                    <p className="font-medium text-foreground">{selectedJob.gender}</p>
                  </div>
                )}
              </div>

              {/* Introduction */}
              {selectedJob.introduction && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-[#FFCB00]">Introduction</h3>
                  <p className="text-sm text-muted-foreground bg-gray-200 dark:bg-zinc-800/30 rounded-lg p-3">
                    {selectedJob.introduction}
                  </p>
                </div>
              )}

              {/* Description */}
              {selectedJob.description && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-[#FFCB00]">Description</h3>
                  <p className="text-sm text-muted-foreground bg-gray-200 dark:bg-zinc-800/30 rounded-lg p-3">
                    {selectedJob.description}
                  </p>
                </div>
              )}

              {/* Duties */}
              {selectedJob.duties && selectedJob.duties.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-[#FFCB00]">Duties & Responsibilities</h3>
                  <ul className="space-y-1 bg-gray-200 dark:bg-zinc-800/30 rounded-lg p-3">
                    {selectedJob.duties.map((duty: string, i: number) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-[#FFCB00] mt-1">•</span>
                        {duty}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Attributes */}
              {selectedJob.attributes && selectedJob.attributes.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-green-600 dark:text-green-400">Attributes, Skills & Competencies</h3>
                  <ul className="space-y-1 bg-gray-200 dark:bg-zinc-800/30 rounded-lg p-3">
                    {selectedJob.attributes.map((attr: string, i: number) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-green-600 dark:text-green-400 mt-1">•</span>
                        {attr}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Qualifications */}
              {selectedJob.qualifications && selectedJob.qualifications.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-amber-600 dark:text-amber-400">Qualifications</h3>
                  <ul className="space-y-1 bg-gray-200 dark:bg-zinc-800/30 rounded-lg p-3">
                    {selectedJob.qualifications.map((qual: string, i: number) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-amber-600 dark:text-amber-400 mt-1">•</span>
                        {qual}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Ethics */}
              {selectedJob.ethics && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-[#FFCB00]">Ethics & Values</h3>
                  <p className="text-sm text-muted-foreground bg-gray-200 dark:bg-zinc-800/30 rounded-lg p-3">
                    {selectedJob.ethics}
                  </p>
                </div>
              )}

              {/* Requirements */}
              {selectedJob.requirements && selectedJob.requirements.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-foreground">Requirements</h3>
                  <ul className="space-y-1 bg-gray-200 dark:bg-zinc-800/30 rounded-lg p-3">
                    {selectedJob.requirements.map((req: string, i: number) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-foreground mt-1">•</span>
                        {req}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Benefits */}
              {selectedJob.benefits && selectedJob.benefits.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-yellow-600 dark:text-yellow-400">Benefits</h3>
                  <div className="flex flex-wrap gap-2 bg-gray-200 dark:bg-zinc-800/30 rounded-lg p-3">
                    {selectedJob.benefits.map((benefit: string, i: number) => (
                      <Badge key={i} variant="outline" className="text-xs border-yellow-500/30 text-yellow-300">
                        {benefit}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-border">
                <Link href={`/recruitment-agent?jobId=${selectedJob.id}`} className="flex-1">
                  <Button className="w-full bg-[#FFCB00] hover:bg-[#E6B800]">
                    <Search className="h-4 w-4 mr-2" />
                    Start Candidate Search
                  </Button>
                </Link>
                <Link href={`/candidates-list?jobId=${selectedJob.id}`}>
                  <Button variant="outline">
                    <Eye className="h-4 w-4 mr-2" />
                    View Candidates
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
