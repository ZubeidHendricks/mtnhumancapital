import { useState } from "react";
import { Navbar } from "@/components/layout/navbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Link } from "wouter";
import { 
  Users, 
  UserPlus, 
  FileCheck, 
  GraduationCap, 
  Briefcase, 
  AlertCircle, 
  CheckCircle2, 
  Search, 
  Filter,
  MoreHorizontal,
  BrainCircuit,
  Sparkles,
  ShieldCheck,
  Laptop
} from "lucide-react";
import { motion } from "framer-motion";

// Mock Data based on the provided document
const candidates = [
  { id: 1, name: "Sarah Jenkins", role: "Senior Project Manager", status: "Interviewing", match: 94, stage: "Screening" },
  { id: 2, name: "David Chen", role: "Financial Analyst", status: "New", match: 88, stage: "Sourcing" },
  { id: 3, name: "Marcus Johnson", role: "Operations Lead", status: "Offer Sent", match: 97, stage: "Onboarding" },
  { id: 4, name: "Emily Davis", role: "UX Designer", status: "Rejected", match: 65, stage: "Archived" },
];

const integrityChecks = [
  { id: 1, candidate: "Sarah Jenkins", type: "Criminal Record", status: "Clear", date: "2024-05-10" },
  { id: 2, candidate: "Sarah Jenkins", type: "Credit Check", status: "Clear", date: "2024-05-11" },
  { id: 3, candidate: "Marcus Johnson", type: "Reference Check", status: "Pending", date: "2024-05-12" },
];

const onboardingTasks = [
  { id: 1, task: "Send Welcome Letter", assignee: "AI Agent", status: "Completed" },
  { id: 2, task: "Distribute Employee Handbook", assignee: "AI Agent", status: "Completed" },
  { id: 3, task: "Procure Tax Forms", assignee: "AI Agent", status: "In Progress" },
  { id: 4, task: "IT Equipment Setup", assignee: "IT Dept", status: "Pending" },
];

