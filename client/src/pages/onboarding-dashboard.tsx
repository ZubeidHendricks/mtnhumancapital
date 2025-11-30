import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Navbar } from "@/components/layout/navbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Users,
  FileText,
  AlertCircle,
  CheckCircle2,
  Clock,
  MessageSquare,
  Mail,
  Send,
  RefreshCw,
  User,
  Calendar,
  AlertTriangle,
  XCircle,
  Bot,
  ChevronRight,
  Sparkles,
  Shield,
  FileCheck,
  Bell,
  TrendingUp,
  Activity,
  Zap,
  BrainCircuit,
  Loader2,
} from "lucide-react";

interface OnboardingWorkflow {
  id: string;
  candidateId: string;
  status: string;
  currentStep: string | null;
  tasks: { completedSteps?: string[] } | null;
  startDate: string;
  completedAt: string | null;
}

interface AgentLog {
  id: string;
  workflowId: string;
  candidateId: string | null;
  agentType: string;
  action: string;
  stepName: string | null;
  status: string;
  details: Record<string, any> | null;
  communicationChannel: string | null;
  messageContent: string | null;
  requiresHumanReview: number;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  createdAt: string;
}

interface DocumentRequest {
  id: string;
  workflowId: string;
  candidateId: string;
  documentType: string;
  documentName: string;
  description: string | null;
  isRequired: number;
  status: string;
  priority: string | null;
  dueDate: string | null;
  reminderCount: number;
  maxReminders: number;
  receivedAt: string | null;
  verifiedAt: string | null;
}

interface Candidate {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  status: string;
  stage: string;
}

const statusConfig: Record<string, { bg: string; text: string; icon: any; border: string }> = {
  pending: { bg: "bg-slate-500/20", text: "text-slate-300", icon: Clock, border: "border-slate-500/30" },
  requested: { bg: "bg-blue-500/20", text: "text-blue-300", icon: Send, border: "border-blue-500/30" },
  received: { bg: "bg-amber-500/20", text: "text-amber-300", icon: FileCheck, border: "border-amber-500/30" },
  verified: { bg: "bg-emerald-500/20", text: "text-emerald-300", icon: CheckCircle2, border: "border-emerald-500/30" },
  rejected: { bg: "bg-red-500/20", text: "text-red-300", icon: XCircle, border: "border-red-500/30" },
  overdue: { bg: "bg-red-500/20", text: "text-red-300", icon: AlertTriangle, border: "border-red-500/30" },
};

const priorityConfig: Record<string, { bg: string; text: string; border: string }> = {
  low: { bg: "bg-slate-500/20", text: "text-slate-300", border: "border-slate-500/30" },
  normal: { bg: "bg-blue-500/20", text: "text-blue-300", border: "border-blue-500/30" },
  high: { bg: "bg-orange-500/20", text: "text-orange-300", border: "border-orange-500/30" },
  urgent: { bg: "bg-red-500/20", text: "text-red-300", border: "border-red-500/30" },
};

const channelConfig: Record<string, { icon: any; color: string }> = {
  whatsapp: { icon: MessageSquare, color: "text-green-400" },
  email: { icon: Mail, color: "text-blue-400" },
  system: { icon: Bot, color: "text-purple-400" },
  manual: { icon: User, color: "text-slate-400" },
};

const agentColors: Record<string, string> = {
  onboarding_coordinator: "from-blue-500/30 to-blue-600/30 border-blue-500/30",
  welcome_agent: "from-green-500/30 to-green-600/30 border-green-500/30",
  contract_agent: "from-purple-500/30 to-purple-600/30 border-purple-500/30",
  document_collector: "from-amber-500/30 to-amber-600/30 border-amber-500/30",
  reminder: "from-orange-500/30 to-orange-600/30 border-orange-500/30",
  escalation: "from-red-500/30 to-red-600/30 border-red-500/30",
};

