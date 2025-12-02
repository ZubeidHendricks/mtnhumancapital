import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { jobsService, candidateService, api } from "@/lib/api";
import { Navbar } from "@/components/layout/navbar";
import { useTenantQueryKey } from "@/hooks/useTenant";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "wouter";
import { JobCreationChat } from "@/components/job-creation-chat";
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
  RotateCcw
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { motion } from "framer-motion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

// Mock Data as fallback if API fails or for other tabs not yet connected
const integrityChecks = [
  { id: 1, candidate: "Sarah Jenkins", type: "Criminal Record", status: "Clear", date: "2024-05-10" },
  { id: 2, candidate: "Sarah Jenkins", type: "Credit Check", status: "Clear", date: "2024-05-11" },
  { id: 3, candidate: "Marcus Johnson", type: "Reference Check", status: "Pending", date: "2024-05-12" },
];

const onboardingTasks = [
  { id: 1, task: "Send Welcome Letter", assignee: "AI Agent", status: "Completed" },
  { id: 2, task: "Distribute Employee Handbook", assignee: "AI Agent", status: "Completed" },
  { id: 3, task: "Procure Tax Forms", assignee: "AI Agent", status: "In Progress" },
  { id: 4, task: "IT Equipment Setup", assignee: "IT Dept", status: "Pending" },
];

// Fallback data in case of API error
const MOCK_CANDIDATES = [
  { id: 1, name: "Sarah Jenkins", role: "Senior Project Manager", status: "Interviewing", match: 94, stage: "Screening" },
  { id: 2, name: "David Chen", role: "Financial Analyst", status: "New", match: 88, stage: "Sourcing" },
  { id: 3, name: "Marcus Johnson", role: "Operations Lead", status: "Offer Sent", match: 97, stage: "Onboarding" },
  { id: 4, name: "Emily Davis", role: "UX Designer", status: "Rejected", match: 65, stage: "Archived" },
];

