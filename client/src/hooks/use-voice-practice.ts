import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { interviewService } from "@/lib/api";
import { toast } from "sonner";

export type Transcript = {
  role: "user" | "ai";
  text: string;
  emotion?: string;
};

export type VoiceState = "idle" | "listening" | "processing" | "speaking";

export function useVoicePractice() {
  const [state, setState] = useState<VoiceState>("idle");
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [currentEmotion, setCurrentEmotion] = useState<string>("Neutral");
  const [isStarted, setIsStarted] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const socketRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const { data: voiceConfig, isLoading: isLoadingConfig } = useQuery({
    queryKey: ["voice-config"],
    queryFn: interviewService.getVoiceConfig,
    enabled: isStarted,
    retry: 1,
  });

  const playAudio = useCallback((base64Audio: string) => {
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
  }, []);

  useEffect(() => {
    if (!voiceConfig || !isStarted || isConnected) return;

    let hasConnected = false;

    const connectToHume = async () => {
      try {
        const wsUrl = `wss://api.hume.ai/v0/evi/chat?access_token=${voiceConfig.accessToken}`;
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          hasConnected = true;
          setIsConnected(true);
          setState("listening");

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

At the start, ask the user to describe who they want you to roleplay as (role, relationship, personality traits) and the scenario they want to practice. Then fully embody that person until the roleplay is over.`,
            },
            custom_session_id: `practice-${Date.now()}`,
          };

          ws.send(JSON.stringify(sessionSettings));
          toast.success("Connected to AI interviewer");
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);

            if (message.type === "assistant_message") {
              setState("speaking");
              if (message.message?.content) {
                setTranscripts((prev) => [
                  ...prev,
                  {
                    role: "ai",
                    text: message.message.content,
                    emotion: message.models?.prosody?.scores?.[0]?.name || "Neutral",
                  },
                ]);
                setCurrentEmotion(message.models?.prosody?.scores?.[0]?.name || "Neutral");
              }
            } else if (message.type === "user_message") {
              if (message.message?.content) {
                setTranscripts((prev) => [
                  ...prev,
                  { role: "user", text: message.message.content },
                ]);
              }
              setState("processing");
            } else if (message.type === "audio_output") {
              if (message.data) {
                playAudio(message.data);
              }
            } else if (message.type === "error") {
              toast.error(`AI Error: ${message.message || "Unknown error"}`);
            }
          } catch (err) {
            console.error("Error parsing message:", err);
          }
        };

        ws.onerror = () => {
          toast.error("Connection error. Please try again.");
          setState("idle");
        };

        ws.onclose = (event) => {
          setIsConnected(false);
          setIsStarted(false);
          setState("idle");

          if (event.code !== 1000 && hasConnected) {
            toast.error(`Connection closed: ${event.reason || "Connection lost"}`);
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
              const base64Audio = (reader.result as string).split(",")[1];
              ws.send(JSON.stringify({ type: "audio_input", data: base64Audio }));
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
      if (socketRef.current) socketRef.current.close();
      if (mediaRecorderRef.current) mediaRecorderRef.current.stop();
    };
  }, [voiceConfig, isStarted, isConnected, playAudio]);

  const start = useCallback(() => {
    setTranscripts([]);
    setIsStarted(true);
  }, []);

  const end = useCallback(() => {
    if (socketRef.current) socketRef.current.close();
    if (mediaRecorderRef.current) mediaRecorderRef.current.stop();
    setIsStarted(false);
    setIsConnected(false);
    setState("idle");
    toast.success("Practice session ended");
  }, []);

  return {
    state,
    transcripts,
    currentEmotion,
    isStarted,
    isConnected,
    isLoadingConfig,
    start,
    end,
  };
}
