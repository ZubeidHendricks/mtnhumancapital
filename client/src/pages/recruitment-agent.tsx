import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTenantQueryKey } from "@/hooks/useTenant";
import { Link, useSearch } from "wouter";
import { Navbar } from "@/components/layout/navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { 
  Loader2, Users, Target, TrendingUp, CheckCircle, AlertCircle, Search, Sparkles,
  Bot, Brain, FileSearch, UserCheck, Zap, Clock, ArrowRight, Play, MessageSquare,
  ChevronRight, Star, Briefcase, MapPin, Award, Activity, X, Building2, GraduationCap,
  Mail, Phone, Linkedin, FileText, ThumbsUp, Eye
} from "lucide-react";
import { api } from "@/lib/api";
import type { Job, RecruitmentSession, Candidate } from "@shared/schema";

const AGENT_STEPS = [
  { id: "analyzing", name: "Analyzing Job", icon: FileSearch, description: "Understanding requirements and skills needed" },
  { id: "sourcing_specialists", name: "Specialist Sourcing", icon: Users, description: "LinkedIn, PNet & Indeed specialists searching" },
  { id: "sourcing_ai", name: "AI Search", icon: Search, description: "Augmenting with general AI search" },
  { id: "screening", name: "AI Screening", icon: Brain, description: "Evaluating candidate profiles with LLM" },
  { id: "ranking", name: "Smart Ranking", icon: TrendingUp, description: "Scoring and prioritizing matches" },
  { id: "complete", name: "Complete", icon: CheckCircle, description: "Top candidates ready for review" },
];

const AGENT_MESSAGES = [
  { agent: "Job Analyzer", message: "Parsing job requirements and extracting key skills...", type: "analyzing" },
  { agent: "Job Analyzer", message: "Identified required skills and qualifications", type: "analyzing" },
  { agent: "LinkedIn Specialist", message: "Generating boolean search strings for LinkedIn...", type: "sourcing_specialists" },
  { agent: "LinkedIn Specialist", message: "Searching passive candidates at target employers...", type: "sourcing_specialists" },
  { agent: "PNet Specialist", message: "Querying PNet CV database with filter criteria...", type: "sourcing_specialists" },
  { agent: "PNet Specialist", message: "Filtering by availability and salary expectations...", type: "sourcing_specialists" },
  { agent: "Indeed Specialist", message: "Searching Indeed resume database...", type: "sourcing_specialists" },
  { agent: "Indeed Specialist", message: "Found diverse candidate pool from all platforms...", type: "sourcing_specialists" },
  { agent: "AI Search", message: "Augmenting with general talent search...", type: "sourcing_ai" },
  { agent: "AI Search", message: "Deduplicating and merging candidate profiles...", type: "sourcing_ai" },
  { agent: "Screening AI", message: "Beginning deep profile analysis with LLaMA 3.3 70B...", type: "screening" },
  { agent: "Screening AI", message: "Evaluating skill alignment and experience match...", type: "screening" },
  { agent: "Ranking Engine", message: "Calculating composite match scores...", type: "ranking" },
  { agent: "Ranking Engine", message: "Applying screening criteria to final rankings...", type: "ranking" },
  { agent: "System", message: "Sourcing complete! Top candidates ready for review.", type: "complete" },
];

const SOURCING_SPECIALISTS = [
  { 
    name: "LinkedIn Specialist", 
    platform: "LinkedIn",
    icon: Linkedin,
    color: "bg-blue-600",
    description: "Passive candidates from professional network" 
  },
  { 
    name: "PNet Specialist", 
    platform: "PNet",
    icon: FileSearch,
    color: "bg-green-600",
    description: "Active job seekers from SA's largest portal" 
  },
  { 
    name: "Indeed Specialist", 
    platform: "Indeed",
    icon: Search,
    color: "bg-purple-600",
    description: "Diverse candidates from resume database" 
  },
];


