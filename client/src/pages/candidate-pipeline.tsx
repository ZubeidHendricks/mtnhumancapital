import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { candidateService, api } from "@/lib/api";
import { useTenantQueryKey } from "@/hooks/useTenant";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Clock,
  FileText,
  IdCard,
  Shield,
  FileCheck,
  UserCheck,
  ArrowRight,
  Download,
  Send,
  Loader2,
  MapPin,
  Briefcase,
  Mail,
  Phone,
  Star,
  Building2,
  GraduationCap,
  Brain,
  ExternalLink,
  MessageCircle,
  ChevronRight,
  Ban,
  CreditCard
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Link } from "wouter";
import type { Candidate } from "@shared/schema";

type DocumentStatus = "complete" | "pending" | "missing";

type DocumentRecord = {
  status: DocumentStatus;
  uploadedAt?: string;
  url?: string;
};

type CandidateMetadata = {
  documents?: {
    cv?: DocumentRecord;
    idDocument?: DocumentRecord;
    references?: DocumentRecord;
    backgroundCheck?: DocumentRecord;
    contract?: DocumentRecord;
    bankingDetails?: DocumentRecord;
    signedOfferLetter?: DocumentRecord;
    ndaNonCompete?: DocumentRecord;
  };
  [key: string]: any;
};

const DOCUMENT_DEFINITIONS = [
  { key: "cv", name: "CV/Resume", icon: FileText },
  { key: "idDocument", name: "ID Document", icon: IdCard },
  { key: "references", name: "References", icon: UserCheck },
  { key: "backgroundCheck", name: "Background Check", icon: Shield },
  { key: "contract", name: "Signed Contract", icon: FileCheck },
  { key: "bankingDetails", name: "Banking Details", icon: CreditCard },
  { key: "signedOfferLetter", name: "Signed Offer Letter", icon: FileCheck },
  { key: "ndaNonCompete", name: "NDA / Non-Compete", icon: FileText },
] as const;

const PIPELINE_STAGES = [
  { key: "sourcing", name: "Sourcing", color: "bg-slate-400", section: "recruitment" },
  { key: "screening", name: "Screening", color: "bg-blue-400", section: "recruitment" },
  { key: "shortlisted", name: "Shortlisted", color: "bg-yellow-500", section: "recruitment" },
  { key: "interviewing", name: "Interviewing", color: "bg-blue-500", section: "recruitment" },
  { key: "offer_pending", name: "Offer Pending", color: "bg-amber-500", section: "recruitment" },
  { key: "offer_accepted", name: "Offer Accepted", color: "bg-green-500", section: "recruitment" },
  { key: "integrity_checks", name: "Integrity Checks", color: "bg-blue-600", section: "integrity" },
  { key: "integrity_passed", name: "Checks Passed", color: "bg-emerald-500", section: "integrity" },
  { key: "onboarding", name: "Onboarding", color: "bg-teal-500", section: "onboarding" },
  { key: "hired", name: "Hired", color: "bg-emerald-600", section: "onboarding" },
];

const STAGE_SECTIONS = [
  { key: "recruitment", name: "Recruitment", color: "bg-gradient-to-r from-blue-500 to-blue-500" },
  { key: "integrity", name: "Integrity", color: "bg-gradient-to-r from-blue-600 to-emerald-500" },
  { key: "onboarding", name: "Onboarding", color: "bg-gradient-to-r from-teal-500 to-emerald-600" },
];

