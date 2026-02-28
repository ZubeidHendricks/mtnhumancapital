import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  Tag, Bookmark, Flag, MessageSquare, Brain, RefreshCw,
  Clock, User, Mic, ChevronRight, ChevronDown,
  Loader2, Send, Plus, Trash2, Filter, Download,
  Sparkles, AlertTriangle, ThumbsUp, Search,
  Zap, FileText, BarChart3, ListChecks,
  Video, HardDrive, Upload,
} from "lucide-react";
import { api } from "@/lib/api";

// Types
interface TimelineTag {
  id: string;
  sessionId: string;
  offsetMs: number;
  endOffsetMs?: number;
  duration?: number;
  tagType: string;
  tagSource: string;
  category?: string;
  label: string;
  description?: string;
  snippet?: string;
  confidence?: number;
  emotionScores?: Record<string, number>;
  dominantEmotion?: string;
  sentimentScore?: number;
  topics?: string[];
  keywords?: string[];
  speakerRole?: string;
  importance?: number;
  aiScore?: number;
  isBookmarked?: number;
  isFlagged?: number;
  notes?: string;
  createdAt: string;
}

interface TranscriptSegment {
  id: string;
  segmentIndex: number;
  speakerRole: string;
  text: string;
  startTime?: number;
  endTime?: number;
  confidence?: number;
  sentiment?: string;
  emotionScores?: Record<string, number>;
}

interface TranscriptJob {
  id: string;
  provider: string;
  status: string;
  progress: number;
  wordCount?: number;
  segmentCount?: number;
  completedAt?: string;
}

interface SessionData {
  id: string;
  candidateName?: string;
  jobTitle?: string;
  interviewType: string;
  status: string;
  duration?: number;
  overallScore?: number;
  completedAt?: string;
}

