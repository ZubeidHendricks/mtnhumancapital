import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { jobsService, candidateService, api } from "@/lib/api";
import { useTenantQueryKey } from "@/hooks/useTenant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ChevronRight, 
  Loader2, 
  Users, 
  Briefcase,
  Star,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Clock
} from "lucide-react";
import { toast } from "sonner";
import type { Candidate, Job } from "@shared/schema";

const PIPELINE_STAGES = [
  { key: "sourcing", name: "Sourcing", color: "from-slate-500 to-slate-600", bgColor: "bg-slate-500/10", borderColor: "border-slate-500/30" },
  { key: "screening", name: "Screening", color: "from-blue-500 to-blue-600", bgColor: "bg-blue-500/10", borderColor: "border-blue-500/30" },
  { key: "shortlisted", name: "Shortlisted", color: "from-yellow-500 to-amber-500", bgColor: "bg-yellow-500/10", borderColor: "border-yellow-500/30" },
  { key: "interviewing", name: "Interviewing", color: "from-purple-500 to-purple-600", bgColor: "bg-purple-500/10", borderColor: "border-purple-500/30" },
  { key: "offer_pending", name: "Offer Pending", color: "from-amber-500 to-orange-500", bgColor: "bg-amber-500/10", borderColor: "border-amber-500/30" },
  { key: "offer_accepted", name: "Offer Accepted", color: "from-green-500 to-emerald-500", bgColor: "bg-green-500/10", borderColor: "border-green-500/30" },
  { key: "integrity_checks", name: "Integrity", color: "from-blue-600 to-indigo-600", bgColor: "bg-blue-600/10", borderColor: "border-blue-600/30" },
  { key: "integrity_passed", name: "Checks Passed", color: "from-emerald-500 to-teal-500", bgColor: "bg-emerald-500/10", borderColor: "border-emerald-500/30" },
  { key: "onboarding", name: "Onboarding", color: "from-teal-500 to-cyan-500", bgColor: "bg-teal-500/10", borderColor: "border-teal-500/30" },
  { key: "hired", name: "Hired", color: "from-emerald-600 to-green-600", bgColor: "bg-emerald-600/10", borderColor: "border-emerald-600/30" },
];

