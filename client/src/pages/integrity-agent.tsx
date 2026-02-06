import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTenantQueryKey } from "@/hooks/useTenant";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/ui/back-button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
};

const mockCheckResults = {
  criminal: { 
    status: "Completed", 
    result: "Clear", 
    riskScore: 0, 
    findings: { 
      recordStatus: "No criminal record found in national database", 
      databases: ["SAPS Criminal Records", "National Prosecuting Authority"],
      lastChecked: new Date().toISOString() 
    } 
  },
  credit: { 
    status: "Completed", 
    result: "Flagged", 
    riskScore: 25, 
    findings: { 
      score: 650, 
      status: "Fair",
      flags: ["Minor credit default - R2,500 in 2022 (resolved)"],
      accounts: { current: 3, closed: 2 },
      lastChecked: new Date().toISOString() 
    } 
  },
  education: { 
    status: "Completed", 
    result: "Verified", 
    riskScore: 0, 
    findings: { 
      degree: "BSc Computer Science", 
      institution: "University of Cape Town", 
      year: 2018,
      verified: true,
      registrationNumber: "UCT2014-12345"
    } 
  },
  employment: { 
    status: "Completed", 
    result: "Verified", 
    riskScore: 5, 
    findings: { 
      employersVerified: 3, 
      employersUnverified: 1, 
      totalPositions: 4,
      discrepancies: "Minor date overlap between positions (2 weeks)",
      yearsOfExperience: 6.5
    } 
  },
  biometric: { 
    status: "Completed", 
    result: "Verified", 
    riskScore: 0, 
    findings: { 
      fingerprintMatch: 99.9,
      faceMatch: 98.7,
      idVerified: true,
      idNumber: "9012***********",
      timestamp: new Date().toISOString() 
    } 
  },
  reference: { 
    status: "Completed", 
    result: "Verified", 
    riskScore: 10, 
    findings: { 
      referencesProvided: 3, 
      referencesContacted: 3, 
      positive: 2, 
      neutral: 1,
      negative: 0,
      averageRating: 4.2,
      notes: "One reference unavailable for comment"
    } 
  },
};