// Utility functions
function formatMs(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDurationSec(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}m ${s}s`;
}

function getTagColor(tagType: string): string {
  const colors: Record<string, string> = {
    auto_emotion: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    auto_topic: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    auto_keyword: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
    auto_sentiment: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    manual: "bg-green-500/20 text-green-400 border-green-500/30",
    bookmark: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    flag: "bg-red-500/20 text-red-400 border-red-500/30",
    question: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
    answer: "bg-teal-500/20 text-teal-400 border-teal-500/30",
    highlight: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    concern: "bg-red-500/20 text-red-400 border-red-500/30",
    topic_shift: "bg-violet-500/20 text-violet-400 border-violet-500/30",
  };
  return colors[tagType] || "bg-gray-500/20 text-gray-400 border-gray-500/30";
}

function getCategoryIcon(category?: string) {
  switch (category) {
    case "technical": return <Zap className="h-3 w-3" />;
    case "behavioral": return <User className="h-3 w-3" />;
    case "communication": return <MessageSquare className="h-3 w-3" />;
    case "emotion": return <Sparkles className="h-3 w-3" />;
    case "red_flag": return <AlertTriangle className="h-3 w-3" />;
    case "positive_signal": return <ThumbsUp className="h-3 w-3" />;
    default: return <Tag className="h-3 w-3" />;
  }
}

export interface InterviewTimelineProps {
  sessionId?: string;
  embedded?: boolean;
}

export default function InterviewTimeline(props: InterviewTimelineProps & Record<string, any> = {}) {
  const { sessionId: propSessionId, embedded } = props;
  const params = useParams<{ sessionId: string }>();
  const sessionId = propSessionId || params.sessionId || "";
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Playback state
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [totalDurationMs, setTotalDurationMs] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  // UI state
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [qaQuestion, setQaQuestion] = useState("");
  const [showAddTag, setShowAddTag] = useState(false);
  const [newTagLabel, setNewTagLabel] = useState("");
  const [newTagType, setNewTagType] = useState("manual");
  const [newTagNotes, setNewTagNotes] = useState("");
  const [activeTab, setActiveTab] = useState("timeline");

  // Fetch session data
  const { data: session } = useQuery<SessionData>({
    queryKey: ["/api/interview-sessions", sessionId],
    queryFn: async () => {
      const res = await api.get(`/interview-sessions/${sessionId}`);
      return res.data;
    },
    enabled: !!sessionId,
  });

  // Fetch recordings for this session
  const { data: recordings = [] } = useQuery<any[]>({
    queryKey: ["/api/interviews", sessionId, "recordings"],
    queryFn: async () => {
      const res = await api.get(`/interviews/${sessionId}/recordings`);
      return res.data;
    },
    enabled: !!sessionId,
  });

  // Wire up audio src when recordings load
  useEffect(() => {
    if (recordings.length > 0 && audioRef.current) {
      const firstRecording = recordings[0];
      if (firstRecording.mediaUrl && audioRef.current.src !== window.location.origin + firstRecording.mediaUrl) {
        audioRef.current.src = firstRecording.mediaUrl;
      }
    }
  }, [recordings]);

  // Fetch timeline tags
  const { data: tags = [], isLoading: tagsLoading } = useQuery<TimelineTag[]>({
    queryKey: ["/api/interviews", sessionId, "timeline-tags"],
    queryFn: async () => {
      const res = await api.get(`/interviews/${sessionId}/timeline-tags`);
      return res.data;
    },
    enabled: !!sessionId,
  });

  // Fetch transcripts
  const { data: transcripts = [] } = useQuery<TranscriptSegment[]>({
    queryKey: ["/api/interviews", sessionId, "transcripts"],
    queryFn: async () => {
      const res = await api.get(`/interviews/${sessionId}/transcripts`);
      return res.data;
    },
    enabled: !!sessionId,
  });

  // Fetch transcript jobs
  const { data: transcriptJobs = [] } = useQuery<TranscriptJob[]>({
    queryKey: ["/api/interviews", sessionId, "transcript-jobs"],
    queryFn: async () => {
      const res = await api.get(`/interviews/${sessionId}/transcript-jobs`);
      return res.data;
    },
    enabled: !!sessionId,
  });

  // Fetch analysis history
  const { data: analysisHistory = [] } = useQuery({
    queryKey: ["/api/interviews", sessionId, "analysis-history"],
    queryFn: async () => {
      const res = await api.get(`/interviews/${sessionId}/analysis-history`);
      return res.data;
    },
    enabled: !!sessionId,
  });

  // Fetch provider status
  const { data: providerStatus } = useQuery({
    queryKey: ["/api/transcript-providers/status"],
    queryFn: async () => {
      const res = await api.get("/transcript-providers/status");
      return res.data;
    },
  });

  // Mutations
  const askQuestionMutation = useMutation({
    mutationFn: async (question: string) => {
      const res = await api.post(`/interviews/${sessionId}/ask`, { question });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/interviews", sessionId, "analysis-history"] });
      toast({ title: "Answer generated" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.response?.data?.message || "Failed to get answer", variant: "destructive" });
    },
  });

  const autoTagMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/interviews/${sessionId}/auto-tag`);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/interviews", sessionId, "timeline-tags"] });
      toast({ title: "Auto-tagging complete", description: `Generated ${data.tags?.length || 0} tags` });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to auto-tag", variant: "destructive" });
    },
  });

  const reanalyzeMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/interviews/${sessionId}/reanalyze`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/interviews", sessionId] });
      toast({ title: "Re-analysis complete" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to re-analyze", variant: "destructive" });
    },
  });

  const createTagMutation = useMutation({
    mutationFn: async (tag: any) => {
      const res = await api.post(`/interviews/${sessionId}/timeline-tags`, tag);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/interviews", sessionId, "timeline-tags"] });
      setShowAddTag(false);
      setNewTagLabel("");
      setNewTagNotes("");
      toast({ title: "Tag added" });
    },
  });

  const deleteTagMutation = useMutation({
    mutationFn: async (tagId: string) => {
      await api.delete(`/interviews/${sessionId}/timeline-tags/${tagId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/interviews", sessionId, "timeline-tags"] });
      toast({ title: "Tag deleted" });
    },
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadRecordingMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("recording", file);
      const res = await api.post(`/interviews/${sessionId}/upload-recording`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/interviews", sessionId, "recordings"] });
      toast({ title: "Recording uploaded successfully" });
    },
    onError: (err: any) => {
      toast({ title: "Upload failed", description: err.response?.data?.message || "Failed to upload recording", variant: "destructive" });
    },
  });

  const toggleBookmarkMutation = useMutation({
    mutationFn: async ({ tagId, isBookmarked }: { tagId: string; isBookmarked: boolean }) => {
      const res = await api.patch(`/interviews/${sessionId}/timeline-tags/${tagId}`, {
        isBookmarked: isBookmarked ? 1 : 0,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/interviews", sessionId, "timeline-tags"] });
    },
  });

  // Audio playback handlers
  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      setCurrentTimeMs(audioRef.current.currentTime * 1000);
    }
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      setTotalDurationMs(audioRef.current.duration * 1000);
    }
  }, []);

  const seekTo = useCallback((ms: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = ms / 1000;
      setCurrentTimeMs(ms);
    }
  }, []);

  const togglePlay = useCallback(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  }, [isPlaying]);

  // Filter tags
  const filteredTags = tagFilter === "all"
    ? tags
    : tags.filter((t) => t.tagType === tagFilter || t.category === tagFilter);

  // Get currently active transcript segment
  const activeSegment = transcripts.find(
    (t) => (t.startTime || 0) <= currentTimeMs && (t.endTime || Infinity) >= currentTimeMs
  );

  // Duration from session or audio
  const displayDuration = totalDurationMs || (session?.duration ? session.duration * 1000 : 0);

  return (
    <div className={embedded ? "bg-background" : "min-h-screen bg-background"}>
      {/* Header - hidden when embedded */}
      {!embedded && (
        <div className="border-b bg-card px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold">Interview Timeline</h1>
              <p className="text-sm text-muted-foreground">
                {session?.candidateName || "Unknown Candidate"} — {session?.jobTitle || "Position"}
                {session?.interviewType && (
                  <Badge variant="outline" className="ml-2">
                    {session.interviewType}
                  </Badge>
                )}
                {session?.overallScore != null && (
                  <Badge variant="outline" className="ml-2">
                    Score: {session.overallScore}%
                  </Badge>
                )}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => autoTagMutation.mutate()}
                disabled={autoTagMutation.isPending}
              >
                {autoTagMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Sparkles className="h-4 w-4 mr-1" />}
                Auto-Tag
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => reanalyzeMutation.mutate()}
                disabled={reanalyzeMutation.isPending}
              >
                {reanalyzeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />}
                Re-Analyze
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Embedded toolbar */}
      {embedded && (
        <div className="flex items-center justify-between px-2 py-2 border-b">
          <span className="text-sm font-medium flex items-center gap-1">
            <Clock className="h-4 w-4" /> Interview Timeline
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => autoTagMutation.mutate()}
              disabled={autoTagMutation.isPending}
            >
              {autoTagMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
              Auto-Tag
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => reanalyzeMutation.mutate()}
              disabled={reanalyzeMutation.isPending}
            >
              {reanalyzeMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />}
              Re-Analyze
            </Button>
          </div>
        </div>
      )}

      <div className={`flex ${embedded ? "h-[500px]" : "h-[calc(100vh-80px)]"}`}>
        {/* Left Panel: Timeline + Playback */}
        <div className="flex-1 flex flex-col border-r">
          {/* Audio Player */}
          <div className="border-b p-4 bg-card">
            <audio
              ref={audioRef}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onEnded={() => setIsPlaying(false)}
            />
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => seekTo(Math.max(0, currentTimeMs - 10000))}>
                <SkipBack className="h-4 w-4" />
              </Button>
              <Button variant="default" size="icon" onClick={togglePlay}>
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={() => seekTo(currentTimeMs + 10000)}>
                <SkipForward className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setIsMuted(!isMuted)}>
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </Button>

              <div className="flex-1 mx-2">
                <div
                  className="relative h-8 bg-muted rounded cursor-pointer group"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const pct = (e.clientX - rect.left) / rect.width;
                    seekTo(pct * displayDuration);
                  }}
                >
                  {/* Progress bar */}
                  <div
                    className="absolute top-0 left-0 h-full bg-primary/30 rounded"
                    style={{ width: `${displayDuration > 0 ? (currentTimeMs / displayDuration) * 100 : 0}%` }}
                  />

                  {/* Tag markers on timeline */}
                  {filteredTags.map((tag) => (
                    <TooltipProvider key={tag.id}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            className={`absolute top-0 w-1 h-full rounded cursor-pointer opacity-70 hover:opacity-100 transition-opacity ${
                              tag.category === "red_flag" ? "bg-red-500" :
                              tag.category === "positive_signal" ? "bg-green-500" :
                              tag.tagType === "auto_emotion" ? "bg-purple-500" :
                              tag.tagType === "question" ? "bg-indigo-500" :
                              "bg-yellow-500"
                            }`}
                            style={{
                              left: `${displayDuration > 0 ? (tag.offsetMs / displayDuration) * 100 : 0}%`,
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              seekTo(tag.offsetMs);
                            }}
                          />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="font-medium">{tag.label}</p>
                          <p className="text-xs text-muted-foreground">{formatMs(tag.offsetMs)}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ))}

                  {/* Playhead */}
                  <div
                    className="absolute top-0 w-0.5 h-full bg-primary"
                    style={{ left: `${displayDuration > 0 ? (currentTimeMs / displayDuration) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <span className="text-xs text-muted-foreground font-mono min-w-[80px]">
                {formatMs(currentTimeMs)} / {formatMs(displayDuration)}
              </span>
            </div>
          </div>

          {/* Tags Filter Bar */}
          <div className="border-b px-4 py-2 flex items-center gap-2 flex-wrap bg-muted/30">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            {["all", "auto_emotion", "auto_topic", "auto_keyword", "auto_sentiment", "question", "answer", "highlight", "concern", "manual", "bookmark", "flag"].map((type) => (
              <Button
                key={type}
                variant={tagFilter === type ? "default" : "ghost"}
                size="sm"
                className="h-6 text-xs px-2"
                onClick={() => setTagFilter(type)}
              >
                {type === "all" ? "All" : type.replace("auto_", "").replace("_", " ")}
              </Button>
            ))}
            <div className="ml-auto">
              <Button variant="outline" size="sm" className="h-6 text-xs" onClick={() => setShowAddTag(true)}>
                <Plus className="h-3 w-3 mr-1" /> Add Tag
              </Button>
            </div>
          </div>

          {/* Timeline Tags List */}
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-2">
              {tagsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredTags.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Tag className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No timeline tags yet</p>
                  <p className="text-xs mt-1">Click "Auto-Tag" to generate tags from the transcript</p>
                </div>
              ) : (
                filteredTags.map((tag) => (
                  <div
                    key={tag.id}
                    className={`group flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50 ${
                      activeSegment && tag.offsetMs >= (activeSegment.startTime || 0) && tag.offsetMs <= (activeSegment.endTime || Infinity)
                        ? "ring-1 ring-primary"
                        : ""
                    }`}
                    onClick={() => seekTo(tag.offsetMs)}
                  >
                    {/* Timestamp */}
                    <div className="text-xs font-mono text-muted-foreground min-w-[48px] pt-0.5">
                      {formatMs(tag.offsetMs)}
                    </div>

                    {/* Tag badge */}
                    <Badge variant="outline" className={`text-xs shrink-0 ${getTagColor(tag.tagType)}`}>
                      {getCategoryIcon(tag.category)}
                      <span className="ml-1">{tag.tagType.replace("auto_", "")}</span>
                    </Badge>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{tag.label}</p>
                      {tag.snippet && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">"{tag.snippet}"</p>
                      )}
                      {tag.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{tag.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        {tag.speakerRole && (
                          <span className="text-xs text-muted-foreground capitalize">
                            <User className="h-3 w-3 inline mr-0.5" />{tag.speakerRole}
                          </span>
                        )}
                        {tag.confidence != null && (
                          <span className="text-xs text-muted-foreground">
                            {Math.round(tag.confidence * 100)}% conf
                          </span>
                        )}
                        {tag.importance != null && tag.importance >= 7 && (
                          <Badge variant="outline" className="text-xs h-4 bg-amber-500/10 text-amber-500 border-amber-500/30">
                            High priority
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleBookmarkMutation.mutate({ tagId: tag.id, isBookmarked: !(tag.isBookmarked === 1) });
                        }}
                      >
                        <Bookmark className={`h-3 w-3 ${tag.isBookmarked === 1 ? "fill-yellow-500 text-yellow-500" : ""}`} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteTagMutation.mutate(tag.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Right Panel: Transcript + AI Q&A */}
        <div className="w-[420px] flex flex-col">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="w-full rounded-none border-b justify-start px-2">
              <TabsTrigger value="timeline" className="text-xs">
                <FileText className="h-3.5 w-3.5 mr-1" />Transcript
              </TabsTrigger>
              <TabsTrigger value="qa" className="text-xs">
                <Brain className="h-3.5 w-3.5 mr-1" />Q&A
              </TabsTrigger>
              <TabsTrigger value="providers" className="text-xs">
                <Mic className="h-3.5 w-3.5 mr-1" />Providers
              </TabsTrigger>
              <TabsTrigger value="insights" className="text-xs">
                <BarChart3 className="h-3.5 w-3.5 mr-1" />Insights
              </TabsTrigger>
              <TabsTrigger value="recordings" className="text-xs">
                <HardDrive className="h-3.5 w-3.5 mr-1" />Recordings
              </TabsTrigger>
            </TabsList>

            {/* Transcript Tab */}
            <TabsContent value="timeline" className="flex-1 m-0 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="p-4 space-y-3">
                  {transcripts.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No transcript available</p>
                    </div>
                  ) : (
                    transcripts.map((seg) => (
                      <div
                        key={seg.id}
                        className={`flex gap-3 p-2 rounded-lg cursor-pointer transition-colors hover:bg-muted/50 ${
                          activeSegment?.id === seg.id ? "bg-primary/10 ring-1 ring-primary/30" : ""
                        }`}
                        onClick={() => seg.startTime != null && seekTo(seg.startTime)}
                      >
                        <div className="text-xs font-mono text-muted-foreground min-w-[40px] pt-1">
                          {seg.startTime != null ? formatMs(seg.startTime) : ""}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-1 mb-0.5">
                            <span className={`text-xs font-medium capitalize ${
                              seg.speakerRole === "candidate" ? "text-blue-400" :
                              seg.speakerRole === "interviewer" ? "text-green-400" :
                              "text-purple-400"
                            }`}>
                              {seg.speakerRole}
                            </span>
                            {seg.sentiment && seg.sentiment !== "neutral" && (
                              <Badge variant="outline" className={`text-xs h-4 ${
                                seg.sentiment === "positive" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
                              }`}>
                                {seg.sentiment}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm">{seg.text}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Q&A Tab */}
            <TabsContent value="qa" className="flex-1 m-0 flex flex-col overflow-hidden">
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-4">
                  <div className="text-sm text-muted-foreground">
                    Ask questions about this interview. The AI will analyze the transcript and provide answers with relevant timestamps.
                  </div>

                  {/* Quick Actions */}
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-auto py-2 justify-start"
                      onClick={() => {
                        setQaQuestion("What were the candidate's main strengths?");
                        askQuestionMutation.mutate("What were the candidate's main strengths?");
                      }}
                      disabled={askQuestionMutation.isPending}
                    >
                      <ThumbsUp className="h-3 w-3 mr-1 shrink-0" />
                      Strengths
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-auto py-2 justify-start"
                      onClick={() => {
                        setQaQuestion("What concerns or red flags came up?");
                        askQuestionMutation.mutate("What concerns or red flags came up?");
                      }}
                      disabled={askQuestionMutation.isPending}
                    >
                      <AlertTriangle className="h-3 w-3 mr-1 shrink-0" />
                      Concerns
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-auto py-2 justify-start"
                      onClick={() => {
                        setQaQuestion("Summarize the candidate's technical skills");
                        askQuestionMutation.mutate("Summarize the candidate's technical skills");
                      }}
                      disabled={askQuestionMutation.isPending}
                    >
                      <Zap className="h-3 w-3 mr-1 shrink-0" />
                      Technical
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-auto py-2 justify-start"
                      onClick={() => {
                        setQaQuestion("What follow-up questions should we ask?");
                        askQuestionMutation.mutate("What follow-up questions should we ask?");
                      }}
                      disabled={askQuestionMutation.isPending}
                    >
                      <ListChecks className="h-3 w-3 mr-1 shrink-0" />
                      Follow-ups
                    </Button>
                  </div>

                  <Separator />

                  {/* Analysis History */}
                  {analysisHistory.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-medium text-muted-foreground uppercase">Analysis History</h4>
                      {analysisHistory.map((item: any) => (
                        <Card key={item.id} className="bg-muted/30">
                          <CardContent className="p-3">
                            {item.question && (
                              <p className="text-xs font-medium text-primary mb-1">Q: {item.question}</p>
                            )}
                            <p className="text-sm whitespace-pre-wrap">{item.answer}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline" className="text-xs h-4">{item.analysisType}</Badge>
                              {item.confidence != null && (
                                <span className="text-xs text-muted-foreground">{Math.round(item.confidence * 100)}% confidence</span>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}

                  {askQuestionMutation.isPending && (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      <span className="text-sm text-muted-foreground">Analyzing transcript...</span>
                    </div>
                  )}

                  {askQuestionMutation.data && !askQuestionMutation.isPending && (
                    <Card className="bg-primary/5 border-primary/20">
                      <CardContent className="p-3">
                        <p className="text-xs font-medium text-primary mb-1">Q: {askQuestionMutation.data.question}</p>
                        <p className="text-sm whitespace-pre-wrap">{askQuestionMutation.data.answer}</p>
                        {askQuestionMutation.data.relevantSegments?.length > 0 && (
                          <div className="mt-2 space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">Relevant moments:</p>
                            {askQuestionMutation.data.relevantSegments.map((seg: any, i: number) => (
                              <Button
                                key={i}
                                variant="ghost"
                                size="sm"
                                className="text-xs h-auto py-1 w-full justify-start"
                                onClick={() => seekTo(seg.startMs)}
                              >
                                <Clock className="h-3 w-3 mr-1" />
                                {formatMs(seg.startMs)} — "{seg.text?.slice(0, 60)}..."
                              </Button>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </div>
              </ScrollArea>

              {/* Q&A Input */}
              <div className="border-t p-3">
                <form
                  className="flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (qaQuestion.trim()) {
                      askQuestionMutation.mutate(qaQuestion.trim());
                    }
                  }}
                >
                  <Input
                    placeholder="Ask about this interview..."
                    value={qaQuestion}
                    onChange={(e) => setQaQuestion(e.target.value)}
                    className="text-sm"
                    disabled={askQuestionMutation.isPending}
                  />
                  <Button type="submit" size="icon" disabled={!qaQuestion.trim() || askQuestionMutation.isPending}>
                    {askQuestionMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </form>
              </div>
            </TabsContent>

            {/* Providers Tab */}
            <TabsContent value="providers" className="flex-1 m-0 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="p-4 space-y-4">
                  <h4 className="text-sm font-medium">Transcript Providers</h4>
                  <div className="grid gap-3">
                    {["assemblyai", "deepgram", "whisper", "hume"].map((provider) => {
                      const isAvailable = providerStatus?.providers?.[provider];
                      const job = transcriptJobs.find((j) => j.provider === provider);
                      return (
                        <Card key={provider} className={`${isAvailable ? "" : "opacity-50"}`}>
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className={`h-2 w-2 rounded-full ${isAvailable ? "bg-green-500" : "bg-gray-500"}`} />
                                <span className="text-sm font-medium capitalize">{provider}</span>
                              </div>
                              {job && (
                                <Badge variant="outline" className={`text-xs ${
                                  job.status === "completed" ? "bg-green-500/10 text-green-400" :
                                  job.status === "failed" ? "bg-red-500/10 text-red-400" :
                                  "bg-yellow-500/10 text-yellow-400"
                                }`}>
                                  {job.status}
                                </Badge>
                              )}
                            </div>
                            {job && job.status === "completed" && (
                              <div className="mt-2 text-xs text-muted-foreground">
                                {job.wordCount && <span>{job.wordCount} words</span>}
                                {job.segmentCount && <span> · {job.segmentCount} segments</span>}
                              </div>
                            )}
                            {!isAvailable && (
                              <p className="text-xs text-muted-foreground mt-1">API key not configured</p>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>

                  <Separator />

                  <h4 className="text-sm font-medium">Transcript Jobs</h4>
                  {transcriptJobs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No transcript jobs yet</p>
                  ) : (
                    <div className="space-y-2">
                      {transcriptJobs.map((job) => (
                        <div key={job.id} className="flex items-center justify-between p-2 rounded border">
                          <div>
                            <span className="text-sm capitalize">{job.provider}</span>
                            <p className="text-xs text-muted-foreground">
                              {job.completedAt ? format(new Date(job.completedAt), "MMM d, HH:mm") : "In progress..."}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-xs">{job.status}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Insights Tab */}
            <TabsContent value="insights" className="flex-1 m-0 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="p-4 space-y-4">
                  <h4 className="text-sm font-medium">Tag Statistics</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <Card>
                      <CardContent className="p-3 text-center">
                        <p className="text-2xl font-bold">{tags.length}</p>
                        <p className="text-xs text-muted-foreground">Total Tags</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-3 text-center">
                        <p className="text-2xl font-bold">{tags.filter(t => t.tagSource === "manual").length}</p>
                        <p className="text-xs text-muted-foreground">Manual Tags</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-3 text-center">
                        <p className="text-2xl font-bold">{tags.filter(t => t.category === "red_flag").length}</p>
                        <p className="text-xs text-muted-foreground">Red Flags</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-3 text-center">
                        <p className="text-2xl font-bold">{tags.filter(t => t.category === "positive_signal").length}</p>
                        <p className="text-xs text-muted-foreground">Positive Signals</p>
                      </CardContent>
                    </Card>
                  </div>

                  <Separator />

                  <h4 className="text-sm font-medium">Tag Types Breakdown</h4>
                  <div className="space-y-1">
                    {Object.entries(
                      tags.reduce<Record<string, number>>((acc, t) => {
                        acc[t.tagType] = (acc[t.tagType] || 0) + 1;
                        return acc;
                      }, {})
                    ).sort(([, a], [, b]) => b - a).map(([type, count]) => (
                      <div key={type} className="flex items-center justify-between py-1">
                        <Badge variant="outline" className={`text-xs ${getTagColor(type)}`}>
                          {type.replace("auto_", "")}
                        </Badge>
                        <span className="text-sm">{count}</span>
                      </div>
                    ))}
                  </div>

                  {tags.some(t => t.dominantEmotion) && (
                    <>
                      <Separator />
                      <h4 className="text-sm font-medium">Detected Emotions</h4>
                      <div className="space-y-1">
                        {Object.entries(
                          tags
                            .filter(t => t.dominantEmotion)
                            .reduce<Record<string, number>>((acc, t) => {
                              acc[t.dominantEmotion!] = (acc[t.dominantEmotion!] || 0) + 1;
                              return acc;
                            }, {})
                        ).sort(([, a], [, b]) => b - a).map(([emotion, count]) => (
                          <div key={emotion} className="flex items-center justify-between py-1">
                            <span className="text-sm capitalize">{emotion}</span>
                            <span className="text-sm text-muted-foreground">{count}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  <Separator />
                  <h4 className="text-sm font-medium">High Priority Moments</h4>
                  {tags
                    .filter(t => (t.importance || 0) >= 7)
                    .sort((a, b) => (b.importance || 0) - (a.importance || 0))
                    .slice(0, 5)
                    .map((tag) => (
                      <Button
                        key={tag.id}
                        variant="ghost"
                        className="w-full justify-start text-left h-auto py-2"
                        onClick={() => seekTo(tag.offsetMs)}
                      >
                        <Clock className="h-3 w-3 mr-2 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm truncate">{tag.label}</p>
                          <p className="text-xs text-muted-foreground">{formatMs(tag.offsetMs)} · Importance: {tag.importance}/10</p>
                        </div>
                      </Button>
                    ))
                  }
                  {tags.filter(t => (t.importance || 0) >= 7).length === 0 && (
                    <p className="text-sm text-muted-foreground">No high-priority tags found. Run Auto-Tag to generate them.</p>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Recordings Tab */}
            <TabsContent value="recordings" className="flex-1 m-0 flex flex-col overflow-hidden">
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-3">
                  {recordings.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <HardDrive className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No recordings available</p>
                      <p className="text-xs mt-1">Upload an audio or video recording to get started</p>
                    </div>
                  ) : (
                    recordings.map((rec: any) => (
                      <Card key={rec.id} className="bg-muted/30">
                        <CardContent className="p-3">
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5">
                              {rec.recordingType === "video" ? (
                                <Video className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <Mic className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">
                                {rec.recordingType === "video" ? "Video" : "Audio"} Recording
                              </p>
                              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                {rec.duration != null && <span>{formatDurationSec(rec.duration)}</span>}
                                {rec.fileSize != null && <span>{formatFileSize(rec.fileSize)}</span>}
                                {rec.createdAt && <span>{format(new Date(rec.createdAt), "MMM d, HH:mm")}</span>}
                              </div>
                              <div className="mt-1">
                                <Badge variant="outline" className={`text-xs ${
                                  rec.transcriptionStatus === "completed" ? "bg-green-500/10 text-green-400 border-green-500/30" :
                                  rec.transcriptionStatus === "processing" ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/30" :
                                  rec.transcriptionStatus === "failed" ? "bg-red-500/10 text-red-400 border-red-500/30" :
                                  "bg-gray-500/10 text-gray-400 border-gray-500/30"
                                }`}>
                                  {rec.transcriptionStatus || "pending"}
                                </Badge>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => {
                                  if (audioRef.current && rec.mediaUrl) {
                                    audioRef.current.src = rec.mediaUrl;
                                    audioRef.current.load();
                                    setIsPlaying(false);
                                    setCurrentTimeMs(0);
                                    toast({ title: "Recording loaded", description: "Ready to play" });
                                  }
                                }}
                              >
                                <Play className="h-3 w-3 mr-1" />Load
                              </Button>
                              {rec.mediaUrl && (
                                <a href={rec.mediaUrl} download>
                                  <Button variant="ghost" size="icon" className="h-7 w-7">
                                    <Download className="h-3.5 w-3.5" />
                                  </Button>
                                </a>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>

              {/* Upload Section */}
              <div className="border-t p-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*,video/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      uploadRecordingMutation.mutate(file);
                      e.target.value = "";
                    }
                  }}
                />
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadRecordingMutation.isPending}
                >
                  {uploadRecordingMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  {uploadRecordingMutation.isPending ? "Uploading..." : "Upload Recording"}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Add Tag Dialog */}
      <Dialog open={showAddTag} onOpenChange={setShowAddTag}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Manual Tag</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Timestamp</label>
              <p className="text-sm text-muted-foreground">{formatMs(currentTimeMs)}</p>
            </div>
            <div>
              <label className="text-sm font-medium">Label</label>
              <Input
                value={newTagLabel}
                onChange={(e) => setNewTagLabel(e.target.value)}
                placeholder="Tag label..."
              />
            </div>
            <div>
              <label className="text-sm font-medium">Type</label>
              <Select value={newTagType} onValueChange={setNewTagType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual Note</SelectItem>
                  <SelectItem value="bookmark">Bookmark</SelectItem>
                  <SelectItem value="flag">Flag/Concern</SelectItem>
                  <SelectItem value="highlight">Highlight</SelectItem>
                  <SelectItem value="question">Question</SelectItem>
                  <SelectItem value="answer">Answer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Notes</label>
              <Textarea
                value={newTagNotes}
                onChange={(e) => setNewTagNotes(e.target.value)}
                placeholder="Additional notes..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddTag(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (!newTagLabel.trim()) return;
                createTagMutation.mutate({
                  tagTime: new Date().toISOString(),
                  offsetMs: Math.round(currentTimeMs),
                  tagType: newTagType,
                  label: newTagLabel.trim(),
                  notes: newTagNotes.trim() || undefined,
                  category: newTagType === "flag" ? "red_flag" : newTagType === "highlight" ? "positive_signal" : undefined,
                  importance: newTagType === "flag" ? 8 : 5,
                });
              }}
              disabled={!newTagLabel.trim() || createTagMutation.isPending}
            >
              {createTagMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Add Tag
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