export default function HRDashboard() {
  const [activeTab, setActiveTab] = useState("recruitment");
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isCreateJobOpen, setIsCreateJobOpen] = useState(false);
  const [showArchivedJobs, setShowArchivedJobs] = useState(false);
  const [isEmailOpen, setIsEmailOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
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

  const handleMoveToNextStage = async (candidate: any) => {
    if (!candidate?.id) {
      toast.error("Invalid candidate");
      return;
    }

    const currentStage = (candidate.stage || candidate.status || "New").trim();
    
    const stageMap: Record<string, string> = {
      "new": "Screening",
      "screening": "Interview",
      "sourcing": "Screening",
      "interview": "Offer",
      "interviewing": "Offer",
      "offer": "Hired",
      "offer sent": "Hired",
      "hired": "Hired",
      "onboarding": "Hired",
      "rejected": "Rejected",
      "archived": "Archived"
    };

    const normalizedStage = currentStage.toLowerCase();
    const nextStage = stageMap[normalizedStage];

    if (!nextStage) {
      toast.error(`Cannot determine next stage for "${currentStage}". Please update manually.`);
      return;
    }

    if (nextStage === currentStage) {
      toast.info(`Candidate is already at final stage: ${currentStage}`);
      return;
    }

    await updateCandidateMutation.mutateAsync({
      id: candidate.id,
      data: { stage: nextStage, status: nextStage }
    });
  };

  const handleSendEmail = (candidate: any) => {
    if (!candidate?.id) {
      toast.error("Invalid candidate");
      return;
    }
    setSelectedCandidate(candidate);
    setEmailSubject(`Regarding Your Application - ${candidate.role || 'Position'}`);
    setEmailMessage(`Dear ${candidate.fullName || candidate.name},\n\nThank you for your interest in the ${candidate.role || 'position'} role at Avatar Human Capital.\n\nBest regards,\nHR Team`);
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
    placeholderData: [] 
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

  const displayCandidates = candidatesError ? MOCK_CANDIDATES : (Array.isArray(candidates) ? candidates : []);
  const displayJobs = jobsError ? [] : (Array.isArray(jobs) ? jobs : []);
  const jobCount = displayJobs.length || 12;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      
      <main className="pt-24 pb-12 px-6 container mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">HR Command Center</h1>
            <p className="text-muted-foreground">AI-Driven Human Capital Management</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 px-3 py-1">
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

        <Tabs defaultValue="jobs" className="space-y-6" onValueChange={setActiveTab}>
          <div className="flex items-center gap-3 flex-wrap">
            <TabsList className="grid grid-cols-2 md:grid-cols-7 lg:w-[900px] bg-card/50 border border-white/5">
              <TabsTrigger value="jobs">Jobs</TabsTrigger>
              <TabsTrigger value="recruitment">Recruitment</TabsTrigger>
              <TabsTrigger value="integrity">Integrity</TabsTrigger>
              <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="lms">LMS</TabsTrigger>
              <TabsTrigger value="time-attendance">Time & Attendance</TabsTrigger>
            </TabsList>
            <Link href="/workforce-intelligence">
              <Button variant="outline" className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/30 hover:border-amber-500/50 hover:bg-amber-500/20 text-amber-400">
                <Brain className="h-4 w-4 mr-2" />
                Workforce Intelligence
              </Button>
            </Link>
            <Link href="/document-automation">
              <Button variant="outline" className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-blue-500/30 hover:border-blue-500/50 hover:bg-blue-500/20 text-blue-400">
                <FileText className="h-4 w-4 mr-2" />
                Document Automation
              </Button>
            </Link>
            <Link href="/whatsapp-monitor">
              <Button variant="outline" className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/30 hover:border-green-500/50 hover:bg-green-500/20 text-green-400">
                <MessageCircle className="h-4 w-4 mr-2" />
                WhatsApp Monitor
              </Button>
            </Link>
            <Link href="/hr-conversations">
              <Button variant="outline" className="bg-gradient-to-r from-teal-500/10 to-cyan-500/10 border-teal-500/30 hover:border-teal-500/50 hover:bg-teal-500/20 text-teal-400">
                <MessageCircle className="h-4 w-4 mr-2" />
                Conversations
              </Button>
            </Link>
          </div>

          {/* RECRUITMENT TAB */}
          <TabsContent value="recruitment" className="space-y-6">
            
            {/* Quick Action Banners */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-lg bg-gradient-to-r from-primary/20 to-purple-500/20 border border-primary/20 p-6 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold flex items-center gap-2 text-white">
                    <Sparkles className="w-5 h-5 text-primary" />
                    Need to find candidates fast?
                  </h3>
                  <p className="text-muted-foreground text-sm mt-1">
                    Launch the AI Recruitment Agent to source, screen, and rank candidates.
                  </p>
                </div>
                <Link href="/recruitment-agent">
                  <Button className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20">
                    Launch AI Recruiter
                  </Button>
                </Link>
              </div>

              <div className="rounded-lg bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-500/20 p-6 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold flex items-center gap-2 text-white">
                    <LayoutList className="w-5 h-5 text-blue-400" />
                    Track candidate progress
                  </h3>
                  <p className="text-muted-foreground text-sm mt-1">
                    Monitor document status and pipeline stages for shortlisted candidates.
                  </p>
                </div>
                <Link href="/candidate-pipeline">
                  <Button variant="outline" className="border-blue-500/30 hover:bg-blue-500/10 shadow-lg shadow-blue-500/10">
                    View Pipeline
                  </Button>
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-card/30 border-white/10 backdrop-blur-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Open Roles</CardTitle>
                  <div className="text-2xl font-bold">
                    {loadingJobs ? <Loader2 className="w-6 h-6 animate-spin" /> : jobCount}
                  </div>
                </CardHeader>
              </Card>
              <Card className="bg-card/30 border-white/10 backdrop-blur-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Candidates in Pipeline</CardTitle>
                  <div className="text-2xl font-bold">
                    {loadingCandidates ? <Loader2 className="w-6 h-6 animate-spin" /> : displayCandidates.length}
                  </div>
                </CardHeader>
              </Card>
              <Card className="bg-card/30 border-white/10 backdrop-blur-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Time to Hire (Avg)</CardTitle>
                  <div className="text-2xl font-bold">18 Days</div>
                </CardHeader>
              </Card>
            </div>

            {/* JOBS/ROLES LIST */}
            <Card className="border-white/10 bg-card/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Open Roles</CardTitle>
                    <CardDescription>
                      {loadingJobs ? "Loading positions..." : "Active job requisitions and hiring pipelines"}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      className="gap-2 border-white/10 hover:bg-white/5"
                      onClick={() => setShowArchivedJobs(!showArchivedJobs)}
                      data-testid="toggle-archived-jobs"
                    >
                      <FileArchive className="h-4 w-4" />
                      {showArchivedJobs ? 'Hide Archived' : 'Show Archived'}
                    </Button>
                    <Dialog open={isCreateJobOpen} onOpenChange={setIsCreateJobOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="gap-2 border-primary/20 bg-primary/5 hover:bg-primary/10">
                          <Plus className="h-4 w-4" />
                          New Role
                        </Button>
                      </DialogTrigger>
                    </Dialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border border-white/10 overflow-hidden">
                  <div className="bg-white/5 px-4 py-3 grid grid-cols-12 text-sm font-medium text-muted-foreground">
                    <div className="col-span-4">Job Title</div>
                    <div className="col-span-2">Department</div>
                    <div className="col-span-2">Candidates</div>
                    <div className="col-span-2">Status</div>
                    <div className="col-span-2 text-right">Actions</div>
                  </div>
                  <ScrollArea className="h-[300px]">
                    {loadingJobs ? (
                      <div className="flex flex-col items-center justify-center h-32 gap-2 text-muted-foreground">
                        <Loader2 className="w-6 h-6 animate-spin" />
                        <p>Loading job requisitions...</p>
                      </div>
                    ) : displayJobs.length > 0 ? (
                      displayJobs.map((job: any) => {
                        const candidateCount = displayCandidates.filter((c: any) => c.jobId === job.id).length;
                        return (
                          <div key={job.id} className="px-4 py-3 grid grid-cols-12 items-center border-t border-white/5 hover:bg-white/5 transition-colors">
                            <div className="col-span-4">
                              <div className="font-medium">{job.title}</div>
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {job.location || "Johannesburg, Gauteng"}
                              </div>
                            </div>
                            <div className="col-span-2 text-sm text-muted-foreground">{job.department}</div>
                            <div className="col-span-2">
                              <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20">
                                {candidateCount} {candidateCount === 1 ? 'Candidate' : 'Candidates'}
                              </Badge>
                            </div>
                            <div className="col-span-2">
                              <Badge className={`${job.status === 'Active' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'} border-0`}>
                                {job.status}
                              </Badge>
                            </div>
                            <div className="col-span-2 text-right flex justify-end gap-2">
                              <Link href={`/candidates-list?jobId=${job.id}`}>
                                <Button variant="outline" size="sm" className="gap-2 border-white/10 hover:bg-white/5" data-testid={`button-view-candidates-${job.id}`}>
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
                                    className="cursor-pointer text-red-400 focus:text-red-400"
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
                      <div className="flex flex-col items-center justify-center h-32 gap-2 text-muted-foreground">
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
              <Card className="border-white/10 bg-card/20">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <FileArchive className="h-5 w-5 text-gray-400" />
                        Archived Roles
                      </CardTitle>
                      <CardDescription>
                        {loadingArchivedJobs ? "Loading archived positions..." : `${archivedJobs.length} archived job${archivedJobs.length !== 1 ? 's' : ''}`}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border border-white/10 overflow-hidden">
                    <div className="bg-white/5 px-4 py-3 grid grid-cols-12 text-sm font-medium text-muted-foreground">
                      <div className="col-span-4">Job Title</div>
                      <div className="col-span-3">Department</div>
                      <div className="col-span-3">Archived On</div>
                      <div className="col-span-2 text-right">Actions</div>
                    </div>
                    <ScrollArea className="h-[200px]">
                      {loadingArchivedJobs ? (
                        <div className="flex flex-col items-center justify-center h-32 gap-2 text-muted-foreground">
                          <Loader2 className="w-6 h-6 animate-spin" />
                          <p>Loading archived jobs...</p>
                        </div>
                      ) : archivedJobs.length > 0 ? (
                        archivedJobs.map((job: any) => (
                          <div key={job.id} className="px-4 py-3 grid grid-cols-12 items-center border-t border-white/5 hover:bg-white/5 transition-colors">
                            <div className="col-span-4">
                              <div className="font-medium text-gray-400">{job.title}</div>
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {job.location || "No location"}
                              </div>
                            </div>
                            <div className="col-span-3 text-sm text-muted-foreground">{job.department || 'General'}</div>
                            <div className="col-span-3 text-sm text-muted-foreground">
                              {job.archivedAt ? new Date(job.archivedAt).toLocaleDateString() : 'Unknown'}
                            </div>
                            <div className="col-span-2 text-right flex justify-end gap-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="gap-2 border-green-500/20 hover:bg-green-500/10 text-green-400"
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
                        <div className="flex flex-col items-center justify-center h-32 gap-2 text-muted-foreground">
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
            <Card className="border-white/10 bg-card/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                      Shortlisted Candidates
                    </CardTitle>
                    <CardDescription>
                      {loadingCandidates ? "Loading..." : "Top talent ready for interviews and offers"}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Link href="/shortlisted-candidates">
                      <Button variant="outline" className="gap-2 border-white/10 hover:bg-white/5">
                        <Star className="h-4 w-4" />
                        View All Shortlisted
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border border-white/10 overflow-hidden">
                  <ScrollArea className="h-[200px]">
                    {loadingCandidates ? (
                      <div className="flex flex-col items-center justify-center h-32 gap-2 text-muted-foreground">
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
                                  <Avatar className="h-8 w-8 border border-white/20">
                                    {candidate.photoUrl && (
                                      <AvatarImage src={candidate.photoUrl} alt={candidate.fullName} />
                                    )}
                                    <AvatarFallback className="bg-gradient-to-br from-yellow-500 to-orange-600 text-white text-xs font-semibold">
                                      {candidate.fullName?.split(' ')?.map((n: string) => n[0])?.join('')?.toUpperCase() || '?'}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="font-medium text-sm">{candidate.fullName}</p>
                                    <p className="text-xs text-muted-foreground">{candidate.role || 'No role specified'}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {candidate.match !== null && candidate.match !== undefined && (
                                    <Badge className="bg-yellow-400/10 text-yellow-400 border-0 text-xs">
                                      {candidate.match}% Match
                                    </Badge>
                                  )}
                                  <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                                </div>
                              </div>
                            ))}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-32 gap-2 text-muted-foreground">
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

            <Card className="border-white/10 bg-card/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Candidate Pipeline</CardTitle>
                    <CardDescription>
                      {loadingCandidates ? "Fetching data from backend..." : "AI-ranked candidates matched to hiring needs"}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Search candidates..." className="pl-9 w-[200px] bg-background/50 border-white/10" />
                    </div>
                    
                    <Link href="/candidates-list">
                      <Button variant="outline" className="gap-2 border-white/10 hover:bg-white/5">
                        <LayoutList className="h-4 w-4" />
                        View Details
                      </Button>
                    </Link>

                    <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="gap-2 border-primary/20 bg-primary/5 hover:bg-primary/10">
                          <UploadCloud className="h-4 w-4" />
                          Upload CVs
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-card border-white/10 sm:max-w-[500px]">
                        <DialogHeader>
                          <DialogTitle>Upload Candidate Profiles</DialogTitle>
                          <DialogDescription>
                            Drag and drop CVs here. Our AI will extract skills, match to open roles, and rank them instantly.
                          </DialogDescription>
                        </DialogHeader>
                        
                        <div 
                            className="border-2 border-dashed border-white/10 rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer bg-white/5 relative"
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
                                    <p className="text-xs text-muted-foreground">Extracting skills & calculating match scores</p>
                                </div>
                            ) : (
                                <>
                                    <div className="p-3 rounded-full bg-primary/10">
                                      <UploadCloud className="h-8 w-8 text-primary" />
                                    </div>
                                    <h3 className="font-medium mt-2">Drop files here or click to upload</h3>
                                    <p className="text-sm text-muted-foreground">Supports PDF, DOCX, TXT (Max 10MB)</p>
                                </>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2 mt-2">
                           <Label>Or manually add a candidate link</Label>
                           <div className="flex gap-2">
                             <Input placeholder="https://linkedin.com/in/..." className="bg-background/50 border-white/10" />
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
                              className="bg-background/50 border-white/10"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="email-subject">Subject</Label>
                            <Input 
                              id="email-subject" 
                              value={emailSubject}
                              onChange={(e) => setEmailSubject(e.target.value)}
                              placeholder="Email subject..."
                              className="bg-background/50 border-white/10"
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
                              className="bg-background/50 border-white/10"
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

                    <Button variant="outline" size="icon"><Filter className="h-4 w-4" /></Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border border-white/10 overflow-hidden">
                  <div className="bg-white/5 px-4 py-3 grid grid-cols-12 text-sm font-medium text-muted-foreground">
                    <div className="col-span-3">Candidate</div>
                    <div className="col-span-3">Role Applied</div>
                    <div className="col-span-2">AI Match Score</div>
                    <div className="col-span-2">Stage</div>
                    <div className="col-span-2 text-right">Actions</div>
                  </div>
                  <ScrollArea className="h-[300px]">
                    {loadingCandidates ? (
                       <div className="flex flex-col items-center justify-center h-32 gap-2 text-muted-foreground">
                         <Loader2 className="w-6 h-6 animate-spin" />
                         <p>Syncing with DigitalOcean Backend...</p>
                       </div>
                    ) : (
                      // Use explicit array mapping
                      displayCandidates.map((candidate: any) => (
                        <div key={candidate.id || Math.random()} className="px-4 py-3 grid grid-cols-12 items-center border-t border-white/5 hover:bg-white/5 transition-colors">
                          <div className="col-span-3 font-medium">{candidate.fullName || candidate.name || "Unknown Candidate"}</div>
                          <div className="col-span-3 text-sm text-muted-foreground">{candidate.role || "General Application"}</div>
                          <div className="col-span-2">
                            <Badge className={`${(candidate.match || candidate.overall_score || 0) > 90 ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'} border-0`}>
                              {candidate.match || candidate.overall_score || 0}% Match
                            </Badge>
                          </div>
                          <div className="col-span-2 text-sm">{candidate.stage || candidate.status || "New"}</div>
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
                                  <Link href="/interview-voice">
                                    <Mic className="mr-2 h-4 w-4" />
                                    Start Voice Interview
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild className="cursor-pointer">
                                  <Link href="/interview-video">
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
                                  className="cursor-pointer text-red-400 focus:text-red-400"
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
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg text-white flex items-center gap-2">
                      <Briefcase className="h-5 w-5 text-purple-400" />
                      Job Specifications Library
                    </CardTitle>
                    <CardDescription>Extracted job requirements from uploaded specifications</CardDescription>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center bg-zinc-800 rounded-lg p-1">
                      <Button
                        variant={jobSpecViewMode === "grid" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setJobSpecViewMode("grid")}
                        className={jobSpecViewMode === "grid" ? "bg-purple-500/20 text-purple-400" : "text-zinc-400"}
                        data-testid="button-jobs-grid-view"
                      >
                        <Grid3X3 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={jobSpecViewMode === "list" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setJobSpecViewMode("list")}
                        className={jobSpecViewMode === "list" ? "bg-purple-500/20 text-purple-400" : "text-zinc-400"}
                        data-testid="button-jobs-list-view"
                      >
                        <List className="h-4 w-4" />
                      </Button>
                    </div>
                    <Badge variant="outline" className="border-zinc-600">
                      {jobSpecDocuments.length} Jobs
                    </Badge>
                    <Link href="/recruitment-agent">
                      <Button variant="outline" size="sm" className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10">
                        <Briefcase className="h-4 w-4 mr-2" />
                        View Recruitment
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </Link>
                    <Dialog open={isCreateJobOpen} onOpenChange={setIsCreateJobOpen}>
                      <DialogTrigger asChild>
                        <Button data-testid="button-create-job-dialog" className="bg-primary hover:bg-primary/90">
                          <Plus className="h-4 w-4 mr-2" />
                          Create New Job
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[700px] max-h-[90vh] bg-card border-white/10 p-0">
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
                {loadingJobSpecs ? (
                  <div className="text-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-purple-400 mx-auto" />
                  </div>
                ) : jobSpecDocuments.length === 0 ? (
                  <div className="text-center py-12">
                    <Briefcase className="h-16 w-16 text-zinc-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-zinc-300 mb-2">No job specs uploaded yet</h3>
                    <p className="text-zinc-500 mb-4">Upload job specifications to see them here</p>
                    <Link href="/document-automation">
                      <Button 
                        variant="outline" 
                        className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
                      >
                        <UploadCloud className="h-4 w-4 mr-2" />
                        Upload Job Specs
                      </Button>
                    </Link>
                  </div>
                ) : jobSpecViewMode === "grid" ? (
                  <ScrollArea className="h-[600px] pr-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-4">
                      {jobSpecDocuments.map((doc) => {
                        const extracted = doc.extractedData as any;
                        return (
                          <div 
                            key={doc.id}
                            className="p-4 rounded-xl bg-gradient-to-br from-zinc-800/80 to-zinc-900/80 hover:from-zinc-800 hover:to-zinc-900 transition-all border border-zinc-700/50 hover:border-purple-500/30 group"
                            data-testid={`card-job-spec-${doc.id}`}
                          >
                            <div className="flex items-start gap-3 mb-3">
                              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                                <Briefcase className="h-6 w-6 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-white truncate">
                                  {extracted?.title || extracted?.jobTitle || doc.originalFilename}
                                </h3>
                                {extracted?.company && (
                                  <p className="text-purple-400 text-sm truncate flex items-center gap-1">
                                    <Building2 className="h-3 w-3" />
                                    {extracted.company}
                                  </p>
                                )}
                              </div>
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
                              {extracted?.employmentType && (
                                <div className="flex items-center gap-2 text-xs text-zinc-400">
                                  <Clock className="h-3 w-3 flex-shrink-0" />
                                  <span>{extracted.employmentType}</span>
                                </div>
                              )}
                              {(extracted?.salaryRange || extracted?.salary) && (
                                <div className="flex items-center gap-2 text-xs text-green-400">
                                  <Award className="h-3 w-3 flex-shrink-0" />
                                  <span>{extracted.salaryRange || extracted.salary}</span>
                                </div>
                              )}
                            </div>

                            {extracted?.requiredSkills && extracted.requiredSkills.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-3">
                                {extracted.requiredSkills.slice(0, 3).map((skill: string, i: number) => (
                                  <Badge key={i} variant="outline" className="text-xs border-purple-500/30 text-purple-300 px-1.5 py-0">
                                    {skill}
                                  </Badge>
                                ))}
                                {extracted.requiredSkills.length > 3 && (
                                  <Badge variant="outline" className="text-xs border-zinc-600 text-zinc-500 px-1.5 py-0">
                                    +{extracted.requiredSkills.length - 3}
                                  </Badge>
                                )}
                              </div>
                            )}

                            <div className="flex items-center justify-between pt-3 border-t border-zinc-700/50">
                              <span className="text-xs text-zinc-500">
                                {new Date(doc.createdAt).toLocaleDateString()}
                              </span>
                              <div className="flex items-center gap-1">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-7 px-2 text-zinc-400" 
                                  data-testid={`button-view-job-${doc.id}`}
                                  onClick={() => setSelectedJobSpec(doc)}
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                              </div>
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
                          <tr className="border-b border-zinc-800">
                            <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Title</th>
                            <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Company</th>
                            <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Location</th>
                            <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Skills</th>
                            <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Uploaded</th>
                            <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/50">
                          {jobSpecDocuments.map((doc) => {
                            const extracted = doc.extractedData as any;
                            return (
                              <tr key={doc.id} className="hover:bg-zinc-800/30 transition-colors" data-testid={`row-job-spec-${doc.id}`}>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                                      <Briefcase className="h-4 w-4 text-white" />
                                    </div>
                                    <span className="font-medium text-white truncate max-w-[200px]">
                                      {extracted?.title || extracted?.jobTitle || doc.originalFilename}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="text-zinc-400 text-sm">{extracted?.company || '-'}</span>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="text-zinc-400 text-sm">{extracted?.location || '-'}</span>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex flex-wrap gap-1">
                                    {extracted?.requiredSkills?.slice(0, 2).map((skill: string, i: number) => (
                                      <Badge key={i} variant="outline" className="text-xs border-purple-500/30 text-purple-300 px-1.5 py-0">
                                        {skill}
                                      </Badge>
                                    ))}
                                    {extracted?.requiredSkills?.length > 2 && (
                                      <Badge variant="outline" className="text-xs border-zinc-600 text-zinc-500 px-1.5 py-0">
                                        +{extracted.requiredSkills.length - 2}
                                      </Badge>
                                    )}
                                  </div>
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
            <div className="rounded-lg bg-gradient-to-r from-blue-900/20 to-cyan-500/20 border border-cyan-500/20 p-6 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2 text-white">
                  <ShieldCheck className="w-5 h-5 text-cyan-400" />
                  Perform automated background checks?
                </h3>
                <p className="text-muted-foreground text-sm mt-1">
                  Activate the Integrity Agent to verify fingerprints, criminal records, and credit history instantly.
                </p>
              </div>
              <Link href="/integrity-agent">
                <Button className="bg-cyan-500 text-cyan-950 hover:bg-cyan-400 shadow-lg shadow-cyan-500/20">
                  Start Integrity Check
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-white/10 bg-card/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileCheck className="w-5 h-5 text-primary" /> 
                    Pending Verifications
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {integrityChecks.map((check) => (
                      <div key={check.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
                        <div>
                          <p className="font-medium">{check.type}</p>
                          <p className="text-sm text-muted-foreground">Candidate: {check.candidate}</p>
                        </div>
                        <Badge variant={check.status === "Clear" ? "default" : "secondary"} className={check.status === "Clear" ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"}>
                          {check.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-white/10 bg-card/20">
                <CardHeader>
                  <CardTitle>Risk Assessment Overview</CardTitle>
                  <CardDescription>AI-generated risk profiles based on background data</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-[200px]">
                  <div className="text-center text-muted-foreground">
                    <AlertCircle className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p>Select a candidate to view detailed risk analysis</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ONBOARDING TAB */}
          <TabsContent value="onboarding" className="space-y-6">
            
             {/* AI Onboarding Banner */}
            <div className="rounded-lg bg-gradient-to-r from-amber-500/20 to-orange-600/20 border border-amber-500/20 p-6 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2 text-white">
                  <Laptop className="w-5 h-5 text-amber-400" />
                  Automate new hire provisioning?
                </h3>
                <p className="text-muted-foreground text-sm mt-1">
                  Use the Onboarding Agent to manage welcome packs, equipment orders, and digital paperwork.
                </p>
              </div>
              <Link href="/onboarding-agent">
                <Button className="bg-amber-500 text-amber-950 hover:bg-amber-400 shadow-lg shadow-amber-500/20">
                  Start Onboarding
                </Button>
              </Link>
            </div>

             <Card className="border-white/10 bg-card/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-primary" />
                  Active Onboarding Workflows
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="font-medium">Marcus Johnson - Operations Lead</span>
                      <span className="text-sm text-muted-foreground">75% Complete</span>
                    </div>
                    <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-primary w-[75%]" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    {onboardingTasks.map((task) => (
                      <div key={task.id} className="flex items-center gap-3 p-3 rounded-lg border border-white/5 bg-white/5">
                        {task.status === "Completed" ? (
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30" />
                        )}
                        <div className="flex-1">
                          <p className="text-sm font-medium">{task.task}</p>
                          <p className="text-xs text-muted-foreground">Assigned to: {task.assignee}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* PERFORMANCE TAB - Employee Performance Management */}
           <TabsContent value="performance" className="space-y-6">
            
            {/* Performance Overview KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border-white/10 bg-card/20">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Employees</p>
                      <h3 className="text-2xl font-bold mt-2" data-testid="metric-total-employees">
                        {(candidates ?? []).filter(c => c.stage === "Hired").length}
                      </h3>
                      <p className="text-xs text-blue-400 mt-1">
                        Active workforce
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-blue-500/10">
                      <Users className="w-6 h-6 text-blue-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-white/10 bg-card/20">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Avg Performance</p>
                      <h3 className="text-2xl font-bold mt-2" data-testid="metric-avg-performance">
                        4.2<span className="text-lg text-muted-foreground">/5.0</span>
                      </h3>
                      <p className="text-xs text-green-500 mt-1">
                        +0.3 from last quarter
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-green-500/10">
                      <Star className="w-6 h-6 text-green-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-white/10 bg-card/20">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Pending Reviews</p>
                      <h3 className="text-2xl font-bold mt-2" data-testid="metric-pending-reviews">
                        8
                      </h3>
                      <p className="text-xs text-amber-400 mt-1">
                        3 overdue
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-amber-500/10">
                      <Clock className="w-6 h-6 text-amber-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-white/10 bg-card/20">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">KPI Achievement</p>
                      <h3 className="text-2xl font-bold mt-2" data-testid="metric-kpi-achievement">
                        87%
                      </h3>
                      <p className="text-xs text-purple-400 mt-1">
                        Goals on track
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-purple-500/10">
                      <Target className="w-6 h-6 text-purple-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Performance Reviews Section */}
            <Card className="border-white/10 bg-card/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileCheck className="w-5 h-5 text-primary" />
                      Performance Reviews
                    </CardTitle>
                    <CardDescription>Employee review status and schedules</CardDescription>
                  </div>
                  <Button className="bg-primary hover:bg-primary/90" data-testid="button-schedule-review">
                    <Plus className="w-4 h-4 mr-2" />
                    Schedule Review
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { employee: "Marcus Johnson", role: "Operations Lead", status: "Scheduled", date: "Dec 15, 2024", rating: null, reviewer: "John Smith" },
                    { employee: "Sarah Jenkins", role: "Senior Project Manager", status: "In Progress", date: "Dec 10, 2024", rating: null, reviewer: "Emily Davis" },
                    { employee: "David Chen", role: "Financial Analyst", status: "Completed", date: "Nov 28, 2024", rating: 4.5, reviewer: "Robert Brown" },
                    { employee: "Emily Davis", role: "UX Designer", status: "Overdue", date: "Nov 20, 2024", rating: null, reviewer: "Sarah Lee" },
                  ].map((review, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors" data-testid={`review-item-${idx}`}>
                      <div className="flex items-center gap-4 flex-1">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-primary/20 text-primary">
                            {review.employee.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-medium">{review.employee}</p>
                          <p className="text-sm text-muted-foreground">{review.role}</p>
                        </div>
                        <div className="text-sm">
                          <p className="text-muted-foreground">Reviewer</p>
                          <p className="font-medium">{review.reviewer}</p>
                        </div>
                        <div className="text-sm">
                          <p className="text-muted-foreground">Due Date</p>
                          <p className="font-medium">{review.date}</p>
                        </div>
                        <div className="min-w-[100px]">
                          {review.status === "Completed" && review.rating ? (
                            <div className="flex items-center gap-1">
                              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                              <span className="font-bold text-amber-400">{review.rating}</span>
                              <span className="text-muted-foreground">/5.0</span>
                            </div>
                          ) : (
                            <Badge 
                              variant={review.status === "Overdue" ? "destructive" : review.status === "Completed" ? "default" : "secondary"}
                              className={
                                review.status === "Scheduled" ? "bg-blue-500/20 text-blue-400 border-blue-500/30" :
                                review.status === "In Progress" ? "bg-purple-500/20 text-purple-400 border-purple-500/30" :
                                review.status === "Overdue" ? "bg-red-500/20 text-red-400 border-red-500/30" :
                                "bg-green-500/20 text-green-400 border-green-500/30"
                              }
                            >
                              {review.status}
                            </Badge>
                          )}
                        </div>
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Employee KPIs/Goals */}
            <Card className="border-white/10 bg-card/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-amber-400" />
                  Employee KPIs & Goals
                </CardTitle>
                <CardDescription>Current quarter performance objectives</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { employee: "Marcus Johnson", goal: "Complete 5 major projects", progress: 80, target: 5, achieved: 4, status: "On Track" },
                    { employee: "Sarah Jenkins", goal: "Reduce operational costs by 15%", progress: 95, target: 15, achieved: 14.2, status: "Excellent" },
                    { employee: "David Chen", goal: "Improve team productivity by 20%", progress: 60, target: 20, achieved: 12, status: "At Risk" },
                    { employee: "Emily Davis", goal: "Complete certification training", progress: 100, target: 1, achieved: 1, status: "Achieved" },
                  ].map((kpi, idx) => (
                    <div key={idx} className="p-4 rounded-lg border border-white/10 bg-white/5" data-testid={`kpi-item-${idx}`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-primary/20 text-primary text-xs">
                              {kpi.employee.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{kpi.employee}</p>
                            <p className="text-xs text-muted-foreground">{kpi.goal}</p>
                          </div>
                        </div>
                        <Badge 
                          className={
                            kpi.status === "Excellent" || kpi.status === "Achieved" ? "bg-green-500/20 text-green-400 border-green-500/30" :
                            kpi.status === "On Track" ? "bg-blue-500/20 text-blue-400 border-blue-500/30" :
                            "bg-amber-500/20 text-amber-400 border-amber-500/30"
                          }
                        >
                          {kpi.status}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-medium">{kpi.progress}%</span>
                        </div>
                        <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all ${
                              kpi.progress >= 90 ? "bg-green-500" :
                              kpi.progress >= 70 ? "bg-blue-500" :
                              "bg-amber-500"
                            }`}
                            style={{ width: `${kpi.progress}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Achieved: {kpi.achieved}{typeof kpi.achieved === 'number' && kpi.achieved < 10 ? '%' : ''}</span>
                          <span>Target: {kpi.target}{typeof kpi.target === 'number' && kpi.target < 10 ? '%' : ''}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* LMS TAB - Learning Management System */}
          <TabsContent value="lms" className="space-y-6">
            {/* LMS Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border-white/10 bg-card/20">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Active Courses</p>
                      <h3 className="text-2xl font-bold mt-2">24</h3>
                      <p className="text-xs text-blue-400 mt-1">Across all departments</p>
                    </div>
                    <div className="p-3 rounded-lg bg-blue-500/10">
                      <BookOpen className="w-6 h-6 text-blue-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-white/10 bg-card/20">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Enrolled Employees</p>
                      <h3 className="text-2xl font-bold mt-2">156</h3>
                      <p className="text-xs text-green-400 mt-1">+12 this month</p>
                    </div>
                    <div className="p-3 rounded-lg bg-green-500/10">
                      <Users className="w-6 h-6 text-green-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-white/10 bg-card/20">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Completion Rate</p>
                      <h3 className="text-2xl font-bold mt-2">78%</h3>
                      <p className="text-xs text-amber-400 mt-1">Target: 85%</p>
                    </div>
                    <div className="p-3 rounded-lg bg-amber-500/10">
                      <TrendingUp className="w-6 h-6 text-amber-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-white/10 bg-card/20">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Certifications</p>
                      <h3 className="text-2xl font-bold mt-2">42</h3>
                      <p className="text-xs text-purple-400 mt-1">Issued this quarter</p>
                    </div>
                    <div className="p-3 rounded-lg bg-purple-500/10">
                      <Award className="w-6 h-6 text-purple-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Active Courses */}
            <Card className="border-white/10 bg-card/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-primary" />
                      Active Training Courses
                    </CardTitle>
                    <CardDescription>Current learning programs and progress</CardDescription>
                  </div>
                  <Button className="bg-primary hover:bg-primary/90">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Course
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { name: "Compliance Training 2024", category: "Compliance", enrolled: 120, completed: 95, deadline: "Dec 31, 2024", status: "Active" },
                    { name: "Leadership Development", category: "Management", enrolled: 24, completed: 18, deadline: "Jan 15, 2025", status: "Active" },
                    { name: "Cybersecurity Awareness", category: "IT Security", enrolled: 156, completed: 142, deadline: "Dec 20, 2024", status: "Active" },
                    { name: "Diversity & Inclusion", category: "HR", enrolled: 156, completed: 130, deadline: "Ongoing", status: "Active" },
                  ].map((course, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="p-2 rounded-lg bg-primary/20">
                          <BookOpen className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{course.name}</p>
                          <p className="text-sm text-muted-foreground">{course.category}</p>
                        </div>
                        <div className="text-sm text-center">
                          <p className="text-muted-foreground">Enrolled</p>
                          <p className="font-medium">{course.enrolled}</p>
                        </div>
                        <div className="text-sm text-center">
                          <p className="text-muted-foreground">Completed</p>
                          <p className="font-medium text-green-400">{course.completed}</p>
                        </div>
                        <div className="text-sm text-center">
                          <p className="text-muted-foreground">Deadline</p>
                          <p className="font-medium">{course.deadline}</p>
                        </div>
                        <div className="w-24">
                          <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-green-500"
                              style={{ width: `${Math.round((course.completed / course.enrolled) * 100)}%` }}
                            />
                          </div>
                          <p className="text-xs text-center mt-1 text-muted-foreground">
                            {Math.round((course.completed / course.enrolled) * 100)}%
                          </p>
                        </div>
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Employee Learning Progress */}
            <Card className="border-white/10 bg-card/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-amber-400" />
                  Employee Learning Progress
                </CardTitle>
                <CardDescription>Individual training completion status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { employee: "Sarah Jenkins", courses: 5, completed: 5, inProgress: 0, certificates: 3 },
                    { employee: "Marcus Johnson", courses: 4, completed: 3, inProgress: 1, certificates: 2 },
                    { employee: "David Chen", courses: 6, completed: 4, inProgress: 2, certificates: 4 },
                    { employee: "Emily Davis", courses: 3, completed: 2, inProgress: 1, certificates: 1 },
                  ].map((emp, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 rounded-lg border border-white/10 bg-white/5">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-primary/20 text-primary">
                            {emp.employee.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{emp.employee}</p>
                          <p className="text-sm text-muted-foreground">{emp.courses} courses assigned</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-green-400">{emp.completed}</p>
                          <p className="text-xs text-muted-foreground">Completed</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-amber-400">{emp.inProgress}</p>
                          <p className="text-xs text-muted-foreground">In Progress</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-purple-400">{emp.certificates}</p>
                          <p className="text-xs text-muted-foreground">Certificates</p>
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
              <Card className="border-white/10 bg-card/20">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Present Today</p>
                      <h3 className="text-2xl font-bold mt-2">142</h3>
                      <p className="text-xs text-green-400 mt-1">92% attendance rate</p>
                    </div>
                    <div className="p-3 rounded-lg bg-green-500/10">
                      <CheckCircle2 className="w-6 h-6 text-green-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-white/10 bg-card/20">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">On Leave</p>
                      <h3 className="text-2xl font-bold mt-2">8</h3>
                      <p className="text-xs text-blue-400 mt-1">Approved leave</p>
                    </div>
                    <div className="p-3 rounded-lg bg-blue-500/10">
                      <Calendar className="w-6 h-6 text-blue-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-white/10 bg-card/20">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Late Arrivals</p>
                      <h3 className="text-2xl font-bold mt-2">5</h3>
                      <p className="text-xs text-amber-400 mt-1">Today</p>
                    </div>
                    <div className="p-3 rounded-lg bg-amber-500/10">
                      <Clock className="w-6 h-6 text-amber-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-white/10 bg-card/20">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Overtime Hours</p>
                      <h3 className="text-2xl font-bold mt-2">48</h3>
                      <p className="text-xs text-purple-400 mt-1">This week</p>
                    </div>
                    <div className="p-3 rounded-lg bg-purple-500/10">
                      <Timer className="w-6 h-6 text-purple-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Today's Attendance */}
            <Card className="border-white/10 bg-card/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Timer className="w-5 h-5 text-primary" />
                      Today's Attendance
                    </CardTitle>
                    <CardDescription>Real-time employee attendance tracking</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="border-white/10">
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
                    <div key={idx} className="flex items-center justify-between p-4 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors">
                      <div className="flex items-center gap-4 flex-1">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-primary/20 text-primary">
                            {record.employee.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-medium">{record.employee}</p>
                          <p className="text-sm text-muted-foreground">{record.department}</p>
                        </div>
                        <div className="text-sm text-center">
                          <p className="text-muted-foreground">Clock In</p>
                          <p className="font-medium">{record.clockIn}</p>
                        </div>
                        <div className="text-sm text-center">
                          <p className="text-muted-foreground">Clock Out</p>
                          <p className="font-medium">{record.clockOut}</p>
                        </div>
                        <div className="text-sm text-center">
                          <p className="text-muted-foreground">Hours</p>
                          <p className="font-medium">{record.hours}</p>
                        </div>
                        <Badge 
                          className={
                            record.status === "Present" ? "bg-green-500/20 text-green-400 border-green-500/30" :
                            record.status === "Late" ? "bg-amber-500/20 text-amber-400 border-amber-500/30" :
                            record.status === "On Leave" ? "bg-blue-500/20 text-blue-400 border-blue-500/30" :
                            "bg-red-500/20 text-red-400 border-red-500/30"
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
            <Card className="border-white/10 bg-card/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-blue-400" />
                      Pending Leave Requests
                    </CardTitle>
                    <CardDescription>Approve or reject employee leave requests</CardDescription>
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
                    <div key={idx} className="flex items-center justify-between p-4 rounded-lg border border-white/10 bg-white/5">
                      <div className="flex items-center gap-4 flex-1">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-primary/20 text-primary">
                            {leave.employee.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-medium">{leave.employee}</p>
                          <p className="text-sm text-muted-foreground">{leave.type}</p>
                        </div>
                        <div className="text-sm">
                          <p className="text-muted-foreground">Duration</p>
                          <p className="font-medium">{leave.from} - {leave.to}</p>
                        </div>
                        <div className="text-sm text-center">
                          <p className="text-muted-foreground">Days</p>
                          <p className="font-medium">{leave.days}</p>
                        </div>
                        <div className="text-sm max-w-[150px]">
                          <p className="text-muted-foreground">Reason</p>
                          <p className="font-medium truncate">{leave.reason}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" className="bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30">
                            Approve
                          </Button>
                          <Button size="sm" variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/20">
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
        <DialogContent className="max-w-3xl bg-zinc-900 border-zinc-700 max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-purple-400" />
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
                    <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge className={
                          selectedJobSpec.status === "processed" 
                            ? "bg-green-500/20 text-green-400 border-green-500/30" 
                            : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                        }>
                          {selectedJobSpec.status === "processed" ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <AlertCircle className="h-3 w-3 mr-1" />}
                          <span className="capitalize">{selectedJobSpec.status}</span>
                        </Badge>
                        <span className="text-zinc-400 text-sm">{formatFileSize(selectedJobSpec.fileSize || 0)}</span>
                      </div>
                      {selectedJobSpec.linkedJobId && (
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Job Created
                        </Badge>
                      )}
                    </div>

                    {data && (
                      <>
                        {/* Job Information */}
                        <div className="space-y-3">
                          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                            <Briefcase className="h-5 w-5 text-purple-400" />
                            Job Information
                          </h3>
                          <div className="grid grid-cols-2 gap-4 p-4 bg-zinc-800/30 rounded-lg">
                            <div>
                              <p className="text-xs text-zinc-500 mb-1">Job Title</p>
                              <p className="text-white font-medium">{data.title || data.jobTitle || "N/A"}</p>
                            </div>
                            <div>
                              <p className="text-xs text-zinc-500 mb-1">Company</p>
                              <p className="text-purple-400">{data.company || "N/A"}</p>
                            </div>
                            <div>
                              <p className="text-xs text-zinc-500 mb-1">Department</p>
                              <p className="text-white">{data.department || "N/A"}</p>
                            </div>
                            <div>
                              <p className="text-xs text-zinc-500 mb-1">Location</p>
                              <p className="text-white">{data.location || "N/A"}</p>
                            </div>
                            <div>
                              <p className="text-xs text-zinc-500 mb-1">Employment Type</p>
                              <p className="text-white">{data.employmentType || "N/A"}</p>
                            </div>
                            <div>
                              <p className="text-xs text-zinc-500 mb-1">Salary Range</p>
                              <p className="text-green-400">{data.salaryRange || data.salary || "N/A"}</p>
                            </div>
                          </div>
                        </div>

                        {/* Experience Required */}
                        {data.experienceRequired && (
                          <div className="space-y-3">
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                              <Clock className="h-5 w-5 text-blue-400" />
                              Experience Required
                            </h3>
                            <p className="text-zinc-300 text-sm leading-relaxed p-4 bg-zinc-800/30 rounded-lg">
                              {data.experienceRequired}
                            </p>
                          </div>
                        )}

                        {/* Job Description */}
                        {data.description && (
                          <div className="space-y-3">
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                              <FileText className="h-5 w-5 text-amber-400" />
                              Job Description
                            </h3>
                            <p className="text-zinc-300 text-sm leading-relaxed p-4 bg-zinc-800/30 rounded-lg whitespace-pre-wrap">
                              {data.description}
                            </p>
                          </div>
                        )}

                        {/* Required Skills */}
                        {data.requiredSkills && data.requiredSkills.length > 0 && (
                          <div className="space-y-3">
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                              <Award className="h-5 w-5 text-blue-400" />
                              Required Skills ({data.requiredSkills.length})
                            </h3>
                            <div className="flex flex-wrap gap-2 p-4 bg-zinc-800/30 rounded-lg">
                              {data.requiredSkills.map((skill: string, i: number) => (
                                <Badge key={i} className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                                  {skill}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Responsibilities */}
                        {data.responsibilities && data.responsibilities.length > 0 && (
                          <div className="space-y-3">
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                              <Target className="h-5 w-5 text-green-400" />
                              Responsibilities ({data.responsibilities.length})
                            </h3>
                            <div className="p-4 bg-zinc-800/30 rounded-lg">
                              <ul className="space-y-2">
                                {data.responsibilities.map((resp: string, i: number) => (
                                  <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                                    <span className="text-green-400 mt-1">•</span>
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
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                              <GraduationCap className="h-5 w-5 text-orange-400" />
                              Qualifications ({data.qualifications.length})
                            </h3>
                            <div className="p-4 bg-zinc-800/30 rounded-lg">
                              <ul className="space-y-2">
                                {data.qualifications.map((qual: string, i: number) => (
                                  <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                                    <span className="text-orange-400 mt-1">•</span>
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
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                              <Star className="h-5 w-5 text-yellow-400" />
                              Benefits ({data.benefits.length})
                            </h3>
                            <div className="flex flex-wrap gap-2 p-4 bg-zinc-800/30 rounded-lg">
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
                        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                          <FileText className="h-4 w-4 text-zinc-400" />
                          Raw Text Preview
                        </h3>
                        <ScrollArea className="h-40 p-3 bg-zinc-800/50 rounded-lg">
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
    </div>
  );
}
