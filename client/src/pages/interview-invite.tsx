import { useState, useEffect, useRef } from "react";
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
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const startTimeRef = useRef<number | null>(null);

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

  const startInterview = async () => {
    try {
      setState("loading");
      
      const configResponse = await axios.get(`/api/public/interview-session/${token}/config`);
      const { accessToken, prompt } = configResponse.data;
      
      const wsUrl = `wss://api.hume.ai/v0/evi/chat?access_token=${accessToken}`;
      
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setIsConnected(true);
        startTimeRef.current = Date.now();
        setState("listening");
        
        const sessionSettings = {
          type: "session_settings",
          prompt: {
            text: prompt || `You are a professional HR interviewer conducting a screening interview. Be warm, professional, and thorough. Ask questions one at a time and wait for responses. Start by introducing yourself and asking the candidate to tell you about themselves.`
          },
          custom_session_id: `interview-${token}`
        };
        
        ws.send(JSON.stringify(sessionSettings));
        toast.success("Connected! The interview will begin shortly.");
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
              playAudio(message.data);
            }
          } else if (message.type === "error") {
            console.error("Hume AI error:", message);
            toast.error(`Error: ${message.message || 'Unknown error'}`);
          }
        } catch (err) {
          console.error("Error parsing message:", err);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        if (state !== "completed" && state !== "error") {
          setState("ready");
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        toast.error("Connection error. Please try again.");
        setState("error");
        setErrorMessage("Failed to connect to voice service");
      };

      socketRef.current = ws;
      
      await startMicrophone();
      
    } catch (error: any) {
      console.error("Error starting interview:", error);
      setErrorMessage(error.response?.data?.message || "Failed to start interview");
      setState("error");
    }
  };

  const startMicrophone = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      audioContextRef.current = new AudioContext({ sampleRate: 16000 });
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0 && socketRef.current?.readyState === WebSocket.OPEN) {
          const arrayBuffer = await event.data.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);
          let binaryStr = '';
          for (let i = 0; i < uint8Array.length; i++) {
            binaryStr += String.fromCharCode(uint8Array[i]);
          }
          const base64Audio = btoa(binaryStr);
          socketRef.current.send(JSON.stringify({
            type: "audio_input",
            data: base64Audio
          }));
        }
      };
      
      mediaRecorder.start(100);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      toast.error("Please allow microphone access to continue");
      setState("error");
      setErrorMessage("Microphone access is required for the interview");
    }
  };

  const playAudio = async (base64Audio: string) => {
    try {
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const audioContext = audioContextRef.current || new AudioContext();
      const audioBuffer = await audioContext.decodeAudioData(bytes.buffer);
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.onended = () => {
        setState("listening");
      };
      source.start();
    } catch (error) {
      console.error("Error playing audio:", error);
      setState("listening");
    }
  };

  const endInterview = async () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
    
    if (socketRef.current) {
      socketRef.current.close();
    }
    
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

  if (state === "loading" && !session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-card/80 backdrop-blur border-white/10">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-purple-400 mb-4" />
            <p className="text-muted-foreground">Loading your interview...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-red-900/20 to-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-card/80 backdrop-blur border-white/10">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Unable to Load Interview</h2>
            <p className="text-muted-foreground text-center">{errorMessage}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (state === "completed") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-green-900/20 to-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-card/80 backdrop-blur border-white/10">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 10 }}
            >
              <CheckCircle2 className="h-16 w-16 text-green-400 mb-4" />
            </motion.div>
            <h2 className="text-2xl font-bold text-white mb-2">Interview Complete!</h2>
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col">
      <header className="p-4 border-b border-white/10 bg-background/50 backdrop-blur">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-white">Voice Interview</h1>
            {candidateName && <p className="text-sm text-muted-foreground">{candidateName}</p>}
          </div>
          {isConnected && (
            <Badge variant="outline" className="border-green-500/50 text-green-400">
              {formatDuration(duration)}
            </Badge>
          )}
        </div>
      </header>

      <main className="flex-1 flex flex-col max-w-2xl mx-auto w-full p-4">
        {state === "ready" ? (
          <Card className="flex-1 bg-card/50 backdrop-blur border-white/10 flex flex-col items-center justify-center">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl text-white">Ready to Begin</CardTitle>
              <CardDescription className="text-muted-foreground max-w-sm">
                You'll have a conversation with our AI interviewer. Speak naturally and take your time with responses.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-6">
              <div className="w-32 h-32 rounded-full bg-purple-500/20 border-2 border-purple-500/50 flex items-center justify-center">
                <Mic className="h-12 w-12 text-purple-400" />
              </div>
              <div className="text-center text-sm text-muted-foreground space-y-1">
                <p>Make sure you're in a quiet environment</p>
                <p>Allow microphone access when prompted</p>
              </div>
              <Button 
                size="lg" 
                onClick={startInterview}
                className="bg-purple-600 hover:bg-purple-700 text-white px-8"
                data-testid="btn-start-interview"
              >
                <Mic className="h-5 w-5 mr-2" />
                Start Interview
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="flex-1 bg-card/50 backdrop-blur border-white/10 flex flex-col overflow-hidden mb-4">
              <CardHeader className="border-b border-white/10 py-3">
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
                          <Volume2 className="h-4 w-4 text-purple-400" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <span className="text-sm text-muted-foreground capitalize">{state}</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {currentEmotion}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden p-0">
                <ScrollArea className="h-full p-4">
                  <div className="space-y-4">
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
                              ? 'bg-purple-600 text-white'
                              : 'bg-card border border-white/10 text-white'
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
