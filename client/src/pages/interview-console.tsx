import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
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

export default function InterviewConsole() {
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [decisionNotes, setDecisionNotes] = useState("");
  const [showDecisionDialog, setShowDecisionDialog] = useState(false);
  const [pendingDecision, setPendingDecision] = useState<"accepted" | "rejected" | "pipeline" | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: sessions = [], isLoading: loadingSessions, refetch: refetchSessions } = useQuery<InterviewSession[]>({
    queryKey: ["/api/interviews"],
  });

  const { data: details, isLoading: loadingDetails } = useQuery<InterviewDetails>({
    queryKey: ["/api/interviews", selectedSession],
    enabled: !!selectedSession,
  });

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/interviews", selectedSession] });
      queryClient.invalidateQueries({ queryKey: ["/api/interviews"] });
      setShowDecisionDialog(false);
      setDecisionNotes("");
      toast({
        title: "Decision Updated",
        description: "The interview decision has been recorded successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update decision. Please try again.",
        variant: "destructive",
      });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-500/10 text-green-500";
      case "started": return "bg-blue-500/10 text-blue-500";
      case "pending": return "bg-yellow-500/10 text-yellow-500";
      case "expired": return "bg-red-500/10 text-red-500";
      default: return "bg-gray-500/10 text-gray-500";
    }
  };

  const getDecisionColor = (decision: string | null) => {
    switch (decision) {
      case "accepted": return "bg-green-500 text-white";
      case "rejected": return "bg-red-500 text-white";
      case "pipeline": return "bg-blue-500 text-white";
      case "needs_review": return "bg-yellow-500 text-white";
      default: return "bg-gray-500/10 text-gray-500";
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
      case "positive": return "text-green-500";
      case "negative": return "text-red-500";
      default: return "text-gray-500";
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
        <Button onClick={() => refetchSessions()} variant="outline" data-testid="button-refresh-interviews">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mic className="h-5 w-5" />
              Interview Sessions
            </CardTitle>
            <CardDescription>
              {sessions.length} total sessions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px]">
              {loadingSessions ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : sessions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Mic className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No interview sessions yet</p>
                  <p className="text-sm mt-1">Sessions will appear here when scheduled</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sessions.map((session) => (
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
                          {session.interviewType === "video" ? (
                            <Video className="h-4 w-4 text-blue-500" />
                          ) : (
                            <Mic className="h-4 w-4 text-blue-500" />
                          )}
                          <span className="font-medium text-sm">{session.candidateName || "Unknown"}</span>
                        </div>
                        <Badge className={getStatusColor(session.status)}>
                          {session.status}
                        </Badge>
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

        <Card className="lg:col-span-2">
          {!selectedSession ? (
            <div className="h-[700px] flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <User className="h-16 w-16 mx-auto mb-4 opacity-30" />
                <p>Select an interview session to view details</p>
              </div>
            </div>
          ) : loadingDetails ? (
            <div className="h-[700px] flex items-center justify-center">
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
              <CardContent>
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
                      Decision
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="analysis" className="mt-4">
                    {latestFeedback ? (
                      <div className="space-y-6">
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                          <ScoreCard label="Overall" value={latestFeedback.overallScore} />
                          <ScoreCard label="Technical" value={latestFeedback.technicalScore} />
                          <ScoreCard label="Communication" value={latestFeedback.communicationScore} />
                          <ScoreCard label="Culture Fit" value={latestFeedback.cultureFitScore} />
                          <ScoreCard label="Problem Solving" value={latestFeedback.problemSolvingScore} />
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <h4 className="font-semibold text-green-600 flex items-center gap-2">
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
                            <h4 className="font-semibold text-red-600 flex items-center gap-2">
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
                            <h4 className="font-semibold text-amber-600 flex items-center gap-2">
                              <AlertCircle className="h-4 w-4" />
                              Flagged Concerns
                            </h4>
                            <ul className="list-disc list-inside text-sm space-y-1">
                              {latestFeedback.flaggedConcerns.map((concern, i) => (
                                <li key={i} className="text-amber-600">{concern}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-30" />
                        <p>No analysis available yet</p>
                        <p className="text-sm mt-1">Analysis will be generated after the interview is completed</p>
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
                                  ? "bg-blue-50 dark:bg-blue-950/20 ml-0 mr-8"
                                  : "bg-gray-50 dark:bg-gray-950/20 ml-8 mr-0"
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
                              {segment.startTime && (
                                <span className="text-xs text-muted-foreground mt-1">
                                  {Math.floor(segment.startTime / 1000)}s
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
                                <Video className="h-8 w-8 text-blue-500" />
                              ) : (
                                <Mic className="h-8 w-8 text-blue-500" />
                              )}
                              <div>
                                <p className="font-medium capitalize">{recording.recordingType} Recording</p>
                                <p className="text-sm text-muted-foreground">
                                  {recording.duration ? `${Math.floor(recording.duration / 60)}m ${recording.duration % 60}s` : "Duration unknown"}
                                </p>
                              </div>
                            </div>
                            <Button variant="outline" size="sm" data-testid={`button-play-recording-${recording.id}`}>
                              <Play className="h-4 w-4 mr-2" />
                              Play
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
                          <div className="grid grid-cols-3 gap-4">
                            <Button
                              size="lg"
                              variant={latestFeedback.decision === "accepted" ? "default" : "outline"}
                              className={latestFeedback.decision === "accepted" ? "bg-green-600 hover:bg-green-700" : ""}
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
                              className={latestFeedback.decision === "pipeline" ? "bg-blue-600 hover:bg-blue-700" : ""}
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

                          {latestFeedback.isFinalized === 1 && (
                            <div className="text-center text-muted-foreground bg-muted p-4 rounded-lg">
                              <CheckCircle className="h-6 w-6 mx-auto mb-2 text-green-500" />
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
              </CardContent>
            </>
          ) : null}
        </Card>
      </div>

      <Dialog open={showDecisionDialog} onOpenChange={setShowDecisionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {pendingDecision === "accepted" && <ThumbsUp className="h-5 w-5 text-green-500" />}
              {pendingDecision === "rejected" && <ThumbsDown className="h-5 w-5 text-red-500" />}
              {pendingDecision === "pipeline" && <Clock3 className="h-5 w-5 text-blue-500" />}
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
                pendingDecision === "accepted" ? "bg-green-600 hover:bg-green-700" :
                pendingDecision === "rejected" ? "bg-red-600 hover:bg-red-700" :
                "bg-blue-600 hover:bg-blue-700"
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
    </div>
  );
}

function ScoreCard({ label, value }: { label: string; value: number | null }) {
  const getScoreColor = (score: number | null) => {
    if (score === null) return "text-gray-400";
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    return "text-red-500";
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
