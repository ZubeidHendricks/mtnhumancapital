import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Mail, MessageSquare, Send, Loader2, CheckCircle,
} from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import type { Job, Candidate } from "@shared/schema";

interface InterestCheckDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidate: Candidate | null;
  job?: Job | null;
  onSent?: () => void;
}

export function InterestCheckDialog({ open, onOpenChange, candidate, job, onSent }: InterestCheckDialogProps) {
  const [channel, setChannel] = useState<"email" | "whatsapp">("email");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sentRecipient, setSentRecipient] = useState("");

  useEffect(() => {
    if (open && candidate) {
      setSent(false);
      setSentRecipient("");
      if (candidate.phone || (candidate.metadata as any)?.phone) {
        setChannel("whatsapp");
      } else if (candidate.email) {
        setChannel("email");
      }
    }
  }, [open, candidate]);

  const handleSend = async () => {
    if (!candidate || !job) return;

    const candidateName = candidate.fullName || "Candidate";

    if (channel === "email" && !candidate.email) {
      toast.error(`No email address on file for ${candidateName}`);
      return;
    }

    const phone = candidate.phone || (candidate.metadata as any)?.phone;
    if (channel === "whatsapp" && !phone) {
      toast.error(`No phone number on file for ${candidateName}`);
      return;
    }

    setSending(true);
    try {
      await api.post("/interest-checks", {
        candidateId: candidate.id,
        jobId: job.id,
        channel,
      });

      setSentRecipient(channel === "email" ? candidate.email! : phone);
      setSent(true);
      onSent?.();
    } catch (error: any) {
      console.error("Interest check send error:", error);
      toast.error(error.response?.data?.message || "Failed to send interest check.");
    } finally {
      setSending(false);
    }
  };

  const hasPhone = !!(candidate?.phone || (candidate?.metadata as any)?.phone);
  const jobTitle = job?.title || candidate?.role || "Position";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border sm:max-w-[500px]">
        {sent ? (
          <>
            <DialogHeader className="sr-only">
              <DialogTitle>Interest Check Sent</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center justify-center py-8 gap-4 text-center">
              <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="h-10 w-10 text-green-500" />
              </div>
              <h2 className="text-xl font-bold text-foreground">Interest Check Sent!</h2>
              <p className="text-sm text-muted-foreground">
                Interest check sent via{" "}
                <span className="font-medium text-foreground">{channel === "whatsapp" ? "WhatsApp" : "Email"}</span> to{" "}
                <span className="font-medium text-foreground">{sentRecipient}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                The candidate will receive the job description and a link to express their interest.
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button onClick={() => onOpenChange(false)}>Close</Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Send Interest Check</DialogTitle>
              <DialogDescription>
                Send a job description and interest check to {candidate?.fullName || "candidate"} for the {jobTitle} position.
              </DialogDescription>
            </DialogHeader>

            {/* Channel Selection */}
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
              {channel === "email" ? (
                <div className="grid gap-2">
                  <Label>Recipient Email</Label>
                  <Input
                    value={candidate?.email || ""}
                    disabled
                    className="bg-muted border-border"
                    placeholder={!candidate?.email ? "No email on file" : undefined}
                  />
                  {!candidate?.email && (
                    <p className="text-xs text-yellow-600 dark:text-yellow-400">This candidate has no email address on file.</p>
                  )}
                </div>
              ) : (
                <div className="grid gap-2">
                  <Label>Phone Number</Label>
                  <Input
                    value={candidate?.phone || (candidate?.metadata as any)?.phone || ""}
                    disabled
                    className="bg-muted border-border"
                    placeholder={!hasPhone ? "No phone on file" : undefined}
                  />
                  {!hasPhone && (
                    <p className="text-xs text-yellow-600 dark:text-yellow-400">This candidate has no phone number on file.</p>
                  )}
                </div>
              )}

              <div className="grid gap-2">
                <Label>Message Preview</Label>
                <Textarea
                  className="min-h-[150px] bg-muted border-border font-sans"
                  readOnly
                  value={`Dear ${candidate?.fullName || "Candidate"},

We have an exciting career opportunity for the position of ${jobTitle} that may interest you.

Please click the link below to view the full job description and let us know if you're interested:

[Interest check link will be generated on send]

The job description document will be attached${channel === "whatsapp" ? " as a separate message" : " to this email"}.

This link expires in 7 days.

Best regards,
HR Team`}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button
                onClick={handleSend}
                disabled={sending || (channel === "email" && !candidate?.email) || (channel === "whatsapp" && !hasPhone)}
                className={`gap-2 ${channel === "whatsapp" ? "bg-green-600 hover:bg-green-500" : "bg-blue-600 hover:bg-blue-500"} text-white`}
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : channel === "whatsapp" ? (
                  <MessageSquare className="h-4 w-4" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {sending ? "Sending..." : `Send via ${channel === "whatsapp" ? "WhatsApp" : "Email"}`}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
