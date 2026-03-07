import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { interviewService } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Video, PhoneOff, Loader2, X, MessageSquare, FileText, BarChart3, Clock } from "lucide-react";
import { motion } from "framer-motion";
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
  "Custom Role",
];

interface PracticeVideoPanelProps {
  candidateName?: string;
  onClose: () => void;
}

export function PracticeVideoPanel({ candidateName = "Practice", onClose }: PracticeVideoPanelProps) {
  const [sessionUrl, setSessionUrl] = useState<string | null>(null);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>(COMMON_ROLES[0]);
  const [customRole, setCustomRole] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [fetchingTranscript, setFetchingTranscript] = useState(false);
  const [duration, setDuration] = useState(0);

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
      return interviewService.createVideoSession(
        undefined,
        `[Practice] ${candidateName}`,
        roleToUse
      );
    },
    onSuccess: (data) => {
      setSessionUrl(data.sessionUrl);
      setConversationId(data.sessionId);
      setTranscripts([]);
      setDuration(0);
      startTimeRef.current = Date.now();
      setIsSessionActive(true);
      toast.success("Practice video session started");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create practice session");
    },
  });

  const handleStart = () => {
    if (selectedRole === "Custom Role" && (!customRole || customRole.trim() === "")) {
      toast.error("Please enter a custom job role");
      return;
    }
    createSessionMutation.mutate();
  };

  const handleEnd = async () => {
    setIsSessionActive(false);
    setSessionUrl(null);

    // Fetch transcript from Tavus
    if (conversationId) {
      setFetchingTranscript(true);
      try {
        await new Promise(resolve => setTimeout(resolve, 3000));
        const tavusData = await interviewService.getTavusTranscript(conversationId);

        if (tavusData?.transcript && Array.isArray(tavusData.transcript)) {
          const fetched: Transcript[] = [];
          tavusData.transcript.forEach((entry: any, index: number) => {
            if (entry.role === "system") return;
            const text = entry.content || entry.text || entry.message || "";
            if (!text.trim()) return;
            const role = entry.role === "user" || entry.role === "candidate" ? "user" as const : "ai" as const;
            fetched.push({ role, text: text.trim(), timestamp: index });
          });
          if (fetched.length > 0) {
            setTranscripts(fetched);
            toast.success(`Transcript retrieved (${fetched.length} exchanges)`);
          } else {
            toast.info("No transcript available yet. It may still be processing.");
          }
        }
      } catch (err) {
        console.error("Failed to fetch practice transcript:", err);
        toast.info("Transcript may still be processing.");
      } finally {
        setFetchingTranscript(false);
      }
    } else {
      toast.success("Practice session ended");
    }
  };

  const roleDisplay = selectedRole === "Custom Role" ? customRole : selectedRole;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="border rounded-lg bg-card overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <Video className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">Video Practice</span>
          <Badge variant="outline" className="text-[10px] h-5 border-amber-500 text-amber-600 bg-amber-500/10">
            PRACTICE MODE
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {isSessionActive && (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-muted-foreground">{formatDuration(duration)}</span>
            </div>
          )}
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {!isSessionActive && transcripts.length === 0 && !fetchingTranscript ? (
          /* Pre-session: Role selection */
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center">
              <Video className="h-7 w-7 text-foreground" />
            </div>
            <div className="text-center">
              <p className="font-medium">Video Interview Practice</p>
              <p className="text-sm text-muted-foreground mt-1">
                Practice with an AI avatar. No recording will be saved.
              </p>
            </div>

            <div className="w-full max-w-sm space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="practice-role" className="text-xs font-medium">
                  Job Position
                </Label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger id="practice-role" className="h-9 text-sm">
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
                <div className="space-y-1.5">
                  <Label htmlFor="practice-custom-role" className="text-xs font-medium">
                    Custom Role
                  </Label>
                  <Input
                    id="practice-custom-role"
                    value={customRole}
                    onChange={(e) => setCustomRole(e.target.value)}
                    placeholder="e.g., Senior DevOps Engineer"
                    className="h-9 text-sm"
                  />
                </div>
              )}
            </div>

            <Button
              onClick={handleStart}
              disabled={createSessionMutation.isPending}
              className="rounded-full px-6"
            >
              {createSessionMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Session...
                </>
              ) : (
                "Start Practice"
              )}
            </Button>
          </div>
        ) : isSessionActive && sessionUrl ? (
          /* Active session: Video iframe */
          <div className="space-y-3">
            <div className="relative w-full aspect-video rounded-lg overflow-hidden border">
              <iframe
                src={sessionUrl}
                className="w-full h-full"
                allow="camera; microphone; autoplay; fullscreen"
              />
            </div>
            <div className="flex justify-center">
              <Button variant="destructive" size="sm" onClick={handleEnd} className="rounded-full">
                <PhoneOff className="h-4 w-4 mr-2" />
                End Practice
              </Button>
            </div>
          </div>
        ) : fetchingTranscript ? (
          /* Fetching transcript */
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Fetching transcript from Tavus...</p>
          </div>
        ) : transcripts.length > 0 ? (
          /* Post-session: Transcript with tabs (matching console style) */
          <div className="space-y-3">
            <Tabs defaultValue="transcript" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="transcript">
                  <FileText className="h-4 w-4 mr-2" />
                  Transcript
                </TabsTrigger>
                <TabsTrigger value="details">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Details
                </TabsTrigger>
              </TabsList>

              <TabsContent value="transcript" className="mt-3">
                <ScrollArea className="h-[400px]">
                  <div className="space-y-4 pr-3">
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
                </ScrollArea>
              </TabsContent>

              <TabsContent value="details" className="mt-3">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-3 rounded-lg bg-muted">
                      <p className="text-xs text-muted-foreground mb-1">Exchanges</p>
                      <p className="text-lg font-bold">{transcripts.length}</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-muted">
                      <p className="text-xs text-muted-foreground mb-1">Duration</p>
                      <p className="text-lg font-bold">{duration > 0 ? formatDuration(duration) : "N/A"}</p>
                    </div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted">
                    <p className="text-xs text-muted-foreground mb-1">Position</p>
                    <p className="text-sm font-bold">{roleDisplay}</p>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    Practice sessions are not scored or saved.
                  </p>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-center gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setTranscripts([]); setConversationId(null); setDuration(0); }}
              >
                New Practice
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>
    </motion.div>
  );
}
