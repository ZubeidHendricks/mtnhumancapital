import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTenantQueryKey } from "@/hooks/useTenant";
import { offersService, candidateService, jobsService } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  FileText,
  Download,
  Send,
  User,
  Calendar,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  Sparkles,
  Briefcase,
  Paperclip,
  X
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface DocFormData {
  fullName: string;
  jobTitle: string;
  startDate: string;
  salary: string;
  email: string;
}

const defaultDocForm: DocFormData = {
  fullName: "",
  jobTitle: "",
  startDate: new Date().toISOString().split('T')[0],
  salary: "",
  email: "",
};

export default function OfferManagement() {
  const queryClient = useQueryClient();
  const offersKey = useTenantQueryKey(["offers"]);
  const candidatesKey = useTenantQueryKey(["candidates"]);
  const jobsKey = useTenantQueryKey(["jobs"]);

  const [selectedCandidate, setSelectedCandidate] = useState<string>("");
  const [selectedJob, setSelectedJob] = useState<string>("");
  const [salaryAmount, setSalaryAmount] = useState("");
  const [startDate, setStartDate] = useState("");
  const [additionalBenefits, setAdditionalBenefits] = useState("");
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [docType, setDocType] = useState<string>("offer_letter");
  const [docForm, setDocForm] = useState<DocFormData>(defaultDocForm);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        ["interviewing", "interview", "shortlisted", "offer_pending", "offer"].includes(stage)
      );
    }
  );

  const respondMutation = useMutation({
    mutationFn: ({ id, response }: { id: string; response: "accepted" | "declined" }) =>
      offersService.respond(id, response),
    onSuccess: (_data, variables) => {
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
      toast({ title: "Error", description: "Failed to process response.", variant: "destructive" });
    },
  });

  const handleGenerateDocument = async () => {
    if (!docForm.fullName || !docForm.jobTitle || !docForm.startDate) {
      toast({
        title: "Missing Information",
        description: "Please fill in Full Name, Job Title, and Start Date.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch(`/api/documents/generate/${docType}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(docForm),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to generate document");
      }

      const blob = await response.blob();
      const filename = `${docType}_${docForm.fullName.replace(/\s+/g, '_')}.docx`;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Document Downloaded",
        description: `${docType.replace(/_/g, ' ')} has been generated and downloaded.`,
      });
      setGenerateDialogOpen(false);
      setDocForm(defaultDocForm);
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate document",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const openGenerateDialog = (type: string) => {
    setDocType(type);
    // Pre-fill from selected candidate if any
    if (selectedCandidate) {
      const candidate = allCandidates.find((c: any) => c.id === selectedCandidate);
      const job = selectedJob ? allJobs.find((j: any) => j.id === selectedJob) : null;
      if (candidate) {
        setDocForm({
          fullName: candidate.fullName || "",
          jobTitle: (job as any)?.title || candidate.role || "",
          startDate: startDate || new Date().toISOString().split('T')[0],
          salary: salaryAmount || "",
          email: candidate.email || "",
        });
        setGenerateDialogOpen(true);
        return;
      }
    }
    setDocForm(defaultDocForm);
    setGenerateDialogOpen(true);
  };

  const handleSendOffer = async () => {
    if (!selectedCandidate || !salaryAmount || !startDate) {
      toast({
        title: "Missing Information",
        description: "Please select a candidate and fill in salary and start date.",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    try {
      // Create the offer
      const benefits = additionalBenefits
        ? additionalBenefits.split(",").map((b) => b.trim()).filter(Boolean)
        : [];

      const offer = await offersService.create({
        candidateId: selectedCandidate,
        jobId: selectedJob || undefined,
        salary: salaryAmount,
        startDate,
        benefits: benefits.length > 0 ? benefits : undefined,
      });

      // Send the offer (with optional attachment)
      let result;
      if (attachedFile) {
        const formData = new FormData();
        formData.append("attachment", attachedFile);
        const resp = await fetch(`/api/offers/${offer.id}/send`, {
          method: "POST",
          body: formData,
        });
        if (!resp.ok) throw new Error("Failed to send offer");
        result = await resp.json();
      } else {
        result = await offersService.send(offer.id);
      }

      queryClient.invalidateQueries({ queryKey: offersKey });
      queryClient.invalidateQueries({ queryKey: candidatesKey });

      toast({
        title: "Offer Sent",
        description: result.emailSent
          ? `Offer created and email sent to candidate${attachedFile ? " with attachment" : ""}.`
          : "Offer created and marked as sent (no email on file).",
      });

      setSelectedCandidate("");
      setSelectedJob("");
      setSalaryAmount("");
      setStartDate("");
      setAdditionalBenefits("");
      setAttachedFile(null);
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

  const getCandidateName = (candidateId: string) => {
    const candidate = allCandidates.find((c: any) => c.id === candidateId);
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

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <FileText className="h-8 w-8 text-green-600 dark:text-green-400" />
          Offer Management
        </h1>
        <p className="text-muted-foreground mt-2">
          Create and send offer letters to successful candidates
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              Send New Offer
            </CardTitle>
            <CardDescription>Create and send an offer letter to a candidate</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Select Candidate *</Label>
              <Select value={selectedCandidate} onValueChange={setSelectedCandidate}>
                <SelectTrigger data-testid="select-candidate">
                  <SelectValue placeholder="Choose a candidate" />
                </SelectTrigger>
                <SelectContent>
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
              <Select value={selectedJob} onValueChange={setSelectedJob}>
                <SelectTrigger>
                  <SelectValue placeholder="Link to a job (optional)" />
                </SelectTrigger>
                <SelectContent>
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
                  onChange={(e) => setSalaryAmount(e.target.value)}
                  placeholder="e.g., R45,000"
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
                  onChange={(e) => setStartDate(e.target.value)}
                  className="pl-10"
                  data-testid="input-start-date"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Additional Benefits</Label>
              <Textarea
                value={additionalBenefits}
                onChange={(e) => setAdditionalBenefits(e.target.value)}
                placeholder="e.g., Medical aid, Pension fund, Travel allowance (comma-separated)"
                rows={3}
                data-testid="input-benefits"
              />
            </div>

            <div className="space-y-2">
              <Label>Attach Offer Document</Label>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".pdf,.docx,.doc"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setAttachedFile(file);
                  e.target.value = "";
                }}
              />
              {attachedFile ? (
                <div className="flex items-center gap-2 p-3 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30">
                  <Paperclip className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
                  <span className="text-sm text-green-700 dark:text-green-300 truncate flex-1">{attachedFile.name}</span>
                  <span className="text-xs text-muted-foreground shrink-0">({(attachedFile.size / 1024).toFixed(0)} KB)</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={() => setAttachedFile(null)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="w-full gap-2 border-dashed"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip className="h-4 w-4" />
                  Attach PDF or DOCX
                </Button>
              )}
              <p className="text-xs text-muted-foreground">
                Tip: Use the templates below to generate an offer letter, then attach it here.
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => openGenerateDialog("offer_letter")}
                data-testid="button-download-template"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </Button>
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={handleSendOffer}
                disabled={isSending || !selectedCandidate || !salaryAmount || !startDate || !attachedFile}
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

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              Recent Offers
            </CardTitle>
            <CardDescription>Track the status of sent offer letters</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {offersLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : allOffers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p>No offers yet. Send your first offer from the form.</p>
              </div>
            ) : (
              allOffers.map((offer: any) => (
                <div
                  key={offer.id}
                  className="p-4 rounded-lg bg-gray-200 dark:bg-zinc-800/50 border border-gray-300 dark:border-zinc-700/50"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <h4 className="font-medium text-foreground">{getCandidateName(offer.candidateId)}</h4>
                        <p className="text-sm text-muted-foreground">{getJobTitle(offer)}</p>
                      </div>
                    </div>
                    {getStatusBadge(offer.status)}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                    {offer.salary && (
                      <span>{offer.currency || "ZAR"} {offer.salary}/mo</span>
                    )}
                    {offer.sentAt && (
                      <span>Sent: {new Date(offer.sentAt).toLocaleDateString()}</span>
                    )}
                    {offer.respondedAt && (
                      <span>Responded: {new Date(offer.respondedAt).toLocaleDateString()}</span>
                    )}
                  </div>
                  {offer.status === "sent" && (
                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => respondMutation.mutate({ id: offer.id, response: "accepted" })}
                        disabled={respondMutation.isPending}
                      >
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-950"
                        onClick={() => respondMutation.mutate({ id: offer.id, response: "declined" })}
                        disabled={respondMutation.isPending}
                      >
                        <XCircle className="h-3 w-3 mr-1" />
                        Decline
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6 bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            Offer Letter Templates
          </CardTitle>
          <CardDescription>Download and customize offer letter templates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Button
              variant="outline"
              className="h-auto py-4 flex-col gap-2"
              data-testid="button-template-standard"
              onClick={() => openGenerateDialog("offer_letter")}
            >
              <FileText className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              <span>Standard Offer</span>
              <span className="text-xs text-muted-foreground">Permanent position</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex-col gap-2"
              data-testid="button-template-contract"
              onClick={() => openGenerateDialog("employment_contract")}
            >
              <FileText className="h-8 w-8 text-amber-600 dark:text-amber-400" />
              <span>Contract Offer</span>
              <span className="text-xs text-muted-foreground">Fixed-term contract</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex-col gap-2"
              data-testid="button-template-executive"
              onClick={() => openGenerateDialog("offer_letter")}
            >
              <FileText className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              <span>Executive Offer</span>
              <span className="text-xs text-muted-foreground">Senior management</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Generate {docType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </DialogTitle>
            <DialogDescription>
              Enter employee details to generate a personalized document.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                placeholder="John Smith"
                value={docForm.fullName}
                onChange={(e) => setDocForm(prev => ({ ...prev, fullName: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="john@company.com"
                value={docForm.email}
                onChange={(e) => setDocForm(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="jobTitle">Job Title *</Label>
              <Input
                id="jobTitle"
                placeholder="Senior Developer"
                value={docForm.jobTitle}
                onChange={(e) => setDocForm(prev => ({ ...prev, jobTitle: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="docStartDate">Start Date *</Label>
              <Input
                id="docStartDate"
                type="date"
                value={docForm.startDate}
                onChange={(e) => setDocForm(prev => ({ ...prev, startDate: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="docSalary">Salary</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">R</span>
                <Input
                  id="docSalary"
                  placeholder="50,000"
                  className="pl-10"
                  value={docForm.salary}
                  onChange={(e) => setDocForm(prev => ({ ...prev, salary: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setGenerateDialogOpen(false)} disabled={isGenerating}>
              Cancel
            </Button>
            <Button onClick={handleGenerateDocument} disabled={isGenerating || !docForm.fullName || !docForm.jobTitle}>
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Generate & Download
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
