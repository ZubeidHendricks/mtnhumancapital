import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTenantQueryKey } from "@/hooks/useTenant";
import { onboardingService, candidateService } from "@/lib/api";
import type { Candidate, OnboardingWorkflow } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  Building2,
  Download,
  Send,
  User,
  Calendar,
  Monitor,
  FileText,
  BookOpen,
  Mail,
  CheckCircle2,
  Package,
  Loader2,
  Sparkles
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface DocFormData {
  fullName: string;
  jobTitle: string;
  startDate: string;
  department: string;
  email: string;
}

const defaultDocForm: DocFormData = {
  fullName: "",
  jobTitle: "",
  startDate: new Date().toISOString().split('T')[0],
  department: "",
  email: "",
};

export default function EmployeeOnboarding() {
  const queryClient = useQueryClient();
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [startDate, setStartDate] = useState("");
  const [requiresIT, setRequiresIT] = useState(true);
  const [requiresAccess, setRequiresAccess] = useState(true);
  const [requiresEquipment, setRequiresEquipment] = useState(true);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [docType, setDocType] = useState<string>("welcome_letter");
  const [docForm, setDocForm] = useState<DocFormData>(defaultDocForm);
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch real data from API
  const workflowsKey = useTenantQueryKey(['onboarding-workflows']);
  const candidatesKey = useTenantQueryKey(['candidates']);

  const { data: workflows = [], isLoading: loadingWorkflows } = useQuery({
    queryKey: workflowsKey,
    queryFn: () => onboardingService.getWorkflows(),
    retry: 1,
  });

  const { data: candidates = [], isLoading: loadingCandidates } = useQuery({
    queryKey: candidatesKey,
    queryFn: () => candidateService.getAll(),
    retry: 1,
  });

  // Candidates eligible for onboarding: stage contains "onboard" or they have an existing workflow
  const workflowCandidateIds = new Set(workflows.map((w: OnboardingWorkflow) => w.candidateId));
  const onboardingCandidates = candidates.filter((c: Candidate) => {
    const stage = ((c as any).stage || "").toLowerCase();
    return stage.includes("onboard") || workflowCandidateIds.has(c.id.toString());
  });

  // Trigger onboarding mutation
  const triggerOnboarding = useMutation({
    mutationFn: (candidateId: string) => onboardingService.triggerOnboarding(candidateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workflowsKey });
      toast({
        title: "Onboarding Triggered",
        description: "Onboarding workflow has been started for the employee.",
      });
      setSelectedEmployee("");
      setStartDate("");
    },
    onError: (error: any) => {
      toast({
        title: "Onboarding Failed",
        description: error?.response?.data?.message || error.message || "Failed to trigger onboarding",
        variant: "destructive",
      });
    },
  });

  // Helper: look up candidate info from a workflow
  const getCandidateForWorkflow = (workflow: OnboardingWorkflow): Candidate | undefined => {
    return candidates.find((c: Candidate) => c.id.toString() === workflow.candidateId);
  };

  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s === "completed" || s === "complete") {
      return <Badge className="bg-green-500/20 text-green-600 dark:text-green-400 border-0"><CheckCircle2 className="h-3 w-3 mr-1" />Completed</Badge>;
    }
    if (s === "in progress" || s === "in_progress") {
      return <Badge className="bg-blue-500/20 text-blue-600 dark:text-blue-400 border-0">In Progress</Badge>;
    }
    return <Badge className="bg-gray-500/20 text-gray-600 dark:text-gray-400 border-0">Pending</Badge>;
  };

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
    // Pre-fill from selected employee if one is chosen
    if (selectedEmployee) {
      const candidate = candidates.find((c: Candidate) => c.id.toString() === selectedEmployee);
      if (candidate) {
        setDocForm({
          fullName: (candidate as any).fullName || (candidate as any).name || "",
          jobTitle: (candidate as any).role || (candidate as any).position || "",
          startDate: startDate || new Date().toISOString().split('T')[0],
          department: (candidate as any).department || "",
          email: (candidate as any).email || "",
        });
        setGenerateDialogOpen(true);
        return;
      }
    }
    setDocForm(defaultDocForm);
    setGenerateDialogOpen(true);
  };

  const handleDownloadWelcomeLetter = () => {
    openGenerateDialog("welcome_letter");
  };

  const handleDownloadHandbook = () => {
    openGenerateDialog("employee_handbook");
  };

  const handleSendOnboardingPack = () => {
    if (!selectedEmployee || !startDate) {
      toast({
        title: "Missing Information",
        description: "Please select an employee and start date.",
        variant: "destructive",
      });
      return;
    }
    triggerOnboarding.mutate(selectedEmployee);
  };

  const handleRequestIT = () => {
    if (!selectedEmployee) {
      toast({
        title: "No Employee Selected",
        description: "Please select an employee first.",
        variant: "destructive",
      });
      return;
    }
    triggerOnboarding.mutate(selectedEmployee);
  };

  const isLoading = loadingWorkflows || loadingCandidates;

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <Building2 className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          Employee Onboarding
        </h1>
        <p className="text-muted-foreground mt-2">
          Manage the onboarding process for new employees
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              Send Onboarding Pack
            </CardTitle>
            <CardDescription>Prepare and send onboarding documents to a new employee</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Select Employee *</Label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger data-testid="select-employee">
                  <SelectValue placeholder={loadingCandidates ? "Loading candidates..." : "Choose an employee"} />
                </SelectTrigger>
                <SelectContent>
                  {onboardingCandidates.length > 0 ? (
                    onboardingCandidates.map((candidate: Candidate) => (
                      <SelectItem key={candidate.id} value={candidate.id.toString()}>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          {(candidate as any).fullName || (candidate as any).name} - {(candidate as any).role || (candidate as any).position || "Candidate"}
                        </div>
                      </SelectItem>
                    ))
                  ) : (
                    candidates.slice(0, 20).map((candidate: Candidate) => (
                      <SelectItem key={candidate.id} value={candidate.id.toString()}>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          {(candidate as any).fullName || (candidate as any).name} - {(candidate as any).role || (candidate as any).position || "Candidate"}
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Start Date *</Label>
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

            <div className="space-y-3 pt-2">
              <Label>Onboarding Requirements</Label>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="requires-it"
                  checked={requiresIT}
                  onCheckedChange={(checked) => setRequiresIT(checked as boolean)}
                  data-testid="checkbox-requires-it"
                />
                <label htmlFor="requires-it" className="text-sm text-muted-foreground flex items-center gap-2">
                  <Monitor className="h-4 w-4" />
                  Request IT Setup (email, accounts, software)
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="requires-access"
                  checked={requiresAccess}
                  onCheckedChange={(checked) => setRequiresAccess(checked as boolean)}
                  data-testid="checkbox-requires-access"
                />
                <label htmlFor="requires-access" className="text-sm text-muted-foreground flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Request Building Access Card
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="requires-equipment"
                  checked={requiresEquipment}
                  onCheckedChange={(checked) => setRequiresEquipment(checked as boolean)}
                  data-testid="checkbox-requires-equipment"
                />
                <label htmlFor="requires-equipment" className="text-sm text-muted-foreground flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Request Equipment (laptop, phone, etc.)
                </label>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleRequestIT}
                disabled={!selectedEmployee || triggerOnboarding.isPending}
                data-testid="button-request-it"
              >
                {triggerOnboarding.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Monitor className="h-4 w-4 mr-2" />
                )}
                Request IT Setup
              </Button>
              <Button
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                onClick={handleSendOnboardingPack}
                disabled={triggerOnboarding.isPending}
                data-testid="button-send-pack"
              >
                {triggerOnboarding.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Send Onboarding Pack
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-green-600 dark:text-green-400" />
              New Employees
            </CardTitle>
            <CardDescription>Track onboarding progress for new hires</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Loading workflows...</span>
              </div>
            ) : workflows.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <User className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">No onboarding workflows yet.</p>
                <p className="text-xs mt-1">Select an employee and send an onboarding pack to get started.</p>
              </div>
            ) : (
              workflows.map((workflow: OnboardingWorkflow) => {
                const candidate = getCandidateForWorkflow(workflow);
                const name = candidate ? ((candidate as any).fullName || (candidate as any).name || "Unknown") : "Unknown Candidate";
                const role = candidate ? ((candidate as any).role || (candidate as any).position || "") : "";
                const dept = candidate ? ((candidate as any).department || "") : "";
                return (
                  <div
                    key={workflow.id}
                    className="p-4 rounded-lg bg-gray-200 dark:bg-zinc-800/50 border border-gray-300 dark:border-zinc-700/50"
                    data-testid={`employee-item-${workflow.id}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                          <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <h4 className="font-medium text-foreground">{name}</h4>
                          <p className="text-sm text-muted-foreground">{role}{dept ? ` - ${dept}` : ""}</p>
                        </div>
                      </div>
                      {getStatusBadge(workflow.status)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Start Date: {workflow.startDate ? new Date(workflow.startDate).toLocaleDateString() : "Not set"}
                    </p>
                    {workflow.currentStep && (
                      <p className="text-xs text-muted-foreground">
                        Current Step: {workflow.currentStep}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6 bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            Onboarding Documents
          </CardTitle>
          <CardDescription>Download templates and documents for new employees</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <Button
              variant="outline"
              className="h-auto py-4 flex-col gap-2"
              onClick={handleDownloadWelcomeLetter}
              data-testid="button-download-welcome"
            >
              <Mail className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              <span>Welcome Letter</span>
              <span className="text-xs text-muted-foreground">Template</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex-col gap-2"
              onClick={handleDownloadHandbook}
              data-testid="button-download-handbook"
            >
              <BookOpen className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              <span>Employee Handbook</span>
              <span className="text-xs text-muted-foreground">PDF Document</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex-col gap-2"
              data-testid="button-download-policies"
              onClick={() => openGenerateDialog("employee_handbook")}
            >
              <FileText className="h-8 w-8 text-green-600 dark:text-green-400" />
              <span>Company Policies</span>
              <span className="text-xs text-muted-foreground">PDF Document</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex-col gap-2"
              data-testid="button-download-checklist"
              onClick={() => openGenerateDialog("welcome_letter")}
            >
              <CheckCircle2 className="h-8 w-8 text-amber-600 dark:text-amber-400" />
              <span>Onboarding Checklist</span>
              <span className="text-xs text-muted-foreground">Template</span>
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
              <Label htmlFor="docFullName">Full Name *</Label>
              <Input
                id="docFullName"
                placeholder="John Smith"
                value={docForm.fullName}
                onChange={(e) => setDocForm(prev => ({ ...prev, fullName: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="docEmail">Email</Label>
              <Input
                id="docEmail"
                type="email"
                placeholder="john@company.com"
                value={docForm.email}
                onChange={(e) => setDocForm(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="docJobTitle">Job Title *</Label>
              <Input
                id="docJobTitle"
                placeholder="Senior Developer"
                value={docForm.jobTitle}
                onChange={(e) => setDocForm(prev => ({ ...prev, jobTitle: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="docDepartment">Department</Label>
              <Input
                id="docDepartment"
                placeholder="Engineering"
                value={docForm.department}
                onChange={(e) => setDocForm(prev => ({ ...prev, department: e.target.value }))}
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
