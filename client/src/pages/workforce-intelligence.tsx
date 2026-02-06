import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTenantQueryKey } from "@/hooks/useTenant";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Search, Filter, Users, TrendingUp, CheckCircle,
  ChevronRight, Plus, X, MapPin, Brain, Send, Loader2,
  Sparkles, AlertTriangle, ArrowRight, Bell, Flame, Database,
  Target, Award, GraduationCap, Star, UserCheck, Compass, TrendingDown
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";
import type { Employee, Skill, Job, EmployeeSkill, SkillActivity, Department, EmployeeAmbition, Mentorship, GrowthArea } from "@shared/schema";

import bonganiPhoto from "@assets/stock_images/professional_african_b995effb.jpg";
import siphoPhoto from "@assets/stock_images/professional_african_b6a570be.jpg";
import thaboPhoto from "@assets/stock_images/professional_african_ca8f923f.jpg";
import leratoPhoto from "@assets/stock_images/professional_african_ae997007.jpg";
import nalediPhoto from "@assets/stock_images/professional_african_47a0afe5.jpg";

const EMPLOYEE_PHOTOS: Record<string, string> = {
  "Bongani Zulu": bonganiPhoto,
  "Lerato Maseko": leratoPhoto,
  "Sipho Dlamini": siphoPhoto,
  "Naledi Ndaba": nalediPhoto,
  "Thabo Mokoena": thaboPhoto,
};

interface DepartmentGap {
  department: string;
  headCount: number;
  skillGaps: string[];
  gapScore: number;
}

interface EmployeeWithSkills extends Employee {
  skills: (EmployeeSkill & { skill: Skill })[];
}

interface SkillAssessmentCategory {
  name: string;
  skills: { id: string; name: string; avgProficiency: number; assessedCount: number; gapCount: number }[];
  avgProficiency: number;
  totalAssessed: number;
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
  critical_gap: { bg: "bg-red-500/20", text: "text-red-600 dark:text-red-400", border: "border-red-500/30", dot: "bg-red-500" },
  training_needed: { bg: "bg-yellow-500/20", text: "text-yellow-600 dark:text-yellow-400", border: "border-yellow-500/30", dot: "bg-yellow-500" },
  good_match: { bg: "bg-green-500/20", text: "text-green-600 dark:text-green-400", border: "border-green-500/30", dot: "bg-green-500" },
  beyond_expectations: { bg: "bg-blue-500/20", text: "text-blue-600 dark:text-blue-400", border: "border-blue-500/30", dot: "bg-blue-500" },
};

