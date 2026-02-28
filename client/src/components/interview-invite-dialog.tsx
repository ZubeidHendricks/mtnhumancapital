import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTenantQueryKey } from "@/hooks/useTenant";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Bot, Mail, MessageSquare, Send, Loader2, CheckCircle,
  ChevronDown, ChevronUp, ClipboardList
} from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import type { Job, Candidate } from "@shared/schema";

function generateInterviewPrompt(candidate: any, job: Job | null | undefined): string {
  const jobTitle = job?.title || candidate.role || 'the open position';
  const department = job?.department || '';
  const description = job?.description || '';
  const candidateSkills = Array.isArray(candidate.skills) ? candidate.skills.join(', ') : '';

  let prompt = `You are an HR interviewer for AHC (Avatar Human Capital) conducting a screening interview for the ${jobTitle} position${department ? ` in the ${department} department` : ''}.

INTERVIEW GUIDELINES:
- The interview should last approximately 12 minutes, with a maximum of 15 minutes.
- Ask ONE question at a time.
- When you are speaking, do not process candidate input. Only listen when you have finished speaking.
- Wait for the candidate to fully finish speaking before responding.
- Do not interrupt the candidate unless necessary to stay on schedule.
- If interruption is required, do so politely (for example: "I'm sorry to jump in — to stay on time…").
- Encourage concise responses of 60–90 seconds.
- Ask follow-up questions only when clarification is necessary, information is missing, or an answer is vague.
- Prioritize high-value questions first.
- If time is limited, skip lower-priority questions rather than rushing.
- Ask 4–6 questions total, including follow-ups.
- Maintain a friendly, professional, and conversational tone.
- Keep transitions smooth and natural — avoid sounding scripted.

TIME MANAGEMENT:
- Allocate approximately:
  - 2 minutes: Introduction + Question 1
  - 2–3 minutes: Question 2
  - 2–3 minutes: Question 3
  - 2 minutes: Question 4
  - Remaining time: Optional questions or follow-ups
- If more than 75% of the time has elapsed, move directly to the final priority question.
- If time is nearly finished, skip remaining questions and proceed to closing.

FOLLOW-UP QUESTION RULES:
- Ask a follow-up ONLY if:
  - The candidate gives a vague or generic answer
  - Important information is missing
  - You need a concrete example
  - A claim needs clarification
  - There is a potential concern or inconsistency
- Limit to one follow-up per main question unless critical.

RESPONSE LENGTH CONTROL:
- When asking questions, occasionally remind the candidate: "Please keep your answer to about a minute if possible."

INTERVIEW FLOW:
1. Introduce yourself briefly and warmly.
2. Explain the interview will take about 12 minutes.

QUESTIONS TO ASK:
1. "Tell me about yourself and your experience relevant to this role."
   - Ideal: Clear summary of relevant experience, specific achievements, and motivation for applying.

2. "What experience do you have with ${candidateSkills || 'the key skills required for this role'}?"
   - Ideal: Specific examples of projects or tasks using these skills, with measurable outcomes.

3. "Describe a challenging situation you faced at work and how you resolved it."
   - Ideal: Uses STAR method (Situation, Task, Action, Result), shows problem-solving and resilience.

4. "Why are you interested in this ${jobTitle} role?"
   - Ideal: Shows research about the company/role, genuine enthusiasm, and alignment with career goals.

5. "Where do you see yourself in the next 2-3 years?"
   - Ideal: Shows ambition while being realistic, aligns with the role's growth path.`;

  if (description) {
    prompt += `\n\nJOB CONTEXT:\n${description}`;
  }

  prompt += `\n\nEVALUATION CRITERIA:
- Communication skills
- Relevant experience
- Problem-solving ability
- Cultural fit
- Self-awareness

At the end of the interview, thank the candidate and let them know the team will be in touch.`;

  return prompt;
}

interface InterviewInviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidate: Candidate | null;
  job?: Job | null;
}

