import { useState, useCallback, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTenantQueryKey } from "@/hooks/useTenant";
import { offersService, candidateService, jobsService, api } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  FileText,
  Send,
  User,
  Calendar,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  Briefcase,
  Shield,
  Table,
  Eye,
  Download,
  FileDown,
  Settings2,
  X,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";
import { renderAsync } from "docx-preview";

const CONTRACT_TYPES = [
  { value: "offer_letter", label: "Standard Offer Letter" },
  { value: "employment_contract", label: "Employment Contract" },
  { value: "executive_offer", label: "Executive Offer Package" },
  { value: "nda", label: "Non-Disclosure Agreement" },
];

const FORM_STATE_KEY = "offer_form_draft";

function getSavedFormState() {
  try {
    const raw = sessionStorage.getItem(FORM_STATE_KEY);
    if (raw) {
      sessionStorage.removeItem(FORM_STATE_KEY);
      return JSON.parse(raw);
    }
  } catch {}
  return null;
}

export default function OfferManagement() {
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const offersKey = useTenantQueryKey(["offers"]);
  const candidatesKey = useTenantQueryKey(["candidates"]);
  const jobsKey = useTenantQueryKey(["jobs"]);

  const saved = useRef(getSavedFormState());

  // Restore scroll position when returning from Offer Setup
  useEffect(() => {
    if (saved.current) {
      const scrollY = saved.current.scrollY;
      if (scrollY != null) {
        // Wait for DOM to settle, then smooth-scroll to saved position
        setTimeout(() => {
          window.scrollTo({ top: scrollY, behavior: "smooth" });
        }, 400);
      }
    }
  }, []);

  const [selectedCandidate, setSelectedCandidate] = useState<string>(saved.current?.selectedCandidate || "");
  const [selectedJob, setSelectedJob] = useState<string>(saved.current?.selectedJob || "");
  const [salaryAmount, setSalaryAmount] = useState(saved.current?.salaryAmount || "");
  const [startDate, setStartDate] = useState(saved.current?.startDate || "");
  const [additionalBenefits, setAdditionalBenefits] = useState(saved.current?.additionalBenefits || "");
  const [contractType, setContractType] = useState<string>(saved.current?.contractType || "");
  const [isSending, setIsSending] = useState(false);
  const [respondingOfferId, setRespondingOfferId] = useState<string | null>(null);

  // Document preview state
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [previewFilename, setPreviewFilename] = useState<string>("");
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [previewReviewed, setPreviewReviewed] = useState(false);

  // DOCX preview dialog state
  const [showDocxPreview, setShowDocxPreview] = useState(false);
  const docxContainerRef = useRef<HTMLDivElement | null>(null);

  // Offer document viewer state (for Recent Offers table)
  const [showOfferDocPreview, setShowOfferDocPreview] = useState(false);
  const [offerDocBlob, setOfferDocBlob] = useState<Blob | null>(null);
  const [offerDocFilename, setOfferDocFilename] = useState("");
  const [offerDocUrl, setOfferDocUrl] = useState<string | null>(null);
  const [isLoadingOfferDoc, setIsLoadingOfferDoc] = useState<string | null>(null);
  const offerDocContainerRef = useRef<HTMLDivElement | null>(null);

  const { data: allOffers = [], isLoading: offersLoading } = useQuery({
    queryKey: offersKey,
    queryFn: offersService.getAll,
  });

  const { data: allCandidates = [] } = useQuery({
    queryKey: candidatesKey,
    queryFn: candidateService.getAll,
  });

  const { data: allJobs = [] } = useQuery({
    queryKey: jobsKey,
    queryFn: jobsService.getAll,
  });

  const templatesKey = useTenantQueryKey(["document-templates"]);
  const { data: allTemplates = [] } = useQuery({
    queryKey: templatesKey,
    queryFn: async () => {
      const response = await api.get("/document-templates");
      return response.data;
    },
  });

  // Filter candidates eligible for offers (at interviewing/shortlisted stage, or those without active offers)
  const activeOfferCandidateIds = new Set(
    allOffers
      .filter((o: any) => ["draft", "sent"].includes(o.status))
      .map((o: any) => o.candidateId)
  );
  const eligibleCandidates = allCandidates.filter(
    (c: any) => {
      const stage = (c.stage || "").toLowerCase();
      return (
        !activeOfferCandidateIds.has(c.id) &&
        ["interviewing", "interview", "shortlisted", "offer_pending", "offer", "withdrawn"].includes(stage)
      );
    }
  );

  // Cleanup Object URLs on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // Clear preview when form fields change
  const clearPreview = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setPreviewBlob(null);
    setPreviewFilename("");
    setPreviewReviewed(false);
  }, [previewUrl]);

  const handleCandidateChange = (val: string) => { setSelectedCandidate(val); clearPreview(); };
  const handleJobChange = (val: string) => { setSelectedJob(val); clearPreview(); };
  const handleSalaryChange = (e: React.ChangeEvent<HTMLInputElement>) => { setSalaryAmount(e.target.value); clearPreview(); };
  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => { setStartDate(e.target.value); clearPreview(); };
  const handleContractTypeChange = (val: string) => { setContractType(val); clearPreview(); };

  const canGeneratePreview = selectedCandidate && contractType && salaryAmount && startDate;

  const handleGeneratePreview = async () => {
    if (!canGeneratePreview) return;

    setIsGeneratingPreview(true);
    clearPreview();
    try {
      const benefits = additionalBenefits
        ? additionalBenefits.split(",").map((b) => b.trim()).filter(Boolean)
        : undefined;

      const { blob, filename } = await offersService.generateDocumentPreview({
        candidateId: selectedCandidate,
        jobId: selectedJob || undefined,
        contractType,
        salary: salaryAmount,
        startDate,
        benefits,
      });

      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      setPreviewBlob(blob);
      setPreviewFilename(filename);

      toast({ title: "Preview Generated", description: "Word document is ready. Review and download below before sending." });
    } catch (error) {
      toast({
        title: "Preview Failed",
        description: error instanceof Error ? error.message : "Failed to generate document preview.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  const handleDownloadPreview = () => {
    if (!previewUrl) return;
    setPreviewReviewed(true);
    const a = document.createElement("a");
    a.href = previewUrl;
    a.download = previewFilename || "document-preview.docx";
    a.click();
  };

  // Callback ref: render DOCX when the container DOM node mounts
  const docxPreviewRefCallback = useCallback(
    (node: HTMLDivElement | null) => {
      docxContainerRef.current = node;
      if (node && previewBlob) {
        node.innerHTML = '<p class="text-center text-muted-foreground py-8">Rendering document...</p>';
        renderAsync(previewBlob, node, undefined, {
          className: "docx-preview",
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
          ignoreFonts: false,
          breakPages: true,
        }).catch((err) => {
          console.error("DOCX preview render error:", err);
          if (node) {
            node.innerHTML = '<p class="text-center text-muted-foreground py-8">Failed to render document preview.</p>';
          }
        });
      }
    },
    [previewBlob]
  );

  // View offer document from Recent Offers table
  const handleViewOfferDoc = async (offer: any) => {
    if (!offer.documentPath) return;
    setIsLoadingOfferDoc(offer.id);
    try {
      const response = await fetch(offer.documentPath);
      const blob = await response.blob();
      const filename = offer.documentPath.split("/").pop() || "offer-document.docx";
      setOfferDocBlob(blob);
      setOfferDocFilename(filename);
      setOfferDocUrl(offer.documentPath);
      setShowOfferDocPreview(true);
    } catch (err) {
      toast({ title: "Error", description: "Failed to load document.", variant: "destructive" });
    } finally {
      setIsLoadingOfferDoc(null);
    }
  };

  const handleDownloadOfferDoc = () => {
    if (!offerDocUrl) return;
    const a = document.createElement("a");
    a.href = offerDocUrl;
    a.download = offerDocFilename || "offer-document.docx";
    a.click();
  };

  // Callback ref for offer doc preview dialog
  const offerDocPreviewRefCallback = useCallback(
    (node: HTMLDivElement | null) => {
      offerDocContainerRef.current = node;
      if (node && offerDocBlob) {
        node.innerHTML = '<p class="text-center text-muted-foreground py-8">Rendering document...</p>';
        renderAsync(offerDocBlob, node, undefined, {
          className: "docx-preview",
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
          ignoreFonts: false,
          breakPages: true,
        }).catch((err) => {
          console.error("DOCX preview render error:", err);
          if (node) {
            node.innerHTML = '<p class="text-center text-muted-foreground py-8">Failed to render document preview.</p>';
          }
        });
      }
    },
    [offerDocBlob]
  );

  const respondMutation = useMutation({
    mutationFn: ({ id, response }: { id: string; response: "accepted" | "declined" }) => {
      setRespondingOfferId(id);
      return offersService.respond(id, response);
    },
    onSuccess: (_data, variables) => {
      setRespondingOfferId(null);
      queryClient.invalidateQueries({ queryKey: offersKey });
      queryClient.invalidateQueries({ queryKey: candidatesKey });
      toast({
        title: variables.response === "accepted" ? "Offer Accepted" : "Offer Declined",
        description: variables.response === "accepted"
          ? "Candidate accepted. Integrity checks will be auto-launched."
          : "Candidate declined. They have been moved to withdrawn.",
      });
    },
    onError: () => {
      setRespondingOfferId(null);
      toast({ title: "Error", description: "Failed to process response.", variant: "destructive" });
    },
  });

  const handleSendOffer = async () => {
    if (!selectedCandidate || !salaryAmount || !startDate || !contractType) {
      toast({
        title: "Missing Information",
        description: "Please select a candidate and fill in contract type, salary, and start date.",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    try {
      const benefits = additionalBenefits
        ? additionalBenefits.split(",").map((b) => b.trim()).filter(Boolean)
        : [];

      const offer = await offersService.create({
        candidateId: selectedCandidate,
        jobId: selectedJob || undefined,
        salary: salaryAmount,
        startDate,
        benefits: benefits.length > 0 ? benefits : undefined,
        contractType: contractType || undefined,
      });

      let result;
      try {
        result = await offersService.send(offer.id);
      } catch (sendError) {
        // Rollback: delete the orphaned draft so the candidate stays eligible for retry
        try { await api.delete(`/offers/${offer.id}`); } catch {}
        throw sendError;
      }

      queryClient.invalidateQueries({ queryKey: offersKey });
      queryClient.invalidateQueries({ queryKey: candidatesKey });

      toast({
        title: "Offer Sent",
        description: result.emailSent
          ? "Offer created and email sent to candidate."
          : "Offer created and marked as sent (no email on file).",
      });

      clearPreview();
      setSelectedCandidate("");
      setSelectedJob("");
      setSalaryAmount("");
      setStartDate("");
      setAdditionalBenefits("");
      setContractType("");
    } catch (error) {
      toast({
        title: "Failed to Send Offer",
        description: error instanceof Error ? error.message : "An error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge className="bg-gray-500/20 text-gray-600 dark:text-gray-400 border-0"><Clock className="h-3 w-3 mr-1" />Draft</Badge>;
      case "sent":
        return <Badge className="bg-blue-500/20 text-blue-600 dark:text-blue-400 border-0"><Send className="h-3 w-3 mr-1" />Sent</Badge>;
      case "accepted":
        return <Badge className="bg-green-500/20 text-green-600 dark:text-green-400 border-0"><CheckCircle2 className="h-3 w-3 mr-1" />Accepted</Badge>;
      case "declined":
        return <Badge className="bg-red-500/20 text-red-600 dark:text-red-400 border-0"><XCircle className="h-3 w-3 mr-1" />Declined</Badge>;
      case "expired":
        return <Badge className="bg-amber-500/20 text-amber-600 dark:text-amber-400 border-0"><Clock className="h-3 w-3 mr-1" />Expired</Badge>;
      case "withdrawn":
        return <Badge className="bg-gray-500/20 text-gray-600 dark:text-gray-400 border-0"><XCircle className="h-3 w-3 mr-1" />Withdrawn</Badge>;
      default:
        return <Badge className="bg-gray-500/20 text-gray-600 dark:text-gray-400 border-0">{status}</Badge>;
    }
  };

  const getCandidateName = (offer: any) => {
    if (offer.candidateName) return offer.candidateName;
    const candidate = allCandidates.find((c: any) => c.id === offer.candidateId);
    return candidate?.fullName || "Unknown Candidate";
  };

  const getJobTitle = (offer: any) => {
    if (offer.jobId) {
      const job = allJobs.find((j: any) => j.id === offer.jobId);
      if (job) return job.title;
    }
    const candidate = allCandidates.find((c: any) => c.id === offer.candidateId);
    return candidate?.role || "Position";
  };

  const handleGoToSetup = () => {
    sessionStorage.setItem(FORM_STATE_KEY, JSON.stringify({
      selectedCandidate, selectedJob, salaryAmount, startDate, additionalBenefits, contractType,
      scrollY: window.scrollY,
    }));
    navigate("/offer-setup");
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <FileText className="h-8 w-8 text-[#FFCB00]" />
            Offer Management
          </h1>
          <p className="text-muted-foreground mt-2">
            Create and send offer letters to successful candidates
          </p>
        </div>
        <Button variant="outline" onClick={handleGoToSetup}>
          <Settings2 className="h-4 w-4 mr-2" />
          Manage Templates
        </Button>
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-[#FFCB00]" />
            Send New Offer
          </CardTitle>
          <CardDescription>Create and send an offer letter to a candidate</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Select Candidate *</Label>
              <Select value={selectedCandidate} onValueChange={handleCandidateChange}>
                <SelectTrigger data-testid="select-candidate">
                  <SelectValue placeholder="Choose a candidate" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {eligibleCandidates.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground">
                      No eligible candidates at interviewing/shortlisted stage
                    </div>
                  ) : (
                    eligibleCandidates.map((candidate: any) => (
                      <SelectItem key={candidate.id} value={candidate.id}>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          {candidate.fullName} - {candidate.role || "No role"}
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Select Job</Label>
              <Select value={selectedJob} onValueChange={handleJobChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Link to a job (optional)" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {allJobs.map((job: any) => (
                    <SelectItem key={job.id} value={job.id}>
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4" />
                        {job.title}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Salary Package (Monthly) *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">R</span>
                <Input
                  type="text"
                  value={salaryAmount}
                  onChange={handleSalaryChange}
                  placeholder="e.g., 45,000"
                  className="pl-10"
                  data-testid="input-salary"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Proposed Start Date *</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={startDate}
                  onChange={handleStartDateChange}
                  className="pl-10"
                  data-testid="input-start-date"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Contract Type *</Label>
              <Select value={contractType} onValueChange={handleContractTypeChange}>
                <SelectTrigger data-testid="select-contract-type">
                  <SelectValue placeholder="Select contract type" />
                </SelectTrigger>
                <SelectContent>
                  {CONTRACT_TYPES.map((type) => {
                    const tmpl = allTemplates.find((t: any) => t.templateType === type.value && t.isActive);
                    return (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          <span>{type.label}</span>
                          {tmpl && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700 ml-1">
                              Template
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {contractType && (() => {
                const tmpl = allTemplates.find((t: any) => t.templateType === contractType && t.isActive);
                return tmpl ? (
                  <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Custom template: <span className="font-medium">{tmpl.name}</span>
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    AI will generate using default style
                  </p>
                );
              })()}
            </div>

            <div className="space-y-2">
              <Label>Additional Benefits</Label>
              <Input
                value={additionalBenefits}
                onChange={(e) => { setAdditionalBenefits(e.target.value); clearPreview(); }}
                placeholder="Medical aid, Pension, Travel allowance..."
                data-testid="input-benefits"
              />
              <p className="text-xs text-muted-foreground">Comma-separated list</p>
            </div>
          </div>

          {/* Document Preview + Actions */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={handleGeneratePreview}
                disabled={!canGeneratePreview || isGeneratingPreview}
                className="border-blue-300 text-[#FFCB00] hover:bg-[#FFCB00]/10"
              >
                {isGeneratingPreview ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FileDown className="h-4 w-4 mr-2" />
                    Generate Preview
                  </>
                )}
              </Button>
              {!canGeneratePreview && !previewUrl && (
                <span className="text-xs text-muted-foreground">
                  Fill in candidate, contract type, salary, and start date
                </span>
              )}
              {previewUrl && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 text-sm text-[#FFCB00]">
                    <FileText className="h-4 w-4" />
                    <span className="font-medium">{previewFilename}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setShowDocxPreview(true); setPreviewReviewed(true); }}
                    className="h-7 text-xs"
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    View
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleDownloadPreview}
                    className="h-7 text-xs"
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Download
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={clearPreview}
                    className="h-7 w-7 p-0 text-muted-foreground"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>

            <Button
              className="bg-green-600 hover:bg-green-700 px-8"
              onClick={handleSendOffer}
              disabled={isSending || !selectedCandidate || !salaryAmount || !startDate || !previewUrl || !previewReviewed}
              data-testid="button-send-offer"
            >
              {isSending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Offer
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Offers Table */}
      <Card className="mt-6 bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Table className="h-5 w-5 text-[#FFCB00]" />
            Recent Offers
          </CardTitle>
          <CardDescription>Track the status of sent offer letters</CardDescription>
        </CardHeader>
        <CardContent>
          {offersLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : allOffers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p>No offers yet. Send your first offer from the form above.</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 border-b">
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Candidate</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Position</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Salary</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Sent</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allOffers.map((offer: any) => (
                      <tr key={offer.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-[#0A0A0A] flex items-center justify-center shrink-0">
                              <User className="h-4 w-4 text-white" />
                            </div>
                            <span className="font-medium">{getCandidateName(offer)}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">{getJobTitle(offer)}</td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {offer.salary ? `${offer.currency || "ZAR"} ${String(offer.salary).replace(/^R\s*/i, "")}/mo` : "-"}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {offer.sentAt ? new Date(offer.sentAt).toLocaleDateString() : "-"}
                        </td>
                        <td className="py-3 px-4">{getStatusBadge(offer.status)}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {offer.documentPath && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 w-7 p-0"
                                  title="View Document"
                                  onClick={() => handleViewOfferDoc(offer)}
                                  disabled={isLoadingOfferDoc === offer.id}
                                >
                                  {isLoadingOfferDoc === offer.id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Eye className="h-3.5 w-3.5" />
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 w-7 p-0"
                                  title="Download Document"
                                  onClick={() => {
                                    const a = document.createElement("a");
                                    a.href = offer.documentPath;
                                    a.download = offer.documentPath.split("/").pop() || "offer-document.docx";
                                    a.click();
                                  }}
                                >
                                  <Download className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            )}
                            {offer.status === "sent" && (
                              <>
                                <Button
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700 h-7 text-xs"
                                  onClick={() => respondMutation.mutate({ id: offer.id, response: "accepted" })}
                                  disabled={respondingOfferId === offer.id}
                                >
                                  {respondingOfferId === offer.id ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
                                  Accept
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-950 h-7 text-xs"
                                  onClick={() => respondMutation.mutate({ id: offer.id, response: "declined" })}
                                  disabled={respondingOfferId === offer.id}
                                >
                                  {respondingOfferId === offer.id ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <XCircle className="h-3 w-3 mr-1" />}
                                  Decline
                                </Button>
                              </>
                            )}
                            {offer.status === "accepted" && (
                              <Link href={`/integrity-agent?candidateId=${offer.candidateId}`}>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-amber-300 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950 h-7 text-xs"
                                >
                                  <Shield className="h-3 w-3 mr-1" />
                                  Start Integrity Check
                                </Button>
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* DOCX Preview Dialog */}
      <Dialog open={showDocxPreview} onOpenChange={setShowDocxPreview}>
        <DialogContent className="max-w-4xl h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Document Preview — {previewFilename}
            </DialogTitle>
          </DialogHeader>
          <div className="flex justify-end pb-2">
            <Button size="sm" variant="outline" onClick={handleDownloadPreview}>
              <Download className="h-3.5 w-3.5 mr-1" />
              Download
            </Button>
          </div>
          <div
            ref={docxPreviewRefCallback}
            className="flex-1 overflow-auto border rounded-lg bg-white"
            style={{ minHeight: 0 }}
          />
        </DialogContent>
      </Dialog>
      {/* Offer Document Viewer Dialog */}
      <Dialog open={showOfferDocPreview} onOpenChange={setShowOfferDocPreview}>
        <DialogContent className="max-w-4xl h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Offer Document — {offerDocFilename}
            </DialogTitle>
          </DialogHeader>
          <div className="flex justify-end pb-2">
            <Button size="sm" variant="outline" onClick={handleDownloadOfferDoc}>
              <Download className="h-3.5 w-3.5 mr-1" />
              Download
            </Button>
          </div>
          <div
            ref={offerDocPreviewRefCallback}
            className="flex-1 overflow-auto border rounded-lg bg-white"
            style={{ minHeight: 0 }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
