import { useState } from "react";
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

interface NewEmployee {
  id: string;
  name: string;
  position: string;
  department: string;
  startDate: string;
  onboardingStatus: "pending" | "in_progress" | "completed";
}

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
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [startDate, setStartDate] = useState("");
  const [requiresIT, setRequiresIT] = useState(true);
  const [requiresAccess, setRequiresAccess] = useState(true);
  const [requiresEquipment, setRequiresEquipment] = useState(true);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [docType, setDocType] = useState<string>("welcome_letter");
  const [docForm, setDocForm] = useState<DocFormData>(defaultDocForm);
  const [isGenerating, setIsGenerating] = useState(false);

  const employees: NewEmployee[] = [
    { id: "1", name: "John Smith", position: "Senior Developer", department: "Engineering", startDate: "2024-02-01", onboardingStatus: "pending" },
    { id: "2", name: "Sarah Johnson", position: "Project Manager", department: "Operations", startDate: "2024-02-05", onboardingStatus: "in_progress" },
    { id: "3", name: "Mike Wilson", position: "Data Analyst", department: "Analytics", startDate: "2024-01-20", onboardingStatus: "completed" },
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

    toast({
      title: "Onboarding Pack Sent",
      description: `Onboarding documents have been sent to the employee.`,
    });

    setSelectedEmployee("");
    setStartDate("");
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

    toast({
      title: "IT Setup Requested",
      description: "IT department has been notified to set up workstation and accounts.",
    });
  };

  const getStatusBadge = (status: NewEmployee["onboardingStatus"]) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-gray-500/20 text-gray-600 dark:text-gray-400 border-0">Pending</Badge>;
      case "in_progress":
        return <Badge className="bg-blue-500/20 text-blue-600 dark:text-blue-400 border-0">In Progress</Badge>;
      case "completed":
        return <Badge className="bg-green-500/20 text-green-600 dark:text-green-400 border-0"><CheckCircle2 className="h-3 w-3 mr-1" />Completed</Badge>;
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
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
                  <SelectValue placeholder="Choose an employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.filter(e => e.onboardingStatus !== "completed").map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {employee.name} - {employee.position}
                      </div>
                    </SelectItem>
                  ))}
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
                disabled={!selectedEmployee}
                data-testid="button-request-it"
              >
                <Monitor className="h-4 w-4 mr-2" />
                Request IT Setup
              </Button>
              <Button 
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                onClick={handleSendOnboardingPack}
                data-testid="button-send-pack"
              >
                <Send className="h-4 w-4 mr-2" />
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
            {employees.map((employee) => (
              <div 
                key={employee.id}
                className="p-4 rounded-lg bg-gray-200 dark:bg-zinc-800/50 border border-gray-300 dark:border-zinc-700/50"
                data-testid={`employee-item-${employee.id}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h4 className="font-medium text-white">{employee.name}</h4>
                      <p className="text-sm text-muted-foreground">{employee.position} - {employee.department}</p>
                    </div>
                  </div>
                  {getStatusBadge(employee.onboardingStatus)}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Start Date: {new Date(employee.startDate).toLocaleDateString()}
                </p>
              </div>
            ))}
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
