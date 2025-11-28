import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTenantQueryKey } from "@/hooks/useTenant";
import { Navbar } from "@/components/layout/navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Search, Filter, Users, TrendingUp, CheckCircle,
  ChevronRight, Plus, X, MapPin, Brain, Send, Loader2,
  Sparkles, AlertTriangle, ArrowRight, Bell, Flame
} from "lucide-react";
import { api } from "@/lib/api";
import type { Employee, Skill, Job, EmployeeSkill, SkillActivity, Department } from "@shared/schema";

interface DepartmentWithSkills extends Department {
  employees?: Employee[];
  skillGaps?: string[];
}

interface EmployeeWithSkills extends Employee {
  skills?: (EmployeeSkill & { skill?: Skill })[];
  matchScore?: number;
}

interface AIResponse {
  success: boolean;
  answer: string;
  confidence: number;
  matchedEmployee: { name: string; matchScore: number; reason: string } | null;
  insights: string[];
  recommendations: string[];
  alerts: { type: string; message: string }[];
  thinkingTime: number;
}

interface WorkforceAlert {
  id: string;
  type: "urgent" | "promotion" | "info";
  category: string;
  title: string;
  description: string;
  team?: string;
  time: string;
}

const SKILL_STATUS_COLORS = {
  critical_gap: { bg: "bg-red-500/20", text: "text-red-400", border: "border-red-500/30", dot: "bg-red-500" },
  training_needed: { bg: "bg-yellow-500/20", text: "text-yellow-400", border: "border-yellow-500/30", dot: "bg-yellow-500" },
  good_match: { bg: "bg-green-500/20", text: "text-green-400", border: "border-green-500/30", dot: "bg-green-500" },
  beyond_expectations: { bg: "bg-purple-500/20", text: "text-purple-400", border: "border-purple-500/30", dot: "bg-purple-500" },
};

