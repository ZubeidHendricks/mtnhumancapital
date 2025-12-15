import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Navbar } from "@/components/layout/navbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
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
  Loader2
} from "lucide-react";
import type { CvTemplate } from "@shared/schema";

export default function CvTemplatesPage() {
  const queryClient = useQueryClient();
  const tenantKey = useTenantQueryKey();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const { data: templates = [], isLoading } = useQuery<CvTemplate[]>({
    queryKey: [...tenantKey, "cv-templates"],
    queryFn: async () => {
      const response = await fetch("/api/cv-templates");
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
        const response = await fetch("/api/cv-templates/upload", {
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
      queryClient.invalidateQueries({ queryKey: [...tenantKey, "cv-templates"] });
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
      const response = await fetch(`/api/cv-templates/${id}/activate`, {
        method: "PATCH",
      });
      if (!response.ok) throw new Error("Failed to activate template");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...tenantKey, "cv-templates"] });
      toast.success("Template activated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/cv-templates/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete template");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...tenantKey, "cv-templates"] });
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

  const handleUpload = () => {
    if (!selectedFile) return;
    
    const formData = new FormData();
    formData.append("template", selectedFile);
    formData.append("name", templateName || selectedFile.name);
    uploadMutation.mutate(formData);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType === "application/pdf") {
      return <FileText className="w-8 h-8 text-red-400" />;
    }
    return <FileType className="w-8 h-8 text-blue-400" />;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20 pb-16">
        <div className="container mx-auto px-4 md:px-6 py-8">
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold" data-testid="text-page-title">CV Templates</h1>
                <p className="text-muted-foreground mt-1">
                  Upload and manage CV templates for AI-powered CV formatting
                </p>
              </div>
              
              <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-upload-template" className="gap-2">
                    <Upload className="w-4 h-4" />
                    Upload Template
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Upload CV Template</DialogTitle>
                    <DialogDescription>
                      Upload a PDF or DOCX file to use as a CV template. The AI will use this template when formatting candidate CVs.
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

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : templates.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileText className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No templates yet</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    Upload your first CV template to get started with AI-powered CV formatting.
                  </p>
                  <Button 
                    onClick={() => setUploadDialogOpen(true)}
                    data-testid="button-upload-first-template"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Template
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {templates.map((template) => (
                  <Card 
                    key={template.id} 
                    className={`relative ${template.isActive ? 'ring-2 ring-green-500/50' : ''}`}
                    data-testid={`card-template-${template.id}`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          {getFileIcon(template.mimeType)}
                          <div className="min-w-0">
                            <CardTitle className="text-base truncate" data-testid={`text-template-name-${template.id}`}>
                              {template.name}
                            </CardTitle>
                            <CardDescription className="text-xs truncate">
                              {template.originalFilename}
                            </CardDescription>
                          </div>
                        </div>
                        {template.isActive ? (
                          <Badge className="bg-green-500/20 text-green-400 border-green-500/30" data-testid={`badge-active-${template.id}`}>
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground" data-testid={`badge-inactive-${template.id}`}>
                            <Clock className="w-3 h-3 mr-1" />
                            Inactive
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <span>Size: {formatFileSize(template.fileSize)}</span>
                          <span data-testid={`text-upload-date-${template.id}`}>
                            {format(new Date(template.createdAt), "MMM d, yyyy")}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {!template.isActive && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={() => activateMutation.mutate(template.id)}
                              disabled={activateMutation.isPending}
                              data-testid={`button-activate-${template.id}`}
                            >
                              {activateMutation.isPending ? (
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
                                  onClick={() => deleteMutation.mutate(template.id)}
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
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
