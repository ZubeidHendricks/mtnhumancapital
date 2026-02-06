import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTenantQueryKey } from "@/hooks/useTenant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Send, 
  Bot, 
  User, 
  UserPlus, 
  Mail, 
  FileSignature, 
  Laptop, 
  CheckCircle2, 
  Loader2, 
  Briefcase,
  Search
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import type { Candidate, OnboardingWorkflow } from "@shared/schema";

type Message = {
  id: string;
  role: "user" | "agent";
  content: string;
  timestamp: Date;
};

type RagStep = {
  id: string;
  label: string;
  status: "pending" | "processing" | "completed";
  details?: string[];
  icon: any;
};

type RetrievedDoc = {
  id: string;
  title: string;
  type: "document" | "asset" | "email";
  status: "sent" | "signed" | "provisioned" | "pending";
  snippet: string;
};

export default function OnboardingAgent() {
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "agent",
      content: "Welcome to the Onboarding Automation Agent. I handle everything from welcome packets to equipment provisioning. Select a candidate from the list or search by name to begin their onboarding process.",
      timestamp: new Date()
    }
  ]);
  const [ragSteps, setRagSteps] = useState<RagStep[]>([]);
  const [retrievedDocs, setRetrievedDocs] = useState<RetrievedDoc[]>([]);
  const [workflowId, setWorkflowId] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const candidatesKey = useTenantQueryKey(['candidates']);
  const onboardingWorkflowKey = useTenantQueryKey(selectedCandidate?.id ? ['onboarding-workflow', selectedCandidate.id] : ['onboarding-workflow']);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const { data: candidates = [], isLoading: candidatesLoading } = useQuery<Candidate[]>({
    queryKey: candidatesKey,
    queryFn: async () => {
      const response = await api.get("/candidates");
      return response.data;
    },
  });

  const { data: workflow, isLoading: workflowLoading } = useQuery<OnboardingWorkflow | null>({
    queryKey: onboardingWorkflowKey,
    queryFn: async () => {
      if (!selectedCandidate) return null;
      const response = await api.get(`/onboarding/status/${selectedCandidate.id}`);
      return response.data;
    },
    enabled: !!selectedCandidate,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data || data.status === "Completed" || data.status === "Failed") {
        return false;
      }
      return 2000;
    },
  });

  useEffect(() => {
    if (workflow) {
      const tasks = workflow.tasks as any[] || [];
      const documents = workflow.documents as any[] || [];

      const steps: RagStep[] = tasks.map((task: any) => ({
        id: task.id,
        label: task.title,
        status: task.status,
        details: task.details,
        icon: task.type === "welcome" ? Mail : 
              task.type === "paperwork" ? FileSignature :
              task.type === "provisioning" ? Laptop : UserPlus,
      }));

      setRagSteps(steps);
      setRetrievedDocs(documents);

      if (workflow.status === "Completed") {
        const completionMessage: Message = {
          id: `completion-${workflow.id}`,
          role: "agent",
          content: "Onboarding sequence completed successfully.\n\n✅ Welcome Packet: Sent\n✅ Paperwork: NDA and Offer Letter signed\n✅ IT Provisioning: Laptop ordered, accounts created\n✅ Orientation: Scheduled\n\nAll tasks have been completed. The candidate is ready for their first day!",
          timestamp: new Date(),
        };

        setMessages(prev => {
          const exists = prev.some(m => m.id === completionMessage.id);
          if (!exists) {
            return [...prev, completionMessage];
          }
          return prev;
        });
      }
    }
  }, [workflow]);

  const startOnboardingMutation = useMutation({
    mutationFn: async (candidateId: string) => {
      const response = await api.post(`/onboarding/trigger/${candidateId}`);
      return response.data;
    },
    onSuccess: (data) => {
      setWorkflowId(data.workflow.id);
      queryClient.invalidateQueries({ queryKey: onboardingWorkflowKey });
      
      const agentResponse: Message = {
        id: Date.now().toString(),
        role: "agent",
        content: `Initiating onboarding workflow for ${selectedCandidate?.fullName}...\n\nI'm now processing:\n• Welcome package preparation\n• Document automation\n• IT system provisioning\n• Orientation scheduling\n\nWatch the progress in real-time on the left panel.`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, agentResponse]);
    },
    onError: () => {
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: "agent",
        content: "Sorry, there was an error starting the onboarding process. Please try again.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    },
  });

  const handleCandidateSelect = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
    setRagSteps([]);
    setRetrievedDocs([]);
    setWorkflowId(null);

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: `Start onboarding for ${candidate.fullName}`,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);

    setTimeout(() => {
      startOnboardingMutation.mutate(candidate.id);
    }, 500);
  };

  const filteredCandidates = candidates.filter(c =>
    c.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.role?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      
      <div className="flex-1 pt-20 container mx-auto px-4 py-6 h-[calc(100vh-80px)]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
          
          {/* LEFT: Workflow Visualization */}
          <div className="hidden lg:block lg:col-span-3 flex flex-col gap-6 h-full overflow-hidden">
            <Card className="bg-card/30 border-border dark:border-white/10 backdrop-blur-sm flex-1 flex flex-col overflow-hidden" data-testid="card-workflow-steps">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-primary" /> 
                  Onboarding Flow
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto pr-2">
                <div className="space-y-6 relative">
                  <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-white/5 z-0" />
                  
                  {ragSteps.length === 0 && (
                    <div className="text-sm text-muted-foreground text-center py-8 italic">
                      Ready to onboard...
                    </div>
                  )}

                  <AnimatePresence>
                    {ragSteps.map((step, index) => (
                      <motion.div 
                        key={step.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="relative z-10"
                        data-testid={`step-${step.id}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center shrink-0 bg-background ${
                            step.status === "completed" ? "border-green-500 text-green-500" : 
                            step.status === "processing" ? "border-primary text-primary animate-pulse" : 
                            "border-muted text-muted-foreground"
                          }`}>
                            {step.status === "completed" ? <CheckCircle2 className="w-5 h-5" /> : <step.icon className="w-5 h-5" />}
                          </div>
                          <div className="flex-1 pt-1">
                            <h4 className={`text-sm font-bold ${step.status === "processing" ? "text-primary" : "text-foreground"}`}>
                              {step.label}
                            </h4>
                            {step.details && (
                              <motion.ul 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                className="mt-2 space-y-1"
                              >
                                {step.details.map((detail, i) => (
                                  <li key={i} className="text-xs text-muted-foreground flex items-center gap-1.5">
                                    <div className="w-1 h-1 rounded-full bg-white/20" />
                                    {detail}
                                  </li>
                                ))}
                              </motion.ul>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* MIDDLE: Chat Interface */}
          <div className="lg:col-span-6 flex flex-col h-full">
            <Card className="flex-1 flex flex-col bg-card/50 border-border dark:border-white/10 backdrop-blur-md overflow-hidden" data-testid="card-chat">
              <CardHeader className="border-b border-border dark:border-white/5 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    <div>
                      <CardTitle className="text-base">Onboarding Agent</CardTitle>
                      <CardDescription className="text-xs">Employee Integration & Provisioning</CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary text-[10px]">
                    {workflow?.status || "READY"}
                  </Badge>
                </div>
              </CardHeader>
              
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-6 pb-4">
                  {messages.map((msg) => (
                    <motion.div 
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex items-start gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                      data-testid={`message-${msg.role}`}
                    >
                      <Avatar className={`w-8 h-8 ${msg.role === "agent" ? "border border-primary/50" : "border border-border dark:border-white/10"}`}>
                        <AvatarImage src={msg.role === "agent" ? "" : "/user.png"} />
                        <AvatarFallback className={msg.role === "agent" ? "bg-primary/10 text-primary" : "bg-white/10"}>
                          {msg.role === "agent" ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className={`rounded-2xl px-4 py-3 max-w-[80%] text-sm leading-relaxed ${
                        msg.role === "user" 
                          ? "bg-primary text-primary-foreground rounded-tr-none" 
                          : "bg-white/5 border border-border dark:border-white/10 rounded-tl-none"
                      }`}>
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                        <div className={`text-[10px] mt-1 opacity-50 ${msg.role === "user" ? "text-primary-foreground" : "text-muted-foreground"}`}>
                          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  
                  {startOnboardingMutation.isPending && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-start gap-3"
                    >
                       <Avatar className="w-8 h-8 border border-primary/50">
                        <AvatarFallback className="bg-primary/10 text-primary">
                          <Bot className="w-4 h-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="bg-white/5 border border-border dark:border-white/10 rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        <span className="text-xs text-muted-foreground">Starting onboarding workflow...</span>
                      </div>
                    </motion.div>
                  )}
                  <div ref={scrollRef} />
                </div>
              </ScrollArea>
            </Card>
          </div>

          {/* RIGHT: Candidate Selector & Doc Tracker */}
          <div className="hidden lg:block lg:col-span-3 flex flex-col gap-6 h-full overflow-hidden">
            {!selectedCandidate ? (
              <Card className="bg-card/30 border-border dark:border-white/10 backdrop-blur-sm flex-1 flex flex-col overflow-hidden" data-testid="card-candidate-selector">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Search className="w-4 h-4 text-primary" /> 
                    Select Candidate
                  </CardTitle>
                  <div className="mt-2">
                    <Input
                      placeholder="Search candidates..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-black/40 border-border dark:border-white/10 text-white text-sm"
                      data-testid="input-search-candidate"
                    />
                  </div>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto pr-2">
                  {candidatesLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : filteredCandidates.length === 0 ? (
                    <div className="text-sm text-muted-foreground text-center py-8 italic">
                      No candidates found
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredCandidates.map((candidate) => (
                        <div
                          key={candidate.id}
                          onClick={() => handleCandidateSelect(candidate)}
                          className="p-3 rounded-lg bg-white/5 border border-border dark:border-white/10 hover:border-primary/50 cursor-pointer transition-all group"
                          data-testid={`candidate-${candidate.id}`}
                        >
                          <h5 className="text-sm font-medium group-hover:text-primary transition-colors">
                            {candidate.fullName}
                          </h5>
                          <p className="text-xs text-muted-foreground">{candidate.role || "No role specified"}</p>
                          <p className="text-xs text-muted-foreground truncate">{candidate.email || "No email"}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-card/30 border-border dark:border-white/10 backdrop-blur-sm flex-1 flex flex-col overflow-hidden" data-testid="card-document-tracker">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-primary" /> 
                    Onboarding Checklist
                  </CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setSelectedCandidate(null)}
                    className="mt-2 text-xs"
                    data-testid="button-select-another"
                  >
                    Select Another Candidate
                  </Button>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto pr-2">
                  {retrievedDocs.length === 0 ? (
                     <div className="text-sm text-muted-foreground text-center py-8 italic">
                        No actions initiated yet.
                      </div>
                  ) : (
                    <div className="space-y-3">
                      <AnimatePresence>
                        {retrievedDocs.map((doc, index) => (
                          <motion.div
                            key={doc.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            data-testid={`document-${doc.id}`}
                          >
                            <div className={`p-3 rounded-lg bg-white/5 border transition-colors group cursor-pointer ${
                              doc.status === "pending" ? "border-border dark:border-white/10 border-dashed" : 
                              "border-border dark:border-white/5 hover:border-green-500/30"
                            }`}>
                              <div className="flex items-start justify-between mb-1">
                                <div className="flex items-center gap-2">
                                  {doc.type === "document" ? <FileSignature className="w-3 h-3 text-blue-600 dark:text-blue-400" /> : 
                                   doc.type === "asset" ? <Laptop className="w-3 h-3 text-amber-600 dark:text-amber-400" /> : 
                                   <Mail className="w-3 h-3 text-blue-600 dark:text-blue-400" />}
                                  <Badge variant="secondary" className="text-[10px] h-4 px-1 bg-white/10">{doc.type}</Badge>
                                </div>
                                {doc.status === "pending" ? (
                                  <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
                                    <Loader2 className="w-3 h-3 animate-spin" /> PENDING
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-green-600 dark:text-green-400 font-mono flex items-center gap-1 uppercase">
                                    <CheckCircle2 className="w-3 h-3" /> {doc.status}
                                  </span>
                                )}
                              </div>
                              <h5 className="text-sm font-medium truncate mb-1 group-hover:text-foreground transition-colors">{doc.title}</h5>
                              <p className="text-xs text-muted-foreground line-clamp-2 italic">"{doc.snippet}"</p>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
