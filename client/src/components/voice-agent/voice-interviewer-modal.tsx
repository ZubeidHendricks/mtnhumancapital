import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, X, MoreHorizontal, Sparkles } from "lucide-react";
import { HumeVisualizer } from "./hume-visualizer";
import { motion, AnimatePresence } from "framer-motion";

type Transcript = {
  role: "user" | "ai";
  text: string;
  emotion?: string;
};

export function VoiceInterviewerModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [state, setState] = useState<"idle" | "listening" | "processing" | "speaking">("idle");
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [currentEmotion, setCurrentEmotion] = useState<string>("Neutral");

  // Simulation loop
  useEffect(() => {
    if (!isOpen) {
      setTranscripts([]);
      setState("idle");
      return;
    }

    let timeout: NodeJS.Timeout;

    const startSimulation = async () => {
      // 1. AI Speaks Intro
      setState("speaking");
      setCurrentEmotion("Warmth");
      await new Promise(r => setTimeout(r, 1000));
      setTranscripts(prev => [...prev, { role: "ai", text: "Hello! I'm your empathic interview assistant. I'm here to learn about your experience. How are you feeling today?", emotion: "Warmth" }]);
      
      // 2. User "Speaks" (Simulated)
      await new Promise(r => setTimeout(r, 2000));
      setState("listening");
      await new Promise(r => setTimeout(r, 3000)); // Simulating user talking
      
      setState("processing");
      await new Promise(r => setTimeout(r, 1000));
      setTranscripts(prev => [...prev, { role: "user", text: "I'm a bit nervous, but excited to discuss the Project Manager role." }]);

      // 3. AI Responds with Empathy
      setState("speaking");
      setCurrentEmotion("Empathy");
      setTranscripts(prev => [...prev, { role: "ai", text: "It's completely natural to feel that way. Take a deep breath. I can hear the excitement in your voice, which is great! Could you tell me about a time you led a team through a challenge?", emotion: "Empathy" }]);
      
      await new Promise(r => setTimeout(r, 4000));
      setState("listening");
    };

    if (isOpen && transcripts.length === 0) {
      timeout = setTimeout(startSimulation, 500);
    }

    return () => clearTimeout(timeout);
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-blue-500 to-pink-600 text-white hover:from-blue-600 hover:to-pink-700 border-0 shadow-lg shadow-blue-500/20 gap-2">
          <Mic className="w-4 h-4" /> Start Voice Interview
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-black/90 border-white/10 backdrop-blur-xl text-white p-0 overflow-hidden gap-0 h-[600px] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="font-medium text-sm tracking-wide">Roleplay Practice</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-white/10 text-xs font-mono">{currentEmotion}</Badge>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-white" onClick={() => setIsOpen(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Visualizer Area */}
        <div className="flex-1 flex flex-col items-center justify-center relative bg-gradient-to-b from-black to-blue-950/30">
          <HumeVisualizer state={state} />
          
          <div className="absolute bottom-8 text-center w-full px-8">
             <AnimatePresence mode="wait">
              {transcripts.length > 0 && (
                <motion.div
                  key={transcripts[transcripts.length - 1].text}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-lg font-medium leading-relaxed text-white/90"
                >
                  "{transcripts[transcripts.length - 1].text}"
                </motion.div>
              )}
             </AnimatePresence>
          </div>
        </div>

        {/* Controls */}
        <div className="p-6 bg-white/5 border-t border-white/10 flex justify-center gap-6">
          <Button variant="outline" size="icon" className="h-12 w-12 rounded-full border-white/10 bg-white/5 hover:bg-white/10">
            <MicOff className="w-5 h-5" />
          </Button>
          <Button size="icon" className="h-14 w-14 rounded-full bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/20" onClick={() => setIsOpen(false)}>
            <X className="w-6 h-6" />
          </Button>
          <Button variant="outline" size="icon" className="h-12 w-12 rounded-full border-white/10 bg-white/5 hover:bg-white/10">
            <MoreHorizontal className="w-5 h-5" />
          </Button>
        </div>

      </DialogContent>
    </Dialog>
  );
}

function Badge({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-medium tracking-wider uppercase ${className}`}>
      {children}
    </span>
  );
}