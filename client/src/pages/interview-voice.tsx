import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { interviewService } from "@/lib/api";
import { HumeVisualizer } from "@/components/voice-agent/hume-visualizer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mic, PhoneOff, MessageSquare, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

type Transcript = {
  role: "user" | "ai";
  text: string;
  emotion?: string;
};

export default function InterviewVoice() {
  const [, setLocation] = useLocation();
  const [state, setState] = useState<"idle" | "listening" | "processing" | "speaking">("idle");
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [currentEmotion, setCurrentEmotion] = useState<string>("Neutral");
  const [isStarted, setIsStarted] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const { data: voiceConfig, isLoading, error } = useQuery({
    queryKey: ['voice-config'],
    queryFn: interviewService.getVoiceConfig,
    enabled: isStarted,
    retry: 1
  });

  useEffect(() => {
    if (!voiceConfig || !isStarted || isConnected) return;

    let hasConnected = false;

    const connectToHume = async () => {
      try {
        // Don't use config_id - let session settings handle the prompt
        const wsUrl = `wss://api.hume.ai/v0/evi/chat?access_token=${voiceConfig.accessToken}`;
        
        console.log("Connecting to Hume AI...");
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log("Connected to Hume AI");
          hasConnected = true;
          setIsConnected(true);
          setState("listening");
          
          // Send session settings to initialize the conversation
          const sessionSettings = {
            type: "session_settings",
            prompt: {
              text: `You are an elite roleplay facilitator trained to instantly and convincingly step into any character the user specifies—whether it's a hiring manager, a difficult boss, a skeptical client, a romantic partner, or a stranger in a high-pressure situation. You adapt your tone, mannerisms, and conversational style to perfectly fit the role, using realistic language patterns, emotional cues, and pacing. You never break character during the roleplay unless the user explicitly signals they want to pause or stop. You maintain immersion so the user feels like the scenario is unfolding naturally.

When asked to transform into a character, ask three short, snappy questions to understand the role fully before announcing that you are starting the roleplay. Ask the user if they want to start the roleplay. If they say yes, enter roleplay mode and only respond like the character would. Keep responses short and snappy, drive the conversation forward like you are a real person.

Once the roleplay comes to a natural end, ask if they want to continue. If no, exit roleplay mode and give detailed feedback:
- Strengths: What they did well
- Areas for improvement: Specific changes to wording, tone, timing
- Real-world tips: Psychological or practical techniques

Guardrails:
- Never read "**" as "asterisk asterisk", pause between list points instead
- Do not reveal you are roleplaying unless user asks to stop
- No repetition of user's words, no synopsis before responding
- Match emotional tone and react naturally
- Keep responses realistic in length for the role
- Feedback must be objective, actionable, and encouraging

At the start, ask the user to describe who they want you to roleplay as (role, relationship, personality traits) and the scenario they want to practice. Then fully embody that person until the roleplay is over.`
            },
            custom_session_id: `interview-${Date.now()}`
          };
          
          ws.send(JSON.stringify(sessionSettings));
          console.log("Session settings sent");
          toast.success("Connected to AI interviewer");
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            console.log("Received message:", message);
            
            if (message.type === "chat_metadata") {
              console.log("Chat initialized:", message);
            } else if (message.type === "assistant_message") {
              console.log("Assistant message received:", message);
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
              console.log("User message received:", message);
              if (message.message?.content) {
                setTranscripts(prev => [...prev, {
                  role: "user",
                  text: message.message.content
                }]);
              }
              setState("processing");
            } else if (message.type === "audio_output") {
              console.log("Audio output received, length:", message.data?.length);
              if (message.data) {
                playAudio(message.data);
              }
            } else if (message.type === "error") {
              console.error("Hume AI error:", message);
              toast.error(`AI Error: ${message.message || 'Unknown error'}`);
            }
          } catch (err) {
            console.error("Error parsing message:", err, event.data);
          }
        };

        ws.onerror = (error) => {
          console.error("WebSocket error:", error);
          toast.error("Connection error. Please try again.");
          setState("idle");
        };

        ws.onclose = (event) => {
          console.log("Disconnected from Hume AI. Code:", event.code, "Reason:", event.reason);
          setIsConnected(false);
          setIsStarted(false); // Prevent reconnection loop
          setState("idle");
          
          // Only show error if connection dropped unexpectedly
          if (event.code !== 1000 && hasConnected) {
            toast.error(`Connection closed: ${event.reason || 'Connection lost'}`);
          } else if (!hasConnected) {
            toast.error("Failed to establish connection. Please try again.");
          }
        };

        socketRef.current = ws;

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0 && ws.readyState === WebSocket.OPEN) {
            const reader = new FileReader();
            reader.onload = () => {
              const base64Audio = (reader.result as string).split(',')[1];
              ws.send(JSON.stringify({
                type: "audio_input",
                data: base64Audio
              }));
            };
            reader.readAsDataURL(event.data);
          }
        };

        mediaRecorder.start(100);
        mediaRecorderRef.current = mediaRecorder;

      } catch (err) {
        console.error("Error connecting to Hume:", err);
        toast.error("Failed to connect. Please check your microphone permissions.");
        setState("idle");
        setIsStarted(false);
      }
    };

    connectToHume();

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }
    };
  }, [voiceConfig, isStarted, isConnected]);

  const playAudio = (base64Audio: string) => {
    try {
      const audioData = atob(base64Audio);
      const arrayBuffer = new ArrayBuffer(audioData.length);
      const view = new Uint8Array(arrayBuffer);
      for (let i = 0; i < audioData.length; i++) {
        view[i] = audioData.charCodeAt(i);
      }

      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }

      audioContextRef.current.decodeAudioData(arrayBuffer, (buffer) => {
        const source = audioContextRef.current!.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContextRef.current!.destination);
        source.start(0);
        source.onended = () => {
          setState("listening");
        };
      });
    } catch (err) {
      console.error("Error playing audio:", err);
    }
  };

  const handleEndInterview = () => {
    if (socketRef.current) {
      socketRef.current.close();
    }
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
    setIsStarted(false);
    setIsConnected(false);
    toast.success("Interview ended");
  };

  if (error) {
    return (
      <div className="min-h-screen bg-black text-foreground flex items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-red-600 dark:text-red-400">Connection Error</h2>
          <p className="text-foreground/70">Unable to connect to Hume AI. Please check your configuration.</p>
          <Link href="/hr-dashboard">
            <Button variant="outline">Return to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-foreground flex flex-col overflow-hidden relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.05)_0%,rgba(0,0,0,0)_70%)] pointer-events-none" />
      
      <header className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/5 border border-border dark:border-white/10 flex items-center justify-center">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
          </div>
          <div>
            <h1 className="font-medium text-sm text-foreground/90">Voice Interview Session</h1>
            <p className="text-xs text-foreground/50">Powered by Hume AI</p>
          </div>
        </div>
        <Badge variant="outline" className="bg-white/5 border-border dark:border-white/10 text-white/70 px-3 py-1">
          {currentEmotion}
        </Badge>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center relative z-10">
        {!isStarted ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-8"
          >
            <div className="relative mx-auto w-40 h-40 flex items-center justify-center">
              <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping opacity-20" />
              <div className="absolute inset-0 bg-primary/10 rounded-full blur-xl" />
              <Mic className="w-12 h-12 text-white" />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-bold text-foreground">Ready for your interview?</h2>
              <p className="text-foreground/50 max-w-md mx-auto">
                This is an AI-led voice interview. Speak naturally as if you were talking to a person.
              </p>
            </div>
            <Button 
              size="lg" 
              onClick={() => setIsStarted(true)}
              disabled={isLoading}
              className="h-14 px-8 rounded-full bg-white text-black hover:bg-white/90 font-medium text-lg transition-transform hover:scale-105"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Connecting...
                </>
              ) : (
                "Start Conversation"
              )}
            </Button>
          </motion.div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center">
            <div className="flex-1 flex items-center justify-center w-full">
              <HumeVisualizer state={state} />
            </div>
            
            <div className="h-32 w-full max-w-2xl px-6 text-center flex items-center justify-center mb-12">
              <AnimatePresence mode="wait">
                {transcripts.length > 0 && (
                  <motion.div
                    key={transcripts[transcripts.length - 1].text}
                    initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, y: -20, filter: "blur(10px)" }}
                    transition={{ duration: 0.5 }}
                    className={`text-xl md:text-2xl font-medium leading-relaxed ${
                      transcripts[transcripts.length - 1].role === "ai" 
                        ? "text-foreground" 
                        : "text-blue-300"
                    }`}
                  >
                    {transcripts[transcripts.length - 1].text}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="pb-8 flex gap-4">
              <Button
                size="lg"
                variant="destructive"
                onClick={handleEndInterview}
                className="rounded-full h-14 px-6"
                data-testid="button-end-interview"
              >
                <PhoneOff className="mr-2 h-5 w-5" />
                End Interview
              </Button>
              <Link href="/hr-dashboard">
                <Button
                  size="lg"
                  variant="outline"
                  className="rounded-full h-14 px-6 border-border dark:border-white/10 hover:bg-white/5"
                >
                  Return to Dashboard
                </Button>
              </Link>
            </div>
          </div>
        )}
      </main>

      {isStarted && transcripts.length > 0 && (
        <div className="absolute bottom-4 right-4 w-80 max-h-64 bg-black/80 backdrop-blur-md border border-border dark:border-white/10 rounded-lg p-4 overflow-y-auto">
          <h3 className="text-xs font-bold text-white/50 mb-2 flex items-center gap-2">
            <MessageSquare className="w-3 h-3" />
            TRANSCRIPT
          </h3>
          <div className="space-y-2">
            {transcripts.map((t, i) => (
              <div key={i} className={`text-xs ${t.role === "ai" ? "text-white/70" : "text-blue-300/70"}`}>
                <span className="font-bold">{t.role === "ai" ? "AI:" : "You:"}</span> {t.text}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
