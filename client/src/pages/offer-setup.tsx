import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { 
  FileText, 
  Download,
  Upload,
  Loader2,
  CheckCircle2,
  FolderOpen,
  Trash2,
  Star,
  Clock
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

interface DocumentTemplate {
  id: string;
  tenantId: string;
  templateType: string;
  name: string;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  filePath: string;
  isActive: number;
  rawText: string | null;
  createdAt: string;
  updatedAt: string;
}

const TEMPLATE_TYPES = [
  { value: "offer_letter", label: "Offer Letter" },
  { value: "contract", label: "Employment Contract" },
  { value: "executive_offer", label: "Executive Offer Package" },
  { value: "nda", label: "Non-Disclosure Agreement" },
  { value: "welcome_letter", label: "Welcome Letter" },
  { value: "employee_handbook", label: "Employee Handbook" },
];

const DEFAULT_TEMPLATES = [
  { 
    id: "offer_letter", 
    name: "Standard Offer Letter", 
    type: "offer_letter",
    description: "Standard employment offer letter template",
    isSystem: true
  },
  { 
    id: "contract", 
    name: "Employment Contract", 
    type: "contract",
    description: "Full employment contract template with terms and conditions",
    isSystem: true
  },
  { 
    id: "executive_offer", 
    name: "Executive Offer Package", 
    type: "executive_offer",
    description: "Executive-level offer letter with compensation details",
    isSystem: true
  },
  { 
    id: "nda", 
    name: "Non-Disclosure Agreement", 
    type: "nda",
    description: "Standard NDA template for new hires",
    isSystem: true
  },
];

export default function OfferSetup() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateType, setTemplateType] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);

  const { data: customTemplates = [], isLoading } = useQuery<DocumentTemplate[]>({
    queryKey: ['document-templates'],
    queryFn: async () => {
      const response = await api.get("/document-templates");
      return response.data;
    }
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ file, name, type }: { file: File; name: string; type: string }) => {
      const formData = new FormData();
      formData.append("template", file);
      formData.append("name", name);
      formData.append("templateType", type);
      
      const response = await api.post("/document-templates/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-templates'] });
      setUploadDialogOpen(false);
      setTemplateName("");
      setTemplateType("");
      setSelectedFile(null);
      toast({
        title: "Template Uploaded",
        description: "Your custom template has been uploaded successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Upload Failed",
        description: "Failed to upload the template. Please try again.",
        variant: "destructive",
      });
    }
  });

  const activateMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.patch(`/document-templates/${id}/activate`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-templates'] });
      toast({
        title: "Template Activated",
        description: "This template is now the active template for its type.",
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/document-templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-templates'] });
      toast({
        title: "Template Deleted",
        description: "The template has been removed.",
      });
    }
  });

  const handleDownloadTemplate = async (templateId: string, templateName: string) => {
    setIsDownloading(templateId);
    try {
      const response = await fetch(`/api/documents/generate/${templateId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: "[Employee Name]",
          jobTitle: "[Job Title]",
          startDate: new Date().toISOString().split('T')[0],
          salary: "[Salary Amount]",
        }),
      });

      if (!response.ok) throw new Error("Failed to download template");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${templateName.replace(/\s+/g, "_")}_Template.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

      toast({
        title: "Template Downloaded",
        description: `${templateName} template has been downloaded successfully.`,
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to download the template. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(null);
    }
  };

  const handleUploadTemplate = () => {
    if (!selectedFile || !templateName || !templateType) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields and select a file.",
        variant: "destructive",
      });
      return;
    }
    uploadMutation.mutate({ file: selectedFile, name: templateName, type: templateType });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!templateName) {
        setTemplateName(file.name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <FileText className="w-8 h-8 text-primary" />
            Offer Setup
          </h1>
          <p className="text-muted-foreground mt-2">
            Download and upload offer document templates
          </p>
        </div>
        <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" data-testid="button-upload-template">
              <Upload className="w-4 h-4 mr-2" />
              Upload Custom Template
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Custom Template</DialogTitle>
              <DialogDescription>
                Upload your own offer letter template to use in the system
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Template Name</Label>
                <Input 
                  placeholder="e.g., Custom Offer Letter" 
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  data-testid="input-template-name" 
                />
              </div>
              <div className="space-y-2">
                <Label>Template Type</Label>
                <Select value={templateType} onValueChange={setTemplateType}>
                  <SelectTrigger data-testid="select-template-type">
                    <SelectValue placeholder="Select template type" />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPLATE_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Template File</Label>
                <Input 
                  ref={fileInputRef}
                  type="file" 
                  accept=".docx,.doc,.pdf" 
                  onChange={handleFileChange}
                  data-testid="input-template-file" 
                />
                {selectedFile && (
                  <p className="text-sm text-muted-foreground">
                    Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleUploadTemplate}
                disabled={uploadMutation.isPending || !selectedFile || !templateName || !templateType}
                data-testid="button-confirm-upload"
              >
                {uploadMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 mr-2" />
                )}
                Upload Template
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="w-5 h-5" />
              System Templates
            </CardTitle>
            <CardDescription>
              Default templates provided by the system. Download these as a starting point.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {DEFAULT_TEMPLATES.map((template) => (
                <div 
                  key={template.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card"
                  data-testid={`template-${template.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium">{template.name}</h4>
                      <p className="text-sm text-muted-foreground">{template.description}</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadTemplate(template.id, template.name)}
                    disabled={isDownloading === template.id}
                    data-testid={`button-download-${template.id}`}
                  >
                    {isDownloading === template.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Custom Templates
            </CardTitle>
            <CardDescription>
              Templates you've uploaded. Set one as active for each type to use in offers.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : customTemplates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No custom templates uploaded yet.</p>
                <p className="text-sm">Click "Upload Custom Template" to add your own.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {customTemplates.map((template) => (
                  <div 
                    key={template.id}
                    className={`flex items-center justify-between p-4 rounded-lg border ${
                      template.isActive ? 'bg-muted/10 border-border/30' : 'bg-card'
                    }`}
                    data-testid={`custom-template-${template.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${template.isActive ? 'bg-muted/20' : 'bg-primary/10'}`}>
                        <FileText className={`w-5 h-5 ${template.isActive ? 'text-foreground' : 'text-primary'}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{template.name}</h4>
                          {template.isActive === 1 && (
                            <Badge className="bg-muted/20 text-foreground border-border/30">
                              <Star className="w-3 h-3 mr-1" />
                              Active
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-xs">
                            {TEMPLATE_TYPES.find(t => t.value === template.templateType)?.label || template.templateType}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span>{template.originalFilename}</span>
                          <span>{formatFileSize(template.fileSize)}</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(template.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {template.isActive !== 1 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => activateMutation.mutate(template.id)}
                          disabled={activateMutation.isPending}
                          data-testid={`button-activate-${template.id}`}
                        >
                          {activateMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4" />
                          )}
                          <span className="ml-1">Set Active</span>
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive dark:hover:text-destructive hover:bg-destructive/10"
                        onClick={() => deleteMutation.mutate(template.id)}
                        disabled={deleteMutation.isPending}
                        data-testid={`button-delete-${template.id}`}
                      >
                        {deleteMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
