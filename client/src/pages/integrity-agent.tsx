import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTenantQueryKey } from "@/hooks/useTenant";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/ui/back-button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  ShieldCheck, 
  FileSignature, 
  Fingerprint, 
  Search, 
  AlertTriangle,
  CheckCircle2, 
  Loader2, 
  Lock,
  Scale,
  FileText,
  Users,
  Clock,
  XCircle,
  Play,
  User,
  Zap,
  FileWarning,
  Bell
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { candidateService, integrityChecksService } from "@/lib/api";
import type { Candidate, IntegrityCheck } from "@shared/schema";
import { format } from "date-fns";
import { toast } from "sonner";

const checkTypes = [
  { value: "criminal", label: "Criminal Record Check", icon: Scale, description: "Querying national criminal database..." },
  { value: "credit", label: "Credit Bureau Check", icon: FileText, description: "Verifying credit history and score..." },
  { value: "education", label: "Education Verification", icon: FileSignature, description: "Validating academic credentials..." },
  { value: "employment", label: "Employment History", icon: Users, description: "Checking previous employment records..." },
  { value: "biometric", label: "Biometric Verification", icon: Fingerprint, description: "Processing biometric data and ID verification..." },
  { value: "reference", label: "Reference Checks", icon: Search, description: "Contacting and verifying references..." },
];

type WorkflowStep = {
  id: string;
  label: string;
  status: "pending" | "processing" | "completed" | "failed";
  details?: string[];
  icon: any;
  checkId?: string;
  riskScore?: number | null;
};

