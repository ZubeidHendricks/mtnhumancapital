import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { jobsService, candidateService, api } from "@/lib/api";
import { useTenantQueryKey } from "@/hooks/useTenant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { 
  ChevronRight, 
  Loader2, 
  Users, 
  Briefcase,
  Star,
  ArrowRight,
  CheckCircle2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  FileText,
  GripVertical,
  Eye,
  X
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "wouter";
import type { Candidate, Job } from "@shared/schema";

const PIPELINE_STAGES = [
  { key: "sourcing", name: "Sourcing", color: "from-slate-500 to-slate-600", bgColor: "bg-slate-500/10", borderColor: "border-slate-500/30" },
  { key: "screening", name: "Screening", color: "from-blue-500 to-blue-600", bgColor: "bg-blue-500/10", borderColor: "border-blue-500/30" },
  { key: "shortlisted", name: "Shortlisted", color: "from-yellow-500 to-amber-500", bgColor: "bg-yellow-500/10", borderColor: "border-yellow-500/30" },
  { key: "interviewing", name: "Interviewing", color: "from-blue-500 to-blue-600", bgColor: "bg-blue-500/10", borderColor: "border-blue-500/30" },
  { key: "offer_pending", name: "Offer Pending", color: "from-amber-500 to-teal-600", bgColor: "bg-amber-500/10", borderColor: "border-amber-500/30" },
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
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [draggedCandidate, setDraggedCandidate] = useState<Candidate | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  
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

  const moveCandidate = async (candidate: Candidate, toStage: string) => {
    setAdvancingCandidate(candidate.id);
    
    try {
      const response = await api.post(`/api/pipeline/candidates/${candidate.id}/transition`, {
        toStage: toStage
      });
      
      if (response.data.success) {
        queryClient.invalidateQueries({ queryKey: candidatesKey });
        toast.success(`${candidate.fullName} moved to ${getStageName(toStage)}`, {
          description: response.data.triggeredActions?.length 
            ? response.data.triggeredActions.join(", ")
            : undefined
        });
      } else {
        toast.error("Cannot move candidate", {
          description: response.data.blockers?.[0] || response.data.error
        });
      }
    } catch (error: any) {
      toast.error("Cannot move candidate", { 
        description: error.response?.data?.blockers?.[0] || "Failed to move candidate" 
      });
    } finally {
      setAdvancingCandidate(null);
    }
  };

  const handleAdvanceCandidate = async (candidate: Candidate) => {
    const nextStage = getNextStage(candidate.stage || 'sourcing');
    if (!nextStage) {
      toast.info("Already at final stage");
      return;
    }
    await moveCandidate(candidate, nextStage);
  };

  const handleDragStart = useCallback((e: React.DragEvent, candidate: Candidate) => {
    setDraggedCandidate(candidate);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', candidate.id);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedCandidate(null);
    setDragOverStage(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, stageKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverStage(stageKey);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverStage(null);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent, stageKey: string) => {
    e.preventDefault();
    setDragOverStage(null);
    
    if (draggedCandidate) {
      const currentStage = (draggedCandidate.stage || 'sourcing').toLowerCase().replace(/\s+/g, '_');
      if (currentStage !== stageKey) {
        await moveCandidate(draggedCandidate, stageKey);
      }
    }
    setDraggedCandidate(null);
  }, [draggedCandidate]);

  const selectedJob = activeJobs.find((j: Job) => j.id === selectedJobId);

  return (
    <div className="min-h-screen bg-background">
      
      <main className="container mx-auto px-6 pt-24 pb-12">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Pipeline Board</h1>
          <p className="text-muted-foreground">Drag candidates between stages or click to view details</p>
        </div>

        <Card className="mb-6 bg-card/50 border-border dark:border-white/10">
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
                  <Badge variant="outline" className="bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400">
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
            <div className="flex gap-3 min-w-max">
              {PIPELINE_STAGES.map((stage, stageIndex) => {
                const stageCandidates = getCandidatesForStage(stage.key);
                const isLastStage = stageIndex === PIPELINE_STAGES.length - 1;
                const isDragOver = dragOverStage === stage.key;
                
                return (
                  <div key={stage.key} className="flex items-start gap-2">
                    <div 
                      className={`w-80 flex-shrink-0 transition-all ${isDragOver ? 'scale-[1.02]' : ''}`}
                      onDragOver={(e) => handleDragOver(e, stage.key)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, stage.key)}
                    >
                      <div className={`rounded-t-lg bg-gradient-to-r ${stage.color} p-3`}>
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-white">{stage.name}</h3>
                          <Badge className="bg-white/20 text-white border-0">
                            {stageCandidates.length}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className={`rounded-b-lg ${stage.bgColor} border-2 ${isDragOver ? 'border-primary' : stage.borderColor} border-t-0 min-h-[500px] transition-colors`}>
                        <ScrollArea className="h-[500px] p-2">
                          <div className="space-y-2">
                            {stageCandidates.length === 0 ? (
                              <div className="text-center py-8 text-muted-foreground text-sm">
                                {isDragOver ? 'Drop candidate here' : 'No candidates'}
                              </div>
                            ) : (
                              stageCandidates.map((candidate: Candidate) => (
                                <Card 
                                  key={candidate.id} 
                                  className={`bg-card/90 border-border dark:border-white/10 hover:border-primary/50 transition-all cursor-grab active:cursor-grabbing ${draggedCandidate?.id === candidate.id ? 'opacity-50' : ''}`}
                                  draggable
                                  onDragStart={(e) => handleDragStart(e, candidate)}
                                  onDragEnd={handleDragEnd}
                                  data-testid={`card-candidate-${candidate.id}`}
                                >
                                  <CardContent className="p-3">
                                    <div className="flex items-start gap-2 mb-2">
                                      <GripVertical className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
                                      <Avatar className="h-10 w-10 border border-border dark:border-white/10">
                                        <AvatarFallback className="bg-primary/20 text-primary text-sm">
                                          {candidate.fullName?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'NA'}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm truncate">{candidate.fullName}</p>
                                        <p className="text-xs text-muted-foreground truncate">{candidate.role || 'No role'}</p>
                                        {candidate.email && (
                                          <p className="text-xs text-muted-foreground truncate">{candidate.email}</p>
                                        )}
                                      </div>
                                    </div>
                                    
                                    {candidate.match !== null && candidate.match !== undefined && (
                                      <div className="flex items-center gap-1 mb-2 ml-6">
                                        <Star className="h-3 w-3 text-yellow-600 dark:text-yellow-400" />
                                        <span className="text-xs text-yellow-600 dark:text-yellow-400">{candidate.match}% match</span>
                                      </div>
                                    )}

                                    <div className="flex gap-2 ml-6">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="flex-1 h-7 text-xs"
                                        onClick={() => setSelectedCandidate(candidate)}
                                        data-testid={`button-view-${candidate.id}`}
                                      >
                                        <Eye className="h-3 w-3 mr-1" />
                                        View
                                      </Button>
                                      
                                      {!isLastStage && (
                                        <Button
                                          size="sm"
                                          className="flex-1 h-7 text-xs bg-gradient-to-r from-primary/80 to-blue-500/80 hover:from-primary hover:to-blue-500"
                                          onClick={() => handleAdvanceCandidate(candidate)}
                                          disabled={advancingCandidate === candidate.id}
                                          data-testid={`button-advance-${candidate.id}`}
                                        >
                                          {advancingCandidate === candidate.id ? (
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                          ) : (
                                            <>
                                              <ChevronRight className="h-3 w-3" />
                                              Next
                                            </>
                                          )}
                                        </Button>
                                      )}
                                    </div>

                                    {isLastStage && (
                                      <div className="flex items-center justify-center gap-1 text-green-600 dark:text-green-400 text-xs mt-2 ml-6">
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
                      <div className="flex items-center h-[540px]">
                        <ArrowRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <Card className="mt-6 bg-card/30 border-border dark:border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-6 text-sm flex-wrap">
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

      {/* Candidate Detail Dialog */}
      <Dialog open={!!selectedCandidate} onOpenChange={() => setSelectedCandidate(null)}>
        <DialogContent className="bg-card border-border dark:border-white/10 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Avatar className="h-12 w-12 border border-border">
                <AvatarFallback className="bg-primary/20 text-primary">
                  {selectedCandidate?.fullName?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'NA'}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-xl">{selectedCandidate?.fullName}</p>
                <p className="text-sm text-muted-foreground font-normal">{selectedCandidate?.role || 'No role specified'}</p>
              </div>
            </DialogTitle>
            <DialogDescription className="sr-only">
              Candidate details and actions
            </DialogDescription>
          </DialogHeader>
          
          {selectedCandidate && (
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedCandidate.email || 'No email'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedCandidate.phone || 'No phone'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedCandidate.location || 'No location'}</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    <span>Stage: <Badge variant="outline">{getStageName(selectedCandidate.stage || 'sourcing')}</Badge></span>
                  </div>
                  {selectedCandidate.match !== null && selectedCandidate.match !== undefined && (
                    <div className="flex items-center gap-2 text-sm">
                      <Star className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                      <span className="text-yellow-600 dark:text-yellow-400">{selectedCandidate.match}% match</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>Added: {selectedCandidate.createdAt ? new Date(selectedCandidate.createdAt).toLocaleDateString() : 'Unknown'}</span>
                  </div>
                </div>
              </div>

              {selectedCandidate.skills && selectedCandidate.skills.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Skills</h4>
                  <div className="flex flex-wrap gap-1">
                    {selectedCandidate.skills.map((skill, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {selectedCandidate.summary && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Summary</h4>
                  <p className="text-sm text-muted-foreground">{selectedCandidate.summary}</p>
                </div>
              )}

              <div className="flex gap-2 pt-4 border-t border-border">
                <Link href={`/candidates/${selectedCandidate.id}`}>
                  <Button className="gap-2" data-testid="button-full-profile">
                    <FileText className="h-4 w-4" />
                    View Full Profile
                  </Button>
                </Link>
                <Button 
                  variant="outline" 
                  onClick={() => setSelectedCandidate(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
