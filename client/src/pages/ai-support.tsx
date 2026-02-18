import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
  MessageCircle, 
  Send, 
  Loader2, 
  Bot, 
  User,
  Sparkles,
  RotateCcw,
  ArrowRight,
  Navigation,
  MapPin,
  CheckCircle2
} from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

interface NavigationHint {
  path: string;
  label: string;
  selector?: string;
  step?: number;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  relatedTopics?: string[];
  suggestedActions?: string[];
  navigationHints?: NavigationHint[];
}

const PAGE_MAPPINGS: Record<string, { label: string; selector?: string; description?: string }> = {
  "/hr-dashboard": { 
    label: "HR Command Centre", 
    selector: "[data-testid='button-create-job-dialog']",
    description: "Create new jobs and manage recruitment"
  },
  "/executive-dashboard-custom": { 
    label: "Executive Dashboard", 
    selector: "[data-testid='button-add-chart']",
    description: "Add custom analytics charts"
  },
  "/recruitment-agent": { 
    label: "AI Recruitment",
    description: "Search for candidates with AI"
  },
  "/candidates-list": { 
    label: "Candidates List",
    description: "Upload and manage candidate CVs"
  },
  "/pipeline-board": { 
    label: "Candidate Pipeline",
    description: "View candidates across pipeline stages"
  },
  "/interview-console": { 
    label: "Interview Console",
    description: "Manage all interviews"
  },
  "/interview/face-to-face": { 
    label: "Face to Face Interview",
    description: "Schedule in-person interviews"
  },
  "/interview/voice": { 
    label: "Voice Interview",
    description: "Start AI voice interviews"
  },
  "/interview/video": { 
    label: "Video Interview",
    description: "Start video interviews with AI avatar"
  },
  "/offer-setup": { 
    label: "Offer Setup",
    description: "Download and manage offer templates"
  },
  "/onboarding-setup": { 
    label: "Onboarding Setup",
    description: "Download onboarding templates"
  },
  "/integrity-setup": { 
    label: "Integrity Setup",
    description: "Configure background check settings"
  },
  "/document-automation": { 
    label: "Document Automation",
    description: "Generate documents with AI"
  },
  "/document-library": { 
    label: "Document Library",
    description: "Browse all documents"
  },
  "/kpi-management": { 
    label: "KPI Management",
    description: "Create and manage KPIs"
  },
  "/kpi-review": { 
    label: "My KPI Review",
    description: "Submit self-review"
  },
  "/workforce-intelligence": { 
    label: "Workforce Intelligence",
    description: "View workforce analytics"
  },
  "/recommendations": { 
    label: "AI Recommendations",
    description: "View AI-generated recommendations"
  },
};

function extractNavigationHints(content: string): NavigationHint[] {
  const hints: NavigationHint[] = [];
  const pathRegex = /\(?(\/[a-z-]+(?:\/[a-z-]+)?)\)?/gi;
  const seenPaths = new Set<string>();
  
  let match;
  let stepNum = 1;
  while ((match = pathRegex.exec(content)) !== null) {
    const path = match[1];
    if (PAGE_MAPPINGS[path] && !seenPaths.has(path)) {
      seenPaths.add(path);
      hints.push({
        path,
        label: PAGE_MAPPINGS[path].label,
        selector: PAGE_MAPPINGS[path].selector,
        step: stepNum++
      });
    }
  }
  
  return hints;
}

function highlightElement(selector: string) {
  document.querySelectorAll('.highlight-pulse').forEach(el => {
    el.classList.remove('highlight-pulse');
  });
  
  const selectors = selector.split(',').map(s => s.trim());
  
  for (const sel of selectors) {
    try {
      const element = document.querySelector(sel);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        element.classList.add('highlight-pulse');
        setTimeout(() => {
          element.classList.remove('highlight-pulse');
        }, 5000);
        return true;
      }
    } catch {
      continue;
    }
  }
  return false;
}

