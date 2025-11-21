import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  ShieldCheck, 
  FileSignature, 
  Fingerprint, 
  Search, 
  AlertTriangle,
  CheckCircle2, 
  Loader2, 
  Lock,
  Scale,
  FileText,
  Users,
  Clock,
  XCircle,
  Play,
  User
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { candidateService, integrityChecksService } from "@/lib/api";
import type { Candidate, IntegrityCheck } from "@shared/schema";
import { format } from "date-fns";
import { toast } from "sonner";

const checkTypes = [
  { value: "criminal", label: "Criminal Record Check", icon: Scale },
  { value: "credit", label: "Credit Bureau Check", icon: FileText },
  { value: "education", label: "Education Verification", icon: FileSignature },
  { value: "employment", label: "Employment History", icon: Users },
  { value: "biometric", label: "Biometric Verification", icon: Fingerprint },
  { value: "reference", label: "Reference Checks", icon: Search },
];

export default function IntegrityAgent() {
  const queryClient = useQueryClient();
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>("");
  const [selectedCheckType, setSelectedCheckType] = useState<string>("");

  const { data: candidates = [], isLoading: loadingCandidates } = useQuery({
    queryKey: ["candidates"],
    queryFn: candidateService.getAll,
  });

  const { data: allChecks = [], isLoading: loadingChecks } = useQuery({
    queryKey: ["integrity-checks"],
    queryFn: integrityChecksService.getAll,
  });

  const { data: candidateChecks = [] } = useQuery({
    queryKey: ["integrity-checks", selectedCandidateId],
    queryFn: () => integrityChecksService.getByCandidateId(selectedCandidateId),
    enabled: !!selectedCandidateId,
  });

  const initiateCheckMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCandidateId || !selectedCheckType) {
        throw new Error("Please select both a candidate and check type");
      }
      
      return integrityChecksService.create({
        candidateId: selectedCandidateId,
        checkType: selectedCheckType,
        status: "Pending",
        findings: {
          initiated: new Date().toISOString(),
          checkType: selectedCheckType,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrity-checks"] });
      toast.success("Integrity check initiated successfully");
      setSelectedCheckType("");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to initiate check");
    },
  });

  const simulateCheckMutation = useMutation({
    mutationFn: async (checkId: string) => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const mockResults = {
        criminal: { status: "Completed", result: "Clear", riskScore: 0, findings: { recordStatus: "No criminal record found", lastChecked: new Date().toISOString() } },
        credit: { status: "Completed", result: "Flagged", riskScore: 25, findings: { score: 650, flags: ["Minor default in 2022"], lastChecked: new Date().toISOString() } },
        education: { status: "Completed", result: "Verified", riskScore: 0, findings: { degree: "BSc Computer Science", institution: "University of Cape Town", year: 2018 } },
        employment: { status: "Completed", result: "Verified", riskScore: 5, findings: { verified: 3, unverified: 1, discrepancies: "Minor date mismatch" } },
        biometric: { status: "Completed", result: "Verified", riskScore: 0, findings: { matchScore: 99.9, verified: true, timestamp: new Date().toISOString() } },
        reference: { status: "Completed", result: "Verified", riskScore: 10, findings: { contactedReferences: 3, positive: 2, neutral: 1 } },
      };

      const check = allChecks.find(c => c.id === checkId);
      if (!check) throw new Error("Check not found");

      const result = mockResults[check.checkType as keyof typeof mockResults] || mockResults.criminal;
      
      return integrityChecksService.update(checkId, {
        ...result,
        completedAt: new Date(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrity-checks"] });
      toast.success("Check completed successfully");
    },
    onError: () => {
      toast.error("Failed to complete check");
    },
  });

  const selectedCandidate = candidates.find(c => c.id === selectedCandidateId);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Completed": return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case "Pending": return <Clock className="w-4 h-4 text-yellow-500" />;
      case "Failed": return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
    }
  };

  const getResultBadge = (result: string | null) => {
    if (!result) return null;
    
    const variants: Record<string, { bg: string; text: string }> = {
      Clear: { bg: "bg-green-500/10", text: "text-green-500" },
      Verified: { bg: "bg-green-500/10", text: "text-green-500" },
      Flagged: { bg: "bg-yellow-500/10", text: "text-yellow-500" },
      Failed: { bg: "bg-red-500/10", text: "text-red-500" },
    };
    
    const variant = variants[result] || { bg: "bg-gray-500/10", text: "text-gray-500" };
    
    return (
      <Badge className={`${variant.bg} ${variant.text} border-0`}>
        {result}
      </Badge>
    );
  };

  const getRiskScoreColor = (score: number | null) => {
    if (score === null || score === undefined) return "text-gray-500";
    if (score === 0) return "text-green-500";
    if (score < 30) return "text-yellow-500";
    if (score < 70) return "text-orange-500";
    return "text-red-500";
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />
      
      <div className="flex-1 pt-20 container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-primary" />
            Integrity Evaluation Agent
          </h1>
          <p className="text-muted-foreground mt-2">
            Automated background checks, biometric processing, and risk assessments
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Candidate Selection & Initiate Checks */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="bg-card/30 border-white/10 backdrop-blur-sm" data-testid="card-candidate-selection">
              <CardHeader>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" /> 
                  Select Candidate
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-2 block">Candidate</label>
                  <Select value={selectedCandidateId} onValueChange={setSelectedCandidateId}>
                    <SelectTrigger className="bg-white/5 border-white/10" data-testid="select-candidate">
                      <SelectValue placeholder="Choose a candidate..." />
                    </SelectTrigger>
                    <SelectContent>
                      {loadingCandidates ? (
                        <SelectItem value="loading" disabled>Loading...</SelectItem>
                      ) : candidates.length === 0 ? (
                        <SelectItem value="empty" disabled>No candidates found</SelectItem>
                      ) : (
                        candidates.map(candidate => (
                          <SelectItem key={candidate.id} value={candidate.id} data-testid={`option-candidate-${candidate.id}`}>
                            {candidate.fullName} - {candidate.role || "N/A"}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {selectedCandidate && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-lg bg-white/5 border border-white/10"
                    data-testid="card-selected-candidate"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <User className="w-4 h-4 text-primary" />
                      <span className="font-semibold text-sm">{selectedCandidate.fullName}</span>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div>Email: {selectedCandidate.email || "N/A"}</div>
                      <div>Phone: {selectedCandidate.phone || "N/A"}</div>
                      <div>Stage: <Badge variant="outline" className="text-[10px]">{selectedCandidate.stage}</Badge></div>
                    </div>
                  </motion.div>
                )}

                <div>
                  <label className="text-xs text-muted-foreground mb-2 block">Check Type</label>
                  <Select value={selectedCheckType} onValueChange={setSelectedCheckType} disabled={!selectedCandidateId}>
                    <SelectTrigger className="bg-white/5 border-white/10" data-testid="select-check-type">
                      <SelectValue placeholder="Select check type..." />
                    </SelectTrigger>
                    <SelectContent>
                      {checkTypes.map(type => {
                        const Icon = type.icon;
                        return (
                          <SelectItem key={type.value} value={type.value} data-testid={`option-check-${type.value}`}>
                            <div className="flex items-center gap-2">
                              <Icon className="w-3 h-3" />
                              {type.label}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  onClick={() => initiateCheckMutation.mutate()}
                  disabled={!selectedCandidateId || !selectedCheckType || initiateCheckMutation.isPending}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                  data-testid="button-initiate-check"
                >
                  {initiateCheckMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Initiating...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Initiate Check
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-card/30 border-white/10 backdrop-blur-sm" data-testid="card-stats">
              <CardHeader>
                <CardTitle className="text-sm font-bold">Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                  <div>
                    <div className="text-xs text-muted-foreground">Total Checks</div>
                    <div className="text-2xl font-bold" data-testid="text-total-checks">{allChecks.length}</div>
                  </div>
                  <ShieldCheck className="w-8 h-8 text-primary opacity-50" />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                  <div>
                    <div className="text-xs text-muted-foreground">Pending</div>
                    <div className="text-2xl font-bold text-yellow-500" data-testid="text-pending-checks">
                      {allChecks.filter(c => c.status === "Pending").length}
                    </div>
                  </div>
                  <Clock className="w-8 h-8 text-yellow-500 opacity-50" />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                  <div>
                    <div className="text-xs text-muted-foreground">Completed</div>
                    <div className="text-2xl font-bold text-green-500" data-testid="text-completed-checks">
                      {allChecks.filter(c => c.status === "Completed").length}
                    </div>
                  </div>
                  <CheckCircle2 className="w-8 h-8 text-green-500 opacity-50" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Candidate Checks & Details */}
          <div className="lg:col-span-2 space-y-6">
            {selectedCandidateId ? (
              <Card className="bg-card/30 border-white/10 backdrop-blur-sm" data-testid="card-candidate-checks">
                <CardHeader>
                  <CardTitle className="text-sm font-bold flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-primary" />
                      Checks for {selectedCandidate?.fullName}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {candidateChecks.length} {candidateChecks.length === 1 ? 'check' : 'checks'}
                    </Badge>
                  </CardTitle>
                  <CardDescription>Background verification history and results</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px] pr-4">
                    {candidateChecks.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground" data-testid="text-no-checks">
                        <Lock className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p>No integrity checks initiated for this candidate</p>
                        <p className="text-sm mt-2">Select a check type above to begin</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <AnimatePresence>
                          {candidateChecks.map((check, index) => {
                            const checkTypeInfo = checkTypes.find(t => t.value === check.checkType);
                            const Icon = checkTypeInfo?.icon || FileText;
                            
                            return (
                              <motion.div
                                key={check.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                data-testid={`card-check-${check.id}`}
                              >
                                <Card className="bg-white/5 border-white/10 hover:border-white/20 transition-colors">
                                  <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between">
                                      <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                          <Icon className="w-5 h-5 text-primary" />
                                        </div>
                                        <div>
                                          <CardTitle className="text-sm">
                                            {checkTypeInfo?.label || check.checkType}
                                          </CardTitle>
                                          <CardDescription className="text-xs mt-1">
                                            {format(new Date(check.createdAt), "MMM dd, yyyy 'at' HH:mm")}
                                          </CardDescription>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {getStatusIcon(check.status)}
                                        {getResultBadge(check.result)}
                                      </div>
                                    </div>
                                  </CardHeader>
                                  <CardContent className="space-y-3">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2 text-xs">
                                        <span className="text-muted-foreground">Status:</span>
                                        <Badge variant="outline" className="text-[10px]" data-testid={`badge-status-${check.id}`}>
                                          {check.status}
                                        </Badge>
                                      </div>
                                      {check.riskScore !== null && check.riskScore !== undefined && (
                                        <div className="flex items-center gap-2 text-xs">
                                          <span className="text-muted-foreground">Risk Score:</span>
                                          <span className={`font-bold ${getRiskScoreColor(check.riskScore)}`} data-testid={`text-risk-${check.id}`}>
                                            {check.riskScore}%
                                          </span>
                                        </div>
                                      )}
                                    </div>

                                    {check.findings && (
                                      <div className="p-3 rounded-lg bg-black/20 border border-white/5" data-testid={`card-findings-${check.id}`}>
                                        <div className="text-xs font-semibold text-primary mb-2">Findings:</div>
                                        <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
                                          {JSON.stringify(check.findings, null, 2)}
                                        </pre>
                                      </div>
                                    )}

                                    {check.status === "Pending" && (
                                      <Button
                                        onClick={() => simulateCheckMutation.mutate(check.id)}
                                        disabled={simulateCheckMutation.isPending}
                                        size="sm"
                                        variant="outline"
                                        className="w-full text-xs"
                                        data-testid={`button-simulate-${check.id}`}
                                      >
                                        {simulateCheckMutation.isPending ? (
                                          <>
                                            <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                                            Processing...
                                          </>
                                        ) : (
                                          <>
                                            <Play className="w-3 h-3 mr-2" />
                                            Simulate Check Completion
                                          </>
                                        )}
                                      </Button>
                                    )}

                                    {check.completedAt && (
                                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                                        <CheckCircle2 className="w-3 h-3" />
                                        Completed: {format(new Date(check.completedAt), "MMM dd, yyyy 'at' HH:mm")}
                                      </div>
                                    )}
                                  </CardContent>
                                </Card>
                              </motion.div>
                            );
                          })}
                        </AnimatePresence>
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-card/30 border-white/10 backdrop-blur-sm" data-testid="card-placeholder">
                <CardContent className="py-24 text-center">
                  <ShieldCheck className="w-16 h-16 mx-auto mb-4 opacity-20" />
                  <h3 className="text-lg font-semibold mb-2">No Candidate Selected</h3>
                  <p className="text-sm text-muted-foreground">
                    Select a candidate from the left panel to view their integrity checks
                  </p>
                </CardContent>
              </Card>
            )}

            {/* All Recent Checks */}
            <Card className="bg-card/30 border-white/10 backdrop-blur-sm" data-testid="card-all-checks">
              <CardHeader>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  All Recent Checks
                </CardTitle>
                <CardDescription>System-wide integrity evaluation activity</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px] pr-4">
                  {loadingChecks ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                  ) : allChecks.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground" data-testid="text-no-system-checks">
                      <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-20" />
                      <p>No integrity checks in the system</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {allChecks.slice(0, 10).map(check => {
                        const candidate = candidates.find(c => c.id === check.candidateId);
                        const checkTypeInfo = checkTypes.find(t => t.value === check.checkType);
                        const Icon = checkTypeInfo?.icon || FileText;
                        
                        return (
                          <div
                            key={check.id}
                            className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer border border-white/5"
                            onClick={() => setSelectedCandidateId(check.candidateId)}
                            data-testid={`row-check-${check.id}`}
                          >
                            <div className="flex items-center gap-3">
                              <Icon className="w-4 h-4 text-primary" />
                              <div>
                                <div className="text-sm font-medium">{candidate?.fullName || "Unknown"}</div>
                                <div className="text-xs text-muted-foreground">{checkTypeInfo?.label || check.checkType}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {check.result && getResultBadge(check.result)}
                              {getStatusIcon(check.status)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </div>
  );
}
