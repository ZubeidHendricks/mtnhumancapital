import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Send, Sparkles, CheckCircle2, Bot, FileText, MessageSquare, Upload, Pencil, Save, X, Search, Globe, UserCog } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { useTenantQueryKey } from "@/hooks/useTenant";

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
  const [mode, setMode] = useState<"chat" | "paste" | "research">("research");
  const [fullJobSpec, setFullJobSpec] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [researchJobTitle, setResearchJobTitle] = useState("");
  const [researchCustomer, setResearchCustomer] = useState("");
  const [researchIndustry, setResearchIndustry] = useState("");
  const [isResearching, setIsResearching] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedJobSpec, setEditedJobSpec] = useState<any>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch employees for agent selection
  const { data: employees = [] } = useQuery({
    queryKey: useTenantQueryKey(["employees"]),
    queryFn: async () => {
      const response = await api.get("/employees");
      return response.data;
    },
  });

  const handleStartEdit = () => {
    setEditedJobSpec({ ...jobSpec });
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    setJobSpec(editedJobSpec);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditedJobSpec(null);
    setIsEditing(false);
  };

  const updateEditedField = (field: string, value: any) => {
    setEditedJobSpec((prev: any) => ({
      ...prev,
      [field]: value,
    }));
  };

  const parseNumericInput = (value: string): number | undefined => {
    if (value === '' || value === null || value === undefined) return undefined;
    const parsed = parseInt(value, 10);
    return Number.isNaN(parsed) ? undefined : parsed;
  };

  const formatNumericValue = (value: number | undefined | null): string => {
    if (value === undefined || value === null) return '';
    return String(value);
  };

  // Start conversation automatically when in chat mode
  useEffect(() => {
    if (mode !== "chat") return;
    
    const startConversation = async () => {
      setIsLoading(true);
      try {
        const response = await api.post("/jobs/conversation/chat", {
          sessionId,
          message: "start",
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
  }, [sessionId, mode]);

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

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: response.data.reply,
          timestamp: new Date(),
        },
      ]);

      if (response.data.jobSpec) {
        setJobSpec(response.data.jobSpec);
      }
      
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

  const handleParseFullSpec = async () => {
    if (!fullJobSpec.trim() || isParsing) return;

    setIsParsing(true);
    
    try {
      const response = await api.post("/jobs/conversation/parse-spec", {
        sessionId,
        fullSpec: fullJobSpec.trim(),
      });

      if (response.data.jobSpec) {
        setJobSpec(response.data.jobSpec);
        setIsComplete(true);
        setMessages([
          {
            role: "assistant",
            content: "I've analyzed your job specification and extracted all the key details. Please review the information on the right panel and click 'Create Job' when ready.",
            timestamp: new Date(),
          },
        ]);
      }
    } catch (error) {
      console.error("Failed to parse job spec:", error);
      setMessages([
        {
          role: "assistant",
          content: "I had trouble parsing that job specification. Please try reformatting it or use the chat mode to enter details step by step.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsParsing(false);
    }
  };

  const handleCreateJob = async (isDraft: boolean = false) => {
    setIsLoading(true);
    try {
      let finalJobSpec = jobSpec;
      
      if (isEditing && editedJobSpec) {
        finalJobSpec = editedJobSpec;
        setJobSpec(editedJobSpec);
        setIsEditing(false);
      }
      
      // Find selected agent name for caching
      const selectedAgent = employees.find((emp: any) => emp.id === selectedAgentId);
      
      await api.post("/jobs/conversation/create", {
        sessionId,
        isDraft,
        jobSpec: finalJobSpec,
        assignedAgentId: selectedAgentId || undefined,
        assignedAgentName: selectedAgent?.fullName || undefined,
      });

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

  const handleAIResearch = async () => {
    if (!researchJobTitle.trim() || isResearching) return;

    setIsResearching(true);
    setMessages([
      {
        role: "assistant",
        content: `Researching "${researchJobTitle}" job specifications from industry standards...`,
        timestamp: new Date(),
      },
    ]);
    
    try {
      const response = await api.post("/jobs/conversation/research", {
        sessionId,
        jobTitle: researchJobTitle.trim(),
        customer: researchCustomer.trim() || undefined,
        industry: researchIndustry.trim() || undefined,
      });

      if (response.data.jobSpec) {
        setJobSpec(response.data.jobSpec);
        setIsComplete(true);
        setMessages([
          {
            role: "assistant",
            content: `I've researched and compiled a comprehensive job specification for "${researchJobTitle}". Please review the details on the right panel and make any necessary edits. Click 'Create Job' when ready.`,
            timestamp: new Date(),
          },
        ]);
      }
    } catch (error) {
      console.error("Failed to research job spec:", error);
      setMessages([
        {
          role: "assistant",
          content: "I had trouble researching that job specification. Please try again or use the chat mode.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsResearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const hasAnyData = jobSpec && Object.values(jobSpec).some(v => v !== undefined && v !== null && v !== '');

  return (
    <div className="flex flex-col h-[600px]">
      {/* Mode Selector */}
      <div className="p-4 border-b border-white/10">
        <Tabs value={mode} onValueChange={(v) => setMode(v as "chat" | "paste" | "research")}>
          <TabsList className="grid w-full grid-cols-3 bg-card/50">
            <TabsTrigger value="research" className="gap-2" data-testid="tab-research-mode">
              <Globe className="w-4 h-4" />
              AI Research
            </TabsTrigger>
            <TabsTrigger value="chat" className="gap-2" data-testid="tab-chat-mode">
              <MessageSquare className="w-4 h-4" />
              Chat with AI
            </TabsTrigger>
            <TabsTrigger value="paste" className="gap-2" data-testid="tab-paste-mode">
              <FileText className="w-4 h-4" />
              Paste Spec
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex gap-4 flex-1 overflow-hidden p-4">
        {/* Main Content Area */}
        <div className="flex flex-col flex-1">
          {mode === "research" ? (
            <>
              {/* AI Research Mode */}
              <div className="flex items-center gap-3 p-4 border-b border-white/10 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-t-lg">
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Globe className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-white">AI Job Research</h3>
                  <p className="text-xs text-muted-foreground">
                    Enter a job title and let AI research industry-standard specifications
                  </p>
                </div>
                {isComplete && (
                  <div className="flex items-center gap-2 text-green-500 text-sm">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Complete</span>
                  </div>
                )}
              </div>

              <div className="flex-1 p-4 bg-card/20 rounded-b-lg flex flex-col gap-4">
                {!isComplete ? (
                  <div className="space-y-4">
                    <div>
                      <Label className="text-muted-foreground text-sm">Customer / Company</Label>
                      <Input
                        value={researchCustomer}
                        onChange={(e) => setResearchCustomer(e.target.value)}
                        placeholder="e.g., ABC Logistics, Client Name"
                        className="mt-1 bg-background/50 border-white/10"
                        data-testid="input-research-customer"
                      />
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-sm">Industry</Label>
                      <Input
                        value={researchIndustry}
                        onChange={(e) => setResearchIndustry(e.target.value)}
                        placeholder="e.g., Logistics, Manufacturing, Finance, Healthcare"
                        className="mt-1 bg-background/50 border-white/10"
                        data-testid="input-research-industry"
                      />
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-sm">Job Title *</Label>
                      <Input
                        value={researchJobTitle}
                        onChange={(e) => setResearchJobTitle(e.target.value)}
                        placeholder="e.g., Truck Driver, Warehouse Manager, Accountant"
                        className="mt-1 bg-background/50 border-white/10"
                        data-testid="input-research-job-title"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      AI will research typical job specifications for this position and auto-populate all fields including duties, qualifications, remuneration, and more.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={onCancel}
                        data-testid="button-cancel-research"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleAIResearch}
                        disabled={isResearching || !researchJobTitle.trim()}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                        data-testid="button-start-research"
                      >
                        {isResearching ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Researching...
                          </>
                        ) : (
                          <>
                            <Search className="w-4 h-4 mr-2" />
                            Research Job Spec
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                      <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                        ✓ Job specification researched successfully! Review the details on the right and click "Create Job" to publish.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={onCancel}
                        data-testid="button-cancel-research-complete"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={() => handleCreateJob(false)}
                        disabled={isLoading}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                        data-testid="button-create-job-research"
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
                )}
              </div>
            </>
          ) : mode === "chat" ? (
            <>
              {/* Chat Header */}
              <div className="flex items-center gap-3 p-4 border-b border-white/10 bg-gradient-to-r from-primary/10 to-blue-500/10 rounded-t-lg">
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
              <ScrollArea ref={scrollAreaRef} className="flex-1 p-4 bg-card/20 rounded-b-lg">
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

              {/* Chat Input Area */}
              <div className="p-4 border-t border-white/10">
                {isComplete ? (
                  <div className="space-y-3">
                    <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                      <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                        ✓ Job specification complete! Review the details and click "Create Job" to publish.
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
            </>
          ) : (
            <>
              {/* Paste Full Spec Mode */}
              <div className="flex items-center gap-3 p-4 border-b border-white/10 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-t-lg">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-white">Paste Full Job Specification</h3>
                  <p className="text-xs text-muted-foreground">
                    Paste your complete job spec and AI will extract all details
                  </p>
                </div>
              </div>

              <div className="flex-1 p-4 bg-card/20 rounded-b-lg flex flex-col gap-4">
                <Textarea
                  value={fullJobSpec}
                  onChange={(e) => setFullJobSpec(e.target.value)}
                  placeholder={`Paste your full job specification here...

Example:
Job Title: Senior Software Engineer
Department: Engineering
Location: Johannesburg, Gauteng

About the Role:
We are looking for a Senior Software Engineer to join our team...

Requirements:
- 5+ years of experience in software development
- Proficiency in React, Node.js, and TypeScript
- Strong problem-solving skills

Responsibilities:
- Design and implement new features
- Mentor junior developers
- Code review and quality assurance

Salary: R850,000 - R1,200,000 per annum
Benefits: Medical aid, retirement fund, flexible hours`}
                  className="flex-1 min-h-[300px] bg-background/50 border-white/10 resize-none"
                  data-testid="textarea-full-job-spec"
                />

                {isComplete ? (
                  <div className="space-y-3">
                    <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                      <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                        ✓ Job specification parsed successfully! Review the details and click "Create Job" to publish.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={onCancel}
                        data-testid="button-cancel-paste"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={() => handleCreateJob(false)}
                        disabled={isLoading}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                        data-testid="button-create-job-paste"
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
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={onCancel}
                      data-testid="button-cancel-paste-mode"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleParseFullSpec}
                      disabled={isParsing || !fullJobSpec.trim()}
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                      data-testid="button-parse-spec"
                    >
                      {isParsing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Extract Job Details
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Collected Data Panel */}
        {showCollectedData && (
          <Card className="w-80 flex-shrink-0 p-4 bg-card/50 border-white/10 overflow-hidden relative">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm">{isEditing ? 'Edit Job Details' : 'Extracted Information'}</h3>
              <div className="flex items-center gap-1">
                {hasAnyData && !isEditing && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleStartEdit}
                    className="h-6 w-6 p-0 hover:bg-white/10"
                    data-testid="button-edit-job-spec"
                    title="Edit job details"
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                )}
                {isEditing ? (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSaveEdit}
                      className="h-6 w-6 p-0 hover:bg-green-500/20 text-green-600 dark:text-green-400"
                      data-testid="button-save-edit"
                      title="Save changes"
                    >
                      <Save className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCancelEdit}
                      className="h-6 w-6 p-0 hover:bg-red-500/20 text-red-400"
                      data-testid="button-cancel-edit"
                      title="Cancel editing"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowCollectedData(false)}
                    className="h-6 w-6 p-0"
                    data-testid="button-hide-collected-data"
                  >
                    ✕
                  </Button>
                )}
              </div>
            </div>
            
            <ScrollArea className="h-[calc(100%-3rem)]">
              {!hasAnyData ? (
                <p className="text-xs text-muted-foreground text-center py-8">
                  {mode === "chat" 
                    ? "Chat with the AI to start collecting job details..."
                    : "Paste a job spec and click 'Extract Job Details' to analyze it..."
                  }
                </p>
              ) : isEditing ? (
                <div className="space-y-4 text-xs">
                  <div>
                    <Label className="text-muted-foreground text-xs">Customer / Company</Label>
                    <Input
                      value={editedJobSpec?.customer || ''}
                      onChange={(e) => updateEditedField('customer', e.target.value)}
                      className="mt-1 h-8 text-xs bg-background/50 border-white/10"
                      placeholder="e.g., ABC Logistics"
                      data-testid="input-edit-customer"
                    />
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Job Title *</Label>
                    <Input
                      value={editedJobSpec?.title || ''}
                      onChange={(e) => updateEditedField('title', e.target.value)}
                      className="mt-1 h-8 text-xs bg-background/50 border-white/10"
                      placeholder="e.g., Truck Driver"
                      data-testid="input-edit-title"
                    />
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Introduction</Label>
                    <Textarea
                      value={editedJobSpec?.introduction || ''}
                      onChange={(e) => updateEditedField('introduction', e.target.value)}
                      className="mt-1 min-h-[60px] text-xs bg-background/50 border-white/10"
                      placeholder="Brief introduction about the role..."
                      data-testid="input-edit-introduction"
                    />
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Duties & Responsibilities (one per line)</Label>
                    <Textarea
                      value={(editedJobSpec?.duties || []).join('\n')}
                      onChange={(e) => updateEditedField('duties', e.target.value.split('\n').filter(r => r.trim()))}
                      className="mt-1 min-h-[60px] text-xs bg-background/50 border-white/10"
                      placeholder="Enter duties..."
                      data-testid="input-edit-duties"
                    />
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Attributes, Skills & Competencies (one per line)</Label>
                    <Textarea
                      value={(editedJobSpec?.attributes || []).join('\n')}
                      onChange={(e) => updateEditedField('attributes', e.target.value.split('\n').filter(r => r.trim()))}
                      className="mt-1 min-h-[60px] text-xs bg-background/50 border-white/10"
                      placeholder="Enter attributes..."
                      data-testid="input-edit-attributes"
                    />
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Qualifications (one per line)</Label>
                    <Textarea
                      value={(editedJobSpec?.qualifications || []).join('\n')}
                      onChange={(e) => updateEditedField('qualifications', e.target.value.split('\n').filter(r => r.trim()))}
                      className="mt-1 min-h-[60px] text-xs bg-background/50 border-white/10"
                      placeholder="Enter qualifications..."
                      data-testid="input-edit-qualifications"
                    />
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Remuneration</Label>
                    <Input
                      value={editedJobSpec?.remuneration || ''}
                      onChange={(e) => updateEditedField('remuneration', e.target.value)}
                      className="mt-1 h-8 text-xs bg-background/50 border-white/10"
                      placeholder="e.g., R25,000 - R40,000 per month"
                      data-testid="input-edit-remuneration"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-muted-foreground text-xs">Gender</Label>
                      <Input
                        value={editedJobSpec?.gender || ''}
                        onChange={(e) => updateEditedField('gender', e.target.value)}
                        className="mt-1 h-8 text-xs bg-background/50 border-white/10"
                        placeholder="Any"
                        data-testid="input-edit-gender"
                      />
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Ethics</Label>
                      <Input
                        value={editedJobSpec?.ethics || ''}
                        onChange={(e) => updateEditedField('ethics', e.target.value)}
                        className="mt-1 h-8 text-xs bg-background/50 border-white/10"
                        placeholder="Integrity, honesty"
                        data-testid="input-edit-ethics"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-muted-foreground text-xs">City</Label>
                      <Input
                        value={editedJobSpec?.city || ''}
                        onChange={(e) => updateEditedField('city', e.target.value)}
                        className="mt-1 h-8 text-xs bg-background/50 border-white/10"
                        placeholder="e.g., Johannesburg"
                        data-testid="input-edit-city"
                      />
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Province</Label>
                      <Input
                        value={editedJobSpec?.province || ''}
                        onChange={(e) => updateEditedField('province', e.target.value)}
                        className="mt-1 h-8 text-xs bg-background/50 border-white/10"
                        placeholder="e.g., Gauteng"
                        data-testid="input-edit-province"
                      />
                    </div>
                  </div>
                  <div className="border-t border-white/10 pt-3 mt-3">
                    <Label className="text-muted-foreground text-xs flex items-center gap-1">
                      <UserCog className="w-3 h-3" />
                      Assign Recruitment Agent
                    </Label>
                    <Select
                      value={selectedAgentId}
                      onValueChange={setSelectedAgentId}
                    >
                      <SelectTrigger className="mt-1 h-8 text-xs bg-background/50 border-white/10" data-testid="select-agent">
                        <SelectValue placeholder="Select an agent..." />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map((emp: any) => (
                          <SelectItem key={emp.id} value={emp.id} data-testid={`agent-option-${emp.id}`}>
                            {emp.fullName} {emp.jobTitle ? `- ${emp.jobTitle}` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Internal recruiter responsible for this job
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 text-xs">
                  {jobSpec?.customer && (
                    <div data-testid="collected-customer">
                      <span className="text-muted-foreground">Customer:</span>
                      <p className="font-medium mt-1">{jobSpec.customer}</p>
                    </div>
                  )}
                  {jobSpec?.title && (
                    <div data-testid="collected-title">
                      <span className="text-muted-foreground">Job Title:</span>
                      <p className="font-medium mt-1">{jobSpec.title}</p>
                    </div>
                  )}
                  {jobSpec?.introduction && (
                    <div data-testid="collected-introduction">
                      <span className="text-muted-foreground">Introduction:</span>
                      <p className="font-medium mt-1 line-clamp-3">{jobSpec.introduction}</p>
                    </div>
                  )}
                  {jobSpec?.duties && jobSpec.duties.length > 0 && (
                    <div data-testid="collected-duties">
                      <span className="text-muted-foreground">Duties & Responsibilities:</span>
                      <ul className="mt-1 space-y-1">
                        {jobSpec.duties.slice(0, 5).map((duty: string, i: number) => (
                          <li key={i} className="text-xs flex items-start gap-1">
                            <span className="text-primary">•</span>
                            <span className="line-clamp-2">{duty}</span>
                          </li>
                        ))}
                        {jobSpec.duties.length > 5 && (
                          <li className="text-muted-foreground">+{jobSpec.duties.length - 5} more...</li>
                        )}
                      </ul>
                    </div>
                  )}
                  {jobSpec?.attributes && jobSpec.attributes.length > 0 && (
                    <div data-testid="collected-attributes">
                      <span className="text-muted-foreground">Attributes & Skills:</span>
                      <ul className="mt-1 space-y-1">
                        {jobSpec.attributes.slice(0, 5).map((attr: string, i: number) => (
                          <li key={i} className="text-xs flex items-start gap-1">
                            <span className="text-green-600 dark:text-green-400">•</span>
                            <span className="line-clamp-2">{attr}</span>
                          </li>
                        ))}
                        {jobSpec.attributes.length > 5 && (
                          <li className="text-muted-foreground">+{jobSpec.attributes.length - 5} more...</li>
                        )}
                      </ul>
                    </div>
                  )}
                  {jobSpec?.qualifications && jobSpec.qualifications.length > 0 && (
                    <div data-testid="collected-qualifications">
                      <span className="text-muted-foreground">Qualifications:</span>
                      <ul className="mt-1 space-y-1">
                        {jobSpec.qualifications.slice(0, 5).map((qual: string, i: number) => (
                          <li key={i} className="text-xs flex items-start gap-1">
                            <span className="text-amber-400">•</span>
                            <span className="line-clamp-2">{qual}</span>
                          </li>
                        ))}
                        {jobSpec.qualifications.length > 5 && (
                          <li className="text-muted-foreground">+{jobSpec.qualifications.length - 5} more...</li>
                        )}
                      </ul>
                    </div>
                  )}
                  {jobSpec?.remuneration && (
                    <div data-testid="collected-remuneration">
                      <span className="text-muted-foreground">Remuneration:</span>
                      <p className="font-medium mt-1">{jobSpec.remuneration}</p>
                    </div>
                  )}
                  {(jobSpec?.city || jobSpec?.province) && (
                    <div data-testid="collected-location">
                      <span className="text-muted-foreground">Location:</span>
                      <p className="font-medium mt-1">{jobSpec.city}{jobSpec.city && jobSpec.province ? ', ' : ''}{jobSpec.province}</p>
                    </div>
                  )}
                  {jobSpec?.gender && (
                    <div data-testid="collected-gender">
                      <span className="text-muted-foreground">Gender:</span>
                      <p className="font-medium mt-1">{jobSpec.gender}</p>
                    </div>
                  )}
                  {jobSpec?.ethics && (
                    <div data-testid="collected-ethics">
                      <span className="text-muted-foreground">Ethics:</span>
                      <p className="font-medium mt-1">{jobSpec.ethics}</p>
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
                  {jobSpec?.requirements && jobSpec.requirements.length > 0 && (
                    <div data-testid="collected-requirements">
                      <span className="text-muted-foreground">Requirements:</span>
                      <ul className="mt-1 space-y-1">
                        {jobSpec.requirements.slice(0, 5).map((req: string, i: number) => (
                          <li key={i} className="text-xs flex items-start gap-1">
                            <span className="text-primary">•</span>
                            <span className="line-clamp-2">{req}</span>
                          </li>
                        ))}
                        {jobSpec.requirements.length > 5 && (
                          <li className="text-muted-foreground">+{jobSpec.requirements.length - 5} more...</li>
                        )}
                      </ul>
                    </div>
                  )}
                  {jobSpec?.responsibilities && jobSpec.responsibilities.length > 0 && (
                    <div data-testid="collected-responsibilities">
                      <span className="text-muted-foreground">Responsibilities:</span>
                      <ul className="mt-1 space-y-1">
                        {jobSpec.responsibilities.slice(0, 5).map((resp: string, i: number) => (
                          <li key={i} className="text-xs flex items-start gap-1">
                            <span className="text-green-600 dark:text-green-400">•</span>
                            <span className="line-clamp-2">{resp}</span>
                          </li>
                        ))}
                        {jobSpec.responsibilities.length > 5 && (
                          <li className="text-muted-foreground">+{jobSpec.responsibilities.length - 5} more...</li>
                        )}
                      </ul>
                    </div>
                  )}
                  {jobSpec?.benefits && jobSpec.benefits.length > 0 && (
                    <div data-testid="collected-benefits">
                      <span className="text-muted-foreground">Benefits:</span>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {jobSpec.benefits.map((benefit: string, i: number) => (
                          <span key={i} className="bg-green-500/20 text-green-600 dark:text-green-400 px-2 py-0.5 rounded text-xs">
                            {benefit}
                          </span>
                        ))}
                      </div>
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
                  {jobSpec?.certificationsRequired && jobSpec.certificationsRequired.length > 0 && (
                    <div data-testid="collected-certifications">
                      <span className="text-muted-foreground">Certifications:</span>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {jobSpec.certificationsRequired.map((cert: string, i: number) => (
                          <span key={i} className="bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded text-xs">
                            {cert}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Agent Selection - Always visible in view mode */}
                  <div className="border-t border-white/10 pt-3 mt-3" data-testid="agent-selection-section">
                    <Label className="text-muted-foreground text-xs flex items-center gap-1">
                      <UserCog className="w-3 h-3" />
                      Recruitment Agent
                    </Label>
                    <Select
                      value={selectedAgentId}
                      onValueChange={setSelectedAgentId}
                    >
                      <SelectTrigger className="mt-1 h-8 text-xs bg-background/50 border-white/10" data-testid="select-agent-view">
                        <SelectValue placeholder="Select an agent..." />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map((emp: any) => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {emp.fullName} {emp.jobTitle ? `- ${emp.jobTitle}` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Internal recruiter responsible for this job
                    </p>
                  </div>
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
    </div>
  );
}
