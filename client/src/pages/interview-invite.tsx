import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mic, MicOff, PhoneOff, Loader2, CheckCircle2, AlertCircle, Volume2, Video, MessageSquare } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import axios from "axios";
import DailyIframe, { DailyCall } from "@daily-co/daily-js";

type Transcript = {
  role: "user" | "ai";
  text: string;
  emotion?: string;
};

type InterviewSession = {
  id: string;
  token: string;
  status: string;
  prompt?: string;
  candidateId?: string;
  jobTitle?: string;
};

// Hume EVI audio constants
const INPUT_SAMPLE_RATE = 16000;

export default function InterviewInvite() {
  const { token } = useParams<{ token: string }>();
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [candidateName, setCandidateName] = useState<string>("");
  const [interviewStage, setInterviewStage] = useState<'voice' | 'video'>('voice');
  const [state, setState] = useState<"loading" | "ready" | "listening" | "processing" | "speaking" | "completed" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [currentEmotion, setCurrentEmotion] = useState<string>("Neutral");
  const [isConnected, setIsConnected] = useState(false);
  const [duration, setDuration] = useState(0);

  // Video interview state
  const [videoSessionUrl, setVideoSessionUrl] = useState<string | null>(null);
  const [videoConversationId, setVideoConversationId] = useState<string | null>(null);
  const [videoInterviewId, setVideoInterviewId] = useState<string | null>(null);
  const [isVideoActive, setIsVideoActive] = useState(false);
  const [isCreatingVideoSession, setIsCreatingVideoSession] = useState(false);
  const [videoTranscripts, setVideoTranscripts] = useState<Transcript[]>([]);
  const [postInterviewStatus, setPostInterviewStatus] = useState<"idle" | "scoring" | "scored" | "error">("idle");
  const dailyCallRef = useRef<DailyCall | null>(null);
  const videoContainerRef = useRef<HTMLDivElement | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const captureContextRef = useRef<AudioContext | null>(null);
  const playbackContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const stateRef = useRef(state);
  const audioQueueRef = useRef<AudioBuffer[]>([]);
  const isPlayingRef = useRef(false);
  const endedRef = useRef(false);
  const assistantEndRef = useRef(false);
  const isMutedRef = useRef(false);
  const transcriptsRef = useRef<Transcript[]>([]);
  const humeChatIdRef = useRef<string | null>(null);

  // Keep refs in sync with state
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    transcriptsRef.current = transcripts;
  }, [transcripts]);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const response = await axios.get(`/api/public/interview-session/${token}`);
        setSession(response.data.session);
        setCandidateName(response.data.candidate?.fullName || "");
        setInterviewStage(response.data.stage || 'voice');
        setState("ready");
      } catch (error: any) {
        console.error("Error fetching session:", error);
        setErrorMessage(error.response?.data?.message || "Failed to load interview");
        setState("error");
      }
    };

    if (token) {
      fetchSession();
    }
  }, [token]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if ((isConnected || isVideoActive) && startTimeRef.current) {
      interval = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current!) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isConnected, isVideoActive]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // ==================== VIDEO INTERVIEW (TAVUS) ====================

  const startVideoInterview = async () => {
    try {
      setIsCreatingVideoSession(true);
      setState("loading");

      const response = await axios.post(`/api/public/interview-session/${token}/video-session`);
      const { sessionUrl, conversationId, interviewId } = response.data;

      setVideoSessionUrl(sessionUrl);
      setVideoConversationId(conversationId);
      setVideoInterviewId(interviewId);
      setVideoTranscripts([]);

      // Create Daily.co frame embedded in the container — renders the Tavus avatar video
      const call = DailyIframe.createFrame(videoContainerRef.current!, {
        iframeStyle: {
          width: "100%",
          height: "100%",
          border: "none",
          borderRadius: "1rem",
        },
        showLeaveButton: false,
        showFullscreenButton: true,
      });
      dailyCallRef.current = call;

      // Listen for real-time transcript via app-message events
      call.on("app-message", (event: any) => {
        try {
          const data = event?.data;
          if (!data) return;
          const eventType = data.event_type || data.type;

          if (eventType === "conversation.utterance" || eventType === "conversation.echo") {
            const role = data.properties?.role || data.role;
            const text = data.properties?.text || data.properties?.speech || data.text || data.speech || "";
            if (text && text.trim()) {
              const elapsed = startTimeRef.current ? Math.round((Date.now() - startTimeRef.current) / 1000) : undefined;
              const mappedRole: "user" | "ai" = (role === "user" || role === "candidate") ? "user" : "ai";
              setVideoTranscripts(prev => [...prev, { role: mappedRole, text: text.trim(), timestamp: elapsed }]);
            }
          } else if (eventType === "conversation.user.stopped_speaking" || eventType === "user_message") {
            const text = data.properties?.transcript || data.properties?.text || data.transcript || data.text || "";
            if (text && text.trim()) {
              const elapsed = startTimeRef.current ? Math.round((Date.now() - startTimeRef.current) / 1000) : undefined;
              setVideoTranscripts(prev => [...prev, { role: "user", text: text.trim(), timestamp: elapsed }]);
            }
          } else if (eventType === "conversation.replica.started_speaking" || eventType === "assistant_message") {
            const text = data.properties?.text || data.properties?.speech || data.text || data.speech || "";
            if (text && text.trim()) {
              const elapsed = startTimeRef.current ? Math.round((Date.now() - startTimeRef.current) / 1000) : undefined;
              setVideoTranscripts(prev => [...prev, { role: "ai", text: text.trim(), timestamp: elapsed }]);
            }
          }
        } catch (err) {
          console.error("[Tavus] Error processing app-message:", err);
        }
      });

      // Join the Tavus conversation room
      await call.join({ url: sessionUrl });

      setIsVideoActive(true);
      startTimeRef.current = Date.now();
      setState("listening");
      toast.success("Video interview started! You'll be speaking with Charles Molapisi, Group CTIO at MTN.");
    } catch (error: any) {
      console.error("Error starting video interview:", error);
      setErrorMessage(error.response?.data?.message || "Failed to start video interview");
      setState("error");
      // Clean up Daily call on error
      if (dailyCallRef.current) {
        try { await dailyCallRef.current.destroy(); } catch {}
        dailyCallRef.current = null;
      }
    } finally {
      setIsCreatingVideoSession(false);
    }
  };

  const endVideoInterview = async () => {
    // Leave Daily call
    if (dailyCallRef.current) {
      try { await dailyCallRef.current.leave(); } catch {}
      try { await dailyCallRef.current.destroy(); } catch {}
      dailyCallRef.current = null;
    }

    setIsVideoActive(false);
    setVideoSessionUrl(null);
    setPostInterviewStatus("scoring");

    const interviewDuration = startTimeRef.current ? Math.floor((Date.now() - startTimeRef.current) / 1000) : 0;

    // Map transcripts for server (same pattern as Hume voice)
    const mappedTranscripts = videoTranscripts.map((t) => ({
      role: t.role === "user" ? "candidate" : "ai",
      text: t.text,
      emotion: t.emotion,
      timestamp: t.timestamp,
    }));

    try {
      await axios.post(`/api/public/interview-session/${token}/complete`, {
        transcripts: mappedTranscripts,
        duration: interviewDuration,
        emotionAnalysis: {},
        tavusConversationId: videoConversationId,
        tavusInterviewId: videoInterviewId,
      });
      setPostInterviewStatus("scored");
      toast.success("Interview scored successfully!");
    } catch (err) {
      console.error("Error completing video interview:", err);
      setPostInterviewStatus("error");
      toast.error("Interview ended, but there was an issue saving. The recruiter can still access your session.");
    }

    setState("completed");
  };

  // ==================== VOICE INTERVIEW (HUME) ====================

  // Convert Float32 PCM samples to base64-encoded Int16 PCM
  const float32ToBase64PCM = (float32Data: Float32Array): string => {
    const int16Data = new Int16Array(float32Data.length);
    for (let i = 0; i < float32Data.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Data[i]));
      int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    const uint8Data = new Uint8Array(int16Data.buffer);
    let binaryStr = '';
    for (let i = 0; i < uint8Data.length; i++) {
      binaryStr += String.fromCharCode(uint8Data[i]);
    }
    return btoa(binaryStr);
  };

  // Play next audio chunk from queue
  const playNextInQueue = useCallback(() => {
    if (audioQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      // Only transition to listening if assistant_end was received (AI fully done)
      if (assistantEndRef.current && stateRef.current !== "completed" && stateRef.current !== "error") {
        setState("listening");
        isMutedRef.current = false;
      }
      return;
    }

    isPlayingRef.current = true;
    const buffer = audioQueueRef.current.shift()!;

    if (!playbackContextRef.current || playbackContextRef.current.state === "closed") {
      playbackContextRef.current = new AudioContext();
    }
    const ctx = playbackContextRef.current;

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.onended = () => playNextInQueue();
    source.start();
  }, []);

  // Decode base64 WAV audio and queue for playback
  const playAudio = useCallback((base64Audio: string) => {
    try {
      const binaryString = atob(base64Audio);
      const arrayBuffer = new ArrayBuffer(binaryString.length);
      const view = new Uint8Array(arrayBuffer);
      for (let i = 0; i < binaryString.length; i++) {
        view[i] = binaryString.charCodeAt(i);
      }

      if (!playbackContextRef.current || playbackContextRef.current.state === "closed") {
        playbackContextRef.current = new AudioContext();
      }

      // Use decodeAudioData to properly handle WAV container format
      playbackContextRef.current.decodeAudioData(arrayBuffer, (decodedBuffer) => {
        audioQueueRef.current.push(decodedBuffer);
        if (!isPlayingRef.current) {
          playNextInQueue();
        }
      }, (err) => {
        console.error("Error decoding audio data:", err);
      });
    } catch (error) {
      console.error("Error decoding audio:", error);
    }
  }, [playNextInQueue]);

  const startInterview = async () => {
    try {
      setState("loading");
      endedRef.current = false;
      audioQueueRef.current = [];
      isPlayingRef.current = false;

      const configResponse = await axios.get(`/api/public/interview-session/${token}/config`);
      const { accessToken, configId, prompt } = configResponse.data;

      // Include config_id in WebSocket URL so Hume uses the pre-loaded config
      let wsUrl = `wss://api.hume.ai/v0/evi/chat?access_token=${accessToken}`;
      if (configId) {
        wsUrl += `&config_id=${configId}`;
      }
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setIsConnected(true);
        startTimeRef.current = Date.now();
        setState("processing"); // AI is preparing to speak
        assistantEndRef.current = false;

        // Always send the interview prompt via session_settings to ensure it's applied
        const defaultPrompt = `You are an HR interviewer conducting a screening interview. You have exactly 12 minutes.

TIME MANAGEMENT (STRICT):
- Introduction under 20 seconds: your name, the company, the role, that it takes 12 minutes, then your first question.
- Between questions: one brief acknowledgment sentence (under 10 seconds), then immediately ask the next question. Do NOT summarize or repeat what the candidate said.
- 6–8 questions total. After question 5, if time feels short, skip to your most important remaining question and close.
- If a candidate runs over 90 seconds, wait for a pause and say: "Thanks — let me move us to the next question."

TURN-TAKING:
- After asking a question, remain silent until the candidate is clearly done.
- Allow 3 seconds of silence before assuming they are finished.
- Never interrupt mid-sentence.

CLOSING (CRITICAL):
- After all questions, thank the candidate, say the team will be in touch, and wish them well.
- Then remain silent. Do NOT disconnect. Let the candidate end the call.`;

        const sessionSettings = {
          type: "session_settings",
          system_prompt: prompt || defaultPrompt,
          audio: {
            channels: 1,
            encoding: "linear16",
            sample_rate: INPUT_SAMPLE_RATE,
          },
          custom_session_id: `interview-${token}`
        };
        ws.send(JSON.stringify(sessionSettings));

        // Send an initial text message to prompt the AI to begin speaking.
        // Hume's session_settings alone won't trigger the AI's opening greeting.
        setTimeout(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: "user_input",
              text: "Hello, I'm ready to begin the interview."
            }));
          }
        }, 500);

        // Start microphone to begin streaming audio
        startMicrophone(ws);

        toast.success("Connected! The interviewer will begin shortly.");
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          if (message.type === "chat_metadata") {
            console.log("Hume chat_metadata received:", message);
            if (message.chat_id) {
              humeChatIdRef.current = message.chat_id;
              console.log("Hume chat ID captured:", message.chat_id);
            }
          } else if (message.type === "assistant_message") {
            setState("speaking");
            isMutedRef.current = true;
            assistantEndRef.current = false;
            if (message.message?.content) {
              setTranscripts(prev => [...prev, {
                role: "ai",
                text: message.message.content,
                emotion: message.models?.prosody?.scores?.[0]?.name || "Neutral"
              }]);
              setCurrentEmotion(message.models?.prosody?.scores?.[0]?.name || "Neutral");
            }
          } else if (message.type === "user_message") {
            if (message.message?.content) {
              setTranscripts(prev => [...prev, {
                role: "user",
                text: message.message.content
              }]);
            }
            setState("processing");
          } else if (message.type === "audio_output") {
            if (message.data) {
              setState("speaking");
              isMutedRef.current = true; // Mute mic while AI speaks
              assistantEndRef.current = false;
              playAudio(message.data);
            }
          } else if (message.type === "assistant_end") {
            // AI finished generating — transition to listening once audio queue drains
            assistantEndRef.current = true;
            if (!isPlayingRef.current) {
              setState("listening");
              isMutedRef.current = false;
            }
          } else if (message.type === "error") {
            console.error("Hume AI error:", message);
            toast.error(`Interview error: ${message.message || 'Unknown error'}`);
          }
        } catch (err) {
          console.error("Error parsing message:", err);
        }
      };

      ws.onclose = (event) => {
        console.log("WebSocket closed:", event.code, event.reason);
        setIsConnected(false);
        if (endedRef.current || stateRef.current === "completed" || stateRef.current === "error") {
          return; // Already handled
        }

        // If interview was in progress (we have transcripts), complete it gracefully
        // rather than bouncing back to the start screen
        if (transcriptsRef.current.length > 0) {
          endedRef.current = true;
          setState("completed");
          // Save results
          axios.post(`/api/public/interview-session/${token}/complete`, {
            transcripts: transcriptsRef.current,
            duration: startTimeRef.current ? Math.floor((Date.now() - startTimeRef.current) / 1000) : 0,
            emotionAnalysis: { lastEmotion: currentEmotion },
            humeChatId: humeChatIdRef.current,
          }).then(() => {
            toast.success("Interview completed successfully!");
          }).catch((err) => {
            console.error("Error saving interview:", err);
          });
        } else {
          setState("ready");
          toast.info("Connection ended. Click Start Interview to reconnect.");
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        if (!endedRef.current) {
          toast.error("Connection error. Please try again.");
          setState("error");
          setErrorMessage("Failed to connect to voice service");
        }
      };

      socketRef.current = ws;

    } catch (error: any) {
      console.error("Error starting interview:", error);
      setErrorMessage(error.response?.data?.message || "Failed to start interview");
      setState("error");
    }
  };

  const startMicrophone = async (ws: WebSocket) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      streamRef.current = stream;

      const audioContext = new AudioContext({ sampleRate: INPUT_SAMPLE_RATE });
      captureContextRef.current = audioContext;

      // Resume context if suspended (browser autoplay policy)
      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }

      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      source.connect(processor);
      processor.connect(audioContext.destination);

      processor.onaudioprocess = (event) => {
        if (ws.readyState !== WebSocket.OPEN) return;
        // Mute microphone while AI is speaking to prevent echo and interruptions
        if (isMutedRef.current) return;

        const float32Data = event.inputBuffer.getChannelData(0);
        const base64Audio = float32ToBase64PCM(float32Data);

        ws.send(JSON.stringify({
          type: "audio_input",
          data: base64Audio,
        }));
      };
    } catch (error) {
      console.error("Error accessing microphone:", error);
      toast.error("Please allow microphone access to continue");
      setState("error");
      setErrorMessage("Microphone access is required for the interview");
    }
  };

  const cleanup = () => {
    // Stop microphone
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (captureContextRef.current && captureContextRef.current.state !== "closed") {
      captureContextRef.current.close().catch(() => {});
      captureContextRef.current = null;
    }

    // Clear audio queue
    audioQueueRef.current = [];
    isPlayingRef.current = false;

    // Close WebSocket
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
  };

  const endInterview = async () => {
    endedRef.current = true;
    cleanup();
    setIsConnected(false);
    setState("completed");

    try {
      await axios.post(`/api/public/interview-session/${token}/complete`, {
        transcripts,
        duration,
        emotionAnalysis: { lastEmotion: currentEmotion },
        humeChatId: humeChatIdRef.current,
      });
      toast.success("Interview completed successfully!");
    } catch (error) {
      console.error("Error saving interview:", error);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      endedRef.current = true;
      cleanup();
    };
  }, []);

  // ==================== SHARED UI STATES ====================

  if (state === "loading" && !session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-card/80 backdrop-blur border-border dark:border-white/10">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-foreground dark:text-foreground mb-4" />
            <p className="text-muted-foreground">Loading your interview...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-red-900/20 to-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-card/80 backdrop-blur border-border dark:border-white/10">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">Unable to Load Interview</h2>
            <p className="text-muted-foreground text-center mb-4">{errorMessage}</p>
            <Button
              variant="outline"
              onClick={() => { setState("ready"); setErrorMessage(""); }}
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (state === "completed") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-green-900/20 to-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-card/80 backdrop-blur border-border dark:border-white/10">
          <CardContent className="flex flex-col items-center justify-center py-12">
            {/* Post-interview processing status for video */}
            {interviewStage === 'video' && postInterviewStatus === "scoring" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center"
              >
                <Loader2 className="h-16 w-16 text-blue-400 mb-4 animate-spin" />
                <h2 className="text-2xl font-bold text-foreground mb-2">Analyzing Your Interview...</h2>
                <p className="text-muted-foreground text-center mb-6">
                  Our AI is reviewing your responses and generating scores. This usually takes a few seconds.
                </p>
                <div className="w-full space-y-3">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-400" />
                    <span className="text-sm text-foreground">Interview transcript captured ({videoTranscripts.length} exchanges)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-5 w-5 text-blue-400 animate-spin" />
                    <span className="text-sm text-foreground">Scoring technical skills, communication & culture fit...</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30" />
                    <span className="text-sm text-muted-foreground">Video recording processing in background</span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Scored successfully */}
            {(interviewStage !== 'video' || postInterviewStatus === "scored" || postInterviewStatus === "idle") && (
              <>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 10 }}
                >
                  <CheckCircle2 className="h-16 w-16 text-green-400 mb-4" />
                </motion.div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Interview Complete!</h2>
                <p className="text-muted-foreground text-center mb-4">
                  Thank you for completing the {interviewStage === 'video' ? 'video' : 'voice'} interview. The recruiter will review your responses and be in touch soon.
                </p>
                {interviewStage === 'video' && postInterviewStatus === "scored" && (
                  <div className="w-full space-y-3 mb-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-400" />
                      <span className="text-sm text-foreground">Interview scored successfully</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Loader2 className="h-5 w-5 text-blue-400 animate-spin" />
                      <span className="text-sm text-muted-foreground">Video recording being saved in background</span>
                    </div>
                  </div>
                )}
                {duration > 0 && (
                  <p className="text-sm text-muted-foreground">
                    Duration: {formatDuration(duration)}
                  </p>
                )}
              </>
            )}

            {/* Error state */}
            {interviewStage === 'video' && postInterviewStatus === "error" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center"
              >
                <AlertCircle className="h-16 w-16 text-yellow-400 mb-4" />
                <h2 className="text-2xl font-bold text-foreground mb-2">Interview Ended</h2>
                <p className="text-muted-foreground text-center mb-4">
                  There was an issue submitting your analysis, but don't worry — the recruiter can still access your session and video recording.
                </p>
                {duration > 0 && (
                  <p className="text-sm text-muted-foreground">
                    Duration: {formatDuration(duration)}
                  </p>
                )}
              </motion.div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ==================== VIDEO INTERVIEW UI (TAVUS) ====================

  if (interviewStage === 'video') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex flex-col">
        <header className="p-4 border-b border-border dark:border-white/10 bg-background/50 backdrop-blur">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-muted/20 flex items-center justify-center">
                <Video className="w-4 h-4 text-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">Video Interview</h1>
                {candidateName && <p className="text-sm text-muted-foreground">{candidateName}</p>}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {isVideoActive && (
                <Badge variant="outline" className="border-border/50 text-foreground">
                  {formatDuration(duration)}
                </Badge>
              )}
              {isVideoActive && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 rounded-full border border-green-500/30">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-xs text-green-400">Live</span>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 flex flex-col max-w-5xl mx-auto w-full p-4">
          {!isVideoActive ? (
            <Card className="flex-1 bg-card/50 backdrop-blur border-border dark:border-white/10 flex flex-col items-center justify-center">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl text-foreground">Video Interview with MTN</CardTitle>
                <CardDescription className="text-muted-foreground max-w-md">
                  You'll be speaking with Charles Molapisi, Group Chief Technology and Information Officer at MTN.
                  This is a video interview — please ensure your camera and microphone are ready.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-6">
                <div className="w-32 h-32 rounded-full bg-muted/20 border-2 border-border/50 flex items-center justify-center">
                  <Video className="h-12 w-12 text-foreground dark:text-foreground" />
                </div>
                {session?.jobTitle && (
                  <Badge variant="outline" className="text-sm px-4 py-1">
                    Position: {session.jobTitle}
                  </Badge>
                )}
                <div className="text-center text-sm text-muted-foreground space-y-1">
                  <p>Ensure you're in a well-lit, quiet environment</p>
                  <p>Allow camera and microphone access when prompted</p>
                  <p>The interview will last approximately 20-25 minutes</p>
                </div>
                <Button
                  size="lg"
                  onClick={startVideoInterview}
                  disabled={isCreatingVideoSession}
                  className="bg-muted hover:bg-muted text-white px-8"
                  data-testid="btn-start-video-interview"
                >
                  {isCreatingVideoSession ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Video className="h-5 w-5 mr-2" />
                      Start Video Interview
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="flex-1 flex gap-4 min-h-[500px]">
                {/* Daily.co video container */}
                <div
                  ref={videoContainerRef}
                  className="flex-1 relative rounded-2xl border border-border dark:border-white/10 shadow-2xl overflow-hidden bg-black"
                  style={{ minHeight: "500px" }}
                  data-testid="tavus-video-container"
                />

                {/* Live transcript sidebar */}
                {videoTranscripts.length > 0 && (
                  <div className="w-72 bg-card/50 backdrop-blur border border-border dark:border-white/10 rounded-xl p-4 flex flex-col">
                    <h3 className="text-xs font-bold text-muted-foreground mb-3 flex items-center gap-2">
                      <MessageSquare className="w-3 h-3" />
                      LIVE TRANSCRIPT
                    </h3>
                    <ScrollArea className="flex-1">
                      <div className="space-y-2 pr-2">
                        {videoTranscripts.map((t, i) => (
                          <div key={i} className={`text-xs ${t.role === "ai" ? "text-blue-300" : "text-foreground/80"}`}>
                            <span className="font-bold">{t.role === "ai" ? "Interviewer:" : "You:"}</span>{" "}
                            {t.text}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </div>

              <div className="mt-4 flex justify-center">
                <Button
                  size="lg"
                  variant="destructive"
                  onClick={endVideoInterview}
                  className="px-8 rounded-full"
                  data-testid="btn-end-video-interview"
                >
                  <PhoneOff className="h-5 w-5 mr-2" />
                  End Interview
                </Button>
              </div>
            </>
          )}
        </main>
      </div>
    );
  }

  // ==================== VOICE INTERVIEW UI (HUME) ====================

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex flex-col">
      <header className="p-4 border-b border-border dark:border-white/10 bg-background/50 backdrop-blur">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-foreground">Voice Interview</h1>
            {candidateName && <p className="text-sm text-muted-foreground">{candidateName}</p>}
          </div>
          {isConnected && (
            <Badge variant="outline" className="border-border/50 text-foreground">
              {formatDuration(duration)}
            </Badge>
          )}
        </div>
      </header>

      <main className="flex-1 flex flex-col max-w-2xl mx-auto w-full p-4">
        {state === "ready" ? (
          <Card className="flex-1 bg-card/50 backdrop-blur border-border dark:border-white/10 flex flex-col items-center justify-center">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl text-foreground">Ready to Begin</CardTitle>
              <CardDescription className="text-muted-foreground max-w-sm">
                You'll have a conversation with our AI interviewer. Speak naturally and take your time with responses.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-6">
              <div className="w-32 h-32 rounded-full bg-muted/20 border-2 border-border/50 flex items-center justify-center">
                <Mic className="h-12 w-12 text-foreground dark:text-foreground" />
              </div>
              <div className="text-center text-sm text-muted-foreground space-y-1">
                <p>Make sure you're in a quiet environment</p>
                <p>Allow microphone access when prompted</p>
              </div>
              <Button
                size="lg"
                onClick={startInterview}
                className="bg-muted hover:bg-muted text-white px-8"
                data-testid="btn-start-interview"
              >
                <Mic className="h-5 w-5 mr-2" />
                Start Interview
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="flex-1 bg-card/50 backdrop-blur border-border dark:border-white/10 flex flex-col overflow-hidden mb-4">
              <CardHeader className="border-b border-border dark:border-white/10 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AnimatePresence mode="wait">
                      {state === "listening" && (
                        <motion.div
                          key="listening"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                          className="w-3 h-3 rounded-full bg-muted animate-pulse"
                        />
                      )}
                      {state === "processing" && (
                        <motion.div
                          key="processing"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                        >
                          <Loader2 className="h-4 w-4 animate-spin text-foreground" />
                        </motion.div>
                      )}
                      {state === "speaking" && (
                        <motion.div
                          key="speaking"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                          className="flex items-center gap-1"
                        >
                          <Volume2 className="h-4 w-4 text-foreground dark:text-foreground" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <span className="text-sm text-muted-foreground capitalize">
                      {state === "processing" ? "AI is thinking..." : state === "speaking" ? "AI is speaking" : "Listening"}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {currentEmotion}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden p-0">
                <ScrollArea className="h-full p-4">
                  <div className="space-y-4">
                    {transcripts.length === 0 && (state === "processing" || state === "loading") && (
                      <div className="flex justify-center py-8">
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          The interviewer is preparing to greet you...
                        </div>
                      </div>
                    )}
                    {transcripts.map((transcript, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${transcript.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl px-4 py-2 ${
                            transcript.role === 'user'
                              ? 'bg-muted text-white'
                              : 'bg-card border border-border dark:border-white/10 text-foreground'
                          }`}
                        >
                          <p className="text-sm">{transcript.text}</p>
                          {transcript.emotion && transcript.role === 'ai' && (
                            <p className="text-xs text-muted-foreground mt-1">{transcript.emotion}</p>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <div className="flex justify-center">
              <Button
                size="lg"
                variant="destructive"
                onClick={endInterview}
                className="px-8"
                data-testid="btn-end-interview"
              >
                <PhoneOff className="h-5 w-5 mr-2" />
                End Interview
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
