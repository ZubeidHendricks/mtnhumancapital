import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { jobsService, candidateService } from "@/lib/api";
import { Navbar } from "@/components/layout/navbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Link } from "wouter";
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
  LayoutList
} from "lucide-react";
import { motion } from "framer-motion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Local state for new creations since we don't have a real backend for POSTs in mockup mode
  const [localJobs, setLocalJobs] = useState<any[]>([]);
  const [localCandidates, setLocalCandidates] = useState<any[]>([]);

  // JD Generation State
  const [isGenerating, setIsGenerating] = useState(false);
  const [jobTitle, setJobTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [jobDescription, setJobDescription] = useState("");

  // File Upload State
  const [isUploading, setIsUploading] = useState(false);

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

  const handlePublishRequisition = () => {
    if (!jobTitle) {
        toast.error("Please enter a Job Title.");
        return;
    }

    const newJob = {
        id: Date.now(),
        title: jobTitle,
        department: department || "General",
        status: "Active",
        date: new Date().toLocaleDateString()
    };

    setLocalJobs(prev => [newJob, ...prev]);
    setIsCreateJobOpen(false);
    
    // Reset Form
    setJobTitle("");
    setDepartment("");
    setJobDescription("");
    
    toast.success("Requisition created successfully!");
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

    // Simulate Processing Delay
    await new Promise(resolve => setTimeout(resolve, 2500));

    // Create mock candidates from files
    const newCandidates = Array.from(files).map((file, index) => {
        // Improved name cleaning logic
        let name = file.name.split('.')[0]; // Remove extension
        
        // Remove common prefixes/suffixes and artifacts
        name = name
            .replace(/resume of/i, '')
            .replace(/cv of/i, '')
            .replace(/resume/i, '')
            .replace(/cv/i, '')
            .replace(/\(\d+\)/g, '') // Remove (1), (2) etc
            .replace(/compressed/i, '')
            .replace(/copy/i, '')
            .replace(/final/i, '')
            .replace(/[-_]/g, ' ') // Replace separators with spaces
            .trim();

        // Capitalize each word
        name = name.replace(/\b\w/g, (l) => l.toUpperCase());

        // Fallback if name becomes empty
        if (!name || name.length < 2) {
            name = "Unknown Candidate";
        }

        return {
            id: Date.now() + index,
            full_name: name,
            role: localJobs[0]?.title || "General Application", // Assign to most recent job or general
            match: Math.floor(Math.random() * (98 - 70 + 1)) + 70, // Random high score
            stage: "Screening",
            status: "New"
        };
    });

    setLocalCandidates(prev => [...newCandidates, ...prev]);
    setIsUploading(false);
    setIsUploadOpen(false);
    setIsUploadOpen(false);
    toast.success(`Processed ${files.length} CVs successfully!`);
  };

  // Fetch real data from backend
  const { 
    data: jobs, 
    isLoading: loadingJobs, 
    isError: jobsError 
  } = useQuery({
    queryKey: ['jobs'],
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
    queryKey: ['candidates'],
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

  // Safer data handling logic
  const getSafeCandidates = () => {
    if (candidatesError) return MOCK_CANDIDATES;
    if (loadingCandidates) return [];
    
    // Handle Backend Pagination Wrapper { total: 2, candidates: [...] }
    if (candidates && !Array.isArray(candidates) && candidates.candidates && Array.isArray(candidates.candidates)) {
        return candidates.candidates;
    }

    // Critical Check: Ensure it is an array. 
    if (candidates && Array.isArray(candidates)) {
        return candidates;
    }
    
    // Log warning only if we have data that isn't an array
    if (candidates) {
        console.warn("Unexpected candidates data structure:", candidates);
    }
    
    // Default to mock data if data is present but invalid
    return MOCK_CANDIDATES;
  };

  // Merge API candidates with locally created ones
  const apiCandidates = Array.isArray(getSafeCandidates()) ? getSafeCandidates() : MOCK_CANDIDATES;
  const displayCandidates = [...localCandidates, ...apiCandidates];

  // Merge API jobs with locally created ones
  const apiJobs = Array.isArray(jobs) ? jobs : [];
  // Calculate total job count (API + Local)
  const jobCount = (apiJobs.length || 12) + localJobs.length;

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
                <Button>Create New Requisition</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px] bg-card border-white/10">
                <DialogHeader>
                  <DialogTitle>Create New Job Requisition</DialogTitle>
                  <DialogDescription>
                    Define the role requirements. Our AI will automatically generate a job description and start sourcing.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Job Title</Label>
                      <Input 
                        id="title" 
                        placeholder="e.g. Senior Product Designer" 
                        className="bg-background/50 border-white/10" 
                        value={jobTitle}
                        onChange={(e) => setJobTitle(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="department">Department</Label>
                      <Input 
                        id="department" 
                        placeholder="e.g. Engineering" 
                        className="bg-background/50 border-white/10"
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="description">Key Responsibilities & Requirements</Label>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 text-xs text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
                            onClick={handleGenerateJD}
                            disabled={isGenerating}
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 className="w-3 h-3 mr-1 animate-spin" /> Generating...
                                </>
                            ) : (
                                <>
                                    <Wand2 className="w-3 h-3 mr-1" /> Auto-Generate with AI
                                </>
                            )}
                        </Button>
                    </div>
                    <Textarea 
                      id="description" 
                      placeholder="Paste raw requirements here or type a brief summary. AI will expand this into a full JD." 
                      className="min-h-[200px] bg-background/50 border-white/10 font-mono text-sm"
                      value={jobDescription}
                      onChange={(e) => setJobDescription(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="remote" className="rounded border-white/20 bg-background/50" />
                      <Label htmlFor="remote">Remote Eligible</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="urgent" className="rounded border-white/20 bg-background/50" />
                      <Label htmlFor="urgent">Urgent Hire</Label>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateJobOpen(false)}>Cancel</Button>
                  <Button onClick={handlePublishRequisition} className="bg-primary text-primary-foreground">
                    Publish Requisition
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Connection Error Alert */}
        {(jobsError || candidatesError || (!loadingCandidates && candidates && !Array.isArray(candidates) && !candidates.candidates)) && (
          <Alert variant="destructive" className="mb-6 border-red-500/20 bg-red-500/10 text-red-200">
            <WifiOff className="h-4 w-4" />
            <AlertTitle>Backend Connection Issue</AlertTitle>
            <AlertDescription>
              Unable to connect to the AI Backend. Showing cached/mock data for demonstration purposes.
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="recruitment" className="space-y-6" onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-2 md:grid-cols-4 lg:w-[600px] bg-card/50 border border-white/5">
            <TabsTrigger value="recruitment">Recruitment</TabsTrigger>
            <TabsTrigger value="integrity">Integrity</TabsTrigger>
            <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>

          {/* RECRUITMENT TAB */}
          <TabsContent value="recruitment" className="space-y-6">
            
            {/* AI Agent Banner */}
            <div className="rounded-lg bg-gradient-to-r from-primary/20 to-purple-500/20 border border-primary/20 p-6 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2 text-white">
                  <Sparkles className="w-5 h-5 text-primary" />
                  Need to find candidates fast?
                </h3>
                <p className="text-muted-foreground text-sm mt-1">
                  Launch the AI Recruitment Agent to source, screen, and rank candidates using our RAG-powered engine.
                </p>
              </div>
              <Link href="/recruitment-agent">
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20">
                  Launch AI Recruiter
                </Button>
              </Link>
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

            {/* Active Jobs List (New) */}
            {localJobs.length > 0 && (
                <Card className="border-white/10 bg-card/20">
                    <CardHeader>
                        <CardTitle>Recently Created Requisitions</CardTitle>
                        <CardDescription>Jobs created in this session</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {localJobs.map((job) => (
                                <div key={job.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
                                    <div>
                                        <p className="font-medium">{job.title}</p>
                                        <p className="text-sm text-muted-foreground">{job.department}</p>
                                    </div>
                                    <Badge className="bg-green-500/20 text-green-400">{job.status}</Badge>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

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
                          <div className="col-span-3 font-medium">{candidate.full_name || candidate.name || "Unknown Candidate"}</div>
                          <div className="col-span-3 text-sm text-muted-foreground">{candidate.role || "General Application"}</div>
                          <div className="col-span-2">
                            <Badge className={`${(candidate.match || candidate.overall_score || 0) > 90 ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'} border-0`}>
                              {candidate.match || candidate.overall_score || 0}% Match
                            </Badge>
                          </div>
                          <div className="col-span-2 text-sm">{candidate.stage || candidate.status || "New"}</div>
                          <div className="col-span-2 text-right">
                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
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

          {/* PERFORMANCE TAB */}
           <TabsContent value="performance" className="space-y-6">
            
             {/* AI Performance Banner */}
            <div className="rounded-lg bg-gradient-to-r from-indigo-500/20 to-blue-600/20 border border-indigo-500/20 p-6 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2 text-white">
                  <TrendingUp className="w-5 h-5 text-indigo-400" />
                  Analyze workforce performance?
                </h3>
                <p className="text-muted-foreground text-sm mt-1">
                  Connect data streams to track KPIs, engagement, and retention risks in real-time.
                </p>
              </div>
              <Button className="bg-indigo-500 text-indigo-950 hover:bg-indigo-400 shadow-lg shadow-indigo-500/20">
                View Analytics
              </Button>
            </div>

            <Card className="border-white/10 bg-card/20">
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
                <CardDescription>Coming soon: Real-time KPI tracking dashboard.</CardDescription>
              </CardHeader>
              <CardContent className="h-[200px] flex items-center justify-center text-muted-foreground">
                No active data streams connected.
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
