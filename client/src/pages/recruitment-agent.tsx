import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTenantQueryKey } from "@/hooks/useTenant";
import { useSearch, useLocation } from "wouter";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { 
  Loader2, Users, Target, TrendingUp, CheckCircle, AlertCircle, Search, Sparkles,
  Bot, Brain, FileSearch, UserCheck, Zap, Clock, ArrowRight, Play, MessageSquare,
  ChevronRight, ChevronDown, ChevronUp, Star, Briefcase, MapPin, Award, Activity, X, Building2, GraduationCap,
  Mail, Phone, Linkedin, FileText, ThumbsUp, Eye, Send
} from "lucide-react";
import { api, candidateService } from "@/lib/api";
import { toast } from "sonner";
import type { Job, RecruitmentSession, Candidate } from "@shared/schema";
import { InterviewInviteDialog } from "@/components/interview-invite-dialog";
import { InterestCheckDialog } from "@/components/interest-check-dialog";

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
  "GitHub": { icon: Users, color: "bg-gray-700", category: "Tech", description: "Open source developers from GitHub" },
  "Dev.to": { icon: FileText, color: "bg-gray-700", category: "Tech", description: "Technical writers & developers" },
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
        <a href={`mailto:${candidate.email}`} className="inline-flex items-center gap-1 text-xs text-[#FFCB00] hover:text-[#E6B800]">
          <Mail className="h-3 w-3" /> {candidate.email}
        </a>
      ) : null}
      {candidate.phone ? (
        <a href={`tel:${candidate.phone}`} className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400 hover:text-green-300">
          <Phone className="h-3 w-3" /> {candidate.phone}
        </a>
      ) : null}
      {metadata?.linkedinUrl && (
        <a href={metadata.linkedinUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-[#FFCB00] hover:text-[#E6B800]">
          <Linkedin className="h-3 w-3" /> LinkedIn
        </a>
      )}
      
      {/* Show enrich button if no contact info */}
      {!candidate.email && !candidate.phone && (
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1 border-[#FFCB00]/50 text-[#FFCB00] hover:bg-[#FFCB00]/10"
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
          className="h-7 text-xs gap-1 border-[#FFCB00]/50 text-[#FFCB00] hover:bg-[#FFCB00]/10"
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
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [showShortlistDialog, setShowShortlistDialog] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteCandidate, setInviteCandidate] = useState<Candidate | null>(null);
  const [interestCheckOpen, setInterestCheckOpen] = useState(false);
  const [interestCheckCandidate, setInterestCheckCandidate] = useState<Candidate | null>(null);
  const [shortlistingId, setShortlistingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

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
  const interestChecksKey = useTenantQueryKey(['interest-checks']);

  const { data: jobs, isLoading: jobsLoading } = useQuery<Job[]>({
    queryKey: jobsKey,
    queryFn: async () => {
      const response = await api.get("/jobs");
      const body = response.data;
      return Array.isArray(body) ? body : body.data ?? [];
    },
  });

  // Auto-select first job if navigated without a jobId (e.g. from sidebar menu)
  useEffect(() => {
    if (!jobIdFromUrl && !selectedJobId && jobs && jobs.length > 0) {
      setSelectedJobId(jobs[0].id);
    }
  }, [jobs, jobIdFromUrl, selectedJobId]);

  const { data: sessions, isLoading: sessionsLoading } = useQuery<RecruitmentSession[]>({
    queryKey: recruitmentSessionsKey,
    queryFn: async () => {
      const response = await api.get("/recruitment-sessions");
      return response.data;
    },
    refetchInterval: isSimulating ? 2000 : 5000,
  });

  const { data: candidates } = useQuery<Candidate[]>({
    queryKey: [...candidatesKey, { jobId: selectedJobId, sortBy: "match" }],
    queryFn: async () => {
      const params: Record<string, string> = { sortBy: "match", limit: "50" };
      if (selectedJobId) params.jobId = selectedJobId;
      const response = await api.get("/candidates", { params });
      const body = response.data;
      return Array.isArray(body) ? body : body.data ?? [];
    },
  });

  const { data: interestChecks } = useQuery<any[]>({
    queryKey: interestChecksKey,
    queryFn: async () => {
      const response = await api.get("/interest-checks");
      return response.data;
    },
  });

  const updateCandidateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) =>
      candidateService.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: candidatesKey });
    },
  });

  const handleShortlist = async (candidate: Candidate, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setShortlistingId(String(candidate.id));
    try {
      await updateCandidateMutation.mutateAsync({
        id: String(candidate.id),
        updates: { stage: "Shortlisted" },
      });
      toast.success(`${candidate.fullName} moved to shortlisted`);
    } catch {
      toast.error("Failed to shortlist candidate");
    } finally {
      setShortlistingId(null);
    }
  };

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
        setTimeout(() => setShowAgentModal(false), 1500);
      }
    };
    
    setTimeout(addMessage, 500);
  };

  const handleStartRecruitment = () => {
    if (!selectedJobId) return;
    setShowAgentModal(true);
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

  const shortlistedCount = candidates
    ?.filter(c => c.stage === "Shortlisted" && (activeJobId ? c.jobId === activeJobId : true))
    .length || 0;

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
    return 'text-gray-500 dark:text-gray-400 bg-gray-500/20 border-gray-500/30';
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
    <div className="min-h-screen bg-background text-foreground">
      <div className="pt-20 pb-8">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-full bg-[#FFCB00]/10 flex items-center justify-center">
                <Bot className="w-7 h-7 text-[#FFCB00]" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground dark:text-[#FFCB00]">
                  AI Recruitment Command Center
                </h1>
                <p className="text-muted-foreground">
                  Intelligent talent acquisition powered by LLaMA 3.1 70B via Groq
                </p>
              </div>
            </div>
          </div>

          {/* Controls Bar - Horizontal */}
          <Card className="bg-gray-100 dark:bg-zinc-900/50 border-border mb-6">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-end gap-4">
                <div className="flex-1 min-w-[200px] max-w-xs">
                  <Label className="text-gray-500 dark:text-gray-400 text-xs mb-1 block">Target Position</Label>
                  <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                    <SelectTrigger className="bg-gray-200 dark:bg-zinc-800 border-border" data-testid="select-job">
                      <SelectValue placeholder="Select a job..." />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-200 dark:bg-zinc-800 border-border">
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
                  <div className="hidden md:flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 px-3 py-2 bg-muted/50 rounded-lg border border-border">
                    <Briefcase className="h-4 w-4 text-[#FFCB00]" />
                    <span className="font-medium text-foreground">{selectedJob.title}</span>
                    {selectedJob.department && <span>• {selectedJob.department}</span>}
                    {selectedJob.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{selectedJob.location}</span>}
                  </div>
                )}
                <div className="w-24">
                  <Label className="text-gray-500 dark:text-gray-400 text-xs mb-1 block">Max</Label>
                  <Input
                    type="number"
                    value={maxCandidates}
                    onChange={(e) => setMaxCandidates(Number(e.target.value))}
                    className="bg-gray-200 dark:bg-zinc-800 border-border"
                    data-testid="input-max-candidates"
                  />
                </div>
                <div className="w-24">
                  <Label className="text-gray-500 dark:text-gray-400 text-xs mb-1 block">Min Score</Label>
                  <Input
                    type="number"
                    value={minMatchScore}
                    onChange={(e) => setMinMatchScore(Number(e.target.value))}
                    className="bg-gray-200 dark:bg-zinc-800 border-border"
                    data-testid="input-min-match"
                  />
                </div>
                <Button
                  onClick={handleStartRecruitment}
                  disabled={!selectedJobId || startRecruitmentMutation.isPending || isSimulating}
                  className="bg-[#FFCB00] hover:bg-[#E6B800] text-black h-10 px-6"
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
              </div>
            </CardContent>
          </Card>

          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="bg-gray-100 dark:bg-zinc-900/50 border-border">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#FFCB00]/10">
                  <Activity className="h-5 w-5 text-[#FFCB00]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#FFCB00]">{sessions?.length || 0}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">Sessions</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gray-100 dark:bg-zinc-900/50 border-border">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{candidates?.length || 0}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">Candidates</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gray-100 dark:bg-zinc-900/50 border-border">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-teal-500/10">
                  <CheckCircle className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-teal-600 dark:text-teal-400">{completedSessions.length}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">Completed</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gray-100 dark:bg-zinc-900/50 border-border">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-500/10">
                  <Star className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{topCandidates.length}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">Top Matches</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Matches - Main Content */}
          <Card className="bg-gray-100 dark:bg-zinc-900/50 border-border mb-6">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Star className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                    Top Matches
                  </CardTitle>
                  {displayJobTitle && (
                    <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                      <Briefcase className="h-3 w-3 mr-1" />
                      {displayJobTitle}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {!displayJobTitle && jobs && jobs.length > 0 && (
                    <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                      <SelectTrigger className="bg-gray-200 dark:bg-zinc-800 border-border h-8 text-xs w-48">
                        <SelectValue placeholder="Filter by job..." />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-200 dark:bg-zinc-800 border-border">
                        {jobs.map((job) => (
                          <SelectItem key={job.id} value={job.id} className="text-xs">
                            {job.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {topCandidates.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-border hover:bg-muted"
                      data-testid="button-view-shortlist"
                      onClick={() => setShowShortlistDialog(true)}
                    >
                      View Shortlist ({shortlistedCount})
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {topCandidates.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {topCandidates.map((candidate, index) => {
                    const metadata = candidate.metadata as any;
                    const candidateJob = getCandidateJob(candidate.jobId);
                    return (
                      <div
                        key={candidate.id}
                        onClick={() => handleCandidateClick(candidate)}
                        className="group p-5 rounded-xl border border-border bg-card hover:border-[#FFCB00]/40 hover:shadow-lg hover:shadow-[#FFCB00]/5 transition-all cursor-pointer relative"
                        data-testid={`candidate-card-${candidate.id}`}
                      >
                        {index < 3 && (
                          <div className={`absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shadow-md ${
                            index === 0 ? 'bg-yellow-500 text-black' : index === 1 ? 'bg-gray-400 text-black' : 'bg-amber-600 text-white'
                          }`}>
                            {index + 1}
                          </div>
                        )}

                        <div className="flex items-start gap-4 mb-3">
                          <Avatar className="h-12 w-12 bg-[#0A0A0A] flex-shrink-0">
                            <AvatarFallback className="text-white text-sm font-bold bg-transparent">
                              {candidate.fullName?.split(' ').map(n => n[0]).join('') || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-base truncate">{candidate.fullName}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{candidate.role || 'No role specified'}</p>
                            {metadata?.company && (
                              <p className="text-xs text-gray-500 dark:text-gray-500 flex items-center gap-1 mt-0.5">
                                <Building2 className="h-3 w-3" /> {metadata.company}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg mb-3 border ${getMatchColor(candidate.match || 0)}`}>
                          <span className="text-lg font-bold">{candidate.match || 0}%</span>
                          <span className="text-xs opacity-80">{getMatchLabel(candidate.match || 0)}</span>
                        </div>

                        {(candidate.location || metadata?.location) && (
                          <p className="text-xs text-gray-500 dark:text-gray-500 flex items-center gap-1 mb-2">
                            <MapPin className="h-3 w-3" /> {candidate.location || metadata?.location}
                          </p>
                        )}

                        {candidate.skills && (candidate.skills as string[]).length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {(candidate.skills as string[]).slice(0, 5).map((skill, i) => (
                              <Badge key={i} variant="outline" className="text-[10px] px-1.5 py-0 bg-muted/50 border-border">
                                {skill}
                              </Badge>
                            ))}
                            {(candidate.skills as string[]).length > 5 && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-muted/50 border-border">
                                +{(candidate.skills as string[]).length - 5}
                              </Badge>
                            )}
                          </div>
                        )}

                        <ContactEnrichmentSection candidate={candidate} metadata={metadata} />

                        <div className="mt-3 pt-3 border-t border-border flex gap-2">
                          <Button
                            size="sm"
                            className="bg-[#FFCB00] hover:bg-[#E6B800] text-black text-xs h-7"
                            onClick={(e: any) => { e.stopPropagation(); handleCandidateClick(candidate); }}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View Profile
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className={`border-border hover:bg-muted text-xs h-7 ${candidate.stage === 'Shortlisted' ? 'bg-green-500/20 text-green-600 border-green-500/30' : ''}`}
                            onClick={(e: any) => { e.stopPropagation(); handleShortlist(candidate, e); }}
                            disabled={candidate.stage === 'Shortlisted' || shortlistingId === String(candidate.id)}
                          >
                            {shortlistingId === String(candidate.id) ? (
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            ) : (
                              <ThumbsUp className="h-3 w-3 mr-1" />
                            )}
                            {candidate.stage === 'Shortlisted' ? 'Shortlisted' : shortlistingId === String(candidate.id) ? 'Shortlisting...' : 'Shortlist'}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-16 text-gray-500 dark:text-gray-500">
                  <Bot className="h-16 w-16 mx-auto mb-4 opacity-20" />
                  <h3 className="text-lg font-medium text-foreground mb-1">No candidates yet</h3>
                  <p className="text-sm max-w-md mx-auto">Select a job position above and deploy AI agents to find and rank top candidates automatically.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Sessions - Compact Horizontal */}
          {sessions && sessions.length > 0 && (
            <Card className="bg-gray-100 dark:bg-zinc-900/50 border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  Recent Sessions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  {sessions.slice(0, 5).map((session) => {
                    const job = jobs?.find(j => j.id === session.jobId);
                    return (
                      <div
                        key={session.id}
                        className="p-3 bg-muted/50 rounded-lg border border-border"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-sm truncate flex-1">
                            {job?.title || 'Unknown Job'}
                          </span>
                          <Badge className={`text-[10px] ml-2 ${
                            session.status === 'Completed' ? 'bg-green-500/20 text-green-600 dark:text-green-400' :
                            session.status === 'Running' ? 'bg-blue-500/20 text-[#FFCB00]' :
                            'bg-red-500/20 text-red-600 dark:text-red-400'
                          }`}>
                            {session.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-500">
                          <span>{session.candidatesFound} found</span>
                          <span>{session.candidatesAdded} added</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Agent Activity Modal */}
      <Dialog open={showAgentModal} onOpenChange={setShowAgentModal}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden bg-card border-border text-foreground">
          <DialogHeader className="border-b border-border pb-4">
            <DialogTitle className="text-xl flex items-center gap-2">
              <Bot className="h-6 w-6 text-[#FFCB00]" />
              AI Agents Working
              {isSimulating && (
                <Badge className="ml-2 bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30">
                  <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse" />
                  Live
                </Badge>
              )}
              {!isSimulating && agentMessages.length > 0 && (
                <Badge className="ml-2 bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Complete
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription className="text-gray-500 dark:text-gray-400">
              {selectedJob ? `Sourcing candidates for: ${selectedJob.title}` : 'Deploying sourcing agents across platforms'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            {/* Left: AI Agent Workflow */}
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="px-4 py-3 bg-muted/50 border-b border-border">
                <h3 className="font-medium text-sm flex items-center gap-2">
                  <Bot className="h-4 w-4 text-[#FFCB00]" />
                  AI Agent Workflow
                </h3>
              </div>
              <ScrollArea className="h-[400px]">
                <div className="p-3 space-y-1.5">
                  {Object.entries(agentsByCategory).length === 0 ? (
                    <div className="text-center py-8">
                      <Loader2 className="h-6 w-6 text-gray-500 mx-auto animate-spin" />
                    </div>
                  ) : (
                    Object.entries(agentsByCategory).map(([category, agents]) => (
                      <div key={category}>
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-2 py-1.5">{category}</p>
                        {agents.map((agent) => {
                          const isActive = effectiveStep === 1;
                          const sessionResult = specialistResultsFromSession.find(
                            (r: any) => r.platform === agent.platform || r.specialist === agent.name
                          );
                          const hasResult = sessionResult && sessionResult.found > 0;
                          return (
                            <div
                              key={agent.platform}
                              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
                                isActive ? 'bg-[#FFCB00]/10' : hasResult ? 'bg-green-500/5' : ''
                              }`}
                              data-testid={`agent-${agent.platform.toLowerCase().replace(/\s+/g, '-')}`}
                            >
                              <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                                isActive ? 'bg-[#FFCB00]' : hasResult ? 'bg-green-500' : 'bg-gray-300 dark:bg-zinc-700'
                              }`}>
                                {isActive ? (
                                  <Loader2 className="h-3 w-3 animate-spin text-white" />
                                ) : hasResult ? (
                                  <CheckCircle className="h-3 w-3 text-white" />
                                ) : (
                                  <div className="w-2 h-2 rounded-full bg-gray-400 dark:bg-zinc-500" />
                                )}
                              </div>
                              <span className={`flex-1 text-sm ${isActive ? 'text-foreground' : hasResult ? 'text-gray-700 dark:text-gray-300' : 'text-gray-500 dark:text-gray-500'}`}>
                                {agent.name}
                              </span>
                              {hasResult && (
                                <Badge className="text-[10px] px-1.5 py-0 bg-green-500/20 text-green-600 dark:text-green-400">
                                  {sessionResult?.found || 0} found
                                </Badge>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Right: Live Activity Feed */}
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="px-4 py-3 bg-muted/50 border-b border-border">
                <h3 className="font-medium text-sm flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-[#FFCB00]" />
                  Live Agent Activity
                </h3>
              </div>
              <ScrollArea className="h-[400px]">
                <div className="p-3 space-y-2">
                  {agentMessages.length === 0 && !isSimulating ? (
                    <div className="text-center py-12 text-gray-500 dark:text-gray-500">
                      <Bot className="h-10 w-10 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">Waiting for agents to start...</p>
                    </div>
                  ) : (
                    agentMessages.map((msg, index) => (
                      <div
                        key={index}
                        className="flex gap-2 animate-in slide-in-from-bottom-2 duration-300"
                        style={{ animationDelay: `${index * 30}ms` }}
                      >
                        <Avatar className={`h-7 w-7 flex-shrink-0 ${getAgentColor(msg.agent)}`}>
                          <AvatarFallback className="text-[10px] font-bold text-white bg-transparent">
                            {getAgentAvatar(msg.agent)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 bg-muted/50 rounded-lg p-2 border border-border">
                          <span className="font-medium text-xs text-gray-700 dark:text-gray-300">{msg.agent}</span>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{msg.message}</p>
                        </div>
                      </div>
                    ))
                  )}
                  {isSimulating && (
                    <div className="flex gap-2 animate-pulse">
                      <Avatar className="h-7 w-7 bg-[#FFCB00] flex-shrink-0">
                        <AvatarFallback className="text-[10px] font-bold text-white bg-transparent">AI</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 bg-muted/50 rounded-lg p-2 border border-border">
                        <div className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-[#FFCB00] rounded-full animate-bounce" />
                          <span className="w-1.5 h-1.5 bg-[#FFCB00] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-1.5 h-1.5 bg-[#FFCB00] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Shortlisted Candidates Dialog */}
      <Dialog open={showShortlistDialog} onOpenChange={setShowShortlistDialog}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden bg-card border-border text-foreground">
          <DialogHeader className="border-b border-border pb-4">
            <DialogTitle className="text-xl flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              Shortlisted Candidates
              {displayJobTitle && (
                <Badge className="ml-2 bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30">
                  <Briefcase className="h-3 w-3 mr-1" />
                  {displayJobTitle}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription className="text-gray-500 dark:text-gray-400">
              Top talent ready for interviews and offers
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[65vh] pr-4">
            {(() => {
              const shortlisted = candidates
                ?.filter(c => c.stage === "Shortlisted" && (activeJobId ? c.jobId === activeJobId : true))
                .sort((a, b) => (b.match || 0) - (a.match || 0)) || [];

              if (shortlisted.length === 0) {
                return (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-500">
                    <Star className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <h3 className="text-base font-medium text-foreground mb-1">No shortlisted candidates</h3>
                    <p className="text-sm">
                      {activeJobId
                        ? "No candidates have been shortlisted for this position yet."
                        : "Shortlist candidates from the top matches to see them here."}
                    </p>
                  </div>
                );
              }

              return (
                <div className="space-y-3 py-4">
                  {shortlisted.map((candidate) => {
                    const metadata = candidate.metadata as any;
                    return (
                      <div
                        key={candidate.id}
                        className="flex items-center gap-4 p-4 rounded-lg border border-border bg-muted/50 hover:border-[#FFCB00]/30 transition-all"
                      >
                        <Avatar className="h-11 w-11 bg-[#0A0A0A] flex-shrink-0">
                          <AvatarFallback className="text-white text-sm font-bold bg-transparent">
                            {candidate.fullName?.split(' ').map(n => n[0]).join('') || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold truncate">{candidate.fullName}</h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{candidate.role || 'No role specified'}</p>
                          {(candidate.location || metadata?.location) && (
                            <p className="text-xs text-gray-500 dark:text-gray-500 flex items-center gap-1 mt-0.5">
                              <MapPin className="h-3 w-3" /> {candidate.location || metadata?.location}
                            </p>
                          )}
                        </div>
                        <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-sm font-semibold ${getMatchColor(candidate.match || 0)}`}>
                          {candidate.match || 0}%
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-border hover:bg-muted h-8 text-xs"
                            onClick={() => {
                              setShowShortlistDialog(false);
                              handleCandidateClick(candidate);
                            }}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            Profile
                          </Button>
                          {(() => {
                            const check = interestChecks?.filter((c: any) => c.candidateId === candidate.id)?.[0];
                            const status = check?.status;
                            if (status === "interested") {
                              return (
                                <Button
                                  size="sm"
                                  className="bg-[#FFCB00] hover:bg-[#E6B800] text-black h-8 text-xs"
                                  data-testid={`ai-interview-${candidate.id}`}
                                  onClick={() => {
                                    setInviteCandidate(candidate);
                                    setInviteOpen(true);
                                  }}
                                >
                                  <Bot className="h-3 w-3 mr-1" />
                                  AI Interview
                                </Button>
                              );
                            } else if (status === "sent" || status === "pending") {
                              return (
                                <Badge className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/30 text-xs px-2 py-1 gap-1">
                                  <Clock className="h-3 w-3" />
                                  Awaiting Response
                                </Badge>
                              );
                            } else {
                              return (
                                <Button
                                  size="sm"
                                  className="bg-blue-600 hover:bg-blue-500 text-white h-8 text-xs"
                                  data-testid={`interest-check-${candidate.id}`}
                                  onClick={() => {
                                    setInterestCheckCandidate(candidate);
                                    setInterestCheckOpen(true);
                                  }}
                                >
                                  <Send className="h-3 w-3 mr-1" />
                                  Interest Check
                                </Button>
                              );
                            }
                          })()}
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-300 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 h-8 text-xs"
                            data-testid={`remove-shortlist-${candidate.id}`}
                            onClick={async () => {
                              setRemovingId(String(candidate.id));
                              try {
                                await updateCandidateMutation.mutateAsync({
                                  id: String(candidate.id),
                                  updates: { stage: "Screening" },
                                });
                                toast.success(`${candidate.fullName} removed from shortlist`);
                              } catch {
                                toast.error("Failed to remove from shortlist");
                              } finally {
                                setRemovingId(null);
                              }
                            }}
                            disabled={removingId === String(candidate.id)}
                          >
                            {removingId === String(candidate.id) ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <X className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Candidate Details Dialog */}
      <Dialog open={showCandidateDialog} onOpenChange={setShowCandidateDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden bg-card border-border text-foreground">
          <DialogHeader className="border-b border-border pb-4">
            <DialogTitle className="text-xl flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              Top Matched Candidates
              {displayJobTitle && (
                <Badge className="ml-2 bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30">
                  {displayJobTitle}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription className="text-gray-500 dark:text-gray-400">
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
                    ref={(el) => {
                      if (el && selectedCandidate?.id === candidate.id) {
                        requestAnimationFrame(() => el.scrollIntoView({ behavior: 'instant', block: 'center' }));
                      }
                    }}
                    className={`p-4 rounded-lg border transition-all ${
                      selectedCandidate?.id === candidate.id
                        ? 'bg-[#FFCB00]/10 border-[#FFCB00]/50'
                        : 'bg-muted/50 border-border hover:border-border'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Avatar & Rank */}
                      <div className="relative flex-shrink-0">
                        <Avatar className="h-14 w-14 bg-[#0A0A0A]">
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
                            <p className="text-gray-500 dark:text-gray-400">{candidate.role}</p>
                            {metadata?.company && (
                              <p className="text-sm text-gray-500 dark:text-gray-500 flex items-center gap-1 mt-1">
                                <Building2 className="h-3 w-3" /> {metadata.company}
                              </p>
                            )}
                            {(candidate.location || metadata?.location) && (
                              <p className="text-sm text-gray-500 dark:text-gray-500 flex items-center gap-1">
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
                            <p className="text-xs text-gray-500 dark:text-gray-500 mb-2">Skills</p>
                            <div className="flex flex-wrap gap-1.5">
                              {(candidate.skills as string[]).slice(0, 8).map((skill, i) => (
                                <Badge key={i} variant="outline" className="text-xs bg-gray-200 dark:bg-zinc-800 border-border">
                                  {skill}
                                </Badge>
                              ))}
                              {(candidate.skills as string[]).length > 8 && (
                                <Badge variant="outline" className="text-xs bg-gray-200 dark:bg-zinc-800 border-border">
                                  +{(candidate.skills as string[]).length - 8} more
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Experience */}
                        {metadata?.experience && (
                          <div className="mt-3">
                            <p className="text-xs text-gray-500 dark:text-gray-500 mb-1">Experience</p>
                            <p className="text-sm text-gray-700 dark:text-gray-300">{metadata.experience}</p>
                          </div>
                        )}

                        {/* AI Reasoning */}
                        {metadata?.aiReasoning && (
                          <div className="mt-3 p-3 bg-[#FFCB00]/10 rounded-lg border border-[#FFCB00]/20">
                            <p className="text-xs text-[#FFCB00] mb-1 flex items-center gap-1">
                              <Brain className="h-3 w-3" /> AI Analysis
                            </p>
                            <p className="text-sm text-gray-700 dark:text-gray-300">{metadata.aiReasoning}</p>
                          </div>
                        )}

                        {/* Applied For Job */}
                        {candidateJob && (
                          <div className="mt-3 pt-3 border-t border-border">
                            <p className="text-xs text-gray-500 dark:text-gray-500 flex items-center gap-1">
                              <Briefcase className="h-3 w-3" /> Applied for: <span className="text-gray-700 dark:text-gray-300">{candidateJob.title}</span>
                            </p>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="mt-4 flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className={`border-border hover:bg-muted ${candidate.stage === 'Shortlisted' ? 'bg-green-500/20 text-green-600 border-green-500/30' : ''}`}
                            onClick={() => handleShortlist(candidate)}
                            disabled={candidate.stage === 'Shortlisted' || shortlistingId === String(candidate.id)}
                          >
                            {shortlistingId === String(candidate.id) ? (
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            ) : (
                              <ThumbsUp className="h-4 w-4 mr-1" />
                            )}
                            {candidate.stage === 'Shortlisted' ? 'Shortlisted' : shortlistingId === String(candidate.id) ? 'Shortlisting...' : 'Shortlist'}
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

      {/* Interview Invite Dialog */}
      <InterviewInviteDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        candidate={inviteCandidate}
        job={selectedJob}
      />

      {/* Interest Check Dialog */}
      <InterestCheckDialog
        open={interestCheckOpen}
        onOpenChange={setInterestCheckOpen}
        candidate={interestCheckCandidate}
        job={interestCheckCandidate?.jobId ? jobs?.find(j => j.id === interestCheckCandidate.jobId) : selectedJob}
        onSent={() => {
          queryClient.invalidateQueries({ queryKey: interestChecksKey });
        }}
      />
    </div>
  );
}
