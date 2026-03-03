import { Mic, Video, Users, Gift, Check, Lock, Play, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type FlowStepStatus = "completed" | "active" | "locked";

export interface FlowStep {
  id: string;
  label: string;
  status: FlowStepStatus;
  sessionId?: string | null;
  score?: number | null;
}

interface InterviewFlowStepperProps {
  steps: FlowStep[];
  onStepClick: (step: FlowStep) => void;
  onStartInterview: (step: FlowStep) => void;
  onPractice: (step: FlowStep) => void;
  activeStepId?: string;
}

const STEP_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  voice: Mic,
  video: Video,
  f2f: Users,
  offer: Gift,
};

export function InterviewFlowStepper({
  steps,
  onStepClick,
  onStartInterview,
  onPractice,
  activeStepId,
}: InterviewFlowStepperProps) {
  return (
    <div className="w-full py-4 px-2">
      <div className="flex items-center justify-between relative">
        {/* Connecting line behind steps */}
        <div className="absolute top-5 left-8 right-8 h-0.5 bg-border z-0" />
        <div
          className="absolute top-5 left-8 h-0.5 bg-primary z-0 transition-all duration-500"
          style={{
            width: `${getProgressWidth(steps)}%`,
            maxWidth: "calc(100% - 4rem)",
          }}
        />

        {steps.map((step, index) => {
          const Icon = STEP_ICONS[step.id] || Mic;
          const isSelected = activeStepId === step.id;

          return (
            <div
              key={step.id}
              className="flex flex-col items-center relative z-10 flex-1"
            >
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => {
                        if (step.status !== "locked") onStepClick(step);
                      }}
                      disabled={step.status === "locked"}
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 border-2 ${
                        step.status === "completed"
                          ? isSelected
                            ? "bg-yellow-500 border-yellow-500 text-black cursor-pointer ring-2 ring-yellow-400/40 ring-offset-2 ring-offset-background"
                            : "bg-yellow-500 border-yellow-500 text-black cursor-pointer hover:ring-2 hover:ring-yellow-400/30"
                          : step.status === "active"
                          ? isSelected
                            ? "bg-primary/20 border-primary text-primary ring-2 ring-primary/40 ring-offset-2 ring-offset-background"
                            : "bg-primary/10 border-primary text-primary cursor-pointer hover:bg-primary/20"
                          : "bg-muted border-muted-foreground/30 text-muted-foreground cursor-not-allowed opacity-50"
                      }`}
                    >
                      {step.status === "completed" ? (
                        <Check className="h-4 w-4" />
                      ) : step.status === "locked" ? (
                        <Lock className="h-3.5 w-3.5" />
                      ) : (
                        <Icon className="h-4 w-4" />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-medium">{step.label}</p>
                    {step.score != null && (
                      <p className="text-xs text-muted-foreground">Score: {step.score}%</p>
                    )}
                    {step.status === "locked" && (
                      <p className="text-xs text-muted-foreground">Complete previous step to unlock</p>
                    )}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <span
                className={`text-xs mt-1.5 font-medium ${
                  isSelected
                    ? "text-primary font-bold"
                    : step.status === "locked"
                    ? "text-muted-foreground/50"
                    : step.status === "active"
                    ? "text-primary"
                    : "text-foreground"
                }`}
              >
                {step.label}
              </span>

              {step.score != null && step.status === "completed" && (
                <Badge variant="secondary" className="text-[10px] h-4 px-1.5 mt-0.5">
                  {step.score}%
                </Badge>
              )}

              {/* Action buttons for active step */}
              {step.status === "active" && step.id !== "offer" && (
                <div className="flex gap-1 mt-2">
                  {(step.id === "voice" || step.id === "video") && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-[10px] px-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPractice(step);
                      }}
                    >
                      <GraduationCap className="h-3 w-3 mr-1" />
                      Practice
                    </Button>
                  )}
                </div>
              )}

              {step.status === "active" && step.id === "offer" && (
                <Badge variant="outline" className="text-[10px] h-4 px-1.5 mt-2 border-primary text-primary">
                  Ready
                </Badge>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function getProgressWidth(steps: FlowStep[]): number {
  const completedCount = steps.filter((s) => s.status === "completed").length;
  if (completedCount === 0) return 0;
  // Progress line fills proportionally through completed steps
  return (completedCount / (steps.length - 1)) * 100;
}
