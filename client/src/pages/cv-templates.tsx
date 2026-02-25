import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useTenantQueryKey } from "@/hooks/useTenant";
import { toast } from "sonner";
import { format } from "date-fns";
import { 
  FileText, 
  Upload, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  File,
  FileType,
  Loader2,
  FileSignature,
  ScrollText,
  BookOpen,
  ShieldCheck,
  FileCheck,
  Download,
  Sparkles
} from "lucide-react";
import type { CvTemplate, DocumentTemplate } from "@shared/schema";

interface TemplateType {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  apiEndpoint: string;
  queryKey: string;
}

const TEMPLATE_TYPES: TemplateType[] = [
  {
    id: "cv",
    label: "CV Templates",
    description: "Upload CV templates for AI-powered CV formatting",
    icon: <FileText className="w-5 h-5" />,
    apiEndpoint: "/api/cv-templates",
    queryKey: "cv-templates",
  },
  {
    id: "offer_letter",
    label: "Offer Letters",
    description: "Templates for job offer letters sent to candidates",
    icon: <FileSignature className="w-5 h-5" />,
    apiEndpoint: "/api/document-templates",
    queryKey: "document-templates-offer_letter",
  },
  {
    id: "welcome_letter",
    label: "Welcome Letters",
    description: "Welcome letters for new employees joining the company",
    icon: <ScrollText className="w-5 h-5" />,
    apiEndpoint: "/api/document-templates",
    queryKey: "document-templates-welcome_letter",
  },
  {
    id: "employee_handbook",
    label: "Employee Handbook",
    description: "Company policies and procedures documentation",
    icon: <BookOpen className="w-5 h-5" />,
    apiEndpoint: "/api/document-templates",
    queryKey: "document-templates-employee_handbook",
  },
  {
    id: "nda",
    label: "NDA Templates",
    description: "Non-disclosure agreement templates",
    icon: <ShieldCheck className="w-5 h-5" />,
    apiEndpoint: "/api/document-templates",
    queryKey: "document-templates-nda",
  },
  {
    id: "employment_contract",
    label: "Employment Contracts",
    description: "Standard employment contract templates",
    icon: <FileCheck className="w-5 h-5" />,
    apiEndpoint: "/api/document-templates",
    queryKey: "document-templates-employment_contract",
  },
];