export default function RecruitmentAgent() {
  const searchString = useSearch();
  const urlParams = new URLSearchParams(searchString);
  const jobIdFromUrl = urlParams.get('jobId');
  
  const [selectedJobId, setSelectedJobId] = useState<string>(jobIdFromUrl || "");
  const [maxCandidates, setMaxCandidates] = useState(20);
  const [minMatchScore, setMinMatchScore] = useState(60);
  const [currentStep, setCurrentStep] = useState(0);
  const [agentMessages, setAgentMessages] = useState<typeof AGENT_MESSAGES>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [showCandidateDialog, setShowCandidateDialog] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  
  // Update selectedJobId when URL param changes
  useEffect(() => {
    if (jobIdFromUrl && jobIdFromUrl !== selectedJobId) {
      setSelectedJobId(jobIdFromUrl);
    }
  }, [jobIdFromUrl]);
  
  const queryClient = useQueryClient();
  const jobsKey = useTenantQueryKey(['jobs']);
  const recruitmentSessionsKey = useTenantQueryKey(['recruitment-sessions']);
  const candidatesKey = useTenantQueryKey(['candidates']);

  const { data: jobs, isLoading: jobsLoading } = useQuery<Job[]>({
    queryKey: jobsKey,
    queryFn: async () => {
      const response = await api.get("/jobs");
      return response.data;
    },
  });

  const { data: sessions, isLoading: sessionsLoading } = useQuery<RecruitmentSession[]>({
    queryKey: recruitmentSessionsKey,
    queryFn: async () => {
      const response = await api.get("/recruitment-sessions");
      return response.data;
    },
    refetchInterval: isSimulating ? 2000 : 5000,
  });

  const { data: candidates } = useQuery<Candidate[]>({
    queryKey: candidatesKey,
    queryFn: async () => {
      const response = await api.get("/candidates");
      return response.data;
    },
  });

  const startRecruitmentMutation = useMutation({
    mutationFn: async (params: { jobId: string; maxCandidates: number; minMatchScore: number }) => {
      const response = await api.post("/recruitment-sessions", params);
      return response.data;
    },
    onSuccess: (data) => {
      setActiveSessionId(data.session?.id || data.id);
      queryClient.invalidateQueries({ queryKey: recruitmentSessionsKey });
      simulateAgentActivity();
    },
  });



  const simulateAgentActivity = () => {
    setIsSimulating(true);
    setCurrentStep(0);
    setAgentMessages([]);
    
    let messageIndex = 0;
    const stepDurations = [2000, 3000, 4000, 3000, 1000];
    
    const addMessage = () => {
      if (messageIndex < AGENT_MESSAGES.length) {
        setAgentMessages(prev => [...prev, AGENT_MESSAGES[messageIndex]]);
        messageIndex++;
        
        const currentMsg = AGENT_MESSAGES[messageIndex - 1];
        const stepIndex = AGENT_STEPS.findIndex(s => s.id === currentMsg?.type);
        if (stepIndex >= 0) {
          setCurrentStep(stepIndex);
        }
        
        setTimeout(addMessage, 800 + Math.random() * 1200);
      } else {
        setCurrentStep(AGENT_STEPS.length - 1);
        setIsSimulating(false);
        queryClient.invalidateQueries({ queryKey: recruitmentSessionsKey });
        queryClient.invalidateQueries({ queryKey: candidatesKey });
      }
    };
    
    setTimeout(addMessage, 500);
  };

  const handleStartRecruitment = () => {
    if (!selectedJobId) return;
    startRecruitmentMutation.mutate({
      jobId: selectedJobId,
      maxCandidates,
      minMatchScore,
    });
  };

  const handleCandidateClick = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
    setShowCandidateDialog(true);
  };

  const selectedJob = jobs?.find(j => j.id === selectedJobId);
  const runningSessions = sessions?.filter(s => s.status === "Running") || [];
  const completedSessions = sessions?.filter(s => s.status === "Completed") || [];

  // Get active running session with real data
  const activeSession = sessions?.find(s => s.id === activeSessionId) || runningSessions[0];
  const sessionResults = activeSession?.results as any;
  const sessionStep = sessionResults?.step || null;
  const specialistResultsFromSession = sessionResults?.specialistResults || [];

  // Map session step to workflow step index  
  const getStepIndexFromSession = (step: string | null): number => {
    if (!step) return -1;
    switch (step) {
      case "analyzing_job": return 0;
      case "sourcing_specialists": return 1;
      case "sourcing_ai_search": return 2;
      case "ranking_candidates": return 3;
      case "completed": return 5;
      default: return -1;
    }
  };

  // Derive current workflow step - use real session data when simulating, combined with UI animation
  const effectiveStep = isSimulating 
    ? Math.max(currentStep, getStepIndexFromSession(sessionStep))
    : (activeSession?.status === "Completed" ? AGENT_STEPS.length - 1 : -1);

  // Get the most recent completed session to show its candidates
  const latestSession = sessions
    ?.filter(s => s.status === "Completed")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

  // Filter candidates by selected job OR by the latest session's job
  const activeJobId = selectedJobId || latestSession?.jobId;
  
  const topCandidates = candidates
    ?.filter(c => activeJobId ? c.jobId === activeJobId : true)
    .sort((a, b) => (b.match || 0) - (a.match || 0))
    .slice(0, 10) || [];

  // Get the job title for display
  const displayJobTitle = activeJobId ? jobs?.find(j => j.id === activeJobId)?.title : null;

  const getAgentAvatar = (agent: string) => {
    switch (agent) {
      case "Job Analyzer": return "JA";
      case "LinkedIn Specialist": return "LI";
      case "PNet Specialist": return "PN";
      case "Indeed Specialist": return "IN";
      case "AI Search": return "AS";
      case "Screening AI": return "SA";
      case "Ranking Engine": return "RE";
      case "System": return "SY";
      default: return "AI";
    }
  };

  const getAgentColor = (agent: string) => {
    switch (agent) {
      case "Job Analyzer": return "bg-blue-500";
      case "LinkedIn Specialist": return "bg-blue-600";
      case "PNet Specialist": return "bg-green-600";
      case "Indeed Specialist": return "bg-purple-600";
      case "AI Search": return "bg-cyan-500";
      case "Screening AI": return "bg-purple-500";
      case "Ranking Engine": return "bg-orange-500";
      case "System": return "bg-green-500";
      default: return "bg-gray-500";
    }
  };

  const getMatchColor = (score: number) => {
    if (score >= 85) return 'text-green-400 bg-green-500/20 border-green-500/30';
    if (score >= 70) return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
    if (score >= 50) return 'text-orange-400 bg-orange-500/20 border-orange-500/30';
    return 'text-zinc-400 bg-zinc-500/20 border-zinc-500/30';
  };

  const getMatchLabel = (score: number) => {
    if (score >= 85) return 'Excellent Match';
    if (score >= 70) return 'Good Match';
    if (score >= 50) return 'Fair Match';
    return 'Low Match';
  };

  const getCandidateJob = (jobId: string | null) => {
    if (!jobId || !jobs) return null;
    return jobs.find(j => j.id === jobId);
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      <div className="pt-20 pb-8">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500">
                <Bot className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                  AI Recruitment Command Center
                </h1>
                <p className="text-zinc-400">
                  Intelligent talent acquisition powered by LLaMA 3.1 70B via Groq
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Panel - Controls & Workflow */}
            <div className="lg:col-span-4 space-y-6">
              {/* Start New Session */}
              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Play className="h-5 w-5 text-green-400" />
                    Launch Recruitment
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-zinc-400">Target Position</Label>
                    <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                      <SelectTrigger className="bg-zinc-800 border-zinc-700" data-testid="select-job">
                        <SelectValue placeholder="Select a job..." />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-800 border-zinc-700">
                        {jobsLoading ? (
                          <SelectItem value="loading" disabled>Loading...</SelectItem>
                        ) : jobs?.length ? (
                          jobs.map((job) => (
                            <SelectItem key={job.id} value={job.id}>
                              {job.title}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="none" disabled>No jobs available</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedJob && (
                    <div className="p-3 bg-zinc-800/50 rounded-lg border border-zinc-700">
                      <div className="flex items-start gap-3">
                        <Briefcase className="h-5 w-5 text-blue-400 mt-0.5" />
                        <div>
                          <p className="font-medium">{selectedJob.title}</p>
                          <p className="text-sm text-zinc-400">{selectedJob.department}</p>
                          {selectedJob.location && (
                            <p className="text-xs text-zinc-500 flex items-center gap-1 mt-1">
                              <MapPin className="h-3 w-3" /> {selectedJob.location}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-zinc-400 text-xs">Max Candidates</Label>
                      <Input
                        type="number"
                        value={maxCandidates}
                        onChange={(e) => setMaxCandidates(Number(e.target.value))}
                        className="bg-zinc-800 border-zinc-700"
                        data-testid="input-max-candidates"
                      />
                    </div>
                    <div>
                      <Label className="text-zinc-400 text-xs">Min Score %</Label>
                      <Input
                        type="number"
                        value={minMatchScore}
                        onChange={(e) => setMinMatchScore(Number(e.target.value))}
                        className="bg-zinc-800 border-zinc-700"
                        data-testid="input-min-match"
                      />
                    </div>
                  </div>

                  <Button
                    onClick={handleStartRecruitment}
                    disabled={!selectedJobId || startRecruitmentMutation.isPending || isSimulating}
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500"
                    data-testid="button-start-recruitment"
                  >
                    {startRecruitmentMutation.isPending || isSimulating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Agents Working...
                      </>
                    ) : (
                      <>
                        <Zap className="mr-2 h-4 w-4" />
                        Deploy AI Agents
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Sourcing Specialists - Status Display */}
              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-400" />
                    Sourcing Specialists
                  </CardTitle>
                  <CardDescription>
                    {effectiveStep === 1 ? "Specialists searching in parallel..." : "Run via Deploy AI Agents workflow"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {SOURCING_SPECIALISTS.map((specialist, index) => {
                    const IconComponent = specialist.icon;
                    const isActive = effectiveStep === 1;
                    const isComplete = effectiveStep > 1;
                    
                    // Get real result from session data
                    const sessionResult = specialistResultsFromSession.find(
                      (r: any) => r.specialist === specialist.name
                    );
                    const hasResult = sessionResult && sessionResult.found > 0;
                    
                    return (
                      <div 
                        key={specialist.name}
                        className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                          isActive 
                            ? 'bg-purple-500/10 border-purple-500/50' 
                            : isComplete || hasResult
                              ? 'bg-green-500/10 border-green-500/30'
                              : 'bg-zinc-800/50 border-zinc-700/50'
                        }`}
                        data-testid={`specialist-${specialist.platform.toLowerCase()}`}
                      >
                        <div className={`p-2 rounded-lg ${specialist.color}`}>
                          {isActive ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : isComplete || hasResult ? (
                            <CheckCircle className="h-4 w-4" />
                          ) : (
                            <IconComponent className="h-4 w-4" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{specialist.name}</p>
                          <p className="text-xs text-zinc-500">{specialist.description}</p>
                          {sessionResult && (
                            <p className="text-xs text-green-400 mt-1">
                              Found {sessionResult.found} candidates ({sessionResult.status})
                            </p>
                          )}
                        </div>
                        <Badge variant="outline" className={`shrink-0 ${
                          isActive ? 'border-purple-500 text-purple-400' :
                          isComplete || hasResult ? 'border-green-500 text-green-400' :
                          'border-zinc-600 text-zinc-400'
                        }`}>
                          {isActive ? 'Searching...' : isComplete || hasResult ? 'Done' : 'Ready'}
                        </Badge>
                      </div>
                    );
                  })}
                  
                  {/* Show total from AI search if available */}
                  {sessionResults?.aiSearchFound && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
                      <div className="p-2 rounded-lg bg-cyan-500">
                        <Search className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">AI Search Augmentation</p>
                        <p className="text-xs text-cyan-400">
                          Found {sessionResults.aiSearchFound} additional candidates
                        </p>
                      </div>
                      <Badge variant="outline" className="border-cyan-500 text-cyan-400">Done</Badge>
                    </div>
                  )}
                  
                  <div className="text-xs text-zinc-500 text-center pt-2">
                    Specialists run automatically when you deploy AI agents
                  </div>
                </CardContent>
              </Card>

              {/* Workflow Steps */}
              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Activity className="h-5 w-5 text-purple-400" />
                    Agent Workflow
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {AGENT_STEPS.map((step, index) => {
                      const isActive = isSimulating && index === effectiveStep;
                      const isComplete = index < effectiveStep || (!isSimulating && completedSessions.length > 0 && effectiveStep >= 0);
                      const StepIcon = step.icon;
                      
                      return (
                        <div
                          key={step.id}
                          className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                            isActive 
                              ? 'bg-purple-500/20 border border-purple-500/50' 
                              : isComplete
                                ? 'bg-green-500/10 border border-green-500/30'
                                : 'bg-zinc-800/50 border border-zinc-700/50'
                          }`}
                        >
                          <div className={`p-2 rounded-lg ${
                            isActive 
                              ? 'bg-purple-500 animate-pulse' 
                              : isComplete
                                ? 'bg-green-500'
                                : 'bg-zinc-700'
                          }`}>
                            {isActive ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : isComplete ? (
                              <CheckCircle className="h-4 w-4" />
                            ) : (
                              <StepIcon className="h-4 w-4" />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className={`font-medium text-sm ${isActive ? 'text-purple-300' : isComplete ? 'text-green-300' : 'text-zinc-400'}`}>
                              {step.name}
                            </p>
                            <p className="text-xs text-zinc-500">{step.description}</p>
                          </div>
                          {isActive && (
                            <div className="flex gap-1">
                              <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                              <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                              <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Center Panel - Live Activity Feed */}
            <div className="lg:col-span-5">
              <Card className="bg-zinc-900/50 border-zinc-800 h-full">
                <CardHeader className="pb-3 border-b border-zinc-800">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MessageSquare className="h-5 w-5 text-blue-400" />
                      Live Agent Activity
                    </CardTitle>
                    {isSimulating && (
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                        <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse" />
                        Live
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[500px]">
                    <div className="p-4 space-y-3">
                      {agentMessages.length === 0 && !isSimulating ? (
                        <div className="text-center py-12 text-zinc-500">
                          <Bot className="h-12 w-12 mx-auto mb-3 opacity-30" />
                          <p>No active recruitment session</p>
                          <p className="text-sm">Deploy AI agents to see live activity</p>
                        </div>
                      ) : (
                        agentMessages.map((msg, index) => (
                          <div
                            key={index}
                            className="flex gap-3 animate-in slide-in-from-bottom-2 duration-300"
                            style={{ animationDelay: `${index * 50}ms` }}
                          >
                            <Avatar className={`h-8 w-8 ${getAgentColor(msg.agent)}`}>
                              <AvatarFallback className="text-xs font-bold text-white bg-transparent">
                                {getAgentAvatar(msg.agent)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/50">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-sm text-zinc-300">{msg.agent}</span>
                                <span className="text-xs text-zinc-500">
                                  {new Date().toLocaleTimeString()}
                                </span>
                              </div>
                              <p className="text-sm text-zinc-400">{msg.message}</p>
                            </div>
                          </div>
                        ))
                      )}
                      {isSimulating && (
                        <div className="flex gap-3 animate-pulse">
                          <Avatar className="h-8 w-8 bg-purple-500">
                            <AvatarFallback className="text-xs font-bold text-white bg-transparent">
                              AI
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/50">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" />
                              <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                              <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            {/* Right Panel - Results & Candidates */}
            <div className="lg:col-span-3 space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                <Card className="bg-zinc-900/50 border-zinc-800">
                  <CardContent className="p-4 text-center">
                    <p className="text-3xl font-bold text-blue-400">{sessions?.length || 0}</p>
                    <p className="text-xs text-zinc-500">Sessions</p>
                  </CardContent>
                </Card>
                <Card className="bg-zinc-900/50 border-zinc-800">
                  <CardContent className="p-4 text-center">
                    <p className="text-3xl font-bold text-green-400">{candidates?.length || 0}</p>
                    <p className="text-xs text-zinc-500">Candidates</p>
                  </CardContent>
                </Card>
              </div>

              {/* Top Candidates */}
              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Star className="h-5 w-5 text-yellow-400" />
                    Top Matches
                  </CardTitle>
                  {displayJobTitle && (
                    <CardDescription className="text-xs text-purple-400 flex items-center gap-1">
                      <Briefcase className="h-3 w-3" />
                      For: {displayJobTitle}
                    </CardDescription>
                  )}
                  {!displayJobTitle && jobs && jobs.length > 0 && (
                    <div className="mt-2">
                      <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                        <SelectTrigger className="bg-zinc-800 border-zinc-700 h-8 text-xs">
                          <SelectValue placeholder="Filter by job..." />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-800 border-zinc-700">
                          {jobs.map((job) => (
                            <SelectItem key={job.id} value={job.id} className="text-xs">
                              {job.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    {topCandidates.length > 0 ? (
                      <div className="space-y-3">
                        {topCandidates.slice(0, 5).map((candidate, index) => (
                          <div
                            key={candidate.id}
                            onClick={() => handleCandidateClick(candidate)}
                            className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg border border-zinc-700/50 hover:border-purple-500/30 hover:bg-zinc-800 transition-all cursor-pointer"
                            data-testid={`candidate-card-${candidate.id}`}
                          >
                            <div className="relative">
                              <Avatar className="h-10 w-10 bg-gradient-to-br from-purple-500 to-blue-500">
                                <AvatarFallback className="text-white text-sm font-bold bg-transparent">
                                  {candidate.fullName?.split(' ').map(n => n[0]).join('') || '?'}
                                </AvatarFallback>
                              </Avatar>
                              {index < 3 && (
                                <div className={`absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                                  index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-zinc-400' : 'bg-amber-600'
                                }`}>
                                  {index + 1}
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{candidate.fullName}</p>
                              <p className="text-xs text-zinc-500 truncate">{candidate.role || 'No role'}</p>
                            </div>
                            <div className="text-right">
                              <Badge className={getMatchColor(candidate.match || 0)}>
                                {candidate.match || 0}%
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-zinc-500">
                        <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">No candidates yet</p>
                      </div>
                    )}
                  </ScrollArea>
                  {topCandidates.length > 0 && (
                    <Link href="/candidates-list">
                      <Button variant="outline" className="w-full mt-3 border-zinc-700 hover:bg-zinc-800" data-testid="button-view-all-candidates">
                        View All Candidates
                        <ChevronRight className="h-4 w-4 ml-2" />
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>

              {/* Recent Sessions */}
              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="h-5 w-5 text-zinc-400" />
                    Recent Sessions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[200px]">
                    {sessions && sessions.length > 0 ? (
                      <div className="space-y-2">
                        {sessions.slice(0, 5).map((session) => {
                          const job = jobs?.find(j => j.id === session.jobId);
                          return (
                            <div
                              key={session.id}
                              className="p-3 bg-zinc-800/50 rounded-lg border border-zinc-700/50"
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-medium text-sm truncate flex-1">
                                  {job?.title || 'Unknown Job'}
                                </span>
                                <Badge className={
                                  session.status === 'Completed' ? 'bg-green-500/20 text-green-400' :
                                  session.status === 'Running' ? 'bg-blue-500/20 text-blue-400' :
                                  'bg-red-500/20 text-red-400'
                                }>
                                  {session.status}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-4 text-xs text-zinc-500">
                                <span>{session.candidatesFound} found</span>
                                <span>{session.candidatesAdded} added</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-zinc-500">
                        <Activity className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">No sessions yet</p>
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Candidate Details Dialog */}
      <Dialog open={showCandidateDialog} onOpenChange={setShowCandidateDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader className="border-b border-zinc-800 pb-4">
            <DialogTitle className="text-xl flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-400" />
              Top Matched Candidates
              {displayJobTitle && (
                <Badge className="ml-2 bg-purple-500/20 text-purple-400 border-purple-500/30">
                  {displayJobTitle}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              {topCandidates.length} candidates ranked by AI based on job requirements and skill matching
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[70vh] pr-4">
            <div className="space-y-4 py-4">
              {topCandidates.map((candidate, index) => {
                const candidateJob = getCandidateJob(candidate.jobId);
                const metadata = candidate.metadata as any;
                
                return (
                  <div
                    key={candidate.id}
                    className={`p-4 rounded-lg border transition-all ${
                      selectedCandidate?.id === candidate.id 
                        ? 'bg-purple-500/10 border-purple-500/50' 
                        : 'bg-zinc-800/50 border-zinc-700/50 hover:border-zinc-600'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Avatar & Rank */}
                      <div className="relative flex-shrink-0">
                        <Avatar className="h-14 w-14 bg-gradient-to-br from-purple-500 to-blue-500">
                          <AvatarFallback className="text-white text-lg font-bold bg-transparent">
                            {candidate.fullName?.split(' ').map(n => n[0]).join('') || '?'}
                          </AvatarFallback>
                        </Avatar>
                        {index < 3 && (
                          <div className={`absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${
                            index === 0 ? 'bg-yellow-500 text-black' : index === 1 ? 'bg-zinc-400 text-black' : 'bg-amber-600 text-white'
                          }`}>
                            {index + 1}
                          </div>
                        )}
                      </div>

                      {/* Main Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="font-semibold text-lg">{candidate.fullName}</h3>
                            <p className="text-zinc-400">{candidate.role}</p>
                            {metadata?.company && (
                              <p className="text-sm text-zinc-500 flex items-center gap-1 mt-1">
                                <Building2 className="h-3 w-3" /> {metadata.company}
                              </p>
                            )}
                            {(candidate.location || metadata?.location) && (
                              <p className="text-sm text-zinc-500 flex items-center gap-1">
                                <MapPin className="h-3 w-3" /> {candidate.location || metadata?.location}
                              </p>
                            )}
                          </div>

                          {/* Match Score */}
                          <div className="text-right flex-shrink-0">
                            <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg ${getMatchColor(candidate.match || 0)}`}>
                              <div className="text-center">
                                <p className="text-2xl font-bold">{candidate.match || 0}%</p>
                                <p className="text-xs opacity-80">{getMatchLabel(candidate.match || 0)}</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Skills */}
                        {candidate.skills && candidate.skills.length > 0 && (
                          <div className="mt-3">
                            <p className="text-xs text-zinc-500 mb-2">Skills</p>
                            <div className="flex flex-wrap gap-1.5">
                              {(candidate.skills as string[]).slice(0, 8).map((skill, i) => (
                                <Badge key={i} variant="outline" className="text-xs bg-zinc-800 border-zinc-700">
                                  {skill}
                                </Badge>
                              ))}
                              {(candidate.skills as string[]).length > 8 && (
                                <Badge variant="outline" className="text-xs bg-zinc-800 border-zinc-700">
                                  +{(candidate.skills as string[]).length - 8} more
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Experience */}
                        {metadata?.experience && (
                          <div className="mt-3">
                            <p className="text-xs text-zinc-500 mb-1">Experience</p>
                            <p className="text-sm text-zinc-300">{metadata.experience}</p>
                          </div>
                        )}

                        {/* AI Reasoning */}
                        {metadata?.aiReasoning && (
                          <div className="mt-3 p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
                            <p className="text-xs text-purple-400 mb-1 flex items-center gap-1">
                              <Brain className="h-3 w-3" /> AI Analysis
                            </p>
                            <p className="text-sm text-zinc-300">{metadata.aiReasoning}</p>
                          </div>
                        )}

                        {/* Applied For Job */}
                        {candidateJob && (
                          <div className="mt-3 pt-3 border-t border-zinc-700/50">
                            <p className="text-xs text-zinc-500 flex items-center gap-1">
                              <Briefcase className="h-3 w-3" /> Applied for: <span className="text-zinc-300">{candidateJob.title}</span>
                            </p>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="mt-4 flex gap-2">
                          <Link href={`/candidates-list?candidateId=${candidate.id}`}>
                            <Button size="sm" className="bg-purple-600 hover:bg-purple-500">
                              <Eye className="h-4 w-4 mr-1" />
                              View Full Profile
                            </Button>
                          </Link>
                          <Button size="sm" variant="outline" className="border-zinc-700 hover:bg-zinc-800">
                            <ThumbsUp className="h-4 w-4 mr-1" />
                            Shortlist
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
