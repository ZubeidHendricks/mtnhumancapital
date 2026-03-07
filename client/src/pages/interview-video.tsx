import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { interviewService, recordingService } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Video, PhoneOff, Loader2, CheckCircle2, AlertCircle, MessageSquare } from "lucide-react";
import { motion } from "framer-motion";
import { Link, useSearch } from "wouter";
import { toast } from "sonner";
import DailyIframe, { DailyCall } from "@daily-co/daily-js";

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

export default function InterviewVideo() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const candidateName = params.get("candidate") || "Candidate";
  const candidateId = params.get("id");
  const jobParam = params.get("job");

  const [sessionUrl, setSessionUrl] = useState<string | null>(null);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>(jobParam || COMMON_ROLES[0]);
  const [customRole, setCustomRole] = useState<string>("");
  const [tavusConversationId, setTavusConversationId] = useState<string | null>(null);
  const [tavusSessionId, setTavusSessionId] = useState<string | null>(null);
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [postStatus, setPostStatus] = useState<"idle" | "scoring" | "scored" | "saving_recording" | "done" | "error">("idle");
  const [duration, setDuration] = useState(0);

  const dailyCallRef = useRef<DailyCall | null>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef<number>(0);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

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
      setSessionUrl(data.sessionUrl);
      setTavusConversationId(data.sessionId);
      setTavusSessionId(data.interviewId || null);
      setTranscripts([]);
      setPostStatus("idle");

      // Use Daily.co createFrame to render only the AI persona and capture transcripts
      try {
        if (!videoContainerRef.current) throw new Error("Video container not ready");

        const call = DailyIframe.createFrame(videoContainerRef.current, {
          iframeStyle: {
            width: "100%",
            height: "100%",
            border: "none",
            borderRadius: "1rem",
          },
          showLeaveButton: false,
          showFullscreenButton: true,
          showLocalVideo: false,
        });
        dailyCallRef.current = call;

        // Listen for real-time transcript via app-message events
        call.on("app-message", (event: any) => {
          try {
            const msgData = event?.data;
            if (!msgData) return;
            const eventType = msgData.event_type || msgData.type;

            if (eventType === "conversation.utterance" || eventType === "conversation.echo") {
              const role = msgData.properties?.role || msgData.role;
              const text = msgData.properties?.text || msgData.properties?.speech || msgData.text || msgData.speech || "";
              if (text && text.trim()) {
                const elapsed = startTimeRef.current ? Math.round((Date.now() - startTimeRef.current) / 1000) : undefined;
                const mappedRole: "user" | "ai" = (role === "user" || role === "candidate") ? "user" : "ai";
                setTranscripts(prev => [...prev, { role: mappedRole, text: text.trim(), timestamp: elapsed }]);
              }
            } else if (eventType === "conversation.user.stopped_speaking" || eventType === "user_message") {
              const text = msgData.properties?.transcript || msgData.properties?.text || msgData.transcript || msgData.text || "";
              if (text && text.trim()) {
                const elapsed = startTimeRef.current ? Math.round((Date.now() - startTimeRef.current) / 1000) : undefined;
                setTranscripts(prev => [...prev, { role: "user", text: text.trim(), timestamp: elapsed }]);
              }
            } else if (eventType === "conversation.replica.started_speaking" || eventType === "assistant_message") {
              const text = msgData.properties?.text || msgData.properties?.speech || msgData.text || msgData.speech || "";
              if (text && text.trim()) {
                const elapsed = startTimeRef.current ? Math.round((Date.now() - startTimeRef.current) / 1000) : undefined;
                setTranscripts(prev => [...prev, { role: "ai", text: text.trim(), timestamp: elapsed }]);
              }
            }
          } catch (err) {
            console.error("[Tavus] Error processing app-message:", err);
          }
        });

        await call.join({ url: data.sessionUrl, videoSource: false, audioSource: true });
        console.log("[Tavus] Joined with Daily.co frame — transcript capture active, local video hidden");
      } catch (err) {
        console.warn("[Tavus] createFrame failed, falling back to iframe:", err);
      }

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

  const handleEndSession = async () => {
    // Destroy Daily call
    if (dailyCallRef.current) {
      try { await dailyCallRef.current.leave(); } catch {}
      try { await dailyCallRef.current.destroy(); } catch {}
      dailyCallRef.current = null;
    }
    // Clear the video container
    if (videoContainerRef.current) {
      videoContainerRef.current.innerHTML = "";
    }

    setIsSessionActive(false);
    setSessionUrl(null);
    setPostStatus("scoring");

    const durationSec = startTimeRef.current ? Math.floor((Date.now() - startTimeRef.current) / 1000) : 0;

    // Score using captured transcripts
    if (transcripts.length > 0 && tavusSessionId) {
      try {
        const mappedTranscripts = transcripts.map((t) => ({
          role: t.role === "user" ? "candidate" : "ai",
          text: t.text,
          timestamp: t.timestamp,
        }));
        await interviewService.completeInterview(tavusSessionId, {
          transcripts: mappedTranscripts,
          duration: durationSec,
          stage: 'video',
        });
        setPostStatus("scored");
        toast.success("Interview scored successfully!");
      } catch (err) {
        console.error("Failed to score interview:", err);
        setPostStatus("error");
        toast.error("Failed to submit interview analysis.");
      }
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

  // Post-interview progress overlay
  if (postStatus !== "idle" && !isSessionActive) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <header className="h-16 border-b border-border dark:border-white/10 flex items-center justify-between px-6 bg-card/50 backdrop-blur-md sticky top-0 z-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-muted/20 flex items-center justify-center">
              <Video className="w-4 h-4 text-foreground" />
            </div>
            <span className="font-semibold text-sm">Interview Complete - {candidateName}</span>
          </div>
          <Link href="/hr-dashboard">
            <Button variant="ghost" size="sm">Return to Dashboard</Button>
          </Link>
        </header>

        <main className="flex-1 flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-lg bg-card/50 border border-border dark:border-white/10 rounded-2xl p-8"
          >
            {postStatus === "scoring" && (
              <div className="flex flex-col items-center text-center">
                <Loader2 className="h-16 w-16 text-blue-400 mb-4 animate-spin" />
                <h2 className="text-2xl font-bold mb-2">Analyzing Interview...</h2>
                <p className="text-muted-foreground mb-6">
                  Scoring technical skills, communication, and culture fit.
                </p>
              </div>
            )}

            {(postStatus === "scored" || postStatus === "saving_recording" || postStatus === "done") && (
              <div className="flex flex-col items-center text-center">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200 }}>
                  <CheckCircle2 className="h-16 w-16 text-green-400 mb-4" />
                </motion.div>
                <h2 className="text-2xl font-bold mb-2">Interview Scored!</h2>
                <p className="text-muted-foreground mb-6">
                  AI analysis complete. Results are available in the Interview Console.
                </p>
              </div>
            )}

            {postStatus === "error" && (
              <div className="flex flex-col items-center text-center">
                <AlertCircle className="h-16 w-16 text-yellow-400 mb-4" />
                <h2 className="text-2xl font-bold mb-2">Interview Ended</h2>
                <p className="text-muted-foreground mb-6">
                  There was an issue scoring. The video recording will still be processed in the background.
                </p>
              </div>
            )}

            {/* Progress steps */}
            <div className="space-y-3 mt-2">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-400 shrink-0" />
                <span className="text-sm">Transcript captured ({transcripts.length} exchanges)</span>
              </div>

              <div className="flex items-center gap-3">
                {postStatus === "scoring" ? (
                  <Loader2 className="h-5 w-5 text-blue-400 animate-spin shrink-0" />
                ) : postStatus === "error" ? (
                  <AlertCircle className="h-5 w-5 text-yellow-400 shrink-0" />
                ) : (
                  <CheckCircle2 className="h-5 w-5 text-green-400 shrink-0" />
                )}
                <span className="text-sm">
                  {postStatus === "scoring" ? "Scoring interview responses..." : postStatus === "error" ? "Scoring failed" : "Interview scored"}
                </span>
              </div>

              <div className="flex items-center gap-3">
                {postStatus === "saving_recording" ? (
                  <Loader2 className="h-5 w-5 text-blue-400 animate-spin shrink-0" />
                ) : postStatus === "done" ? (
                  <CheckCircle2 className="h-5 w-5 text-green-400 shrink-0" />
                ) : (
                  <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30 shrink-0" />
                )}
                <span className={`text-sm ${postStatus !== "saving_recording" && postStatus !== "done" ? "text-muted-foreground" : ""}`}>
                  {postStatus === "saving_recording" ? "Saving video recording..." : postStatus === "done" ? "Video recording saved" : "Video recording (processes in background)"}
                </span>
              </div>
            </div>

            {duration > 0 && (
              <p className="text-sm text-muted-foreground mt-6 text-center">
                Duration: {formatDuration(duration)}
              </p>
            )}

            <div className="mt-6 flex justify-center">
              <Link href="/hr-dashboard">
                <Button variant="outline">Return to Dashboard</Button>
              </Link>
            </div>
          </motion.div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="h-16 border-b border-border dark:border-white/10 flex items-center justify-between px-6 bg-card/50 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-muted/20 flex items-center justify-center">
            <Video className="w-4 h-4 text-foreground dark:text-foreground" />
          </div>
          <span className="font-semibold text-sm">Final Round Interview - {candidateName}</span>
        </div>
        <div className="flex items-center gap-4">
          {isSessionActive && (
            <>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 rounded-full border border-green-500/30">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs text-green-400">Live</span>
              </div>
              <Badge variant="outline" className="border-border/50">
                {formatDuration(duration)}
              </Badge>
            </>
          )}
          <Link href="/hr-dashboard">
            <Button variant="ghost" size="sm">Return to Dashboard</Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 container mx-auto p-6 flex gap-6 h-[calc(100vh-64px)]">
        <div className="flex-1 flex flex-col gap-4">
          <div className="flex-1 relative overflow-hidden">
            {/* Always render the video container so the ref is available when onSuccess fires */}
            <div
              ref={videoContainerRef}
              className={`w-full h-full rounded-2xl border border-border dark:border-white/10 shadow-2xl overflow-hidden ${isSessionActive && sessionUrl ? '' : 'hidden'}`}
              data-testid="tavus-video-frame"
            />
            {!isSessionActive && !sessionUrl && createSessionMutation.isPending ? (
              <div className="w-full h-full rounded-2xl border border-border dark:border-white/10 bg-card/30 flex items-center justify-center">
                <Loader2 className="w-12 h-12 animate-spin text-foreground" />
              </div>
            ) : !isSessionActive && !sessionUrl && !createSessionMutation.isPending ? (
              <div className="w-full h-full rounded-2xl border border-border dark:border-white/10 bg-card/30 flex flex-col items-center justify-center gap-6 p-8">
                <div className="w-20 h-20 rounded-full bg-muted/20 flex items-center justify-center animate-pulse">
                  <Video className="w-8 h-8 text-foreground dark:text-foreground" />
                </div>
                <div className="text-center space-y-2">
                  <h2 className="text-2xl font-bold">Ready for your interview practice?</h2>
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
                        className="bg-black/50 border-border dark:border-white/10"
                        data-testid="select-job-role"
                      >
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1a1a] border-border dark:border-white/10">
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
                        className="bg-black/50 border-border dark:border-white/10"
                        data-testid="input-custom-role"
                      />
                    </div>
                  )}
                </div>

                <Button
                  size="lg"
                  onClick={handleStartSession}
                  disabled={createSessionMutation.isPending}
                  className="bg-muted hover:bg-muted text-white"
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
            ) : null}
          </div>

          {isSessionActive && (
            <div className="h-20 rounded-2xl bg-card/50 border border-border dark:border-white/10 flex items-center justify-center gap-6 backdrop-blur-md">
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
          )}
        </div>

        <div className="w-80 space-y-4">
          <div className="bg-card/30 border border-border dark:border-white/10 rounded-xl p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Video className="w-4 h-4 text-foreground dark:text-foreground" />
              Interview Details
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Candidate:</span>
                <span className="font-medium">{candidateName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Position:</span>
                <span className="font-medium">{selectedRole === "Custom Role" ? customRole : selectedRole}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Round:</span>
                <span className="font-medium">Final Interview</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Technology:</span>
                <span className="font-medium">Tavus AI Clone</span>
              </div>
            </div>
          </div>

          {/* Live transcript panel */}
          {isSessionActive && transcripts.length > 0 && (
            <div className="bg-card/30 border border-border dark:border-white/10 rounded-xl p-4 h-72 flex flex-col">
              <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm shrink-0">
                <MessageSquare className="w-4 h-4" />
                Live Transcript
              </h3>
              <ScrollArea className="flex-1 min-h-0">
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

          <div className="bg-card/30 border border-border dark:border-white/10 rounded-xl p-4">
            <h3 className="font-semibold mb-3">Interview Topics</h3>
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
            <div className="bg-muted/10 border border-border/20 rounded-xl p-4">
              <p className="text-sm text-foreground">
                The AI interviewer is actively listening and will adapt questions based on your responses.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
