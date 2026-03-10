import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { interviewService, recordingService } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Video,
  PhoneOff,
  Loader2,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  FileText,
  BarChart3,
  Play,
  User,
  Briefcase,
  Clock,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  CheckCircle,
  Square,
  Mic,
} from "lucide-react";
import { Link, useSearch } from "wouter";
import { toast } from "sonner";

type Transcript = {
  role: "user" | "ai";
  text: string;
  timestamp?: number;
};

const COMMON_ROLES = [
  "Software Developer",
  "Sales Executive",
  "Project Manager",
  "Product Manager",
  "Data Analyst",
  "Marketing Manager",
  "HR Manager",
  "Business Analyst",
  "UX Designer",
  "Customer Success Manager",
  "Custom Role"
];

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

export default function InterviewVideo() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const candidateName = params.get("candidate") || "Candidate";
  const candidateId = params.get("id");
  const jobParam = params.get("job");
  const queryClient = useQueryClient();

  const [sessionUrl, setSessionUrl] = useState<string | null>(null);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>(jobParam || COMMON_ROLES[0]);
  const [customRole, setCustomRole] = useState<string>("");
  const [tavusConversationId, setTavusConversationId] = useState<string | null>(null);
  const [tavusSessionId, setTavusSessionId] = useState<string | null>(null);
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [postStatus, setPostStatus] = useState<"idle" | "scoring" | "scored" | "saving_recording" | "done" | "error">("idle");
  const [duration, setDuration] = useState(0);
  const [playingRecordingId, setPlayingRecordingId] = useState<string | null>(null);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const startTimeRef = useRef<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Fetch interview details from the console API once interview ends (auto-poll every 10s until data arrives)
  const isPostInterview = postStatus !== "idle" && !isSessionActive;
  const { data: interviewDetails } = useQuery<{
    session: any;
    recordings: any[];
    transcripts: any[];
    feedback: any[];
  }>({
    queryKey: ["/api/interviews", tavusSessionId, "stage", "video"],
    queryFn: async () => {
      const res = await fetch(`/api/interviews/${tavusSessionId}?stage=video`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: isPostInterview && !!tavusSessionId,
    refetchInterval: isPostInterview ? 10000 : false,
  });

  const latestFeedback = interviewDetails?.feedback?.[0];
  const consoleTranscripts = interviewDetails?.transcripts || [];
  const consoleRecordings = interviewDetails?.recordings || [];

  // Re-analyze scoring when original analysis failed
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const reanalyzeMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/interviews/${tavusSessionId}/reanalyze-score`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: "video" }),
      });
      if (!response.ok) throw new Error("Failed to re-analyze");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/interviews", tavusSessionId] });
      setIsReanalyzing(false);
    },
    onError: () => { setIsReanalyzing(false); },
  });

  useEffect(() => {
    if (
      latestFeedback?.rationale === "Automated analysis was not available. Please review manually." &&
      !isReanalyzing &&
      !reanalyzeMutation.isPending &&
      tavusSessionId
    ) {
      setIsReanalyzing(true);
      reanalyzeMutation.mutate();
    }
  }, [latestFeedback?.rationale, tavusSessionId]);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcripts]);

  // Duration timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isSessionActive && startTimeRef.current) {
      interval = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isSessionActive]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const createSessionMutation = useMutation({
    mutationFn: () => {
      const roleToUse = selectedRole === "Custom Role" ? customRole : selectedRole;
      if (!roleToUse || roleToUse.trim() === "") {
        throw new Error("Please specify a job role");
      }
      return interviewService.createVideoSession(candidateId || undefined, candidateName, roleToUse);
    },
    onSuccess: async (data) => {
      console.log("[Video] Session created:", { sessionUrl: data.sessionUrl, sessionId: data.sessionId, interviewId: data.interviewId });
      setSessionUrl(data.sessionUrl);
      setTavusConversationId(data.sessionId);
      setTavusSessionId(data.interviewId || null);
      setTranscripts([]);
      setPostStatus("idle");
      startTimeRef.current = Date.now();
      setIsSessionActive(true);
      toast.success("Video session created successfully");
    },
    onError: (error: any) => {
      console.error("Failed to create session:", error);
      toast.error(error.message || "Failed to create video session. Please try again.");
    }
  });

  const handleStartSession = () => {
    if (selectedRole === "Custom Role" && (!customRole || customRole.trim() === "")) {
      toast.error("Please enter a custom job role");
      return;
    }
    createSessionMutation.mutate();
  };

  // Helper to fetch and parse Tavus transcript
  const fetchTavusTranscript = async (conversationId: string): Promise<Transcript[]> => {
    const tavusData = await interviewService.getTavusTranscript(conversationId);
    const fetched: Transcript[] = [];
    if (tavusData?.transcript && Array.isArray(tavusData.transcript)) {
      tavusData.transcript.forEach((entry: any, index: number) => {
        if (entry.role === "system") return;
        const text = entry.content || entry.text || entry.message || "";
        if (!text.trim()) return;
        const role = entry.role === "user" || entry.role === "candidate" ? "user" as const : "ai" as const;
        fetched.push({ role, text: text.trim(), timestamp: index });
      });
    }
    console.log("[Video] Tavus response status:", tavusData?.status, "Transcript entries:", tavusData?.transcript?.length, "Filtered:", fetched.length);
    return fetched;
  };

  const handleEndSession = async () => {
    console.log("[Video] Ending session:", { tavusConversationId, tavusSessionId });
    setIsSessionActive(false);
    setSessionUrl(null);
    setPostStatus("scoring");

    const durationSec = startTimeRef.current ? Math.floor((Date.now() - startTimeRef.current) / 1000) : 0;

    // End the Tavus conversation explicitly, then fetch transcript
    if (tavusConversationId) {
      try {
        // End the conversation via Tavus API so transcript becomes available
        try {
          await interviewService.endTavusConversation(tavusConversationId);
          console.log("[Video] Tavus conversation ended successfully");
        } catch (err) {
          console.warn("[Video] Failed to end Tavus conversation (may have already ended):", err);
        }

        // Wait for Tavus to process the transcript after ending
        await new Promise(resolve => setTimeout(resolve, 8000));
        let fetchedTranscripts = await fetchTavusTranscript(tavusConversationId);

        // Retry up to 4 more times with delays if no transcript yet
        const retryDelays = [10000, 15000, 20000, 25000];
        for (const delay of retryDelays) {
          if (fetchedTranscripts.length > 0) break;
          console.log(`[Video] No transcript yet, retrying in ${delay / 1000}s...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          fetchedTranscripts = await fetchTavusTranscript(tavusConversationId);
        }

        if (fetchedTranscripts.length > 0) {
          setTranscripts(fetchedTranscripts);

          if (tavusSessionId) {
            const mappedTranscripts = fetchedTranscripts.map((t) => ({
              role: t.role === "user" ? "candidate" : "ai",
              text: t.text,
              timestamp: t.timestamp,
            }));
            await interviewService.completeInterview(tavusSessionId, {
              transcripts: mappedTranscripts,
              duration: durationSec,
              stage: 'video',
            });
          }
          setPostStatus("scored");
          toast.success("Interview scored successfully!");
        } else {
          setPostStatus("scored");
          toast.info("Interview ended. Transcript may still be processing.");
        }
      } catch (err) {
        console.error("Failed to fetch/score interview:", err);
        setPostStatus("error");
        toast.error("Failed to retrieve interview transcript.");
      }
    } else {
      setPostStatus("done");
      toast.info("Interview ended.");
    }

    // Fetch Tavus recording in background
    if (tavusConversationId && tavusSessionId) {
      setPostStatus(prev => prev === "scored" ? "saving_recording" : prev);
      try {
        const result = await recordingService.fetchTavusRecording(
          tavusSessionId,
          tavusConversationId,
          candidateId || undefined
        );
        if (result?.message?.includes("Background polling")) {
          toast.info("Recording is being processed. It will appear in the Interview Console.");
        } else {
          toast.success("Video recording saved successfully");
        }
        setPostStatus("done");
      } catch (err: any) {
        console.error("Failed to fetch Tavus recording:", err);
        toast.info("Video recording will be processed in the background.");
        setPostStatus(prev => prev === "saving_recording" ? "done" : prev);
      }
    }
  };

  const roleDisplay = selectedRole === "Custom Role" ? customRole : selectedRole;

  // Use console transcripts if local ones are empty but server has them
  const displayTranscripts = consoleTranscripts.length > 0 ? consoleTranscripts : transcripts;
  const hasTranscripts = displayTranscripts.length > 0;

  const getSentimentColor = (sentiment: string | null) => {
    switch (sentiment) {
      case "positive": return "text-foreground";
      case "negative": return "text-destructive";
      default: return "text-muted-foreground";
    }
  };

  // Post-interview view (after session ends)
  if (postStatus !== "idle" && !isSessionActive) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Video Interview Complete</h1>
            <p className="text-muted-foreground">
              {candidateName} - {roleDisplay}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                if (tavusSessionId) {
                  queryClient.invalidateQueries({ queryKey: ["/api/interviews", tavusSessionId, "stage", "video"] });
                }
              }}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Link href="/hr-dashboard">
              <Button variant="outline">Return to Dashboard</Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Status & Details Card */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="h-5 w-5" />
                Interview Status
              </CardTitle>
              <CardDescription>
                {postStatus === "scoring" ? "Processing..." : "Completed"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Progress steps */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    {hasTranscripts ? (
                      <CheckCircle2 className="h-5 w-5 text-green-400 shrink-0" />
                    ) : postStatus === "scoring" ? (
                      <Loader2 className="h-5 w-5 text-blue-400 animate-spin shrink-0" />
                    ) : (
                      <Loader2 className="h-5 w-5 text-blue-400 animate-spin shrink-0" />
                    )}
                    <span className="text-sm">
                      {hasTranscripts ? `Transcript captured (${displayTranscripts.length} segments)` : "Fetching transcript..."}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    {latestFeedback ? (
                      <CheckCircle2 className="h-5 w-5 text-green-400 shrink-0" />
                    ) : postStatus === "error" ? (
                      <AlertCircle className="h-5 w-5 text-yellow-400 shrink-0" />
                    ) : (
                      <Loader2 className="h-5 w-5 text-blue-400 animate-spin shrink-0" />
                    )}
                    <span className="text-sm">
                      {latestFeedback ? `Scored: ${latestFeedback.overallScore}%` : postStatus === "error" ? "Scoring failed" : "AI scoring in progress..."}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    {consoleRecordings.length > 0 ? (
                      <CheckCircle2 className="h-5 w-5 text-green-400 shrink-0" />
                    ) : postStatus === "done" ? (
                      <Loader2 className="h-5 w-5 text-blue-400 animate-spin shrink-0" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30 shrink-0" />
                    )}
                    <span className={`text-sm ${consoleRecordings.length === 0 && postStatus !== "done" ? "text-muted-foreground" : ""}`}>
                      {consoleRecordings.length > 0 ? "Recording available" : "Recording processing..."}
                    </span>
                  </div>
                </div>

                {/* Interview info */}
                <div className="space-y-2 text-sm border-t pt-4">
                  <div className="flex justify-between p-2 rounded bg-muted">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5" /> Candidate
                    </span>
                    <span className="font-medium">{candidateName}</span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-muted">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Briefcase className="h-3.5 w-3.5" /> Position
                    </span>
                    <span className="font-medium">{roleDisplay}</span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-muted">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" /> Duration
                    </span>
                    <span className="font-medium">{duration > 0 ? formatDuration(duration) : "N/A"}</span>
                  </div>
                </div>

                <div className="flex justify-center pt-2">
                  <Link href="/hr-dashboard">
                    <Button variant="outline" size="sm">Return to Dashboard</Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Right: Full Console-style Details Card */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    {candidateName}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {roleDisplay} - Video Interview
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {latestFeedback?.decision && (
                    <Badge className="capitalize" variant={latestFeedback.decision === "rejected" ? "destructive" : "default"}>
                      {latestFeedback.decision}
                    </Badge>
                  )}
                  <Badge className="bg-muted/10 text-foreground" variant="outline">
                    {latestFeedback ? "completed" : postStatus === "scoring" ? "processing" : "pending"}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="analysis" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="analysis">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Analysis
                  </TabsTrigger>
                  <TabsTrigger value="transcript">
                    <FileText className="h-4 w-4 mr-2" />
                    Transcript
                  </TabsTrigger>
                  <TabsTrigger value="recordings">
                    <Play className="h-4 w-4 mr-2" />
                    Recordings
                  </TabsTrigger>
                  <TabsTrigger value="decision">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Assessment
                  </TabsTrigger>
                </TabsList>

                {/* Analysis Tab */}
                <TabsContent value="analysis" className="mt-4">
                  {latestFeedback ? (
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
                            {latestFeedback.strengths?.map((s: string, i: number) => (
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
                            {latestFeedback.weaknesses?.map((w: string, i: number) => (
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
                            {latestFeedback.keyInsights.map((insight: string, i: number) => (
                              <li key={i} className="text-muted-foreground">{insight}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {latestFeedback.rationale && (
                        <div className="space-y-2">
                          <h4 className="font-semibold">AI Rationale</h4>
                          {latestFeedback.rationale === "Automated analysis was not available. Please review manually." && isReanalyzing ? (
                            <div className="flex items-center gap-3 text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Re-running AI analysis...
                            </div>
                          ) : latestFeedback.rationale === "Automated analysis was not available. Please review manually." ? (
                            <div className="text-sm text-muted-foreground bg-muted p-3 rounded-lg space-y-2">
                              <p>{latestFeedback.rationale}</p>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => { setIsReanalyzing(true); reanalyzeMutation.mutate(); }}
                                disabled={reanalyzeMutation.isPending}
                              >
                                <RefreshCw className="h-3 w-3 mr-2" />
                                Retry Analysis
                              </Button>
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                              {latestFeedback.rationale}
                            </p>
                          )}
                        </div>
                      )}

                      {latestFeedback.flaggedConcerns && latestFeedback.flaggedConcerns.length > 0 && (
                        <div className="space-y-2 border-t pt-4">
                          <h4 className="font-semibold text-foreground flex items-center gap-2">
                            <AlertCircle className="h-4 w-4" />
                            Flagged Concerns
                          </h4>
                          <ul className="list-disc list-inside text-sm space-y-1">
                            {latestFeedback.flaggedConcerns.map((concern: string, i: number) => (
                              <li key={i} className="text-foreground">{concern}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : postStatus === "scoring" ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin opacity-50" />
                      <p className="font-medium">AI is analyzing the interview...</p>
                      <p className="text-sm mt-1">Scores and feedback will appear automatically</p>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-30" />
                      <p>No analysis available yet</p>
                      <p className="text-sm mt-1">AI analysis will appear after the interview is processed</p>
                    </div>
                  )}
                </TabsContent>

                {/* Transcript Tab */}
                <TabsContent value="transcript" className="mt-4">
                  <ScrollArea className="h-[400px]">
                    {consoleTranscripts.length > 0 ? (
                      <div className="space-y-4">
                        {(() => {
                          const hasRealTimestamps = consoleTranscripts.some((s: any) => s.startTime != null);
                          let cumSec = 0;
                          const timestamps = consoleTranscripts.map((seg: any) => {
                            if (hasRealTimestamps) return seg.startTime;
                            const ts = cumSec;
                            cumSec += Math.max(3, Math.ceil((seg.text?.split(/\s+/).length || 5) / 2.5));
                            return ts;
                          });
                          return consoleTranscripts.map((segment: any, idx: number) => {
                            const ts = timestamps[idx] ?? 0;
                            return (
                              <div
                                key={segment.id || idx}
                                className={`p-3 rounded-lg ${
                                  segment.speakerRole === "candidate"
                                    ? "bg-muted/20 ml-0 mr-8"
                                    : "bg-secondary/20 ml-8 mr-0"
                                }`}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-mono text-muted-foreground min-w-[40px]">
                                      {Math.floor(ts / 60)}:{String(Math.round(ts) % 60).padStart(2, "0")}
                                    </span>
                                    <span className="text-xs font-semibold uppercase">
                                      {segment.speakerRole}
                                    </span>
                                  </div>
                                  {segment.sentiment && (
                                    <span className={`text-xs ${getSentimentColor(segment.sentiment)}`}>
                                      {segment.sentiment}
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm">{segment.text}</p>
                              </div>
                            );
                          });
                        })()}
                        <div ref={transcriptEndRef} />
                      </div>
                    ) : transcripts.length > 0 ? (
                      <div className="space-y-4">
                        {(() => {
                          let cumSec = 0;
                          return transcripts.map((t, idx) => {
                            const ts = cumSec;
                            cumSec += Math.max(3, Math.ceil((t.text?.split(/\s+/).length || 5) / 2.5));
                            return (
                              <div
                                key={idx}
                                className={`p-3 rounded-lg ${
                                  t.role === "user"
                                    ? "bg-muted/20 ml-0 mr-8"
                                    : "bg-secondary/20 ml-8 mr-0"
                                }`}
                              >
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs font-mono text-muted-foreground min-w-[40px]">
                                    {Math.floor(ts / 60)}:{String(ts % 60).padStart(2, "0")}
                                  </span>
                                  <span className="text-xs font-semibold uppercase">
                                    {t.role === "user" ? "candidate" : "interviewer"}
                                  </span>
                                </div>
                                <p className="text-sm">{t.text}</p>
                              </div>
                            );
                          });
                        })()}
                        <div ref={transcriptEndRef} />
                      </div>
                    ) : postStatus === "scoring" ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin opacity-50" />
                        <p>Fetching transcript...</p>
                        <p className="text-sm mt-1">This may take up to a minute</p>
                      </div>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin opacity-50" />
                        <p>Transcript is being processed</p>
                        <p className="text-sm mt-1">Auto-refreshing every 10 seconds...</p>
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>

                {/* Recordings Tab */}
                <TabsContent value="recordings" className="mt-4">
                  {consoleRecordings.length > 0 ? (
                    <div className="space-y-4">
                      {consoleRecordings.map((recording: any) => (
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
                            onClick={() => {
                              if (playingRecordingId === recording.id) {
                                if (audioRef.current) {
                                  audioRef.current.pause();
                                  audioRef.current.currentTime = 0;
                                }
                                setPlayingRecordingId(null);
                              } else {
                                if (audioRef.current) {
                                  audioRef.current.pause();
                                }
                                const audio = new Audio(recording.mediaUrl);
                                audio.onended = () => setPlayingRecordingId(null);
                                audio.play().catch(() => {
                                  toast.error("Unable to play this recording");
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
                      <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin opacity-50" />
                      <p className="font-medium">Recording is being processed</p>
                      <p className="text-sm mt-1">Auto-refreshing every 10 seconds. This may take a few minutes.</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-4"
                        onClick={() => {
                          if (tavusSessionId) {
                            queryClient.invalidateQueries({ queryKey: ["/api/interviews", tavusSessionId, "stage", "video"] });
                          }
                        }}
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Check Now
                      </Button>
                    </div>
                  )}
                </TabsContent>

                {/* Assessment Tab */}
                <TabsContent value="decision" className="mt-4">
                  <div className="space-y-6">
                    {latestFeedback ? (
                      <>
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
                                  {latestFeedback.strengths.slice(0, 3).map((s: string, i: number) => (
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
                                  {latestFeedback.weaknesses.slice(0, 3).map((w: string, i: number) => (
                                    <li key={i}>{w}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>

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
                        <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin opacity-50" />
                        <p>Generating assessment...</p>
                        <p className="text-sm mt-1">AI analysis will appear automatically</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Active / Pre-session view
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Video Interview</h1>
          <p className="text-muted-foreground">
            {isSessionActive ? `Live session with ${candidateName}` : "AI-powered video interview practice"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isSessionActive && (
            <>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 rounded-full border border-green-500/30">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs text-green-400">Live</span>
              </div>
              <Badge variant="outline">
                <Clock className="h-3 w-3 mr-1" />
                {formatDuration(duration)}
              </Badge>
            </>
          )}
          <Link href="/hr-dashboard">
            <Button variant="outline">Return to Dashboard</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Interview Details Card */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5" />
              Interview Details
            </CardTitle>
            <CardDescription>
              {isSessionActive ? "Session in progress" : "Configure and start"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between p-2 rounded bg-muted">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" /> Candidate
                  </span>
                  <span className="font-medium">{candidateName}</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-muted">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Briefcase className="h-3.5 w-3.5" /> Position
                  </span>
                  <span className="font-medium">{roleDisplay}</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-muted">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Video className="h-3.5 w-3.5" /> Round
                  </span>
                  <span className="font-medium">Final Interview</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-muted">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Play className="h-3.5 w-3.5" /> Technology
                  </span>
                  <span className="font-medium">Tavus AI Clone</span>
                </div>
              </div>

              {/* Interview topics */}
              <div className="border-t pt-4">
                <h4 className="font-semibold text-sm mb-3">Interview Topics</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <Badge variant="outline" className="mt-0.5">1</Badge>
                    <span>Technical expertise & project experience</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Badge variant="outline" className="mt-0.5">2</Badge>
                    <span>Problem-solving approach</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Badge variant="outline" className="mt-0.5">3</Badge>
                    <span>Team collaboration & communication</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Badge variant="outline" className="mt-0.5">4</Badge>
                    <span>Cultural fit & career goals</span>
                  </li>
                </ul>
              </div>

              {isSessionActive && (
                <div className="border-t pt-4">
                  <p className="text-sm text-muted-foreground">
                    The AI interviewer is actively listening and will adapt questions based on your responses.
                  </p>
                </div>
              )}

              {/* Live transcript in sidebar when session active */}
              {isSessionActive && transcripts.length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Live Transcript
                  </h4>
                  <ScrollArea className="h-48">
                    <div className="space-y-2 pr-2">
                      {transcripts.map((t, i) => (
                        <div key={i} className={`text-xs ${t.role === "ai" ? "text-blue-300" : "text-foreground/80"}`}>
                          <span className="font-bold">{t.role === "ai" ? "AI:" : "Candidate:"}</span> {t.text}
                        </div>
                      ))}
                      <div ref={transcriptEndRef} />
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right: Video Area Card */}
        <Card className="lg:col-span-2 relative overflow-hidden">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  {candidateName}
                </CardTitle>
                <CardDescription className="mt-1">
                  {roleDisplay} - Video Interview
                </CardDescription>
              </div>
              {isSessionActive && (
                <Badge className="bg-green-500/10 text-green-400 border-green-500/30" variant="outline">
                  Live Session
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isSessionActive && sessionUrl ? (
              <div className="space-y-4">
                <div className="relative w-full aspect-video rounded-lg overflow-hidden border">
                  <iframe
                    ref={iframeRef}
                    src={sessionUrl}
                    className="w-full h-full"
                    allow="camera; microphone; autoplay; fullscreen"
                    data-testid="tavus-video-frame"
                  />
                </div>
                <div className="flex justify-center">
                  <Button
                    variant="destructive"
                    size="lg"
                    onClick={handleEndSession}
                    className="rounded-full"
                    data-testid="button-end-video"
                  >
                    <PhoneOff className="mr-2 h-5 w-5" />
                    End Interview
                  </Button>
                </div>
              </div>
            ) : createSessionMutation.isPending ? (
              <div className="h-[400px] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-6 py-12">
                <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center">
                  <Video className="w-8 h-8 text-foreground" />
                </div>
                <div className="text-center space-y-2">
                  <h2 className="text-2xl font-bold">Ready for your interview?</h2>
                  <p className="text-muted-foreground max-w-md">
                    Select a job role and practice with an AI HR Manager powered by Tavus video technology.
                  </p>
                </div>

                <div className="w-full max-w-md space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="role-select" className="text-sm font-medium">
                      Job Position
                    </Label>
                    <Select value={selectedRole} onValueChange={setSelectedRole}>
                      <SelectTrigger
                        id="role-select"
                        data-testid="select-job-role"
                      >
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                      <SelectContent>
                        {COMMON_ROLES.map((role) => (
                          <SelectItem key={role} value={role}>
                            {role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedRole === "Custom Role" && (
                    <div className="space-y-2">
                      <Label htmlFor="custom-role" className="text-sm font-medium">
                        Enter Custom Role
                      </Label>
                      <Input
                        id="custom-role"
                        value={customRole}
                        onChange={(e) => setCustomRole(e.target.value)}
                        placeholder="e.g., Senior DevOps Engineer"
                        data-testid="input-custom-role"
                      />
                    </div>
                  )}
                </div>

                <Button
                  size="lg"
                  onClick={handleStartSession}
                  disabled={createSessionMutation.isPending}
                  data-testid="button-start-video"
                >
                  {createSessionMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Creating Session...
                    </>
                  ) : (
                    "Start Video Interview"
                  )}
                </Button>
                {createSessionMutation.isError && (
                  <p className="text-destructive text-sm">
                    Failed to create session. Please check your Tavus API configuration.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
