import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { 
  FileText, 
  Download,
  Send,
  User,
  DollarSign,
  Calendar,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  Sparkles
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Candidate {
  id: string;
  name: string;
  position: string;
  status: "pending" | "sent" | "accepted" | "declined";
  offerDate?: string;
}

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
  const [selectedCandidate, setSelectedCandidate] = useState<string>("");
  const [salaryAmount, setSalaryAmount] = useState("");
  const [startDate, setStartDate] = useState("");
  const [additionalBenefits, setAdditionalBenefits] = useState("");
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [docType, setDocType] = useState<string>("offer_letter");
  const [docForm, setDocForm] = useState<DocFormData>(defaultDocForm);
  const [isGenerating, setIsGenerating] = useState(false);

  const candidates: Candidate[] = [
    { id: "1", name: "John Smith", position: "Senior Developer", status: "pending" },
    { id: "2", name: "Sarah Johnson", position: "Project Manager", status: "sent", offerDate: "2024-01-15" },
    { id: "3", name: "Mike Wilson", position: "Data Analyst", status: "accepted", offerDate: "2024-01-10" },
    { id: "4", name: "Emily Brown", position: "HR Coordinator", status: "declined", offerDate: "2024-01-08" },
  ];

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
    setDocForm(defaultDocForm);
    setGenerateDialogOpen(true);
  };

  const handleDownloadTemplate = () => {
    openGenerateDialog("offer_letter");
  };

  const handleSendOffer = () => {
    if (!selectedCandidate || !salaryAmount || !startDate) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Offer Sent",
      description: `Offer letter has been sent to the candidate.`,
    });

    setSelectedCandidate("");
    setSalaryAmount("");
    setStartDate("");
    setAdditionalBenefits("");
  };

  const getStatusBadge = (status: Candidate["status"]) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-secondary0/20 text-gray-600 border-0"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case "sent":
        return <Badge className="bg-muted/20 text-foreground dark:text-foreground border-0"><Send className="h-3 w-3 mr-1" />Sent</Badge>;
      case "accepted":
        return <Badge className="bg-muted/20 text-foreground border-0"><CheckCircle2 className="h-3 w-3 mr-1" />Accepted</Badge>;
      case "declined":
        return <Badge className="bg-destructive/20 text-destructive border-0"><XCircle className="h-3 w-3 mr-1" />Declined</Badge>;
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <FileText className="h-8 w-8 text-foreground" />
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
              <Send className="h-5 w-5 text-foreground dark:text-foreground" />
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
                  {candidates.filter(c => c.status === "pending").map((candidate) => (
                    <SelectItem key={candidate.id} value={candidate.id}>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {candidate.name} - {candidate.position}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Salary Package (Monthly) *</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
                placeholder="e.g., Medical aid, Pension fund, Travel allowance..."
                rows={3}
                data-testid="input-benefits"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={handleDownloadTemplate}
                data-testid="button-download-template"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </Button>
              <Button 
                className="flex-1 bg-muted hover:bg-muted"
                onClick={handleSendOffer}
                data-testid="button-send-offer"
              >
                <Send className="h-4 w-4 mr-2" />
                Send Offer
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-foreground dark:text-foreground" />
              Recent Offers
            </CardTitle>
            <CardDescription>Track the status of sent offer letters</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {candidates.map((candidate) => (
              <div 
                key={candidate.id}
                className="p-4 rounded-lg bg-secondary border border-border dark:border-border/50"
                data-testid={`offer-item-${candidate.id}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted/20 flex items-center justify-center">
                      <User className="h-5 w-5 text-foreground dark:text-foreground" />
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground">{candidate.name}</h4>
                      <p className="text-sm text-muted-foreground">{candidate.position}</p>
                    </div>
                  </div>
                  {getStatusBadge(candidate.status)}
                </div>
                {candidate.offerDate && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Offer sent: {new Date(candidate.offerDate).toLocaleDateString()}
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6 bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-foreground dark:text-foreground" />
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
              <FileText className="h-8 w-8 text-foreground dark:text-foreground" />
              <span>Standard Offer</span>
              <span className="text-xs text-muted-foreground">Permanent position</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-4 flex-col gap-2" 
              data-testid="button-template-contract"
              onClick={() => openGenerateDialog("employment_contract")}
            >
              <FileText className="h-8 w-8 text-foreground dark:text-foreground" />
              <span>Contract Offer</span>
              <span className="text-xs text-muted-foreground">Fixed-term contract</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-4 flex-col gap-2" 
              data-testid="button-template-executive"
              onClick={() => openGenerateDialog("offer_letter")}
            >
              <FileText className="h-8 w-8 text-foreground dark:text-foreground" />
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
              <Input
                id="docSalary"
                placeholder="R50,000"
                value={docForm.salary}
                onChange={(e) => setDocForm(prev => ({ ...prev, salary: e.target.value }))}
              />
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
