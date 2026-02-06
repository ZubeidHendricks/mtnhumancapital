import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTenantQueryKey } from "@/hooks/useTenant";
import { Link, useSearch } from "wouter";
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
  // Tech Sourcing Agents
  { agent: "GitHub Sourcer", message: "Searching open source developers with repos:>5...", type: "sourcing_specialists" },
  { agent: "GitHub Sourcer", message: "Found developers with contact info from SA region", type: "sourcing_specialists" },
  { agent: "HackerNews Sourcer", message: "Scanning Who's Hiring threads via Algolia API...", type: "sourcing_specialists" },
  { agent: "HackerNews Sourcer", message: "Extracted developer profiles with emails", type: "sourcing_specialists" },
  { agent: "StackOverflow Sourcer", message: "Querying top reputation developers...", type: "sourcing_specialists" },
  { agent: "Kaggle Sourcer", message: "Searching data scientists and ML engineers...", type: "sourcing_specialists" },
  { agent: "Dev.to Sourcer", message: "Finding technical writers and developers...", type: "sourcing_specialists" },
  // Executive Sourcing Agents
  { agent: "Executive News Sourcer", message: "Scanning news for C-suite appointments...", type: "sourcing_specialists" },
  { agent: "Executive News Sourcer", message: "Found 10 SA executives from recent news", type: "sourcing_specialists" },
  { agent: "Company Leadership Sourcer", message: "Scraping leadership pages from target companies...", type: "sourcing_specialists" },
  { agent: "CIPC Director Sourcer", message: "Querying SA public company records...", type: "sourcing_specialists" },
  // Blue Collar Agents
  { agent: "OLX Sourcer", message: "Searching blue collar job seekers...", type: "sourcing_specialists" },
  { agent: "Trade Forums Sourcer", message: "Finding skilled tradespeople...", type: "sourcing_specialists" },
  // Job Board Agents
  { agent: "LinkedIn Specialist", message: "Generating boolean search strings...", type: "sourcing_specialists" },
  { agent: "PNet Specialist", message: "Querying SA's largest CV database...", type: "sourcing_specialists" },
  { agent: "Indeed Specialist", message: "Searching resume database...", type: "sourcing_specialists" },
  // AI Processing
  { agent: "AI Search", message: "Augmenting with general talent search...", type: "sourcing_ai" },
  { agent: "AI Search", message: "Deduplicating and merging candidate profiles...", type: "sourcing_ai" },
  { agent: "Screening AI (LLaMA 3.1 70B)", message: "Beginning deep profile analysis via Groq...", type: "screening" },
  { agent: "Screening AI (LLaMA 3.1 70B)", message: "Evaluating skill alignment and experience match...", type: "screening" },
  { agent: "Ranking Engine", message: "Calculating composite match scores...", type: "ranking" },
  { agent: "Ranking Engine", message: "Applying screening criteria to final rankings...", type: "ranking" },
  { agent: "System", message: "Sourcing complete! Top candidates ready for review.", type: "complete" },
];

