import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { candidateService, jobsService } from "@/lib/api";
import { useTenantQueryKey } from "@/hooks/useTenant";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Mail,
  Phone,
  Linkedin,
  Search,
  ArrowLeft,
  Bot,
  Send,
  Loader2,
  Star,
  X,
  Clock,
  CheckCircle,
} from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { InterestCheckDialog } from "@/components/interest-check-dialog";
import { InterviewInviteDialog } from "@/components/interview-invite-dialog";
import { api } from "@/lib/api";

export default function ShortlistedCandidates() {
  const [searchQuery, setSearchQuery] = useState("");
  const [interestCheckOpen, setInterestCheckOpen] = useState(false);
  const [interviewInviteOpen, setInterviewInviteOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
  const [selectedJob, setSelectedJob] = useState<any>(null);

  const queryClient = useQueryClient();
  const candidatesKey = useTenantQueryKey(['candidates']);
  const interestChecksKey = useTenantQueryKey(['interest-checks']);
  const jobsKey = useTenantQueryKey(['jobs']);

  // Fetch all candidates from API
  const { data: candidates, isLoading: loadingCandidates } = useQuery({
    queryKey: candidatesKey,
    queryFn: candidateService.getAll,
    retry: 1,
  });

  // Fetch all interest checks
  const { data: interestChecks } = useQuery({
    queryKey: interestChecksKey,
    queryFn: async () => {
      const res = await api.get("/interest-checks");
      return res.data;
    },
  });

  // Fetch all jobs
  const { data: jobs } = useQuery({
    queryKey: jobsKey,
    queryFn: jobsService.getAll,
  });

  // Mutation to update candidate
  const updateCandidateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) =>
      candidateService.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: candidatesKey });
    },
  });

  // Filter only shortlisted candidates
  const shortlistedCandidates = useMemo(() => {
    if (!candidates) return [];
    return candidates.filter((c: any) => c.stage === "Shortlisted");
  }, [candidates]);

  // Further filter by search query
  const filteredCandidates = useMemo(() => {
    if (!searchQuery) return shortlistedCandidates;
    const query = searchQuery.toLowerCase();
    return shortlistedCandidates.filter((c: any) => {
      const name = c.fullName?.toLowerCase() || '';
      const email = c.email?.toLowerCase() || '';
      const role = c.role?.toLowerCase() || '';
      return name.includes(query) || email.includes(query) || role.includes(query);
    });
  }, [shortlistedCandidates, searchQuery]);

  // Get latest interest check status for a candidate
  const getInterestStatus = (candidateId: string) => {
    if (!interestChecks) return null;
    const checks = interestChecks.filter((c: any) => c.candidateId === candidateId);
    if (checks.length === 0) return null;
    return checks[0]; // Already sorted by createdAt desc from API
  };

  const handleRemoveFromShortlist = async (id: string) => {
    const candidate = filteredCandidates.find((c: any) => c.id === id);
    try {
      await updateCandidateMutation.mutateAsync({
        id,
        updates: { stage: "Screening" }
      });
      toast.success(`${candidate?.fullName || 'Candidate'} removed from shortlist`);
    } catch (error) {
      toast.error("Failed to remove from shortlist");
    }
  };

  const handleSendInterestCheck = (candidate: any) => {
    setSelectedCandidate(candidate);
    const job = jobs?.find((j: any) => j.id === candidate.jobId) || null;
    setSelectedJob(job);
    setInterestCheckOpen(true);
  };

  const handleAIInterview = (candidate: any) => {
    setSelectedCandidate(candidate);
    const job = jobs?.find((j: any) => j.id === candidate.jobId) || null;
    setSelectedJob(job);
    setInterviewInviteOpen(true);
  };

  // Helper function to get source color
  const getSourceColor = (source: string) => {
    const sourceColors: Record<string, string> = {
      "Recruited": "text-foreground dark:text-foreground bg-muted/10",
      "Uploaded": "text-foreground bg-muted/10",
      "Referral": "text-foreground dark:text-foreground bg-muted/10",
      "LinkedIn": "text-foreground bg-muted/10",
      "Direct": "text-foreground bg-muted/10"
    };
    return sourceColors[source] || "text-muted-foreground bg-muted/10";
  };

  // Helper function to get match badge color
  const getMatchColor = (match: number | null | undefined) => {
    if (!match) return "text-muted-foreground bg-muted/10";
    if (match >= 80) return "text-foreground bg-muted/10";
    if (match >= 60) return "text-foreground bg-muted/10";
    return "text-destructive bg-destructive/10";
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-foreground flex flex-col">

      <div className="flex-1 flex overflow-hidden pt-16">
        {/* LEFT PANEL */}
        <div className="w-[400px] border-r border-border dark:border-white/10 bg-[#0a0a0a] flex flex-col h-full overflow-hidden">
          <div className="p-6 space-y-6 overflow-y-auto flex-1">

            {/* Header */}
            <div className="flex items-center gap-4">
              <Link href="/hr-dashboard">
                <Button variant="ghost" size="icon" className="h-8 w-8 -ml-2 text-muted-foreground hover:text-white" data-testid="button-back-dashboard">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div className="h-10 w-10 bg-muted rounded-lg flex items-center justify-center text-white font-bold text-lg">
                <Star className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Shortlisted Candidates</h1>
                <p className="text-xs text-muted-foreground">Top talent ready for next steps</p>
              </div>
            </div>

            {/* Stats */}
            <div className="space-y-3">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>TOTAL SHORTLISTED</span>
                <span className="text-foreground font-medium">{shortlistedCandidates.length} candidates</span>
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-white/5 border border-border dark:border-white/10 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium text-foreground">About Shortlisted</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                These candidates have passed initial screening and are ready for the next step.
                Send an interest check first, then schedule AI interviews once interest is confirmed.
              </p>
            </div>

          </div>
        </div>

        {/* RIGHT PANEL: CANDIDATES LIST */}
        <div className="flex-1 flex flex-col bg-[#0a0a0a]">

          {/* Search Bar */}
          <div className="border-b border-border dark:border-white/10 p-6 flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search shortlisted candidates..."
                className="pl-10 bg-white/5 border-border dark:border-white/10 text-white placeholder:text-muted-foreground"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="input-search-candidates"
              />
            </div>
          </div>

          {/* Candidates List */}
          <ScrollArea className="flex-1 px-6 pb-6">
            <div className="space-y-1">
              {loadingCandidates ? (
                <div className="flex flex-col items-center justify-center h-64 gap-2 text-muted-foreground">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p>Loading candidates...</p>
                </div>
              ) : filteredCandidates.map((candidate: any) => {
                const interestCheck = getInterestStatus(candidate.id);
                const interestStatus = interestCheck?.status;

                return (
                  <motion.div
                    key={candidate.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/5 hover:bg-white/10 border border-border dark:border-white/10 rounded-lg p-4 transition-all cursor-pointer group"
                    data-testid={`card-candidate-${candidate.id}`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      {/* Left: Avatar & Info */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Avatar className="h-10 w-10 border-2 border-border dark:border-white/20">
                          <AvatarFallback className="bg-gradient-to-br from-muted to-background text-white font-semibold">
                            {candidate.fullName?.split(' ')?.map((n: string) => n[0])?.join('')?.toUpperCase() || '?'}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground truncate" data-testid={`text-candidate-name-${candidate.id}`}>
                            {candidate.fullName}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {candidate.role || 'No role specified'}
                          </p>
                        </div>
                      </div>

                      {/* Middle: Badges */}
                      <div className="flex items-center gap-2">
                        {candidate.source && (
                          <Badge className={`${getSourceColor(candidate.source)} border-0 font-medium text-xs px-2 py-0.5`}>
                            {candidate.source}
                          </Badge>
                        )}
                        {candidate.match !== null && candidate.match !== undefined && (
                          <Badge className={`${getMatchColor(candidate.match)} border-0 font-medium text-xs px-2 py-0.5`}>
                            {candidate.match}% Match
                          </Badge>
                        )}
                        {/* Interest status badge */}
                        {interestStatus === "sent" || interestStatus === "pending" ? (
                          <Badge className="bg-yellow-500/10 text-yellow-400 border-0 font-medium text-xs px-2 py-0.5 gap-1">
                            <Clock className="h-3 w-3" />
                            Awaiting Response
                          </Badge>
                        ) : interestStatus === "interested" ? (
                          <Badge className="bg-green-500/10 text-green-400 border-0 font-medium text-xs px-2 py-0.5 gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Interested
                          </Badge>
                        ) : null}
                        <Star className="h-4 w-4 text-foreground fill-yellow-400" />
                      </div>

                      {/* Right: Contact Icons & Actions */}
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          {candidate.email && (
                            <Mail className="h-3.5 w-3.5 text-white cursor-pointer hover:text-primary" />
                          )}
                          {candidate.phone && (
                            <Phone className="h-3.5 w-3.5 text-white cursor-pointer hover:text-primary" />
                          )}
                          <Linkedin className="h-3.5 w-3.5 text-white cursor-pointer hover:text-primary" />
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {interestStatus === "interested" ? (
                          <Button
                            size="sm"
                            className="h-8 bg-white text-black hover:bg-secondary border-0 gap-1.5 font-medium text-xs px-3"
                            onClick={() => handleAIInterview(candidate)}
                            data-testid={`button-ai-interview-${candidate.id}`}
                          >
                            <Bot className="h-3 w-3" />
                            AI Interview
                          </Button>
                        ) : interestStatus === "sent" || interestStatus === "pending" ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10 gap-1.5 font-medium text-xs px-3"
                            disabled
                          >
                            <Clock className="h-3 w-3" />
                            Pending
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            className="h-8 bg-blue-600 text-white hover:bg-blue-500 border-0 gap-1.5 font-medium text-xs px-3"
                            onClick={() => handleSendInterestCheck(candidate)}
                            data-testid={`button-interest-check-${candidate.id}`}
                          >
                            <Send className="h-3 w-3" />
                            Interest Check
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:text-white hover:bg-white/10"
                          onClick={() => handleRemoveFromShortlist(candidate.id)}
                          data-testid={`button-remove-${candidate.id}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}

              {!loadingCandidates && filteredCandidates.length === 0 && (
                <div className="text-center py-20 text-muted-foreground">
                  <Star className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No shortlisted candidates yet</p>
                  <p className="text-sm mt-2">
                    {searchQuery
                      ? 'Try adjusting your search query.'
                      : 'Shortlist candidates from the candidates list to see them here.'}
                  </p>
                  <Link href="/candidates-list">
                    <Button variant="link" className="text-primary mt-4">
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Browse All Candidates
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </ScrollArea>

        </div>
      </div>

      {/* Interest Check Dialog */}
      <InterestCheckDialog
        open={interestCheckOpen}
        onOpenChange={setInterestCheckOpen}
        candidate={selectedCandidate}
        job={selectedJob}
        onSent={() => {
          queryClient.invalidateQueries({ queryKey: interestChecksKey });
        }}
      />

      {/* Interview Invite Dialog */}
      <InterviewInviteDialog
        open={interviewInviteOpen}
        onOpenChange={setInterviewInviteOpen}
        candidate={selectedCandidate}
        job={selectedJob}
        onInviteSent={() => {
          queryClient.invalidateQueries({ queryKey: candidatesKey });
        }}
      />

    </div>
  );
}
