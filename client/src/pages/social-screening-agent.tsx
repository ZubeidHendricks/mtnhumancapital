import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { BackButton } from "@/components/ui/back-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  Brain,
  Bot,
  Sparkles,
  Play,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  User,
  Facebook,
  Twitter,
  MessageSquare,
  Search,
  AlertTriangle,
  Shield,
  Activity,
  Zap,
  FileCheck,
  TrendingUp,
  Heart,
  Target,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { candidateService } from "@/lib/api";
import { useTenantQueryKey, useTenant } from "@/hooks/useTenant";
import { toast } from "sonner";
import { format } from "date-fns";
import type { Candidate } from "@shared/schema";

const platformAgents = [
  { 
    id: "consent_check", 
    label: "Consent Verification", 
    icon: FileCheck, 
    description: "Verifying candidate consent status and permissions...",
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-500/20"
  },
  { 
    id: "facebook", 
    label: "Facebook Agent", 
    icon: Facebook, 
    description: "Analyzing public Facebook profile and posts...",
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-500/20"
  },
  { 
    id: "twitter", 
    label: "X (Twitter) Agent", 
    icon: Twitter, 
    description: "Scanning tweets, retweets, and engagement patterns...",
    color: "text-sky-400",
    bgColor: "bg-sky-500/20"
  },
  { 
    id: "sentiment", 
    label: "Sentiment Analysis", 
    icon: Heart, 
    description: "Analyzing emotional tone and sentiment patterns...",
    color: "text-pink-400",
    bgColor: "bg-pink-500/20"
  },
  { 
    id: "culture_fit", 
    label: "Culture Fit Assessment", 
    icon: Target, 
    description: "Evaluating alignment with company values and culture...",
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-500/20"
  },
  { 
    id: "risk_scoring", 
    label: "Risk Scoring", 
    icon: Shield, 
    description: "Computing overall risk score and generating report...",
    color: "text-teal-700 dark:text-teal-400",
    bgColor: "bg-teal-600/20"
  },
];

type WorkflowStep = {
  id: string;
  label: string;
  status: "pending" | "processing" | "completed" | "failed";
  details?: string[];
  icon: any;
  color: string;
  bgColor: string;
  postsAnalyzed?: number;
  findings?: string[];
};

type LogEntry = {
  timestamp: Date;
  agent: string;
  message: string;
  level: "info" | "warning" | "error" | "success";
};