function TemplateCard({ 
  template, 
  onActivate, 
  onDelete,
  isActivating,
  isCvTemplate 
}: { 
  template: CvTemplate | DocumentTemplate;
  onActivate: (id: string) => void;
  onDelete: (id: string) => void;
  isActivating: boolean;
  isCvTemplate: boolean;
}) {
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType === "application/pdf") {
      return <FileText className="w-8 h-8 text-destructive" />;
    }
    return <FileType className="w-8 h-8 text-foreground dark:text-foreground" />;
  };

  const isActive = isCvTemplate 
    ? (template as CvTemplate).isActive === 1 
    : (template as DocumentTemplate).isActive === 1;

  return (
    <Card 
      className={`relative ${isActive ? 'ring-2 ring-ring/50 bg-muted/5' : ''}`}
      data-testid={`card-template-${template.id}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          {getFileIcon(template.mimeType)}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <CardTitle className="text-base truncate" data-testid={`text-template-name-${template.id}`}>
                {template.name}
              </CardTitle>
              {isActive ? (
                <Badge className="bg-muted/20 text-foreground border-border/30 shrink-0" data-testid={`badge-active-${template.id}`}>
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Active
                </Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground shrink-0" data-testid={`badge-inactive-${template.id}`}>
                  <Clock className="w-3 h-3 mr-1" />
                  Inactive
                </Badge>
              )}
            </div>
            <CardDescription className="text-xs truncate">
              {template.originalFilename}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Size: {formatFileSize(template.fileSize)}</span>
            <span className="text-muted-foreground" data-testid={`text-upload-date-${template.id}`}>
              {format(new Date(template.createdAt), "MMM d, yyyy")}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            {!isActive && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => onActivate(template.id)}
                disabled={isActivating}
                data-testid={`button-activate-${template.id}`}
              >
                {isActivating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    Set Active
                  </>
                )}
              </Button>
            )}
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  data-testid={`button-delete-${template.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Template</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete "{template.name}"? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onDelete(template.id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    data-testid="button-confirm-delete"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface GenerateFormData {
  fullName: string;
  email: string;
  phone: string;
  jobTitle: string;
  department: string;
  startDate: string;
  salary: string;
  currency: string;
  manager: string;
  probationPeriod: string;
  workingHours: string;
  leaveEntitlement: string;
}

const defaultFormData: GenerateFormData = {
  fullName: "",
  email: "",
  phone: "",
  jobTitle: "",
  department: "",
  startDate: new Date().toISOString().split('T')[0],
  salary: "",
  currency: "ZAR",
  manager: "",
  probationPeriod: "3 months",
  workingHours: "08:00 - 17:00, Monday to Friday",
  leaveEntitlement: "15 days annual leave",
};

function TemplateSection({ templateType }: { templateType: TemplateType }) {
  const queryClient = useQueryClient();
  const tenantKey = useTenantQueryKey(templateType.queryKey);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [formData, setFormData] = useState<GenerateFormData>(defaultFormData);

  const isCvTemplate = templateType.id === "cv";
  const canGenerate = !isCvTemplate;

  const { data: templates = [], isLoading } = useQuery<(CvTemplate | DocumentTemplate)[]>({
    queryKey: tenantKey,
    queryFn: async () => {
      let url = templateType.apiEndpoint;
      if (!isCvTemplate) {
        url += `?type=${templateType.id}`;
      }
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch templates");
      return response.json();
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      setIsUploading(true);
      setUploadProgress(0);
      
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      try {
        const uploadUrl = isCvTemplate 
          ? "/api/cv-templates/upload" 
          : "/api/document-templates/upload";
        
        const response = await fetch(uploadUrl, {
          method: "POST",
          body: formData,
        });
        
        clearInterval(progressInterval);
        setUploadProgress(100);
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || "Failed to upload template");
        }
        return response.json();
      } finally {
        clearInterval(progressInterval);
        setIsUploading(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenantKey });
      toast.success("Template uploaded successfully");
      setUploadDialogOpen(false);
      setSelectedFile(null);
      setTemplateName("");
      setUploadProgress(0);
    },
    onError: (error: Error) => {
      toast.error(error.message);
      setUploadProgress(0);
    },
  });

  const activateMutation = useMutation({
    mutationFn: async (id: string) => {
      const activateUrl = isCvTemplate 
        ? `/api/cv-templates/${id}/activate` 
        : `/api/document-templates/${id}/activate`;
      const response = await fetch(activateUrl, {
        method: "PATCH",
      });
      if (!response.ok) throw new Error("Failed to activate template");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenantKey });
      toast.success("Template activated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const deleteUrl = isCvTemplate 
        ? `/api/cv-templates/${id}` 
        : `/api/document-templates/${id}`;
      const response = await fetch(deleteUrl, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete template");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenantKey });
      toast.success("Template deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const allowedTypes = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword"
      ];
      if (!allowedTypes.includes(file.type)) {
        toast.error("Only PDF and DOCX files are supported");
        return;
      }
      setSelectedFile(file);
      if (!templateName) {
        setTemplateName(file.name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  const handleGenerateDocument = async () => {
    if (!formData.fullName || !formData.jobTitle || !formData.startDate) {
      toast.error("Please fill in required fields: Full Name, Job Title, and Start Date");
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch(`/api/documents/generate/${templateType.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to generate document");
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get("Content-Disposition");
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch ? filenameMatch[1] : `${templateType.id}_${formData.fullName.replace(/\s+/g, '_')}.docx`;

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Document generated and downloaded successfully!");
      setGenerateDialogOpen(false);
      setFormData(defaultFormData);
    } catch (error) {
      console.error("Error generating document:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate document");
    } finally {
      setIsGenerating(false);
    }
  };

  const updateFormField = (field: keyof GenerateFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleUpload = () => {
    if (!selectedFile) return;
    
    const formData = new FormData();
    formData.append("template", selectedFile);
    formData.append("name", templateName || selectedFile.name);
    if (!isCvTemplate) {
      formData.append("templateType", templateType.id);
    }
    uploadMutation.mutate(formData);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-muted-foreground">{templateType.description}</p>
        </div>
        
        <div className="flex items-center gap-2">
          {canGenerate && (
            <Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" data-testid={`button-generate-${templateType.id}`} className="gap-2">
                  <Sparkles className="w-4 h-4" />
                  Generate Document
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    Generate {templateType.label.replace(/s$/, '')}
                  </DialogTitle>
                  <DialogDescription>
                    Fill in the employee details below. AI will generate a professional document based on your active template.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full Name *</Label>
                      <Input
                        id="fullName"
                        data-testid="input-gen-fullname"
                        placeholder="John Smith"
                        value={formData.fullName}
                        onChange={(e) => updateFormField("fullName", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        data-testid="input-gen-email"
                        placeholder="john@company.com"
                        value={formData.email}
                        onChange={(e) => updateFormField("email", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        data-testid="input-gen-phone"
                        placeholder="+27 12 345 6789"
                        value={formData.phone}
                        onChange={(e) => updateFormField("phone", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="jobTitle">Job Title *</Label>
                      <Input
                        id="jobTitle"
                        data-testid="input-gen-jobtitle"
                        placeholder="Software Engineer"
                        value={formData.jobTitle}
                        onChange={(e) => updateFormField("jobTitle", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="department">Department</Label>
                      <Input
                        id="department"
                        data-testid="input-gen-department"
                        placeholder="Engineering"
                        value={formData.department}
                        onChange={(e) => updateFormField("department", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="startDate">Start Date *</Label>
                      <Input
                        id="startDate"
                        type="date"
                        data-testid="input-gen-startdate"
                        value={formData.startDate}
                        onChange={(e) => updateFormField("startDate", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="salary">Salary</Label>
                      <Input
                        id="salary"
                        data-testid="input-gen-salary"
                        placeholder="50000"
                        value={formData.salary}
                        onChange={(e) => updateFormField("salary", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="currency">Currency</Label>
                      <Input
                        id="currency"
                        data-testid="input-gen-currency"
                        placeholder="ZAR"
                        value={formData.currency}
                        onChange={(e) => updateFormField("currency", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="manager">Manager</Label>
                      <Input
                        id="manager"
                        data-testid="input-gen-manager"
                        placeholder="Jane Doe"
                        value={formData.manager}
                        onChange={(e) => updateFormField("manager", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="probationPeriod">Probation Period</Label>
                      <Input
                        id="probationPeriod"
                        data-testid="input-gen-probation"
                        placeholder="3 months"
                        value={formData.probationPeriod}
                        onChange={(e) => updateFormField("probationPeriod", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="workingHours">Working Hours</Label>
                    <Input
                      id="workingHours"
                      data-testid="input-gen-hours"
                      placeholder="08:00 - 17:00, Monday to Friday"
                      value={formData.workingHours}
                      onChange={(e) => updateFormField("workingHours", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="leaveEntitlement">Leave Entitlement</Label>
                    <Input
                      id="leaveEntitlement"
                      data-testid="input-gen-leave"
                      placeholder="15 days annual leave"
                      value={formData.leaveEntitlement}
                      onChange={(e) => updateFormField("leaveEntitlement", e.target.value)}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button 
                    variant="outline" 
                    onClick={() => setGenerateDialogOpen(false)}
                    disabled={isGenerating}
                    data-testid="button-cancel-generate"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleGenerateDocument}
                    disabled={isGenerating || !formData.fullName || !formData.jobTitle || !formData.startDate}
                    data-testid="button-submit-generate"
                    className="gap-2"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        Generate & Download
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid={`button-upload-${templateType.id}`} className="gap-2">
                <Upload className="w-4 h-4" />
                Upload Template
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload {templateType.label.replace(/s$/, '')}</DialogTitle>
              <DialogDescription>
                Upload a PDF or DOCX file to use as a template. The system will use this template for generating documents.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="template-name">Template Name</Label>
                <Input
                  id="template-name"
                  data-testid="input-template-name"
                  placeholder="Enter template name"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Template File</Label>
                <div 
                  className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                  data-testid="dropzone-file-upload"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.doc"
                    onChange={handleFileChange}
                    className="hidden"
                    data-testid="input-file-upload"
                  />
                  {selectedFile ? (
                    <div className="flex items-center justify-center gap-3">
                      <File className="w-8 h-8 text-primary" />
                      <div className="text-left">
                        <p className="font-medium" data-testid="text-selected-filename">{selectedFile.name}</p>
                        <p className="text-sm text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="w-10 h-10 mx-auto text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs text-muted-foreground">
                        PDF or DOCX (max 10MB)
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {isUploading && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Uploading...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} data-testid="progress-upload" />
                </div>
              )}
            </div>

            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setUploadDialogOpen(false)}
                disabled={isUploading}
                data-testid="button-cancel-upload"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleUpload}
                disabled={!selectedFile || isUploading}
                data-testid="button-submit-upload"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  "Upload Template"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : templates.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            {templateType.icon}
            <h3 className="text-lg font-medium mb-2 mt-4">No templates yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Upload your first {templateType.label.toLowerCase().replace(/s$/, '')} template to get started.
            </p>
            <Button 
              onClick={() => setUploadDialogOpen(true)}
              data-testid={`button-upload-first-${templateType.id}`}
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <TemplateCard 
              key={template.id} 
              template={template}
              onActivate={(id) => activateMutation.mutate(id)}
              onDelete={(id) => deleteMutation.mutate(id)}
              isActivating={activateMutation.isPending}
              isCvTemplate={isCvTemplate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function CvTemplatesPage() {
  const [activeTab, setActiveTab] = useState("cv");

  return (
    <div className="min-h-screen bg-background">
      <main className="pt-20 pb-16">
        <div className="container mx-auto px-4 md:px-6 py-8">
          <div className="flex flex-col gap-6">
            <div>
              <h1 className="text-3xl font-bold" data-testid="text-page-title">Templates</h1>
              <p className="text-muted-foreground mt-1">
                Manage document templates for CV formatting, offer letters, contracts, and more
              </p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6 h-auto p-1">
                {TEMPLATE_TYPES.map((type) => (
                  <TabsTrigger 
                    key={type.id} 
                    value={type.id}
                    className="flex items-center gap-2 py-2 px-3"
                    data-testid={`tab-${type.id}`}
                  >
                    {type.icon}
                    <span className="hidden sm:inline text-xs lg:text-sm">{type.label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>

              {TEMPLATE_TYPES.map((type) => (
                <TabsContent key={type.id} value={type.id} className="mt-6">
                  <TemplateSection templateType={type} />
                </TabsContent>
              ))}
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  );
}
