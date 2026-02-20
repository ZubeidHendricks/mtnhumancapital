import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mic, MicOff, PhoneOff, Loader2, CheckCircle2, AlertCircle, Volume2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import axios from "axios";

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
};

// Hume EVI audio constants
const INPUT_SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;

export default function InterviewInvite() {
  const { token } = useParams<{ token: string }>();
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [candidateName, setCandidateName] = useState<string>("");
  const [state, setState] = useState<"loading" | "ready" | "listening" | "processing" | "speaking" | "completed" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [currentEmotion, setCurrentEmotion] = useState<string>("Neutral");
  const [isConnected, setIsConnected] = useState(false);
  const [duration, setDuration] = useState(0);

  const socketRef = useRef<WebSocket | null>(null);
  const captureContextRef = useRef<AudioContext | null>(null);
  const playbackContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const stateRef = useRef(state);
  const audioQueueRef = useRef<Float32Array[]>([]);
  const isPlayingRef = useRef(false);
  const endedRef = useRef(false);

  // Keep stateRef in sync
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const response = await axios.get(`/api/public/interview-session/${token}`);
        setSession(response.data.session);
        setCandidateName(response.data.candidate?.fullName || "");
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
    if (isConnected && startTimeRef.current) {
      interval = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current!) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isConnected]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

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
      if (stateRef.current !== "completed" && stateRef.current !== "error") {
        setState("listening");
      }
      return;
    }

    isPlayingRef.current = true;
    const float32Data = audioQueueRef.current.shift()!;

    if (!playbackContextRef.current || playbackContextRef.current.state === "closed") {
      playbackContextRef.current = new AudioContext();
    }
    const ctx = playbackContextRef.current;

    const audioBuffer = ctx.createBuffer(1, float32Data.length, OUTPUT_SAMPLE_RATE);
    audioBuffer.getChannelData(0).set(float32Data);

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);
    source.onended = () => playNextInQueue();
    source.start();
  }, []);

  // Decode base64 PCM Int16 and queue for playback
  const playAudio = useCallback((base64Audio: string) => {
    try {
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Convert Int16 PCM to Float32
      const int16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) {
        float32[i] = int16[i] / 32768.0;
      }

      // Queue and play
      audioQueueRef.current.push(float32);
      if (!isPlayingRef.current) {
        playNextInQueue();
      }
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
      const { accessToken, prompt } = configResponse.data;

      const wsUrl = `wss://api.hume.ai/v0/evi/chat?access_token=${accessToken}`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setIsConnected(true);
        startTimeRef.current = Date.now();
        setState("processing"); // AI is preparing to speak

        // Send session settings with system prompt and audio config
        const sessionSettings = {
          type: "session_settings",
          system_prompt: prompt || `You are an HR interviewer conducting a screening interview. The interview should last approximately 12 minutes, with a maximum of 15 minutes. Ask ONE question at a time. When you are speaking, do not process candidate input. Only listen when you have finished speaking. Wait for the candidate to fully finish speaking before responding. Do not interrupt the candidate unless necessary to stay on schedule. Encourage concise responses of 60–90 seconds. Maintain a friendly, professional, and conversational tone. Start by introducing yourself briefly and warmly, explain the interview will take about 12 minutes, then ask the candidate to tell you about themselves.`,
          audio: {
            channels: 1,
            encoding: "linear16",
            sample_rate: INPUT_SAMPLE_RATE,
          },
          custom_session_id: `interview-${token}`
        };
        ws.send(JSON.stringify(sessionSettings));

        // Start microphone to begin streaming audio
        startMicrophone(ws);

        toast.success("Connected! The interviewer will begin shortly.");
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          if (message.type === "assistant_message") {
            setState("speaking");
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
              playAudio(message.data);
            }
          } else if (message.type === "assistant_end") {
            // AI finished speaking — switch to listening after audio queue drains
            if (!isPlayingRef.current) {
              setState("listening");
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
        // Only go back to "ready" if not intentionally ended or errored
        if (!endedRef.current && stateRef.current !== "completed" && stateRef.current !== "error") {
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

  if (state === "loading" && !session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-card/80 backdrop-blur border-border dark:border-white/10">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 dark:text-blue-400 mb-4" />
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
            <AlertCircle className="h-12 w-12 text-red-600 dark:text-red-400 mb-4" />
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
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 10 }}
            >
              <CheckCircle2 className="h-16 w-16 text-green-600 dark:text-green-400 mb-4" />
            </motion.div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Interview Complete!</h2>
            <p className="text-muted-foreground text-center mb-4">
              Thank you for completing the interview. The recruiter will review your responses and be in touch soon.
            </p>
            <p className="text-sm text-muted-foreground">
              Duration: {formatDuration(duration)}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex flex-col">
      <header className="p-4 border-b border-border dark:border-white/10 bg-background/50 backdrop-blur">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-foreground">Voice Interview</h1>
            {candidateName && <p className="text-sm text-muted-foreground">{candidateName}</p>}
          </div>
          {isConnected && (
            <Badge variant="outline" className="border-green-500/50 text-green-600 dark:text-green-400">
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
              <div className="w-32 h-32 rounded-full bg-blue-500/20 border-2 border-blue-500/50 flex items-center justify-center">
                <Mic className="h-12 w-12 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="text-center text-sm text-muted-foreground space-y-1">
                <p>Make sure you're in a quiet environment</p>
                <p>Allow microphone access when prompted</p>
              </div>
              <Button
                size="lg"
                onClick={startInterview}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8"
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
                          className="w-3 h-3 rounded-full bg-green-500 animate-pulse"
                        />
                      )}
                      {state === "processing" && (
                        <motion.div
                          key="processing"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                        >
                          <Loader2 className="h-4 w-4 animate-spin text-yellow-500" />
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
                          <Volume2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
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
                              ? 'bg-blue-600 text-white'
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