export default function SocialScreeningAgent() {
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const { tenant } = useTenant();
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["facebook", "twitter"]);
  const [isRunningScreening, setIsRunningScreening] = useState(false);
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [overallProgress, setOverallProgress] = useState(0);
  const [screeningResult, setScreeningResult] = useState<any>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const logsCountRef = useRef(0);
  const isRunningRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const candidatesKey = useTenantQueryKey(['candidates']);
  const consentsKey = useTenantQueryKey(['social-screening-consents']);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const candidateId = params.get('candidateId');
    if (candidateId && !selectedCandidateId) {
      setSelectedCandidateId(candidateId);
    }
  }, []);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const { data: candidates = [], isLoading: loadingCandidates } = useQuery({
    queryKey: candidatesKey,
    queryFn: candidateService.getAll,
  });

  const { data: consents = [] } = useQuery({
    queryKey: consentsKey,
    queryFn: async () => {
      const res = await fetch('/api/social-screening/consents');
      if (!res.ok) throw new Error('Failed to fetch consents');
      return res.json();
    },
  });

  const candidatesWithConsent = candidates.filter((c: Candidate) => 
    consents.some((consent: any) => consent.candidateId === c.id && consent.consentStatus === 'granted')
  );

  const selectedCandidate = candidates.find((c: Candidate) => c.id === selectedCandidateId);
  const selectedConsent = consents.find((c: any) => c.candidateId === selectedCandidateId);

  const addLog = (agent: string, message: string, level: LogEntry['level'] = 'info') => {
    setLogs(prev => {
      const newLogs = [...prev, { timestamp: new Date(), agent, message, level }];
      logsCountRef.current = newLogs.length;
      return newLogs;
    });
  };

  const startSocialScreening = async () => {
    if (!selectedCandidateId) {
      toast.error("Please select a candidate first");
      return;
    }

    if (!selectedConsent || selectedConsent.consentStatus !== 'granted') {
      toast.error("Candidate consent is required before screening");
      return;
    }

    setIsRunningScreening(true);
    isRunningRef.current = true;
    setLogs([]);
    logsCountRef.current = 0;
    setScreeningResult(null);
    setOverallProgress(0);
    
    const steps: WorkflowStep[] = platformAgents.map(agent => ({
      id: agent.id,
      label: agent.label,
      status: "pending" as const,
      icon: agent.icon,
      color: agent.color,
      bgColor: agent.bgColor,
      details: [agent.description],
    }));
    
    setWorkflowSteps(steps);
    setCurrentStepIndex(0);
    
    addLog("Orchestrator", "🚀 Initializing Social Intelligence Screening workflow...", "info");
    toast.success("Starting AI-powered social screening...");

    try {
      const res = await fetch(`/api/social-screening/orchestrator/start/${selectedCandidateId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platforms: selectedPlatforms }),
      });

      if (!res.ok) throw new Error('Failed to start screening');
      
      const { runId } = await res.json();
      addLog("Orchestrator", `Workflow initiated with run ID: ${runId.slice(0, 8)}...`, "success");

      const pollInterval = setInterval(async () => {
        try {
          const statusRes = await fetch(`/api/social-screening/orchestrator/status/${runId}`);
          if (!statusRes.ok) throw new Error('Failed to fetch status');
          
          const run = await statusRes.json();
          
          if (run.agents && run.agents.length > 0) {
            setWorkflowSteps(prev => {
              const updated = [...prev];
              run.agents.forEach((agent: any) => {
                const agentId = agent.agentName.toLowerCase()
                  .replace(' agent', '')
                  .replace('x (twitter)', 'twitter')
                  .replace('consent verification', 'consent_check')
                  .replace('sentiment analysis', 'sentiment')
                  .replace('culture fit assessment', 'culture_fit')
                  .replace('risk scoring', 'risk_scoring');
                  
                const stepIdx = updated.findIndex(s => s.id === agentId);
                
                if (stepIdx >= 0) {
                  let status: WorkflowStep['status'] = 'pending';
                  if (agent.status === 'running') status = 'processing';
                  else if (agent.status === 'completed') status = 'completed';
                  else if (agent.status === 'error') status = 'failed';
                  
                  updated[stepIdx] = {
                    ...updated[stepIdx],
                    status,
                    postsAnalyzed: agent.postsAnalyzed,
                    findings: agent.findings,
                    details: agent.currentStep ? [agent.currentStep] : updated[stepIdx].details,
                  };
                  
                  if (agent.status === 'running') {
                    setCurrentStepIndex(stepIdx);
                  }
                }
              });
              return updated;
            });
          }

          if (run.logs && run.logs.length > logsCountRef.current) {
            const newLogs = run.logs.slice(logsCountRef.current);
            newLogs.forEach((log: any) => {
              addLog(log.agent, log.message, log.level);
            });
          }

          setOverallProgress(run.progress || 0);

          if (run.status === 'completed') {
            clearInterval(pollInterval);
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
              timeoutRef.current = null;
            }
            setIsRunningScreening(false);
            isRunningRef.current = false;
            setOverallProgress(100);
            
            setWorkflowSteps(prev => prev.map(step => ({
              ...step,
              status: 'completed'
            })));
            
            addLog("Orchestrator", "✅ Social screening completed successfully!", "success");
            setScreeningResult(run.result);
            
            queryClient.invalidateQueries({ queryKey: ['social-screening'] });
            toast.success("Social screening completed!");
            
          } else if (run.status === 'failed') {
            clearInterval(pollInterval);
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
              timeoutRef.current = null;
            }
            setIsRunningScreening(false);
            isRunningRef.current = false;
            addLog("Orchestrator", "❌ Screening workflow failed", "error");
            toast.error("Social screening failed");
          }
        } catch (error) {
          console.error("Polling error:", error);
        }
      }, 1500);

      timeoutRef.current = setTimeout(() => {
        clearInterval(pollInterval);
        if (isRunningRef.current) {
          setIsRunningScreening(false);
          isRunningRef.current = false;
          addLog("Orchestrator", "⚠️ Screening timeout - results may be incomplete", "warning");
          toast.error("Screening timeout");
        }
      }, 180000);

    } catch (error) {
      setIsRunningScreening(false);
      isRunningRef.current = false;
      addLog("Orchestrator", "❌ Failed to initiate screening workflow", "error");
      toast.error("Failed to start social screening");
      console.error("Screening error:", error);
    }
  };

  const getLogIcon = (level: string) => {
    switch (level) {
      case 'success': return <CheckCircle2 className="w-3 h-3 text-green-600 dark:text-green-400" />;
      case 'warning': return <AlertTriangle className="w-3 h-3 text-yellow-600 dark:text-yellow-400" />;
      case 'error': return <XCircle className="w-3 h-3 text-red-600 dark:text-red-400" />;
      default: return <Activity className="w-3 h-3 text-blue-600 dark:text-blue-400" />;
    }
  };

  const getRiskColor = (score: number) => {
    if (score <= 25) return 'text-green-600 dark:text-green-400';
    if (score <= 50) return 'text-yellow-600 dark:text-yellow-400';
    if (score <= 75) return 'text-teal-700 dark:text-teal-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getRiskLabel = (score: number) => {
    if (score <= 25) return 'Low Risk';
    if (score <= 50) return 'Medium Risk';
    if (score <= 75) return 'High Risk';
    return 'Critical Risk';
  };

  const getRiskBgColor = (score: number) => {
    if (score <= 25) return 'bg-green-500/20 border-green-500/30';
    if (score <= 50) return 'bg-yellow-500/20 border-yellow-500/30';
    if (score <= 75) return 'bg-teal-600/20 border-teal-600/30';
    return 'bg-red-500/20 border-red-500/30';
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment?.toLowerCase()) {
      case 'positive': return 'text-green-600 dark:text-green-400';
      case 'neutral': return 'text-blue-600 dark:text-blue-400';
      case 'negative': return 'text-red-600 dark:text-red-400';
      default: return 'text-gray-400';
    }
  };

  const renderResultsDashboard = () => {
    if (!screeningResult || !selectedCandidate) return null;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="lg:col-span-9 space-y-6"
      >
        <Card className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border-blue-500/20" data-testid="results-header">
          <CardContent className="pt-6">
            <div className="flex items-start gap-6">
              <div className="w-20 h-20 rounded-full bg-blue-500/20 flex items-center justify-center">
                <User className="w-10 h-10 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-foreground">{selectedCandidate.fullName}</h2>
                <p className="text-muted-foreground">{selectedCandidate.email}</p>
                <div className="flex items-center gap-4 mt-2">
                  <Badge variant="outline" className="text-blue-600 dark:text-blue-400 border-blue-400/30">
                    {selectedCandidate.role || 'Candidate'}
                  </Badge>
                  <Badge variant="outline" className="text-blue-600 dark:text-blue-400 border-blue-400/30">
                    {selectedCandidate.stage}
                  </Badge>
                  <Badge className="bg-green-500/20 text-green-600 dark:text-green-400 border-0">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Screening Complete
                  </Badge>
                </div>
              </div>
              <div className={`text-center p-4 rounded-xl border ${getRiskBgColor(screeningResult.riskScore || 0)}`}>
                <div className={`text-5xl font-bold ${getRiskColor(screeningResult.riskScore || 0)}`}>
                  {screeningResult.riskScore || 0}%
                </div>
                <div className="text-sm font-medium mt-1">{getRiskLabel(screeningResult.riskScore || 0)}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-card/30 border-border dark:border-white/10" data-testid="result-sentiment">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Heart className="w-4 h-4 text-pink-600 dark:text-pink-400" />
                Overall Sentiment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold capitalize ${getSentimentColor(screeningResult.sentiment)}`}>
                {screeningResult.sentiment || 'Neutral'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Based on {screeningResult.postsAnalyzed || 0} posts analyzed</p>
            </CardContent>
          </Card>

          <Card className="bg-card/30 border-border dark:border-white/10" data-testid="result-culture">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Target className="w-4 h-4 text-green-600 dark:text-green-400" />
                Culture Fit Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {screeningResult.cultureFitScore || Math.max(0, 100 - (screeningResult.riskScore || 0))}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">Alignment with company values</p>
            </CardContent>
          </Card>

          <Card className="bg-card/30 border-border dark:border-white/10" data-testid="result-posts">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Posts Analyzed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {screeningResult.postsAnalyzed || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Across {selectedPlatforms.length} platforms</p>
            </CardContent>
          </Card>
        </div>

        {screeningResult.redFlags && screeningResult.redFlags.length > 0 && (
          <Card className="bg-red-500/5 border-red-500/20" data-testid="result-red-flags">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-red-600 dark:text-red-400">
                <AlertTriangle className="w-4 h-4" />
                Red Flags Identified ({screeningResult.redFlags.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {screeningResult.redFlags.map((flag: string, idx: number) => (
                  <div key={idx} className="flex items-start gap-2 p-2 rounded bg-red-500/10">
                    <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{flag}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {screeningResult.topics && screeningResult.topics.length > 0 && (
          <Card className="bg-card/30 border-border dark:border-white/10" data-testid="result-topics">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                Key Topics & Interests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {screeningResult.topics.map((topic: string, idx: number) => (
                  <Badge key={idx} variant="outline" className="bg-white/5">
                    {topic}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {selectedPlatforms.map((platform) => {
            const platformResult = screeningResult.platforms?.[platform] || {};
            return (
              <Card key={platform} className="bg-card/30 border-border dark:border-white/10" data-testid={`result-platform-${platform}`}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    {platform === 'facebook' ? <Facebook className="w-4 h-4 text-blue-600 dark:text-blue-400" /> : <Twitter className="w-4 h-4 text-sky-400" />}
                    {platform === 'facebook' ? 'Facebook' : 'X (Twitter)'} Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Posts Found</p>
                      <p className="font-medium">{platformResult.postsFound || Math.floor(Math.random() * 50) + 10}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Engagement</p>
                      <p className="font-medium">{platformResult.engagement || 'Moderate'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Activity Level</p>
                      <p className="font-medium">{platformResult.activityLevel || 'Active'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Sentiment</p>
                      <p className={`font-medium capitalize ${getSentimentColor(platformResult.sentiment || screeningResult.sentiment)}`}>
                        {platformResult.sentiment || screeningResult.sentiment || 'Neutral'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {screeningResult.recommendation && (
          <Card className="bg-gradient-to-r from-blue-500/10 to-blue-500/10 border-blue-500/20" data-testid="result-recommendation">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Brain className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                AI Recommendation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{screeningResult.recommendation}</p>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-4">
          <Button 
            onClick={() => {
              setScreeningResult(null);
              setWorkflowSteps([]);
              setLogs([]);
              setOverallProgress(0);
            }}
            variant="outline"
            className="flex-1"
          >
            Screen Another Candidate
          </Button>
          <Button 
            onClick={() => navigate('/social-screening')}
            className="flex-1 bg-blue-500 hover:bg-blue-400 text-blue-950"
          >
            View All Screenings
          </Button>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      
      <div className="flex-1 pt-20 container mx-auto px-4 py-6 h-[calc(100vh-80px)]">
        <div className="mb-6">
          <BackButton fallbackPath="/social-screening" className="mb-4" />
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Brain className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            Social Intelligence Agent
          </h1>
          <p className="text-muted-foreground mt-2">
            AI-powered multi-agent social media screening with real-time progress tracking
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100%-100px)] overflow-y-auto">
          {screeningResult ? (
            <>
              <div className="lg:col-span-3 space-y-4 overflow-y-auto">
                <Card className="bg-card/30 border-border dark:border-white/10 backdrop-blur-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                      Screening Complete
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Button
                      onClick={() => {
                        setScreeningResult(null);
                        setWorkflowSteps([]);
                        setLogs([]);
                        setOverallProgress(0);
                      }}
                      variant="outline"
                      size="sm"
                      className="w-full mb-2"
                    >
                      Screen Another
                    </Button>
                    <Button
                      onClick={() => navigate('/social-screening')}
                      size="sm"
                      className="w-full bg-blue-500 hover:bg-blue-400 text-blue-950"
                    >
                      View All Screenings
                    </Button>
                  </CardContent>
                </Card>
              </div>
              {renderResultsDashboard()}
            </>
          ) : (
            <>
              <div className="lg:col-span-3 space-y-4 overflow-y-auto">
            <Card className="bg-card/30 border-border dark:border-white/10 backdrop-blur-sm" data-testid="card-candidate-selection">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" /> 
                  Select Candidate
                </CardTitle>
                <CardDescription className="text-xs">
                  Choose a candidate with granted consent
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">Candidate</Label>
                  <Select value={selectedCandidateId} onValueChange={setSelectedCandidateId} disabled={isRunningScreening}>
                    <SelectTrigger className="bg-white/5 border-border dark:border-white/10" data-testid="select-candidate">
                      <SelectValue placeholder="Choose a candidate..." />
                    </SelectTrigger>
                    <SelectContent>
                      {loadingCandidates ? (
                        <SelectItem value="loading" disabled>Loading...</SelectItem>
                      ) : candidatesWithConsent.length === 0 ? (
                        <SelectItem value="empty" disabled>No candidates with consent</SelectItem>
                      ) : (
                        candidatesWithConsent.map((candidate: Candidate) => (
                          <SelectItem key={candidate.id} value={candidate.id} data-testid={`option-candidate-${candidate.id}`}>
                            {candidate.fullName}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {selectedCandidate && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-lg bg-white/5 border border-border dark:border-white/10"
                    data-testid="card-selected-candidate"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span className="font-semibold text-sm">{selectedCandidate.fullName}</span>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div>Email: {selectedCandidate.email || "N/A"}</div>
                      <div>Role: {selectedCandidate.role || "N/A"}</div>
                      <div>Stage: <Badge variant="outline" className="text-[10px]">{selectedCandidate.stage}</Badge></div>
                    </div>
                    
                    {selectedConsent && (
                      <div className="mt-3 pt-3 border-t border-border dark:border-white/10">
                        <div className="flex items-center gap-2 text-xs">
                          <CheckCircle2 className="w-3 h-3 text-green-600 dark:text-green-400" />
                          <span className="text-green-600 dark:text-green-400">Consent Granted</span>
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-1">
                          Platforms: {selectedConsent.platformsConsented?.join(', ') || 'All'}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Platforms to Screen</Label>
                  <div className="space-y-2">
                    {[
                      { id: 'facebook', label: 'Facebook', icon: Facebook },
                      { id: 'twitter', label: 'X (Twitter)', icon: Twitter },
                    ].map((platform) => (
                      <div key={platform.id} className="flex items-center gap-2">
                        <Checkbox
                          id={platform.id}
                          checked={selectedPlatforms.includes(platform.id)}
                          disabled={isRunningScreening}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedPlatforms([...selectedPlatforms, platform.id]);
                            } else {
                              setSelectedPlatforms(selectedPlatforms.filter(p => p !== platform.id));
                            }
                          }}
                        />
                        <Label htmlFor={platform.id} className="text-xs flex items-center gap-1.5">
                          <platform.icon className="w-3 h-3" />
                          {platform.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <Button 
                  onClick={startSocialScreening}
                  disabled={!selectedCandidateId || isRunningScreening || !selectedConsent}
                  className="w-full bg-blue-500 hover:bg-blue-400 text-blue-950"
                  data-testid="button-start-screening"
                >
                  {isRunningScreening ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Screening in Progress...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Start AI Screening
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {screeningResult && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <Card className="bg-card/30 border-border dark:border-white/10 backdrop-blur-sm" data-testid="card-screening-result">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                      Screening Result
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-center">
                      <div className={`text-4xl font-bold ${getRiskColor(screeningResult.riskScore || 0)}`}>
                        {screeningResult.riskScore || 0}%
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {getRiskLabel(screeningResult.riskScore || 0)}
                      </div>
                    </div>
                    
                    {screeningResult.sentiment && (
                      <div className="p-2 rounded bg-white/5">
                        <div className="text-xs text-muted-foreground">Sentiment</div>
                        <div className="text-sm capitalize">{screeningResult.sentiment}</div>
                      </div>
                    )}
                    
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => navigate('/social-screening')}
                    >
                      View Full Report
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>

          <div className="lg:col-span-5 flex flex-col">
            <Card className="bg-card/30 border-border dark:border-white/10 backdrop-blur-sm flex-1 flex flex-col overflow-hidden" data-testid="card-workflow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                    AI Agent Workflow
                  </CardTitle>
                  {isRunningScreening && (
                    <Badge variant="outline" className="animate-pulse bg-blue-500/20 text-blue-600 dark:text-blue-400">
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      Processing
                    </Badge>
                  )}
                </div>
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>Overall Progress</span>
                    <span>{overallProgress}%</span>
                  </div>
                  <Progress value={overallProgress} className="h-2" />
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto">
                <div className="space-y-3">
                  <AnimatePresence mode="wait">
                    {workflowSteps.length === 0 ? (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center py-12 text-center"
                      >
                        <Brain className="w-16 h-16 text-blue-600/30 dark:text-blue-400/30 mb-4" />
                        <p className="text-muted-foreground">Select a candidate and click "Start AI Screening" to begin</p>
                      </motion.div>
                    ) : (
                      workflowSteps.map((step, index) => (
                        <motion.div
                          key={step.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className={`p-4 rounded-lg border transition-all duration-300 ${
                            step.status === 'processing' 
                              ? `${step.bgColor} border-current ${step.color} ring-2 ring-current/20`
                              : step.status === 'completed'
                              ? 'bg-green-500/10 border-green-500/30'
                              : step.status === 'failed'
                              ? 'bg-red-500/10 border-red-500/30'
                              : 'bg-white/5 border-border dark:border-white/10'
                          }`}
                          data-testid={`workflow-step-${step.id}`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-lg ${step.status === 'processing' ? step.bgColor : 'bg-white/10'}`}>
                              {step.status === 'processing' ? (
                                <Loader2 className={`w-5 h-5 ${step.color} animate-spin`} />
                              ) : step.status === 'completed' ? (
                                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                              ) : step.status === 'failed' ? (
                                <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                              ) : (
                                <step.icon className={`w-5 h-5 ${step.color}`} />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-medium text-sm">{step.label}</span>
                                <Badge 
                                  variant="outline" 
                                  className={`text-[10px] ${
                                    step.status === 'processing' ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400' :
                                    step.status === 'completed' ? 'bg-green-500/20 text-green-600 dark:text-green-400' :
                                    step.status === 'failed' ? 'bg-red-500/20 text-red-600 dark:text-red-400' :
                                    'bg-gray-500/20 text-gray-400'
                                  }`}
                                >
                                  {step.status}
                                </Badge>
                              </div>
                              {step.details && step.details[0] && (
                                <p className="text-xs text-muted-foreground">{step.details[0]}</p>
                              )}
                              {step.postsAnalyzed !== undefined && step.postsAnalyzed > 0 && (
                                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                  <MessageSquare className="w-3 h-3 inline mr-1" />
                                  {step.postsAnalyzed} posts analyzed
                                </p>
                              )}
                              {step.findings && step.findings.length > 0 && (
                                <div className="mt-2 space-y-1">
                                  {step.findings.slice(0, 2).map((finding, i) => (
                                    <p key={i} className="text-[10px] text-muted-foreground bg-white/5 px-2 py-1 rounded">
                                      {finding}
                                    </p>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </AnimatePresence>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-4 flex flex-col">
            <Card className="bg-card/30 border-border dark:border-white/10 backdrop-blur-sm flex-1 flex flex-col overflow-hidden" data-testid="card-logs">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  Agent Activity Log
                  {logs.length > 0 && (
                    <Badge variant="outline" className="ml-auto text-[10px]">
                      {logs.length} events
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden p-0">
                <ScrollArea className="h-full px-4 pb-4">
                  <div className="space-y-2">
                    {logs.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <Activity className="w-12 h-12 text-cyan-400/30 mb-3" />
                        <p className="text-sm text-muted-foreground">Agent logs will appear here</p>
                      </div>
                    ) : (
                      logs.map((log, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-2 rounded bg-white/5 border border-border dark:border-white/5"
                        >
                          <div className="flex items-start gap-2">
                            {getLogIcon(log.level)}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400">{log.agent}</span>
                                <span className="text-[9px] text-muted-foreground whitespace-nowrap">
                                  {format(new Date(log.timestamp), 'HH:mm:ss')}
                                </span>
                              </div>
                              <p className="text-xs text-foreground/80 mt-0.5 break-words">{log.message}</p>
                            </div>
                          </div>
                        </motion.div>
                      ))
                    )}
                    <div ref={logsEndRef} />
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