export default function WorkforceIntelligence() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeWithSkills | null>(null);
  const [showSkillGaps, setShowSkillGaps] = useState(true);
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiResponse, setAiResponse] = useState<AIResponse | null>(null);
  const [isAiThinking, setIsAiThinking] = useState(false);
  
  const employeesKey = useTenantQueryKey(["employees"]);
  const skillsKey = useTenantQueryKey(["skills"]);
  const departmentsKey = useTenantQueryKey(["departments"]);
  const jobsKey = useTenantQueryKey(["jobs"]);
  const alertsKey = useTenantQueryKey(["workforce-alerts"]);

  const { data: employees = [] } = useQuery<EmployeeWithSkills[]>({
    queryKey: employeesKey,
    queryFn: async () => {
      const response = await api.get("/employees");
      return response.data;
    },
  });

  const { data: skills = [] } = useQuery<Skill[]>({
    queryKey: skillsKey,
    queryFn: async () => {
      const response = await api.get("/skills");
      return response.data;
    },
  });

  const { data: departments = [] } = useQuery<DepartmentWithSkills[]>({
    queryKey: departmentsKey,
    queryFn: async () => {
      const response = await api.get("/departments");
      return response.data;
    },
  });

  const { data: jobs = [] } = useQuery<Job[]>({
    queryKey: jobsKey,
    queryFn: async () => {
      const response = await api.get("/jobs");
      return response.data;
    },
  });

  const { data: alertsData } = useQuery<{ alerts: WorkforceAlert[] }>({
    queryKey: alertsKey,
    queryFn: async () => {
      const response = await api.get("/workforce-ai/alerts");
      return response.data;
    },
  });

  const askAIMutation = useMutation({
    mutationFn: async (question: string) => {
      const response = await api.post("/workforce-ai/ask", { question });
      return response.data as AIResponse;
    },
    onSuccess: (data) => {
      setAiResponse(data);
      setIsAiThinking(false);
    },
    onError: () => {
      setIsAiThinking(false);
    },
  });

  const handleAskAI = () => {
    if (!aiQuestion.trim()) return;
    setIsAiThinking(true);
    setAiResponse(null);
    askAIMutation.mutate(aiQuestion);
  };

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const mockDepartments: DepartmentWithSkills[] = [
    { id: "1", tenantId: "1", name: "Operations", headCount: 12, skillGapScore: 12, skillGaps: ["Data Analysis", "Inventory Management", "Teamwork", "Attention to Detail"], metadata: null, createdAt: new Date(), updatedAt: new Date() },
    { id: "2", tenantId: "1", name: "Legal", headCount: 8, skillGapScore: 11, skillGaps: ["Intellectual Property (IP) Law", "Analytical Thinking"], metadata: null, createdAt: new Date(), updatedAt: new Date() },
    { id: "3", tenantId: "1", name: "Finance", headCount: 10, skillGapScore: 10, skillGaps: ["Risk Management", "Ethical Judgment"], metadata: null, createdAt: new Date(), updatedAt: new Date() },
    { id: "4", tenantId: "1", name: "Marketing", headCount: 15, skillGapScore: 9, skillGaps: ["Data Analysis", "SEO", "Leadership", "Communication"], metadata: null, createdAt: new Date(), updatedAt: new Date() },
  ];

  const mockJobs = [
    { id: "1", title: "Senior Product Designer", department: "Design", salaryMin: 6000, salaryMax: 8000, location: "Remote", applicants: 32, internalMatches: 6, skills: ["Data Analysis", "Analytical Thinking"] },
    { id: "2", title: "Financial Analyst", department: "Finance", salaryMin: 5000, salaryMax: 7000, location: "Johannesburg", applicants: 28, internalMatches: 4, skills: ["Data Analysis", "Analytical Thinking"] },
  ];

  const mockActivities = [
    { id: "1", employeeName: "Mark", skillName: "Public Presentation", type: "skill_added", time: "23 minutes ago", teamName: null },
    { id: "2", employeeName: "Julia", skillName: "Communication", type: "gap_closed", time: "2 hours ago", teamName: null },
    { id: "3", employeeName: null, skillName: "Hubspot", type: "skill_added", time: "2 hours ago", teamName: "Marketing team" },
    { id: "4", employeeName: null, skillName: null, type: "no_update", time: "Yesterday", teamName: "Sales team", message: "hasn't made any skill status updates or improvements in the last week" },
  ];

  const mockSkillAssessments = [
    { name: "Communication", description: "Exchanging information effectively through verbal, non-verbal, and written means to convey ideas...", skills: ["Active listening", "Written communication"], status: "good_match", mentors: ["avatar1", "avatar2"] },
    { name: "Planning and organising", description: "Setting objectives, prioritising tasks, and managing resources effectively to achieve goals...", skills: ["Time management"], status: "training_needed", mentors: ["avatar3"] },
    { name: "Supporting others", description: "Providing help, guidance, and encouragement to individuals or teams to enhance performance...", skills: ["Coaching", "Mentoring"], status: "good_match", mentors: ["avatar4", "avatar5"] },
    { name: "Recruiting and hiring", description: "Identifying, attracting, and selecting suitable candidates by assessing skills, experience...", skills: ["Interviewing", "Assessing"], status: "critical_gap", mentors: ["avatar6"] },
    { name: "Supervising people", description: "Overseeing and guiding individuals or teams by setting expectations, providing support...", skills: ["Delegating", "Leadership"], status: "good_match", mentors: ["avatar7"] },
    { name: "Making decisions", description: "Evaluating information, weighing options, and choosing the best course of action...", skills: ["Critical thinking", "Risk assessing"], status: "training_needed", mentors: ["avatar8"] },
    { name: "Assessing data", description: "Collecting, analyzing, and interpreting information to identify patterns and support decision-making...", skills: ["Trend identification", "Report interpretation"], status: "good_match", mentors: ["avatar9"] },
    { name: "Marketing", description: "Promoting products, services, or brands by understanding customer needs, crafting messages...", skills: ["Market research", "Branding", "Digital marketing"], status: "beyond_expectations", mentors: ["avatar10"] },
  ];

  const mockMatchingData = {
    skills: ["Javascript", "Project Management", "HTML5", "Solution Architecture", "Lean methodologies"],
    people: [
      { name: "Dylan George", avatar: "", scores: { "Javascript": 90, "Project Management": 80, "HTML5": 85, "Solution Architecture": 75, "Lean methodologies": 70 }, overallMatch: 90 },
      { name: "Helly Riggs", avatar: "", scores: { "Javascript": 85, "Project Management": 75, "HTML5": 80, "Solution Architecture": 65, "Lean methodologies": 60 }, overallMatch: 80 },
      { name: "Kier Eagan", avatar: "", scores: { "Javascript": 70, "Project Management": 80, "HTML5": 65, "Solution Architecture": null, "Lean methodologies": 55 }, overallMatch: 70 },
      { name: "Burt Goodman", avatar: "", scores: { "Javascript": null, "Project Management": 60, "HTML5": null, "Solution Architecture": 50, "Lean methodologies": null }, overallMatch: null },
      { name: "Mark Scout", avatar: "", scores: { "Javascript": 60, "Project Management": 55, "HTML5": 50, "Solution Architecture": 45, "Lean methodologies": 40 }, overallMatch: 50 },
    ],
  };

  const displayDepartments = departments.length > 0 ? departments : mockDepartments;
  const alerts = alertsData?.alerts || [];

  const sampleQuestions = [
    "Who's the best candidate to lead the product expansion in Cape Town?",
    "Which team has the most skill gaps?",
    "Who is ready for promotion?",
    "What skills are we missing in Marketing?",
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      <div className="pt-20 pb-8">
        <div className="container mx-auto px-4">
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500">
                <Brain className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                  Workforce Intelligence
                </h1>
                <p className="text-zinc-400">
                  AI-powered skills analysis, internal mobility & workforce insights
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <Input
                  placeholder="Search by keyword"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-80 bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500"
                  data-testid="input-search"
                />
              </div>
              <Button variant="outline" size="icon" className="border-zinc-700 bg-zinc-900 hover:bg-zinc-800">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* AI Assistant & Alerts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Ask AHC - AI Assistant */}
            <Card className="bg-gradient-to-br from-cyan-900/30 via-purple-900/30 to-pink-900/30 border-zinc-700 overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Badge className="bg-amber-500/20 text-amber-400 border-0">Ask AHC</Badge>
                </div>
                <CardTitle className="text-xl text-white">Get instant answers</CardTitle>
                <CardDescription className="text-zinc-400">
                  Instead of wasting weeks pulling data or waiting for reports, get clear, reliable answers in seconds.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Question Input */}
                <div className="bg-white rounded-xl p-4 shadow-lg">
                  <p className="text-zinc-800 font-medium mb-3">{aiQuestion || "Who's the best candidate to lead the product expansion in Spain?"}</p>
                  <div className="flex gap-2">
                    <Input
                      value={aiQuestion}
                      onChange={(e) => setAiQuestion(e.target.value)}
                      placeholder="Ask anything about your workforce..."
                      className="flex-1 bg-zinc-100 border-zinc-200 text-zinc-900 placeholder:text-zinc-500"
                      onKeyDown={(e) => e.key === "Enter" && handleAskAI()}
                      data-testid="input-ai-question"
                    />
                    <Button 
                      onClick={handleAskAI}
                      disabled={isAiThinking || !aiQuestion.trim()}
                      className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                      data-testid="button-ask-ai"
                    >
                      {isAiThinking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                {/* AI Response */}
                {isAiThinking && (
                  <div className="bg-zinc-800/50 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-amber-400">
                      <Sparkles className="h-4 w-4 animate-pulse" />
                      <span className="text-sm">AHC thinking for ~{Math.floor(Math.random() * 5) + 3}s...</span>
                    </div>
                  </div>
                )}

                {aiResponse && (
                  <div className="bg-white rounded-xl p-4 shadow-lg space-y-3">
                    {aiResponse.matchedEmployee && (
                      <div className="flex items-center gap-3 pb-3 border-b border-zinc-200">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback className="bg-amber-100 text-amber-700">
                            {getInitials(aiResponse.matchedEmployee.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-zinc-900">{aiResponse.matchedEmployee.name}</p>
                          <div className="flex items-center gap-2">
                            <Badge className="bg-green-100 text-green-700">
                              <span className="w-2 h-2 rounded-full bg-green-500 mr-1" />
                              {aiResponse.matchedEmployee.matchScore}% Great skill match
                            </Badge>
                          </div>
                        </div>
                      </div>
                    )}
                    <p className="text-zinc-700 text-sm">{aiResponse.answer}</p>
                    {aiResponse.insights.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-2">
                        {aiResponse.insights.map((insight, i) => (
                          <Badge key={i} variant="outline" className="text-xs text-zinc-600">{insight}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Sample Questions */}
                <div className="flex flex-wrap gap-2">
                  {sampleQuestions.slice(0, 2).map((q, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      size="sm"
                      className="text-xs border-zinc-600 bg-zinc-800/50 hover:bg-zinc-700 text-zinc-300"
                      onClick={() => setAiQuestion(q)}
                    >
                      {q}
                    </Button>
                  ))}
                </div>

                <Button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                  Ask anything
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </CardContent>
            </Card>

            {/* Execution Co-Pilot - Alerts */}
            <Card className="bg-gradient-to-br from-pink-900/30 via-purple-900/30 to-blue-900/30 border-zinc-700 overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Badge className="bg-pink-500/20 text-pink-400 border-0">Execution Co-Pilot</Badge>
                </div>
                <CardTitle className="text-xl text-white">Execute & stay on track</CardTitle>
                <CardDescription className="text-zinc-400">
                  Turn answers into workforce plans, map the right people, keep reports live, and flag risks early.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Alerts */}
                {(alerts.length > 0 ? alerts : [
                  { id: "1", type: "urgent" as const, category: "Skill analysis", title: "3 team members need to grow in Sales Techniques", description: "A crucial skill for the Sales Team.", time: "now" },
                  { id: "2", type: "promotion" as const, category: "Promotion alert", title: "2 members of this team are ready for promotion", description: "Consider internal mobility opportunities.", time: "2h ago" },
                ]).map((alert) => (
                  <div key={alert.id} className="bg-white rounded-xl p-4 shadow-lg">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <p className="text-zinc-800 font-medium text-sm">{alert.title}</p>
                        <div className="flex items-center gap-2">
                          <Badge className={`text-xs ${
                            alert.type === "urgent" 
                              ? "bg-red-100 text-red-700" 
                              : "bg-purple-100 text-purple-700"
                          }`}>
                            {alert.type === "urgent" ? <Flame className="h-3 w-3 mr-1" /> : <TrendingUp className="h-3 w-3 mr-1" />}
                            {alert.type === "urgent" ? "Urgent" : "Promotion alert"}
                          </Badge>
                          <Badge variant="outline" className="text-xs text-zinc-500">
                            {alert.category}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-zinc-500">{alert.time}</span>
                        <Button variant="ghost" size="sm" className="text-blue-600 text-xs p-0 h-auto mt-1 block">
                          More <ArrowRight className="h-3 w-3 inline ml-1" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}

                <Button className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                  Connect your systems
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="dashboard" className="space-y-6">
            <TabsList className="bg-zinc-900 border border-zinc-800 p-1">
              <TabsTrigger value="dashboard" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white">
                Dashboard
              </TabsTrigger>
              <TabsTrigger value="skills" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white">
                Skill Assessment
              </TabsTrigger>
              <TabsTrigger value="matching" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white">
                Matching
              </TabsTrigger>
              <TabsTrigger value="people" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white">
                People
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <Card className="bg-zinc-900/50 border-zinc-800">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg text-white">Skill analysis</CardTitle>
                          <CardDescription className="text-zinc-400">Area's to focus on</CardDescription>
                        </div>
                        <Button variant="outline" size="sm" className="border-zinc-700 bg-zinc-800 hover:bg-zinc-700">
                          <Filter className="h-4 w-4 mr-2" />
                          Filter
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {displayDepartments.map((dept, idx) => (
                          <Card 
                            key={dept.id} 
                            className="bg-zinc-800/50 border-zinc-700 hover:border-amber-500/50 transition-colors cursor-pointer"
                            data-testid={`card-department-${dept.name.toLowerCase()}`}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between mb-3">
                                <Badge variant="outline" className="text-xs text-zinc-400 border-zinc-600">
                                  #{12 - idx}
                                </Badge>
                                <span className="font-semibold text-white">{dept.name}</span>
                              </div>
                              <div className="flex items-center gap-1 mb-3">
                                {[...Array(Math.min(dept.headCount || 4, 5))].map((_, i) => (
                                  <Avatar key={i} className="h-6 w-6 -ml-1 first:ml-0 border-2 border-zinc-800">
                                    <AvatarFallback className="text-[10px] bg-zinc-700 text-zinc-300">
                                      {String.fromCharCode(65 + i)}
                                    </AvatarFallback>
                                  </Avatar>
                                ))}
                                {(dept.headCount || 0) > 5 && (
                                  <span className="text-xs text-zinc-500 ml-1">+{(dept.headCount || 0) - 5}</span>
                                )}
                              </div>
                              <div className="space-y-2">
                                <p className="text-xs text-zinc-500">Skill to address:</p>
                                <div className="flex flex-wrap gap-1">
                                  {(dept.skillGaps || []).slice(0, 3).map((skill, i) => (
                                    <Badge 
                                      key={i}
                                      variant="secondary" 
                                      className="text-[10px] bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border-0"
                                    >
                                      {skill}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-zinc-900/50 border-zinc-800">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg text-white">Internal Mobility</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {mockJobs.map((job) => (
                        <Card 
                          key={job.id} 
                          className="bg-zinc-800/50 border-zinc-700 hover:border-amber-500/50 transition-colors"
                          data-testid={`card-job-${job.id}`}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="space-y-2">
                                <h3 className="font-semibold text-lg text-white">{job.title}</h3>
                                <div className="flex flex-wrap gap-1">
                                  {job.skills.map((skill, i) => (
                                    <Badge 
                                      key={i}
                                      className="text-xs bg-blue-500/20 text-blue-400 border-0"
                                    >
                                      {skill}
                                    </Badge>
                                  ))}
                                </div>
                                <p className="text-sm text-zinc-400 line-clamp-2">
                                  As a {job.title}, you will play a key role in the product development lifecycle...
                                </p>
                                <div className="flex items-center gap-4 text-sm text-zinc-500">
                                  <span className="flex items-center gap-1">
                                    <span className="font-medium text-white">R{job.salaryMin?.toLocaleString()} - R{job.salaryMax?.toLocaleString()}</span>/month
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Users className="h-4 w-4" />
                                    {job.applicants} applicants
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <MapPin className="h-4 w-4" />
                                    {job.location}
                                  </span>
                                </div>
                                <p className="text-sm text-amber-400 font-medium">
                                  Internal matches: {job.internalMatches}
                                </p>
                              </div>
                              <div className="flex -space-x-2">
                                {[...Array(Math.min(job.internalMatches, 4))].map((_, i) => (
                                  <Avatar key={i} className="h-8 w-8 border-2 border-zinc-800">
                                    <AvatarFallback className="text-xs bg-amber-500/20 text-amber-400">
                                      {String.fromCharCode(65 + i)}
                                    </AvatarFallback>
                                  </Avatar>
                                ))}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-6">
                  <Card className="bg-zinc-900/50 border-zinc-800">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg text-white">Learning Path</CardTitle>
                        <ChevronRight className="h-4 w-4 text-zinc-500" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="relative">
                        <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-zinc-700" />
                        <div className="space-y-4">
                          {mockActivities.map((activity) => (
                            <div key={activity.id} className="relative pl-8">
                              <div className={`absolute left-1.5 w-3 h-3 rounded-full border-2 border-zinc-900 ${
                                activity.type === "skill_added" ? "bg-green-500" :
                                activity.type === "gap_closed" ? "bg-blue-500" :
                                activity.type === "no_update" ? "bg-red-500" :
                                "bg-amber-500"
                              }`} />
                              <div className="space-y-1">
                                <p className="text-xs text-zinc-500">{activity.time}</p>
                                <p className="text-sm text-zinc-300">
                                  {activity.employeeName ? (
                                    <>
                                      <span className="font-medium text-white">{activity.employeeName}</span>
                                      {activity.type === "skill_added" ? " has added a new skill:" : " has closed her skill gap in:"}
                                    </>
                                  ) : activity.teamName ? (
                                    <>
                                      <span className="font-medium text-white">{activity.teamName}</span>
                                      {activity.message ? ` ${activity.message}` : " has added a new skill:"}
                                    </>
                                  ) : null}
                                </p>
                                {activity.skillName && (
                                  <Badge className={`text-xs border-0 ${
                                    activity.type === "skill_added" ? "bg-green-500/20 text-green-400" :
                                    activity.type === "gap_closed" ? "bg-blue-500/20 text-blue-400" :
                                    "bg-amber-500/20 text-amber-400"
                                  }`}>
                                    {activity.skillName}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="skills" className="space-y-6">
              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <CardTitle className="text-lg text-white">Skill assessment</CardTitle>
                      <div className="flex items-center gap-2">
                        <Switch checked={true} />
                        <Label className="text-sm text-zinc-400">Group similar skills</Label>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" className="border-zinc-700 bg-zinc-800">All types</Button>
                      <Button variant="outline" size="sm" className="border-zinc-700 bg-zinc-800">Manage skills</Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-4">
                    <Badge variant="outline" className="bg-zinc-800 border-zinc-700 text-zinc-300">All 21</Badge>
                    <Badge className="bg-red-500/20 text-red-400 border-0">
                      <span className="w-2 h-2 rounded-full bg-red-500 mr-1" />
                      Critical gap 1
                    </Badge>
                    <Badge className="bg-yellow-500/20 text-yellow-400 border-0">
                      <span className="w-2 h-2 rounded-full bg-yellow-500 mr-1" />
                      Training needed 5
                    </Badge>
                    <Badge className="bg-green-500/20 text-green-400 border-0">
                      <span className="w-2 h-2 rounded-full bg-green-500 mr-1" />
                      Good skill match 13
                    </Badge>
                    <Badge className="bg-purple-500/20 text-purple-400 border-0">
                      <span className="w-2 h-2 rounded-full bg-purple-500 mr-1" />
                      Beyond expectations 2
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {mockSkillAssessments.map((skill, idx) => {
                      const colors = SKILL_STATUS_COLORS[skill.status as keyof typeof SKILL_STATUS_COLORS] || SKILL_STATUS_COLORS.good_match;
                      return (
                        <Card 
                          key={idx}
                          className={`border ${colors.border} ${colors.bg} hover:shadow-md transition-shadow cursor-pointer`}
                          data-testid={`card-skill-${skill.name.toLowerCase().replace(/\s+/g, '-')}`}
                        >
                          <CardContent className="p-4 space-y-3">
                            <div className="flex items-start justify-between">
                              <h3 className="font-semibold text-white">{skill.name}</h3>
                              <div className={`w-2 h-2 rounded-full ${colors.dot}`} />
                            </div>
                            <p className="text-xs text-zinc-400 line-clamp-3">{skill.description}</p>
                            <div>
                              <p className="text-xs text-zinc-500 mb-1">Skills</p>
                              <div className="flex flex-wrap gap-1">
                                {skill.skills.map((s, i) => (
                                  <Badge key={i} variant="outline" className="text-[10px] border-zinc-600 text-zinc-300">{s}</Badge>
                                ))}
                              </div>
                            </div>
                            <div>
                              <p className="text-xs text-zinc-500 mb-1">Recommended mentors</p>
                              <div className="flex -space-x-1">
                                {[...Array(2)].map((_, i) => (
                                  <Avatar key={i} className="h-6 w-6 border-2 border-zinc-900">
                                    <AvatarFallback className="text-[10px] bg-zinc-700 text-zinc-300">
                                      {String.fromCharCode(65 + i + idx)}
                                    </AvatarFallback>
                                  </Avatar>
                                ))}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="matching" className="space-y-6">
              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <CardTitle className="text-lg text-white">Matching</CardTitle>
                      <div className="flex items-center gap-2">
                        <Switch checked={showSkillGaps} onCheckedChange={setShowSkillGaps} />
                        <Label className="text-sm text-zinc-400">Show skill gap</Label>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" className="border-zinc-700 bg-zinc-800">Quick select</Button>
                      <Button variant="outline" size="sm" className="border-zinc-700 bg-zinc-800">Select Tag or</Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr>
                          <th className="text-left p-3 border-b border-zinc-700 w-48"></th>
                          {mockMatchingData.people.map((person, idx) => (
                            <th key={idx} className="p-3 border-b border-zinc-700 text-center min-w-[120px]">
                              <div className="flex flex-col items-center gap-2">
                                <Avatar className="h-10 w-10">
                                  <AvatarFallback className="bg-amber-500/20 text-amber-400">
                                    {getInitials(person.name)}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-sm font-medium text-white">{person.name}</span>
                                <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-zinc-500 hover:text-zinc-300">
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            </th>
                          ))}
                          <th className="p-3 border-b border-zinc-700 w-12">
                            <Button variant="outline" size="sm" className="h-8 w-8 p-0 border-zinc-700 bg-zinc-800">
                              <Plus className="h-4 w-4" />
                            </Button>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {mockMatchingData.skills.map((skill, skillIdx) => (
                          <tr key={skillIdx} className="hover:bg-zinc-800/50">
                            <td className="p-3 border-b border-zinc-800">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-white">{skill}</span>
                                <div className="flex items-center gap-1 text-zinc-500">
                                  <span className="text-xs">↕</span>
                                  <X className="h-3 w-3 cursor-pointer hover:text-zinc-300" />
                                </div>
                              </div>
                            </td>
                            {mockMatchingData.people.map((person, personIdx) => {
                              const score = person.scores[skill as keyof typeof person.scores];
                              const getScoreColor = (s: number | null) => {
                                if (s === null) return "bg-zinc-800";
                                if (s >= 80) return "bg-green-500/20";
                                if (s >= 60) return "bg-yellow-500/20";
                                if (s >= 40) return "bg-orange-500/20";
                                return "bg-red-500/20";
                              };
                              const getScoreIcon = (s: number | null) => {
                                if (s === null) return null;
                                if (s >= 80) return <CheckCircle className="h-4 w-4 text-green-400" />;
                                if (s >= 60) return <div className="h-3 w-3 rounded-full bg-yellow-500" />;
                                return <div className="h-3 w-3 rounded-full bg-red-500" />;
                              };
                              return (
                                <td 
                                  key={personIdx} 
                                  className={`p-3 border-b border-zinc-800 text-center ${getScoreColor(score)}`}
                                >
                                  <div className="flex justify-center">
                                    {score !== null ? getScoreIcon(score) : (
                                      <span className="text-xs text-zinc-500">No data</span>
                                    )}
                                  </div>
                                </td>
                              );
                            })}
                            <td className="p-3 border-b border-zinc-800"></td>
                          </tr>
                        ))}
                        <tr>
                          <td className="p-3">
                            <Button variant="ghost" size="sm" className="text-zinc-500 hover:text-zinc-300">
                              <Plus className="h-4 w-4 mr-2" />
                              Add skill
                            </Button>
                          </td>
                          <td colSpan={mockMatchingData.people.length + 1}></td>
                        </tr>
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-zinc-700">
                          <td className="p-3 font-medium text-white">Match Score</td>
                          {mockMatchingData.people.map((person, idx) => (
                            <td key={idx} className="p-3 text-center font-semibold text-white">
                              {person.overallMatch !== null ? `${person.overallMatch}% match` : (
                                <span className="text-zinc-500 text-sm">Insufficient data</span>
                              )}
                            </td>
                          ))}
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                  <div className="flex justify-center mt-4">
                    <Button variant="ghost" size="sm" className="text-zinc-500 hover:text-zinc-300">
                      Clear all
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="people" className="space-y-6">
              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg text-white">People Profiles</CardTitle>
                    <Button className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Person
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {employees.length === 0 ? (
                    <div className="text-center py-12">
                      <Users className="h-16 w-16 text-zinc-600 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-zinc-300 mb-2">No people profiles yet</h3>
                      <p className="text-zinc-500 mb-4">
                        Upload CVs or add employees to build your workforce intelligence
                      </p>
                      <Button className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Your First Person
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {employees.map((employee) => (
                        <Card 
                          key={employee.id}
                          className="border-zinc-700 bg-zinc-800/50 hover:border-amber-500/50 transition-colors cursor-pointer"
                          onClick={() => setSelectedEmployee(employee)}
                          data-testid={`card-employee-${employee.id}`}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <Avatar className="h-12 w-12">
                                <AvatarImage src={employee.avatarUrl || undefined} />
                                <AvatarFallback className="bg-amber-500/20 text-amber-400">
                                  {getInitials(employee.fullName)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold truncate text-white">{employee.fullName}</h3>
                                <p className="text-sm text-zinc-400 truncate">{employee.jobTitle}</p>
                                <p className="text-xs text-zinc-500">{employee.department}</p>
                              </div>
                            </div>
                            {employee.tags && employee.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-3">
                                {employee.tags.slice(0, 3).map((tag, i) => (
                                  <Badge key={i} variant="outline" className="text-[10px] border-zinc-600 text-zinc-400">{tag}</Badge>
                                ))}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <Dialog open={!!selectedEmployee} onOpenChange={() => setSelectedEmployee(null)}>
        <DialogContent className="max-w-2xl bg-zinc-900 border-zinc-700">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-white">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-amber-500/20 text-amber-400">
                  {selectedEmployee ? getInitials(selectedEmployee.fullName) : ""}
                </AvatarFallback>
              </Avatar>
              <div>
                <span>{selectedEmployee?.fullName}</span>
                <p className="text-sm font-normal text-zinc-400">{selectedEmployee?.jobTitle}</p>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-zinc-500">Department</Label>
                <p className="font-medium text-white">{selectedEmployee?.department || "Not set"}</p>
              </div>
              <div>
                <Label className="text-xs text-zinc-500">Team</Label>
                <p className="font-medium text-white">{selectedEmployee?.team || "Not set"}</p>
              </div>
              <div>
                <Label className="text-xs text-zinc-500">Location</Label>
                <p className="font-medium text-white">{selectedEmployee?.location || "Not set"}</p>
              </div>
              <div>
                <Label className="text-xs text-zinc-500">Email</Label>
                <p className="font-medium text-white">{selectedEmployee?.email || "Not set"}</p>
              </div>
            </div>
            <Separator className="bg-zinc-700" />
            <div>
              <Label className="text-xs text-zinc-500 mb-2 block">Skills</Label>
              <div className="flex flex-wrap gap-2">
                {selectedEmployee?.skills?.map((es, i) => (
                  <Badge 
                    key={i} 
                    className="bg-amber-500/20 text-amber-400 border-0"
                  >
                    {es.skill?.name || "Unknown Skill"} - Level {es.proficiencyLevel}
                  </Badge>
                )) || (
                  <p className="text-zinc-500 text-sm">No skills assessed yet</p>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