// Platform metadata for display
const PLATFORM_META: Record<string, { icon: any; color: string; category: string; description: string }> = {
  // Tech Sourcing
  "GitHub": { icon: Users, color: "bg-gray-800", category: "Tech", description: "Open source developers from GitHub" },
  "Dev.to": { icon: FileText, color: "bg-black", category: "Tech", description: "Technical writers & developers" },
  "StackOverflow": { icon: Brain, color: "bg-teal-600", category: "Tech", description: "Top developers by reputation" },
  "HackerNews": { icon: Zap, color: "bg-teal-700", category: "Tech", description: "Who's Hiring thread candidates" },
  "Kaggle": { icon: TrendingUp, color: "bg-blue-500", category: "Tech", description: "Data scientists & ML engineers" },
  // Executive
  "Executive": { icon: Award, color: "bg-amber-600", category: "Executive", description: "C-suite from executive networks" },
  "CandidateAPI": { icon: Search, color: "bg-indigo-600", category: "Executive", description: "Premium candidate databases" },
  "CompanyLeadership": { icon: Building2, color: "bg-slate-700", category: "Executive", description: "Leaders from company websites" },
  "ExecutiveNews": { icon: FileSearch, color: "bg-red-600", category: "Executive", description: "Executive appointments from news" },
  "CIPC": { icon: Briefcase, color: "bg-green-700", category: "Executive", description: "SA company directors (CIPC/JSE)" },
  // Blue Collar
  "OLX": { icon: Users, color: "bg-teal-600", category: "Blue Collar", description: "Trade workers & job seekers" },
  "TradeForums": { icon: Users, color: "bg-yellow-600", category: "Blue Collar", description: "Skilled tradespeople" },
  // Job Boards
  "Gumtree South Africa": { icon: Search, color: "bg-green-500", category: "Job Boards", description: "SA classifieds & job listings" },
  "Indeed South Africa": { icon: Search, color: "bg-blue-600", category: "Job Boards", description: "Global job board - SA section" },
  "Careers24": { icon: FileSearch, color: "bg-blue-600", category: "Job Boards", description: "SA career portal" },
  "PNet": { icon: FileSearch, color: "bg-green-600", category: "Job Boards", description: "SA's largest recruitment portal" },
  "LinkedIn": { icon: Linkedin, color: "bg-blue-700", category: "Job Boards", description: "Professional network" },
};

// Fallback for legacy code
const SOURCING_SPECIALISTS = [
  { name: "LinkedIn Specialist", platform: "LinkedIn", icon: Linkedin, color: "bg-blue-600", description: "Passive candidates from professional network" },
  { name: "PNet Specialist", platform: "PNet", icon: FileSearch, color: "bg-green-600", description: "Active job seekers from SA's largest portal" },
  { name: "Indeed Specialist", platform: "Indeed South Africa", icon: Search, color: "bg-blue-600", description: "Diverse candidates from resume database" },
];