export default function WorkforceIntelligence() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeWithSkills | null>(null);
  const [showSkillGaps, setShowSkillGaps] = useState(true);
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiResponse, setAiResponse] = useState<AIResponse | null>(null);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const queryClient = useQueryClient();
  
  const [selectedSkillPassportEmployee, setSelectedSkillPassportEmployee] = useState<string | null>(null);
  const [newAmbitionEmployee, setNewAmbitionEmployee] = useState<string>("");
  const [newAmbitionTitle, setNewAmbitionTitle] = useState("");
  const [showAmbitionForm, setShowAmbitionForm] = useState(false);
  
  const [selectedMatchingEmployees, setSelectedMatchingEmployees] = useState<string[]>([]);
  const [selectedMatchingSkills, setSelectedMatchingSkills] = useState<string[]>([]);
  
  const getEmployeePhoto = (name: string): string | undefined => {
    return EMPLOYEE_PHOTOS[name];
  };
  
  const employeesKey = useTenantQueryKey(["workforce-employees"]);
  const skillsKey = useTenantQueryKey(["skills"]);
  const departmentGapsKey = useTenantQueryKey(["department-gaps"]);
  const jobsKey = useTenantQueryKey(["jobs"]);
  const alertsKey = useTenantQueryKey(["workforce-alerts"]);
  const skillAssessmentsKey = useTenantQueryKey(["skill-assessments"]);
  const skillActivitiesKey = useTenantQueryKey(["skill-activities"]);
  const allEmployeeSkillsKey = useTenantQueryKey(["all-employee-skills"]);
  const ambitionsKey = useTenantQueryKey(["ambitions"]);
  const mentorshipsKey = useTenantQueryKey(["mentorships"]);
  const growthAreasKey = useTenantQueryKey(["growth-areas"]);

  // Fetch employees with their skills (for People Profiles and Matching)
  const { data: employeesWithSkills = [], isLoading: employeesLoading } = useQuery<EmployeeWithSkills[]>({
    queryKey: employeesKey,
    queryFn: async () => {
      const response = await api.get("/workforce/employees");
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

  // Fetch department skill gaps (for Skill Analysis section)
  const { data: departmentGaps = [], isLoading: departmentGapsLoading } = useQuery<DepartmentGap[]>({
    queryKey: departmentGapsKey,
    queryFn: async () => {
      const response = await api.get("/workforce/department-gaps");
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

  // Fetch skill assessments grouped by category
  const { data: skillAssessments = [], isLoading: skillAssessmentsLoading } = useQuery<SkillAssessmentCategory[]>({
    queryKey: skillAssessmentsKey,
    queryFn: async () => {
      const response = await api.get("/workforce/skill-assessments");
      return response.data;
    },
  });

  // Fetch skill activities for Learning Path
  const { data: skillActivities = [] } = useQuery<SkillActivity[]>({
    queryKey: skillActivitiesKey,
    queryFn: async () => {
      const response = await api.get("/skill-activities");
      return response.data;
    },
  });

  // Fetch all employee skills for matching matrix
  const { data: allEmployeeSkills = [] } = useQuery<(EmployeeSkill & { skill: Skill; employee: Employee })[]>({
    queryKey: allEmployeeSkillsKey,
    queryFn: async () => {
      const response = await api.get("/workforce/all-employee-skills");
      return response.data;
    },
  });

  // Fetch ambitions
  const { data: ambitions = [] } = useQuery<EmployeeAmbition[]>({
    queryKey: ambitionsKey,
    queryFn: async () => {
      const response = await api.get("/workforce/ambitions");
      return response.data;
    },
  });

  // Fetch mentorships with related data
  interface MentorshipWithDetails extends Mentorship {
    mentor: Employee;
    mentee: Employee;
    skill?: Skill;
  }
  const { data: mentorships = [] } = useQuery<MentorshipWithDetails[]>({
    queryKey: mentorshipsKey,
    queryFn: async () => {
      const response = await api.get("/workforce/mentorships");
      return response.data;
    },
  });

  // Fetch growth areas
  const { data: growthAreas = [] } = useQuery<GrowthArea[]>({
    queryKey: growthAreasKey,
    queryFn: async () => {
      const response = await api.get("/workforce/growth-areas");
      return response.data;
    },
  });

  // Create ambition mutation
  const createAmbitionMutation = useMutation({
    mutationFn: async (data: { employeeId: string; targetJobTitle: string; targetDepartment?: string; targetDate?: string }) => {
      const response = await api.post("/workforce/ambitions", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ambitionsKey });
      setShowAmbitionForm(false);
      setNewAmbitionTitle("");
      setNewAmbitionEmployee("");
    },
  });

  // Create mentorship mutation
  const createMentorshipMutation = useMutation({
    mutationFn: async (data: { mentorId: string; menteeId: string; skillId?: string; goals?: string }) => {
      const response = await api.post("/workforce/mentorships", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mentorshipsKey });
    },
  });

  // Generate growth areas mutation
  const generateGrowthAreasMutation = useMutation({
    mutationFn: async (employeeId: string) => {
      const response = await api.post(`/workforce/employees/${employeeId}/generate-growth-areas`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: growthAreasKey });
    },
  });

  // Seed demo data mutation
  const seedDemoMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post("/workforce/seed-demo-data");
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeesKey });
      queryClient.invalidateQueries({ queryKey: skillsKey });
      queryClient.invalidateQueries({ queryKey: departmentGapsKey });
      queryClient.invalidateQueries({ queryKey: skillAssessmentsKey });
      queryClient.invalidateQueries({ queryKey: allEmployeeSkillsKey });
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

  // Build matching data from real employee skills - use selected or show all
  const uniqueSkillNames = Array.from(new Set(allEmployeeSkills.map(es => es.skill.name)));
  const activeSkillNames = selectedMatchingSkills.length > 0 ? selectedMatchingSkills : uniqueSkillNames.slice(0, 5);
  const activeEmployees = selectedMatchingEmployees.length > 0 
    ? employeesWithSkills.filter(emp => selectedMatchingEmployees.includes(emp.id))
    : employeesWithSkills.slice(0, 5);
  
  const matchingData = {
    skills: activeSkillNames,
    people: activeEmployees.map(emp => {
      const scores: Record<string, number | null> = {};
      activeSkillNames.forEach(skillName => {
        const empSkill = emp.skills?.find(es => es.skill?.name === skillName);
        scores[skillName] = empSkill ? Math.round((empSkill.proficiencyLevel / 8) * 100) : null;
      });
      const validScores = Object.values(scores).filter((s): s is number => s !== null);
      return {
        id: emp.id,
        name: emp.fullName,
        avatar: getEmployeePhoto(emp.fullName) || emp.avatarUrl || "",
        scores,
        overallMatch: validScores.length > 0 ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length) : null,
      };
    }),
  };
  
  const toggleEmployeeSelection = (empId: string) => {
    setSelectedMatchingEmployees(prev => 
      prev.includes(empId) ? prev.filter(id => id !== empId) : [...prev, empId]
    );
  };
  
  const toggleSkillSelection = (skillName: string) => {
    setSelectedMatchingSkills(prev => 
      prev.includes(skillName) ? prev.filter(s => s !== skillName) : [...prev, skillName]
    );
  };
  
  const selectAllEmployees = () => {
    setSelectedMatchingEmployees(employeesWithSkills.map(emp => emp.id));
  };
  
  const clearEmployeeSelection = () => {
    setSelectedMatchingEmployees([]);
  };

  const alerts = alertsData?.alerts || [];

  // Helper to format time ago
  const formatTimeAgo = (date: Date | string) => {
    const now = new Date();
    const then = new Date(date);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins} minutes ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hours ago`;
    return `${Math.floor(diffHours / 24)} days ago`;
  };

  // Get skill status counts from real data
  const skillStatusCounts = {
    critical_gap: allEmployeeSkills.filter(es => es.status === 'critical_gap').length,
    training_needed: allEmployeeSkills.filter(es => es.status === 'training_needed').length,
    good_match: allEmployeeSkills.filter(es => es.status === 'good_match').length,
    beyond_expectations: allEmployeeSkills.filter(es => es.status === 'beyond_expectations').length,
  };

  const totalSkillAssessments = Object.values(skillStatusCounts).reduce((a, b) => a + b, 0);

  const sampleQuestions = [
    "Who's the best candidate to lead the product expansion in Cape Town?",
    "Which team has the most skill gaps?",
    "Who is ready for promotion?",
    "What skills are we missing in Marketing?",
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="pt-20 pb-8">
        <div className="container mx-auto px-4">
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500 to-teal-600">
                <Brain className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-400 to-teal-400 bg-clip-text text-transparent">
                  Workforce Intelligence
                </h1>
                <p className="text-muted-foreground">
                  AI-powered skills analysis, internal mobility & workforce insights
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by keyword"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-80 bg-muted border-border"
                  data-testid="input-search"
                />
              </div>
              <Button variant="outline" size="icon" className="border-border">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* AI Assistant & Alerts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Ask AHC - AI Assistant */}
            <Card className="bg-gradient-to-br from-cyan-500/10 via-blue-500/10 to-pink-500/10 dark:from-cyan-900/30 dark:via-blue-900/30 dark:to-pink-900/30 border-border overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Badge className="bg-amber-500/20 text-amber-400 border-0">Ask AHC</Badge>
                </div>
                <CardTitle className="text-xl text-foreground">Get instant answers</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Instead of wasting weeks pulling data or waiting for reports, get clear, reliable answers in seconds.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Question Input */}
                <div className="bg-white rounded-xl p-4 shadow-lg">
                  <p className="text-foreground font-medium mb-3">{aiQuestion || "Who's the best candidate to lead the product expansion in Spain?"}</p>
                  <div className="flex gap-2">
                    <Input
                      value={aiQuestion}
                      onChange={(e) => setAiQuestion(e.target.value)}
                      placeholder="Ask anything about your workforce..."
                      className="flex-1 bg-background border-border text-foreground placeholder:text-muted-foreground"
                      onKeyDown={(e) => e.key === "Enter" && handleAskAI()}
                      data-testid="input-ai-question"
                    />
                    <Button 
                      onClick={handleAskAI}
                      disabled={isAiThinking || !aiQuestion.trim()}
                      className="bg-gradient-to-r from-amber-500 to-teal-600 hover:from-amber-600 hover:to-teal-700"
                      data-testid="button-ask-ai"
                    >
                      {isAiThinking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                {/* AI Response */}
                {isAiThinking && (
                  <div className="bg-muted rounded-xl p-4">
                    <div className="flex items-center gap-2 text-amber-400">
                      <Sparkles className="h-4 w-4 animate-pulse" />
                      <span className="text-sm">AHC thinking for ~{Math.floor(Math.random() * 5) + 3}s...</span>
                    </div>
                  </div>
                )}

                {aiResponse && (
                  <div className="bg-white rounded-xl p-4 shadow-lg space-y-3">
                    {aiResponse.matchedEmployee && (
                      <div className="flex items-center gap-3 pb-3 border-b border-border">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback className="bg-amber-100 text-amber-700">
                            {getInitials(aiResponse.matchedEmployee.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-foreground">{aiResponse.matchedEmployee.name}</p>
                          <div className="flex items-center gap-2">
                            <Badge className="bg-green-100 text-green-700">
                              <span className="w-2 h-2 rounded-full bg-green-500 mr-1" />
                              {aiResponse.matchedEmployee.matchScore}% Great skill match
                            </Badge>
                          </div>
                        </div>
                      </div>
                    )}
                    <p className="text-muted-foreground text-sm">{aiResponse.answer}</p>
                    {aiResponse.insights.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-2">
                        {aiResponse.insights.map((insight, i) => (
                          <Badge key={i} variant="outline" className="text-xs text-muted-foreground">{insight}</Badge>
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
                      className="text-xs border-border bg-muted hover:bg-muted/80"
                      onClick={() => setAiQuestion(q)}
                    >
                      {q}
                    </Button>
                  ))}
                </div>

                <Button className="w-full bg-gradient-to-r from-blue-600 to-pink-600 hover:from-blue-700 hover:to-pink-700">
                  Ask anything
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </CardContent>
            </Card>

            {/* Execution Co-Pilot - Alerts */}
            <Card className="bg-gradient-to-br from-pink-500/10 via-blue-500/10 to-blue-500/10 dark:from-pink-900/30 dark:via-blue-900/30 dark:to-blue-900/30 border-border overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Badge className="bg-pink-500/20 text-pink-400 border-0">Execution Co-Pilot</Badge>
                </div>
                <CardTitle className="text-xl text-foreground">Execute & stay on track</CardTitle>
                <CardDescription className="text-muted-foreground">
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
                        <p className="text-foreground font-medium text-sm">{alert.title}</p>
                        <div className="flex items-center gap-2">
                          <Badge className={`text-xs ${
                            alert.type === "urgent" 
                              ? "bg-red-100 text-red-700" 
                              : "bg-blue-100 text-blue-700"
                          }`}>
                            {alert.type === "urgent" ? <Flame className="h-3 w-3 mr-1" /> : <TrendingUp className="h-3 w-3 mr-1" />}
                            {alert.type === "urgent" ? "Urgent" : "Promotion alert"}
                          </Badge>
                          <Badge variant="outline" className="text-xs text-muted-foreground">
                            {alert.category}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-muted-foreground">{alert.time}</span>
                        <Button variant="ghost" size="sm" className="text-blue-600 text-xs p-0 h-auto mt-1 block">
                          More <ArrowRight className="h-3 w-3 inline ml-1" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}

                <Button className="w-full bg-gradient-to-r from-blue-600 to-blue-600 hover:from-blue-700 hover:to-blue-700">
                  Connect your systems
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="dashboard" className="space-y-6">
            <TabsList className="bg-muted border border-border p-1 flex-wrap h-auto gap-1">
              <TabsTrigger value="dashboard" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-teal-600 data-[state=active]:text-foreground">
                Dashboard
              </TabsTrigger>
              <TabsTrigger value="skills" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-teal-600 data-[state=active]:text-foreground">
                Skill Assessment
              </TabsTrigger>
              <TabsTrigger value="passport" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-teal-600 data-[state=active]:text-foreground">
                <Award className="h-4 w-4 mr-1" />
                Skill Passport
              </TabsTrigger>
              <TabsTrigger value="ambitions" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-teal-600 data-[state=active]:text-foreground">
                <Target className="h-4 w-4 mr-1" />
                Ambitions
              </TabsTrigger>
              <TabsTrigger value="mentors" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-teal-600 data-[state=active]:text-foreground">
                <UserCheck className="h-4 w-4 mr-1" />
                Mentors
              </TabsTrigger>
              <TabsTrigger value="growth" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-teal-600 data-[state=active]:text-foreground">
                <TrendingUp className="h-4 w-4 mr-1" />
                Growth Areas
              </TabsTrigger>
              <TabsTrigger value="matching" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-teal-600 data-[state=active]:text-foreground">
                Matching
              </TabsTrigger>
              <TabsTrigger value="people" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-teal-600 data-[state=active]:text-foreground">
                People
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <Card className="bg-card border-border">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg text-foreground">Skill analysis</CardTitle>
                          <CardDescription className="text-muted-foreground">Area's to focus on</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          {departmentGaps.length === 0 && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="border-amber-500/50 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400"
                              onClick={() => seedDemoMutation.mutate()}
                              disabled={seedDemoMutation.isPending}
                            >
                              <Database className="h-4 w-4 mr-2" />
                              {seedDemoMutation.isPending ? "Loading..." : "Load Demo Data"}
                            </Button>
                          )}
                          <Button variant="outline" size="sm" className="border-border">
                            <Filter className="h-4 w-4 mr-2" />
                            Filter
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {departmentGapsLoading ? (
                        <div className="text-center py-8">
                          <Loader2 className="h-8 w-8 animate-spin text-amber-400 mx-auto" />
                          <p className="text-muted-foreground mt-2">Loading skill analysis...</p>
                        </div>
                      ) : departmentGaps.length === 0 ? (
                        <div className="text-center py-8">
                          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                          <p className="text-muted-foreground">No department skill data yet</p>
                          <p className="text-muted-foreground text-sm">Add employees and assess their skills to see analysis</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          {departmentGaps.map((dept, idx) => (
                            <Card 
                              key={dept.department} 
                              className="bg-muted border-border hover:border-amber-500/50 transition-colors cursor-pointer"
                              data-testid={`card-department-${dept.department.toLowerCase().replace(/\s+/g, '-')}`}
                            >
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between mb-3">
                                  <Badge variant="outline" className="text-xs text-muted-foreground border-border">
                                    Gap: {dept.gapScore}
                                  </Badge>
                                  <span className="font-semibold text-foreground">{dept.department}</span>
                                </div>
                                <div className="flex items-center gap-1 mb-3">
                                  {[...Array(Math.min(dept.headCount || 1, 5))].map((_, i) => (
                                    <Avatar key={i} className="h-6 w-6 -ml-1 first:ml-0 border-2 border-border">
                                      <AvatarFallback className="text-[10px] bg-muted-foreground/30 text-foreground">
                                        {String.fromCharCode(65 + i)}
                                      </AvatarFallback>
                                    </Avatar>
                                  ))}
                                  {(dept.headCount || 0) > 5 && (
                                    <span className="text-xs text-muted-foreground ml-1">+{(dept.headCount || 0) - 5}</span>
                                  )}
                                </div>
                                <div className="space-y-2">
                                  <p className="text-xs text-muted-foreground">Skill to address:</p>
                                  <div className="flex flex-wrap gap-1">
                                    {dept.skillGaps.length > 0 ? (
                                      dept.skillGaps.slice(0, 3).map((skill, i) => (
                                        <Badge 
                                          key={i}
                                          variant="secondary" 
                                          className="text-[10px] bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border-0"
                                        >
                                          {skill}
                                        </Badge>
                                      ))
                                    ) : (
                                      <span className="text-xs text-green-600 dark:text-green-400">No gaps identified</span>
                                    )}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="bg-card border-border">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg text-foreground">Internal Mobility</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {jobs.filter(j => j.status === "open").length === 0 ? (
                        <div className="text-center py-8">
                          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                          <p className="text-muted-foreground">No open positions yet</p>
                          <p className="text-muted-foreground text-sm">Create job postings to find internal mobility opportunities</p>
                        </div>
                      ) : (
                        jobs.filter(j => j.status === "open").slice(0, 3).map((job) => {
                          const internalMatches = employeesWithSkills.filter(e => 
                            e.department === job.department
                          ).length;
                          return (
                            <Card 
                              key={job.id} 
                              className="bg-muted border-border hover:border-amber-500/50 transition-colors"
                              data-testid={`card-job-${job.id}`}
                            >
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                  <div className="space-y-2">
                                    <h3 className="font-semibold text-lg text-foreground">{job.title}</h3>
                                    <Badge className="text-xs bg-blue-500/20 text-blue-600 dark:text-blue-400 border-0">
                                      {job.department}
                                    </Badge>
                                    <p className="text-sm text-muted-foreground line-clamp-2">
                                      {job.description || `As a ${job.title}, you will play a key role in the team...`}
                                    </p>
                                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                      {job.salaryMin && job.salaryMax && (
                                        <span className="flex items-center gap-1">
                                          <span className="font-medium text-foreground">R{job.salaryMin?.toLocaleString()} - R{job.salaryMax?.toLocaleString()}</span>/month
                                        </span>
                                      )}
                                      <span className="flex items-center gap-1">
                                        <MapPin className="h-4 w-4" />
                                        {job.location || "Remote"}
                                      </span>
                                    </div>
                                    <p className="text-sm text-amber-400 font-medium">
                                      Internal matches: {internalMatches}
                                    </p>
                                  </div>
                                  <div className="flex -space-x-2">
                                    {[...Array(Math.min(internalMatches, 4))].map((_, i) => (
                                      <Avatar key={i} className="h-8 w-8 border-2 border-border">
                                        <AvatarFallback className="text-xs bg-amber-500/20 text-amber-400">
                                          {String.fromCharCode(65 + i)}
                                        </AvatarFallback>
                                      </Avatar>
                                    ))}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })
                      )}
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-6">
                  <Card className="bg-card border-border">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg text-foreground">Learning Path</CardTitle>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="relative">
                        <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-muted-foreground/30" />
                        <div className="space-y-4">
                          {skillActivities.length === 0 ? (
                            <div className="text-center py-4 pl-8">
                              <p className="text-muted-foreground text-sm">No recent skill activities</p>
                            </div>
                          ) : (
                            skillActivities.slice(0, 5).map((activity) => (
                              <div key={activity.id} className="relative pl-8">
                                <div className={`absolute left-1.5 w-3 h-3 rounded-full border-2 border-border ${
                                  activity.activityType === "skill_added" ? "bg-green-500" :
                                  activity.activityType === "gap_closed" ? "bg-blue-500" :
                                  activity.activityType === "skill_improved" ? "bg-amber-500" :
                                  "bg-blue-500"
                                }`} />
                                <div className="space-y-1">
                                  <p className="text-xs text-muted-foreground">{formatTimeAgo(activity.createdAt)}</p>
                                  <p className="text-sm text-foreground">
                                    {activity.description || `${activity.activityType.replace(/_/g, " ")}`}
                                  </p>
                                  {activity.newLevel && activity.previousLevel && (
                                    <Badge className="text-xs bg-green-500/20 text-green-600 dark:text-green-400 border-0">
                                      Level {activity.previousLevel} → {activity.newLevel}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="skills" className="space-y-6">
              <Card className="bg-card border-border">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <CardTitle className="text-lg text-foreground">Skill assessment</CardTitle>
                      <div className="flex items-center gap-2">
                        <Switch checked={true} />
                        <Label className="text-sm text-muted-foreground">Group by category</Label>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" className="border-border bg-muted">All types</Button>
                      <Button variant="outline" size="sm" className="border-border bg-muted">Manage skills</Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-4">
                    <Badge variant="outline" className="bg-muted border-border text-foreground">All {totalSkillAssessments}</Badge>
                    <Badge className="bg-red-500/20 text-red-600 dark:text-red-400 border-0">
                      <span className="w-2 h-2 rounded-full bg-red-500 mr-1" />
                      Critical gap {skillStatusCounts.critical_gap}
                    </Badge>
                    <Badge className="bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-0">
                      <span className="w-2 h-2 rounded-full bg-yellow-500 mr-1" />
                      Training needed {skillStatusCounts.training_needed}
                    </Badge>
                    <Badge className="bg-green-500/20 text-green-600 dark:text-green-400 border-0">
                      <span className="w-2 h-2 rounded-full bg-green-500 mr-1" />
                      Good skill match {skillStatusCounts.good_match}
                    </Badge>
                    <Badge className="bg-blue-500/20 text-blue-600 dark:text-blue-400 border-0">
                      <span className="w-2 h-2 rounded-full bg-blue-500 mr-1" />
                      Beyond expectations {skillStatusCounts.beyond_expectations}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {skillAssessmentsLoading ? (
                    <div className="text-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-amber-400 mx-auto" />
                      <p className="text-muted-foreground mt-2">Loading skill assessments...</p>
                    </div>
                  ) : skillAssessments.length === 0 ? (
                    <div className="text-center py-8">
                      <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground">No skill assessments yet</p>
                      <p className="text-muted-foreground text-sm mb-4">Add skills and assess employee proficiency to see data</p>
                      {employeesWithSkills.length === 0 && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="border-amber-500/50 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400"
                          onClick={() => seedDemoMutation.mutate()}
                          disabled={seedDemoMutation.isPending}
                        >
                          <Database className="h-4 w-4 mr-2" />
                          {seedDemoMutation.isPending ? "Loading..." : "Load Demo Data"}
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {skillAssessments.map((category) => (
                        <div key={category.name}>
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="font-semibold text-foreground">{category.name}</h3>
                            <Badge variant="outline" className="text-xs border-border text-muted-foreground">
                              Avg: {category.avgProficiency}/8 | {category.totalAssessed} assessed
                            </Badge>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {category.skills.map((skill) => {
                              const hasGap = skill.gapCount > 0;
                              const colors = hasGap 
                                ? (skill.avgProficiency < 3 ? SKILL_STATUS_COLORS.critical_gap : SKILL_STATUS_COLORS.training_needed)
                                : (skill.avgProficiency >= 6 ? SKILL_STATUS_COLORS.beyond_expectations : SKILL_STATUS_COLORS.good_match);
                              return (
                                <Card 
                                  key={skill.id}
                                  className={`border ${colors.border} ${colors.bg} hover:shadow-md transition-shadow cursor-pointer min-w-0`}
                                  data-testid={`card-skill-${skill.name.toLowerCase().replace(/\s+/g, '-')}`}
                                >
                                  <CardContent className="p-3 sm:p-4 space-y-2 sm:space-y-3">
                                    <div className="flex items-start justify-between gap-2">
                                      <h3 className="font-semibold text-foreground text-sm sm:text-base leading-tight break-words min-w-0 flex-1">{skill.name}</h3>
                                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${colors.dot}`} />
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <div className="flex-1 h-2 bg-muted-foreground/30 rounded-full overflow-hidden min-w-0">
                                        <div 
                                          className="h-full bg-gradient-to-r from-amber-500 to-teal-600 rounded-full"
                                          style={{ width: `${(skill.avgProficiency / 8) * 100}%` }}
                                        />
                                      </div>
                                      <span className="text-xs text-muted-foreground flex-shrink-0">{skill.avgProficiency}/8</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground flex-wrap">
                                      <span className="whitespace-nowrap">{skill.assessedCount} assessed</span>
                                      {skill.gapCount > 0 && (
                                        <Badge className="text-[10px] bg-red-500/20 text-red-600 dark:text-red-400 border-0 flex-shrink-0">
                                          {skill.gapCount} gap{skill.gapCount > 1 ? 's' : ''}
                                        </Badge>
                                      )}
                                    </div>
                                  </CardContent>
                                </Card>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Skill Passport Tab */}
            <TabsContent value="passport" className="space-y-6">
              <Card className="bg-card border-border">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg text-foreground flex items-center gap-2">
                        <Award className="h-5 w-5 text-amber-400" />
                        Skill Passport
                      </CardTitle>
                      <CardDescription className="text-muted-foreground">
                        Detailed skill profiles with visual proficiency scales
                      </CardDescription>
                    </div>
                    <Select 
                      value={selectedSkillPassportEmployee || ""} 
                      onValueChange={setSelectedSkillPassportEmployee}
                    >
                      <SelectTrigger className="w-[250px] bg-muted border-border text-foreground">
                        <SelectValue placeholder="Select an employee" />
                      </SelectTrigger>
                      <SelectContent className="bg-muted border-border">
                        {employeesWithSkills.map(emp => (
                          <SelectItem key={emp.id} value={emp.id} className="text-foreground hover:bg-muted">
                            {emp.fullName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  {!selectedSkillPassportEmployee ? (
                    <div className="text-center py-12">
                      <Award className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-foreground mb-2">Select an Employee</h3>
                      <p className="text-muted-foreground">Choose an employee to view their complete skill passport</p>
                    </div>
                  ) : (() => {
                    const emp = employeesWithSkills.find(e => e.id === selectedSkillPassportEmployee);
                    if (!emp) return null;
                    
                    const groupedSkills = emp.skills?.reduce((acc, es) => {
                      const category = es.skill?.category || 'General';
                      if (!acc[category]) acc[category] = [];
                      acc[category].push(es);
                      return acc;
                    }, {} as Record<string, typeof emp.skills>) || {};
                    
                    const overallScore = emp.skills?.length 
                      ? Math.round(emp.skills.reduce((sum, s) => sum + s.proficiencyLevel, 0) / emp.skills.length / 8 * 100)
                      : 0;
                    
                    return (
                      <div className="space-y-6">
                        {/* Employee Header */}
                        <div className="flex items-start gap-4 p-4 bg-muted rounded-lg">
                          <Avatar className="h-16 w-16">
                            <AvatarFallback className="bg-amber-500/20 text-amber-400 text-xl">
                              {getInitials(emp.fullName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <h3 className="text-xl font-semibold text-foreground">{emp.fullName}</h3>
                            <p className="text-muted-foreground">{emp.jobTitle || 'No title'}</p>
                            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                              <span>{emp.department || 'No department'}</span>
                              <span>{emp.location || 'No location'}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-3xl font-bold text-amber-400">{overallScore}%</div>
                            <p className="text-xs text-muted-foreground">Overall Proficiency</p>
                          </div>
                        </div>
                        
                        {/* Skills by Category */}
                        {Object.entries(groupedSkills).map(([category, categorySkills]) => (
                          <div key={category} className="space-y-3">
                            <h4 className="text-sm font-semibold text-foreground uppercase tracking-wide">{category}</h4>
                            <div className="space-y-3">
                              {categorySkills.map((es, idx) => {
                                const colors = SKILL_STATUS_COLORS[es.status as keyof typeof SKILL_STATUS_COLORS] || SKILL_STATUS_COLORS.good_match;
                                const percentage = Math.round((es.proficiencyLevel / 8) * 100);
                                const levelLabels = ['Novice', 'Beginner', 'Intermediate', 'Competent', 'Proficient', 'Advanced', 'Expert', 'Master'];
                                return (
                                  <div key={idx} className={`p-4 rounded-lg border ${colors.border} ${colors.bg}`}>
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium text-foreground">{es.skill?.name}</span>
                                        <Badge className={`text-xs ${colors.bg} ${colors.text} border-0`}>
                                          {es.status?.replace('_', ' ')}
                                        </Badge>
                                      </div>
                                      <div className="text-right">
                                        <span className="text-lg font-bold text-foreground">{es.proficiencyLevel}/8</span>
                                        <p className="text-xs text-muted-foreground">{levelLabels[es.proficiencyLevel - 1] || 'Unknown'}</p>
                                      </div>
                                    </div>
                                    <div className="flex gap-1">
                                      {[1, 2, 3, 4, 5, 6, 7, 8].map(level => (
                                        <div
                                          key={level}
                                          className={`h-3 flex-1 rounded-sm ${
                                            level <= es.proficiencyLevel 
                                              ? 'bg-gradient-to-r from-amber-500 to-teal-600' 
                                              : 'bg-muted-foreground/30'
                                          }`}
                                        />
                                      ))}
                                    </div>
                                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                      <span>Novice</span>
                                      <span>Master</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                        
                        {(!emp.skills || emp.skills.length === 0) && (
                          <div className="text-center py-8">
                            <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                            <p className="text-muted-foreground">No skills assessed for this employee</p>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Ambitions Tab */}
            <TabsContent value="ambitions" className="space-y-6">
              <Card className="bg-card border-border">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg text-foreground flex items-center gap-2">
                        <Target className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        Career Ambitions
                      </CardTitle>
                      <CardDescription className="text-muted-foreground">
                        Track employee career goals and progression paths
                      </CardDescription>
                    </div>
                    <Button 
                      onClick={() => setShowAmbitionForm(true)}
                      className="bg-gradient-to-r from-blue-500 to-pink-500 hover:from-blue-600 hover:to-pink-600"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Ambition
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {showAmbitionForm && (
                    <Card className="mb-6 bg-muted border-border">
                      <CardContent className="p-4 space-y-4">
                        <h4 className="font-medium text-foreground">Create New Career Ambition</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label className="text-muted-foreground">Employee</Label>
                            <Select value={newAmbitionEmployee} onValueChange={setNewAmbitionEmployee}>
                              <SelectTrigger className="bg-muted border-border text-foreground">
                                <SelectValue placeholder="Select employee" />
                              </SelectTrigger>
                              <SelectContent className="bg-muted border-border">
                                {employeesWithSkills.map(emp => (
                                  <SelectItem key={emp.id} value={emp.id} className="text-foreground">
                                    {emp.fullName}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">Target Role</Label>
                            <Input 
                              value={newAmbitionTitle}
                              onChange={(e) => setNewAmbitionTitle(e.target.value)}
                              placeholder="e.g., Senior Developer, Team Lead"
                              className="bg-muted border-border text-foreground"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            onClick={() => {
                              if (newAmbitionEmployee && newAmbitionTitle) {
                                createAmbitionMutation.mutate({
                                  employeeId: newAmbitionEmployee,
                                  targetJobTitle: newAmbitionTitle
                                });
                              }
                            }}
                            disabled={!newAmbitionEmployee || !newAmbitionTitle || createAmbitionMutation.isPending}
                            className="bg-blue-500 hover:bg-blue-600"
                          >
                            {createAmbitionMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Ambition'}
                          </Button>
                          <Button variant="outline" onClick={() => setShowAmbitionForm(false)} className="border-border">
                            Cancel
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  
                  {ambitions.length === 0 ? (
                    <div className="text-center py-12">
                      <Target className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-foreground mb-2">No Career Ambitions Set</h3>
                      <p className="text-muted-foreground mb-4">Help employees define their career goals</p>
                      <Button 
                        onClick={() => setShowAmbitionForm(true)}
                        variant="outline" 
                        className="border-blue-500/50 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create First Ambition
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {ambitions.map(ambition => {
                        const emp = employeesWithSkills.find(e => e.id === ambition.employeeId);
                        return (
                          <Card key={ambition.id} className="bg-muted border-border hover:border-blue-500/50 transition-colors">
                            <CardContent className="p-4">
                              <div className="flex items-start gap-3 mb-3">
                                <Avatar className="h-10 w-10">
                                  <AvatarFallback className="bg-blue-500/20 text-blue-600 dark:text-blue-400">
                                    {emp ? getInitials(emp.fullName) : '?'}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <h4 className="font-medium text-foreground">{emp?.fullName || 'Unknown'}</h4>
                                  <p className="text-xs text-muted-foreground">{emp?.jobTitle || 'No current role'}</p>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <Compass className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                  <span className="text-sm text-foreground">Target: <span className="font-medium text-foreground">{ambition.targetJobTitle}</span></span>
                                </div>
                                {ambition.targetDepartment && (
                                  <div className="flex items-center gap-2">
                                    <Users className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm text-muted-foreground">{ambition.targetDepartment}</span>
                                  </div>
                                )}
                                {ambition.targetTimeframe && (
                                  <div className="flex items-center gap-2">
                                    <Target className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm text-muted-foreground">Target: {ambition.targetTimeframe.replace('_', ' ')}</span>
                                  </div>
                                )}
                              </div>
                              <div className="mt-3">
                                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                                  <span>Match Score</span>
                                  <span>{ambition.matchScore || 0}%</span>
                                </div>
                                <Progress value={ambition.matchScore || 0} className="h-2" />
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Mentors Tab */}
            <TabsContent value="mentors" className="space-y-6">
              <Card className="bg-card border-border">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg text-foreground flex items-center gap-2">
                        <UserCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
                        Mentor Matching
                      </CardTitle>
                      <CardDescription className="text-muted-foreground">
                        Connect employees with expert mentors based on skill needs
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Potential Mentors Grid */}
                  <div className="mb-8">
                    <h3 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wide">Available Mentors</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {employeesWithSkills
                        .filter(emp => emp.skills?.some(s => s.proficiencyLevel >= 7))
                        .slice(0, 6)
                        .map(emp => {
                          const expertSkills = emp.skills?.filter(s => s.proficiencyLevel >= 7) || [];
                          return (
                            <Card key={emp.id} className="bg-muted border-border hover:border-green-500/50 transition-colors">
                              <CardContent className="p-4">
                                <div className="flex items-start gap-3">
                                  <Avatar className="h-12 w-12">
                                    <AvatarFallback className="bg-green-500/20 text-green-600 dark:text-green-400">
                                      {getInitials(emp.fullName)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1">
                                    <h4 className="font-medium text-foreground">{emp.fullName}</h4>
                                    <p className="text-xs text-muted-foreground">{emp.jobTitle}</p>
                                    <Badge className="mt-1 text-xs bg-green-500/20 text-green-600 dark:text-green-400 border-0">
                                      <Star className="h-3 w-3 mr-1" />
                                      Expert in {expertSkills.length} skill{expertSkills.length !== 1 ? 's' : ''}
                                    </Badge>
                                  </div>
                                </div>
                                <div className="mt-3 flex flex-wrap gap-1">
                                  {expertSkills.slice(0, 3).map((es, i) => (
                                    <Badge key={i} variant="outline" className="text-xs border-green-500/30 text-green-600 dark:text-green-400">
                                      {es.skill?.name} ({es.proficiencyLevel}/8)
                                    </Badge>
                                  ))}
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                    </div>
                    {employeesWithSkills.filter(emp => emp.skills?.some(s => s.proficiencyLevel >= 7)).length === 0 && (
                      <div className="text-center py-8">
                        <UserCheck className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                        <p className="text-muted-foreground">No expert mentors identified yet</p>
                        <p className="text-muted-foreground text-sm">Employees with proficiency level 7+ can become mentors</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Active Mentorships */}
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wide">Active Mentorships</h3>
                    {mentorships.length === 0 ? (
                      <div className="text-center py-8 bg-muted/30 rounded-lg">
                        <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                        <p className="text-muted-foreground">No active mentorships</p>
                        <p className="text-muted-foreground text-sm">Create mentorship pairs to help employees grow</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {mentorships.map(m => (
                          <Card key={m.id} className="bg-muted border-border">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                  <div className="flex items-center gap-2">
                                    <Avatar className="h-10 w-10">
                                      <AvatarFallback className="bg-green-500/20 text-green-600 dark:text-green-400">
                                        {getInitials(m.mentor?.fullName || '')}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <p className="font-medium text-foreground text-sm">{m.mentor?.fullName}</p>
                                      <p className="text-xs text-muted-foreground">Mentor</p>
                                    </div>
                                  </div>
                                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                                  <div className="flex items-center gap-2">
                                    <Avatar className="h-10 w-10">
                                      <AvatarFallback className="bg-blue-500/20 text-blue-600 dark:text-blue-400">
                                        {getInitials(m.mentee?.fullName || '')}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <p className="font-medium text-foreground text-sm">{m.mentee?.fullName}</p>
                                      <p className="text-xs text-muted-foreground">Mentee</p>
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  {m.skill && (
                                    <Badge className="bg-amber-500/20 text-amber-400 border-0">
                                      {m.skill.name}
                                    </Badge>
                                  )}
                                  <Badge className={`ml-2 ${
                                    m.status === 'active' ? 'bg-green-500/20 text-green-600 dark:text-green-400' :
                                    m.status === 'completed' ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400' :
                                    'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400'
                                  } border-0`}>
                                    {m.status}
                                  </Badge>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Growth Areas Tab */}
            <TabsContent value="growth" className="space-y-6">
              <Card className="bg-card border-border">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg text-foreground flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        Growth Areas
                      </CardTitle>
                      <CardDescription className="text-muted-foreground">
                        Identify skill clusters needing improvement and track development
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Generate Growth Areas for Employee */}
                  <Card className="mb-6 bg-muted border-border">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <h4 className="font-medium text-foreground mb-1">Auto-Generate Growth Areas</h4>
                          <p className="text-sm text-muted-foreground">Analyze employee skills and create personalized development plans</p>
                        </div>
                        <Select onValueChange={(empId) => generateGrowthAreasMutation.mutate(empId)}>
                          <SelectTrigger className="w-[200px] bg-muted border-border text-foreground">
                            <SelectValue placeholder="Select employee" />
                          </SelectTrigger>
                          <SelectContent className="bg-muted border-border">
                            {employeesWithSkills.map(emp => (
                              <SelectItem key={emp.id} value={emp.id} className="text-foreground">
                                {emp.fullName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {growthAreas.length === 0 ? (
                    <div className="text-center py-12">
                      <TrendingDown className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-foreground mb-2">No Growth Areas Identified</h3>
                      <p className="text-muted-foreground">Generate growth areas for employees to identify skill gaps</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {growthAreas.map(area => {
                        const emp = employeesWithSkills.find(e => e.id === area.employeeId);
                        const priorityColors = {
                          critical: 'border-red-500/50 bg-red-500/10',
                          high: 'border-teal-600/50 bg-teal-600/10',
                          medium: 'border-yellow-500/50 bg-yellow-500/10',
                          low: 'border-green-500/50 bg-green-500/10'
                        };
                        const priorityBadgeColors = {
                          critical: 'bg-red-500/20 text-red-600 dark:text-red-400',
                          high: 'bg-teal-600/20 text-teal-700 dark:text-teal-400',
                          medium: 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400',
                          low: 'bg-green-500/20 text-green-600 dark:text-green-400'
                        };
                        const actions: {description: string}[] = Array.isArray(area.suggestedActions) ? area.suggestedActions as {description: string}[] : [];
                        return (
                          <Card key={area.id} className={`border ${priorityColors[area.priority as keyof typeof priorityColors] || priorityColors.medium}`}>
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-10 w-10">
                                    <AvatarFallback className="bg-blue-500/20 text-blue-600 dark:text-blue-400">
                                      {emp ? getInitials(emp.fullName) : '?'}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <h4 className="font-medium text-foreground">{area.name}</h4>
                                    <p className="text-sm text-muted-foreground">{emp?.fullName || 'Unknown employee'}</p>
                                  </div>
                                </div>
                                <Badge className={`${priorityBadgeColors[area.priority as keyof typeof priorityBadgeColors] || priorityBadgeColors.medium} border-0`}>
                                  {area.priority} priority
                                </Badge>
                              </div>
                              
                              <p className="text-sm text-muted-foreground mb-3">{area.description}</p>
                              
                              <div className="grid grid-cols-3 gap-4 mb-3">
                                <div className="text-center p-2 bg-muted rounded">
                                  <div className="text-lg font-bold text-foreground">{area.currentScore}%</div>
                                  <p className="text-xs text-muted-foreground">Current</p>
                                </div>
                                <div className="text-center p-2 bg-muted rounded">
                                  <div className="text-lg font-bold text-amber-400">{area.targetScore}%</div>
                                  <p className="text-xs text-muted-foreground">Target</p>
                                </div>
                                <div className="text-center p-2 bg-muted rounded">
                                  <div className="text-lg font-bold text-green-600 dark:text-green-400">{area.progress || 0}%</div>
                                  <p className="text-xs text-muted-foreground">Progress</p>
                                </div>
                              </div>
                              
                              <Progress value={area.progress || 0} className="h-2" />
                              
                              {actions.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-border">
                                  <p className="text-xs font-medium text-muted-foreground mb-2">Suggested Actions:</p>
                                  <div className="space-y-1">
                                    {actions.slice(0, 2).map((action, i) => (
                                      <div key={i} className="flex items-center gap-2 text-sm text-foreground">
                                        <CheckCircle className="h-3 w-3 text-muted-foreground" />
                                        <span>{action.description || 'No description'}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="matching" className="space-y-6">
              <Card className="bg-card border-border">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <CardTitle className="text-lg text-foreground">Matching</CardTitle>
                      <div className="flex items-center gap-2">
                        <Switch checked={showSkillGaps} onCheckedChange={setShowSkillGaps} />
                        <Label className="text-sm text-muted-foreground">Show skill gap</Label>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className="border-border bg-muted" data-testid="button-quick-select">
                            <Users className="h-4 w-4 mr-2" />
                            Quick select
                            {selectedMatchingEmployees.length > 0 && (
                              <Badge className="ml-2 bg-amber-500/20 text-amber-400 border-0">
                                {selectedMatchingEmployees.length}
                              </Badge>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-72 bg-muted border-border p-4" align="end">
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium text-foreground">Select Employees</h4>
                              <div className="flex gap-2">
                                <Button variant="ghost" size="sm" className="text-xs text-amber-400 hover:text-amber-300" onClick={selectAllEmployees}>
                                  All
                                </Button>
                                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground" onClick={clearEmployeeSelection}>
                                  Clear
                                </Button>
                              </div>
                            </div>
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                              {employeesWithSkills.map(emp => (
                                <div key={emp.id} className="flex items-center gap-3 p-2 rounded hover:bg-muted cursor-pointer" onClick={() => toggleEmployeeSelection(emp.id)}>
                                  <Checkbox 
                                    checked={selectedMatchingEmployees.includes(emp.id)}
                                    onCheckedChange={() => toggleEmployeeSelection(emp.id)}
                                    className="border-border"
                                  />
                                  <Avatar className="h-8 w-8">
                                    <AvatarImage src={getEmployeePhoto(emp.fullName)} alt={emp.fullName} />
                                    <AvatarFallback className="bg-amber-500/20 text-amber-400 text-xs">
                                      {getInitials(emp.fullName)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-foreground truncate">{emp.fullName}</p>
                                    <p className="text-xs text-muted-foreground truncate">{emp.jobTitle}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                      
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className="border-border bg-muted" data-testid="button-select-skills">
                            <Award className="h-4 w-4 mr-2" />
                            Select Skills
                            {selectedMatchingSkills.length > 0 && (
                              <Badge className="ml-2 bg-blue-500/20 text-blue-600 dark:text-blue-400 border-0">
                                {selectedMatchingSkills.length}
                              </Badge>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-72 bg-muted border-border p-4" align="end">
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium text-foreground">Select Skills</h4>
                              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground" onClick={() => setSelectedMatchingSkills([])}>
                                Clear
                              </Button>
                            </div>
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                              {uniqueSkillNames.map(skillName => (
                                <div key={skillName} className="flex items-center gap-3 p-2 rounded hover:bg-muted cursor-pointer" onClick={() => toggleSkillSelection(skillName)}>
                                  <Checkbox 
                                    checked={selectedMatchingSkills.includes(skillName)}
                                    onCheckedChange={() => toggleSkillSelection(skillName)}
                                    className="border-border"
                                  />
                                  <span className="text-sm text-foreground">{skillName}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {employeesWithSkills.length === 0 ? (
                    <div className="text-center py-12">
                      <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground">No employees available</p>
                      <p className="text-muted-foreground text-sm mb-4">Add employees with skill assessments to see matching matrix</p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="border-amber-500/50 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400"
                        onClick={() => seedDemoMutation.mutate()}
                        disabled={seedDemoMutation.isPending}
                      >
                        <Database className="h-4 w-4 mr-2" />
                        {seedDemoMutation.isPending ? "Loading..." : "Load Demo Data"}
                      </Button>
                    </div>
                  ) : matchingData.people.length === 0 || matchingData.skills.length === 0 ? (
                    <div className="text-center py-12">
                      <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground">
                        {matchingData.people.length === 0 ? "No employees selected" : "No skills selected"}
                      </p>
                      <p className="text-muted-foreground text-sm mb-4">Use the Quick Select or Select Skills buttons above to add items</p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="border-amber-500/50 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400"
                        onClick={() => {
                          clearEmployeeSelection();
                          setSelectedMatchingSkills([]);
                        }}
                      >
                        <ArrowRight className="h-4 w-4 mr-2" />
                        Show Default View
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr>
                              <th className="text-left p-3 border-b border-border w-48"></th>
                              {matchingData.people.map((person, idx) => (
                                <th key={idx} className="p-3 border-b border-border text-center min-w-[120px]">
                                  <div className="flex flex-col items-center gap-2">
                                    <Avatar className="h-12 w-12 ring-2 ring-amber-500/30">
                                      <AvatarImage src={person.avatar} alt={person.name} className="object-cover" />
                                      <AvatarFallback className="bg-amber-500/20 text-amber-400">
                                        {getInitials(person.name)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="text-sm font-medium text-foreground">{person.name}</span>
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      className="h-5 w-5 p-0 text-muted-foreground hover:text-red-600 dark:text-red-400"
                                      onClick={() => toggleEmployeeSelection(person.id)}
                                      data-testid={`button-remove-employee-${idx}`}
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </th>
                              ))}
                              <th className="p-3 border-b border-border w-12">
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button variant="outline" size="sm" className="h-8 w-8 p-0 border-border bg-muted hover:bg-muted">
                                      <Plus className="h-4 w-4" />
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-64 bg-muted border-border p-2" align="end">
                                    <div className="space-y-1 max-h-48 overflow-y-auto">
                                      {employeesWithSkills.filter(emp => !selectedMatchingEmployees.includes(emp.id) && !matchingData.people.some(p => p.id === emp.id)).map(emp => (
                                        <div 
                                          key={emp.id} 
                                          className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer"
                                          onClick={() => toggleEmployeeSelection(emp.id)}
                                        >
                                          <Avatar className="h-6 w-6">
                                            <AvatarImage src={getEmployeePhoto(emp.fullName)} alt={emp.fullName} />
                                            <AvatarFallback className="bg-amber-500/20 text-amber-400 text-xs">
                                              {getInitials(emp.fullName)}
                                            </AvatarFallback>
                                          </Avatar>
                                          <span className="text-sm text-foreground">{emp.fullName}</span>
                                        </div>
                                      ))}
                                      {employeesWithSkills.filter(emp => !selectedMatchingEmployees.includes(emp.id) && !matchingData.people.some(p => p.id === emp.id)).length === 0 && (
                                        <p className="text-xs text-muted-foreground p-2">All employees selected</p>
                                      )}
                                    </div>
                                  </PopoverContent>
                                </Popover>
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {matchingData.skills.map((skill, skillIdx) => (
                              <tr key={skillIdx} className="hover:bg-muted">
                                <td className="p-3 border-b border-border">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-foreground">{skill}</span>
                                    <div className="flex items-center gap-1 text-muted-foreground">
                                      <X 
                                        className="h-3 w-3 cursor-pointer hover:text-red-600 dark:text-red-400" 
                                        onClick={() => toggleSkillSelection(skill)}
                                      />
                                    </div>
                                  </div>
                                </td>
                                {matchingData.people.map((person, personIdx) => {
                                  const score = person.scores[skill as keyof typeof person.scores];
                                  const getScoreColor = (s: number | null) => {
                                    if (s === null) return "bg-muted";
                                    if (s >= 80) return "bg-green-500/20";
                                    if (s >= 60) return "bg-yellow-500/20";
                                    if (s >= 40) return "bg-teal-600/20";
                                    return "bg-red-500/20";
                                  };
                                  const getScoreIcon = (s: number | null) => {
                                    if (s === null) return null;
                                    if (s >= 80) return <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />;
                                    if (s >= 60) return <div className="h-3 w-3 rounded-full bg-yellow-500" />;
                                    return <div className="h-3 w-3 rounded-full bg-red-500" />;
                                  };
                                  return (
                                    <td 
                                      key={personIdx} 
                                      className={`p-3 border-b border-border text-center ${getScoreColor(score)}`}
                                    >
                                      <div className="flex justify-center">
                                        {score !== null ? getScoreIcon(score) : (
                                          <span className="text-xs text-muted-foreground">No data</span>
                                        )}
                                      </div>
                                    </td>
                                  );
                                })}
                                <td className="p-3 border-b border-border"></td>
                              </tr>
                            ))}
                            <tr>
                              <td className="p-3">
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                                      <Plus className="h-4 w-4 mr-2" />
                                      Add skill
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-64 bg-muted border-border p-2" align="start">
                                    <div className="space-y-1 max-h-48 overflow-y-auto">
                                      {uniqueSkillNames.filter(s => !selectedMatchingSkills.includes(s) && !matchingData.skills.includes(s)).map(skillName => (
                                        <div 
                                          key={skillName} 
                                          className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer"
                                          onClick={() => toggleSkillSelection(skillName)}
                                        >
                                          <span className="text-sm text-foreground">{skillName}</span>
                                        </div>
                                      ))}
                                      {uniqueSkillNames.filter(s => !selectedMatchingSkills.includes(s) && !matchingData.skills.includes(s)).length === 0 && (
                                        <p className="text-xs text-muted-foreground p-2">All skills selected</p>
                                      )}
                                    </div>
                                  </PopoverContent>
                                </Popover>
                              </td>
                              <td colSpan={matchingData.people.length + 1}></td>
                            </tr>
                          </tbody>
                          <tfoot>
                            <tr className="border-t-2 border-border">
                              <td className="p-3 font-medium text-foreground">Match Score</td>
                              {matchingData.people.map((person, idx) => (
                                <td key={idx} className="p-3 text-center font-semibold text-foreground">
                                  {person.overallMatch !== null ? `${person.overallMatch}% match` : (
                                    <span className="text-muted-foreground text-sm">Insufficient data</span>
                                  )}
                                </td>
                              ))}
                              <td></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                      <div className="flex justify-center mt-4">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            clearEmployeeSelection();
                            setSelectedMatchingSkills([]);
                          }}
                        >
                          Clear all selections
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="people" className="space-y-6">
              <Card className="bg-card border-border">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg text-foreground">People Profiles</CardTitle>
                    <div className="flex items-center gap-2">
                      {employeesWithSkills.length === 0 && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="border-amber-500/50 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400"
                          onClick={() => seedDemoMutation.mutate()}
                          disabled={seedDemoMutation.isPending}
                        >
                          <Database className="h-4 w-4 mr-2" />
                          {seedDemoMutation.isPending ? "Loading..." : "Load Demo Data"}
                        </Button>
                      )}
                      <Button className="bg-gradient-to-r from-amber-500 to-teal-600 hover:from-amber-600 hover:to-teal-700 text-foreground">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Person
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {employeesLoading ? (
                    <div className="text-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-amber-400 mx-auto" />
                      <p className="text-muted-foreground mt-2">Loading people profiles...</p>
                    </div>
                  ) : employeesWithSkills.length === 0 ? (
                    <div className="text-center py-12">
                      <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-foreground mb-2">No people profiles yet</h3>
                      <p className="text-muted-foreground mb-4">
                        Upload CVs or add employees to build your workforce intelligence
                      </p>
                      <Button className="bg-gradient-to-r from-amber-500 to-teal-600 hover:from-amber-600 hover:to-teal-700 text-foreground">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Your First Person
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {employeesWithSkills.map((employee) => (
                        <Card 
                          key={employee.id}
                          className="border-border bg-muted hover:border-amber-500/50 transition-colors cursor-pointer"
                          onClick={() => setSelectedEmployee(employee)}
                          data-testid={`card-employee-${employee.id}`}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <Avatar className="h-12 w-12 ring-2 ring-amber-500/30">
                                <AvatarImage src={getEmployeePhoto(employee.fullName) || employee.avatarUrl || undefined} className="object-cover" />
                                <AvatarFallback className="bg-amber-500/20 text-amber-400">
                                  {getInitials(employee.fullName)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold truncate text-foreground">{employee.fullName}</h3>
                                <p className="text-sm text-muted-foreground truncate">{employee.jobTitle || "No title"}</p>
                                <p className="text-xs text-muted-foreground">{employee.department || "No department"}</p>
                              </div>
                            </div>
                            {employee.skills && employee.skills.length > 0 ? (
                              <div className="flex flex-wrap gap-1 mt-3">
                                {employee.skills.slice(0, 3).map((es, i) => {
                                  const colors = SKILL_STATUS_COLORS[es.status as keyof typeof SKILL_STATUS_COLORS] || SKILL_STATUS_COLORS.good_match;
                                  return (
                                    <Badge key={i} className={`text-[10px] ${colors.bg} ${colors.text} border-0`}>
                                      {es.skill?.name || "Unknown"} ({es.proficiencyLevel}/8)
                                    </Badge>
                                  );
                                })}
                                {employee.skills.length > 3 && (
                                  <Badge variant="outline" className="text-[10px] border-border text-muted-foreground">
                                    +{employee.skills.length - 3} more
                                  </Badge>
                                )}
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground mt-3">No skills assessed</p>
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
        <DialogContent className="max-w-2xl bg-muted border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-foreground">
              <Avatar className="h-12 w-12 ring-2 ring-amber-500/30">
                <AvatarImage src={selectedEmployee ? getEmployeePhoto(selectedEmployee.fullName) : undefined} className="object-cover" />
                <AvatarFallback className="bg-amber-500/20 text-amber-400">
                  {selectedEmployee ? getInitials(selectedEmployee.fullName) : ""}
                </AvatarFallback>
              </Avatar>
              <div>
                <span>{selectedEmployee?.fullName}</span>
                <p className="text-sm font-normal text-muted-foreground">{selectedEmployee?.jobTitle}</p>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Department</Label>
                <p className="font-medium text-foreground">{selectedEmployee?.department || "Not set"}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Team</Label>
                <p className="font-medium text-foreground">{selectedEmployee?.team || "Not set"}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Location</Label>
                <p className="font-medium text-foreground">{selectedEmployee?.location || "Not set"}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Email</Label>
                <p className="font-medium text-foreground">{selectedEmployee?.email || "Not set"}</p>
              </div>
            </div>
            <Separator className="bg-muted-foreground/30" />
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">Skills</Label>
              <div className="flex flex-wrap gap-2">
                {selectedEmployee?.skills?.map((es, i) => (
                  <Badge 
                    key={i} 
                    className="bg-amber-500/20 text-amber-400 border-0"
                  >
                    {es.skill?.name || "Unknown Skill"} - Level {es.proficiencyLevel}
                  </Badge>
                )) || (
                  <p className="text-muted-foreground text-sm">No skills assessed yet</p>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
