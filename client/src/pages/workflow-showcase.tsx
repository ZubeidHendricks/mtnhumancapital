import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { jobsService, candidateService, api } from "@/lib/api";
import { useTenantQueryKey } from "@/hooks/useTenant";
import { Navbar } from "@/components/layout/navbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { 
  Briefcase,
  Users,
  Search,
  FileCheck,
  Video,
  Send,
  ShieldCheck,
  CheckCircle2,
  GraduationCap,
  Award,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Plus,
  Play,
  Star,
  Clock,
  Target,
  Sparkles,
  Zap,
  CircleDot
} from "lucide-react";
import { toast } from "sonner";
import type { Candidate, Job } from "@shared/schema";

const WORKFLOW_STEPS = [
  { id: 1, key: "create_job", name: "Create Job", shortName: "Job", icon: Briefcase, color: "from-blue-500 to-blue-600", bgColor: "bg-blue-500/10", borderColor: "border-blue-500/30", textColor: "text-blue-400" },
  { id: 2, key: "sourcing", name: "Sourcing", shortName: "Source", icon: Search, color: "from-slate-500 to-slate-600", bgColor: "bg-slate-500/10", borderColor: "border-slate-500/30", textColor: "text-slate-400" },
  { id: 3, key: "screening", name: "Screening", shortName: "Screen", icon: FileCheck, color: "from-purple-500 to-purple-600", bgColor: "bg-purple-500/10", borderColor: "border-purple-500/30", textColor: "text-purple-400" },
  { id: 4, key: "shortlisted", name: "Shortlisted", shortName: "Short", icon: Star, color: "from-yellow-500 to-amber-500", bgColor: "bg-yellow-500/10", borderColor: "border-yellow-500/30", textColor: "text-yellow-400" },
  { id: 5, key: "interviewing", name: "Interviewing", shortName: "Interview", icon: Video, color: "from-indigo-500 to-indigo-600", bgColor: "bg-indigo-500/10", borderColor: "border-indigo-500/30", textColor: "text-indigo-400" },
  { id: 6, key: "offer", name: "Offer Stage", shortName: "Offer", icon: Send, color: "from-orange-500 to-orange-600", bgColor: "bg-orange-500/10", borderColor: "border-orange-500/30", textColor: "text-orange-400" },
  { id: 7, key: "integrity", name: "Integrity", shortName: "Checks", icon: ShieldCheck, color: "from-cyan-500 to-cyan-600", bgColor: "bg-cyan-500/10", borderColor: "border-cyan-500/30", textColor: "text-cyan-400" },
  { id: 8, key: "onboarding", name: "Onboarding", shortName: "Onboard", icon: GraduationCap, color: "from-teal-500 to-teal-600", bgColor: "bg-teal-500/10", borderColor: "border-teal-500/30", textColor: "text-teal-400" },
  { id: 9, key: "hired", name: "Hired", shortName: "Hired", icon: Award, color: "from-green-500 to-green-600", bgColor: "bg-green-500/10", borderColor: "border-green-500/30", textColor: "text-green-400" },
];

const STAGE_ACTIONS: Record<string, { title: string; description: string; automations: string[] }> = {
  "create_job": { title: "Define the Position", description: "Create a new job requisition with requirements and description.", automations: ["Auto-generate JD", "Parse job specs", "Set interview questions"] },
  "sourcing": { title: "Find Candidates", description: "AI finds and imports qualified candidates from various sources.", automations: ["LinkedIn import", "CV parsing", "Auto-matching", "Bulk import"] },
  "screening": { title: "AI CV Analysis", description: "Automatically analyze and rank candidates based on requirements.", automations: ["Skills extraction", "Experience matching", "Red flag detection"] },
  "shortlisted": { title: "Top Candidates", description: "Review AI recommendations and select for interviews.", automations: ["Match ranking", "Comparison view", "Notes sharing"] },
  "interviewing": { title: "Conduct Interviews", description: "AI-powered voice and video interviews with analysis.", automations: ["Schedule interviews", "AI voice screening", "Video interviews", "Transcription"] },
  "offer": { title: "Extend Offers", description: "Generate and send offer letters, track negotiations.", automations: ["Generate offer letter", "E-signature", "Auto-trigger integrity"] },
  "integrity": { title: "Background Checks", description: "Comprehensive verification and social screening.", automations: ["Criminal check", "Credit check", "References", "Social screening"] },
  "onboarding": { title: "Welcome New Hire", description: "Complete onboarding tasks and prepare for day one.", automations: ["Welcome email", "Document collection", "IT provisioning", "Training"] },
  "hired": { title: "Successfully Hired!", description: "Employee is fully onboarded and ready.", automations: ["Add to workforce", "Assign manager", "Set KPIs"] }
};

