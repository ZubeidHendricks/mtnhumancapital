import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTenantQueryKey } from "@/hooks/useTenant";
import { Link } from "wouter";
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
import { 
  Loader2, Users, Target, TrendingUp, CheckCircle, AlertCircle, Search, Sparkles,
  Bot, Brain, FileSearch, UserCheck, Zap, Clock, ArrowRight, Play, MessageSquare,
  ChevronRight, Star, Briefcase, MapPin, Award, Activity
} from "lucide-react";
import { api } from "@/lib/api";
import type { Job, RecruitmentSession, Candidate } from "@shared/schema";

const AGENT_STEPS = [
  { id: "analyzing", name: "Analyzing Job", icon: FileSearch, description: "Understanding requirements and skills needed" },
  { id: "sourcing", name: "Sourcing Candidates", icon: Search, description: "Searching talent pools and databases" },
  { id: "screening", name: "AI Screening", icon: Brain, description: "Evaluating candidate profiles with LLM" },
  { id: "ranking", name: "Smart Ranking", icon: TrendingUp, description: "Scoring and prioritizing matches" },
  { id: "complete", name: "Complete", icon: CheckCircle, description: "Top candidates ready for review" },
];

const AGENT_MESSAGES = [
  { agent: "Job Analyzer", message: "Parsing job requirements and extracting key skills...", type: "analyzing" },
  { agent: "Job Analyzer", message: "Identified 8 required skills and 5 preferred qualifications", type: "analyzing" },
  { agent: "Talent Scout", message: "Initiating search across candidate database...", type: "sourcing" },
  { agent: "Talent Scout", message: "Found 47 potential candidates matching criteria", type: "sourcing" },
  { agent: "Talent Scout", message: "Filtering by experience level and location...", type: "sourcing" },
  { agent: "Screening AI", message: "Beginning deep profile analysis with LLaMA 3.1 70B...", type: "screening" },
  { agent: "Screening AI", message: "Analyzing work history and skill alignment...", type: "screening" },
  { agent: "Screening AI", message: "Evaluating cultural fit indicators...", type: "screening" },
  { agent: "Ranking Engine", message: "Calculating composite match scores...", type: "ranking" },
  { agent: "Ranking Engine", message: "Applying weighted criteria to final rankings...", type: "ranking" },
  { agent: "System", message: "Recruitment session complete! Top candidates identified.", type: "complete" },
];

export default function RecruitmentAgent() {
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [maxCandidates, setMaxCandidates] = useState(20);
  const [minMatchScore, setMinMatchScore] = useState(60);
  const [currentStep, setCurrentStep] = useState(0);
  const [agentMessages, setAgentMessages] = useState<typeof AGENT_MESSAGES>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  
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

  const selectedJob = jobs?.find(j => j.id === selectedJobId);
  const runningSessions = sessions?.filter(s => s.status === "Running") || [];
  const completedSessions = sessions?.filter(s => s.status === "Completed") || [];

  const getAgentAvatar = (agent: string) => {
    switch (agent) {
      case "Job Analyzer": return "JA";
      case "Talent Scout": return "TS";
      case "Screening AI": return "SA";
      case "Ranking Engine": return "RE";
      default: return "AI";
    }
  };

  const getAgentColor = (agent: string) => {
    switch (agent) {
      case "Job Analyzer": return "bg-blue-500";
      case "Talent Scout": return "bg-green-500";
      case "Screening AI": return "bg-purple-500";
      case "Ranking Engine": return "bg-orange-500";
      default: return "bg-gray-500";
    }
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
                      const isActive = isSimulating && index === currentStep;
                      const isComplete = index < currentStep || (!isSimulating && completedSessions.length > 0);
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
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    {candidates && candidates.length > 0 ? (
                      <div className="space-y-3">
                        {candidates
                          .sort((a, b) => (b.aiScore || 0) - (a.aiScore || 0))
                          .slice(0, 5)
                          .map((candidate, index) => (
                            <div
                              key={candidate.id}
                              className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg border border-zinc-700/50 hover:border-purple-500/30 transition-all cursor-pointer"
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
                                <Badge className={`${
                                  (candidate.aiScore || 0) >= 80 ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                                  (candidate.aiScore || 0) >= 60 ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                                  'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'
                                }`}>
                                  {candidate.aiScore || 0}%
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
                  {candidates && candidates.length > 0 && (
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
    </div>
  );
}