export default function PipelineBoard() {
  const queryClient = useQueryClient();
  const [selectedJobId, setSelectedJobId] = useState<string>("all");
  const [advancingCandidate, setAdvancingCandidate] = useState<string | null>(null);
  
  const jobsKey = useTenantQueryKey(['jobs']);
  const candidatesKey = useTenantQueryKey(['candidates']);

  const { data: jobs, isLoading: loadingJobs } = useQuery({
    queryKey: jobsKey,
    queryFn: jobsService.getAll,
  });

  const { data: candidates, isLoading: loadingCandidates } = useQuery({
    queryKey: candidatesKey,
    queryFn: candidateService.getAll,
  });

  const activeJobs = jobs?.filter((j: Job) => j.status === 'Active') || [];
  
  const filteredCandidates = selectedJobId === "all" 
    ? (candidates || [])
    : (candidates || []).filter((c: Candidate) => c.jobId === selectedJobId);

  const getStageIndex = (stage: string): number => {
    const normalizedStage = (stage || '').toLowerCase().replace(/\s+/g, '_');
    const index = PIPELINE_STAGES.findIndex(s => 
      s.key.toLowerCase() === normalizedStage || s.name.toLowerCase() === normalizedStage.replace(/_/g, ' ')
    );
    return index === -1 ? 0 : index;
  };

  const getNextStage = (currentStage: string): string | null => {
    const stageIndex = getStageIndex(currentStage);
    if (stageIndex < 0 || stageIndex >= PIPELINE_STAGES.length - 1) return null;
    return PIPELINE_STAGES[stageIndex + 1].key;
  };

  const getStageName = (stageKey: string): string => {
    const found = PIPELINE_STAGES.find(s => s.key === stageKey);
    return found?.name || stageKey;
  };

  const getCandidatesForStage = (stageKey: string): Candidate[] => {
    return filteredCandidates.filter((c: Candidate) => {
      const candidateStage = (c.stage || 'sourcing').toLowerCase().replace(/\s+/g, '_');
      return candidateStage === stageKey || 
             PIPELINE_STAGES.find(s => s.key === stageKey)?.name.toLowerCase() === candidateStage.replace(/_/g, ' ');
    });
  };

  const handleAdvanceCandidate = async (candidate: Candidate) => {
    const nextStage = getNextStage(candidate.stage || 'sourcing');
    if (!nextStage) {
      toast.info("Already at final stage");
      return;
    }

    setAdvancingCandidate(candidate.id);
    
    try {
      const response = await api.post(`/api/pipeline/candidates/${candidate.id}/transition`, {
        toStage: nextStage
      });
      
      if (response.data.success) {
        queryClient.invalidateQueries({ queryKey: candidatesKey });
        toast.success(`${candidate.fullName} moved to ${getStageName(nextStage)}`, {
          description: response.data.triggeredActions?.length 
            ? response.data.triggeredActions.join(", ")
            : undefined
        });
      } else {
        toast.error("Cannot advance", {
          description: response.data.blockers?.[0] || response.data.error
        });
      }
    } catch (error: any) {
      toast.error("Cannot advance", { 
        description: error.response?.data?.blockers?.[0] || "Failed to advance stage" 
      });
    } finally {
      setAdvancingCandidate(null);
    }
  };

  const selectedJob = activeJobs.find((j: Job) => j.id === selectedJobId);

  return (
    <div className="min-h-screen bg-background">
      
      <main className="container mx-auto px-6 pt-24 pb-12">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Pipeline Board</h1>
          <p className="text-muted-foreground">Visual workflow from Jobs to Hired</p>
        </div>

        <Card className="mb-6 bg-card/50 border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary" />
                <span className="font-medium">Select Job:</span>
              </div>
              <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                <SelectTrigger className="w-[300px] bg-background/50" data-testid="select-job">
                  <SelectValue placeholder="Select a job to filter candidates" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Jobs ({candidates?.length || 0} candidates)</SelectItem>
                  {activeJobs.map((job: Job) => {
                    const jobCandidates = candidates?.filter((c: Candidate) => c.jobId === job.id) || [];
                    return (
                      <SelectItem key={job.id} value={job.id}>
                        {job.title} ({jobCandidates.length} candidates)
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>

              {selectedJob && (
                <div className="ml-auto flex items-center gap-3">
                  <Badge variant="outline" className="bg-primary/10 border-primary/30">
                    {selectedJob.department}
                  </Badge>
                  <Badge variant="outline" className="bg-green-500/10 border-green-500/30 text-green-400">
                    {selectedJob.status}
                  </Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {(loadingJobs || loadingCandidates) ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="overflow-x-auto pb-4">
            <div className="flex gap-4 min-w-max">
              {PIPELINE_STAGES.map((stage, stageIndex) => {
                const stageCandidates = getCandidatesForStage(stage.key);
                const isLastStage = stageIndex === PIPELINE_STAGES.length - 1;
                
                return (
                  <div key={stage.key} className="flex items-start gap-2">
                    <div className="w-72 flex-shrink-0">
                      <div className={`rounded-t-lg bg-gradient-to-r ${stage.color} p-3`}>
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-white">{stage.name}</h3>
                          <Badge className="bg-white/20 text-white border-0">
                            {stageCandidates.length}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className={`rounded-b-lg ${stage.bgColor} border ${stage.borderColor} border-t-0 min-h-[400px]`}>
                        <ScrollArea className="h-[400px] p-2">
                          <div className="space-y-2">
                            {stageCandidates.length === 0 ? (
                              <div className="text-center py-8 text-muted-foreground text-sm">
                                No candidates
                              </div>
                            ) : (
                              stageCandidates.map((candidate: Candidate) => (
                                <Card 
                                  key={candidate.id} 
                                  className="bg-card/80 border-white/10 hover:border-white/20 transition-all cursor-pointer"
                                  data-testid={`card-candidate-${candidate.id}`}
                                >
                                  <CardContent className="p-3">
                                    <div className="flex items-start gap-2 mb-2">
                                      <Avatar className="h-8 w-8 border border-white/10">
                                        <AvatarFallback className="bg-primary/20 text-primary text-xs">
                                          {candidate.fullName?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'NA'}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm truncate">{candidate.fullName}</p>
                                        <p className="text-xs text-muted-foreground truncate">{candidate.role || 'No role'}</p>
                                      </div>
                                    </div>
                                    
                                    {candidate.match !== null && candidate.match !== undefined && (
                                      <div className="flex items-center gap-1 mb-2">
                                        <Star className="h-3 w-3 text-yellow-400" />
                                        <span className="text-xs text-yellow-400">{candidate.match}% match</span>
                                      </div>
                                    )}

                                    {!isLastStage && (
                                      <Button
                                        size="sm"
                                        className="w-full h-7 text-xs bg-gradient-to-r from-primary/80 to-purple-500/80 hover:from-primary hover:to-purple-500"
                                        onClick={() => handleAdvanceCandidate(candidate)}
                                        disabled={advancingCandidate === candidate.id}
                                        data-testid={`button-advance-${candidate.id}`}
                                      >
                                        {advancingCandidate === candidate.id ? (
                                          <Loader2 className="h-3 w-3 animate-spin" />
                                        ) : (
                                          <>
                                            <ChevronRight className="h-3 w-3 mr-1" />
                                            {getStageName(getNextStage(candidate.stage || 'sourcing') || '')}
                                          </>
                                        )}
                                      </Button>
                                    )}

                                    {isLastStage && (
                                      <div className="flex items-center justify-center gap-1 text-green-400 text-xs">
                                        <CheckCircle2 className="h-3 w-3" />
                                        Completed
                                      </div>
                                    )}
                                  </CardContent>
                                </Card>
                              ))
                            )}
                          </div>
                        </ScrollArea>
                      </div>
                    </div>
                    
                    {!isLastStage && (
                      <div className="flex items-center h-[440px]">
                        <ArrowRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <Card className="mt-6 bg-card/30 border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-6 text-sm">
              <span className="text-muted-foreground">Pipeline Summary:</span>
              {PIPELINE_STAGES.slice(0, 6).map((stage) => {
                const count = getCandidatesForStage(stage.key).length;
                return (
                  <div key={stage.key} className="flex items-center gap-1">
                    <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${stage.color}`} />
                    <span className="text-muted-foreground">{stage.name}:</span>
                    <span className="font-medium">{count}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