// Intelligent Contact Enrichment Component
function ContactEnrichmentSection({ candidate, metadata }: { candidate: Candidate; metadata: any }) {
  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichResult, setEnrichResult] = useState<any>(null);
  const queryClient = useQueryClient();

  const handleEnrichContact = async () => {
    setIsEnriching(true);
    setEnrichResult(null);
    try {
      const response = await api.post(`/candidates/${candidate.id}/enrich-contact`);
      setEnrichResult(response.data);
      if (response.data.success) {
        queryClient.invalidateQueries({ queryKey: ['candidates'] });
      }
    } catch (error) {
      console.error("Enrichment failed:", error);
      setEnrichResult({ success: false, message: "Failed to enrich contact" });
    } finally {
      setIsEnriching(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {candidate.email ? (
        <a href={`mailto:${candidate.email}`} className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-300">
          <Mail className="h-3 w-3" /> {candidate.email}
        </a>
      ) : null}
      {candidate.phone ? (
        <a href={`tel:${candidate.phone}`} className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400 hover:text-green-300">
          <Phone className="h-3 w-3" /> {candidate.phone}
        </a>
      ) : null}
      {metadata?.linkedinUrl && (
        <a href={metadata.linkedinUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-300">
          <Linkedin className="h-3 w-3" /> LinkedIn
        </a>
      )}
      
      {/* Show enrich button if no contact info */}
      {!candidate.email && !candidate.phone && (
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1 border-blue-500/50 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10"
          onClick={handleEnrichContact}
          disabled={isEnriching}
          data-testid={`enrich-contact-${candidate.id}`}
        >
          {isEnriching ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              AI Searching...
            </>
          ) : (
            <>
              <Sparkles className="h-3 w-3" />
              AI Find Contact
            </>
          )}
        </Button>
      )}
      
      {/* Show LinkedIn search as fallback */}
      {!candidate.email && !metadata?.linkedinUrl && (
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1 border-blue-500/50 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10"
          onClick={() => window.open(`https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(candidate.fullName || '')}`, '_blank')}
          data-testid={`linkedin-search-${candidate.id}`}
        >
          <Linkedin className="h-3 w-3" />
          LinkedIn
        </Button>
      )}
      
      {/* Show enrichment result */}
      {enrichResult && (
        <div className={`w-full mt-2 p-2 rounded text-xs ${enrichResult.success ? 'bg-green-500/10 border border-green-500/30 text-green-600 dark:text-green-400' : 'bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400'}`}>
          {enrichResult.success ? (
            <span className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              Contact found! {enrichResult.enriched?.email || enrichResult.enriched?.linkedinUrl || 'Profile updated'}
              {enrichResult.enriched?.confidence && <Badge variant="outline" className="ml-1 text-[10px]">{enrichResult.enriched.confidence}</Badge>}
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {enrichResult.message || "No contact info found - try LinkedIn search"}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

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

  // Fetch enabled recruitment platforms from configuration
  const { data: platformConfigs } = useQuery<Array<{ id: string; enabled: boolean; connected: boolean }>>({
    queryKey: ['recruitment-platforms'],
    queryFn: async () => {
      const response = await api.get("/recruitment/platforms");
      return response.data;
    },
  });

  // Fetch all available sourcing agents
  const { data: sourcingAgents } = useQuery<Array<{ name: string; platform: string }>>({
    queryKey: ['sourcing-agents'],
    queryFn: async () => {
      const response = await api.get("/scrapers");
      return response.data;
    },
  });

  // Organize agents by category
  const agentsByCategory = sourcingAgents?.reduce((acc, agent) => {
    const meta = PLATFORM_META[agent.platform] || { category: "Other", icon: Search, color: "bg-gray-500", description: agent.name };
    const category = meta.category;
    if (!acc[category]) acc[category] = [];
    acc[category].push({ ...agent, ...meta });
    return acc;
  }, {} as Record<string, Array<{ name: string; platform: string; icon: any; color: string; description: string }>>) || {};

  // Filter specialists based on enabled platforms
  const enabledSpecialists = SOURCING_SPECIALISTS.filter(specialist => {
    if (!platformConfigs) return true; // Show all if config not loaded
    const platformId = specialist.platform.toLowerCase();
    const config = platformConfigs.find(p => p.id === platformId);
    return config?.enabled && config?.connected;
  });
  
  // If no platforms configured, show message about configuration needed
  const hasEnabledPlatforms = platformConfigs?.some(p => p.enabled && p.connected) ?? false;

  // Filter agent messages based on enabled platforms
  const filteredAgentMessages = AGENT_MESSAGES.filter(msg => {
    // Always include non-specialist messages
    if (!msg.agent.includes('Specialist')) return true;
    
    // Check if this specialist's platform is enabled
    const platform = msg.agent.replace(' Specialist', '').toLowerCase();
    if (!platformConfigs) return true;
    const config = platformConfigs.find(p => p.id === platform);
    return config?.enabled && config?.connected;
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
      if (messageIndex < filteredAgentMessages.length) {
        setAgentMessages(prev => [...prev, filteredAgentMessages[messageIndex]]);
        messageIndex++;
        
        const currentMsg = filteredAgentMessages[messageIndex - 1];
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
      case "Indeed Specialist": return "bg-blue-600";
      case "AI Search": return "bg-cyan-500";
      case "Screening AI": return "bg-blue-500";
      case "Ranking Engine": return "bg-teal-600";
      case "System": return "bg-green-500";
      default: return "bg-gray-500";
    }
  };

  const getMatchColor = (score: number) => {
    if (score >= 85) return 'text-green-600 dark:text-green-400 bg-green-500/20 border-green-500/30';
    if (score >= 70) return 'text-yellow-600 dark:text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
    if (score >= 50) return 'text-teal-600 dark:text-teal-400 bg-teal-600/20 border-teal-500/30';
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
      <div className="pt-20 pb-8">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-blue-500">
                <Bot className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-blue-400 bg-clip-text text-transparent">
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
              <Card className="bg-gray-100 dark:bg-zinc-900/50 border-zinc-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Play className="h-5 w-5 text-green-600 dark:text-green-400" />
                    Launch Recruitment
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-zinc-400">Target Position</Label>
                    <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                      <SelectTrigger className="bg-gray-200 dark:bg-zinc-800 border-zinc-700" data-testid="select-job">
                        <SelectValue placeholder="Select a job..." />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-200 dark:bg-zinc-800 border-zinc-700">
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
                    <div className="p-3 bg-gray-200 dark:bg-zinc-800/50 rounded-lg border border-zinc-700">
                      <div className="flex items-start gap-3">
                        <Briefcase className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
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
                        className="bg-gray-200 dark:bg-zinc-800 border-zinc-700"
                        data-testid="input-max-candidates"
                      />
                    </div>
                    <div>
                      <Label className="text-zinc-400 text-xs">Min Score %</Label>
                      <Input
                        type="number"
                        value={minMatchScore}
                        onChange={(e) => setMinMatchScore(Number(e.target.value))}
                        className="bg-gray-200 dark:bg-zinc-800 border-zinc-700"
                        data-testid="input-min-match"
                      />
                    </div>
                  </div>

                  <Button
                    onClick={handleStartRecruitment}
                    disabled={!selectedJobId || startRecruitmentMutation.isPending || isSimulating}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-600 hover:from-blue-500 hover:to-blue-500"
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

              {/* Sourcing Agents - Workflow Style */}
              <Card className="bg-gray-100 dark:bg-zinc-900/50 border-zinc-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Bot className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    AI Agent Workflow
                  </CardTitle>
                  <CardDescription>
                    {effectiveStep === 1 ? "Executing sourcing workflow..." : "Intelligent talent acquisition powered by LLaMA 3.1 70B"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="flex">
                    {/* Left: Category Steps */}
                    <div className="w-48 border-r border-zinc-800 py-4">
                      {Object.entries(agentsByCategory).length === 0 ? (
                        <div className="px-4 py-8 text-center">
                          <Loader2 className="h-6 w-6 text-zinc-500 mx-auto animate-spin" />
                        </div>
                      ) : (
                        Object.keys(agentsByCategory).map((category, idx) => {
                          const categoryActive = effectiveStep === 1;
                          const categoryComplete = effectiveStep > 1;
                          return (
                            <div 
                              key={category}
                              className={`flex items-center gap-3 px-4 py-3 border-l-2 transition-all ${
                                categoryActive 
                                  ? 'border-l-blue-500 bg-blue-500/5' 
                                  : categoryComplete 
                                    ? 'border-l-green-500' 
                                    : 'border-l-transparent'
                              }`}
                            >
                              <span className={`text-sm font-mono ${categoryActive ? 'text-blue-600 dark:text-blue-400' : categoryComplete ? 'text-green-600 dark:text-green-400' : 'text-zinc-500'}`}>
                                {String(idx + 1).padStart(2, '0')}
                              </span>
                              <span className={`text-sm font-medium ${categoryActive ? 'text-white' : 'text-zinc-400'}`}>
                                {category}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                    
                    {/* Right: Agent Actions */}
                    <div className="flex-1 py-4 px-4 space-y-2 max-h-80 overflow-y-auto">
                      {Object.entries(agentsByCategory).flatMap(([category, agents]) => 
                        agents.map((agent) => {
                          const isActive = effectiveStep === 1;
                          const sessionResult = specialistResultsFromSession.find(
                            (r: any) => r.platform === agent.platform || r.specialist === agent.name
                          );
                          const hasResult = sessionResult && sessionResult.found > 0;
                          const estimatedTime = Math.floor(Math.random() * 4) + 2;
                          
                          return (
                            <div 
                              key={agent.platform}
                              className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                                isActive 
                                  ? 'bg-blue-500/10' 
                                  : hasResult
                                    ? 'bg-gray-200 dark:bg-zinc-800/30'
                                    : 'bg-gray-200 dark:bg-zinc-800/20'
                              }`}
                              data-testid={`agent-${agent.platform.toLowerCase().replace(/\s+/g, '-')}`}
                            >
                              <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                                isActive ? 'bg-blue-500' : hasResult ? 'bg-green-500' : 'bg-zinc-700'
                              }`}>
                                {isActive ? (
                                  <Loader2 className="h-3 w-3 animate-spin text-white" />
                                ) : hasResult ? (
                                  <CheckCircle className="h-3 w-3 text-white" />
                                ) : (
                                  <div className="w-2 h-2 rounded-full bg-zinc-500" />
                                )}
                              </div>
                              <span className={`flex-1 text-sm ${isActive ? 'text-white' : hasResult ? 'text-zinc-300' : 'text-zinc-500'}`}>
                                {agent.name}
                              </span>
                              <Badge className={`text-xs px-2 py-0.5 ${
                                isActive ? 'bg-blue-500/20 text-blue-300' : 
                                hasResult ? 'bg-green-500/20 text-green-300' : 
                                'bg-zinc-700 text-zinc-400'
                              }`}>
                                {isActive ? `${estimatedTime}s` : hasResult ? `${sessionResult?.found || 0}` : `${estimatedTime}s`}
                              </Badge>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Workflow Description */}
              <div className="px-2">
                <p className="text-sm text-zinc-500 leading-relaxed">
                  Extract candidate data from multiple sources including APIs, job boards, and professional networks, then rank using AI matching algorithms.
                </p>
              </div>

              {/* Workflow Steps */}
              <Card className="bg-gray-100 dark:bg-zinc-900/50 border-zinc-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Activity className="h-5 w-5 text-blue-600 dark:text-blue-400" />
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
                              ? 'bg-blue-500/20 border border-blue-500/50' 
                              : isComplete
                                ? 'bg-green-500/10 border border-green-500/30'
                                : 'bg-gray-200 dark:bg-zinc-800/50 border border-zinc-700/50'
                          }`}
                        >
                          <div className={`p-2 rounded-lg ${
                            isActive 
                              ? 'bg-blue-500 animate-pulse' 
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
                            <p className={`font-medium text-sm ${isActive ? 'text-blue-300' : isComplete ? 'text-green-300' : 'text-zinc-400'}`}>
                              {step.name}
                            </p>
                            <p className="text-xs text-zinc-500">{step.description}</p>
                          </div>
                          {isActive && (
                            <div className="flex gap-1">
                              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
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
              <Card className="bg-gray-100 dark:bg-zinc-900/50 border-zinc-800 h-full">
                <CardHeader className="pb-3 border-b border-zinc-800">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MessageSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      Live Agent Activity
                    </CardTitle>
                    {isSimulating && (
                      <Badge className="bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30">
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
                            <div className="flex-1 bg-gray-200 dark:bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/50">
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
                          <Avatar className="h-8 w-8 bg-blue-500">
                            <AvatarFallback className="text-xs font-bold text-white bg-transparent">
                              AI
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 bg-gray-200 dark:bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/50">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" />
                              <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                              <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
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
                <Card className="bg-gray-100 dark:bg-zinc-900/50 border-zinc-800">
                  <CardContent className="p-4 text-center">
                    <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{sessions?.length || 0}</p>
                    <p className="text-xs text-zinc-500">Sessions</p>
                  </CardContent>
                </Card>
                <Card className="bg-gray-100 dark:bg-zinc-900/50 border-zinc-800">
                  <CardContent className="p-4 text-center">
                    <p className="text-3xl font-bold text-green-600 dark:text-green-400">{candidates?.length || 0}</p>
                    <p className="text-xs text-zinc-500">Candidates</p>
                  </CardContent>
                </Card>
              </div>

              {/* Top Candidates */}
              <Card className="bg-gray-100 dark:bg-zinc-900/50 border-zinc-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Star className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                    Top Matches
                  </CardTitle>
                  {displayJobTitle && (
                    <CardDescription className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                      <Briefcase className="h-3 w-3" />
                      For: {displayJobTitle}
                    </CardDescription>
                  )}
                  {!displayJobTitle && jobs && jobs.length > 0 && (
                    <div className="mt-2">
                      <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                        <SelectTrigger className="bg-gray-200 dark:bg-zinc-800 border-zinc-700 h-8 text-xs">
                          <SelectValue placeholder="Filter by job..." />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-200 dark:bg-zinc-800 border-zinc-700">
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
                            className="flex items-center gap-3 p-3 bg-gray-200 dark:bg-zinc-800/50 rounded-lg border border-zinc-700/50 hover:border-blue-500/30 hover:bg-gray-200 dark:bg-zinc-800 transition-all cursor-pointer"
                            data-testid={`candidate-card-${candidate.id}`}
                          >
                            <div className="relative">
                              <Avatar className="h-10 w-10 bg-gradient-to-br from-blue-500 to-blue-500">
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
                      <Button variant="outline" className="w-full mt-3 border-zinc-700 hover:bg-gray-200 dark:bg-zinc-800" data-testid="button-view-all-candidates">
                        View All Candidates
                        <ChevronRight className="h-4 w-4 ml-2" />
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>

              {/* Recent Sessions */}
              <Card className="bg-gray-100 dark:bg-zinc-900/50 border-zinc-800">
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
                              className="p-3 bg-gray-200 dark:bg-zinc-800/50 rounded-lg border border-zinc-700/50"
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-medium text-sm truncate flex-1">
                                  {job?.title || 'Unknown Job'}
                                </span>
                                <Badge className={
                                  session.status === 'Completed' ? 'bg-green-500/20 text-green-600 dark:text-green-400' :
                                  session.status === 'Running' ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400' :
                                  'bg-red-500/20 text-red-600 dark:text-red-400'
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden bg-gray-100 dark:bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader className="border-b border-zinc-800 pb-4">
            <DialogTitle className="text-xl flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              Top Matched Candidates
              {displayJobTitle && (
                <Badge className="ml-2 bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30">
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
                        ? 'bg-blue-500/10 border-blue-500/50' 
                        : 'bg-gray-200 dark:bg-zinc-800/50 border-zinc-700/50 hover:border-zinc-600'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Avatar & Rank */}
                      <div className="relative flex-shrink-0">
                        <Avatar className="h-14 w-14 bg-gradient-to-br from-blue-500 to-blue-500">
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
                            
                            {/* Contact Actions */}
                            <ContactEnrichmentSection candidate={candidate} metadata={metadata} />
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
                                <Badge key={i} variant="outline" className="text-xs bg-gray-200 dark:bg-zinc-800 border-zinc-700">
                                  {skill}
                                </Badge>
                              ))}
                              {(candidate.skills as string[]).length > 8 && (
                                <Badge variant="outline" className="text-xs bg-gray-200 dark:bg-zinc-800 border-zinc-700">
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
                          <div className="mt-3 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                            <p className="text-xs text-blue-600 dark:text-blue-400 mb-1 flex items-center gap-1">
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
                            <Button size="sm" className="bg-blue-600 hover:bg-blue-500">
                              <Eye className="h-4 w-4 mr-1" />
                              View Full Profile
                            </Button>
                          </Link>
                          <Button size="sm" variant="outline" className="border-zinc-700 hover:bg-gray-200 dark:bg-zinc-800">
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