export default function CandidatePipeline() {
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);
  const [openingWhatsApp, setOpeningWhatsApp] = useState<string | null>(null);
  const [advancingCandidate, setAdvancingCandidate] = useState<string | null>(null);
  const [candidateBlockers, setCandidateBlockers] = useState<Record<string, string[]>>({});
  const candidatesKey = useTenantQueryKey(['candidates']);

  const { data: candidates, isLoading } = useQuery({
    queryKey: candidatesKey,
    queryFn: candidateService.getAll,
    retry: 1,
  });

  const handleViewProfile = async (candidate: Candidate) => {
    try {
      const freshData = await api.get(`/candidates/${candidate.id}`);
      setSelectedCandidate(freshData.data);
      setShowProfileDialog(true);
    } catch {
      setSelectedCandidate(candidate);
      setShowProfileDialog(true);
    }
  };

  const handleSendReminder = async (candidate: Candidate) => {
    setSendingReminder(candidate.id);
    try {
      await api.post(`/candidates/${candidate.id}/send-reminder`);
      queryClient.invalidateQueries({ queryKey: candidatesKey });
      toast.success(`Reminder sent to ${candidate.fullName}`, {
        description: "They will receive a notification about missing documents"
      });
    } catch (error: any) {
      if (error.response?.status === 404) {
        toast.info(`Reminder simulated for ${candidate.fullName}`, {
          description: "Email/SMS integration not configured yet"
        });
      } else {
        toast.error("Failed to send reminder");
      }
    } finally {
      setSendingReminder(null);
    }
  };

  const handleOpenWhatsApp = async (candidate: Candidate) => {
    if (!candidate.phone) {
      toast.error("No phone number", {
        description: "This candidate doesn't have a phone number on file"
      });
      return;
    }
    
    setOpeningWhatsApp(candidate.id);
    try {
      const response = await api.post(`/whatsapp/candidates/${candidate.id}/conversation`);
      const conversation = response.data;
      navigate(`/whatsapp-monitor?conversationId=${conversation.id}`);
    } catch (error: any) {
      if (error.response?.status === 400) {
        toast.error("Cannot open WhatsApp", {
          description: error.response.data?.message || "Candidate has no phone number"
        });
      } else {
        toast.error("Failed to open WhatsApp conversation");
      }
    } finally {
      setOpeningWhatsApp(null);
    }
  };

  const getNextStage = (currentStage: string): string | null => {
    const stageIndex = getStageIndex(currentStage);
    if (stageIndex < 0 || stageIndex >= PIPELINE_STAGES.length - 1) return null;
    return PIPELINE_STAGES[stageIndex + 1].key;
  };

  const handleAdvanceStage = async (candidate: Candidate) => {
    const nextStage = getNextStage(candidate.stage || 'sourcing');
    if (!nextStage) {
      toast.info("Already at final stage", {
        description: "This candidate has completed the pipeline"
      });
      return;
    }

    setAdvancingCandidate(candidate.id);
    setCandidateBlockers(prev => ({ ...prev, [candidate.id]: [] }));
    
    try {
      const response = await api.post(`/api/pipeline/candidates/${candidate.id}/transition`, {
        toStage: nextStage
      });
      
      if (response.data.success) {
        queryClient.invalidateQueries({ queryKey: candidatesKey });
        toast.success(`${candidate.fullName} advanced to ${getStageName(nextStage)}`, {
          description: response.data.triggeredActions?.length 
            ? `Triggered: ${response.data.triggeredActions.join(", ")}`
            : undefined
        });
      } else {
        const blockers = response.data.blockers || [response.data.error || "Cannot advance"];
        setCandidateBlockers(prev => ({ ...prev, [candidate.id]: blockers }));
        toast.error("Cannot advance stage", {
          description: blockers[0]
        });
      }
    } catch (error: any) {
      const message = error.response?.data?.error || error.response?.data?.blockers?.[0] || "Failed to advance stage";
      setCandidateBlockers(prev => ({ ...prev, [candidate.id]: [message] }));
      toast.error("Cannot advance stage", { description: message });
    } finally {
      setAdvancingCandidate(null);
    }
  };

  const pipelineCandidates = candidates?.filter(c => 
    PIPELINE_STAGES.some(s => s.key.toLowerCase() === (c.stage || '').toLowerCase() || s.name.toLowerCase() === (c.stage || '').toLowerCase())
  ) || [];

  const getDocumentStatus = (candidate: Candidate, docKey: string): DocumentStatus => {
    const metadata = candidate.metadata as CandidateMetadata | null;
    const documents = metadata?.documents || {};
    const doc = documents[docKey as keyof typeof documents];
    
    if (docKey === "cv" && candidate.cvUrl) {
      return "complete";
    }
    
    return doc?.status || "missing";
  };

  const getCandidateDocumentStats = (candidate: Candidate) => {
    let complete = 0;
    let pending = 0;
    let missing = 0;

    DOCUMENT_DEFINITIONS.forEach(doc => {
      const status = getDocumentStatus(candidate, doc.key);
      if (status === "complete") complete++;
      else if (status === "pending") pending++;
      else missing++;
    });

    return { complete, pending, missing, total: DOCUMENT_DEFINITIONS.length };
  };

  const getStageIndex = (stage: string): number => {
    const normalizedStage = (stage || '').toLowerCase();
    const index = PIPELINE_STAGES.findIndex(s => 
      s.key.toLowerCase() === normalizedStage || s.name.toLowerCase() === normalizedStage
    );
    return index === -1 ? 0 : index;
  };
  
  const getStageName = (stage: string): string => {
    const normalizedStage = (stage || '').toLowerCase();
    const found = PIPELINE_STAGES.find(s => 
      s.key.toLowerCase() === normalizedStage || s.name.toLowerCase() === normalizedStage
    );
    return found?.name || stage || 'Sourcing';
  };

  const allCandidateStats = pipelineCandidates.map(c => getCandidateDocumentStats(c));
  const totalDocsComplete = allCandidateStats.filter(s => s.missing === 0).length;
  const totalDocsPending = allCandidateStats.filter(s => s.pending > 0 && s.missing === 0).length;
  const totalDocsMissing = allCandidateStats.filter(s => s.missing > 0).length;

  const getStatusIcon = (status: DocumentStatus) => {
    switch (status) {
      case "complete":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "missing":
        return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusBadge = (status: DocumentStatus) => {
    const styles = {
      complete: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30",
      pending: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/30",
      missing: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30",
    };
    return styles[status];
  };

  return (
    <div className="min-h-screen bg-background">
      
      <main className="container mx-auto px-6 pt-24 pb-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Candidate Pipeline</h1>
          <p className="text-muted-foreground">Track shortlisted candidates and their document status</p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-card/50 border-border dark:border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">In Pipeline</p>
                  <p className="text-2xl font-bold">{pipelineCandidates.length}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <UserCheck className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border dark:border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Docs Complete</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {totalDocsComplete}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                  <FileCheck className="h-6 w-6 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border dark:border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Docs Pending</p>
                  <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                    {totalDocsPending}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-yellow-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border dark:border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Docs Missing</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {totalDocsMissing}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
                  <AlertCircle className="h-6 w-6 text-red-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Candidate Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {isLoading ? (
            <div className="col-span-2 text-center py-12 text-muted-foreground">
              Loading candidates...
            </div>
          ) : pipelineCandidates.length === 0 ? (
            <div className="col-span-2 text-center py-12">
              <UserCheck className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-lg font-medium text-muted-foreground">No shortlisted candidates yet</p>
              <p className="text-sm text-muted-foreground mt-2">Shortlist candidates from the candidates page</p>
            </div>
          ) : (
            pipelineCandidates.map((candidate, idx) => {
              const stats = getCandidateDocumentStats(candidate);
              const progressPercent = (stats.complete / stats.total) * 100;
              const stageIndex = getStageIndex(candidate.stage);

              return (
                <Card key={candidate.id} className="bg-card/50 border-border dark:border-white/10 hover:border-border hover:dark:border-white/20 transition-all">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12 border border-border dark:border-white/10">
                          <AvatarFallback className="bg-primary/20 text-primary text-sm font-semibold">
                            {candidate.fullName?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'NA'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-lg">{candidate.fullName}</CardTitle>
                          <CardDescription className="text-sm">{candidate.role || 'No role specified'}</CardDescription>
                        </div>
                      </div>
                      <Badge variant="outline" className={`${getStatusBadge(
                        progressPercent === 100 ? "complete" : 
                        stats.missing > 0 ? "missing" : "pending"
                      )}`}>
                        {Math.round(progressPercent)}% Complete
                      </Badge>
                    </div>
                    
                    {/* Contact Details - Prominently Displayed */}
                    <div className="mt-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                      <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-2 uppercase tracking-wide">Contact Details</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {candidate.email ? (
                          <a 
                            href={`mailto:${candidate.email}`} 
                            className="flex items-center gap-2 text-sm text-foreground hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                            data-testid={`email-${candidate.id}`}
                          >
                            <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                            <span className="truncate">{candidate.email}</span>
                          </a>
                        ) : (
                          <span className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Mail className="h-4 w-4 flex-shrink-0" />
                            No email provided
                          </span>
                        )}
                        {candidate.phone ? (
                          <a 
                            href={`tel:${candidate.phone}`} 
                            className="flex items-center gap-2 text-sm text-foreground hover:text-green-600 dark:hover:text-green-400 transition-colors"
                            data-testid={`phone-${candidate.id}`}
                          >
                            <Phone className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                            <span>{candidate.phone}</span>
                          </a>
                        ) : (
                          <span className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="h-4 w-4 flex-shrink-0" />
                            No phone provided
                          </span>
                        )}
                      </div>
                      {candidate.location && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                          <MapPin className="h-4 w-4 flex-shrink-0" />
                          <span>{candidate.location}</span>
                        </div>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Pipeline Progress */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-medium text-muted-foreground">PIPELINE STAGE</p>
                        <p className="text-xs text-primary">{candidate.stage}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        {PIPELINE_STAGES.map((stage, i) => (
                          <div key={i} className="flex items-center flex-1">
                            <div className={`h-2 rounded-full flex-1 transition-all ${
                              i <= stageIndex ? stage.color : 'bg-white/5'
                            }`} />
                            {i < PIPELINE_STAGES.length - 1 && (
                              <ArrowRight className={`h-3 w-3 mx-0.5 ${
                                i < stageIndex ? 'text-primary' : 'text-muted-foreground'
                              }`} />
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
                        {PIPELINE_STAGES.map((stage, i) => (
                          <span key={i} className={i <= stageIndex ? 'text-primary' : ''}>{stage.name}</span>
                        ))}
                      </div>
                    </div>

                    <Separator className="bg-white/10" />

                    {/* Documents Checklist */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-medium text-muted-foreground">REQUIRED DOCUMENTS</p>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-green-600 dark:text-green-400">{stats.complete} ✓</span>
                          <span className="text-yellow-600 dark:text-yellow-400">{stats.pending} ⏱</span>
                          <span className="text-red-600 dark:text-red-400">{stats.missing} ✗</span>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        {DOCUMENT_DEFINITIONS.map((doc, docIdx) => {
                          const status = getDocumentStatus(candidate, doc.key);
                          const Icon = doc.icon;
                          
                          return (
                            <div 
                              key={docIdx} 
                              className="flex items-center justify-between p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <Icon className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">{doc.name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                {getStatusIcon(status)}
                                {status === "complete" && (
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    className="h-6 px-2 text-xs"
                                    data-testid={`button-download-${doc.name.toLowerCase().replace(/\//g, '-')}-${candidate.id}`}
                                  >
                                    <Download className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Blockers Display */}
                    {candidateBlockers[candidate.id]?.length > 0 && (
                      <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                        <div className="flex items-center gap-2 mb-2">
                          <Ban className="h-4 w-4 text-red-600 dark:text-red-400" />
                          <p className="text-sm font-medium text-red-600 dark:text-red-400">Cannot Advance</p>
                        </div>
                        <ul className="space-y-1">
                          {candidateBlockers[candidate.id].map((blocker, i) => (
                            <li key={i} className="text-xs text-red-300 flex items-start gap-1">
                              <span className="text-red-600 dark:text-red-400 mt-0.5">•</span>
                              {blocker}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => handleSendReminder(candidate)}
                        disabled={sendingReminder === candidate.id}
                        data-testid={`button-remind-${candidate.id}`}
                      >
                        {sendingReminder === candidate.id ? (
                          <>
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Send className="h-3 w-3 mr-1" />
                            Send Reminder
                          </>
                        )}
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400 hover:bg-green-500/20"
                        onClick={() => handleOpenWhatsApp(candidate)}
                        disabled={openingWhatsApp === candidate.id}
                        data-testid={`button-whatsapp-${candidate.id}`}
                      >
                        {openingWhatsApp === candidate.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <MessageCircle className="h-3 w-3" />
                        )}
                      </Button>
                      <Button 
                        size="sm" 
                        className="flex-1 bg-teal-600 hover:bg-teal-700 !text-white"
                        onClick={() => handleViewProfile(candidate)}
                        data-testid={`button-view-profile-${candidate.id}`}
                      >
                        View Profile
                      </Button>
                    </div>

                    {/* Advance Stage Button */}
                    {getNextStage(candidate.stage || 'sourcing') && (
                      <Button 
                        size="sm" 
                        className="w-full bg-gradient-to-r from-blue-600 to-blue-600 hover:from-blue-500 hover:to-blue-500 mt-2 !text-white"
                        onClick={() => handleAdvanceStage(candidate)}
                        disabled={advancingCandidate === candidate.id}
                        data-testid={`button-advance-stage-${candidate.id}`}
                      >
                        {advancingCandidate === candidate.id ? (
                          <>
                            <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                            Advancing...
                          </>
                        ) : (
                          <>
                            <ChevronRight className="h-3 w-3 mr-2" />
                            Advance to {getStageName(getNextStage(candidate.stage || 'sourcing') || '')}
                          </>
                        )}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Profile Dialog */}
        <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" data-testid="dialog-candidate-profile">
            {selectedCandidate && (
              <>
                <DialogHeader>
                  <div className="flex items-start gap-4">
                    <Avatar className="h-16 w-16 border-2 border-primary/20" data-testid="avatar-candidate">
                      <AvatarFallback className="bg-primary/20 text-primary text-xl font-bold">
                        {selectedCandidate.fullName?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'NA'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <DialogTitle className="text-2xl" data-testid="text-candidate-name">{selectedCandidate.fullName}</DialogTitle>
                      <DialogDescription className="text-base mt-1" data-testid="text-candidate-role">
                        {selectedCandidate.role || 'No role specified'}
                      </DialogDescription>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        {selectedCandidate.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" /> {selectedCandidate.email}
                          </span>
                        )}
                        {selectedCandidate.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {selectedCandidate.phone}
                          </span>
                        )}
                      </div>
                    </div>
                    <Badge className={`${getStatusBadge(
                      getCandidateDocumentStats(selectedCandidate).missing === 0 ? "complete" : "missing"
                    )}`}>
                      {selectedCandidate.stage}
                    </Badge>
                  </div>
                </DialogHeader>

                <div className="grid gap-6 mt-4">
                  {/* Match Score */}
                  {selectedCandidate.aiScore !== null && selectedCandidate.aiScore !== undefined && (
                    <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-lg border border-primary/10" data-testid="section-match-score">
                      <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                        <Star className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-lg" data-testid="text-ai-score">{selectedCandidate.aiScore}% Match Score</p>
                        <p className="text-sm text-muted-foreground">AI-powered compatibility assessment</p>
                      </div>
                    </div>
                  )}

                  {/* Professional Summary */}
                  {(selectedCandidate.metadata as any)?.summary && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2">PROFESSIONAL SUMMARY</h4>
                      <p className="text-sm leading-relaxed">{(selectedCandidate.metadata as any).summary}</p>
                    </div>
                  )}

                  {/* Skills */}
                  {selectedCandidate.skills && selectedCandidate.skills.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2">SKILLS</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedCandidate.skills.map((skill, i) => (
                          <Badge key={i} variant="secondary" className="bg-white/5">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Experience */}
                  {(selectedCandidate.metadata as any)?.experience && Array.isArray((selectedCandidate.metadata as any).experience) && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2">EXPERIENCE</h4>
                      <div className="space-y-3">
                        {(selectedCandidate.metadata as any).experience.slice(0, 3).map((exp: any, i: number) => (
                          <div key={i} className="p-3 bg-white/5 rounded-lg">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-medium">{exp.title || exp.role}</p>
                                <p className="text-sm text-muted-foreground flex items-center gap-1">
                                  <Building2 className="h-3 w-3" /> {exp.company}
                                </p>
                              </div>
                              <span className="text-xs text-muted-foreground">{exp.duration || exp.period}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Education */}
                  {(selectedCandidate.metadata as any)?.education && Array.isArray((selectedCandidate.metadata as any).education) && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2">EDUCATION</h4>
                      <div className="space-y-2">
                        {(selectedCandidate.metadata as any).education.slice(0, 2).map((edu: any, i: number) => (
                          <div key={i} className="flex items-center gap-2 text-sm">
                            <GraduationCap className="h-4 w-4 text-muted-foreground" />
                            <span>{edu.degree || edu.qualification}</span>
                            {edu.institution && <span className="text-muted-foreground">- {edu.institution}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* AI Reasoning */}
                  {selectedCandidate.aiReasoning && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1">
                        <Brain className="h-4 w-4" /> AI ANALYSIS
                      </h4>
                      <p className="text-sm text-muted-foreground bg-white/5 p-3 rounded-lg">
                        {selectedCandidate.aiReasoning}
                      </p>
                    </div>
                  )}

                  {/* Document Status in Dialog */}
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">DOCUMENT STATUS</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {DOCUMENT_DEFINITIONS.map((doc, docIdx) => {
                        const status = getDocumentStatus(selectedCandidate, doc.key);
                        const Icon = doc.icon;
                        return (
                          <div 
                            key={docIdx} 
                            className="flex items-center justify-between p-2 rounded-lg bg-white/5"
                          >
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">{doc.name}</span>
                            </div>
                            {getStatusIcon(status)}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Dialog Actions */}
                <div className="flex gap-3 mt-6 pt-4 border-t border-border dark:border-white/10">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => handleSendReminder(selectedCandidate)}
                    disabled={sendingReminder === selectedCandidate.id}
                    data-testid="button-dialog-send-reminder"
                  >
                    {sendingReminder === selectedCandidate.id ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending...</>
                    ) : (
                      <><Send className="h-4 w-4 mr-2" /> Send Reminder</>
                    )}
                  </Button>
                  <Link href={`/candidates/${selectedCandidate.id}`}>
                    <Button className="bg-primary text-white" data-testid="button-full-profile">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Full Profile
                    </Button>
                  </Link>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