export function InterviewInviteDialog({ open, onOpenChange, candidate, job }: InterviewInviteDialogProps) {
  const queryClient = useQueryClient();
  const whatsappConversationsKey = useTenantQueryKey(['whatsapp', 'conversations']);
  const [, setLocation] = useLocation();

  const [inviteChannel, setInviteChannel] = useState<"email" | "whatsapp">("email");
  const [sendingInvite, setSendingInvite] = useState(false);
  const [interviewPrompt, setInterviewPrompt] = useState("");
  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);
  const [sentRecipient, setSentRecipient] = useState("");

  // Initialize state whenever the dialog opens with a candidate
  useEffect(() => {
    if (open && candidate) {
      setInterviewPrompt(generateInterviewPrompt(candidate, job));
      setShowPromptEditor(false);
      setInviteSent(false);
      setSentRecipient("");
      if (candidate.phone || (candidate.metadata as any)?.phone) {
        setInviteChannel("whatsapp");
      } else if (candidate.email) {
        setInviteChannel("email");
      }
    }
  }, [open, candidate, job]);

  const handleSendInvite = async () => {
    if (!candidate) return;

    const candidateName = candidate.fullName || 'Candidate';
    const jobTitle = job?.title || candidate.role || 'Open Position';

    if (inviteChannel === "email") {
      if (!candidate.email) {
        toast.error(`Cannot send invitation: No email address on file for ${candidateName}`);
        return;
      }

      setSendingInvite(true);
      try {
        const sessionRes = await api.post('/interview-sessions', {
          candidateId: candidate.id,
          candidateName,
          jobTitle,
          prompt: interviewPrompt,
        });
        const interviewUrl = `${window.location.origin}/interview/invite/${sessionRes.data.token}`;

        await api.post('/interview-sessions/send-email-invite', {
          to: candidate.email,
          candidateName,
          jobTitle,
          interviewUrl,
        });

        setSentRecipient(candidate.email);
        setInviteSent(true);
      } catch (error: any) {
        console.error('Email invite error:', error);
        toast.error(error.response?.data?.message || 'Failed to send email invitation.');
      } finally {
        setSendingInvite(false);
      }
    } else {
      const phone = candidate.phone || (candidate.metadata as any)?.phone;
      if (!phone) {
        toast.error(`Cannot send invitation: No phone number on file for ${candidateName}`);
        return;
      }

      setSendingInvite(true);
      try {
        const sessionRes = await api.post('/interview-sessions', {
          candidateId: candidate.id,
          candidateName,
          candidatePhone: phone,
          jobTitle,
          prompt: interviewPrompt,
        });
        const interviewUrl = `${window.location.origin}/interview/invite/${sessionRes.data.token}`;

        const convRes = await api.post(`/whatsapp/candidates/${candidate.id}/conversation`);
        const conversation = convRes.data;

        const message = `Dear ${candidateName},

We are impressed with your profile and would like to invite you to an initial voice interview with our AI interview system.

Please click the link below to start the session:
${interviewUrl}

This link expires in 7 days. Please ensure you have a quiet environment and allow microphone access.

Best regards,
AHC Recruiting Team`;

        await api.post(`/whatsapp/conversations/${conversation.id}/messages`, {
          body: message,
          senderType: 'human',
        });

        setSentRecipient(phone);
        setInviteSent(true);
        queryClient.invalidateQueries({ queryKey: whatsappConversationsKey });
      } catch (error: any) {
        console.error('WhatsApp invite error:', error);
        toast.error(error.response?.data?.message || 'Failed to send WhatsApp invitation.');
      } finally {
        setSendingInvite(false);
      }
    }
  };

  const hasPhone = !!(candidate?.phone || (candidate?.metadata as any)?.phone);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border sm:max-w-[500px]">
        {inviteSent ? (
          <>
            <DialogHeader className="sr-only">
              <DialogTitle>Invitation Sent</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center justify-center py-8 gap-4 text-center">
              <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="h-10 w-10 text-green-500" />
              </div>
              <h2 className="text-xl font-bold text-foreground">Invitation Sent!</h2>
              <p className="text-sm text-muted-foreground">
                Interview invitation sent via{" "}
                <span className="font-medium text-foreground">{inviteChannel === "whatsapp" ? "WhatsApp" : "Email"}</span> to{" "}
                <span className="font-medium text-foreground">{sentRecipient}</span>
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              {inviteChannel === "whatsapp" && (
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
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => {
                  onOpenChange(false);
                  setLocation("/interview-console");
                }}
              >
                <ClipboardList className="h-4 w-4" />
                View in Interview Console
              </Button>
              <Button onClick={() => onOpenChange(false)}>Close</Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Invite to Voice Interview</DialogTitle>
              <DialogDescription>
                Send an interview invitation to {candidate?.fullName || 'candidate'}.
              </DialogDescription>
            </DialogHeader>

            {/* Channel Selection */}
            <div className="flex gap-2 p-1 bg-muted rounded-lg">
              <button
                onClick={() => setInviteChannel("email")}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  inviteChannel === "email"
                    ? "bg-blue-600 text-white"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
                }`}
              >
                <Mail className="h-4 w-4" />
                Email
              </button>
              <button
                onClick={() => setInviteChannel("whatsapp")}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  inviteChannel === "whatsapp"
                    ? "bg-green-600 text-white"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
                }`}
              >
                <MessageSquare className="h-4 w-4" />
                WhatsApp
              </button>
            </div>

            <div className="grid gap-4 py-4">
              {inviteChannel === "email" ? (
                <>
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
                  <div className="grid gap-2">
                    <Label>Subject</Label>
                    <Input defaultValue={`Interview Invitation: ${job?.title || 'Position'}`} className="bg-muted border-border" />
                  </div>
                </>
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
                <Label>Message</Label>
                <Textarea
                  className="min-h-[150px] bg-muted border-border font-sans"
                  readOnly
                  value={`Dear ${candidate?.fullName || 'Candidate'},

We are impressed with your profile and would like to invite you to an initial voice interview with our AI interview system.

${inviteChannel === "email" ? "This allows us to get to know you better at your convenience. " : ""}Please click the link below to start the session:

[Interview link will be generated on send]

Best regards,
AHC Recruiting Team`}
                />
              </div>

              {/* Collapsible Interview Prompt Editor */}
              <div className="border border-border rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowPromptEditor(!showPromptEditor)}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Bot className="h-4 w-4" />
                    Interview Questions & Evaluation
                  </span>
                  {showPromptEditor ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {showPromptEditor && (
                  <div className="px-3 pb-3">
                    <p className="text-xs text-muted-foreground mb-2">
                      Edit the AI interviewer's questions, ideal answers, and evaluation criteria below.
                    </p>
                    <Textarea
                      className="min-h-[250px] bg-muted border-border font-mono text-xs"
                      value={interviewPrompt}
                      onChange={(e) => setInterviewPrompt(e.target.value)}
                    />
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button
                onClick={handleSendInvite}
                disabled={sendingInvite || (inviteChannel === "email" && !candidate?.email) || (inviteChannel === "whatsapp" && !hasPhone)}
                className={`gap-2 ${inviteChannel === "whatsapp" ? "bg-green-600 hover:bg-green-500" : "bg-blue-600 hover:bg-blue-500"} text-white`}
              >
                {sendingInvite ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : inviteChannel === "whatsapp" ? (
                  <MessageSquare className="h-4 w-4" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {sendingInvite ? "Sending..." : `Send via ${inviteChannel === "whatsapp" ? "WhatsApp" : "Email"}`}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
