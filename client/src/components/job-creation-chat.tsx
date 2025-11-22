import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Loader2, Send, Sparkles, CheckCircle2, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface JobCreationChatProps {
  onJobCreated: () => void;
  onCancel: () => void;
}

export function JobCreationChat({ onJobCreated, onCancel }: JobCreationChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [sessionId] = useState(() => `session-${Date.now()}-${Math.random()}`);
  const [jobSpec, setJobSpec] = useState<any>(null);
  const [showCollectedData, setShowCollectedData] = useState(true);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Start conversation automatically
  useEffect(() => {
    const startConversation = async () => {
      setIsLoading(true);
      try {
        const response = await api.post("/jobs/conversation/chat", {
          sessionId,
          message: "start", // Trigger initial greeting
        });

        setMessages([
          {
            role: "assistant",
            content: response.data.reply,
            timestamp: new Date(),
          },
        ]);
      } catch (error) {
        console.error("Failed to start conversation:", error);
        setMessages([
          {
            role: "assistant",
            content: "Hello! I'm your AI job requisition assistant. What type of position are you looking to fill today?",
            timestamp: new Date(),
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    startConversation();
  }, [sessionId]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading || isComplete) return;

    const userMessage = inputValue.trim();
    setInputValue("");

    // Add user message to chat
    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: userMessage,
        timestamp: new Date(),
      },
    ]);

    setIsLoading(true);

    try {
      const response = await api.post("/jobs/conversation/chat", {
        sessionId,
        message: userMessage,
      });

      // Add AI response
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: response.data.reply,
          timestamp: new Date(),
        },
      ]);

      // Update job spec with collected data
      if (response.data.jobSpec) {
        setJobSpec(response.data.jobSpec);
      }
      
      // Check if job spec is complete
      if (response.data.isComplete) {
        setIsComplete(true);
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "I apologize, but I encountered an error. Could you please try rephrasing that?",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleCreateJob = async (isDraft: boolean = false) => {
    setIsLoading(true);
    try {
      await api.post("/jobs/conversation/create", {
        sessionId,
        isDraft,
      });

      // Clean up
      await api.delete(`/jobs/conversation/${sessionId}`);
      
      onJobCreated();
    } catch (error) {
      console.error("Failed to create job:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "I encountered an error creating the job. Please try again or contact support.",
          timestamp: new Date(),
        },
      ]);
      setIsComplete(false);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSaveDraft = () => {
    handleCreateJob(true);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const hasAnyData = jobSpec && Object.values(jobSpec).some(v => v !== undefined && v !== null && v !== '');

  return (
    <div className="flex gap-4 h-[600px]">
      {/* Main Chat Area */}
      <div className="flex flex-col flex-1">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-white/10 bg-gradient-to-r from-primary/10 to-purple-500/10">
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
          <Bot className="w-5 h-5 text-primary" />
        </div>
          <div className="flex-1">
            <h3 className="font-semibold text-white">AI Job Requisition Assistant</h3>
            <p className="text-xs text-muted-foreground">
              {isComplete ? "Ready to create job posting" : "Gathering job requirements..."}
            </p>
          </div>
          {isComplete && (
            <div className="flex items-center gap-2 text-green-500 text-sm">
              <CheckCircle2 className="w-4 h-4" />
              <span>Complete</span>
            </div>
          )}
        </div>

        {/* Messages */}
        <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={cn(
                "flex gap-3",
                message.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              {message.role === "assistant" && (
                <div className="w-8 h-8 rounded-full bg-primary/20 flex-shrink-0 flex items-center justify-center mt-1">
                  <Sparkles className="w-4 h-4 text-primary" />
                </div>
              )}
              
              <Card
                className={cn(
                  "max-w-[80%] p-3",
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border-white/10"
                )}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                <p className="text-xs opacity-50 mt-1">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </Card>

              {message.role === "user" && (
                <div className="w-8 h-8 rounded-full bg-muted flex-shrink-0 flex items-center justify-center mt-1">
                  <span className="text-xs font-bold">You</span>
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex-shrink-0 flex items-center justify-center">
                <Loader2 className="w-4 h-4 text-primary animate-spin" />
              </div>
              <Card className="bg-card border-white/10 p-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  AI is thinking...
                </div>
              </Card>
            </div>
          )}
        </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="p-4 border-t border-white/10">
        {isComplete ? (
          <div className="space-y-3">
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
              <p className="text-sm text-green-400 font-medium">
                ✓ Job specification complete! Review the details above and click "Create Job" to publish.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={onCancel}
                data-testid="button-cancel-job-creation"
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleCreateJob(false)}
                disabled={isLoading}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                data-testid="button-create-job"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Create Job
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                disabled={isLoading}
                className="flex-1 bg-background/50 border-white/10"
                data-testid="input-chat-message"
              />
              <Button
                onClick={handleSendMessage}
                disabled={isLoading || !inputValue.trim()}
                size="icon"
                data-testid="button-send-message"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            {hasAnyData && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={onCancel}
                  size="sm"
                  data-testid="button-cancel-draft"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveDraft}
                  disabled={isLoading}
                  size="sm"
                  className="flex-1"
                  variant="secondary"
                  data-testid="button-save-draft"
                >
                  Save Draft
                </Button>
              </div>
            )}
          </div>
        )}
        </div>
      </div>

      {/* Collected Data Panel */}
      {showCollectedData && (
        <Card className="w-80 flex-shrink-0 p-4 bg-card/50 border-white/10 overflow-hidden relative">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm">Collected Information</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCollectedData(false)}
              className="h-6 w-6 p-0"
              data-testid="button-hide-collected-data"
            >
              ✕
            </Button>
          </div>
          
          <ScrollArea className="h-[calc(100%-3rem)]">
            {!hasAnyData ? (
              <p className="text-xs text-muted-foreground text-center py-8">
                Chat with the AI to start collecting job details...
              </p>
            ) : (
              <div className="space-y-3 text-xs">
                {jobSpec?.title && (
                  <div data-testid="collected-title">
                    <span className="text-muted-foreground">Title:</span>
                    <p className="font-medium mt-1">{jobSpec.title}</p>
                  </div>
                )}
                {jobSpec?.department && (
                  <div data-testid="collected-department">
                    <span className="text-muted-foreground">Department:</span>
                    <p className="font-medium mt-1">{jobSpec.department}</p>
                  </div>
                )}
                {jobSpec?.description && (
                  <div data-testid="collected-description">
                    <span className="text-muted-foreground">Description:</span>
                    <p className="font-medium mt-1 line-clamp-3">{jobSpec.description}</p>
                  </div>
                )}
                {jobSpec?.location && (
                  <div data-testid="collected-location">
                    <span className="text-muted-foreground">Location:</span>
                    <p className="font-medium mt-1">{jobSpec.location}</p>
                  </div>
                )}
                {jobSpec?.employmentType && (
                  <div data-testid="collected-employment-type">
                    <span className="text-muted-foreground">Employment Type:</span>
                    <p className="font-medium mt-1">{jobSpec.employmentType}</p>
                  </div>
                )}
                {(jobSpec?.salaryMin || jobSpec?.salaryMax) && (
                  <div data-testid="collected-salary">
                    <span className="text-muted-foreground">Salary Range:</span>
                    <p className="font-medium mt-1">
                      R{jobSpec.salaryMin?.toLocaleString() || '?'} - R{jobSpec.salaryMax?.toLocaleString() || '?'}
                      {jobSpec.payRateUnit && ` ${jobSpec.payRateUnit}`}
                    </p>
                  </div>
                )}
                {jobSpec?.shiftStructure && (
                  <div data-testid="collected-shift">
                    <span className="text-muted-foreground">Shift Structure:</span>
                    <p className="font-medium mt-1">{jobSpec.shiftStructure}</p>
                  </div>
                )}
                {jobSpec?.minYearsExperience !== undefined && (
                  <div data-testid="collected-experience">
                    <span className="text-muted-foreground">Min. Experience:</span>
                    <p className="font-medium mt-1">{jobSpec.minYearsExperience} years</p>
                  </div>
                )}
                {jobSpec?.licenseRequirements && jobSpec.licenseRequirements.length > 0 && (
                  <div data-testid="collected-licenses">
                    <span className="text-muted-foreground">Licenses Required:</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {jobSpec.licenseRequirements.map((license: string, i: number) => (
                        <span key={i} className="bg-primary/20 text-primary px-2 py-0.5 rounded text-xs">
                          {license}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {jobSpec?.vehicleTypes && jobSpec.vehicleTypes.length > 0 && (
                  <div data-testid="collected-vehicles">
                    <span className="text-muted-foreground">Vehicle Types:</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {jobSpec.vehicleTypes.map((vehicle: string, i: number) => (
                        <span key={i} className="bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded text-xs">
                          {vehicle}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {jobSpec?.certificationsRequired && jobSpec.certificationsRequired.length > 0 && (
                  <div data-testid="collected-certifications">
                    <span className="text-muted-foreground">Certifications:</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {jobSpec.certificationsRequired.map((cert: string, i: number) => (
                        <span key={i} className="bg-green-500/20 text-green-400 px-2 py-0.5 rounded text-xs">
                          {cert}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {jobSpec?.physicalRequirements && (
                  <div data-testid="collected-physical">
                    <span className="text-muted-foreground">Physical Requirements:</span>
                    <p className="font-medium mt-1">{jobSpec.physicalRequirements}</p>
                  </div>
                )}
                {jobSpec?.equipmentExperience && (
                  <div data-testid="collected-equipment">
                    <span className="text-muted-foreground">Equipment Experience:</span>
                    <p className="font-medium mt-1">{jobSpec.equipmentExperience}</p>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </Card>
      )}
      
      {!showCollectedData && (
        <div className="flex-shrink-0 w-12">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCollectedData(true)}
            className="writing-mode-vertical text-xs h-24"
            data-testid="button-show-collected-data"
          >
            Show Details →
          </Button>
        </div>
      )}
    </div>
  );
}