const PIPELINE_STAGES_MAP: Record<string, string[]> = {
  "sourcing": ["sourcing"],
  "screening": ["screening"],
  "shortlisted": ["shortlisted"],
  "interviewing": ["interviewing"],
  "offer": ["offer_pending", "offer_accepted"],
  "integrity": ["integrity_checks", "integrity_passed"],
  "onboarding": ["onboarding"],
  "hired": ["hired"],
};

export default function WorkflowShowcase() {
  const queryClient = useQueryClient();
  const [activeStep, setActiveStep] = useState(1);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [advancingCandidate, setAdvancingCandidate] = useState<string | null>(null);
  
  const [jobTitle, setJobTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  
  const jobsKey = useTenantQueryKey(['jobs']);
  const candidatesKey = useTenantQueryKey(['candidates']);
  const integrityKey = useTenantQueryKey(['integrity-checks']);

  const { data: jobs = [], isLoading: loadingJobs } = useQuery({ 
    queryKey: jobsKey, 
    queryFn: jobsService.getAll 
  });
  
  const { data: candidates = [], isLoading: loadingCandidates } = useQuery({ 
    queryKey: candidatesKey, 
    queryFn: candidateService.getAll 
  });
  
  const { data: integrityChecks = [] } = useQuery({
    queryKey: integrityKey,
    queryFn: async () => { 
      try { 
        const r = await fetch('/api/integrity-checks'); 
        return r.ok ? r.json() : []; 
      } catch { return []; } 
    }
  });

  const createJobMutation = useMutation({
    mutationFn: jobsService.create,
    onSuccess: (newJob) => {
      queryClient.invalidateQueries({ queryKey: jobsKey });
      setSelectedJobId(newJob.id);
      setJobTitle(""); 
      setDepartment(""); 
      setJobDescription("");
      toast.success("Job created successfully!");
      setActiveStep(2);
    },
    onError: () => toast.error("Failed to create job")
  });

  const activeJobs = jobs.filter((j: Job) => j.status === 'Active');
  const selectedJob = activeJobs.find((j: Job) => j.id === selectedJobId);
  const jobCandidates = selectedJobId 
    ? candidates.filter((c: Candidate) => c.jobId === selectedJobId) 
    : [];

  const getCandidatesForStep = (stepKey: string): Candidate[] => {
    const stages = PIPELINE_STAGES_MAP[stepKey] || [];
    return jobCandidates.filter((c: Candidate) => {
      const stage = (c.stage || 'sourcing').toLowerCase().replace(/\s+/g, '_');
      return stages.some(s => stage === s || stage.includes(s.replace('_', '')));
    });
  };

  const getStepStats = (stepKey: string) => {
    const count = getCandidatesForStep(stepKey).length;
    return { count, percentage: jobCandidates.length ? Math.round((count / jobCandidates.length) * 100) : 0 };
  };

  const handleAdvanceCandidate = async (candidate: Candidate, toStage: string) => {
    setAdvancingCandidate(candidate.id);
    try {
      const response = await api.post(`/api/pipeline/candidates/${candidate.id}/transition`, { toStage });
      if (response.data.success) {
        queryClient.invalidateQueries({ queryKey: candidatesKey });
        toast.success(`${candidate.fullName} advanced to ${toStage}!`, {
          description: response.data.triggeredActions?.join(", ") || undefined
        });
      } else {
        toast.error("Cannot advance", { description: response.data.blockers?.[0] || response.data.error });
      }
    } catch (error: any) {
      toast.error("Cannot advance", { description: error.response?.data?.blockers?.[0] || "Failed to advance" });
    } finally {
      setAdvancingCandidate(null);
    }
  };

  const handleCreateJob = () => {
    if (!jobTitle) { 
      toast.error("Please enter a job title"); 
      return; 
    }
    createJobMutation.mutate({
      title: jobTitle, 
      department: department || "General",
      description: jobDescription || `Position for ${jobTitle}`,
      status: "Active", 
      salaryMin: 800000, 
      salaryMax: 1200000, 
      location: "Johannesburg, Gauteng"
    });
  };

  const handleStart = () => {
    if (activeJobs.length > 0 && !selectedJobId) {
      setSelectedJobId(activeJobs[0].id);
      setActiveStep(2);
      toast.success("Started with existing job: " + activeJobs[0].title);
    } else if (selectedJobId) {
      setActiveStep(2);
      toast.success("Continuing with selected job");
    } else {
      toast.info("Create a job first to start the workflow");
    }
  };

  const currentStep = WORKFLOW_STEPS[activeStep - 1];
  const stepAction = STAGE_ACTIONS[currentStep.key];
  const progressPercent = ((activeStep - 1) / (WORKFLOW_STEPS.length - 1)) * 100;
  const IconComponent = currentStep.icon;

  const getIntegrityForCandidate = (candidateId: string) => 
    integrityChecks.find((ic: any) => ic.candidateId === candidateId);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-6 pt-24 pb-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-1">HR Workflow</h1>
            <p className="text-muted-foreground">Complete hiring process from job to hired</p>
          </div>
          <div className="flex items-center gap-3">
            {selectedJob && (
              <Badge variant="secondary" className="text-sm py-1 px-3">
                <Briefcase className="h-3 w-3 mr-1" />
                {selectedJob.title}
              </Badge>
            )}
            <Button 
              onClick={handleStart}
              disabled={loadingJobs || activeJobs.length === 0}
              className="bg-gradient-to-r from-purple-500 to-pink-500"
              data-testid="button-start"
            >
              <Play className="h-4 w-4 mr-2" />
              Start
            </Button>
          </div>
        </div>

        <Card className="mb-6 bg-gradient-to-r from-card/80 to-card/60 border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => activeStep > 1 && setActiveStep(activeStep - 1)} 
                  disabled={activeStep === 1}
                  data-testid="button-prev-step"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-xl bg-gradient-to-r ${currentStep.color}`}>
                    <IconComponent className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Step {activeStep}/{WORKFLOW_STEPS.length}</span>
                      <Badge variant="outline" className={currentStep.bgColor}>{currentStep.name}</Badge>
                    </div>
                    <h2 className="text-xl font-bold">{stepAction.title}</h2>
                  </div>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="icon" 
                onClick={() => activeStep < WORKFLOW_STEPS.length && setActiveStep(activeStep + 1)} 
                disabled={activeStep === WORKFLOW_STEPS.length}
                data-testid="button-next-step"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <Progress value={progressPercent} className="h-2 mb-4" />

            <div className="flex justify-between gap-1">
              {WORKFLOW_STEPS.map((step) => {
                const isActive = step.id === activeStep;
                const isCompleted = step.id < activeStep;
                const StepIcon = step.icon;
                const stats = step.key !== "create_job" ? getStepStats(step.key) : null;
                
                return (
                  <button
                    key={step.id}
                    onClick={() => setActiveStep(step.id)}
                    className={`flex-1 flex flex-col items-center p-2 rounded-lg transition-all ${isActive ? 'bg-white/10' : 'hover:bg-white/5'}`}
                    data-testid={`wizard-step-${step.key}`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-1 transition-all ${
                      isActive ? `bg-gradient-to-r ${step.color} shadow-lg` : isCompleted ? 'bg-green-500/20 border border-green-500' : 'bg-muted/50'
                    }`}>
                      {isCompleted ? <CheckCircle2 className="h-4 w-4 text-green-400" /> : <StepIcon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-muted-foreground'}`} />}
                    </div>
                    <span className={`text-[10px] font-medium ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>{step.shortName}</span>
                    {stats && stats.count > 0 && <span className={`text-[10px] ${step.textColor}`}>{stats.count}</span>}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-card/50 border-white/10">
              <CardHeader className="pb-3">
                <CardDescription>{stepAction.description}</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingJobs || loadingCandidates ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : currentStep.key === "create_job" ? (
                  <div className="space-y-4">
                    {activeJobs.length > 0 && (
                      <div>
                        <Label className="text-sm mb-2 block">Select existing job:</Label>
                        <Select value={selectedJobId || ""} onValueChange={(v) => { setSelectedJobId(v); setActiveStep(2); }}>
                          <SelectTrigger data-testid="select-existing-job">
                            <SelectValue placeholder="Choose a job..." />
                          </SelectTrigger>
                          <SelectContent>
                            {activeJobs.map((job: Job) => (
                              <SelectItem key={job.id} value={job.id}>
                                {job.title} - {job.department}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    
                    <div className={activeJobs.length > 0 ? "border-t border-white/10 pt-4" : ""}>
                      <h4 className="font-medium mb-4 flex items-center gap-2">
                        <Plus className="h-4 w-4" /> Create New Job
                      </h4>
                      <div className="grid gap-3">
                        <div>
                          <Label>Job Title *</Label>
                          <Input 
                            value={jobTitle} 
                            onChange={e => setJobTitle(e.target.value)} 
                            placeholder="e.g., Senior Developer" 
                            data-testid="input-job-title" 
                          />
                        </div>
                        <div>
                          <Label>Department</Label>
                          <Input 
                            value={department} 
                            onChange={e => setDepartment(e.target.value)} 
                            placeholder="e.g., Engineering" 
                            data-testid="input-department" 
                          />
                        </div>
                        <div>
                          <Label>Description</Label>
                          <Textarea 
                            value={jobDescription} 
                            onChange={e => setJobDescription(e.target.value)} 
                            placeholder="Job requirements..." 
                            rows={3}
                            data-testid="input-description" 
                          />
                        </div>
                        <Button 
                          onClick={handleCreateJob} 
                          disabled={createJobMutation.isPending || !jobTitle}
                          className="bg-gradient-to-r from-blue-500 to-blue-600"
                          data-testid="button-create-job"
                        >
                          {createJobMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Briefcase className="h-4 w-4 mr-2" />
                          )}
                          Create Job & Continue
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : !selectedJobId ? (
                  <div className="text-center py-12">
                    <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-medium mb-2">No Job Selected</h3>
                    <p className="text-muted-foreground mb-4">Create or select a job to continue</p>
                    <Button onClick={() => setActiveStep(1)} variant="outline">Go to Step 1</Button>
                  </div>
                ) : (
                  <div>
                    {(() => {
                      const stepCandidates = getCandidatesForStep(currentStep.key);
                      const nextStep = WORKFLOW_STEPS[activeStep];
                      const nextStages = nextStep ? PIPELINE_STAGES_MAP[nextStep.key] : [];
                      const nextStage = nextStages[0];

                      if (stepCandidates.length === 0) {
                        return (
                          <div className="text-center py-8">
                            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                            <h3 className="font-medium mb-2">No Candidates at This Stage</h3>
                            <p className="text-sm text-muted-foreground">
                              {currentStep.key === "sourcing" 
                                ? "Upload CVs or use AI sourcing to add candidates"
                                : "Advance candidates from the previous stage"}
                            </p>
                          </div>
                        );
                      }

                      return (
                        <ScrollArea className="h-[350px]">
                          <div className="space-y-3">
                            {stepCandidates.map((candidate: Candidate) => {
                              const integrity = getIntegrityForCandidate(candidate.id);
                              
                              return (
                                <Card key={candidate.id} className="bg-background/50 border-white/10" data-testid={`workflow-card-${candidate.id}`}>
                                  <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                        <Avatar className="h-10 w-10 border border-white/10">
                                          <AvatarFallback className="bg-primary/20 text-primary text-sm">
                                            {candidate.fullName?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                          </AvatarFallback>
                                        </Avatar>
                                        <div>
                                          <p className="font-medium">{candidate.fullName}</p>
                                          <p className="text-sm text-muted-foreground">{candidate.role}</p>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {candidate.match && (
                                          <Badge variant="outline" className="bg-yellow-500/10 border-yellow-500/30">
                                            <Star className="h-3 w-3 mr-1 text-yellow-400" />{candidate.match}%
                                          </Badge>
                                        )}
                                        
                                        {currentStep.key === "integrity" && integrity && (
                                          <Badge variant="outline" className={
                                            integrity.status === 'completed' || integrity.status === 'passed'
                                              ? 'bg-green-500/10 border-green-500/30 text-green-400'
                                              : integrity.status === 'failed'
                                                ? 'bg-red-500/10 border-red-500/30 text-red-400'
                                                : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
                                          }>
                                            <ShieldCheck className="h-3 w-3 mr-1" />{integrity.status}
                                          </Badge>
                                        )}

                                        <Badge variant="outline" className={`${currentStep.bgColor} ${currentStep.borderColor}`}>
                                          {candidate.stage}
                                        </Badge>
                                        
                                        {nextStage && currentStep.key !== "hired" && (
                                          <Button
                                            size="sm"
                                            className={`bg-gradient-to-r ${nextStep?.color || 'from-primary to-primary'}`}
                                            onClick={() => handleAdvanceCandidate(candidate, nextStage)}
                                            disabled={advancingCandidate === candidate.id}
                                            data-testid={`button-advance-${candidate.id}`}
                                          >
                                            {advancingCandidate === candidate.id ? (
                                              <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                              <>
                                                <ChevronRight className="h-4 w-4 mr-1" />
                                                {nextStep?.shortName}
                                              </>
                                            )}
                                          </Button>
                                        )}
                                        
                                        {currentStep.key === "hired" && (
                                          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                                            <CheckCircle2 className="h-3 w-3 mr-1" />Hired
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              );
                            })}
                          </div>
                        </ScrollArea>
                      );
                    })()}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-card/50 border-white/10">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Zap className="h-4 w-4 text-yellow-400" />Automations at This Stage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {stepAction.automations.map((a, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 text-sm">
                      <CircleDot className="h-3 w-3 text-primary" />{a}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="bg-card/50 border-white/10">
              <CardHeader>
                <CardTitle className="text-sm">Pipeline Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {selectedJob ? (
                  <>
                    <div className="flex justify-between p-2 rounded bg-muted/30 text-sm">
                      <span className="text-muted-foreground">Job</span>
                      <span className="font-medium truncate max-w-[120px]">{selectedJob.title}</span>
                    </div>
                    <div className="flex justify-between p-2 rounded bg-muted/30 text-sm">
                      <span className="text-muted-foreground">Candidates</span>
                      <span className="font-medium">{jobCandidates.length}</span>
                    </div>
                    <div className="border-t border-white/10 pt-2 mt-2">
                      {WORKFLOW_STEPS.filter(s => s.key !== "create_job").map(step => {
                        const stats = getStepStats(step.key);
                        return (
                          <div key={step.key} className="flex items-center gap-2 py-1">
                            <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${step.color}`} />
                            <span className="text-xs text-muted-foreground flex-1">{step.shortName}</span>
                            <span className="text-xs font-medium">{stats.count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-4">
                    <Clock className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-xs text-muted-foreground">Select a job to see summary</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-card/50 border-white/10">
              <CardHeader><CardTitle className="text-sm">Quick Actions</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start text-sm h-9" onClick={() => setActiveStep(1)}>
                  <Briefcase className="h-3 w-3 mr-2" />New Job
                </Button>
                <Button variant="outline" className="w-full justify-start text-sm h-9" asChild>
                  <a href="/pipeline-board"><Target className="h-3 w-3 mr-2" />Pipeline Board</a>
                </Button>
                <Button variant="outline" className="w-full justify-start text-sm h-9" asChild>
                  <a href="/hr-dashboard"><Sparkles className="h-3 w-3 mr-2" />HR Dashboard</a>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
