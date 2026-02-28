import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { interviewService } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Video, PhoneOff, Loader2, X } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

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

  const handleEnd = () => {
    setIsSessionActive(false);
    setSessionUrl(null);
    toast.success("Practice session ended");
  };

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
              <span className="text-xs text-muted-foreground">Connected</span>
            </div>
          )}
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {!isSessionActive ? (
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Video className="h-7 w-7 text-primary" />
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
        ) : sessionUrl ? (
          <div className="space-y-3">
            <div className="relative w-full aspect-video rounded-lg overflow-hidden border">
              <iframe
                src={sessionUrl}
                className="w-full h-full"
                allow="camera; microphone; fullscreen"
              />
            </div>
            <div className="flex justify-center">
              <Button variant="destructive" size="sm" onClick={handleEnd} className="rounded-full">
                <PhoneOff className="h-4 w-4 mr-2" />
                End Practice
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