export default function IntegrityAgent() {
  const queryClient = useQueryClient();
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>("");
  const [isRunningEvaluation, setIsRunningEvaluation] = useState(false);
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const candidatesKey = useTenantQueryKey(['candidates']);
  const integrityChecksKey = useTenantQueryKey(['integrity-checks']);

  // Auto-select candidate from URL query parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const candidateId = params.get('candidateId');
    if (candidateId && !selectedCandidateId) {
      setSelectedCandidateId(candidateId);
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
                    details: [
                      checkType.description,
                      `✓ ${agentFindings.findings?.substring(0, 80) || 'Analysis complete'} - Risk: ${agentFindings.riskScore || 0}%`
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
      case "Completed": return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case "Pending": return <Clock className="w-4 h-4 text-yellow-500" />;
      case "Failed": return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
    }
  };

  const getResultBadge = (result: string | null) => {
    if (!result) return null;
    
    const variants: Record<string, { bg: string; text: string }> = {
      Clear: { bg: "bg-green-500/10", text: "text-green-500" },
      Verified: { bg: "bg-green-500/10", text: "text-green-500" },
      Flagged: { bg: "bg-yellow-500/10", text: "text-yellow-500" },
      Failed: { bg: "bg-red-500/10", text: "text-red-500" },
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
    if (score === 0) return "text-green-500";
    if (score < 30) return "text-yellow-500";
    if (score < 70) return "text-teal-600";
    return "text-red-500";
  };

  const overallRiskScore = candidateChecks.length > 0
    ? Math.round(candidateChecks.reduce((sum, check) => sum + (check.riskScore || 0), 0) / candidateChecks.length)
    : null;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      
      <div className="flex-1 pt-20 container mx-auto px-4 py-6 h-[calc(100vh-80px)]">
        <div className="mb-6">
          <BackButton fallbackPath="/hr-dashboard" className="mb-4" />
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-primary" />
            Integrity Evaluation Agent
          </h1>
          <p className="text-muted-foreground mt-2">
            AI-powered automated background checks and risk assessments
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100%-100px)]">
          
          {/* LEFT: Candidate Selection & Controls */}
          <div className="lg:col-span-3 space-y-6 overflow-y-auto">
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
                  <Select value={selectedCandidateId} onValueChange={setSelectedCandidateId} disabled={isRunningEvaluation}>
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
                    <div className="text-2xl font-bold text-yellow-500" data-testid="text-pending-checks">
                      {allChecks.filter(c => c.status === "Pending").length}
                    </div>
                  </div>
                  <Clock className="w-8 h-8 text-yellow-500 opacity-50" />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                  <div>
                    <div className="text-xs text-muted-foreground">Completed</div>
                    <div className="text-2xl font-bold text-green-500" data-testid="text-completed-checks">
                      {allChecks.filter(c => c.status === "Completed").length}
                    </div>
                  </div>
                  <CheckCircle2 className="w-8 h-8 text-green-500 opacity-50" />
                </div>
              </CardContent>
            </Card>
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
                                <div className="flex-1 pt-1">
                                  <h4 className={`text-sm font-bold transition-colors ${
                                    step.status === "processing" ? "text-primary" : 
                                    step.status === "completed" ? "text-green-500" :
                                    step.status === "failed" ? "text-red-500" :
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
          </div>

          {/* RIGHT: Results & Evidence */}
          <div className="lg:col-span-4 flex flex-col overflow-hidden">
            <Card className="flex-1 bg-card/30 border-border dark:border-white/10 backdrop-blur-sm flex flex-col overflow-hidden" data-testid="card-results">
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
              <CardContent className="flex-1 overflow-hidden p-3">
                <ScrollArea className="h-full pr-3">
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
                    <div className="space-y-3">
                      <AnimatePresence>
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
                                check.result === "Flagged" ? "border-yellow-500/30" :
                                check.result === "Clear" || check.result === "Verified" ? "border-green-500/30" :
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
                                          {checkTypeInfo?.label || check.checkType}
                                        </CardTitle>
                                        <CardDescription className="text-[10px] mt-0.5">
                                          {format(new Date(check.createdAt), "MMM dd, HH:mm")}
                                        </CardDescription>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      {getResultBadge(check.result)}
                                    </div>
                                  </div>
                                </CardHeader>
                                <CardContent className="space-y-2 overflow-hidden">
                                  {check.riskScore !== null && check.riskScore !== undefined && (
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="text-muted-foreground">Risk Score:</span>
                                      <span className={`font-bold ${getRiskScoreColor(check.riskScore)}`}>
                                        {check.riskScore}%
                                      </span>
                                    </div>
                                  )}

                                  {check.findings && (() => {
                                    // Parse findings if it's a string (from database JSONB serialization)
                                    let parsedFindings = check.findings;
                                    if (typeof check.findings === 'string') {
                                      try {
                                        parsedFindings = JSON.parse(check.findings);
                                      } catch {
                                        // If parsing fails, keep as string for legacy display
                                        parsedFindings = check.findings;
                                      }
                                    }

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
                                                      <div className="mt-2 p-2 rounded bg-yellow-500/10 border border-yellow-500/30 overflow-hidden">
                                                        <div className="flex items-center gap-1 text-yellow-500 mb-1">
                                                          <FileWarning className="w-3 h-3 shrink-0" />
                                                          <span className="text-[10px] font-semibold">Missing Documents:</span>
                                                        </div>
                                                        <ul className="text-[10px] text-yellow-500/80 space-y-0.5 ml-4 break-words">
                                                          {checkData.missingDocuments.map((doc: string, idx: number) => (
                                                            <li key={idx} className="list-disc break-words">{doc}</li>
                                                          ))}
                                                        </ul>
                                                      </div>
                                                    )}
                                                    
                                                    {/* Follow-Up Required Alert */}
                                                    {checkData.requiresFollowUp && (
                                                      <div className="mt-2 p-2 rounded bg-teal-600/10 border border-teal-600/30 overflow-hidden">
                                                        <div className="flex items-center gap-1 text-teal-600 mb-1">
                                                          <Bell className="w-3 h-3 shrink-0" />
                                                          <span className="text-[10px] font-semibold">HR Follow-Up Required:</span>
                                                        </div>
                                                        <div className="text-[10px] text-teal-600/80" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
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
                      </AnimatePresence>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </div>
  );
}