export default function OnboardingDashboard() {
  const queryClient = useQueryClient();
  const [selectedWorkflow, setSelectedWorkflow] = useState<string | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [interventionDialog, setInterventionDialog] = useState<AgentLog | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");

  const { data: workflows = [], isLoading: loadingWorkflows } = useQuery<OnboardingWorkflow[]>({
    queryKey: ["/api/onboarding/workflows"],
  });

  const { data: candidates = [] } = useQuery<Candidate[]>({
    queryKey: ["/api/candidates"],
  });

  const { data: interventionQueue = [] } = useQuery<AgentLog[]>({
    queryKey: ["/api/onboarding/human-intervention-queue"],
  });

  const { data: agentLogs = [] } = useQuery<AgentLog[]>({
    queryKey: ["/api/onboarding/agent-logs", selectedWorkflow],
    enabled: !!selectedWorkflow,
  });

  const { data: documentRequests = [] } = useQuery<DocumentRequest[]>({
    queryKey: ["/api/onboarding/document-requests", selectedWorkflow],
    enabled: !!selectedWorkflow,
  });

  const processRemindersMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/onboarding/process-reminders", { method: "POST" });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding/workflows"] });
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding/human-intervention-queue"] });
      if (selectedWorkflow) {
        queryClient.invalidateQueries({ queryKey: ["/api/onboarding/document-requests", selectedWorkflow] });
        queryClient.invalidateQueries({ queryKey: ["/api/onboarding/agent-logs", selectedWorkflow] });
      }
    },
  });

  const resolveInterventionMutation = useMutation({
    mutationFn: async ({ logId, notes }: { logId: string; notes: string }) => {
      const response = await fetch(`/api/onboarding/resolve-intervention/${logId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding/human-intervention-queue"] });
      setInterventionDialog(null);
      setResolutionNotes("");
    },
  });

  const markReceivedMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const response = await fetch(`/api/onboarding/document-requests/${requestId}/received`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      return response.json();
    },
    onSuccess: () => {
      if (selectedWorkflow) {
        queryClient.invalidateQueries({ queryKey: ["/api/onboarding/document-requests", selectedWorkflow] });
        queryClient.invalidateQueries({ queryKey: ["/api/onboarding/agent-logs", selectedWorkflow] });
      }
    },
  });

  const markVerifiedMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const response = await fetch(`/api/onboarding/document-requests/${requestId}/verified`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      return response.json();
    },
    onSuccess: () => {
      if (selectedWorkflow) {
        queryClient.invalidateQueries({ queryKey: ["/api/onboarding/document-requests", selectedWorkflow] });
        queryClient.invalidateQueries({ queryKey: ["/api/onboarding/agent-logs", selectedWorkflow] });
      }
    },
  });

  const sendReminderMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const response = await fetch(`/api/onboarding/document-requests/${requestId}/remind`, {
        method: "POST",
      });
      return response.json();
    },
    onSuccess: () => {
      if (selectedWorkflow) {
        queryClient.invalidateQueries({ queryKey: ["/api/onboarding/document-requests", selectedWorkflow] });
        queryClient.invalidateQueries({ queryKey: ["/api/onboarding/agent-logs", selectedWorkflow] });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding/human-intervention-queue"] });
    },
  });

  const getCandidateName = (candidateId: string) => {
    const candidate = candidates.find(c => c.id === candidateId);
    return candidate?.fullName || "Unknown";
  };

  const getDocumentProgress = (requests: DocumentRequest[]) => {
    const required = requests.filter(r => r.isRequired === 1);
    const verified = required.filter(r => r.status === "verified").length;
    return required.length > 0 ? Math.round((verified / required.length) * 100) : 0;
  };

  const handleWorkflowSelect = (workflowId: string) => {
    setSelectedWorkflow(workflowId);
    const workflow = workflows.find(w => w.id === workflowId);
    if (workflow) {
      const candidate = candidates.find(c => c.id === workflow.candidateId);
      setSelectedCandidate(candidate || null);
    }
  };

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  if (loadingWorkflows) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4" data-testid="loading-spinner">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading onboarding data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      
      <main className="pt-24 pb-12 px-6 container mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight" data-testid="page-title">Onboarding Command Center</h1>
            <p className="text-muted-foreground">AI-Powered Employee Onboarding Automation</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 px-3 py-1">
              <BrainCircuit className="w-3 h-3 mr-2" /> AI Agents Active
            </Badge>
            <Button
              onClick={() => processRemindersMutation.mutate()}
              disabled={processRemindersMutation.isPending}
              className="gap-2"
              data-testid="button-process-reminders"
            >
              <Zap className={`w-4 h-4 ${processRemindersMutation.isPending ? "animate-pulse" : ""}`} />
              {processRemindersMutation.isPending ? "Processing..." : "Run Automation"}
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-card/30 border-white/10 backdrop-blur-sm" data-testid="stat-total-workflows">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="w-4 h-4" />
                Active Workflows
              </CardTitle>
              <div className="text-3xl font-bold">{workflows.length}</div>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-green-400" />
                Employees onboarding
              </p>
            </CardContent>
          </Card>

          <Card className={`border-white/10 backdrop-blur-sm ${interventionQueue.length > 0 ? "bg-red-500/10 border-red-500/20" : "bg-emerald-500/10 border-emerald-500/20"}`} data-testid="stat-interventions">
            <CardHeader className="pb-2">
              <CardTitle className={`text-sm font-medium flex items-center gap-2 ${interventionQueue.length > 0 ? "text-red-300" : "text-emerald-300"}`}>
                {interventionQueue.length > 0 ? <AlertCircle className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                {interventionQueue.length > 0 ? "Needs Attention" : "All Clear"}
              </CardTitle>
              <div className="text-3xl font-bold">{interventionQueue.length}</div>
            </CardHeader>
            <CardContent className="pt-0">
              <p className={`text-xs flex items-center gap-1 ${interventionQueue.length > 0 ? "text-red-300/80" : "text-emerald-300/80"}`}>
                <Activity className="w-3 h-3" />
                {interventionQueue.length > 0 ? "Requires HR review" : "No issues detected"}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-amber-500/10 border-amber-500/20 backdrop-blur-sm" data-testid="stat-pending-docs">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-amber-300 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Awaiting Documents
              </CardTitle>
              <div className="text-3xl font-bold">
                {workflows.filter(w => w.status === "awaiting_documents" || w.status === "documentation").length}
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-xs text-amber-300/80 flex items-center gap-1">
                <Bell className="w-3 h-3" />
                Pending submission
              </p>
            </CardContent>
          </Card>

          <Card className="bg-emerald-500/10 border-emerald-500/20 backdrop-blur-sm" data-testid="stat-completed">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Completed
              </CardTitle>
              <div className="text-3xl font-bold">
                {workflows.filter(w => w.status === "completed").length}
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-xs text-emerald-300/80 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Successfully onboarded
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Intervention Queue Alert */}
        {interventionQueue.length > 0 && (
          <Card className="mb-8 bg-red-500/10 border-red-500/20" data-testid="intervention-queue">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500/20 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <CardTitle className="text-red-300">Human Intervention Required</CardTitle>
                  <CardDescription className="text-red-300/70">
                    {interventionQueue.length} case{interventionQueue.length > 1 ? "s" : ""} need your attention
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {interventionQueue.map(log => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-4 bg-card/50 rounded-lg border border-red-500/20"
                    data-testid={`intervention-item-${log.id}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-500/30 to-rose-500/30 border border-red-500/30 flex items-center justify-center text-red-300 font-bold text-lg">
                        {getInitials(getCandidateName(log.candidateId || ""))}
                      </div>
                      <div>
                        <p className="font-semibold text-white">
                          {getCandidateName(log.candidateId || "")}
                        </p>
                        <p className="text-sm text-muted-foreground capitalize">
                          {log.action.replace(/_/g, " ")}
                        </p>
                        <Badge variant="outline" className="mt-1 text-xs bg-red-500/20 text-red-300 border-red-500/30">
                          {(log.details as any)?.reason || "Requires manual review"}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      onClick={() => setInterventionDialog(log)}
                      variant="outline"
                      className="border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-300"
                      data-testid={`button-resolve-${log.id}`}
                    >
                      Resolve Now
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-12 gap-6">
          {/* Workflows List */}
          <div className="col-span-12 lg:col-span-4">
            <Card className="border-white/10 bg-card/20" data-testid="workflows-list">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/20 rounded-lg">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Team Members</CardTitle>
                    <CardDescription>Select to view onboarding details</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[520px]">
                  <div className="p-4 space-y-3">
                    {workflows.map(workflow => {
                      const candidate = candidates.find(c => c.id === workflow.candidateId);
                      const isSelected = selectedWorkflow === workflow.id;
                      
                      return (
                        <div
                          key={workflow.id}
                          onClick={() => handleWorkflowSelect(workflow.id)}
                          className={`p-4 rounded-lg cursor-pointer transition-all border ${
                            isSelected
                              ? "bg-primary/20 border-primary/30"
                              : "bg-card/30 border-white/10 hover:border-white/20 hover:bg-card/50"
                          }`}
                          data-testid={`workflow-item-${workflow.id}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                              isSelected 
                                ? "bg-primary/30 text-primary" 
                                : "bg-white/10 text-white"
                            }`}>
                              {getInitials(candidate?.fullName || "?")}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold truncate text-white">
                                {candidate?.fullName || "Unknown"}
                              </p>
                              <p className="text-sm truncate text-muted-foreground capitalize">
                                {workflow.currentStep?.replace(/_/g, " ") || "Getting started"}
                              </p>
                            </div>
                            <ChevronRight className={`w-5 h-5 flex-shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                          </div>
                          <div className="mt-3">
                            <Badge className={`text-xs ${
                              workflow.status === "completed" 
                                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                                : workflow.status.includes("document")
                                  ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                                  : "bg-blue-500/20 text-blue-300 border-blue-500/30"
                            }`}>
                              {workflow.status.replace(/_/g, " ")}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Workflow Detail Panel */}
          <div className="col-span-12 lg:col-span-8">
            {selectedWorkflow ? (
              <div className="space-y-6">
                <Card className="border-white/10 bg-card/20 overflow-hidden">
                  {/* Candidate Header */}
                  <div className="bg-gradient-to-r from-primary/20 to-purple-500/20 border-b border-white/10 p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-full bg-white/10 backdrop-blur flex items-center justify-center text-white font-bold text-xl">
                          {getInitials(selectedCandidate?.fullName || "?")}
                        </div>
                        <div>
                          <h2 className="text-xl font-bold text-white">{selectedCandidate?.fullName}</h2>
                          <p className="text-muted-foreground">{selectedCandidate?.email}</p>
                          <p className="text-muted-foreground text-sm">{selectedCandidate?.phone}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-muted-foreground text-sm mb-2">Document Completion</p>
                        <div className="flex items-center gap-3">
                          <Progress value={getDocumentProgress(documentRequests)} className="w-32 h-2" />
                          <span className="text-xl font-bold text-white">{getDocumentProgress(documentRequests)}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <Tabs defaultValue="documents" className="w-full">
                    <div className="border-b border-white/10 px-6">
                      <TabsList className="bg-transparent border-0 p-0 h-14">
                        <TabsTrigger 
                          value="documents" 
                          className="data-[state=active]:bg-white/10 rounded-t-lg px-6"
                          data-testid="tab-documents"
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          Documents
                        </TabsTrigger>
                        <TabsTrigger 
                          value="activity" 
                          className="data-[state=active]:bg-white/10 rounded-t-lg px-6"
                          data-testid="tab-activity"
                        >
                          <Activity className="w-4 h-4 mr-2" />
                          Activity Timeline
                        </TabsTrigger>
                      </TabsList>
                    </div>

                    <TabsContent value="documents" className="m-0">
                      <div className="p-6" data-testid="documents-panel">
                        <div className="grid gap-4">
                          {documentRequests.map(doc => {
                            const config = statusConfig[doc.status] || statusConfig.pending;
                            const priorityConf = priorityConfig[doc.priority || "normal"];
                            const StatusIcon = config.icon;
                            
                            return (
                              <div
                                key={doc.id}
                                className={`p-4 rounded-lg border transition-all bg-card/30 ${config.border}`}
                                data-testid={`doc-request-${doc.id}`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-lg ${config.bg}`}>
                                      <StatusIcon className={`w-5 h-5 ${config.text}`} />
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <p className="font-semibold text-white">{doc.documentName}</p>
                                        {doc.isRequired === 1 && (
                                          <Badge className="bg-primary/20 text-primary text-xs border-primary/30">Required</Badge>
                                        )}
                                        <Badge className={`text-xs ${priorityConf.bg} ${priorityConf.text} border ${priorityConf.border}`}>
                                          {doc.priority}
                                        </Badge>
                                      </div>
                                      <p className="text-sm text-muted-foreground mt-1">{doc.description}</p>
                                      {doc.dueDate && (
                                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                          <span className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            Due: {new Date(doc.dueDate).toLocaleDateString()}
                                          </span>
                                          {doc.reminderCount > 0 && (
                                            <span className="flex items-center gap-1 text-orange-400">
                                              <Bell className="w-3 h-3" />
                                              {doc.reminderCount} reminder{doc.reminderCount > 1 ? "s" : ""} sent
                                            </span>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge className={`${config.bg} ${config.text} capitalize border ${config.border}`}>
                                      {doc.status}
                                    </Badge>
                                    {doc.status === "requested" && (
                                      <>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => sendReminderMutation.mutate(doc.id)}
                                          disabled={sendReminderMutation.isPending}
                                          className="gap-1 border-white/10 hover:bg-white/5"
                                          data-testid={`button-remind-${doc.id}`}
                                        >
                                          <Bell className="w-4 h-4" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          onClick={() => markReceivedMutation.mutate(doc.id)}
                                          disabled={markReceivedMutation.isPending}
                                          variant="outline"
                                          className="border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300"
                                          data-testid={`button-received-${doc.id}`}
                                        >
                                          Mark Received
                                        </Button>
                                      </>
                                    )}
                                    {doc.status === "received" && (
                                      <Button
                                        size="sm"
                                        onClick={() => markVerifiedMutation.mutate(doc.id)}
                                        disabled={markVerifiedMutation.isPending}
                                        variant="outline"
                                        className="gap-1 border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300"
                                        data-testid={`button-verify-${doc.id}`}
                                      >
                                        <CheckCircle2 className="w-4 h-4" />
                                        Verify
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="activity" className="m-0">
                      <div className="p-6" data-testid="activity-panel">
                        <ScrollArea className="h-[400px] pr-4">
                          <div className="relative">
                            <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-white/10" />
                            <div className="space-y-6">
                              {agentLogs
                                .slice()
                                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                                .map((log) => {
                                  const channelConf = channelConfig[log.communicationChannel || "system"];
                                  const ChannelIcon = channelConf?.icon || Bot;
                                  const agentStyle = agentColors[log.agentType] || "from-slate-500/30 to-slate-600/30 border-slate-500/30";
                                  
                                  return (
                                    <div
                                      key={log.id}
                                      className="relative pl-12"
                                      data-testid={`activity-log-${log.id}`}
                                    >
                                      <div className={`absolute left-2 w-7 h-7 rounded-full bg-gradient-to-br ${agentStyle} border flex items-center justify-center`}>
                                        <ChannelIcon className="w-3.5 h-3.5 text-white" />
                                      </div>
                                      <div className={`bg-card/30 border border-white/10 rounded-lg p-4 ${
                                        log.status === "requires_intervention" ? "border-red-500/30" : ""
                                      }`}>
                                        <div className="flex items-center justify-between mb-2">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <Badge variant="outline" className={`bg-gradient-to-r ${agentStyle} text-white text-xs`}>
                                              {log.agentType.replace(/_/g, " ")}
                                            </Badge>
                                            <span className="font-medium text-white capitalize">
                                              {log.action.replace(/_/g, " ")}
                                            </span>
                                          </div>
                                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {formatTimeAgo(log.createdAt)}
                                          </span>
                                        </div>
                                        {log.messageContent && (
                                          <div className="mt-3 p-3 bg-white/5 rounded-lg border border-white/5">
                                            <p className="text-sm text-muted-foreground italic">"{log.messageContent}"</p>
                                          </div>
                                        )}
                                        {log.details && Object.keys(log.details).length > 0 && (
                                          <div className="mt-3 flex flex-wrap gap-2">
                                            {Object.entries(log.details).slice(0, 3).map(([key, value]) => (
                                              <span key={key} className="text-xs bg-white/5 text-muted-foreground px-2 py-1 rounded-full">
                                                {key}: {String(value).slice(0, 30)}
                                              </span>
                                            ))}
                                          </div>
                                        )}
                                        {log.requiresHumanReview === 1 && !log.reviewedAt && (
                                          <Badge className="mt-3 bg-red-500/20 text-red-300 border-red-500/30">
                                            <AlertCircle className="w-3 h-3 mr-1" />
                                            Requires Review
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                            </div>
                          </div>
                        </ScrollArea>
                      </div>
                    </TabsContent>
                  </Tabs>
                </Card>
              </div>
            ) : (
              <Card className="h-full flex items-center justify-center border-white/10 bg-card/20" data-testid="no-selection">
                <CardContent className="text-center py-16">
                  <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-6">
                    <Users className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">Select a Team Member</h3>
                  <p className="text-muted-foreground max-w-sm mx-auto">
                    Choose an employee from the list to view their onboarding progress, documents, and AI agent activity.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      {/* Resolution Dialog */}
      <Dialog open={!!interventionDialog} onOpenChange={() => setInterventionDialog(null)}>
        <DialogContent className="sm:max-w-lg bg-card border-white/10">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <DialogTitle>Resolve Escalation</DialogTitle>
                <DialogDescription>
                  Review and take action on this case
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          {interventionDialog && (
            <div className="space-y-4 py-4">
              <div className="bg-red-500/10 rounded-lg p-4 border border-red-500/20">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500/30 to-rose-500/30 border border-red-500/30 flex items-center justify-center text-red-300 font-bold">
                    {getInitials(getCandidateName(interventionDialog.candidateId || ""))}
                  </div>
                  <div>
                    <p className="font-semibold text-white">
                      {getCandidateName(interventionDialog.candidateId || "")}
                    </p>
                    <p className="text-sm text-muted-foreground capitalize">
                      {interventionDialog.action.replace(/_/g, " ")}
                    </p>
                  </div>
                </div>
                <div className="bg-card/50 rounded-lg p-3 border border-white/5">
                  <p className="text-sm text-red-300 font-medium">
                    Issue: {(interventionDialog.details as any)?.reason || "Manual review required"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Step: {interventionDialog.stepName} • {formatTimeAgo(interventionDialog.createdAt)}
                  </p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">Resolution Notes</label>
                <Textarea
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Describe how you resolved this issue..."
                  rows={4}
                  className="resize-none bg-card/50 border-white/10"
                  data-testid="input-resolution-notes"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setInterventionDialog(null)} className="border-white/10">
              Cancel
            </Button>
            <Button
              onClick={() => interventionDialog && resolveInterventionMutation.mutate({
                logId: interventionDialog.id,
                notes: resolutionNotes,
              })}
              disabled={resolveInterventionMutation.isPending || !resolutionNotes}
              className="bg-emerald-500/20 border-emerald-500/30 hover:bg-emerald-500/30 text-emerald-300"
              data-testid="button-confirm-resolve"
            >
              {resolveInterventionMutation.isPending ? "Resolving..." : "Mark Resolved"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
