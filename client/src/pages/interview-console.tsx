import { useState, useMemo, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { interviewService } from "@/lib/api";
import { format } from "date-fns";
import InterviewTimeline from "@/pages/interview-timeline";
import { InterviewFlowStepper, type FlowStep } from "@/components/interview-flow-stepper";
import { InterviewInviteDialog } from "@/components/interview-invite-dialog";
import InterviewFaceToFace from "@/pages/interview-face-to-face";
import { PracticeVoicePanel } from "@/components/practice-voice-panel";
import { PracticeVideoPanel } from "@/components/practice-video-panel";
import { AnimatePresence } from "framer-motion";
import {
  Mic,
  Video,
  Clock,
  User,
  Briefcase,
  Play,
  FileText,
  BarChart3,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronRight,
  RefreshCw,
  Loader2,
  ThumbsUp,
  ThumbsDown,
  Clock3,
  Search,
  Mail,
  Phone,
  MapPin,
  ArrowRight,
  GitBranch,
  Users,
  Gift,
  Send,
  Square,
} from "lucide-react";

interface InterviewSession {
  id: string;
  candidateId: string | null;
  candidateName: string | null;
  candidatePhone: string | null;
  jobTitle: string | null;
  token: string | null;
  interviewType: string;
  status: string;
  prompt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  duration: number | null;
  overallScore: number | null;
  feedback: string | null;
  createdAt: string;
  // Video stage fields
  videoToken: string | null;
  voiceStatus: string | null;
  videoStatus: string | null;
  videoPrompt: string | null;
  videoStartedAt: string | null;
  videoCompletedAt: string | null;
  videoDuration: number | null;
  videoScore: number | null;
  videoSentAt: string | null;
  videoExpiresAt: string | null;
}

interface TranscriptSegment {
  id: string;
  segmentIndex: number;
  speakerRole: string;
  text: string;
  startTime: number | null;
  sentiment: string | null;
  emotionScores: Record<string, number> | null;
}

interface InterviewFeedback {
  id: string;
  sessionId: string;
  evaluatorType: string;
  decision: string | null;
  decisionConfidence: number | null;
  overallScore: number | null;
  technicalScore: number | null;
  communicationScore: number | null;
  cultureFitScore: number | null;
  problemSolvingScore: number | null;
  strengths: string[] | null;
  weaknesses: string[] | null;
  keyInsights: string[] | null;
  rationale: string | null;
  recommendations: string | null;
  flaggedConcerns: string[] | null;
  isFinalized: number;
  finalizedAt: string | null;
  finalizedBy: string | null;
  createdAt: string;
}

interface InterviewDetails {
  session: InterviewSession;
  recordings: any[];
  transcripts: TranscriptSegment[];
  feedback: InterviewFeedback[];
}

interface CandidateResult {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  stage: string;
  match: number;
  location: string | null;
  skills: string[] | null;
  jobId: string | null;
}

export default function InterviewConsole() {
  const [, navigate] = useLocation();
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [decisionNotes, setDecisionNotes] = useState("");
  const [showDecisionDialog, setShowDecisionDialog] = useState(false);
  const [pendingDecision, setPendingDecision] = useState<"accepted" | "rejected" | "pipeline" | null>(null);
  const [candidateSearch, setCandidateSearch] = useState("");
  const [sessionSearch, setSessionSearch] = useState("");
  const [positionFilter, setPositionFilter] = useState<string>("all");
  const [activeFlowStep, setActiveFlowStep] = useState<string | null>(null);
  const [activeFlowView, setActiveFlowView] = useState<"voice" | "video" | "f2f" | "offer" | null>(null);
  const [showPractice, setShowPractice] = useState<"voice" | "video" | null>(null);
  const [f2fMarkedComplete, setF2fMarkedComplete] = useState(false);
  const [offerDecided, setOfferDecided] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteType, setInviteType] = useState<"voice" | "video">("voice");
  const [playingRecordingId, setPlayingRecordingId] = useState<string | null>(null);
  const [currentStage, setCurrentStage] = useState<"voice" | "video">("voice");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: sessionsResponse, isLoading: loadingSessions, isFetching: fetchingSessions, refetch: refetchSessions } = useQuery<{ data: InterviewSession[]; total: number } | InterviewSession[]>({
    queryKey: ["/api/interviews"],
  });
  const sessions: InterviewSession[] = Array.isArray(sessionsResponse) ? sessionsResponse : (sessionsResponse?.data || []);

  const uniquePositions = useMemo(() => {
    const positions = sessions.map(s => s.jobTitle).filter(Boolean);
    return [...new Set(positions)].sort();
  }, [sessions]);

  const filteredSessions = useMemo(() => {
    let result = sessions;
    if (positionFilter !== "all") {
      result = result.filter(s => s.jobTitle === positionFilter);
    }
    if (sessionSearch.trim()) {
      const q = sessionSearch.toLowerCase();
      result = result.filter(s =>
        s.candidateName?.toLowerCase().includes(q) ||
        s.jobTitle?.toLowerCase().includes(q) ||
        s.candidatePhone?.includes(q) ||
        s.status?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [sessions, positionFilter, sessionSearch]);

  // Reset states when selected session changes
  useEffect(() => {
    setShowPractice(null);
    setF2fMarkedComplete(false);
    if (selectedSession) {
      // Auto-detect the most relevant stage to show based on session state
      const session = sessions.find(s => s.id === selectedSession);
      if (session) {
        const voiceDone = session.voiceStatus === "completed"
          || (session.voiceStatus === "pending" && (session.status === "completed" || session.status === "voice_completed"));
        const hasVideo = session.videoStatus != null;
        const videoDone = session.videoStatus === "completed";
        const f2fDone = (session as any).f2fStatus === "completed";

        const f2fScheduled = (session as any).f2fStatus === "scheduled";
        const offerInitiated = (session as any).offerStatus === "initiated";

        if (offerInitiated) {
          setActiveFlowView("offer");
          setActiveFlowStep("offer");
          setCurrentStage("video");
          setOfferDecided(true);
        } else if (f2fDone) {
          setActiveFlowView("offer");
          setActiveFlowStep("offer");
          setCurrentStage("video");
        } else if (f2fScheduled) {
          // F2F has been scheduled but not completed - show f2f view
          setActiveFlowView("f2f");
          setActiveFlowStep("f2f");
          setCurrentStage("video");
        } else if (videoDone) {
          // Video done but no f2f scheduled yet - stay on video to show assessment actions
          setActiveFlowView("video");
          setActiveFlowStep("video");
          setCurrentStage("video");
        } else if (hasVideo && voiceDone) {
          setActiveFlowView("video");
          setActiveFlowStep("video");
          setCurrentStage("video");
        } else {
          setActiveFlowView("voice");
          setActiveFlowStep("voice");
          setCurrentStage("voice");
        }
      }
    } else {
      setActiveFlowView(null);
      setActiveFlowStep(null);
      setCurrentStage("voice");
    }
  }, [selectedSession]);

  const { data: details, isLoading: loadingDetails, isFetching: fetchingDetails } = useQuery<InterviewDetails>({
    queryKey: ["/api/interviews", selectedSession, "stage", currentStage],
    queryFn: async () => {
      const res = await fetch(`/api/interviews/${selectedSession}?stage=${currentStage}`);
      if (!res.ok) throw new Error("Failed to fetch interview details");
      return res.json();
    },
    enabled: !!selectedSession,
  });

  const f2fIsComplete = f2fMarkedComplete || (details?.session as any)?.f2fStatus === "completed";
  const offerFromServer = (details?.session as any)?.offerStatus === "initiated";

  // Sync offerDecided from server when session details load
  useEffect(() => {
    if (offerFromServer) setOfferDecided(true);
  }, [offerFromServer]);

  const updateDecisionMutation = useMutation({
    mutationFn: async ({ feedbackId, decision, notes }: { feedbackId: string; decision: string; notes?: string }) => {
      const response = await fetch(`/api/interviews/${selectedSession}/decision`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedbackId, decision, notes }),
      });
      if (!response.ok) throw new Error("Failed to update decision");
      return response.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/interviews", selectedSession] });
      queryClient.invalidateQueries({ queryKey: ["/api/interviews"] });
      setShowDecisionDialog(false);
      setDecisionNotes("");
      toast({
        title: "Decision Updated",
        description: "The interview decision has been recorded successfully.",
      });

      // Navigate to offer tab after accepting
      if (variables.decision === "accepted") {
        setActiveFlowView("offer");
        setActiveFlowStep("offer");
      }

      // Auto-update pipeline based on decision
      const candidateId = details?.session?.candidateId;
      if (candidateId) {
        const stageMap: Record<string, string> = {
          accepted: "offer_pending",
          rejected: "rejected",
          pipeline: "shortlisted",
        };
        const targetStage = stageMap[variables.decision];
        if (targetStage) {
          pipelineTransitionMutation.mutate({
            candidateId,
            toStage: targetStage,
            reason: `Interview decision: ${variables.decision}${variables.notes ? ` - ${variables.notes}` : ""}`,
          });
        }
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update decision. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Candidates query for search tab (API returns { data, total, page, limit })
  const { data: candidatesRaw } = useQuery<{ data: CandidateResult[] }>({
    queryKey: ["/api/candidates"],
  });
  const candidatesResponse = candidatesRaw?.data ?? [];

  const filteredCandidates = useMemo(() => {
    if (!candidateSearch.trim()) return candidatesResponse;
    const q = candidateSearch.toLowerCase();
    return candidatesResponse.filter((c) =>
      c.fullName?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.phone?.includes(q) ||
      c.role?.toLowerCase().includes(q) ||
      c.skills?.some((s) => s.toLowerCase().includes(q))
    );
  }, [candidatesResponse, candidateSearch]);

  // Derive interview flow steps from the single session's stage fields
  const flowSteps = useMemo((): FlowStep[] | null => {
    if (!details?.session?.candidateId) return null;
    const session = details.session;

    // Backward compat: old sessions may have voiceStatus='pending' but status='completed'
    const voiceCompleted = session.voiceStatus === "completed"
      || (session.voiceStatus === "pending" && (session.status === "completed" || session.status === "voice_completed"));
    const hasVideoStage = session.videoStatus != null;
    const videoCompleted = session.videoStatus === "completed";

    // Check for f2f sessions from other sessions for this candidate
    const candidateSessions = sessions.filter(
      (s) => s.candidateId === session.candidateId && !s.candidateName?.startsWith("[Practice]")
    );
    const f2fSession = candidateSessions.find((s) => s.interviewType === "f2f" || s.interviewType === "face_to_face");
    const f2fCompleted = f2fSession?.status === "completed" || (session as any).f2fStatus === "completed" || f2fIsComplete;

    return [
      {
        id: "voice",
        label: "Voice",
        status: voiceCompleted ? "completed" : "active",
        sessionId: session.id,
        score: session.overallScore || null,
      },
      {
        id: "video",
        label: "Video",
        status: videoCompleted ? "completed" : hasVideoStage ? "active" : "locked",
        sessionId: session.id,
        score: session.videoScore || null,
      },
      {
        id: "f2f",
        label: "Face to Face",
        status: f2fCompleted ? "completed" : videoCompleted ? "active" : "locked",
        sessionId: f2fSession?.id || null,
        score: f2fSession?.overallScore || null,
      },
      {
        id: "offer",
        label: "Make Offer",
        status: offerDecided ? "completed" : f2fCompleted ? "active" : videoCompleted ? "active" : "locked",
        sessionId: null,
        score: null,
      },
    ];
  }, [details?.session, sessions, f2fIsComplete, offerDecided]);

  // Pipeline transition mutation
  const pipelineTransitionMutation = useMutation({
    mutationFn: async ({ candidateId, toStage, reason }: { candidateId: string; toStage: string; reason: string }) => {
      const response = await fetch(`/api/pipeline/candidates/${candidateId}/transition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toStage, reason }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || "Failed to transition candidate");
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/candidates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/interviews"] });
      toast({
        title: "Pipeline Updated",
        description: `Candidate moved to "${data.toStage?.replace(/_/g, " ")}" stage`,
      });
    },
    onError: (err: Error) => {
      toast({
        title: "Pipeline Update Failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-muted/10 text-foreground";
      case "started": return "bg-muted/10 text-foreground";
      case "pending": return "bg-muted/10 text-foreground";
      case "expired": return "bg-destructive/10 text-destructive";
      default: return "bg-secondary0/10 text-muted-foreground";
    }
  };

  const getDecisionColor = (decision: string | null) => {
    switch (decision) {
      case "accepted": return "bg-muted text-white";
      case "rejected": return "bg-destructive text-white";
      case "pipeline": return "bg-muted text-white";
      case "needs_review": return "bg-muted text-white";
      default: return "bg-secondary0/10 text-muted-foreground";
    }
  };

  const getDecisionIcon = (decision: string | null) => {
    switch (decision) {
      case "accepted": return <ThumbsUp className="h-4 w-4" />;
      case "rejected": return <ThumbsDown className="h-4 w-4" />;
      case "pipeline": return <Clock3 className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getSentimentColor = (sentiment: string | null) => {
    switch (sentiment) {
      case "positive": return "text-foreground";
      case "negative": return "text-destructive";
      default: return "text-muted-foreground";
    }
  };

  const handleDecision = (decision: "accepted" | "rejected" | "pipeline") => {
    setPendingDecision(decision);
    setShowDecisionDialog(true);
  };

  const confirmDecision = () => {
    if (!pendingDecision || !details?.feedback?.[0]) return;
    updateDecisionMutation.mutate({
      feedbackId: details.feedback[0].id,
      decision: pendingDecision,
      notes: decisionNotes || undefined,
    });
  };

  const latestFeedback = details?.feedback?.[0];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">AI Interview Console</h1>
          <p className="text-muted-foreground">Manage AI-powered candidate interviews</p>
        </div>
        <Button
          onClick={() => {
            refetchSessions();
            if (selectedSession) {
              queryClient.invalidateQueries({ queryKey: ["/api/interviews", selectedSession] });
            }
          }}
          variant="outline"
          disabled={fetchingSessions}
          data-testid="button-refresh-interviews"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${fetchingSessions ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 relative overflow-hidden">
          {fetchingSessions && !loadingSessions && (
            <div className="absolute inset-0 bg-background/50 z-20 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mic className="h-5 w-5" />
              Interview Sessions
            </CardTitle>
            <CardDescription>
              {filteredSessions.length}{positionFilter !== "all" ? ` of ${sessions.length}` : ""} sessions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, position, phone..."
                value={sessionSearch}
                onChange={(e) => setSessionSearch(e.target.value)}
                className="pl-10"
                data-testid="input-session-search"
              />
            </div>
            {uniquePositions.length > 1 && (
              <div className="mb-3">
                <Select value={positionFilter} onValueChange={setPositionFilter}>
                  <SelectTrigger className="w-full" data-testid="select-position-filter">
                    <SelectValue placeholder="Filter by position" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Positions</SelectItem>
                    {uniquePositions.map(pos => (
                      <SelectItem key={pos} value={pos!}>{pos}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <ScrollArea className="h-[360px]">
              {loadingSessions ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredSessions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Mic className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>{positionFilter !== "all" ? "No sessions for this position" : "No interview sessions yet"}</p>
                  <p className="text-sm mt-1">{positionFilter !== "all" ? "Try a different position filter" : "Sessions will appear here when scheduled"}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredSessions.map((session) => (
                    <div
                      key={session.id}
                      data-testid={`card-session-${session.id}`}
                      className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                        selectedSession === session.id 
                          ? "border-primary bg-primary/5" 
                          : "border-border hover:border-primary/50"
                      }`}
                      onClick={() => setSelectedSession(session.id)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Mic className="h-4 w-4 text-foreground" />
                          {session.videoStatus != null && (
                            <Video className="h-4 w-4 text-foreground" />
                          )}
                          <span className="font-medium text-sm">{session.candidateName || "Unknown"}</span>
                        </div>
                        <div className="flex gap-1">
                          {(() => {
                            // Derive effective voice status (backward compat: old sessions have voiceStatus='pending' but status='completed')
                            const effectiveVoiceStatus = (session.voiceStatus && session.voiceStatus !== 'pending')
                              ? session.voiceStatus
                              : (session.status === 'completed' || session.status === 'voice_completed' || session.status === 'started')
                                ? session.status === 'voice_completed' ? 'completed' : session.status
                                : session.voiceStatus || session.status;
                            return (
                              <Badge className={getStatusColor(effectiveVoiceStatus)} variant="outline">
                                <Mic className="h-3 w-3 mr-1" />
                                {effectiveVoiceStatus}
                              </Badge>
                            );
                          })()}
                          {session.videoStatus != null && (
                            <Badge className={getStatusColor(session.videoStatus)} variant="outline">
                              <Video className="h-3 w-3 mr-1" />
                              {session.videoStatus}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                        <Briefcase className="h-3 w-3" />
                        {session.jobTitle || "No position"}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {format(new Date(session.createdAt), "MMM d, yyyy HH:mm")}
                      </div>
                      {session.overallScore !== null && (
                        <div className="mt-2">
                          <Progress value={session.overallScore} className="h-1" />
                          <span className="text-xs text-muted-foreground">{session.overallScore}% score</span>
                        </div>
                      )}
                      <ChevronRight className="h-4 w-4 absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 relative overflow-hidden">
          {fetchingDetails && !loadingDetails && (
            <div className="absolute inset-0 bg-background/50 z-20 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
          {!selectedSession ? (
            <div className="h-[450px] flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <User className="h-16 w-16 mx-auto mb-4 opacity-30" />
                <p>Select an interview session to view details</p>
              </div>
            </div>
          ) : loadingDetails ? (
            <div className="h-[450px] flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : details ? (
            <>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      {details.session.candidateName || "Unknown Candidate"}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {details.session.jobTitle} • {details.session.interviewType} interview
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {latestFeedback?.decision && (
                      <Badge className={getDecisionColor(latestFeedback.decision)}>
                        {getDecisionIcon(latestFeedback.decision)}
                        <span className="ml-1 capitalize">{latestFeedback.decision}</span>
                      </Badge>
                    )}
                    <Badge className={getStatusColor(details.session.status)}>
                      {details.session.status}
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              {/* Interview Flow Stepper */}
              {flowSteps && (
                <div className="px-6 pb-2">
                  <InterviewFlowStepper
                    steps={flowSteps}
                    activeStepId={activeFlowView || activeFlowStep || undefined}
                    onStepClick={(step) => {
                      // If offer step is completed (yellow), clicking it navigates to HR dashboard Offer tab
                      if (step.id === "offer" && offerDecided) {
                        const cId = details?.session?.candidateId;
                        const jId = details?.session?.jobId;
                        const jTitle = details?.session?.jobTitle;
                        navigate(`/hr-dashboard?tab=offer${cId ? `&candidateId=${cId}` : ''}${jId ? `&jobId=${jId}` : jTitle ? `&jobTitle=${encodeURIComponent(jTitle)}` : ''}`);
                        return;
                      }
                      setActiveFlowStep(step.id);
                      setActiveFlowView(step.id as "voice" | "video" | "f2f" | "offer");
                      setShowPractice(null);
                      // Set currentStage for stage-filtered data (same session ID for both stages)
                      if (step.id === "voice" || step.id === "video") {
                        setCurrentStage(step.id as "voice" | "video");
                      }
                    }}
                    onStartInterview={(step) => {
                      // Navigate to the appropriate interview page
                      const candidateId = details?.session?.candidateId;
                      const candidateName = details?.session?.candidateName;
                      if (step.id === "voice") {
                        window.open(`/interview/voice?sessionId=${selectedSession}&candidateId=${candidateId}&candidate=${encodeURIComponent(candidateName || "")}`, "_blank");
                      } else if (step.id === "video") {
                        window.open(`/interview/video?sessionId=${selectedSession}&id=${candidateId}&candidate=${encodeURIComponent(candidateName || "")}`, "_blank");
                      }
                    }}
                    onPractice={(step) => {
                      if (step.id === "voice" || step.id === "video") {
                        setShowPractice(step.id);
                        setActiveFlowStep(step.id);
                      }
                    }}
                  />
                </div>
              )}

              {/* Practice Panels */}
              <AnimatePresence>
                {showPractice === "voice" && (
                  <div className="px-6 pb-4">
                    <PracticeVoicePanel onClose={() => setShowPractice(null)} />
                  </div>
                )}
                {showPractice === "video" && (
                  <div className="px-6 pb-4">
                    <PracticeVideoPanel
                      candidateName={details?.session?.candidateName || undefined}
                      onClose={() => setShowPractice(null)}
                    />
                  </div>
                )}
              </AnimatePresence>

              <CardContent>
                {/* View content based on activeFlowView */}
                {(activeFlowView === "voice" || activeFlowView === "video" || !activeFlowView) ? (
                  <Tabs defaultValue="analysis" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="analysis" data-testid="tab-analysis">
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Analysis
                      </TabsTrigger>
                      <TabsTrigger value="transcript" data-testid="tab-transcript">
                        <FileText className="h-4 w-4 mr-2" />
                        Transcript
                      </TabsTrigger>
                      <TabsTrigger value="recordings" data-testid="tab-recordings">
                        <Play className="h-4 w-4 mr-2" />
                        Recordings
                      </TabsTrigger>
                      <TabsTrigger value="decision" data-testid="tab-decision">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Assessment
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="analysis" className="mt-4">
                      {latestFeedback && (
                        <div className="space-y-6 mb-6">
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            <ScoreCard label="Overall" value={latestFeedback.overallScore} />
                            <ScoreCard label="Technical" value={latestFeedback.technicalScore} />
                            <ScoreCard label="Communication" value={latestFeedback.communicationScore} />
                            <ScoreCard label="Culture Fit" value={latestFeedback.cultureFitScore} />
                            <ScoreCard label="Problem Solving" value={latestFeedback.problemSolvingScore} />
                          </div>

                          <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <h4 className="font-semibold text-foreground flex items-center gap-2">
                                <ThumbsUp className="h-4 w-4" />
                                Strengths
                              </h4>
                              <ul className="list-disc list-inside text-sm space-y-1">
                                {latestFeedback.strengths?.map((s, i) => (
                                  <li key={i} className="text-muted-foreground">{s}</li>
                                )) || <li className="text-muted-foreground">No strengths identified</li>}
                              </ul>
                            </div>
                            <div className="space-y-2">
                              <h4 className="font-semibold text-destructive flex items-center gap-2">
                                <ThumbsDown className="h-4 w-4" />
                                Weaknesses
                              </h4>
                              <ul className="list-disc list-inside text-sm space-y-1">
                                {latestFeedback.weaknesses?.map((w, i) => (
                                  <li key={i} className="text-muted-foreground">{w}</li>
                                )) || <li className="text-muted-foreground">No weaknesses identified</li>}
                              </ul>
                            </div>
                          </div>

                          {latestFeedback.keyInsights && latestFeedback.keyInsights.length > 0 && (
                            <div className="space-y-2">
                              <h4 className="font-semibold flex items-center gap-2">
                                <AlertCircle className="h-4 w-4" />
                                Key Insights
                              </h4>
                              <ul className="list-disc list-inside text-sm space-y-1">
                                {latestFeedback.keyInsights.map((insight, i) => (
                                  <li key={i} className="text-muted-foreground">{insight}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {latestFeedback.rationale && (
                            <div className="space-y-2">
                              <h4 className="font-semibold">AI Rationale</h4>
                              <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                                {latestFeedback.rationale}
                              </p>
                            </div>
                          )}

                          {latestFeedback.flaggedConcerns && latestFeedback.flaggedConcerns.length > 0 && (
                            <div className="space-y-2 border-t pt-4">
                              <h4 className="font-semibold text-foreground flex items-center gap-2">
                                <AlertCircle className="h-4 w-4" />
                                Flagged Concerns
                              </h4>
                              <ul className="list-disc list-inside text-sm space-y-1">
                                {latestFeedback.flaggedConcerns.map((concern, i) => (
                                  <li key={i} className="text-foreground">{concern}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}

                    </TabsContent>

                    <TabsContent value="transcript" className="mt-4">
                      <ScrollArea className="h-[400px]">
                        {details.transcripts.length > 0 ? (
                          <div className="space-y-4">
                            {details.transcripts.map((segment) => (
                              <div
                                key={segment.id}
                                data-testid={`transcript-segment-${segment.segmentIndex}`}
                                className={`p-3 rounded-lg ${
                                  segment.speakerRole === "candidate"
                                    ? "bg-muted/20 ml-0 mr-8"
                                    : "bg-secondary/20 ml-8 mr-0"
                                }`}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs font-semibold uppercase">
                                    {segment.speakerRole}
                                  </span>
                                  {segment.sentiment && (
                                    <span className={`text-xs ${getSentimentColor(segment.sentiment)}`}>
                                      {segment.sentiment}
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm">{segment.text}</p>
                                {segment.startTime != null && (
                                  <span className="text-xs text-muted-foreground mt-1">
                                    {Math.floor(segment.startTime / 60)}:{String(segment.startTime % 60).padStart(2, "0")}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-12 text-muted-foreground">
                            <FileText className="h-12 w-12 mx-auto mb-4 opacity-30" />
                            <p>No transcript available</p>
                            <p className="text-sm mt-1">Transcript will appear after the interview</p>
                          </div>
                        )}
                      </ScrollArea>
                    </TabsContent>

                    <TabsContent value="recordings" className="mt-4">
                      {details.recordings.length > 0 ? (
                        <div className="space-y-4">
                          {details.recordings.map((recording) => (
                            <div
                              key={recording.id}
                              className="p-4 rounded-lg border flex items-center justify-between"
                            >
                              <div className="flex items-center gap-3">
                                {recording.recordingType === "video" ? (
                                  <Video className="h-8 w-8 text-foreground" />
                                ) : (
                                  <Mic className="h-8 w-8 text-foreground" />
                                )}
                                <div>
                                  <p className="font-medium capitalize">{recording.recordingType} Recording</p>
                                  <p className="text-sm text-muted-foreground">
                                    {recording.duration ? `${Math.floor(recording.duration / 60)}m ${recording.duration % 60}s` : "Duration unknown"}
                                  </p>
                                </div>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                data-testid={`button-play-recording-${recording.id}`}
                                onClick={() => {
                                  if (playingRecordingId === recording.id) {
                                    // Stop playback
                                    if (audioRef.current) {
                                      audioRef.current.pause();
                                      audioRef.current.currentTime = 0;
                                    }
                                    setPlayingRecordingId(null);
                                  } else {
                                    // Start playback
                                    if (audioRef.current) {
                                      audioRef.current.pause();
                                    }
                                    const audio = new Audio(recording.mediaUrl);
                                    audio.onended = () => setPlayingRecordingId(null);
                                    audio.play().catch(() => {
                                      toast({ title: "Playback Error", description: "Unable to play this recording", variant: "destructive" });
                                    });
                                    audioRef.current = audio;
                                    setPlayingRecordingId(recording.id);
                                  }
                                }}
                              >
                                {playingRecordingId === recording.id ? (
                                  <><Square className="h-4 w-4 mr-2" />Stop</>
                                ) : (
                                  <><Play className="h-4 w-4 mr-2" />Play</>
                                )}
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12 text-muted-foreground">
                          <Play className="h-12 w-12 mx-auto mb-4 opacity-30" />
                          <p>No recordings available</p>
                          <p className="text-sm mt-1">Recordings will appear after the interview is completed</p>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="decision" className="mt-4">
                      <div className="space-y-6">
                        {latestFeedback ? (
                          <>
                            {/* AI Analysis Summary Card */}
                            <div className="rounded-lg border p-4 space-y-4 bg-muted/30">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <Badge
                                    variant={
                                      latestFeedback.decision === "accepted" ? "default" :
                                      latestFeedback.decision === "rejected" ? "destructive" :
                                      "secondary"
                                    }
                                    className="capitalize"
                                  >
                                    {latestFeedback.decision || "Pending"}
                                  </Badge>
                                  {latestFeedback.decisionConfidence != null && (
                                    <span className="text-sm text-muted-foreground">
                                      {Math.round(latestFeedback.decisionConfidence)}% confidence
                                    </span>
                                  )}
                                </div>
                                {latestFeedback.overallScore != null && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium">Overall</span>
                                    <div className="w-24">
                                      <Progress value={latestFeedback.overallScore} />
                                    </div>
                                    <span className="text-sm font-bold">{latestFeedback.overallScore}%</span>
                                  </div>
                                )}
                              </div>
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                {latestFeedback.strengths && latestFeedback.strengths.length > 0 && (
                                  <div>
                                    <p className="font-semibold text-foreground mb-1 flex items-center gap-1">
                                      <ThumbsUp className="h-3 w-3" /> Strengths
                                    </p>
                                    <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
                                      {latestFeedback.strengths.slice(0, 3).map((s, i) => (
                                        <li key={i}>{s}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {latestFeedback.weaknesses && latestFeedback.weaknesses.length > 0 && (
                                  <div>
                                    <p className="font-semibold text-destructive mb-1 flex items-center gap-1">
                                      <ThumbsDown className="h-3 w-3" /> Weaknesses
                                    </p>
                                    <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
                                      {latestFeedback.weaknesses.slice(0, 3).map((w, i) => (
                                        <li key={i}>{w}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Context-sensitive decision buttons based on interview stage */}
                            {activeFlowView === "voice" ? (
                              <div className="grid grid-cols-2 gap-4">
                                <Button
                                  size="lg"
                                  variant="outline"
                                  className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                                  onClick={() => handleDecision("rejected")}
                                  disabled={latestFeedback.isFinalized === 1}
                                  data-testid="button-decision-reject"
                                >
                                  <ThumbsDown className="h-5 w-5 mr-2" />
                                  Reject
                                </Button>
                                <Button
                                  size="lg"
                                  className="bg-yellow-500 hover:bg-yellow-600 text-black"
                                  onClick={() => {
                                    setInviteType("video");
                                    setShowInviteDialog(true);
                                  }}
                                  disabled={latestFeedback.isFinalized === 1}
                                  data-testid="button-invite-video"
                                >
                                  <Video className="h-5 w-5 mr-2" />
                                  Invite to Video Interview
                                </Button>
                              </div>
                            ) : activeFlowView === "video" ? (
                              <div className="grid grid-cols-3 gap-4">
                                <Button
                                  size="lg"
                                  variant="outline"
                                  className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                                  onClick={() => handleDecision("rejected")}
                                  disabled={latestFeedback.isFinalized === 1}
                                  data-testid="button-decision-reject"
                                >
                                  <ThumbsDown className="h-5 w-5 mr-2" />
                                  Reject
                                </Button>
                                <Button
                                  size="lg"
                                  variant="outline"
                                  onClick={() => {
                                    setActiveFlowView("f2f");
                                    setActiveFlowStep("f2f");
                                    toast({
                                      title: "Face-to-Face Interview",
                                      description: "Schedule the in-person interview below.",
                                    });
                                  }}
                                  disabled={latestFeedback.isFinalized === 1}
                                  data-testid="button-invite-f2f"
                                >
                                  <Users className="h-5 w-5 mr-2" />
                                  Invite to Face-to-Face
                                </Button>
                                <Button
                                  size="lg"
                                  onClick={async () => {
                                    setOfferDecided(true);
                                    setActiveFlowView("offer");
                                    setActiveFlowStep("offer");
                                    // Persist to server
                                    try {
                                      await fetch(`/api/interviews/${selectedSession}/initiate-offer`, { method: "POST" });
                                      queryClient.invalidateQueries({ queryKey: ["/api/interviews"] });
                                    } catch { /* state already set optimistically */ }
                                    toast({
                                      title: "Offer Decision Made",
                                      description: "Click the Make Offer icon to go to Offer Management.",
                                    });
                                  }}
                                  disabled={latestFeedback.isFinalized === 1}
                                  data-testid="button-decision-accept"
                                  className="bg-yellow-500 hover:bg-yellow-600 text-black"
                                >
                                  <Gift className="h-5 w-5 mr-2" />
                                  Make Offer
                                </Button>
                              </div>
                            ) : (
                              /* Default/fallback buttons */
                              <div className="grid grid-cols-3 gap-4">
                                <Button
                                  size="lg"
                                  variant={latestFeedback.decision === "accepted" ? "default" : "outline"}
                                  className={latestFeedback.decision === "accepted" ? "bg-muted hover:bg-muted" : ""}
                                  onClick={() => handleDecision("accepted")}
                                  disabled={latestFeedback.isFinalized === 1}
                                  data-testid="button-decision-accept"
                                >
                                  <ThumbsUp className="h-5 w-5 mr-2" />
                                  Accept
                                </Button>
                                <Button
                                  size="lg"
                                  variant={latestFeedback.decision === "pipeline" ? "default" : "outline"}
                                  className={latestFeedback.decision === "pipeline" ? "bg-muted hover:bg-muted" : ""}
                                  onClick={() => handleDecision("pipeline")}
                                  disabled={latestFeedback.isFinalized === 1}
                                  data-testid="button-decision-pipeline"
                                >
                                  <Clock3 className="h-5 w-5 mr-2" />
                                  Pipeline
                                </Button>
                                <Button
                                  size="lg"
                                  variant={latestFeedback.decision === "rejected" ? "destructive" : "outline"}
                                  onClick={() => handleDecision("rejected")}
                                  disabled={latestFeedback.isFinalized === 1}
                                  data-testid="button-decision-reject"
                                >
                                  <ThumbsDown className="h-5 w-5 mr-2" />
                                  Reject
                                </Button>
                              </div>
                            )}

                            {/* Pipeline stage indicator */}
                            {details.session.candidateId && (
                              <PipelineStageIndicator
                                candidateId={details.session.candidateId}
                                decision={latestFeedback.decision}
                                isTransitioning={pipelineTransitionMutation.isPending}
                              />
                            )}

                            {latestFeedback.isFinalized === 1 && (
                              <div className="text-center text-muted-foreground bg-muted p-4 rounded-lg">
                                <CheckCircle className="h-6 w-6 mx-auto mb-2 text-foreground" />
                                <p>Decision finalized on {latestFeedback.finalizedAt ? format(new Date(latestFeedback.finalizedAt), "MMM d, yyyy HH:mm") : "unknown"}</p>
                              </div>
                            )}

                            {latestFeedback.recommendations && (
                              <div className="space-y-2">
                                <h4 className="font-semibold">AI Recommendations</h4>
                                <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                                  {latestFeedback.recommendations}
                                </p>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="text-center py-12 text-muted-foreground">
                            <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-30" />
                            <p>No feedback available for decision</p>
                            <p className="text-sm mt-1">Complete the interview first to make a decision</p>
                          </div>
                        )}
                      </div>
                    </TabsContent>

                  </Tabs>
                ) : activeFlowView === "f2f" ? (
                  /* Face-to-Face View */
                  <div className="space-y-6">
                    <InterviewFaceToFace
                      embedded
                      candidateId={details.session.candidateId || undefined}
                      candidateName={details.session.candidateName || undefined}
                      sessionId={selectedSession || undefined}
                      jobTitle={details.session.jobTitle || undefined}
                      f2fStatus={(details.session as any).f2fStatus || null}
                      f2fScheduledDate={(details.session as any).f2fScheduledDate || null}
                      f2fScheduledTime={(details.session as any).f2fScheduledTime || null}
                      f2fLocation={(details.session as any).f2fLocation || null}
                      f2fInterviewer={(details.session as any).f2fInterviewer || null}
                      onScheduled={() => {
                        queryClient.invalidateQueries({ queryKey: ["/api/interviews"] });
                        queryClient.invalidateQueries({ queryKey: ["/api/interviews", selectedSession] });
                      }}
                      onMarkComplete={async () => {
                        try {
                          await fetch(`/api/interviews/${selectedSession}/complete-f2f`, { method: "POST" });
                          setF2fMarkedComplete(true);
                          queryClient.invalidateQueries({ queryKey: ["/api/interviews"] });
                          queryClient.invalidateQueries({ queryKey: ["/api/interviews", selectedSession] });
                          toast({
                            title: "Face-to-Face Complete",
                            description: "Interview marked as completed. Make a decision below.",
                          });
                        } catch {
                          toast({
                            title: "Error",
                            description: "Failed to mark face-to-face as complete.",
                            variant: "destructive",
                          });
                        }
                      }}
                    />

                    {f2fIsComplete && (
                      <div className="border-t pt-6 space-y-4">
                        <h4 className="font-semibold flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-primary" />
                          Face-to-Face Interview Decision
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                          <Button
                            size="lg"
                            variant="outline"
                            className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                            onClick={() => handleDecision("rejected")}
                            data-testid="button-f2f-reject"
                          >
                            <ThumbsDown className="h-5 w-5 mr-2" />
                            Reject
                          </Button>
                          <Button
                            size="lg"
                            onClick={async () => {
                              setOfferDecided(true);
                              setActiveFlowView("offer");
                              setActiveFlowStep("offer");
                              // Persist to server
                              try {
                                await fetch(`/api/interviews/${selectedSession}/initiate-offer`, { method: "POST" });
                                queryClient.invalidateQueries({ queryKey: ["/api/interviews"] });
                              } catch { /* state already set optimistically */ }
                              toast({
                                title: "Offer Decision Made",
                                description: "Click the Make Offer icon to go to Offer Management.",
                              });
                            }}
                            data-testid="button-f2f-offer"
                            className="bg-yellow-500 hover:bg-yellow-600 text-black"
                          >
                            <Gift className="h-5 w-5 mr-2" />
                            Make Offer
                          </Button>
                        </div>

                        {/* Pipeline stage indicator */}
                        {details.session.candidateId && (
                          <PipelineStageIndicator
                            candidateId={details.session.candidateId}
                            decision={latestFeedback?.decision || null}
                            isTransitioning={pipelineTransitionMutation.isPending}
                          />
                        )}
                      </div>
                    )}
                  </div>
                ) : activeFlowView === "offer" ? (
                  /* Offer View */
                  <div className="space-y-6">
                    <div className="text-center py-8">
                      <Gift className="h-16 w-16 mx-auto mb-4 text-primary opacity-60" />
                      <h3 className="text-xl font-semibold mb-2">Make Offer</h3>
                      <p className="text-muted-foreground mb-6">
                        {details.session.candidateName} is ready for an offer for the {details.session.jobTitle} position.
                      </p>

                      {details.session.candidateId && (
                        <PipelineStageIndicator
                          candidateId={details.session.candidateId}
                          decision={latestFeedback?.decision || null}
                          isTransitioning={pipelineTransitionMutation.isPending}
                        />
                      )}

                      <div className="mt-6">
                        <Button
                          size="lg"
                          onClick={() => {
                            toast({
                              title: "Proceeding to Offer",
                              description: "Navigating to Offer Management...",
                            });
                            const cId = details?.session?.candidateId;
                            const jId = details?.session?.jobId;
                            const jTitle = details?.session?.jobTitle;
                            navigate(`/hr-dashboard?tab=offer${cId ? `&candidateId=${cId}` : ''}${jId ? `&jobId=${jId}` : jTitle ? `&jobTitle=${encodeURIComponent(jTitle)}` : ''}`);
                          }}
                          data-testid="button-offer-accept"
                          className="bg-yellow-500 hover:bg-yellow-600 text-black"
                        >
                          <Gift className="h-5 w-5 mr-2" />
                          Proceed to Offer Management
                        </Button>
                        <p className="text-xs text-muted-foreground mt-2">
                          Candidate has completed the interviewing stage and available in the Offer Management dropdown
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </>
          ) : null}
        </Card>
      </div>

      {selectedSession && (
        <div className="border rounded-lg overflow-hidden mt-6">
          <InterviewTimeline sessionId={selectedSession} embedded stage={currentStage} />
        </div>
      )}

      <Dialog open={showDecisionDialog} onOpenChange={setShowDecisionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {pendingDecision === "accepted" && <ThumbsUp className="h-5 w-5 text-foreground" />}
              {pendingDecision === "rejected" && <ThumbsDown className="h-5 w-5 text-destructive" />}
              {pendingDecision === "pipeline" && <Clock3 className="h-5 w-5 text-foreground" />}
              Confirm Decision: {pendingDecision?.charAt(0).toUpperCase()}{pendingDecision?.slice(1)}
            </DialogTitle>
            <DialogDescription>
              This will update the candidate's interview status. You can add optional notes below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Add notes about your decision (optional)..."
              value={decisionNotes}
              onChange={(e) => setDecisionNotes(e.target.value)}
              className="min-h-[100px]"
              data-testid="input-decision-notes"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDecisionDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={confirmDecision}
              disabled={updateDecisionMutation.isPending}
              data-testid="button-confirm-decision"
              className={
                pendingDecision === "accepted" ? "bg-yellow-500 hover:bg-yellow-600 text-black" :
                pendingDecision === "rejected" ? "bg-destructive hover:bg-destructive" :
                "bg-muted hover:bg-muted"
              }
            >
              {updateDecisionMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Confirm {pendingDecision?.charAt(0).toUpperCase()}{pendingDecision?.slice(1)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Interview Invite Dialog */}
      <InterviewInviteDialog
        open={showInviteDialog}
        onOpenChange={setShowInviteDialog}
        interviewType={inviteType}
        existingSessionId={inviteType === "video" && selectedSession ? selectedSession : undefined}
        candidate={
          details?.session?.candidateId
            ? {
                id: parseInt(details.session.candidateId),
                fullName: details.session.candidateName || "Unknown",
                email: candidatesResponse.find(c => c.id === details.session.candidateId)?.email || null,
                phone: candidatesResponse.find(c => c.id === details.session.candidateId)?.phone || null,
                role: details.session.jobTitle,
                stage: "interviewing",
                match: 0,
                skills: [],
                metadata: {},
              } as any
            : null
        }
        job={details?.session?.jobTitle ? { title: details.session.jobTitle } as any : null}
        onInviteSent={() => {
          refetchSessions();
          queryClient.invalidateQueries({ queryKey: ["/api/interviews", selectedSession, "stage", currentStage] });
          toast({
            title: "Interview Invitation Sent",
            description: `${inviteType === "video" ? "Video" : "Voice"} interview invitation sent successfully.`,
          });
        }}
      />
    </div>
  );
}

function ScoreCard({ label, value }: { label: string; value: number | null }) {
  const getScoreColor = (score: number | null) => {
    if (score === null) return "text-muted-foreground";
    if (score >= 80) return "text-foreground";
    if (score >= 60) return "text-foreground";
    return "text-destructive";
  };

  return (
    <div className="text-center p-3 rounded-lg bg-muted">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`text-2xl font-bold ${getScoreColor(value)}`}>
        {value !== null ? `${value}%` : "N/A"}
      </p>
    </div>
  );
}

const PIPELINE_STAGES = [
  "sourcing", "screening", "shortlisted", "interviewing",
  "offer_pending", "offer_declined", "integrity_checks",
  "integrity_passed", "onboarding", "hired", "rejected",
];

function PipelineStageIndicator({ candidateId, decision, isTransitioning }: {
  candidateId: string;
  decision: string | null;
  isTransitioning: boolean;
}) {
  const { data: pipelineStatus } = useQuery<{
    candidate: { stage: string; fullName: string };
    currentStage: string;
    progressPercentage: number;
  }>({
    queryKey: ["/api/pipeline/candidates", candidateId, "status"],
    queryFn: async () => {
      const res = await fetch(`/api/pipeline/candidates/${candidateId}/status`);
      if (!res.ok) throw new Error("Failed to fetch pipeline status");
      return res.json();
    },
    enabled: !!candidateId,
  });

  if (!pipelineStatus) return null;

  const currentStage = pipelineStatus.currentStage || pipelineStatus.candidate?.stage || "screening";
  const currentIdx = PIPELINE_STAGES.indexOf(currentStage);

  // Map decision to expected next stage
  const decisionStageMap: Record<string, string> = {
    accepted: "offer_pending",
    rejected: "rejected",
    pipeline: "shortlisted",
  };
  const nextStage = decision ? decisionStageMap[decision] : null;

  return (
    <div className="bg-muted/50 rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2">
        <GitBranch className="h-4 w-4 text-muted-foreground" />
        <h4 className="text-sm font-semibold">Pipeline Progress</h4>
        {isTransitioning && <Loader2 className="h-3 w-3 animate-spin" />}
      </div>
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {PIPELINE_STAGES.slice(0, 6).map((stage, i) => {
          const isActive = stage === currentStage;
          const isPast = i < currentIdx && currentIdx >= 0;
          const isNext = stage === nextStage && stage !== currentStage;
          return (
            <div key={stage} className="flex items-center">
              {i > 0 && <div className={`w-4 h-0.5 ${isPast ? "bg-primary" : "bg-border"}`} />}
              <div
                className={`px-2 py-1 rounded text-xs whitespace-nowrap ${
                  isActive
                    ? "bg-primary text-primary-foreground font-medium"
                    : isPast
                    ? "bg-primary/20 text-primary"
                    : isNext
                    ? "bg-amber-500/20 text-amber-600 border border-amber-500/40 border-dashed"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {stage.replace(/_/g, " ")}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Current: <span className="font-medium capitalize text-foreground">{currentStage.replace(/_/g, " ")}</span></span>
        {nextStage && nextStage !== currentStage && (
          <span className="flex items-center gap-1">
            <ArrowRight className="h-3 w-3" />
            Moving to: <span className="font-medium capitalize text-amber-600">{nextStage.replace(/_/g, " ")}</span>
          </span>
        )}
      </div>
    </div>
  );
}