export default function HRDashboard() {
  const [activeTab, setActiveTab] = useState("recruitment");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      
      <main className="pt-24 pb-12 px-6 container mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">HR Command Center</h1>
            <p className="text-muted-foreground">AI-Driven Human Capital Management</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 px-3 py-1">
              <BrainCircuit className="w-3 h-3 mr-2" /> AI Agents Active
            </Badge>
            <Button>Create New Requisition</Button>
          </div>
        </div>

        <Tabs defaultValue="recruitment" className="space-y-6" onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-2 md:grid-cols-4 lg:w-[600px] bg-card/50 border border-white/5">
            <TabsTrigger value="recruitment">Recruitment</TabsTrigger>
            <TabsTrigger value="integrity">Integrity</TabsTrigger>
            <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>

          {/* RECRUITMENT TAB */}
          <TabsContent value="recruitment" className="space-y-6">
            
            {/* AI Agent Banner */}
            <div className="rounded-lg bg-gradient-to-r from-primary/20 to-purple-500/20 border border-primary/20 p-6 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2 text-white">
                  <Sparkles className="w-5 h-5 text-primary" />
                  Need to find candidates fast?
                </h3>
                <p className="text-muted-foreground text-sm mt-1">
                  Launch the AI Recruitment Agent to source, screen, and rank candidates using our RAG-powered engine.
                </p>
              </div>
              <Link href="/recruitment-agent">
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20">
                  Launch AI Recruiter
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-card/30 border-white/10 backdrop-blur-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Open Roles</CardTitle>
                  <div className="text-2xl font-bold">12</div>
                </CardHeader>
              </Card>
              <Card className="bg-card/30 border-white/10 backdrop-blur-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Candidates in Pipeline</CardTitle>
                  <div className="text-2xl font-bold">48</div>
                </CardHeader>
              </Card>
              <Card className="bg-card/30 border-white/10 backdrop-blur-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Time to Hire (Avg)</CardTitle>
                  <div className="text-2xl font-bold">18 Days</div>
                </CardHeader>
              </Card>
            </div>

            <Card className="border-white/10 bg-card/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Candidate Pipeline</CardTitle>
                    <CardDescription>AI-ranked candidates matched to hiring needs</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Search candidates..." className="pl-9 w-[200px] bg-background/50 border-white/10" />
                    </div>
                    <Button variant="outline" size="icon"><Filter className="h-4 w-4" /></Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border border-white/10 overflow-hidden">
                  <div className="bg-white/5 px-4 py-3 grid grid-cols-12 text-sm font-medium text-muted-foreground">
                    <div className="col-span-3">Candidate</div>
                    <div className="col-span-3">Role Applied</div>
                    <div className="col-span-2">AI Match Score</div>
                    <div className="col-span-2">Stage</div>
                    <div className="col-span-2 text-right">Actions</div>
                  </div>
                  <ScrollArea className="h-[300px]">
                    {candidates.map((candidate) => (
                      <div key={candidate.id} className="px-4 py-3 grid grid-cols-12 items-center border-t border-white/5 hover:bg-white/5 transition-colors">
                        <div className="col-span-3 font-medium">{candidate.name}</div>
                        <div className="col-span-3 text-sm text-muted-foreground">{candidate.role}</div>
                        <div className="col-span-2">
                          <Badge className={`${candidate.match > 90 ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'} border-0`}>
                            {candidate.match}% Match
                          </Badge>
                        </div>
                        <div className="col-span-2 text-sm">{candidate.stage}</div>
                        <div className="col-span-2 text-right">
                          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                        </div>
                      </div>
                    ))}
                  </ScrollArea>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* INTEGRITY TAB */}
          <TabsContent value="integrity" className="space-y-6">
            
            {/* AI Integrity Banner */}
            <div className="rounded-lg bg-gradient-to-r from-blue-900/20 to-cyan-500/20 border border-cyan-500/20 p-6 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2 text-white">
                  <ShieldCheck className="w-5 h-5 text-cyan-400" />
                  Perform automated background checks?
                </h3>
                <p className="text-muted-foreground text-sm mt-1">
                  Activate the Integrity Agent to verify fingerprints, criminal records, and credit history instantly.
                </p>
              </div>
              <Link href="/integrity-agent">
                <Button className="bg-cyan-500 text-cyan-950 hover:bg-cyan-400 shadow-lg shadow-cyan-500/20">
                  Start Integrity Check
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-white/10 bg-card/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileCheck className="w-5 h-5 text-primary" /> 
                    Pending Verifications
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {integrityChecks.map((check) => (
                      <div key={check.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
                        <div>
                          <p className="font-medium">{check.type}</p>
                          <p className="text-sm text-muted-foreground">Candidate: {check.candidate}</p>
                        </div>
                        <Badge variant={check.status === "Clear" ? "default" : "secondary"} className={check.status === "Clear" ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"}>
                          {check.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-white/10 bg-card/20">
                <CardHeader>
                  <CardTitle>Risk Assessment Overview</CardTitle>
                  <CardDescription>AI-generated risk profiles based on background data</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-[200px]">
                  <div className="text-center text-muted-foreground">
                    <AlertCircle className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p>Select a candidate to view detailed risk analysis</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ONBOARDING TAB */}
          <TabsContent value="onboarding" className="space-y-6">
            
             {/* AI Onboarding Banner */}
            <div className="rounded-lg bg-gradient-to-r from-amber-500/20 to-orange-600/20 border border-amber-500/20 p-6 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2 text-white">
                  <Laptop className="w-5 h-5 text-amber-400" />
                  Automate new hire provisioning?
                </h3>
                <p className="text-muted-foreground text-sm mt-1">
                  Use the Onboarding Agent to manage welcome packs, equipment orders, and digital paperwork.
                </p>
              </div>
              <Link href="/onboarding-agent">
                <Button className="bg-amber-500 text-amber-950 hover:bg-amber-400 shadow-lg shadow-amber-500/20">
                  Start Onboarding
                </Button>
              </Link>
            </div>

             <Card className="border-white/10 bg-card/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-primary" />
                  Active Onboarding Workflows
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="font-medium">Marcus Johnson - Operations Lead</span>
                      <span className="text-sm text-muted-foreground">75% Complete</span>
                    </div>
                    <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-primary w-[75%]" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    {onboardingTasks.map((task) => (
                      <div key={task.id} className="flex items-center gap-3 p-3 rounded-lg border border-white/5 bg-white/5">
                        {task.status === "Completed" ? (
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30" />
                        )}
                        <div className="flex-1">
                          <p className="text-sm font-medium">{task.task}</p>
                          <p className="text-xs text-muted-foreground">Assigned to: {task.assignee}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* PERFORMANCE TAB */}
           <TabsContent value="performance" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-white/10 bg-card/20">
                <CardHeader>
                  <CardTitle>KPI Tracking</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Performance data visualization would go here.</p>
                </CardContent>
              </Card>
              <Card className="border-white/10 bg-card/20">
                 <CardHeader>
                  <CardTitle>Training & Development</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Training module progress would go here.</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

        </Tabs>
      </main>
    </div>
  );
}