import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTenantQueryKey } from "@/hooks/useTenant";
import { onboardingService, candidateService, api } from "@/lib/api";
import type { Candidate, OnboardingWorkflow } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Building2,
  Send,
  User,
  Calendar,
  Monitor,
  FileText,
  BookOpen,
  Mail,
  MessageSquare,
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
  Settings2,
  Eye,
  Download,
  RefreshCw
} from "lucide-react";
import { renderAsync } from "docx-preview";
import { toast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { OnboardingSendDialog } from "@/components/onboarding-send-dialog";

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

function WorkflowDetail({ workflowId, onViewDocument }: { workflowId: string; onViewDocument: (blob: Blob, filename: string) => void }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingRequestId, setUploadingRequestId] = useState<string | null>(null);
  const [remindingRequestId, setRemindingRequestId] = useState<string | null>(null);
  const [reviewDoc, setReviewDoc] = useState<any | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [reviewBlob, setReviewBlob] = useState<Blob | null>(null);
  const [reviewMime, setReviewMime] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);
  const reviewDocxRef = useRef<HTMLDivElement | null>(null);
  const reviewBlobUrl = useMemo(() => reviewBlob ? URL.createObjectURL(reviewBlob) : null, [reviewBlob]);
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

  const rejectMutation = useMutation({
    mutationFn: ({ requestId, reason }: { requestId: string; reason: string }) =>
      api.post(`/onboarding/document-requests/${requestId}/rejected`, { reason }).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: docRequestsKey });
      queryClient.invalidateQueries({ queryKey: agentLogsKey });
      toast({ title: "Document Rejected", description: "Document has been rejected and candidate notified." });
    },
    onError: () => {
      toast({ title: "Failed", description: "Could not reject document.", variant: "destructive" });
    },
  });

  // Fetch the uploaded file as a blob when review dialog opens
  useEffect(() => {
    if (!reviewDoc?.receivedDocumentId) {
      setReviewBlob(null);
      setReviewMime("");
      return;
    }
    let cancelled = false;
    setReviewLoading(true);
    (async () => {
      try {
        // First get the document metadata to find the file path
        const meta = await api.get(`/documents/${reviewDoc.receivedDocumentId}`);
        const filePath = meta.data.filePath;
        const mime = meta.data.mimeType || "";
        if (cancelled) return;
        // Fetch the actual file as a blob
        const res = await fetch(`/${filePath}`);
        const blob = await res.blob();
        if (cancelled) return;
        setReviewBlob(blob);
        setReviewMime(mime);
      } catch (err) {
        console.error("Failed to load document for review:", err);
      } finally {
        if (!cancelled) setReviewLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [reviewDoc?.receivedDocumentId]);

  const sendReminderMutation = useMutation({
    mutationFn: ({ requestId, channel }: { requestId: string; channel: "email" | "whatsapp" }) => {
      setRemindingRequestId(requestId);
      return onboardingService.sendReminder(requestId, channel);
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
    mutationFn: (channel: "email" | "whatsapp") => onboardingService.sendBulkReminder(workflowId, channel),
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
      {/* Sent Documents (from onboarding pack) */}
      {(() => {
        const sentDocs = ((workflow?.documents as any[]) || []).filter((d: any) => d.type === "document" && d.url);
        if (sentDocs.length === 0) return null;
        return (
          <div className="pt-3">
            <h5 className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-2">
              <Send className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
              Sent Documents ({sentDocs.length})
            </h5>
            <div className="space-y-1.5">
              {sentDocs.map((doc: any) => (
                <div key={doc.id} className="flex items-center justify-between px-2 py-1.5 rounded bg-white/50 dark:bg-zinc-900/50 text-xs gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-3 w-3 text-green-600 dark:text-green-400 shrink-0" />
                    <span className="truncate">{doc.title}</span>
                    <Badge className="bg-green-500/20 text-green-600 dark:text-green-400 border-0 text-[10px]">Sent</Badge>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-5 text-[10px] px-1.5"
                      onClick={async () => {
                        try {
                          const resp = await fetch(doc.url);
                          if (!resp.ok) throw new Error("Failed to fetch");
                          const blob = await resp.blob();
                          onViewDocument(blob, doc.title);
                        } catch {
                          // fallback: direct download
                          window.open(doc.url, "_blank");
                        }
                      }}
                    >
                      <Eye className="h-3 w-3 mr-0.5" />View
                    </Button>
                    <a href={doc.url} download={doc.title}>
                      <Button size="sm" variant="ghost" className="h-5 text-[10px] px-1.5">
                        <Download className="h-3 w-3 mr-0.5" />Download
                      </Button>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Document Requests */}
      <div className="pt-3">
        <div className="flex items-center justify-between mb-2">
          <h5 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5 text-[#FFCB00]" />
            Document Requests ({docRequests.length})
          </h5>
          {docRequests.some((d: any) => d.status === "pending" || d.status === "requested" || d.status === "overdue") && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 text-[10px] px-2 text-amber-600 border-amber-300"
                  disabled={remindAllMutation.isPending}
                >
                  {remindAllMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Bell className="h-3 w-3 mr-1" />Remind All<ChevronDown className="h-2.5 w-2.5 ml-0.5" /></>}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => remindAllMutation.mutate("email")}>
                  <Mail className="h-3.5 w-3.5 mr-2" />Send via Email
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => remindAllMutation.mutate("whatsapp")}>
                  <MessageSquare className="h-3.5 w-3.5 mr-2" />Send via WhatsApp
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-5 text-[10px] px-1.5 text-amber-600"
                              disabled={sendReminderMutation.isPending && remindingRequestId === doc.id}
                            >
                              {sendReminderMutation.isPending && remindingRequestId === doc.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Bell className="h-3 w-3 mr-0.5" />Remind<ChevronDown className="h-2 w-2 ml-0.5" /></>}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => sendReminderMutation.mutate({ requestId: doc.id, channel: "email" })}>
                              <Mail className="h-3.5 w-3.5 mr-2" />Send via Email
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => sendReminderMutation.mutate({ requestId: doc.id, channel: "whatsapp" })}>
                              <MessageSquare className="h-3.5 w-3.5 mr-2" />Send via WhatsApp
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </>
                    )}
                    {doc.status === "received" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-5 text-[10px] px-1.5 text-blue-600"
                        onClick={() => { setReviewDoc(doc); setRejectionReason(""); }}
                      >
                        <Eye className="h-3 w-3 mr-0.5" />Review
                      </Button>
                    )}
                    {doc.status === "overdue" && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-5 text-[10px] px-1.5 text-amber-600"
                            disabled={sendReminderMutation.isPending && remindingRequestId === doc.id}
                          >
                            {sendReminderMutation.isPending && remindingRequestId === doc.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Bell className="h-3 w-3 mr-0.5" />Remind<ChevronDown className="h-2 w-2 ml-0.5" /></>}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => sendReminderMutation.mutate({ requestId: doc.id, channel: "email" })}>
                            <Mail className="h-3.5 w-3.5 mr-2" />Send via Email
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => sendReminderMutation.mutate({ requestId: doc.id, channel: "whatsapp" })}>
                            <MessageSquare className="h-3.5 w-3.5 mr-2" />Send via WhatsApp
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
              <Monitor className="h-3.5 w-3.5 text-[#FFCB00]" />
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
                        {log.createdAt ? new Date(log.createdAt).toLocaleDateString([], { day: 'numeric', month: 'short' }) + ' ' + new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
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

      {/* Document Review Dialog */}
      <Dialog open={!!reviewDoc} onOpenChange={() => setReviewDoc(null)}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Review: {reviewDoc?.documentName}
            </DialogTitle>
          </DialogHeader>
          {reviewDoc && (
            <div className="space-y-4 overflow-y-auto">
              {/* Document preview */}
              <div className="rounded-lg border overflow-auto bg-muted/30 h-[400px]">
                {reviewLoading ? (
                  <div className="flex flex-col items-center justify-center p-8 gap-2">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Loading document...</p>
                  </div>
                ) : reviewBlobUrl ? (
                  (() => {
                    if (reviewMime.startsWith("image/")) {
                      return (
                        <div className="flex justify-center p-4 max-h-[400px] overflow-auto">
                          <img src={reviewBlobUrl} alt={reviewDoc.documentName} className="max-w-full max-h-[380px] object-contain rounded" />
                        </div>
                      );
                    }
                    if (reviewMime === "application/pdf") {
                      return <iframe src={reviewBlobUrl} className="w-full h-[400px]" title={reviewDoc.documentName} />;
                    }
                    if (reviewMime.includes("wordprocessingml") || reviewMime.includes("msword")) {
                      return (
                        <div
                          ref={(node) => {
                            if (node && reviewBlob && !node.dataset.rendered) {
                              node.dataset.rendered = "true";
                              node.innerHTML = '<p class="text-center text-muted-foreground py-8">Rendering document...</p>';
                              renderAsync(reviewBlob, node, undefined, {
                                className: "docx-preview",
                                inWrapper: true,
                                ignoreWidth: true,
                                ignoreHeight: false,
                                ignoreFonts: false,
                                breakPages: true,
                              }).catch(() => {
                                node.innerHTML = '<p class="text-center text-muted-foreground py-8">Failed to render document.</p>';
                              });
                            }
                          }}
                        />
                      );
                    }
                    // Fallback: download link
                    return (
                      <div className="flex flex-col items-center justify-center p-8 gap-3">
                        <FileText className="w-10 h-10 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Preview not available for this file type</p>
                        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => {
                          const a = document.createElement("a");
                          a.href = reviewBlobUrl;
                          a.download = reviewDoc.documentName;
                          a.click();
                        }}>
                          <Download className="h-3 w-3" />Download to review
                        </Button>
                      </div>
                    );
                  })()
                ) : (
                  <div className="flex flex-col items-center justify-center p-8 gap-2">
                    <FileText className="h-6 w-6 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">No document uploaded yet</p>
                  </div>
                )}
              </div>

              {/* Info row */}
              <div className="flex gap-3 text-xs shrink-0">
                <div className="flex-1 bg-muted/30 rounded-lg p-2.5 border">
                  <p className="text-muted-foreground mb-0.5">Type</p>
                  <p className="font-medium">{reviewDoc.documentName}</p>
                </div>
                <div className="flex-1 bg-muted/30 rounded-lg p-2.5 border">
                  <p className="text-muted-foreground mb-0.5">Received</p>
                  <p className="font-medium">{reviewDoc.receivedAt ? new Date(reviewDoc.receivedAt).toLocaleDateString() : "N/A"}</p>
                </div>
              </div>

              {/* Rejection reason */}
              <div className="shrink-0">
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Rejection reason (only required if rejecting)
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. Document is expired, image is blurry..."
                  rows={2}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-none"
                />
              </div>

              {/* Action buttons */}
              <div className="flex justify-end gap-2 pt-1 shrink-0">
                <Button type="button" variant="outline" size="sm" onClick={() => setReviewDoc(null)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white"
                  disabled={verifyMutation.isPending || !!rejectionReason.trim()}
                  onClick={() => {
                    if (reviewDoc) {
                      verifyMutation.mutate(reviewDoc.id);
                      setReviewDoc(null);
                    }
                  }}
                >
                  {verifyMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <><CheckCircle2 className="h-3 w-3 mr-1" />Accept</>}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="text-red-600 border-red-200 hover:bg-red-50 dark:border-red-500/30 dark:hover:bg-red-500/10 dark:text-red-400"
                  disabled={!rejectionReason.trim() || rejectMutation.isPending}
                  onClick={() => {
                    if (reviewDoc && rejectionReason.trim()) {
                      rejectMutation.mutate({ requestId: reviewDoc.id, reason: rejectionReason.trim() });
                      setReviewDoc(null);
                    }
                  }}
                >
                  {rejectMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <><AlertCircle className="h-3 w-3 mr-1" />Reject</>}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
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

  // Listen for cross-tab candidate selection from risk overview
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.candidateId) {
        setSelectedEmployee(detail.candidateId.toString());
      }
    };
    window.addEventListener('onboarding-select-candidate', handler);
    return () => window.removeEventListener('onboarding-select-candidate', handler);
  }, []);
  const [requiresIT, setRequiresIT] = useState(savedOnboarding.current?.requiresIT ?? true);
  const [requiresAccess, setRequiresAccess] = useState(savedOnboarding.current?.requiresAccess ?? true);
  const [requiresEquipment, setRequiresEquipment] = useState(savedOnboarding.current?.requiresEquipment ?? true);
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>(savedOnboarding.current?.selectedEquipment || ["Laptop", "External Monitor", "Keyboard & Mouse"]);
  const [expandedWorkflowId, setExpandedWorkflowId] = useState<string | null>(savedOnboarding.current?.expandedWorkflowId || null);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>(savedOnboarding.current?.selectedDocuments || ["welcome_letter", "employee_handbook", "company_policies"]);
  const [showSendDialog, setShowSendDialog] = useState(false);

  // Fetch real data from API
  const workflowsKey = useTenantQueryKey(['onboarding-workflows']);
  const candidatesKey = useTenantQueryKey(['candidates']);

  const { data: workflows = [], isLoading: loadingWorkflows, isFetching: fetchingWorkflows } = useQuery({
    queryKey: workflowsKey,
    queryFn: () => onboardingService.getWorkflows(),
    retry: 1,
  });

  const { data: candidates = [], isLoading: loadingCandidates, isFetching: fetchingCandidates } = useQuery({
    queryKey: candidatesKey,
    queryFn: () => candidateService.getAll(),
    retry: 1,
  });

  // Fetch document templates to show which types have custom templates
  const { data: allTemplates = [] } = useQuery({
    queryKey: useTenantQueryKey(["document-templates"]),
    queryFn: async () => (await api.get("/document-templates")).data,
  });

  // Document preview state (single doc - for Eye buttons and View from generated list)
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [previewFilename, setPreviewFilename] = useState("");
  const [isGeneratingPreview, setIsGeneratingPreview] = useState<string | null>(null);
  const [showDocxPreview, setShowDocxPreview] = useState(false);
  const docxContainerRef = useRef<HTMLDivElement | null>(null);

  // Generate All Previews state
  const [generatedPreviews, setGeneratedPreviews] = useState<{docId: string; blob: Blob; filename: string}[]>([]);
  const [generatedBatchId, setGeneratedBatchId] = useState<string | null>(null);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [generateProgress, setGenerateProgress] = useState(0);

  const handlePreviewDocument = async (docId: string) => {
    setIsGeneratingPreview(docId);
    try {
      const response = await api.get(`/documents/preview/${docId}`, { responseType: "blob" });
      const disposition = response.headers["content-disposition"] || "";
      const match = disposition.match(/filename="?([^";\n]+)"?/);
      const filename = match?.[1] || `${docId}-preview.docx`;
      setPreviewBlob(response.data);
      setPreviewFilename(filename);
      setShowDocxPreview(true);
    } catch (error) {
      toast({
        title: "Preview Failed",
        description: "Could not generate document preview.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPreview(null);
    }
  };

  const handleDownloadPreview = () => {
    if (!previewBlob) return;
    const url = URL.createObjectURL(previewBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = previewFilename || "document-preview.docx";
    a.click();
    URL.revokeObjectURL(url);
  };

  const docxPreviewRefCallback = useCallback(
    (node: HTMLDivElement | null) => {
      docxContainerRef.current = node;
      if (node && previewBlob) {
        node.innerHTML = '<p class="text-center text-muted-foreground py-8">Rendering document...</p>';
        renderAsync(previewBlob, node, undefined, {
          className: "docx-preview",
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
          ignoreFonts: false,
          breakPages: true,
        }).catch((err) => {
          console.error("DOCX preview render error:", err);
          if (node) {
            node.innerHTML = '<p class="text-center text-muted-foreground py-8">Failed to render document preview.</p>';
          }
        });
      }
    },
    [previewBlob]
  );

  // Generate all selected documents with real candidate data
  const handleGenerateAllPreviews = async () => {
    if (selectedDocuments.length === 0 || !selectedEmployee) return;
    setIsGeneratingAll(true);
    setGenerateProgress(0);
    setGeneratedBatchId(null);
    try {
      // Generate all documents server-side in one call with real candidate data
      const response = await api.post("/onboarding/generate-documents", {
        candidateId: selectedEmployee,
        selectedDocuments,
        startDate: startDate || undefined,
      });
      const { batchId, documents } = response.data as { batchId: string; documents: { docType: string; filename: string; filePath: string }[] };
      setGeneratedBatchId(batchId);

      // Download each generated document for preview display
      const results: {docId: string; blob: Blob; filename: string}[] = [];
      for (let i = 0; i < documents.length; i++) {
        try {
          const doc = documents[i];
          const blobResponse = await api.get(`/onboarding/generated-document/${batchId}/${doc.docType}`, { responseType: "blob" });
          results.push({ docId: doc.docType, blob: blobResponse.data, filename: doc.filename });
        } catch {
          // Individual download failure is non-critical
        }
        setGenerateProgress(i + 1);
      }
      setGeneratedPreviews(results);
    } catch (err: any) {
      toast({ title: "Generation Failed", description: err?.response?.data?.message || "Could not generate documents.", variant: "destructive" });
    }
    setIsGeneratingAll(false);
  };

  // Clear generated previews when selected documents change
  const clearPreviews = useCallback(() => {
    setGeneratedPreviews([]);
    setGeneratedBatchId(null);
  }, []);

  // Watch selectedDocuments changes to clear previews (skip initial render)
  const prevDocsRef = useRef(selectedDocuments);
  useEffect(() => {
    if (prevDocsRef.current !== selectedDocuments) {
      prevDocsRef.current = selectedDocuments;
      clearPreviews();
    }
  }, [selectedDocuments, clearPreviews]);

  // View a generated preview in the dialog
  const handleViewGeneratedPreview = (preview: {blob: Blob; filename: string}) => {
    setPreviewBlob(preview.blob);
    setPreviewFilename(preview.filename);
    setShowDocxPreview(true);
  };

  // Download a single generated preview
  const handleDownloadGeneratedPreview = (preview: {blob: Blob; filename: string}) => {
    const url = URL.createObjectURL(preview.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = preview.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Candidates eligible for onboarding: at a stage ready for onboarding, or have an active (non-completed) workflow
  const workflowCandidateIds = new Set(
    workflows
      .filter((w: OnboardingWorkflow) => w.status !== "Completed")
      .map((w: OnboardingWorkflow) => w.candidateId)
  );
  const onboardingEligibleStages = ["onboarding", "integrity_passed", "integrity passed"];
  const onboardingCandidates = candidates.filter((c: Candidate) => {
    const stage = (c.stage || "").toLowerCase();
    return onboardingEligibleStages.some(s => stage === s || stage.includes("onboard")) || workflowCandidateIds.has(c.id.toString());
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
    setShowSendDialog(true);
  };

  const isLoading = loadingWorkflows || loadingCandidates;
  const isRefreshing = fetchingWorkflows || fetchingCandidates;

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
            <Building2 className="h-8 w-8 text-[#FFCB00]" />
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

      <div className="space-y-6">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-[#FFCB00]" />
              Send Onboarding Pack
            </CardTitle>
            <CardDescription>Prepare and send onboarding documents to a new employee</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Select Employee *</Label>
                <Select value={selectedEmployee} onValueChange={async (val) => {
                  setSelectedEmployee(val);
                  clearPreviews();
                  // Auto-fill start date from offer (source of truth), fall back to workflow, then today
                  try {
                    const res = await api.get(`/offers/candidate/${val}`);
                    if (res.data?.startDate) {
                      setStartDate(new Date(res.data.startDate).toISOString().split('T')[0]);
                      return;
                    }
                  } catch {}
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
                            {candidate.fullName} - {candidate.role || "Candidate"}
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
                    onChange={(e) => { setStartDate(e.target.value); clearPreviews(); }}
                    className="pl-10"
                    data-testid="input-start-date"
                  />
                </div>
              </div>
            </div>

            {/* Documents + Requirements side by side */}
            <div className="grid gap-4 md:grid-cols-2 pt-2">
              {/* Onboarding Documents Selection */}
              <div className="space-y-2">
                <Label>Documents to Send *</Label>
                <p className="text-xs text-muted-foreground">Select documents to include in the onboarding pack</p>
                <div className="space-y-1.5 p-3 rounded-lg border border-border bg-muted/30">
                  {ONBOARDING_DOCUMENTS.map((doc) => {
                    const Icon = doc.icon;
                    const tmpl = allTemplates.find((t: any) => t.templateType === doc.id && t.isActive);
                    return (
                      <div key={doc.id} className="flex items-center justify-between py-1.5 px-1 rounded hover:bg-muted/50">
                        <div className="flex items-center gap-2 min-w-0">
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
                          <label htmlFor={`doc-${doc.id}`} className="cursor-pointer min-w-0">
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                              <span className="text-sm truncate">{doc.name}</span>
                              {tmpl && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700 shrink-0">
                                  Template
                                </Badge>
                              )}
                            </div>
                            <p className={`text-[11px] ml-6 ${tmpl ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
                              {tmpl ? (
                                <span className="flex items-center gap-1">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Custom template: {tmpl.name}
                                </span>
                              ) : (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  System default template
                                </span>
                              )}
                            </p>
                          </label>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 shrink-0 text-muted-foreground hover:text-foreground"
                          onClick={() => handlePreviewDocument(doc.id)}
                          disabled={isGeneratingPreview === doc.id}
                          title="Preview document"
                        >
                          {isGeneratingPreview === doc.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Eye className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Onboarding Requirements */}
              <div className="space-y-3">
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
            </div>

            {/* Document Preview + Actions */}
            <div className="pt-4 border-t space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    onClick={handleGenerateAllPreviews}
                    disabled={selectedDocuments.length === 0 || isGeneratingAll}
                    className="border-blue-300 text-[#FFCB00] hover:bg-[#FFCB00]/10"
                  >
                    {isGeneratingAll ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating ({generateProgress}/{selectedDocuments.length})...
                      </>
                    ) : (
                      <>
                        <Eye className="h-4 w-4 mr-2" />
                        Generate Previews ({selectedDocuments.length})
                      </>
                    )}
                  </Button>
                  {generatedPreviews.length === 0 && !isGeneratingAll && (
                    <span className="text-xs text-muted-foreground">
                      Generate previews to review documents before sending
                    </span>
                  )}
                </div>

                <Button
                  className="bg-[#FFCB05] hover:bg-[#e6b800] text-black px-8"
                  onClick={handleSendOnboardingPack}
                  disabled={selectedDocuments.length === 0 || generatedPreviews.length === 0}
                  data-testid="button-send-pack"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send Onboarding Pack ({selectedDocuments.length})
                </Button>
              </div>

              {/* Generated previews list */}
              {generatedPreviews.length > 0 && (
                <div className="space-y-1.5 p-3 rounded-lg border border-border bg-muted/30">
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    Generated Documents ({generatedPreviews.length})
                  </p>
                  {generatedPreviews.map((preview) => {
                    const doc = ONBOARDING_DOCUMENTS.find(d => d.id === preview.docId);
                    const Icon = doc?.icon || FileText;
                    return (
                      <div key={preview.docId} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/50">
                        <div className="flex items-center gap-2 text-sm min-w-0">
                          <Icon className="h-4 w-4 text-[#FFCB00] shrink-0" />
                          <span className="font-medium truncate">{preview.filename}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => handleViewGeneratedPreview(preview)}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => handleDownloadGeneratedPreview(preview)}
                          >
                            <Download className="h-3 w-3 mr-1" />
                            Download
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-white" />
                New Employees
              </CardTitle>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={isRefreshing}
                onClick={() => {
                  queryClient.invalidateQueries({ queryKey: workflowsKey });
                  queryClient.invalidateQueries({ queryKey: candidatesKey });
                  // Also refresh document requests and agent logs for all expanded workflows
                  queryClient.invalidateQueries({ predicate: (query) => {
                    const key = query.queryKey as string[];
                    return key.some(k => typeof k === 'string' && (k.includes('onboarding-doc-requests') || k.includes('onboarding-agent-logs')));
                  }});
                }}
                title="Refresh employees"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
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
                const name = (workflow as any).candidateName || candidate?.fullName || "Unknown Candidate";
                const role = candidate?.role || "";
                const dept = "";
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
                          <div className="w-10 h-10 rounded-full bg-[#0A0A0A] flex items-center justify-center">
                            <User className="h-5 w-5 text-white" />
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
                      <WorkflowDetail workflowId={workflow.id} onViewDocument={(blob, filename) => {
                        setPreviewBlob(blob);
                        setPreviewFilename(filename);
                        setShowDocxPreview(true);
                      }} />
                    )}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* DOCX Preview Dialog */}
      <Dialog open={showDocxPreview} onOpenChange={setShowDocxPreview}>
        <DialogContent className="max-w-4xl h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Document Preview — {previewFilename}
            </DialogTitle>
          </DialogHeader>
          <div className="flex justify-end pb-2">
            <Button size="sm" variant="outline" onClick={handleDownloadPreview}>
              <Download className="h-3.5 w-3.5 mr-1" />
              Download
            </Button>
          </div>
          <div
            ref={docxPreviewRefCallback}
            className="flex-1 overflow-auto border rounded-lg bg-white"
            style={{ minHeight: 0 }}
          />
        </DialogContent>
      </Dialog>

      {/* Onboarding Send Dialog */}
      <OnboardingSendDialog
        open={showSendDialog}
        onOpenChange={setShowSendDialog}
        candidate={candidates.find((c: Candidate) => c.id.toString() === selectedEmployee) || null}
        selectedDocuments={selectedDocuments}
        requirements={{ itSetup: requiresIT, buildingAccess: requiresAccess, equipment: requiresEquipment }}
        equipmentList={selectedEquipment}
        startDate={startDate}
        generatedBatchId={generatedBatchId}
        onSuccess={() => {
          setSelectedEmployee("");
          setStartDate("");
          setSelectedDocuments(["welcome_letter", "employee_handbook", "company_policies"]);
          setGeneratedPreviews([]);
          setGeneratedBatchId(null);
        }}
      />
    </div>
  );
}
