import { HumeVisualizer } from "@/components/voice-agent/hume-visualizer";
import { useVoicePractice } from "@/hooks/use-voice-practice";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mic, PhoneOff, Loader2, MessageSquare, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface PracticeVoicePanelProps {
  onClose: () => void;
}

export function PracticeVoicePanel({ onClose }: PracticeVoicePanelProps) {
  const {
    state,
    transcripts,
    currentEmotion,
    isStarted,
    isConnected,
    isLoadingConfig,
    start,
    end,
  } = useVoicePractice();

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
          <Mic className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">Voice Practice</span>
          <Badge variant="outline" className="text-[10px] h-5 border-amber-500 text-amber-600 bg-amber-500/10">
            PRACTICE MODE
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {isConnected && (
            <Badge variant="secondary" className="text-[10px] h-5">
              {currentEmotion}
            </Badge>
          )}
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {!isStarted ? (
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="relative w-20 h-20 flex items-center justify-center">
              <div className="absolute inset-0 bg-primary/10 rounded-full animate-pulse" />
              <Mic className="h-8 w-8 text-primary" />
            </div>
            <div className="text-center">
              <p className="font-medium">Ready to practice?</p>
              <p className="text-sm text-muted-foreground mt-1">
                Practice with an AI interviewer. No recording will be saved.
              </p>
            </div>
            <Button onClick={start} disabled={isLoadingConfig} className="rounded-full px-6">
              {isLoadingConfig ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                "Start Practice"
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Visualizer - compact */}
            <div className="flex justify-center">
              <div className="scale-50 -my-16">
                <HumeVisualizer state={state} />
              </div>
            </div>

            {/* Latest transcript */}
            <AnimatePresence mode="wait">
              {transcripts.length > 0 && (
                <motion.div
                  key={transcripts[transcripts.length - 1].text}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-center px-4"
                >
                  <p className="text-sm font-medium">
                    {transcripts[transcripts.length - 1].text}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Transcript history */}
            {transcripts.length > 1 && (
              <ScrollArea className="h-32 border rounded-md p-3">
                <div className="space-y-2">
                  {transcripts.map((t, i) => (
                    <div
                      key={i}
                      className={`text-xs ${
                        t.role === "ai" ? "text-muted-foreground" : "text-foreground"
                      }`}
                    >
                      <span className="font-bold">{t.role === "ai" ? "AI:" : "You:"}</span>{" "}
                      {t.text}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}

            {/* Controls */}
            <div className="flex justify-center gap-2">
              <Button variant="destructive" size="sm" onClick={end} className="rounded-full">
                <PhoneOff className="h-4 w-4 mr-2" />
                End Practice
              </Button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
