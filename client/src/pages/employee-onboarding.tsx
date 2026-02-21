import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTenantQueryKey } from "@/hooks/useTenant";
import { onboardingService, candidateService } from "@/lib/api";
import type { Candidate, OnboardingWorkflow } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Building2,
  Download,
  Send,
  User,
  Calendar,
  Monitor,
  FileText,
  BookOpen,
  Mail,
  CheckCircle2,
  Package,
  Loader2,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Clock,
  AlertCircle,
  Bell,
  Upload
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface DocFormData {
  fullName: string;
  jobTitle: string;
  startDate: string;
  department: string;
  email: string;
}

const defaultDocForm: DocFormData = {
  fullName: "",
  jobTitle: "",
  startDate: new Date().toISOString().split('T')[0],
  department: "",
  email: "",
};

function WorkflowDetail({ workflowId }: { workflowId: string }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingRequestId, setUploadingRequestId] = useState<string | null>(null);
  const [remindingRequestId, setRemindingRequestId] = useState<string | null>(null);
  const workflowsKey = useTenantQueryKey(['onboarding-workflows']);
  const docRequestsKey = useTenantQueryKey(['onboarding-doc-requests', workflowId]);
  const agentLogsKey = useTenantQueryKey(['onboarding-agent-logs', workflowId]);

  const { data: docRequests = [], isLoading: loadingDocs } = useQuery({
    queryKey: docRequestsKey,
    queryFn: () => onboardingService.getDocumentRequests(workflowId),
    retry: 1,
  });

  const { data: agentLogs = [], isLoading: loadingLogs } = useQuery({
    queryKey: agentLogsKey,
    queryFn: () => onboardingService.getAgentLogs(workflowId),
    retry: 1,
  });

  const initDocsMutation = useMutation({
    mutationFn: () => onboardingService.initializeDocumentRequests(workflowId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: docRequestsKey });
      queryClient.invalidateQueries({ queryKey: agentLogsKey });
      toast({ title: "Documents Initialized", description: "Document requests created for this workflow." });
    },
    onError: () => {
      toast({ title: "Failed", description: "Could not initialize documents.", variant: "destructive" });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: ({ requestId, file }: { requestId: string; file: File }) =>
      onboardingService.uploadDocument(requestId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: docRequestsKey });
      queryClient.invalidateQueries({ queryKey: agentLogsKey });
      toast({ title: "Document Uploaded", description: "Document uploaded and marked as received." });
      setUploadingRequestId(null);
    },
    onError: () => {
      toast({ title: "Upload Failed", description: "Could not upload document.", variant: "destructive" });
      setUploadingRequestId(null);
    },
  });

  const handleUploadClick = (requestId: string) => {
    setUploadingRequestId(requestId);
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && uploadingRequestId) {
      uploadMutation.mutate({ requestId: uploadingRequestId, file });
    }
    e.target.value = "";
  };

  const verifyMutation = useMutation({
    mutationFn: (requestId: string) => onboardingService.markDocumentVerified(requestId, "HR Staff"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: docRequestsKey });
      queryClient.invalidateQueries({ queryKey: agentLogsKey });
      queryClient.invalidateQueries({ queryKey: workflowsKey });
      toast({ title: "Document Verified", description: "Document has been verified." });
    },
    onError: () => {
      toast({ title: "Failed", description: "Could not verify document.", variant: "destructive" });
    },
  });

  const sendReminderMutation = useMutation({
    mutationFn: (requestId: string) => {
      setRemindingRequestId(requestId);
      return onboardingService.sendReminder(requestId);
    },
    onSuccess: () => {
      setRemindingRequestId(null);
      queryClient.invalidateQueries({ queryKey: docRequestsKey });
      queryClient.invalidateQueries({ queryKey: agentLogsKey });
      toast({ title: "Reminder Sent", description: "A reminder has been sent to the candidate." });
    },
    onError: () => {
      setRemindingRequestId(null);
      toast({ title: "Failed", description: "Could not send reminder.", variant: "destructive" });
    },
  });

  const remindAllMutation = useMutation({
    mutationFn: () => onboardingService.sendBulkReminder(workflowId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: docRequestsKey });
      queryClient.invalidateQueries({ queryKey: agentLogsKey });
      toast({ title: "Reminder Sent", description: `Sent reminder for ${data.sent} outstanding document(s).` });
    },
    onError: () => {
      toast({ title: "Failed", description: "Could not send reminder.", variant: "destructive" });
    },
  });

  const isLoading = loadingDocs || loadingLogs;

  const getDocStatusBadge = (status: string) => {
    switch (status) {
      case "verified": return <Badge className="bg-green-500/20 text-green-600 dark:text-green-400 border-0 text-[10px]">Verified</Badge>;
      case "received": return <Badge className="bg-blue-500/20 text-blue-600 dark:text-blue-400 border-0 text-[10px]">Received</Badge>;
      case "requested": return <Badge className="bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-0 text-[10px]">Requested</Badge>;
      case "overdue": return <Badge className="bg-red-500/20 text-red-600 dark:text-red-400 border-0 text-[10px]">Overdue</Badge>;
      default: return <Badge className="bg-gray-500/20 text-gray-600 dark:text-gray-400 border-0 text-[10px]">Pending</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="px-4 pb-4 flex items-center justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="ml-2 text-xs text-muted-foreground">Loading details...</span>
      </div>
    );
  }

  return (
    <div className="px-4 pb-4 space-y-3 border-t border-gray-300 dark:border-zinc-700/50">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
        onChange={handleFileChange}
      />
      {/* Document Requests */}
      <div className="pt-3">
        <div className="flex items-center justify-between mb-2">
          <h5 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            Document Requests ({docRequests.length})
          </h5>
          {docRequests.some((d: any) => d.status === "pending" || d.status === "requested" || d.status === "overdue") && (
            <Button
              size="sm"
              variant="outline"
              className="h-6 text-[10px] px-2 text-amber-600 border-amber-300"
              onClick={() => remindAllMutation.mutate()}
              disabled={remindAllMutation.isPending}
            >
              {remindAllMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Bell className="h-3 w-3 mr-1" />Remind All</>}
            </Button>
          )}
        </div>
        {docRequests.length === 0 ? (
          <div className="flex items-center gap-2 pl-5">
            <p className="text-xs text-muted-foreground">No document requests yet.</p>
            <Button
              size="sm"
              variant="outline"
              className="h-6 text-[10px] px-2"
              onClick={() => initDocsMutation.mutate()}
              disabled={initDocsMutation.isPending}
            >
              {initDocsMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <><FileText className="h-3 w-3 mr-1" />Initialize Documents</>}
            </Button>
          </div>
        ) : (
          <ScrollArea className={docRequests.length > 3 ? "h-[180px]" : ""}>
            <div className="space-y-1.5">
              {docRequests.map((doc: any) => (
                <div key={doc.id} className="flex items-center justify-between px-2 py-1.5 rounded bg-white/50 dark:bg-zinc-900/50 text-xs gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="truncate">{doc.documentName || doc.documentType}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {getDocStatusBadge(doc.status)}
                    {(doc.status === "pending" || doc.status === "requested") && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-5 text-[10px] px-1.5"
                          onClick={() => handleUploadClick(doc.id)}
                          disabled={uploadMutation.isPending && uploadingRequestId === doc.id}
                        >
                          {uploadMutation.isPending && uploadingRequestId === doc.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Upload className="h-3 w-3 mr-0.5" />Upload</>}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-5 text-[10px] px-1.5 text-amber-600"
                          onClick={() => sendReminderMutation.mutate(doc.id)}
                          disabled={sendReminderMutation.isPending && remindingRequestId === doc.id}
                        >
                          {sendReminderMutation.isPending && remindingRequestId === doc.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Bell className="h-3 w-3 mr-0.5" />Remind</>}
                        </Button>
                      </>
                    )}
                    {doc.status === "received" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-5 text-[10px] px-1.5 text-green-600"
                        onClick={() => verifyMutation.mutate(doc.id)}
                        disabled={verifyMutation.isPending}
                      >
                        {verifyMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <><CheckCircle2 className="h-3 w-3 mr-0.5" />Verify</>}
                      </Button>
                    )}
                    {doc.status === "overdue" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-5 text-[10px] px-1.5 text-amber-600"
                        onClick={() => sendReminderMutation.mutate(doc.id)}
                        disabled={sendReminderMutation.isPending && remindingRequestId === doc.id}
                      >
                        {sendReminderMutation.isPending && remindingRequestId === doc.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Bell className="h-3 w-3 mr-0.5" />Remind</>}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Agent Activity Log */}
      <div>
        <h5 className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-2">
          <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
          Agent Activity ({agentLogs.length})
        </h5>
        {agentLogs.length === 0 ? (
          <p className="text-xs text-muted-foreground pl-5">No agent activity recorded yet.</p>
        ) : (
          <ScrollArea className={agentLogs.length > 4 ? "h-[140px]" : ""}>
            <div className="space-y-1.5">
              {agentLogs.map((log: any) => (
                <div key={log.id} className="flex items-start gap-2 px-2 py-1.5 rounded bg-white/50 dark:bg-zinc-900/50 text-xs">
                  {log.status === "success" ? (
                    <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0 mt-0.5" />
                  ) : log.status === "failed" || log.status === "requires_intervention" ? (
                    <AlertCircle className="h-3 w-3 text-red-500 shrink-0 mt-0.5" />
                  ) : (
                    <Clock className="h-3 w-3 text-yellow-500 shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium truncate">{log.action?.replace(/_/g, ' ')}</span>
                      <span className="text-muted-foreground shrink-0">
                        {log.createdAt ? new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                      </span>
                    </div>
                    {log.stepName && (
                      <span className="text-muted-foreground">Step: {log.stepName}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}

export default function EmployeeOnboarding() {
  const queryClient = useQueryClient();
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [startDate, setStartDate] = useState("");
  const [requiresIT, setRequiresIT] = useState(true);
  const [requiresAccess, setRequiresAccess] = useState(true);
  const [requiresEquipment, setRequiresEquipment] = useState(true);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [docType, setDocType] = useState<string>("welcome_letter");
  const [docForm, setDocForm] = useState<DocFormData>(defaultDocForm);
  const [isGenerating, setIsGenerating] = useState(false);
  const [expandedWorkflowId, setExpandedWorkflowId] = useState<string | null>(null);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const packFileInputRef = useRef<HTMLInputElement>(null);

  // Fetch real data from API
  const workflowsKey = useTenantQueryKey(['onboarding-workflows']);
  const candidatesKey = useTenantQueryKey(['candidates']);

  const { data: workflows = [], isLoading: loadingWorkflows } = useQuery({
    queryKey: workflowsKey,
    queryFn: () => onboardingService.getWorkflows(),
    retry: 1,
  });

  const { data: candidates = [], isLoading: loadingCandidates } = useQuery({
    queryKey: candidatesKey,
    queryFn: () => candidateService.getAll(),
    retry: 1,
  });

  // Candidates eligible for onboarding: at a stage ready for onboarding, or have an active (non-completed) workflow
  const workflowCandidateIds = new Set(
    workflows
      .filter((w: OnboardingWorkflow) => w.status !== "Completed")
      .map((w: OnboardingWorkflow) => w.candidateId)
  );
  const onboardingEligibleStages = ["onboarding", "integrity_passed", "integrity passed", "hired"];
  const onboardingCandidates = candidates.filter((c: Candidate) => {
    const stage = ((c as any).stage || "").toLowerCase();
    return onboardingEligibleStages.some(s => stage === s || stage.includes("onboard")) || workflowCandidateIds.has(c.id.toString());
  });

  // Trigger onboarding mutation
  const triggerOnboarding = useMutation({
    mutationFn: (params: { candidateId: string; requirements: { itSetup: boolean; buildingAccess: boolean; equipment: boolean }; startDate?: string; files?: File[] }) =>
      onboardingService.triggerOnboarding(params.candidateId, {
        requirements: params.requirements,
        startDate: params.startDate,
        files: params.files,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workflowsKey });
      toast({
        title: "Onboarding Triggered",
        description: "Onboarding workflow has been started for the employee.",
      });
      setSelectedEmployee("");
      setStartDate("");
      setAttachedFiles([]);
    },
    onError: (error: any) => {
      toast({
        title: "Onboarding Failed",
        description: error?.response?.data?.message || error.message || "Failed to trigger onboarding",
        variant: "destructive",
      });
    },
  });

  // Helper: look up candidate info from a workflow
  const getCandidateForWorkflow = (workflow: OnboardingWorkflow): Candidate | undefined => {
    return candidates.find((c: Candidate) => c.id.toString() === workflow.candidateId);
  };

  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s === "completed" || s === "complete") {
      return <Badge className="bg-green-500/20 text-green-600 dark:text-green-400 border-0"><CheckCircle2 className="h-3 w-3 mr-1" />Completed</Badge>;
    }
    if (s === "in progress" || s === "in_progress") {
      return <Badge className="bg-blue-500/20 text-blue-600 dark:text-blue-400 border-0">In Progress</Badge>;
    }
    return <Badge className="bg-gray-500/20 text-gray-600 dark:text-gray-400 border-0">Pending</Badge>;
  };

  const handleGenerateDocument = async () => {
    if (!docForm.fullName || !docForm.jobTitle || !docForm.startDate) {
      toast({
        title: "Missing Information",
        description: "Please fill in Full Name, Job Title, and Start Date.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch(`/api/documents/generate/${docType}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(docForm),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to generate document");
      }

      const blob = await response.blob();
      const filename = `${docType}_${docForm.fullName.replace(/\s+/g, '_')}.docx`;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Document Downloaded",
        description: `${docType.replace(/_/g, ' ')} has been generated and downloaded.`,
      });
      setGenerateDialogOpen(false);
      setDocForm(defaultDocForm);
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate document",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const openGenerateDialog = (type: string) => {
    setDocType(type);
    // Pre-fill from selected employee if one is chosen
    if (selectedEmployee) {
      const candidate = candidates.find((c: Candidate) => c.id.toString() === selectedEmployee);
      if (candidate) {
        setDocForm({
          fullName: (candidate as any).fullName || (candidate as any).name || "",
          jobTitle: (candidate as any).role || (candidate as any).position || "",
          startDate: startDate || new Date().toISOString().split('T')[0],
          department: (candidate as any).department || "",
          email: (candidate as any).email || "",
        });
        setGenerateDialogOpen(true);
        return;
      }
    }
    setDocForm(defaultDocForm);
    setGenerateDialogOpen(true);
  };

  const handleDownloadWelcomeLetter = () => {
    openGenerateDialog("welcome_letter");
  };

  const handleDownloadHandbook = () => {
    openGenerateDialog("employee_handbook");
  };

  const handleSendOnboardingPack = () => {
    if (!selectedEmployee || !startDate) {
      toast({
        title: "Missing Information",
        description: "Please select an employee and start date.",
        variant: "destructive",
      });
      return;
    }
    if (attachedFiles.length === 0) {
      toast({
        title: "No Documents Attached",
        description: "Please attach at least one onboarding document.",
        variant: "destructive",
      });
      return;
    }
    triggerOnboarding.mutate({
      candidateId: selectedEmployee,
      requirements: { itSetup: requiresIT, buildingAccess: requiresAccess, equipment: requiresEquipment },
      startDate,
      files: attachedFiles,
    });
  };

  const isLoading = loadingWorkflows || loadingCandidates;

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <Building2 className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          Employee Onboarding
        </h1>
        <p className="text-muted-foreground mt-2">
          Manage the onboarding process for new employees
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              Send Onboarding Pack
            </CardTitle>
            <CardDescription>Prepare and send onboarding documents to a new employee</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Select Employee *</Label>
              <Select value={selectedEmployee} onValueChange={(val) => {
                setSelectedEmployee(val);
                // Auto-fill start date from existing workflow
                const existingWorkflow = workflows.find((w: OnboardingWorkflow) => w.candidateId === val);
                if (existingWorkflow?.startDate) {
                  setStartDate(new Date(existingWorkflow.startDate).toISOString().split('T')[0]);
                } else if (!startDate) {
                  setStartDate(new Date().toISOString().split('T')[0]);
                }
              }}>
                <SelectTrigger data-testid="select-employee">
                  <SelectValue placeholder={loadingCandidates ? "Loading candidates..." : "Choose an employee"} />
                </SelectTrigger>
                <SelectContent>
                  {onboardingCandidates.length > 0 ? (
                    onboardingCandidates.map((candidate: Candidate) => (
                      <SelectItem key={candidate.id} value={candidate.id.toString()}>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          {(candidate as any).fullName || (candidate as any).name} - {(candidate as any).role || (candidate as any).position || "Candidate"}
                        </div>
                      </SelectItem>
                    ))
                  ) : (
                    <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                      No candidates ready for onboarding. Candidates must pass integrity checks first.
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Start Date *</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="pl-10"
                  data-testid="input-start-date"
                />
              </div>
            </div>

            {/* Onboarding Documents Upload */}
            <div className="space-y-2 pt-2">
              <Label>Onboarding Documents *</Label>
              <p className="text-xs text-muted-foreground">Attach at least one document (welcome letter, contract, handbook, etc.)</p>
              <input
                ref={packFileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                multiple
                onChange={(e) => {
                  if (e.target.files) {
                    setAttachedFiles(prev => [...prev, ...Array.from(e.target.files!)]);
                  }
                  e.target.value = "";
                }}
              />
              <div
                className="border-2 border-dashed border-gray-300 dark:border-zinc-700 rounded-lg p-4 text-center cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
                onClick={() => packFileInputRef.current?.click()}
              >
                <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
                <p className="text-sm text-muted-foreground">Click to upload documents</p>
                <p className="text-xs text-muted-foreground">PDF, Word, Images</p>
              </div>
              {attachedFiles.length > 0 && (
                <div className="space-y-1.5 mt-2">
                  {attachedFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between px-3 py-1.5 rounded bg-gray-100 dark:bg-zinc-800/50 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                        <span className="truncate">{file.name}</span>
                        <span className="text-muted-foreground shrink-0">({(file.size / 1024).toFixed(0)} KB)</span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-5 w-5 p-0 text-muted-foreground hover:text-red-500"
                        onClick={(e) => {
                          e.stopPropagation();
                          setAttachedFiles(prev => prev.filter((_, i) => i !== idx));
                        }}
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3 pt-2">
              <Label>Onboarding Requirements</Label>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="requires-it"
                  checked={requiresIT}
                  onCheckedChange={(checked) => setRequiresIT(checked as boolean)}
                  data-testid="checkbox-requires-it"
                />
                <label htmlFor="requires-it" className="text-sm text-muted-foreground flex items-center gap-2">
                  <Monitor className="h-4 w-4" />
                  Request IT Setup (email, accounts, software)
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="requires-access"
                  checked={requiresAccess}
                  onCheckedChange={(checked) => setRequiresAccess(checked as boolean)}
                  data-testid="checkbox-requires-access"
                />
                <label htmlFor="requires-access" className="text-sm text-muted-foreground flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Request Building Access Card
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="requires-equipment"
                  checked={requiresEquipment}
                  onCheckedChange={(checked) => setRequiresEquipment(checked as boolean)}
                  data-testid="checkbox-requires-equipment"
                />
                <label htmlFor="requires-equipment" className="text-sm text-muted-foreground flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Request Equipment (laptop, phone, etc.)
                </label>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                onClick={handleSendOnboardingPack}
                disabled={triggerOnboarding.isPending || attachedFiles.length === 0}
                data-testid="button-send-pack"
              >
                {triggerOnboarding.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Send Onboarding Pack ({attachedFiles.length})
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-green-600 dark:text-green-400" />
              New Employees
            </CardTitle>
            <CardDescription>Track onboarding progress for new hires</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Loading workflows...</span>
              </div>
            ) : workflows.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <User className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">No onboarding workflows yet.</p>
                <p className="text-xs mt-1">Select an employee and send an onboarding pack to get started.</p>
              </div>
            ) : (
              workflows.map((workflow: OnboardingWorkflow) => {
                const candidate = getCandidateForWorkflow(workflow);
                const name = candidate ? ((candidate as any).fullName || (candidate as any).name || "Unknown") : "Unknown Candidate";
                const role = candidate ? ((candidate as any).role || (candidate as any).position || "") : "";
                const dept = candidate ? ((candidate as any).department || "") : "";
                const isExpanded = expandedWorkflowId === workflow.id;
                return (
                  <div
                    key={workflow.id}
                    className="rounded-lg bg-gray-200 dark:bg-zinc-800/50 border border-gray-300 dark:border-zinc-700/50"
                    data-testid={`employee-item-${workflow.id}`}
                  >
                    <div
                      className="p-4 cursor-pointer"
                      onClick={() => setExpandedWorkflowId(isExpanded ? null : workflow.id)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                          )}
                          <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                            <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <h4 className="font-medium text-foreground">{name}</h4>
                            <p className="text-sm text-muted-foreground">{role}{dept ? ` - ${dept}` : ""}</p>
                          </div>
                        </div>
                        {getStatusBadge(workflow.status)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2 ml-7">
                        Start Date: {workflow.startDate ? new Date(workflow.startDate).toLocaleDateString() : "Not set"}
                      </p>
                      {workflow.currentStep && (
                        <p className="text-xs text-muted-foreground ml-7">
                          Current Step: {workflow.currentStep}
                        </p>
                      )}
                    </div>
                    {isExpanded && (
                      <WorkflowDetail workflowId={workflow.id} />
                    )}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6 bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            Onboarding Documents
          </CardTitle>
          <CardDescription>Download templates and documents for new employees</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <Button
              variant="outline"
              className="h-auto py-4 flex-col gap-2"
              onClick={handleDownloadWelcomeLetter}
              data-testid="button-download-welcome"
            >
              <Mail className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              <span>Welcome Letter</span>
              <span className="text-xs text-muted-foreground">Template</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex-col gap-2"
              onClick={handleDownloadHandbook}
              data-testid="button-download-handbook"
            >
              <BookOpen className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              <span>Employee Handbook</span>
              <span className="text-xs text-muted-foreground">PDF Document</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex-col gap-2"
              data-testid="button-download-policies"
              onClick={() => openGenerateDialog("company_policies")}
            >
              <FileText className="h-8 w-8 text-green-600 dark:text-green-400" />
              <span>Company Policies</span>
              <span className="text-xs text-muted-foreground">PDF Document</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex-col gap-2"
              data-testid="button-download-checklist"
              onClick={() => openGenerateDialog("onboarding_checklist")}
            >
              <CheckCircle2 className="h-8 w-8 text-amber-600 dark:text-amber-400" />
              <span>Onboarding Checklist</span>
              <span className="text-xs text-muted-foreground">Template</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Generate {docType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </DialogTitle>
            <DialogDescription>
              Enter employee details to generate a personalized document.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="docFullName">Full Name *</Label>
              <Input
                id="docFullName"
                placeholder="John Smith"
                value={docForm.fullName}
                onChange={(e) => setDocForm(prev => ({ ...prev, fullName: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="docEmail">Email</Label>
              <Input
                id="docEmail"
                type="email"
                placeholder="john@company.com"
                value={docForm.email}
                onChange={(e) => setDocForm(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="docJobTitle">Job Title *</Label>
              <Input
                id="docJobTitle"
                placeholder="Senior Developer"
                value={docForm.jobTitle}
                onChange={(e) => setDocForm(prev => ({ ...prev, jobTitle: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="docDepartment">Department</Label>
              <Input
                id="docDepartment"
                placeholder="Engineering"
                value={docForm.department}
                onChange={(e) => setDocForm(prev => ({ ...prev, department: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="docStartDate">Start Date *</Label>
              <Input
                id="docStartDate"
                type="date"
                value={docForm.startDate}
                onChange={(e) => setDocForm(prev => ({ ...prev, startDate: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setGenerateDialogOpen(false)} disabled={isGenerating}>
              Cancel
            </Button>
            <Button onClick={handleGenerateDocument} disabled={isGenerating || !docForm.fullName || !docForm.jobTitle}>
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Generate & Download
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
