import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { jobsService, candidateService } from "@/lib/api";
import { Navbar } from "@/components/layout/navbar";
import { useTenantQueryKey } from "@/hooks/useTenant";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  BarChart3
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
  const [isEmailOpen, setIsEmailOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const candidatesKey = useTenantQueryKey(['candidates']);
  const jobsKey = useTenantQueryKey(['jobs']);

  const [isGenerating, setIsGenerating] = useState(false);
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
            
            <Dialog open={isCreateJobOpen} onOpenChange={setIsCreateJobOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-create-job-dialog">
                  Create New Requisition
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

        <Tabs defaultValue="recruitment" className="space-y-6" onValueChange={setActiveTab}>
          <div className="flex items-center gap-3 flex-wrap">
            <TabsList className="grid grid-cols-2 md:grid-cols-4 lg:w-[600px] bg-card/50 border border-white/5">
              <TabsTrigger value="recruitment">Recruitment</TabsTrigger>
              <TabsTrigger value="integrity">Integrity</TabsTrigger>
              <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
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
                            <div className="col-span-2 text-right">
                              <Link href={`/candidates-list?jobId=${job.id}`}>
                                <Button variant="outline" size="sm" className="gap-2 border-white/10 hover:bg-white/5" data-testid={`button-view-candidates-${job.id}`}>
                                  <Eye className="h-4 w-4" />
                                  View Details
                                </Button>
                              </Link>
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
        </Tabs>
      </main>
    </div>
  );
}
