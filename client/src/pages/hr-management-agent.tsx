import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { 
  Send, 
  Bot, 
  User, 
  TrendingUp, 
  MessageSquare, 
  GraduationCap, 
  Wallet, 
  Loader2, 
  BarChart3,
  PieChart,
  Target,
  CheckCircle2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Types for our mock RAG system
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

type Metric = {
  id: string;
  label: string;
  value: number; // 0-100
  trend: "up" | "down" | "neutral";
  category: "performance" | "satisfaction" | "training";
};

export default function HRManagementAgent() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "agent",
      content: "I am the HR Management AI. I monitor staff performance, analyze sentiment, and oversee payroll compliance. How can I assist with your workforce management today?",
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  
  // RAG State
  const [ragSteps, setRagSteps] = useState<RagStep[]>([]);
  const [metrics, setMetrics] = useState<Metric[]>([]);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const newUserMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newUserMsg]);
    setInputValue("");
    setIsProcessing(true);

    // Simulate HR Management Workflow
    // 1. Sentiment/Feedback -> 2. Training Eval -> 3. Performance/KPI -> 4. Payroll/Benefits
    
    // Step 1: Sentiment Analysis
    setRagSteps([
      { id: "1", label: "Analyzing Employee Sentiment", status: "processing", icon: MessageSquare, details: ["Scanning feedback channels...", "Processing anonymous surveys...", "Detecting burnout markers..."] }
    ]);
    
    await new Promise(r => setTimeout(r, 1500));
    
    setMetrics([
      { id: "m1", label: "Staff Satisfaction", value: 85, trend: "up", category: "satisfaction" },
      { id: "m2", label: "Feedback Participation", value: 92, trend: "up", category: "satisfaction" }
    ]);

    setRagSteps(prev => [
      { ...prev[0], status: "completed" },
      { id: "2", label: "Evaluating Training Impact", status: "processing", icon: GraduationCap, details: ["Reviewing completion rates...", "Assessing skill gap closure...", "Updating competency matrix..."] }
    ]);

    await new Promise(r => setTimeout(r, 2000));

    setMetrics(prev => [
      ...prev,
      { id: "m3", label: "Training Completion", value: 78, trend: "neutral", category: "training" },
      { id: "m4", label: "Skill Acquisition", value: 88, trend: "up", category: "training" }
    ]);

    // Step 3: Performance & KPIs
    setRagSteps(prev => [
      ...prev.slice(0, 1),
      { ...prev[1], status: "completed" },
      { id: "3", label: "Calculating Performance KPIs", status: "processing", icon: Target, details: ["Aggregating sales figures...", "Analyzing project delivery times...", "Benchmarking against Q3 goals..."] }
    ]);
    
    await new Promise(r => setTimeout(r, 2000));
    
    setMetrics(prev => [
      ...prev,
      { id: "m5", label: "KPI Achievement", value: 94, trend: "up", category: "performance" },
      { id: "m6", label: "Productivity Index", value: 82, trend: "down", category: "performance" }
    ]);

    // Step 4: Payroll
    setRagSteps(prev => [
      ...prev.slice(0, 2),
      { ...prev[2], status: "completed" },
      { id: "4", label: "Payroll & Benefits Sync", status: "processing", icon: Wallet, details: ["Validating timesheets...", "Calculating performance bonuses...", "Syncing with Finance API..."] }
    ]);

    await new Promise(r => setTimeout(r, 1500));

    setRagSteps(prev => prev.map(s => ({ ...s, status: "completed" })));
    setIsProcessing(false);

    const agentResponse: Message = {
      id: (Date.now() + 1).toString(),
      role: "agent",
      content: "Analysis Complete.\n\n**Summary:**\n- **Sentiment:** High (85%). Staff morale is positive following the new benefits rollout.\n- **Performance:** Excellent. The team is exceeding KPI targets by 4%.\n- **Payroll:** Bonuses have been calculated based on Q3 performance and queued for Finance approval.\n\nI have generated the 'Executive Talent Report'. Would you like to review the payroll breakdown?",
      timestamp: new Date()
    };
    setMessages(prev => [...prev, agentResponse]);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      
      <div className="flex-1 pt-20 container mx-auto px-4 py-6 h-[calc(100vh-80px)]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
          
          {/* LEFT: Workflow Visualization */}
          <div className="hidden lg:block lg:col-span-3 flex flex-col gap-6 h-full overflow-hidden">
            <Card className="bg-card/30 border-border dark:border-white/10 backdrop-blur-sm flex-1 flex flex-col overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" /> 
                  HR Process Flow
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto pr-2">
                <div className="space-y-6 relative">
                  {/* Connecting Line */}
                  <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-white/5 z-0" />
                  
                  {ragSteps.length === 0 && (
                    <div className="text-sm text-muted-foreground text-center py-8 italic">
                      Awaiting instructions...
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
            <Card className="flex-1 flex flex-col bg-card/50 border-border dark:border-white/10 backdrop-blur-md overflow-hidden">
              <CardHeader className="border-b border-border dark:border-white/5 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                    <div>
                      <CardTitle className="text-base">HR Management Agent</CardTitle>
                      <CardDescription className="text-xs">Performance, Payroll & Analytics Engine</CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary text-[10px]">ANALYTICS MODE</Badge>
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
                  
                  {isProcessing && (
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
                        <span className="text-xs text-muted-foreground">Compiling department reports...</span>
                      </div>
                    </motion.div>
                  )}
                  <div ref={scrollRef} />
                </div>
              </ScrollArea>

              <div className="p-4 border-t border-border dark:border-white/5 bg-black/20">
                <div className="flex gap-2">
                  <Input 
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                    placeholder="Ask for performance reports, payroll status, or training stats..." 
                    className="bg-white/5 border-border dark:border-white/10 focus-visible:ring-primary/50"
                  />
                  <Button 
                    onClick={handleSendMessage}
                    disabled={isProcessing || !inputValue.trim()}
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {/* RIGHT: Live Analytics Dashboard */}
          <div className="hidden lg:block lg:col-span-3 flex flex-col gap-6 h-full overflow-hidden">
            <Card className="bg-card/30 border-border dark:border-white/10 backdrop-blur-sm flex-1 flex flex-col overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-primary" /> 
                  Live Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto pr-2">
                {metrics.length === 0 ? (
                   <div className="text-sm text-muted-foreground text-center py-8 italic">
                      No data analyzed yet.
                    </div>
                ) : (
                  <div className="space-y-6">
                    <AnimatePresence>
                      {metrics.map((metric, index) => (
                        <motion.div
                          key={metric.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                        >
                          <div className="space-y-2">
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-muted-foreground">{metric.label}</span>
                              <span className="font-bold text-foreground">{metric.value}%</span>
                            </div>
                            <Progress value={metric.value} className={`h-2 ${
                              metric.category === "performance" ? "text-indigo-500" : 
                              metric.category === "satisfaction" ? "text-pink-500" : 
                              "text-amber-500"
                            }`} />
                            <div className="text-xs flex justify-end">
                              {metric.trend === "up" ? (
                                <span className="text-green-400 flex items-center gap-1">Trending Up <TrendingUp className="w-3 h-3" /></span>
                              ) : metric.trend === "down" ? (
                                <span className="text-red-400 flex items-center gap-1">Needs Attention <TrendingUp className="w-3 h-3 rotate-180" /></span>
                              ) : (
                                <span className="text-muted-foreground">Stable</span>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </div>
  );
}