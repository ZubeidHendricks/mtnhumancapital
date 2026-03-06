import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTenantQueryKey } from "@/hooks/useTenant";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Mail, MessageSquare, Send, Loader2, CheckCircle, FileText, AlertCircle
} from "lucide-react";
import { onboardingService } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import type { Candidate } from "@shared/schema";

interface OnboardingSendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidate: Candidate | null;
  selectedDocuments: string[];
  requirements: { itSetup: boolean; buildingAccess: boolean; equipment: boolean };
  equipmentList: string[];
  startDate: string;
  generatedBatchId: string | null;
  onSuccess: () => void;
}

const DOCUMENT_NAMES: Record<string, string> = {
  welcome_letter: "Welcome Letter",
  employee_handbook: "Employee Handbook",
  company_policies: "Company Policies",
  onboarding_checklist: "Onboarding Checklist",
  it_request_form: "IT Equipment Request Form",
  benefits_enrollment: "Benefits Enrollment Form",
};

export function OnboardingSendDialog({
  open,
  onOpenChange,
  candidate,
  selectedDocuments,
  requirements,
  equipmentList,
  startDate,
  generatedBatchId,
  onSuccess,
}: OnboardingSendDialogProps) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const workflowsKey = useTenantQueryKey(["onboarding-workflows"]);

  const [channel, setChannel] = useState<"email" | "whatsapp">("email");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sentRecipient, setSentRecipient] = useState("");

  const hasPhone = !!(candidate?.phone || (candidate?.metadata as any)?.phone);
  const hasEmail = !!candidate?.email;
  const phone = candidate?.phone || (candidate?.metadata as any)?.phone || "";

  useEffect(() => {
    if (open && candidate) {
      setSent(false);
      setSentRecipient("");
      setSending(false);
      // Auto-select WhatsApp if phone available, else email
      if (hasPhone) {
        setChannel("whatsapp");
      } else {
        setChannel("email");
      }
    }
  }, [open, candidate]);

  const handleSend = async () => {
    if (!candidate) return;

    if (channel === "whatsapp" && !hasPhone) {
      toast({ title: "No Phone Number", description: "This candidate has no phone number for WhatsApp.", variant: "destructive" });
      return;
    }
    if (channel === "email" && !hasEmail) {
      toast({ title: "No Email", description: "This candidate has no email address.", variant: "destructive" });
      return;
    }

    setSending(true);
    try {
      await onboardingService.triggerOnboarding(candidate.id.toString(), {
        requirements,
        equipmentList: requirements.equipment ? equipmentList : [],
        startDate,
        selectedDocuments,
        generatedBatchId: generatedBatchId || undefined,
        channel,
      });

      queryClient.invalidateQueries({ queryKey: workflowsKey });
      setSentRecipient(channel === "whatsapp" ? phone : (candidate.email || ""));
      setSent(true);
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Onboarding Failed",
        description: error?.response?.data?.message || error.message || "Failed to trigger onboarding",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  if (!candidate) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border sm:max-w-[500px]">
        {sent ? (
          <>
            <DialogHeader className="sr-only">
              <DialogTitle>Onboarding Pack Sent</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center justify-center py-8 gap-4 text-center">
              <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="h-10 w-10 text-green-500" />
              </div>
              <h2 className="text-xl font-bold text-foreground">Onboarding Pack Sent!</h2>
              <p className="text-sm text-muted-foreground">
                Sent via{" "}
                <span className="font-medium text-foreground">{channel === "whatsapp" ? "WhatsApp" : "Email"}</span> to{" "}
                <span className="font-medium text-foreground">{sentRecipient}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                {selectedDocuments.length} document{selectedDocuments.length !== 1 ? "s" : ""} included
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              {channel === "whatsapp" && (
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => {
                    onOpenChange(false);
                    setLocation("/whatsapp-monitor");
                  }}
                >
                  <MessageSquare className="h-4 w-4" />
                  View in WhatsApp Monitor
                </Button>
              )}
              <Button className="bg-[#FFCB00] hover:bg-[#FFCB00]/80 text-black" onClick={() => onOpenChange(false)}>Close</Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Send Onboarding Pack</DialogTitle>
              <DialogDescription>
                Send onboarding documents to {candidate.fullName}
              </DialogDescription>
            </DialogHeader>

            {/* Channel toggle */}
            <div className="flex gap-2 p-1 bg-muted rounded-lg">
              <button
                onClick={() => setChannel("email")}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  channel === "email"
                    ? "bg-blue-600 text-white"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
                }`}
              >
                <Mail className="h-4 w-4" />
                Email
              </button>
              <button
                onClick={() => setChannel("whatsapp")}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  channel === "whatsapp"
                    ? "bg-green-600 text-white"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
                }`}
              >
                <MessageSquare className="h-4 w-4" />
                WhatsApp
              </button>
            </div>

            <div className="grid gap-4 py-4">
              {/* Recipient info */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground">Recipient</label>
                {channel === "email" ? (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-blue-500" />
                    {hasEmail ? (
                      <span>{candidate.email}</span>
                    ) : (
                      <span className="text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> No email address on file
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm">
                    <MessageSquare className="h-4 w-4 text-green-500" />
                    {hasPhone ? (
                      <span>{phone}</span>
                    ) : (
                      <span className="text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> No phone number on file
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Documents list */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground">Documents ({selectedDocuments.length})</label>
                <div className="space-y-1 p-2 rounded-lg border border-border bg-muted/30 max-h-[140px] overflow-y-auto">
                  {selectedDocuments.map((docId) => (
                    <div key={docId} className="flex items-center gap-2 text-xs py-0.5">
                      <FileText className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span>{DOCUMENT_NAMES[docId] || docId}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* WhatsApp preview */}
              {channel === "whatsapp" && (
                <div className="space-y-1">
                  <label className="text-sm font-medium text-muted-foreground">Message Preview</label>
                  <div className="p-3 rounded-lg border border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30 text-xs text-muted-foreground space-y-1.5">
                    <p>Each document will be sent as a WhatsApp file attachment, followed by a welcome message with:</p>
                    <ul className="list-disc ml-4 space-y-0.5">
                      <li>Upload portal link for required documents</li>
                      <li>List of documents needed from the employee</li>
                      <li>Start date and next steps</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button
                onClick={handleSend}
                disabled={sending || (channel === "email" && !hasEmail) || (channel === "whatsapp" && !hasPhone)}
                className={`gap-2 ${channel === "whatsapp" ? "bg-green-600 hover:bg-green-500" : "bg-blue-600 hover:bg-blue-500"} text-white`}
              >
                {sending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Send via {channel === "whatsapp" ? "WhatsApp" : "Email"}
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