export default function IntegrityAgent() {
  const queryClient = useQueryClient();
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>("");
  const [isRunningEvaluation, setIsRunningEvaluation] = useState(false);
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const candidatesKey = useTenantQueryKey(['candidates']);
  const integrityChecksKey = useTenantQueryKey(['integrity-checks']);

  const [autoStartPending, setAutoStartPending] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);

  // Auto-select candidate from URL query parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const candidateId = params.get('candidateId');
    const autoStart = params.get('autoStart');
    const readOnly = params.get('readOnly');
    if (readOnly === 'true') {
      setIsReadOnly(true);
    }
    if (candidateId && !selectedCandidateId) {
      setSelectedCandidateId(candidateId);
      if (autoStart === 'true' && readOnly !== 'true') {
        setAutoStartPending(true);
      }
    }
  }, []);

  const { data: candidates = [], isLoading: loadingCandidates } = useQuery({
    queryKey: candidatesKey,
    queryFn: candidateService.getAll,
  });

  const { data: allChecks = [], isLoading: loadingChecks } = useQuery({
    queryKey: integrityChecksKey,
    queryFn: integrityChecksService.getAll,
  });

  const { data: candidateChecks = [], refetch: refetchCandidateChecks } = useQuery({
    queryKey: [...integrityChecksKey, selectedCandidateId],
    queryFn: () => integrityChecksService.getByCandidateId(selectedCandidateId),
    enabled: !!selectedCandidateId,
  });

  const selectedCandidate = candidates.find(c => c.id === selectedCandidateId);

  // Auto-start evaluation once candidate data is loaded
  useEffect(() => {
    if (autoStartPending && selectedCandidateId && candidates.length > 0 && !isRunningEvaluation) {
      setAutoStartPending(false);
      // Small delay to let UI render the selected candidate
      const timer = setTimeout(() => {
        startIntegrityEvaluation();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [autoStartPending, selectedCandidateId, candidates]);

  // Read-only mode: populate workflow steps from existing findings
  useEffect(() => {
    if (!isReadOnly || candidateChecks.length === 0) return;

    // Find the most recent comprehensive check
    const latestCheck = candidateChecks.find(c => c.checkType === "comprehensive") || candidateChecks[0];
    let findings = latestCheck.findings;
    if (typeof findings === 'string') {
      try { findings = JSON.parse(findings); } catch { findings = {}; }
    }
    const findingsMap = (findings && typeof findings === 'object' && !Array.isArray(findings)) ? findings as Record<string, any> : {};

    const steps: WorkflowStep[] = checkTypes.map(type => {
      const agentFindings = findingsMap[type.value];
      return {
        id: type.value,
        label: type.label,
        icon: type.icon,
        status: agentFindings ? "completed" as const :
                latestCheck.status === "In Progress" ? "pending" as const : "pending" as const,
        riskScore: agentFindings?.riskScore ?? null,
        details: agentFindings ? [type.description, `✓ ${agentFindings.findings?.substring(0, 80) || 'Analysis complete'}`] : undefined,
      };
    });

    setWorkflowSteps(steps);

    // If check is still in progress, poll for updates
    if (latestCheck.status === "In Progress") {
      const pollInterval = setInterval(async () => {
        try {
          const updatedCheck = await integrityChecksService.getById(latestCheck.id);
          let updatedFindings = updatedCheck.findings;
          if (typeof updatedFindings === 'string') {
            try { updatedFindings = JSON.parse(updatedFindings); } catch { updatedFindings = {}; }
          }
          const updatedMap = (updatedFindings && typeof updatedFindings === 'object' && !Array.isArray(updatedFindings)) ? updatedFindings as Record<string, any> : {};

          setWorkflowSteps(prev => prev.map((step, idx) => {
            const af = updatedMap[step.id];
            if (af && step.status !== "completed") {
              return {
                ...step,
                status: "completed" as const,
                riskScore: af.riskScore ?? null,
                details: [checkTypes[idx].description, `✓ ${af.findings?.substring(0, 80) || 'Analysis complete'}`],
              };
            }
            return step;
          }));

          if (updatedCheck.status === "Completed" || updatedCheck.completedAt || updatedCheck.status === "Failed") {
            clearInterval(pollInterval);
            refetchCandidateChecks();
          }
        } catch (error) {
          console.error("Error polling check status:", error);
        }
      }, 2000);
      return () => clearInterval(pollInterval);
    }
  }, [isReadOnly, candidateChecks]);

  const startIntegrityEvaluation = async () => {
    if (!selectedCandidateId) {
      toast.error("Please select a candidate first");
      return;
    }

    setIsRunningEvaluation(true);
    
    const steps: WorkflowStep[] = checkTypes.map(type => ({
      id: type.value,
      label: type.label,
      status: "pending" as const,
      icon: type.icon,
      details: [type.description],
    }));
    
    setWorkflowSteps(steps);
    setCurrentStepIndex(0);

    toast.success("Starting AI-powered integrity evaluation...");

    try {
      // Create a master integrity check
      const masterCheck = await integrityChecksService.create({
        candidateId: selectedCandidateId,
        checkType: "comprehensive",
        status: "In Progress",
        findings: {
          initiated: new Date().toISOString(),
          agents: checkTypes.map(t => t.value),
        },
      });

      // Execute the real AI-powered check
      await integrityChecksService.execute(masterCheck.id);

      // Poll for progress updates
      const pollInterval = setInterval(async () => {
        try {
          const updatedCheck = await integrityChecksService.getById(masterCheck.id);
          
          // Update workflow visualization based on findings
          if (updatedCheck.findings && typeof updatedCheck.findings === 'object') {
            const findings = updatedCheck.findings as Record<string, any>;
            
            checkTypes.forEach((checkType, i) => {
              const agentFindings = findings[checkType.value];
              
              if (agentFindings) {
                setCurrentStepIndex(i);
                setWorkflowSteps(prev => prev.map((step, idx) =>
                  idx === i ? {
                    ...step,
                    status: "completed" as const,
                    riskScore: agentFindings.riskScore ?? null,
                    details: [
                      checkType.description,
                      `✓ ${agentFindings.findings?.substring(0, 80) || 'Analysis complete'}`
                    ]
                  } : step
                ));
              }
            });
          }

          // Check if completed
          if (updatedCheck.status === "Completed" || updatedCheck.completedAt) {
            clearInterval(pollInterval);
            setIsRunningEvaluation(false);
            setCurrentStepIndex(checkTypes.length - 1);
            await refetchCandidateChecks();
            queryClient.invalidateQueries({ queryKey: integrityChecksKey });
            toast.success("AI integrity evaluation completed!");
          } else if (updatedCheck.status === "Failed") {
            clearInterval(pollInterval);
            setIsRunningEvaluation(false);
            toast.error("Integrity evaluation failed");
          }
        } catch (error) {
          console.error("Error polling check status:", error);
        }
      }, 2000); // Poll every 2 seconds

      // Set timeout to stop polling after 5 minutes
      setTimeout(() => {
        clearInterval(pollInterval);
        if (isRunningEvaluation) {
          setIsRunningEvaluation(false);
          toast.error("Evaluation timeout - please check results manually");
        }
      }, 300000);

    } catch (error) {
      setIsRunningEvaluation(false);
      toast.error("Failed to start integrity evaluation");
      console.error("Evaluation error:", error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Completed": return <CheckCircle2 className="w-4 h-4 text-foreground" />;
      case "Pending": return <Clock className="w-4 h-4 text-foreground" />;
      case "Failed": return <XCircle className="w-4 h-4 text-destructive" />;
      default: return <Loader2 className="w-4 h-4 text-foreground animate-spin" />;
    }
  };

  const getResultBadge = (result: string | null) => {
    if (!result) return null;
    
    const variants: Record<string, { bg: string; text: string }> = {
      Clear: { bg: "bg-muted/10", text: "text-foreground" },
      Verified: { bg: "bg-muted/10", text: "text-foreground" },
      Flagged: { bg: "bg-muted/10", text: "text-foreground" },
      Failed: { bg: "bg-destructive/10", text: "text-destructive" },
    };
    
    const variant = variants[result] || { bg: "bg-gray-500/10", text: "text-gray-500" };
    
    return (
      <Badge className={`${variant.bg} ${variant.text} border-0`}>
        {result}
      </Badge>
    );
  };

  const getRiskScoreColor = (score: number | null) => {
    if (score === null || score === undefined) return "text-gray-500";
<<<<<<< HEAD
    if (score === 0) return "text-foreground";
    if (score < 30) return "text-foreground";
    if (score < 70) return "text-foreground";
    return "text-destructive";
=======
    if (score <= 10) return "text-green-500";
    if (score <= 30) return "text-yellow-500";
    if (score <= 60) return "text-orange-500";
    return "text-red-500";
>>>>>>> 7fee4ac65b551979fb60ea28a8aefaee18fcfca1
  };

  const latestScoredCheck = candidateChecks.find(check => check.riskScore != null);
  const overallRiskScore = latestScoredCheck ? latestScoredCheck.riskScore : null;

  return (
    <div className="min-h-screen bg-background text-foreground">

      <div className="pt-20 container mx-auto px-4 py-6">
        <div className="mb-6">
          <BackButton fallbackPath="/hr-dashboard?tab=integrity" className="mb-4" />
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-primary" />
            Integrity Evaluation Agent
          </h1>
          <p className="text-muted-foreground mt-2">
            AI-powered automated background checks and risk assessments
          </p>
          {isReadOnly && (
            <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-600 dark:text-blue-400 text-sm">
              <Lock className="w-4 h-4 shrink-0" />
              <span className="font-medium">Viewing Results</span>
              <span className="text-blue-500/70">— Read-only mode. Return to the Integrity tab to manage verifications.</span>
            </div>
          )}
        </div>

        {/* Horizontal AI Agent Workflow Pipeline */}
        <Card className="bg-card/30 border-border dark:border-white/10 backdrop-blur-sm mb-6 sticky top-20 z-10" data-testid="card-workflow">
          <CardContent className="py-4 px-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                <span className="text-sm font-bold">AI Agent Workflow</span>
              </div>
              <span className="text-xs text-muted-foreground">Automated integrity verification pipeline</span>
            </div>

            {workflowSteps.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground text-sm" data-testid="text-workflow-waiting">
                <p>Select a candidate and click "Start Integrity Evaluation" to begin the AI agent workflow</p>
              </div>
            ) : (
              <TooltipProvider delayDuration={200}>
                <div className="flex items-start justify-between">
                  {workflowSteps.map((step, index) => {
                    const Icon = step.icon;
                    const hasDetails = step.details && step.details.length > 0 && step.status !== "pending";
                    return (
                      <div key={step.id} className="flex items-center flex-1" data-testid={`workflow-step-${step.id}`}>
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: index * 0.1 }}
                          className="flex flex-col items-center gap-1.5 flex-1"
                        >
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center shrink-0 bg-background transition-all cursor-pointer ${
                                step.status === "completed" ? "border-green-500 text-green-500" :
                                step.status === "processing" ? "border-primary text-primary animate-pulse" :
                                step.status === "failed" ? "border-red-500 text-red-500" :
                                "border-muted text-muted-foreground"
                              }`}>
                                {step.status === "completed" ? <CheckCircle2 className="w-5 h-5" /> :
                                 step.status === "failed" ? <XCircle className="w-5 h-5" /> :
                                 step.status === "processing" ? <Loader2 className="w-5 h-5 animate-spin" /> :
                                 <Icon className="w-5 h-5" />}
                              </div>
                            </TooltipTrigger>
                            {hasDetails && (
                              <TooltipContent side="bottom" className="max-w-[280px] bg-popover text-popover-foreground border border-border p-3">
                                <p className="font-semibold text-xs mb-1">{step.label}</p>
                                {step.details!.map((detail, i) => (
                                  <p key={i} className="text-[11px] text-muted-foreground leading-relaxed">{detail}</p>
                                ))}
                              </TooltipContent>
                            )}
                          </Tooltip>
                          <span className={`text-[11px] font-medium text-center transition-colors ${
                            step.status === "processing" ? "text-primary" :
                            step.status === "completed" ? "text-green-500" :
                            step.status === "failed" ? "text-red-500" :
                            "text-muted-foreground"
                          }`}>
                            {step.label}
                          </span>
                          {step.status === "completed" && step.riskScore !== null && step.riskScore !== undefined && (
                            <motion.span
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className={`text-[10px] font-semibold ${getRiskScoreColor(step.riskScore)}`}
                            >
                              Risk: {step.riskScore}%
                            </motion.span>
                          )}
                        </motion.div>
                        {index < workflowSteps.length - 1 && (
                          <div className={`h-0.5 w-full max-w-[60px] mt-5 shrink-0 transition-colors ${
                            step.status === "completed" ? "bg-green-500" : "bg-white/10"
                          }`} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </TooltipProvider>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT: Candidate Selection & Controls */}
          <div className="lg:col-span-3">
            <div className="lg:sticky lg:top-[220px] space-y-6">
            <Card className="bg-card/30 border-border dark:border-white/10 backdrop-blur-sm" data-testid="card-candidate-selection">
              <CardHeader>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" /> 
                  Select Candidate
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-2 block">Candidate</label>
                  <Select value={selectedCandidateId} onValueChange={setSelectedCandidateId} disabled={isRunningEvaluation || isReadOnly}>
                    <SelectTrigger className="bg-white/5 border-border dark:border-white/10" data-testid="select-candidate">
                      <SelectValue placeholder="Choose a candidate..." />
                    </SelectTrigger>
                    <SelectContent>
                      {loadingCandidates ? (
                        <SelectItem value="loading" disabled>Loading...</SelectItem>
                      ) : candidates.length === 0 ? (
                        <SelectItem value="empty" disabled>No candidates found</SelectItem>
                      ) : (
                        candidates.map(candidate => (
                          <SelectItem key={candidate.id} value={candidate.id} data-testid={`option-candidate-${candidate.id}`}>
                            {candidate.fullName} - {candidate.role || "N/A"}
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
                      <User className="w-4 h-4 text-primary" />
                      <span className="font-semibold text-sm">{selectedCandidate.fullName}</span>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div>Email: {selectedCandidate.email || "N/A"}</div>
                      <div>Phone: {selectedCandidate.phone || "N/A"}</div>
                      <div>Stage: <Badge variant="outline" className="text-[10px]">{selectedCandidate.stage}</Badge></div>
                    </div>
                    
                    {overallRiskScore !== null && candidateChecks.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-border dark:border-white/10">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Overall Risk Score</span>
                          <span className={`text-lg font-bold ${getRiskScoreColor(overallRiskScore)}`}>
                            {overallRiskScore}%
                          </span>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                {isReadOnly ? (
                  <div className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-md bg-blue-500/10 border border-blue-500/30 text-blue-600 dark:text-blue-400 text-sm font-medium">
                    <Lock className="w-4 h-4" />
                    Viewing Results
                  </div>
                ) : (
                  <Button
                    onClick={startIntegrityEvaluation}
                    disabled={!selectedCandidateId || isRunningEvaluation}
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                    data-testid="button-start-evaluation"
                  >
                    {isRunningEvaluation ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Running Agents...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 mr-2" />
                        Start Integrity Evaluation
                      </>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card className="bg-card/30 border-border dark:border-white/10 backdrop-blur-sm" data-testid="card-stats">
              <CardHeader>
                <CardTitle className="text-sm font-bold">System Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                  <div>
                    <div className="text-xs text-muted-foreground">Total Checks</div>
                    <div className="text-2xl font-bold" data-testid="text-total-checks">{allChecks.length}</div>
                  </div>
                  <ShieldCheck className="w-8 h-8 text-primary opacity-50" />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                  <div>
                    <div className="text-xs text-muted-foreground">Pending</div>
                    <div className="text-2xl font-bold text-foreground" data-testid="text-pending-checks">
                      {allChecks.filter(c => c.status === "Pending").length}
                    </div>
                  </div>
                  <Clock className="w-8 h-8 text-foreground opacity-50" />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                  <div>
                    <div className="text-xs text-muted-foreground">Completed</div>
                    <div className="text-2xl font-bold text-foreground" data-testid="text-completed-checks">
                      {allChecks.filter(c => c.status === "Completed").length}
                    </div>
                  </div>
                  <CheckCircle2 className="w-8 h-8 text-foreground opacity-50" />
                </div>
              </CardContent>
            </Card>
<<<<<<< HEAD
          </div>

          {/* MIDDLE: AI Agent Workflow Visualization */}
          <div className="lg:col-span-5 flex flex-col overflow-hidden">
            <Card className="flex-1 bg-card/30 border-border dark:border-white/10 backdrop-blur-sm flex flex-col overflow-hidden" data-testid="card-workflow">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" /> 
                  AI Agent Workflow
                </CardTitle>
                <CardDescription>Automated integrity verification pipeline</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden">
                <ScrollArea className="h-full pr-4">
                  {workflowSteps.length === 0 ? (
                    <div className="text-center py-16 text-muted-foreground" data-testid="text-workflow-waiting">
                      <ShieldCheck className="w-16 h-16 mx-auto mb-4 opacity-20" />
                      <p className="text-lg font-semibold mb-2">Select a Candidate</p>
                      <p className="text-sm">Click "Start Integrity Evaluation" to begin the AI agent workflow</p>
                    </div>
                  ) : (
                    <div className="space-y-6 relative pb-4">
                      <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-white/5 z-0" />
                      
                      <AnimatePresence>
                        {workflowSteps.map((step, index) => {
                          const Icon = step.icon;
                          return (
                            <motion.div 
                              key={step.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.1 }}
                              className="relative z-10"
                              data-testid={`workflow-step-${step.id}`}
                            >
                              <div className="flex items-start gap-3">
                                <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center shrink-0 bg-background transition-all ${
                                  step.status === "completed" ? "border-border text-foreground" : 
                                  step.status === "processing" ? "border-primary text-primary animate-pulse" : 
                                  step.status === "failed" ? "border-destructive text-destructive" :
                                  "border-muted text-muted-foreground"
                                }`}>
                                  {step.status === "completed" ? <CheckCircle2 className="w-5 h-5" /> : 
                                   step.status === "failed" ? <XCircle className="w-5 h-5" /> :
                                   step.status === "processing" ? <Loader2 className="w-5 h-5 animate-spin" /> :
                                   <Icon className="w-5 h-5" />}
                                </div>
                                <div className="flex-1 pt-1">
                                  <h4 className={`text-sm font-bold transition-colors ${
                                    step.status === "processing" ? "text-primary" : 
                                    step.status === "completed" ? "text-foreground" :
                                    step.status === "failed" ? "text-destructive" :
                                    "text-foreground"
                                  }`}>
                                    {step.label}
                                  </h4>
                                  {step.details && (
                                    <motion.ul 
                                      initial={{ opacity: 0, height: 0 }}
                                      animate={{ opacity: 1, height: "auto" }}
                                      className="mt-2 space-y-1"
                                    >
                                      {step.details.map((detail, i) => (
                                        <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                                          <div className="w-1 h-1 rounded-full bg-white/20 mt-1.5 shrink-0" />
                                          <span>{detail}</span>
                                        </li>
                                      ))}
                                    </motion.ul>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
=======
            </div>
>>>>>>> 7fee4ac65b551979fb60ea28a8aefaee18fcfca1
          </div>

          {/* RIGHT: Results & Evidence */}
          <div className="lg:col-span-9">
            <Card className="bg-card/30 border-border dark:border-white/10 backdrop-blur-sm" data-testid="card-results">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-primary" />
                    Verification Results
                  </div>
                  {candidateChecks.length > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {candidateChecks.length} {candidateChecks.length === 1 ? 'check' : 'checks'}
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>Background check findings and evidence</CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                  {!selectedCandidateId ? (
                    <div className="text-center py-16 text-muted-foreground">
                      <Lock className="w-16 h-16 mx-auto mb-4 opacity-20" />
                      <p className="text-sm">Select a candidate to view results</p>
                    </div>
                  ) : candidateChecks.length === 0 ? (
                    <div className="text-center py-16 text-muted-foreground" data-testid="text-no-results">
                      <FileText className="w-16 h-16 mx-auto mb-4 opacity-20" />
                      <p className="text-sm">No checks completed yet</p>
                      <p className="text-xs mt-2">Start an evaluation to see results</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <AnimatePresence>
<<<<<<< HEAD
                        {candidateChecks.map((check, index) => {
                          const checkTypeInfo = checkTypes.find(t => t.value === check.checkType);
                          const Icon = checkTypeInfo?.icon || FileText;
                          
                          return (
                            <motion.div
                              key={check.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.05 }}
                              data-testid={`result-card-${check.id}`}
                              className="min-w-0"
                            >
                              <Card className={`bg-white/5 border transition-colors overflow-hidden ${
                                check.result === "Flagged" ? "border-border/30" :
                                check.result === "Clear" || check.result === "Verified" ? "border-border/30" :
                                "border-border dark:border-white/10"
                              }`}>
                                <CardHeader className="pb-2">
                                  <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-2">
                                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                        <Icon className="w-4 h-4 text-primary" />
=======
                        {(() => {
                          // Flatten comprehensive checks into individual finding cards
                          const resultCards: { key: string; checkType: string; checkData: any; createdAt: string; checkId: string; index: number }[] = [];
                          let cardIndex = 0;

                          candidateChecks.forEach((check) => {
                            let parsedFindings = check.findings;
                            if (typeof check.findings === 'string') {
                              try { parsedFindings = JSON.parse(check.findings); } catch { parsedFindings = check.findings; }
                            }
                            // Skip checks with no findings yet (e.g. newly created, not yet run)
                            if (!parsedFindings) return;

                            if (typeof parsedFindings === 'object' && !Array.isArray(parsedFindings)) {
                              const findingsMap = parsedFindings as Record<string, any>;
                              // Iterate in checkTypes order so criminal is first, credit second, etc.
                              checkTypes.forEach((ct) => {
                                const cd = findingsMap[ct.value];
                                if (!cd || typeof cd !== 'object' || Array.isArray(cd)) return;
                                resultCards.push({ key: `${check.id}-${ct.value}`, checkType: ct.value, checkData: cd, createdAt: check.createdAt, checkId: check.id, index: cardIndex++ });
                              });
                              // Include any extra keys not in checkTypes
                              Object.entries(findingsMap).forEach(([key, cd]) => {
                                if (key === '_progress' || !cd || typeof cd !== 'object' || Array.isArray(cd)) return;
                                if (checkTypes.some(ct => ct.value === key)) return; // already added
                                resultCards.push({ key: `${check.id}-${key}`, checkType: key, checkData: cd, createdAt: check.createdAt, checkId: check.id, index: cardIndex++ });
                              });
                            } else {
                              // Legacy single-result check
                              resultCards.push({ key: check.id, checkType: check.checkType, checkData: { findings: String(parsedFindings) }, createdAt: check.createdAt, checkId: check.id, index: cardIndex++ });
                            }
                          });

                          // Group cards by run (checkId) to count runs
                          const runIds = [...new Set(resultCards.map(c => c.checkId))];
                          const checkRiskMap = new Map(candidateChecks.map(c => [c.id, c.riskScore]));

                          return resultCards.map((card, idx) => {
                            const checkTypeInfo = checkTypes.find(t => t.value === card.checkType);
                            const Icon = checkTypeInfo?.icon || FileText;
                            const result = card.checkData.result || (card.checkData.riskScore === 0 ? "Clear" : card.checkData.riskScore > 30 ? "Flagged" : "Verified");
                            const isFirstOfRun = idx === 0 || resultCards[idx - 1].checkId !== card.checkId;
                            const runNumber = runIds.indexOf(card.checkId) + 1;

                            return (
                              <React.Fragment key={card.key}>
                                {isFirstOfRun && runIds.length > 1 && (() => {
                                  const runRisk = checkRiskMap.get(card.checkId);
                                  return (
                                    <div className="lg:col-span-2 flex items-center justify-between py-1 border-b border-border dark:border-white/10">
                                      <div className="flex items-center gap-2">
                                        <Clock className="w-3 h-3 text-muted-foreground" />
                                        <span className="text-[11px] font-semibold text-muted-foreground">
                                          Run {runNumber} — {format(new Date(card.createdAt), "MMM dd, yyyy 'at' HH:mm")}
                                        </span>
                                      </div>
                                      {runRisk != null && (
                                        <span className={`text-[11px] font-bold ${getRiskScoreColor(runRisk)}`}>
                                          Overall: {runRisk}%
                                        </span>
                                      )}
                                    </div>
                                  );
                                })()}
                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: card.index * 0.05 }}
                                data-testid={`result-card-${card.key}`}
                                className="min-w-0"
                              >
                                <Card className={`bg-white/5 border transition-colors overflow-hidden h-full ${
                                  result === "Flagged" ? "border-yellow-500/30" :
                                  result === "Clear" || result === "Verified" ? "border-green-500/30" :
                                  "border-border dark:border-white/10"
                                }`}>
                                  <CardHeader className="pb-2">
                                    <div className="flex items-start justify-between">
                                      <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                          <Icon className="w-4 h-4 text-primary" />
                                        </div>
                                        <div>
                                          <CardTitle className="text-xs font-semibold">
                                            {checkTypeInfo?.label || card.checkType}
                                          </CardTitle>
                                          <CardDescription className="text-[10px] mt-0.5">
                                            {format(new Date(card.createdAt), "MMM dd, HH:mm")}
                                          </CardDescription>
                                        </div>
>>>>>>> 7fee4ac65b551979fb60ea28a8aefaee18fcfca1
                                      </div>
                                      <div className="flex items-center gap-1.5">
                                        {getResultBadge(result)}
                                      </div>
                                    </div>
                                  </CardHeader>
                                  <CardContent className="space-y-2">
                                    {card.checkData.riskScore !== null && card.checkData.riskScore !== undefined && (
                                      <div className="flex items-center justify-between text-xs">
                                        <span className="text-muted-foreground">Risk Score:</span>
                                        <span className={`font-bold ${getRiskScoreColor(card.checkData.riskScore)}`}>
                                          {card.checkData.riskScore}%
                                        </span>
                                      </div>
                                    )}

                                    <div className="p-2.5 rounded bg-black/20 border border-border dark:border-white/5 w-full">
                                      <div className="text-xs text-muted-foreground whitespace-pre-wrap" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                                        {card.checkData.findings || 'No findings available'}
                                      </div>
                                    </div>

                                    {/* Missing Documents Alert */}
                                    {card.checkData.missingDocuments && card.checkData.missingDocuments.length > 0 && (
                                      <div className="p-2 rounded bg-yellow-500/10 border border-yellow-500/30">
                                        <div className="flex items-center gap-1 text-yellow-500 mb-1">
                                          <FileWarning className="w-3 h-3 shrink-0" />
                                          <span className="text-xs font-semibold">Missing Documents:</span>
                                        </div>
                                        <ul className="text-xs text-yellow-500/80 space-y-0.5 ml-4 break-words">
                                          {card.checkData.missingDocuments.map((doc: string, idx: number) => (
                                            <li key={idx} className="list-disc break-words">{doc}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}

<<<<<<< HEAD
                                    return (
                                      <>
                                        {typeof parsedFindings === 'object' && !Array.isArray(parsedFindings) ? (
                                          <>
                                            {/* Show each check type's findings */}
                                            {Object.entries(parsedFindings as Record<string, any>).map(([checkType, checkData]: [string, any]) => {
                                              // Skip progress metadata and non-object entries
                                              if (checkType === '_progress' || !checkData || typeof checkData !== 'object' || Array.isArray(checkData)) {
                                                return null;
                                              }

                                              return (
                                                <div key={checkType} className="space-y-2 w-full">
                                                  <div className="p-2 rounded bg-black/20 border border-border dark:border-white/5 overflow-hidden w-full">
                                                    <div className="text-[10px] font-semibold text-primary mb-1 uppercase">{checkType} Check:</div>
                                                    <div className="text-[10px] text-muted-foreground whitespace-pre-wrap" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                                                      {checkData.findings || 'No findings available'}
                                                    </div>
                                                    
                                                    {/* Missing Documents Alert */}
                                                    {checkData.missingDocuments && checkData.missingDocuments.length > 0 && (
                                                      <div className="mt-2 p-2 rounded bg-muted/10 border border-border/30 overflow-hidden">
                                                        <div className="flex items-center gap-1 text-foreground mb-1">
                                                          <FileWarning className="w-3 h-3 shrink-0" />
                                                          <span className="text-[10px] font-semibold">Missing Documents:</span>
                                                        </div>
                                                        <ul className="text-[10px] text-foreground/80 space-y-0.5 ml-4 break-words">
                                                          {checkData.missingDocuments.map((doc: string, idx: number) => (
                                                            <li key={idx} className="list-disc break-words">{doc}</li>
                                                          ))}
                                                        </ul>
                                                      </div>
                                                    )}
                                                    
                                                    {/* Follow-Up Required Alert */}
                                                    {checkData.requiresFollowUp && (
                                                      <div className="mt-2 p-2 rounded bg-muted/10 border border-border/30 overflow-hidden">
                                                        <div className="flex items-center gap-1 text-foreground mb-1">
                                                          <Bell className="w-3 h-3 shrink-0" />
                                                          <span className="text-[10px] font-semibold">HR Follow-Up Required:</span>
                                                        </div>
                                                        <div className="text-[10px] text-foreground/80" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                                                          {checkData.followUpReason || 'Manual verification needed'}
                                                        </div>
                                                      </div>
                                                    )}
                                                  </div>
                                                </div>
                                              );
                                            })}
                                          </>
                                        ) : (
                                          /* Fallback for string-based findings (legacy checks or in-progress status) */
                                          <div className="p-2 rounded bg-black/20 border border-border dark:border-white/5 overflow-hidden w-full">
                                            <div className="text-[10px] font-semibold text-primary mb-1">Findings:</div>
                                            <div className="text-[10px] text-muted-foreground whitespace-pre-wrap" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                                              {String(parsedFindings)}
                                            </div>
                                          </div>
                                        )}
                                      </>
                                    );
                                  })()}
                                </CardContent>
                              </Card>
                            </motion.div>
                          );
                        })}
=======
                                    {/* Follow-Up Required Alert */}
                                    {card.checkData.requiresFollowUp && (
                                      <div className="p-2 rounded bg-teal-600/10 border border-teal-600/30">
                                        <div className="flex items-center gap-1 text-teal-600 mb-1">
                                          <Bell className="w-3 h-3 shrink-0" />
                                          <span className="text-xs font-semibold">HR Follow-Up Required:</span>
                                        </div>
                                        <div className="text-xs text-teal-600/80" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                                          {card.checkData.followUpReason || 'Manual verification needed'}
                                        </div>
                                      </div>
                                    )}
                                  </CardContent>
                                </Card>
                              </motion.div>
                              </React.Fragment>
                            );
                          });
                        })()}
>>>>>>> 7fee4ac65b551979fb60ea28a8aefaee18fcfca1
                      </AnimatePresence>
                    </div>
                  )}
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </div>
  );
}
