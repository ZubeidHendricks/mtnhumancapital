import { useState, useRef, useEffect } from "react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Building2,
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
  ChevronDown,
  ChevronRight,
  Clock,
  AlertCircle,
  Bell,
  Upload,
  ClipboardList,
  Settings2
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

const ONBOARDING_FORM_KEY = "onboarding_form_draft";

function getSavedOnboardingState() {
  try {
    const raw = sessionStorage.getItem(ONBOARDING_FORM_KEY);
    if (raw) {
      sessionStorage.removeItem(ONBOARDING_FORM_KEY);
      return JSON.parse(raw);
    }
  } catch {}
  return null;
}

const ONBOARDING_DOCUMENTS = [
  { id: "welcome_letter", name: "Welcome Letter", icon: Mail },
  { id: "employee_handbook", name: "Employee Handbook", icon: BookOpen },
  { id: "company_policies", name: "Company Policies", icon: ClipboardList },
  { id: "onboarding_checklist", name: "Onboarding Checklist", icon: CheckCircle2 },
  { id: "it_request_form", name: "IT Equipment Request Form", icon: FileText },
  { id: "benefits_enrollment", name: "Benefits Enrollment Form", icon: FileText },
];

function WorkflowDetail({ workflowId }: { workflowId: string }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingRequestId, setUploadingRequestId] = useState<string | null>(null);
  const [remindingRequestId, setRemindingRequestId] = useState<string | null>(null);
  const workflowsKey = useTenantQueryKey(['onboarding-workflows']);
  const workflowKey = useTenantQueryKey(['onboarding-workflow', workflowId]);
  const docRequestsKey = useTenantQueryKey(['onboarding-doc-requests', workflowId]);
  const agentLogsKey = useTenantQueryKey(['onboarding-agent-logs', workflowId]);

  const { data: workflow } = useQuery({
    queryKey: workflowKey,
    queryFn: () => onboardingService.getWorkflow(workflowId),
    retry: 1,
  });

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

  const confirmProvisioningMutation = useMutation({
    mutationFn: (type: "it" | "buildingAccess" | "equipment") =>
      onboardingService.confirmProvisioning(workflowId, type, "HR Staff"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workflowKey });
      queryClient.invalidateQueries({ queryKey: workflowsKey });
      toast({ title: "Provisioning Confirmed", description: "Provisioning task updated." });
    },
    onError: () => {
      toast({ title: "Failed", description: "Could not confirm provisioning.", variant: "destructive" });
    },
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

      {/* Provisioning Status */}
      {workflow?.provisioningData && (() => {
        const pd = workflow.provisioningData as any;
        const reqs = pd.requirements || {};
        const hasProvisioning = reqs.itSetup !== false;
        if (!hasProvisioning) return null;
        const equipmentList: string[] = pd.equipmentList || [];
        return (
          <div>
            <h5 className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-2">
              <Monitor className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
              Provisioning Status
            </h5>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between px-2 py-1.5 rounded bg-white/50 dark:bg-zinc-900/50 text-xs">
                <span className="flex items-center gap-1.5">
                  <Monitor className="h-3 w-3" />
                  IT Setup (email, VPN, accounts)
                </span>
                <div className="flex items-center gap-2">
                  {pd.itConfirmed ? (
                    <Badge className="bg-green-500/20 text-green-600 dark:text-green-400 border-0 text-[10px]">Confirmed</Badge>
                  ) : (
                    <>
                      <Badge className="bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-0 text-[10px]">Pending</Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 px-2 text-[10px]"
                        onClick={() => confirmProvisioningMutation.mutate("it")}
                        disabled={confirmProvisioningMutation.isPending}
                      >
                        {confirmProvisioningMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <><CheckCircle2 className="h-3 w-3 mr-0.5" />Confirm</>}
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {reqs.buildingAccess !== false && (
                <div className="flex items-center justify-between px-2 py-1.5 rounded bg-white/50 dark:bg-zinc-900/50 text-xs">
                  <span className="flex items-center gap-1.5">
                    <Building2 className="h-3 w-3" />
                    Building Access Card
                  </span>
                  <div className="flex items-center gap-2">
                    {pd.buildingAccessConfirmed ? (
                      <Badge className="bg-green-500/20 text-green-600 dark:text-green-400 border-0 text-[10px]">Confirmed</Badge>
                    ) : (
                      <>
                        <Badge className="bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-0 text-[10px]">Pending</Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 px-2 text-[10px]"
                          onClick={() => confirmProvisioningMutation.mutate("buildingAccess")}
                          disabled={confirmProvisioningMutation.isPending}
                        >
                          {confirmProvisioningMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <><CheckCircle2 className="h-3 w-3 mr-0.5" />Confirm</>}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              )}

              {reqs.equipment !== false && (
                <div className="flex items-center justify-between px-2 py-1.5 rounded bg-white/50 dark:bg-zinc-900/50 text-xs">
                  <div>
                    <span className="flex items-center gap-1.5 mb-1">
                      <Package className="h-3 w-3" />
                      Equipment Requested
                    </span>
                    <div className="pl-4.5 text-muted-foreground">
                      {equipmentList.length > 0
                        ? equipmentList.map((item: string, i: number) => (
                            <span key={i}>{i > 0 ? ", " : ""}{item}</span>
                          ))
                        : <span>Standard equipment</span>
                      }
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {pd.equipmentConfirmed ? (
                      <Badge className="bg-green-500/20 text-green-600 dark:text-green-400 border-0 text-[10px]">Confirmed</Badge>
                    ) : (
                      <>
                        <Badge className="bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-0 text-[10px]">Pending</Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 px-2 text-[10px]"
                          onClick={() => confirmProvisioningMutation.mutate("equipment")}
                          disabled={confirmProvisioningMutation.isPending}
                        >
                          {confirmProvisioningMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <><CheckCircle2 className="h-3 w-3 mr-0.5" />Confirm</>}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

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
                    {(() => {
                      const details = typeof log.details === 'string' ? (() => { try { return JSON.parse(log.details); } catch { return null; } })() : log.details;
                      const parts: string[] = [];
                      if (log.stepName) parts.push(`Step: ${log.stepName}`);
                      if (details) {
                        if (log.action === 'reminder_sent' || log.action === 'reminder_escalated') {
                          if (details.documentName) parts.push(details.documentName);
                          if (details.reminderCount && details.maxReminders) parts.push(`Reminder ${details.reminderCount} of ${details.maxReminders}`);
                        } else if (log.action === 'bulk_reminder_sent') {
                          if (details.documentCount) parts.push(`${details.documentCount} document${details.documentCount !== 1 ? 's' : ''}`);
                        } else if (details.documentName) {
                          parts.push(details.documentName);
                        }
                      }
                      return parts.length > 0 ? (
                        <span className="text-muted-foreground">{parts.join(' · ')}</span>
                      ) : null;
                    })()}
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
  const [, navigate] = useLocation();
  const savedOnboarding = useRef(getSavedOnboardingState());

  // Restore scroll position when returning from Onboarding Setup
  useEffect(() => {
    if (savedOnboarding.current) {
      const scrollY = savedOnboarding.current.scrollY;
      if (scrollY != null) {
        setTimeout(() => {
          window.scrollTo({ top: scrollY, behavior: "smooth" });
        }, 400);
      }
    }
  }, []);

  const [selectedEmployee, setSelectedEmployee] = useState<string>(savedOnboarding.current?.selectedEmployee || "");
  const [startDate, setStartDate] = useState(savedOnboarding.current?.startDate || "");
  const [requiresIT, setRequiresIT] = useState(savedOnboarding.current?.requiresIT ?? true);
  const [requiresAccess, setRequiresAccess] = useState(savedOnboarding.current?.requiresAccess ?? true);
  const [requiresEquipment, setRequiresEquipment] = useState(savedOnboarding.current?.requiresEquipment ?? true);
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>(savedOnboarding.current?.selectedEquipment || ["Laptop", "External Monitor", "Keyboard & Mouse"]);
  const [expandedWorkflowId, setExpandedWorkflowId] = useState<string | null>(savedOnboarding.current?.expandedWorkflowId || null);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>(savedOnboarding.current?.selectedDocuments || ["welcome_letter", "employee_handbook", "company_policies"]);

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
    mutationFn: (params: { candidateId: string; requirements: { itSetup: boolean; buildingAccess: boolean; equipment: boolean }; equipmentList?: string[]; startDate?: string; files?: File[] }) =>
      onboardingService.triggerOnboarding(params.candidateId, {
        requirements: params.requirements,
        equipmentList: params.equipmentList,
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
      setSelectedDocuments(["welcome_letter", "employee_handbook", "company_policies"]);
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

  const handleSendOnboardingPack = () => {
    if (!selectedEmployee || !startDate) {
      toast({
        title: "Missing Information",
        description: "Please select an employee and start date.",
        variant: "destructive",
      });
      return;
    }
    if (selectedDocuments.length === 0) {
      toast({
        title: "No Documents Selected",
        description: "Please select at least one onboarding document to send.",
        variant: "destructive",
      });
      return;
    }
    triggerOnboarding.mutate({
      candidateId: selectedEmployee,
      requirements: { itSetup: requiresIT, buildingAccess: requiresAccess, equipment: requiresEquipment },
      equipmentList: requiresEquipment ? selectedEquipment : [],
      startDate,
    });
  };

  const isLoading = loadingWorkflows || loadingCandidates;

  const handleGoToOnboardingSetup = () => {
    sessionStorage.setItem(ONBOARDING_FORM_KEY, JSON.stringify({
      selectedEmployee, startDate, requiresIT, requiresAccess, requiresEquipment,
      selectedEquipment, expandedWorkflowId, selectedDocuments,
      scrollY: window.scrollY,
    }));
    navigate("/onboarding-setup");
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Building2 className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            Employee Onboarding
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage the onboarding process for new employees
          </p>
        </div>
        <Button variant="outline" onClick={handleGoToOnboardingSetup}>
          <Settings2 className="h-4 w-4 mr-2" />
          Manage Templates
        </Button>
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

            {/* Onboarding Documents Selection */}
            <div className="space-y-2 pt-2">
              <Label>Documents to Send *</Label>
              <p className="text-xs text-muted-foreground">Select documents to include in the onboarding pack (from Onboarding Setup templates)</p>
              <div className="space-y-2 p-3 rounded-lg border border-border bg-muted/30">
                {ONBOARDING_DOCUMENTS.map((doc) => {
                  const Icon = doc.icon;
                  return (
                    <div key={doc.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`doc-${doc.id}`}
                        checked={selectedDocuments.includes(doc.id)}
                        onCheckedChange={(checked) => {
                          setSelectedDocuments(prev =>
                            checked ? [...prev, doc.id] : prev.filter(d => d !== doc.id)
                          );
                        }}
                        data-testid={`checkbox-doc-${doc.id}`}
                      />
                      <label htmlFor={`doc-${doc.id}`} className="text-sm text-muted-foreground flex items-center gap-2 cursor-pointer">
                        <Icon className="h-4 w-4" />
                        {doc.name}
                      </label>
                    </div>
                  );
                })}
              </div>
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
                  Request Equipment
                </label>
              </div>

              {requiresEquipment && (
                <div className="ml-8 space-y-1.5 p-3 rounded-lg bg-muted/50 border border-border">
                  <p className="text-xs text-muted-foreground font-medium mb-2">Select equipment items:</p>
                  {["Laptop", "External Monitor", "Keyboard & Mouse", "Headset", "Phone", "Docking Station"].map((item) => (
                    <div key={item} className="flex items-center space-x-2">
                      <Checkbox
                        id={`equip-${item}`}
                        checked={selectedEquipment.includes(item)}
                        onCheckedChange={(checked) => {
                          setSelectedEquipment(prev =>
                            checked ? [...prev, item] : prev.filter(e => e !== item)
                          );
                        }}
                      />
                      <label htmlFor={`equip-${item}`} className="text-xs text-muted-foreground">{item}</label>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                onClick={handleSendOnboardingPack}
                disabled={triggerOnboarding.isPending || selectedDocuments.length === 0}
                data-testid="button-send-pack"
              >
                {triggerOnboarding.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Send Onboarding Pack ({selectedDocuments.length})
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

    </div>
  );
}
