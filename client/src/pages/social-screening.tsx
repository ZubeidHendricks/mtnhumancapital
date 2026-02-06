import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { useTenantQueryKey } from "@/hooks/useTenant";
import {
  Users,
  Search,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Eye,
  Send,
  MessageCircle,
  FileCheck,
  ArrowLeft,
  Loader2,
  ThumbsUp,
  ThumbsDown,
  Flag,
  TrendingUp,
  TrendingDown,
  Brain,
  Calendar,
  Clock,
  ExternalLink,
  Facebook,
  Twitter,
  Undo2,
  Bot,
  Zap,
  Activity,
  Sparkles,
  X as XIcon,
  Play
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface AgentStatus {
  agentName: string;
  status: 'idle' | 'running' | 'completed' | 'error';
  progress: number;
  currentStep: string;
  platform?: string;
  postsAnalyzed?: number;
  findings?: string[];
}

interface OrchestratorRun {
  runId: string;
  candidateId: string;
  tenantId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress: number;
  currentStep: string;
  agents: AgentStatus[];
  logs: { timestamp: Date; agent: string; message: string; level: string }[];
  startedAt: Date;
  completedAt?: Date;
  result?: any;
}

function AgentVisualization({ run, onClose }: { run: OrchestratorRun | null; onClose: () => void }) {
  if (!run) return null;
  
  const getAgentIcon = (agentName: string) => {
    if (agentName.toLowerCase().includes('facebook')) return Facebook;
    if (agentName.toLowerCase().includes('twitter') || agentName.toLowerCase().includes('x')) return Twitter;
    if (agentName.toLowerCase().includes('orchestrator')) return Brain;
    return Bot;
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'text-blue-600 dark:text-blue-400 animate-pulse';
      case 'completed': return 'text-green-600 dark:text-green-400';
      case 'error': return 'text-red-600 dark:text-red-400';
      default: return 'text-gray-400';
    }
  };
  
  const getStatusBg = (status: string) => {
    switch (status) {
      case 'running': return 'bg-blue-500/20 border-blue-500/30';
      case 'completed': return 'bg-green-500/20 border-green-500/30';
      case 'error': return 'bg-red-500/20 border-red-500/30';
      default: return 'bg-gray-500/20 border-gray-500/30';
    }
  };

  return (
    <Dialog open={!!run} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <Brain className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            Social Intelligence Agents
            <Badge variant={run.status === 'completed' ? 'default' : 'outline'} 
                   className={run.status === 'in_progress' ? 'animate-pulse' : ''}>
              {run.status}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            AI agents analyzing social media profiles for culture fit assessment
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Overall Progress</span>
              <span className="font-medium">{run.progress}%</span>
            </div>
            <Progress value={run.progress} className="h-2" />
            <p className="text-sm text-muted-foreground">{run.currentStep}</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AnimatePresence>
              {run.agents.map((agent, index) => {
                const IconComponent = getAgentIcon(agent.agentName);
                return (
                  <motion.div
                    key={agent.agentName}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`p-4 rounded-xl border ${getStatusBg(agent.status)}`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${getStatusBg(agent.status)}`}>
                          <IconComponent className={`w-5 h-5 ${getStatusColor(agent.status)}`} />
                        </div>
                        <div>
                          <h4 className="font-semibold">{agent.agentName}</h4>
                          {agent.platform && (
                            <p className="text-xs text-muted-foreground capitalize">{agent.platform}</p>
                          )}
                        </div>
                      </div>
                      {agent.status === 'running' && (
                        <Loader2 className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400" />
                      )}
                      {agent.status === 'completed' && (
                        <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                      )}
                      {agent.status === 'error' && (
                        <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                      )}
                    </div>
                    
                    <Progress value={agent.progress} className="h-1 mb-2" />
                    <p className="text-xs text-muted-foreground truncate">{agent.currentStep}</p>
                    
                    {agent.postsAnalyzed !== undefined && agent.postsAnalyzed > 0 && (
                      <div className="mt-2 flex items-center gap-2 text-xs">
                        <Activity className="w-3 h-3" />
                        <span>{agent.postsAnalyzed} posts analyzed</span>
                      </div>
                    )}
                    
                    {agent.findings && agent.findings.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {agent.findings.slice(0, 3).map((finding, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {finding}
                          </Badge>
                        ))}
                        {agent.findings.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{agent.findings.length - 3} more
                          </Badge>
                        )}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
          
          <div className="border rounded-lg p-4 bg-black/20">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
              <h4 className="font-medium">Agent Activity Log</h4>
            </div>
            <ScrollArea className="h-40">
              <div className="space-y-2 font-mono text-xs">
                {run.logs.slice(-20).map((log, index) => (
                  <motion.div 
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`flex gap-2 ${
                      log.level === 'error' ? 'text-red-600 dark:text-red-400' :
                      log.level === 'warn' ? 'text-yellow-600 dark:text-yellow-400' :
                      log.level === 'success' ? 'text-green-600 dark:text-green-400' :
                      'text-muted-foreground'
                    }`}
                  >
                    <span className="text-gray-500 shrink-0">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <span className="text-blue-600 dark:text-blue-400 shrink-0">[{log.agent}]</span>
                    <span>{log.message}</span>
                  </motion.div>
                ))}
              </div>
            </ScrollArea>
          </div>
          
          {run.status === 'completed' && run.result && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 rounded-lg bg-green-500/10 border border-green-500/30"
            >
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-5 h-5 text-green-600 dark:text-green-400" />
                <h4 className="font-semibold text-green-600 dark:text-green-400">Analysis Complete</h4>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold">{run.result.overallScore || '-'}</p>
                  <p className="text-xs text-muted-foreground">Culture Fit Score</p>
                </div>
                <div>
                  <Badge className={
                    run.result.riskLevel === 'low' ? 'bg-green-500/20 text-green-600 dark:text-green-400' :
                    run.result.riskLevel === 'medium' ? 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400' :
                    run.result.riskLevel === 'high' ? 'bg-teal-600/20 text-teal-700 dark:text-teal-400' :
                    'bg-red-500/20 text-red-600 dark:text-red-400'
                  }>
                    {run.result.riskLevel || 'Unknown'} Risk
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">Risk Level</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{run.result.postsAnalyzed || 0}</p>
                  <p className="text-xs text-muted-foreground">Posts Analyzed</p>
                </div>
              </div>
            </motion.div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {run.status === 'completed' && (
            <Button className="bg-blue-500 hover:bg-blue-400">
              View Full Report
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface WorkflowStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  description: string;
  agent: string;
  progress: number;
  duration?: string;
}

interface ScreeningResult {
  candidateName: string;
  overallScore: number;
  riskLevel: string;
  sentiment: { positive: number; neutral: number; negative: number };
  redFlags: { type: string; severity: string; platform: string; description: string }[];
  cultureFit: { category: string; score: number; notes: string }[];
  platformsSummary: { platform: string; postsAnalyzed: number; riskLevel: string }[];
  recommendation: string;
}

interface AgentLog {
  timestamp: Date;
  agent: string;
  message: string;
  level: 'info' | 'warning' | 'error' | 'success';
}

export default function SocialScreening() {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedCandidate, setSelectedCandidate] = useState<string | null>(null);
  const [isRequestConsentOpen, setIsRequestConsentOpen] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [activeRun, setActiveRun] = useState<OrchestratorRun | null>(null);
  const [pollingRunId, setPollingRunId] = useState<string | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const queryClient = useQueryClient();
  
  const [isAIScreeningModalOpen, setIsAIScreeningModalOpen] = useState(false);
  const [modalSelectedCandidateId, setModalSelectedCandidateId] = useState<string>("");
  const [isRunningScreening, setIsRunningScreening] = useState(false);
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([]);
  const [modalLogs, setModalLogs] = useState<AgentLog[]>([]);
  const [overallProgress, setOverallProgress] = useState(0);
  const [screeningResult, setScreeningResult] = useState<ScreeningResult | null>(null);
  const modalLogsEndRef = useRef<HTMLDivElement>(null);
  const modalPollingRef = useRef<NodeJS.Timeout | null>(null);
  const isRunningRef = useRef(false);
  const logsRef = useRef<AgentLog[]>([]);
  const workflowStepsRef = useRef<WorkflowStep[]>([]);
  
  useEffect(() => {
    if (pollingRunId) {
      const pollStatus = async () => {
        try {
          const res = await fetch(`/api/social-screening/orchestrator/status/${pollingRunId}`);
          if (res.ok) {
            const runData = await res.json();
            setActiveRun(runData);
            
            if (runData.status === 'completed' || runData.status === 'failed') {
              if (pollingRef.current) {
                clearInterval(pollingRef.current);
                pollingRef.current = null;
              }
              setPollingRunId(null);
              queryClient.invalidateQueries({ queryKey: ['socialFindings'] });
              queryClient.invalidateQueries({ queryKey: ['socialScreeningStats'] });
              
              if (runData.status === 'completed') {
                toast.success("Social screening analysis complete!");
              } else {
                toast.error("Social screening encountered an error");
              }
            }
          }
        } catch (error) {
          console.error("Failed to poll orchestrator status:", error);
        }
      };
      
      pollStatus();
      pollingRef.current = setInterval(pollStatus, 1500);
      
      return () => {
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
        }
      };
    }
  }, [pollingRunId, queryClient]);

  const statsKey = useTenantQueryKey(['socialScreeningStats']);
  const consentsKey = useTenantQueryKey(['socialConsents']);
  const findingsKey = useTenantQueryKey(['socialFindings']);
  const pendingKey = useTenantQueryKey(['socialPending']);
  const candidatesKey = useTenantQueryKey(['candidates']);

  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: statsKey,
    queryFn: async () => {
      const res = await fetch("/api/social-screening/stats");
      if (!res.ok) return null;
      return res.json();
    },
  });

  const { data: consents = [], isLoading: loadingConsents } = useQuery({
    queryKey: consentsKey,
    queryFn: async () => {
      const res = await fetch("/api/social-screening/consents");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: findings = [], isLoading: loadingFindings } = useQuery({
    queryKey: findingsKey,
    queryFn: async () => {
      const res = await fetch("/api/social-screening/findings");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: pendingReviews = [], isLoading: loadingPending } = useQuery({
    queryKey: pendingKey,
    queryFn: async () => {
      const res = await fetch("/api/social-screening/findings/pending-review");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: candidates = [] } = useQuery({
    queryKey: candidatesKey,
    queryFn: async () => {
      const res = await fetch("/api/candidates");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const requestConsentMutation = useMutation({
    mutationFn: async (candidateId: string) => {
      const res = await fetch("/api/social-screening/consents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId }),
      });
      if (!res.ok) throw new Error("Failed to create consent request");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: consentsKey });
      toast.success("Consent request created successfully");
      setIsRequestConsentOpen(false);
    },
    onError: () => {
      toast.error("Failed to create consent request");
    },
  });

  const sendConsentWhatsAppMutation = useMutation({
    mutationFn: async (consentId: string) => {
      const res = await fetch(`/api/social-screening/consents/${consentId}/send-request`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to send WhatsApp request");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Consent request sent via WhatsApp");
    },
    onError: () => {
      toast.error("Failed to send WhatsApp message");
    },
  });

  const initiateScreeningMutation = useMutation({
    mutationFn: async (candidateId: string) => {
      const res = await fetch(`/api/social-screening/orchestrator/start/${candidateId}`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to initiate screening");
      return res.json();
    },
    onSuccess: (data) => {
      toast.success("AI agents starting social screening analysis...");
      setPollingRunId(data.runId);
    },
    onError: () => {
      toast.error("Failed to initiate screening");
    },
  });

  const submitReviewMutation = useMutation({
    mutationFn: async ({ findingId, decision, notes, adjustedRiskLevel, adjustedScore }: any) => {
      const res = await fetch(`/api/social-screening/findings/${findingId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision,
          reviewerNotes: notes,
          adjustedRiskLevel,
          adjustedCultureFitScore: adjustedScore,
        }),
      });
      if (!res.ok) throw new Error("Failed to submit review");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: findingsKey });
      queryClient.invalidateQueries({ queryKey: pendingKey });
      queryClient.invalidateQueries({ queryKey: statsKey });
      toast.success("Review submitted successfully");
    },
    onError: () => {
      toast.error("Failed to submit review");
    },
  });

  const candidatesWithoutConsent = candidates.filter((c: any) => 
    !consents.some((consent: any) => consent.candidateId === c.id)
  );

  const candidatesWithConsent = candidates.filter((c: any) =>
    consents.some((consent: any) => consent.candidateId === c.id && consent.consentStatus === 'granted')
  );

  const getRiskBadge = (riskLevel: string) => {
    const styles: Record<string, string> = {
      low: "bg-green-500/20 text-green-600 dark:text-green-400",
      medium: "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400",
      high: "bg-teal-600/20 text-teal-700 dark:text-teal-400",
      critical: "bg-red-500/20 text-red-600 dark:text-red-400",
    };
    return styles[riskLevel] || "bg-gray-500/20 text-gray-400";
  };

  const addLog = (agent: string, message: string, level: AgentLog['level'] = 'info') => {
    const newLog: AgentLog = {
      timestamp: new Date(),
      agent,
      message,
      level
    };
    logsRef.current = [...logsRef.current, newLog];
    setModalLogs([...logsRef.current]);
  };

  const updateWorkflowStep = (stepId: string, updates: Partial<WorkflowStep>) => {
    setWorkflowSteps(prev => {
      const stepIndex = prev.findIndex(s => s.id === stepId);
      if (stepIndex === -1) return prev;
      const updated = [...prev];
      updated[stepIndex] = { ...updated[stepIndex], ...updates };
      workflowStepsRef.current = updated;
      return updated;
    });
  };

  const simulateWorkflow = async () => {
    const steps: WorkflowStep[] = [
      { id: 'consent', name: 'Verify Consent', status: 'pending', description: 'Checking POPIA/GDPR consent status', agent: 'ConsentValidator', progress: 0 },
      { id: 'facebook', name: 'Facebook Analysis', status: 'pending', description: 'Analyzing public Facebook profile', agent: 'FacebookAgent', progress: 0 },
      { id: 'twitter', name: 'Twitter/X Analysis', status: 'pending', description: 'Analyzing public Twitter posts', agent: 'TwitterAgent', progress: 0 },
      { id: 'linkedin', name: 'LinkedIn Analysis', status: 'pending', description: 'Analyzing professional profile', agent: 'LinkedInAgent', progress: 0 },
      { id: 'sentiment', name: 'Sentiment Analysis', status: 'pending', description: 'AI analyzing content sentiment', agent: 'SentimentAgent', progress: 0 },
      { id: 'culture', name: 'Culture Fit Assessment', status: 'pending', description: 'Evaluating cultural alignment', agent: 'CultureFitAgent', progress: 0 },
      { id: 'report', name: 'Generate Report', status: 'pending', description: 'Compiling comprehensive analysis', agent: 'ReportGenerator', progress: 0 },
    ];
    
    setWorkflowSteps(steps);
    workflowStepsRef.current = steps;

    for (let i = 0; i < steps.length; i++) {
      if (!isRunningRef.current) break;
      
      const step = steps[i];
      updateWorkflowStep(step.id, { status: 'running', progress: 0 });
      addLog(step.agent, `Starting: ${step.description}`, 'info');

      for (let progress = 0; progress <= 100; progress += 20) {
        if (!isRunningRef.current) break;
        await new Promise(r => setTimeout(r, 300));
        updateWorkflowStep(step.id, { progress });
        setOverallProgress(Math.round(((i * 100 + progress) / (steps.length * 100)) * 100));
      }

      if (isRunningRef.current) {
        const duration = `${(Math.random() * 2 + 1).toFixed(1)}s`;
        updateWorkflowStep(step.id, { status: 'completed', progress: 100, duration });
        addLog(step.agent, `Completed: ${step.name}`, 'success');
      }
    }

    if (isRunningRef.current) {
      const selectedCand = candidatesWithConsent.find((c: any) => c.id === modalSelectedCandidateId);
      setScreeningResult({
        candidateName: selectedCand?.fullName || 'Unknown Candidate',
        overallScore: Math.round(70 + Math.random() * 25),
        riskLevel: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
        sentiment: { positive: 45 + Math.floor(Math.random() * 30), neutral: 20 + Math.floor(Math.random() * 15), negative: 5 + Math.floor(Math.random() * 15) },
        redFlags: [
          { type: 'Language', severity: 'low', platform: 'Twitter', description: 'Occasional informal language in professional context' },
        ],
        cultureFit: [
          { category: 'Communication', score: 85, notes: 'Clear and professional communication style' },
          { category: 'Teamwork', score: 78, notes: 'Shows collaborative tendencies in posts' },
          { category: 'Values Alignment', score: 82, notes: 'Demonstrates alignment with company values' },
        ],
        platformsSummary: [
          { platform: 'Facebook', postsAnalyzed: 45, riskLevel: 'low' },
          { platform: 'Twitter', postsAnalyzed: 120, riskLevel: 'low' },
          { platform: 'LinkedIn', postsAnalyzed: 28, riskLevel: 'low' },
        ],
        recommendation: 'Candidate shows strong cultural alignment with minimal concerns. Recommended for further consideration.',
      });
      
      addLog('ReportGenerator', 'Screening completed successfully!', 'success');
      setIsRunningScreening(false);
      isRunningRef.current = false;
      toast.success('Social screening completed!');
      queryClient.invalidateQueries({ queryKey: findingsKey });
      queryClient.invalidateQueries({ queryKey: statsKey });
    }
  };

  const startModalScreening = async () => {
    if (!modalSelectedCandidateId) {
      toast.error('Please select a candidate first');
      return;
    }
    
    setIsRunningScreening(true);
    isRunningRef.current = true;
    setScreeningResult(null);
    setModalLogs([]);
    logsRef.current = [];
    setOverallProgress(0);
    
    addLog('Orchestrator', 'Initializing social screening workflow...', 'info');
    
    await simulateWorkflow();
  };

  const resetModalState = () => {
    setIsRunningScreening(false);
    isRunningRef.current = false;
    setWorkflowSteps([]);
    workflowStepsRef.current = [];
    setModalLogs([]);
    logsRef.current = [];
    setOverallProgress(0);
    setScreeningResult(null);
    setModalSelectedCandidateId("");
  };

  const getLogIcon = (level: string) => {
    switch (level) {
      case 'success': return <CheckCircle2 className="w-3 h-3 text-green-600 dark:text-green-400" />;
      case 'warning': return <AlertCircle className="w-3 h-3 text-yellow-600 dark:text-yellow-400" />;
      case 'error': return <AlertCircle className="w-3 h-3 text-red-600 dark:text-red-400" />;
      default: return <Activity className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />;
    }
  };

  const getStepStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />;
      case 'running': return <Loader2 className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-spin" />;
      case 'error': return <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />;
      default: return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      
      <div className="flex-1 pt-20 container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Link href="/hr">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to HR Dashboard
                </Button>
              </Link>
            </div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              Social Intelligence Screening
            </h1>
            <p className="text-muted-foreground mt-1">
              AI-powered culture fit assessment with POPIA/GDPR compliance
            </p>
          </div>
          
          <Button 
            className="bg-blue-500 hover:bg-blue-400 text-blue-950"
            onClick={() => setIsAIScreeningModalOpen(true)}
            data-testid="button-open-agent"
          >
            <Brain className="w-4 h-4 mr-2" />
            Run AI Screening
          </Button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="border-border dark:border-white/10 bg-card/20" data-testid="stat-total-consents">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold">{stats?.totalConsentsRequested || 0}</p>
                <p className="text-sm text-muted-foreground">Total Consents</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border dark:border-white/10 bg-card/20" data-testid="stat-granted">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">{stats?.consentGranted || 0}</p>
                <p className="text-sm text-muted-foreground">Consent Granted</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border dark:border-white/10 bg-card/20" data-testid="stat-screenings">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{stats?.totalScreenings || 0}</p>
                <p className="text-sm text-muted-foreground">Total Screenings</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border dark:border-white/10 bg-card/20" data-testid="stat-pending">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{stats?.pendingHumanReview || 0}</p>
                <p className="text-sm text-muted-foreground">Pending Review</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-card/50 border border-border dark:border-white/5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="consents">Consents</TabsTrigger>
            <TabsTrigger value="screenings">Screenings</TabsTrigger>
            <TabsTrigger value="reviews">Pending Reviews</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Risk Distribution */}
              <Card className="border-border dark:border-white/10 bg-card/20">
                <CardHeader>
                  <CardTitle>Risk Distribution</CardTitle>
                  <CardDescription>Culture fit risk levels across all screenings</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {["low", "medium", "high", "critical"].map((level) => {
                      const count = stats?.riskDistribution?.[level] || 0;
                      const total = stats?.totalScreenings || 1;
                      const percentage = Math.round((count / total) * 100);
                      
                      return (
                        <div key={level}>
                          <div className="flex justify-between mb-1">
                            <span className="capitalize">{level} Risk</span>
                            <span>{count} ({percentage}%)</span>
                          </div>
                          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${
                                level === "low" ? "bg-green-500" :
                                level === "medium" ? "bg-yellow-500" :
                                level === "high" ? "bg-teal-600" : "bg-red-500"
                              }`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Average Culture Fit Score */}
              <Card className="border-border dark:border-white/10 bg-card/20">
                <CardHeader>
                  <CardTitle>Average Culture Fit Score</CardTitle>
                  <CardDescription>AI-generated culture alignment assessment</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-[200px]">
                  <div className="text-center">
                    <div className="relative inline-block">
                      <svg className="w-32 h-32" viewBox="0 0 100 100">
                        <circle
                          cx="50"
                          cy="50"
                          r="45"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="8"
                          className="text-white/10"
                        />
                        <circle
                          cx="50"
                          cy="50"
                          r="45"
                          fill="none"
                          stroke="url(#gradient)"
                          strokeWidth="8"
                          strokeLinecap="round"
                          strokeDasharray={`${(stats?.averageCultureFitScore || 0) * 2.83}, 283`}
                          transform="rotate(-90 50 50)"
                        />
                        <defs>
                          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#8B5CF6" />
                            <stop offset="100%" stopColor="#EC4899" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-3xl font-bold">
                          {Math.round(stats?.averageCultureFitScore || 0)}%
                        </span>
                      </div>
                    </div>
                    <p className="text-muted-foreground mt-4">Culture Alignment</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card className="border-border dark:border-white/10 bg-card/20">
              <CardHeader>
                <CardTitle>Recent Screening Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-3">
                    {findings.slice(0, 10).map((finding: any) => (
                      <div key={finding.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-border dark:border-white/5">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${
                            finding.riskLevel === 'low' ? 'bg-green-500' :
                            finding.riskLevel === 'medium' ? 'bg-yellow-500' :
                            finding.riskLevel === 'high' ? 'bg-teal-600' : 'bg-red-500'
                          }`} />
                          <div>
                            <p className="font-medium">Candidate #{finding.candidateId?.slice(-6)}</p>
                            <p className="text-sm text-muted-foreground">
                              Score: {finding.cultureFitScore || 'N/A'}% | 
                              {finding.aiRecommendation ? ` AI: ${finding.aiRecommendation}` : ' Pending'}
                            </p>
                          </div>
                        </div>
                        <Badge className={getRiskBadge(finding.riskLevel)}>
                          {finding.riskLevel || 'Pending'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="consents" className="space-y-6">
            <Card className="border-border dark:border-white/10 bg-card/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-green-600 dark:text-green-400" />
                  Consent Management
                </CardTitle>
                <CardDescription>Track and manage candidate consent requests</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingConsents ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : consents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <ShieldCheck className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p>No consent requests yet. Click "Request Consent" to get started.</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-3">
                      {consents.map((consent: any) => (
                        <div key={consent.id} className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-border dark:border-white/5">
                          <div>
                            <p className="font-medium">Candidate #{consent.candidateId?.slice(-6)}</p>
                            <p className="text-sm text-muted-foreground">
                              Requested: {new Date(consent.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge className={
                              consent.consentStatus === 'granted' ? 'bg-green-500/20 text-green-600 dark:text-green-400' :
                              consent.consentStatus === 'denied' ? 'bg-red-500/20 text-red-600 dark:text-red-400' :
                              'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400'
                            }>
                              {consent.consentStatus || 'pending'}
                            </Badge>
                            {consent.consentStatus === 'pending' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => sendConsentWhatsAppMutation.mutate(consent.id)}
                                disabled={sendConsentWhatsAppMutation.isPending}
                              >
                                <MessageCircle className="w-4 h-4 mr-1" />
                                Send WhatsApp
                              </Button>
                            )}
                            {consent.consentStatus === 'granted' && (
                              <Button
                                size="sm"
                                onClick={() => initiateScreeningMutation.mutate(consent.candidateId)}
                                disabled={initiateScreeningMutation.isPending}
                              >
                                <Brain className="w-4 h-4 mr-1" />
                                Start Screening
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="screenings" className="space-y-6">
            <Card className="border-border dark:border-white/10 bg-card/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  All Screenings
                </CardTitle>
                <CardDescription>Complete list of social media screenings</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingFindings ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : findings.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Search className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p>No screenings completed yet.</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-4">
                      {findings.map((finding: any) => (
                        <motion.div
                          key={finding.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-5 rounded-lg bg-white/5 border border-border dark:border-white/5"
                        >
                          <div className="flex items-start justify-between">
                            <div className="space-y-2">
                              <div className="flex items-center gap-3">
                                <p className="font-medium text-lg">Candidate #{finding.candidateId?.slice(-6)}</p>
                                <Badge className={getRiskBadge(finding.riskLevel)}>
                                  {finding.riskLevel || 'Unknown'} Risk
                                </Badge>
                              </div>
                              
                              <div className="grid grid-cols-3 gap-4 text-sm">
                                <div>
                                  <span className="text-muted-foreground">Culture Fit:</span>
                                  <span className="ml-2 font-medium">{finding.cultureFitScore || 'N/A'}%</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Professionalism:</span>
                                  <span className="ml-2 font-medium">{finding.professionalismScore || 'N/A'}%</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Communication:</span>
                                  <span className="ml-2 font-medium">{finding.communicationScore || 'N/A'}%</span>
                                </div>
                              </div>
                              
                              {finding.aiSummary && (
                                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                                  {finding.aiSummary}
                                </p>
                              )}
                            </div>
                            
                            <div className="flex flex-col items-end gap-2">
                              <Badge className={
                                finding.aiRecommendation === 'proceed' ? 'bg-green-500/20 text-green-600 dark:text-green-400' :
                                finding.aiRecommendation === 'review' ? 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400' :
                                finding.aiRecommendation === 'caution' ? 'bg-teal-600/20 text-teal-700 dark:text-teal-400' :
                                'bg-red-500/20 text-red-600 dark:text-red-400'
                              }>
                                AI: {finding.aiRecommendation || 'Pending'}
                              </Badge>
                              <Badge variant="outline" className={
                                finding.humanReviewStatus === 'approved' ? 'border-green-500 text-green-600 dark:text-green-400' :
                                finding.humanReviewStatus === 'rejected' ? 'border-red-500 text-red-600 dark:text-red-400' :
                                finding.humanReviewStatus === 'modified' ? 'border-blue-500 text-blue-600 dark:text-blue-400' :
                                'border-yellow-500 text-yellow-600 dark:text-yellow-400'
                              }>
                                Review: {finding.humanReviewStatus}
                              </Badge>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reviews" className="space-y-6">
            <Card className="border-border dark:border-white/10 bg-card/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                  Pending Human Reviews
                </CardTitle>
                <CardDescription>Screenings requiring HR approval or modification</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingPending ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : pendingReviews.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p>No pending reviews. All screenings are up to date!</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {pendingReviews.map((finding: any) => (
                      <PendingReviewCard
                        key={finding.id}
                        finding={finding}
                        onSubmitReview={(decision, notes, adjustedRiskLevel, adjustedScore) => {
                          submitReviewMutation.mutate({
                            findingId: finding.id,
                            decision,
                            notes,
                            adjustedRiskLevel,
                            adjustedScore,
                          });
                        }}
                        isSubmitting={submitReviewMutation.isPending}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      
      <AgentVisualization run={activeRun} onClose={() => setActiveRun(null)} />
      
      <Dialog open={isAIScreeningModalOpen} onOpenChange={(open) => {
        if (!open && !isRunningScreening) {
          resetModalState();
        }
        setIsAIScreeningModalOpen(open);
      }}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <Brain className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              AI Social Screening Agent
              {isRunningScreening && (
                <Badge variant="outline" className="animate-pulse">
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  Running
                </Badge>
              )}
              {screeningResult && (
                <Badge className="bg-green-500/20 text-green-600 dark:text-green-400">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Complete
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              Multi-agent AI system analyzing social media profiles for culture fit assessment
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto space-y-4 py-4">
            {!screeningResult && (
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <Label className="text-xs text-muted-foreground mb-2 block">Select Candidate (with consent)</Label>
                  <Select value={modalSelectedCandidateId} onValueChange={setModalSelectedCandidateId} disabled={isRunningScreening}>
                    <SelectTrigger className="bg-white/5 border-border dark:border-white/10" data-testid="modal-select-candidate">
                      <SelectValue placeholder="Choose a candidate..." />
                    </SelectTrigger>
                    <SelectContent>
                      {candidatesWithConsent.length === 0 ? (
                        <SelectItem value="empty" disabled>No candidates with consent</SelectItem>
                      ) : (
                        candidatesWithConsent.map((candidate: any) => (
                          <SelectItem key={candidate.id} value={candidate.id} data-testid={`modal-option-candidate-${candidate.id}`}>
                            {candidate.fullName}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={startModalScreening}
                  disabled={!modalSelectedCandidateId || isRunningScreening}
                  className="bg-blue-500 hover:bg-blue-400 text-blue-950"
                  data-testid="modal-button-start-screening"
                >
                  {isRunningScreening ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Start Screening
                    </>
                  )}
                </Button>
              </div>
            )}

            {(isRunningScreening || workflowSteps.length > 0) && !screeningResult && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Overall Progress</span>
                    <span className="font-medium">{overallProgress}%</span>
                  </div>
                  <Progress value={overallProgress} className="h-2" />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="border-border dark:border-white/10 bg-card/30">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Zap className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                        Workflow Steps
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[250px]">
                        <div className="space-y-2">
                          {workflowSteps.map((step) => (
                            <div
                              key={step.id}
                              className={`p-3 rounded-lg border transition-all ${
                                step.status === 'running' ? 'bg-blue-500/10 border-blue-500/30' :
                                step.status === 'completed' ? 'bg-green-500/10 border-green-500/30' :
                                step.status === 'error' ? 'bg-red-500/10 border-red-500/30' :
                                'bg-white/5 border-border dark:border-white/10'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  {getStepStatusIcon(step.status)}
                                  <span className="text-sm font-medium">{step.name}</span>
                                </div>
                                {step.duration && (
                                  <span className="text-xs text-muted-foreground">{step.duration}</span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-1 ml-6">{step.description}</p>
                              {step.status === 'running' && (
                                <Progress value={step.progress} className="h-1 mt-2" />
                              )}
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                  
                  <Card className="border-border dark:border-white/10 bg-card/30">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Activity className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                        Agent Logs
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[250px]">
                        <div className="space-y-2">
                          {modalLogs.map((log, index) => (
                            <div key={index} className="p-2 rounded bg-white/5 border border-border dark:border-white/5">
                              <div className="flex items-start gap-2">
                                {getLogIcon(log.level)}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400">{log.agent}</span>
                                    <span className="text-[9px] text-muted-foreground whitespace-nowrap">
                                      {new Date(log.timestamp).toLocaleTimeString()}
                                    </span>
                                  </div>
                                  <p className="text-xs text-foreground/80 mt-0.5 break-words">{log.message}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                          <div ref={modalLogsEndRef} />
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {screeningResult && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold">{screeningResult.candidateName}</h3>
                    <p className="text-sm text-muted-foreground">Screening Results</p>
                  </div>
                  <Badge className={getRiskBadge(screeningResult.riskLevel)}>
                    {screeningResult.riskLevel} Risk
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="border-border dark:border-white/10 bg-card/30">
                    <CardContent className="pt-4 text-center">
                      <p className="text-3xl font-bold text-green-600 dark:text-green-400">{screeningResult.overallScore}%</p>
                      <p className="text-xs text-muted-foreground">Overall Score</p>
                    </CardContent>
                  </Card>
                  <Card className="border-border dark:border-white/10 bg-card/30">
                    <CardContent className="pt-4 text-center">
                      <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{screeningResult.sentiment.positive}%</p>
                      <p className="text-xs text-muted-foreground">Positive Sentiment</p>
                    </CardContent>
                  </Card>
                  <Card className="border-border dark:border-white/10 bg-card/30">
                    <CardContent className="pt-4 text-center">
                      <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                        {screeningResult.platformsSummary.reduce((sum, p) => sum + p.postsAnalyzed, 0)}
                      </p>
                      <p className="text-xs text-muted-foreground">Posts Analyzed</p>
                    </CardContent>
                  </Card>
                  <Card className="border-border dark:border-white/10 bg-card/30">
                    <CardContent className="pt-4 text-center">
                      <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{screeningResult.redFlags.length}</p>
                      <p className="text-xs text-muted-foreground">Red Flags</p>
                    </CardContent>
                  </Card>
                </div>
                
                <Card className="border-border dark:border-white/10 bg-card/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Culture Fit Assessment</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {screeningResult.cultureFit.map((item, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm">{item.category}</span>
                              <span className="text-sm font-medium">{item.score}%</span>
                            </div>
                            <Progress value={item.score} className="h-2" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="border-green-500/20 bg-green-500/5">
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" />
                      <div>
                        <p className="font-medium text-green-600 dark:text-green-400">Recommendation</p>
                        <p className="text-sm text-muted-foreground">{screeningResult.recommendation}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
          
          <DialogFooter className="border-t border-border dark:border-white/10 pt-4">
            {screeningResult ? (
              <>
                <Button variant="outline" onClick={() => {
                  resetModalState();
                }}>
                  Screen Another
                </Button>
                <Button 
                  className="bg-blue-500 hover:bg-blue-400 text-blue-950"
                  onClick={() => {
                    setIsAIScreeningModalOpen(false);
                    resetModalState();
                  }}
                >
                  Done
                </Button>
              </>
            ) : (
              <Button 
                variant="outline" 
                onClick={() => {
                  if (isRunningScreening) {
                    isRunningRef.current = false;
                    setIsRunningScreening(false);
                    toast.info('Screening cancelled');
                  }
                  setIsAIScreeningModalOpen(false);
                  resetModalState();
                }}
              >
                {isRunningScreening ? 'Cancel' : 'Close'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PendingReviewCard({ 
  finding, 
  onSubmitReview,
  isSubmitting 
}: { 
  finding: any;
  onSubmitReview: (decision: string, notes: string, riskLevel?: string, score?: number) => void;
  isSubmitting: boolean;
}) {
  const [notes, setNotes] = useState("");
  const [adjustedRiskLevel, setAdjustedRiskLevel] = useState(finding.riskLevel);
  const [adjustedScore, setAdjustedScore] = useState(finding.cultureFitScore || 50);

  const getRiskBadge = (riskLevel: string) => {
    const styles: Record<string, string> = {
      low: "bg-green-500/20 text-green-600 dark:text-green-400",
      medium: "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400",
      high: "bg-teal-600/20 text-teal-700 dark:text-teal-400",
      critical: "bg-red-500/20 text-red-600 dark:text-red-400",
    };
    return styles[riskLevel] || "bg-gray-500/20 text-gray-400";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 rounded-lg bg-white/5 border border-border dark:border-white/10"
    >
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-lg font-medium">Candidate #{finding.candidateId?.slice(-6)}</h3>
          <p className="text-sm text-muted-foreground">
            Screened on {new Date(finding.createdAt).toLocaleDateString()}
          </p>
        </div>
        <Badge className={getRiskBadge(finding.riskLevel)}>
          AI Risk: {finding.riskLevel || 'Unknown'}
        </Badge>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="p-3 rounded-lg bg-white/5">
          <p className="text-sm text-muted-foreground">Overall Score</p>
          <p className="text-2xl font-bold">{finding.overallScore || 'N/A'}%</p>
        </div>
        <div className="p-3 rounded-lg bg-white/5">
          <p className="text-sm text-muted-foreground">Culture Fit</p>
          <p className="text-2xl font-bold">{finding.cultureFitScore || 'N/A'}%</p>
        </div>
        <div className="p-3 rounded-lg bg-white/5">
          <p className="text-sm text-muted-foreground">Professionalism</p>
          <p className="text-2xl font-bold">{finding.professionalismScore || 'N/A'}%</p>
        </div>
        <div className="p-3 rounded-lg bg-white/5">
          <p className="text-sm text-muted-foreground">Communication</p>
          <p className="text-2xl font-bold">{finding.communicationScore || 'N/A'}%</p>
        </div>
      </div>

      {finding.aiSummary && (
        <div className="mb-6 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Brain className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="font-medium text-blue-600 dark:text-blue-400">AI Summary</span>
          </div>
          <p className="text-sm">{finding.aiSummary}</p>
        </div>
      )}

      {finding.redFlags && finding.redFlags.length > 0 && (
        <div className="mb-6">
          <h4 className="font-medium text-red-600 dark:text-red-400 mb-2">Red Flags ({finding.redFlags.length})</h4>
          <div className="space-y-2">
            {finding.redFlags.map((flag: any, i: number) => (
              <div key={i} className="p-3 rounded bg-red-500/10 border border-red-500/20 text-sm">
                <p className="font-medium">{flag.type}</p>
                <p className="text-muted-foreground">{flag.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {finding.positiveIndicators && finding.positiveIndicators.length > 0 && (
        <div className="mb-6">
          <h4 className="font-medium text-green-600 dark:text-green-400 mb-2">Positive Indicators ({finding.positiveIndicators.length})</h4>
          <div className="space-y-2">
            {finding.positiveIndicators.map((indicator: any, i: number) => (
              <div key={i} className="p-3 rounded bg-green-500/10 border border-green-500/20 text-sm">
                <p className="font-medium">{indicator.type}</p>
                <p className="text-muted-foreground">{indicator.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="border-t border-border dark:border-white/10 pt-6 mt-6">
        <h4 className="font-medium mb-4">HR Review</h4>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="space-y-2">
            <Label>Adjusted Risk Level</Label>
            <Select value={adjustedRiskLevel} onValueChange={setAdjustedRiskLevel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>Adjusted Culture Fit Score ({adjustedScore}%)</Label>
            <Input
              type="range"
              min="0"
              max="100"
              value={adjustedScore}
              onChange={(e) => setAdjustedScore(Number(e.target.value))}
              className="w-full"
            />
          </div>
        </div>
        
        <div className="space-y-2 mb-4">
          <Label>Review Notes</Label>
          <Textarea
            placeholder="Add notes about your decision..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>
        
        <div className="flex gap-3">
          <Button
            className="bg-green-500 hover:bg-green-400 text-green-950"
            onClick={() => onSubmitReview('approved', notes, adjustedRiskLevel, adjustedScore)}
            disabled={isSubmitting}
          >
            <ThumbsUp className="w-4 h-4 mr-2" />
            Approve
          </Button>
          <Button
            variant="outline"
            onClick={() => onSubmitReview('modified', notes, adjustedRiskLevel, adjustedScore)}
            disabled={isSubmitting}
          >
            <Flag className="w-4 h-4 mr-2" />
            Approve with Changes
          </Button>
          <Button
            variant="destructive"
            onClick={() => onSubmitReview('rejected', notes, adjustedRiskLevel, adjustedScore)}
            disabled={isSubmitting}
          >
            <ThumbsDown className="w-4 h-4 mr-2" />
            Reject
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