export default function AISupport() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(() => `session_${Date.now()}`);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleNavigate = (hint: NavigationHint) => {
    setLocation(hint.path);
    
    if (hint.selector) {
      setTimeout(() => {
        highlightElement(hint.selector!);
      }, 800);
    }
    
    toast({
      title: `Navigating to ${hint.label}`,
      description: hint.selector ? "I'll highlight the relevant area for you." : undefined,
    });
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user_${Date.now()}`,
      role: "user",
      content: input.trim()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await api.post("/support/chat", {
        question: userMessage.content,
        sessionId
      });

      const answerContent = response.data.answer || "I'm not sure how to help with that. Please try rephrasing your question.";
      
      let navigationHints = extractNavigationHints(answerContent);
      
      if (response.data.navigationSteps && response.data.navigationSteps.length > 0) {
        const apiHints: NavigationHint[] = response.data.navigationSteps.map((step: { path: string; label: string; action: string }, index: number) => {
          const mapping = PAGE_MAPPINGS[step.path];
          return {
            path: step.path,
            label: step.label || mapping?.label || step.path,
            selector: mapping?.selector,
            step: index + 1
          };
        });
        navigationHints = apiHints.length > 0 ? apiHints : navigationHints;
      }

      const assistantMessage: Message = {
        id: `assistant_${Date.now()}`,
        role: "assistant",
        content: answerContent,
        relatedTopics: response.data.relatedTopics,
        suggestedActions: response.data.suggestedActions,
        navigationHints
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to get response. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearHistory = async () => {
    try {
      await api.post("/support/clear-history", { sessionId });
      setMessages([]);
      toast({
        title: "Conversation Cleared",
        description: "Your conversation history has been cleared."
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to clear history.",
        variant: "destructive"
      });
    }
  };

  const handleQuickQuestion = (question: string) => {
    setInput(question);
    setTimeout(() => handleSend(), 100);
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Bot className="w-7 h-7 text-primary" />
          </div>
          AI Support Assistant
        </h1>
        <p className="text-muted-foreground mt-2">
          Ask me anything about how to use the MTN - Human Capital platform. I'll guide you step-by-step with highlighted navigation!
        </p>
      </div>

      <Card className="h-[600px] flex flex-col" data-testid="support-chat-panel">
        <CardHeader className="pb-2 flex flex-row items-center justify-between border-b">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Platform Help</CardTitle>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleClearHistory}
            data-testid="button-clear-history"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Clear Chat
          </Button>
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            {messages.length === 0 ? (
              <div className="space-y-6">
                <div className="text-center py-8">
                  <Sparkles className="w-16 h-16 mx-auto text-primary/30 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">How can I help you today?</h3>
                  <p className="text-muted-foreground">
                    Ask me about any feature and I'll show you exactly where to go with highlighted guidance.
                  </p>
                </div>
                <div className="space-y-3">
                  <p className="text-sm font-medium text-muted-foreground">Quick questions to get started:</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                      "How do I create a new job?",
                      "How do I add a chart to the dashboard?",
                      "How do I schedule an interview?",
                      "How do I download templates?",
                      "How do I run a background check?",
                      "How do I manage candidates?"
                    ].map((q, i) => (
                      <Button
                        key={i}
                        variant="outline"
                        className="w-full justify-start text-left h-auto py-3 px-4"
                        onClick={() => handleQuickQuestion(q)}
                        data-testid={`button-quick-question-${i}`}
                      >
                        <MessageCircle className="w-4 h-4 mr-2 flex-shrink-0 text-primary" />
                        <span>{q}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                    data-testid={`message-${message.role}-${message.id}`}
                  >
                    {message.role === "assistant" && (
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Bot className="w-5 h-5 text-primary" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-3 ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      
                      {message.role === "assistant" && message.navigationHints && message.navigationHints.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-border/50">
                          <p className="text-xs font-medium mb-2 flex items-center gap-1">
                            <Navigation className="w-3 h-3" />
                            Quick Navigation (click to go there & highlight):
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {message.navigationHints.map((hint, i) => (
                              <Button
                                key={i}
                                variant="secondary"
                                size="sm"
                                className="h-auto py-2 px-3 gap-2"
                                onClick={() => handleNavigate(hint)}
                                data-testid={`button-navigate-${hint.path.replace(/\//g, '-')}`}
                              >
                                <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                                  {hint.step}
                                </div>
                                <MapPin className="w-3 h-3" />
                                <span className="text-xs">{hint.label}</span>
                                <ArrowRight className="w-3 h-3" />
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {message.role === "assistant" && message.suggestedActions && message.suggestedActions.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-border/50">
                          <p className="text-xs font-medium mb-2 opacity-70 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Suggested actions:
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {message.suggestedActions.map((action, i) => (
                              <Badge key={i} variant="secondary" className="text-xs" data-testid={`action-badge-${i}`}>
                                <ArrowRight className="w-3 h-3 mr-1" />
                                {action}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {message.role === "assistant" && message.relatedTopics && message.relatedTopics.length > 0 && (
                        <div className="mt-2">
                          <div className="flex flex-wrap gap-1">
                            {message.relatedTopics.map((topic, i) => (
                              <Badge 
                                key={i} 
                                variant="outline" 
                                className="text-xs cursor-pointer hover:bg-accent"
                                onClick={() => handleQuickQuestion(topic)}
                                data-testid={`topic-badge-${i}`}
                              >
                                {topic}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    {message.role === "user" && (
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                ))}
                
                {isLoading && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-5 h-5 text-primary" />
                    </div>
                    <div className="bg-muted rounded-lg px-4 py-3">
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
          
          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Ask me anything about the platform..."
                disabled={isLoading}
                className="flex-1"
                data-testid="input-support-question"
              />
              <Button 
                onClick={handleSend} 
                disabled={!input.trim() || isLoading}
                data-testid="button-send-question"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
