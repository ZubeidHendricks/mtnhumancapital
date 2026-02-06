import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useTenantQueryKey } from "@/hooks/useTenant";
import { 
  Upload, 
  FileText, 
  Users, 
  Briefcase, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Loader2,
  File,
  Trash2,
  Eye,
  RefreshCw,
  FolderOpen,
  Mail,
  Phone,
  MapPin,
  GraduationCap,
  Building2,
  Award,
  Languages,
  Sparkles,
  ArrowRight,
  ExternalLink,
  FolderArchive,
  FileArchive,
  Linkedin,
  Grid3X3,
  List,
  Calendar,
  Globe,
  Target,
  Star,
  Download
} from "lucide-react";
import { toast } from "sonner";

interface Document {
  id: string;
  filename: string;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  type: string;
  status: string;
  rawText?: string;
  extractedData?: Record<string, unknown>;
  linkedJobId?: string;
  linkedCandidateId?: string;
  errorMessage?: string;
  createdAt: string;
}

interface DocumentBatch {
  id: string;
  name: string;
  type: string;
  status: string;
  totalDocuments: number;
  processedDocuments: number;
  failedDocuments: number;
  createdAt: string;
  documents?: Document[];
}

export default function DocumentAutomation() {
  const queryClient = useQueryClient();
  const documentsKey = useTenantQueryKey(["documents"]);
  const batchesKey = useTenantQueryKey(["document-batches"]);
  const cvsKey = useTenantQueryKey(["documents", "cv"]);
  
  const [activeTab, setActiveTab] = useState("upload");
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadType, setUploadType] = useState<"cvs" | "job-specs">("cvs");
  const [dragOver, setDragOver] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const { data: allDocuments = [], isLoading: documentsLoading } = useQuery<Document[]>({
    queryKey: documentsKey,
    queryFn: async () => {
      const res = await fetch("/api/documents");
      if (!res.ok) throw new Error("Failed to fetch documents");
      return res.json();
    },
  });

  const { data: cvDocuments = [] } = useQuery<Document[]>({
    queryKey: cvsKey,
    queryFn: async () => {
      const res = await fetch("/api/documents/type/cv");
      if (!res.ok) throw new Error("Failed to fetch CV documents");
      return res.json();
    },
  });

  const jobSpecsKey = useTenantQueryKey(["documents", "job_spec"]);
  const { data: jobSpecDocuments = [] } = useQuery<Document[]>({
    queryKey: jobSpecsKey,
    queryFn: async () => {
      const res = await fetch("/api/documents/type/job_spec");
      if (!res.ok) throw new Error("Failed to fetch job spec documents");
      return res.json();
    },
  });
  
  const [jobSpecViewMode, setJobSpecViewMode] = useState<"grid" | "list">("grid");

  const { data: batches = [] } = useQuery<DocumentBatch[]>({
    queryKey: batchesKey,
    queryFn: async () => {
      const res = await fetch("/api/document-batches");
      if (!res.ok) throw new Error("Failed to fetch batches");
      return res.json();
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ files, type }: { files: File[], type: "cvs" | "job-specs" }) => {
      const formData = new FormData();
      files.forEach(file => formData.append("files", file));
      
      const res = await fetch(`/api/documents/upload/${type}`, {
        method: "POST",
        body: formData,
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Upload failed");
      }
      
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: documentsKey });
      queryClient.invalidateQueries({ queryKey: batchesKey });
      queryClient.invalidateQueries({ queryKey: cvsKey });
      
      if (data.failed > 0) {
        toast.warning(`Uploaded ${data.processed} files, ${data.failed} failed`);
      } else {
        toast.success(`Successfully processed ${data.processed} files`);
      }
      
      setIsUploading(false);
      setUploadProgress(0);
    },
    onError: (error: Error) => {
      toast.error(error.message);
      setIsUploading(false);
      setUploadProgress(0);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete document");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentsKey });
      queryClient.invalidateQueries({ queryKey: cvsKey });
      queryClient.invalidateQueries({ queryKey: jobSpecsKey });
      toast.success("Document deleted");
    },
  });

  const [downloadingCvId, setDownloadingCvId] = useState<string | null>(null);
  
  const downloadCvTemplate = async (candidateId: string, candidateName: string) => {
    try {
      setDownloadingCvId(candidateId);
      toast.info("Generating CV template...");
      
      const res = await fetch(`/api/candidates/${candidateId}/cv-template`);
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to generate CV template");
      }
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Avatar_Human_Capital_-_CV_${candidateName.replace(/\s+/g, '_')}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success("CV template downloaded successfully!");
    } catch (error) {
      console.error("Download error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to download CV template");
    } finally {
      setDownloadingCvId(null);
    }
  };

  const zipUploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      
      const res = await fetch("/api/documents/upload/cvs-zip", {
        method: "POST",
        body: formData,
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "ZIP upload failed");
      }
      
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: documentsKey });
      queryClient.invalidateQueries({ queryKey: batchesKey });
      queryClient.invalidateQueries({ queryKey: cvsKey });
      
      if (data.failed > 0) {
        toast.warning(`Extracted ${data.totalPdfsFound} CVs from ZIP: ${data.processed} processed, ${data.failed} failed`);
      } else {
        toast.success(`Successfully processed ${data.processed} CVs from ZIP file`);
      }
      
      setIsUploading(false);
      setUploadProgress(0);
    },
    onError: (error: Error) => {
      toast.error(error.message);
      setIsUploading(false);
      setUploadProgress(0);
    },
  });

  const jobSpecZipUploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      
      const res = await fetch("/api/documents/upload/job-specs-zip", {
        method: "POST",
        body: formData,
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "ZIP upload failed");
      }
      
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: documentsKey });
      queryClient.invalidateQueries({ queryKey: batchesKey });
      queryClient.invalidateQueries({ queryKey: jobSpecsKey });
      
      if (data.failed > 0) {
        toast.warning(`Extracted ${data.totalDocsFound} job specs from ZIP: ${data.processed} processed, ${data.failed} failed`);
      } else {
        toast.success(`Successfully processed ${data.processed} job specs from ZIP file`);
      }
      
      setIsUploading(false);
      setUploadProgress(0);
    },
    onError: (error: Error) => {
      toast.error(error.message);
      setIsUploading(false);
      setUploadProgress(0);
    },
  });

  const handleZipUpload = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const zipFile = fileArray.find(f => f.name.toLowerCase().endsWith('.zip'));
    
    if (!zipFile) {
      toast.error("Please select a ZIP file");
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);

    const progressInterval = setInterval(() => {
      setUploadProgress(prev => Math.min(prev + 5, 90));
    }, 500);

    await zipUploadMutation.mutateAsync(zipFile);
    
    clearInterval(progressInterval);
    setUploadProgress(100);
  }, [zipUploadMutation]);

  const handleJobSpecZipUpload = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const zipFile = fileArray.find(f => f.name.toLowerCase().endsWith('.zip'));
    
    if (!zipFile) {
      toast.error("Please select a ZIP file");
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);

    const progressInterval = setInterval(() => {
      setUploadProgress(prev => Math.min(prev + 5, 90));
    }, 500);

    await jobSpecZipUploadMutation.mutateAsync(zipFile);
    
    clearInterval(progressInterval);
    setUploadProgress(100);
  }, [jobSpecZipUploadMutation]);

  const handleFileUpload = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(f => 
      f.type === "application/pdf" || 
      f.type === "text/plain" ||
      f.name.endsWith(".doc") ||
      f.name.endsWith(".docx")
    );

    if (validFiles.length === 0) {
      toast.error("Please upload PDF, DOC, or TXT files");
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => Math.min(prev + 10, 90));
    }, 500);

    await uploadMutation.mutateAsync({ files: validFiles, type: uploadType });
    
    clearInterval(progressInterval);
    setUploadProgress(100);
  }, [uploadType, uploadMutation]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileUpload(e.dataTransfer.files);
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "processed":
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />;
      case "processing":
        return <Loader2 className="h-4 w-4 text-amber-600 dark:text-amber-400 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      processed: "bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30",
      completed: "bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30",
      failed: "bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30",
      processing: "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30",
      partially_completed: "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/30",
      uploaded: "bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30",
    };
    return colors[status] || "bg-muted text-muted-foreground border-border";
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <div className="min-h-screen bg-background">
      
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Document Automation</h1>
          <p className="text-muted-foreground">Upload CVs and job specs for AI-powered extraction and processing</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-muted border border-border">
            <TabsTrigger value="upload" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-600 dark:text-amber-400" data-testid="tab-upload">
              <Upload className="h-4 w-4 mr-2" />
              Upload
            </TabsTrigger>
            <TabsTrigger value="cvs" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-600 dark:text-amber-400" data-testid="tab-cv-library">
              <Users className="h-4 w-4 mr-2" />
              CV Library
            </TabsTrigger>
            <TabsTrigger value="job-specs" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-600 dark:text-amber-400" data-testid="tab-job-specs-library">
              <Briefcase className="h-4 w-4 mr-2" />
              Job Specs
            </TabsTrigger>
            <TabsTrigger value="batches" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-600 dark:text-amber-400" data-testid="tab-upload-history">
              <FolderOpen className="h-4 w-4 mr-2" />
              Upload History
            </TabsTrigger>
            <TabsTrigger value="templates" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-600 dark:text-amber-400" data-testid="tab-templates">
              <FileText className="h-4 w-4 mr-2" />
              Templates
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card 
                className={`bg-card border-2 border-dashed transition-colors cursor-pointer ${
                  dragOver && uploadType === "cvs" 
                    ? "border-amber-500 bg-amber-500/10" 
                    : "border-border hover:border-amber-500/50"
                }`}
                onClick={() => setUploadType("cvs")}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-full bg-blue-500/20">
                        <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Upload CVs</CardTitle>
                        <CardDescription>Bulk upload resumes for AI extraction</CardDescription>
                      </div>
                    </div>
                    {uploadType === "cvs" && (
                      <Badge className="bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30">Selected</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 border border-dashed border-border rounded-lg">
                    <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-2">Drag & drop CV files here</p>
                    <p className="text-sm text-muted-foreground mb-4">PDF, DOC, DOCX, or TXT files</p>
                    <label>
                      <input
                        type="file"
                        multiple
                        accept=".pdf,.doc,.docx,.txt"
                        className="hidden"
                        onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                        disabled={isUploading || uploadType !== "cvs"}
                      />
                      <Button 
                        variant="outline" 
                        disabled={isUploading || uploadType !== "cvs"}
                        asChild
                        data-testid="button-browse-cv-files"
                      >
                        <span>Browse Files</span>
                      </Button>
                    </label>
                  </div>
                  <p className="text-xs text-muted-foreground mt-4 text-center">
                    AI will extract: Name, Contact, Skills, Experience, Education
                  </p>
                </CardContent>
              </Card>

              <Card 
                className={`bg-card border-2 border-dashed transition-colors cursor-pointer ${
                  dragOver && uploadType === "job-specs" 
                    ? "border-amber-500 bg-amber-500/10" 
                    : "border-border hover:border-amber-500/50"
                }`}
                onClick={() => setUploadType("job-specs")}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-full bg-blue-500/20">
                        <Briefcase className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Upload Job Specs</CardTitle>
                        <CardDescription>Bulk upload job descriptions for role creation</CardDescription>
                      </div>
                    </div>
                    {uploadType === "job-specs" && (
                      <Badge className="bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30">Selected</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 border border-dashed border-border rounded-lg">
                    <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-2">Drag & drop job spec files here</p>
                    <p className="text-sm text-muted-foreground mb-4">PDF, DOC, DOCX, or TXT files</p>
                    <label>
                      <input
                        type="file"
                        multiple
                        accept=".pdf,.doc,.docx,.txt"
                        className="hidden"
                        onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                        disabled={isUploading || uploadType !== "job-specs"}
                      />
                      <Button 
                        variant="outline" 
                        disabled={isUploading || uploadType !== "job-specs"}
                        asChild
                        data-testid="button-browse-job-files"
                      >
                        <span>Browse Files</span>
                      </Button>
                    </label>
                  </div>
                  <p className="text-xs text-muted-foreground mt-4 text-center">
                    AI will extract: Title, Department, Requirements, Salary, Location
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* ZIP Upload Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-card border-border">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-full bg-blue-500/20">
                      <FileArchive className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Bulk CV Upload</CardTitle>
                      <CardDescription>Upload a ZIP file containing multiple CVs</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-6 border border-dashed border-blue-500/30 rounded-lg bg-blue-500/5">
                    <Users className="h-10 w-10 text-blue-600 dark:text-blue-400 mx-auto mb-3" />
                    <p className="text-muted-foreground mb-2 text-sm">Upload ZIP with CV PDFs</p>
                    <p className="text-xs text-muted-foreground mb-4">All PDFs will be extracted and candidates created</p>
                    <label>
                      <input
                        type="file"
                        accept=".zip,application/zip,application/x-zip-compressed"
                        className="hidden"
                        onChange={(e) => e.target.files && handleZipUpload(e.target.files)}
                        disabled={isUploading}
                      />
                      <Button 
                        variant="outline" 
                        className="border-blue-500/50 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10"
                        disabled={isUploading}
                        asChild
                        data-testid="button-browse-cv-zip"
                      >
                        <span>
                          <FileArchive className="h-4 w-4 mr-2" />
                          Select CV ZIP
                        </span>
                      </Button>
                    </label>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-full bg-blue-500/20">
                      <FileArchive className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Bulk Job Specs Upload</CardTitle>
                      <CardDescription>Upload a ZIP file containing multiple job specs</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-6 border border-dashed border-blue-500/30 rounded-lg bg-blue-500/5">
                    <Briefcase className="h-10 w-10 text-blue-600 dark:text-blue-400 mx-auto mb-3" />
                    <p className="text-muted-foreground mb-2 text-sm">Upload ZIP with job spec documents</p>
                    <p className="text-xs text-muted-foreground mb-4">PDF, DOC, DOCX, TXT files will be processed</p>
                    <label>
                      <input
                        type="file"
                        accept=".zip,application/zip,application/x-zip-compressed"
                        className="hidden"
                        onChange={(e) => e.target.files && handleJobSpecZipUpload(e.target.files)}
                        disabled={isUploading}
                      />
                      <Button 
                        variant="outline" 
                        className="border-blue-500/50 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10"
                        disabled={isUploading}
                        asChild
                        data-testid="button-browse-job-spec-zip"
                      >
                        <span>
                          <FileArchive className="h-4 w-4 mr-2" />
                          Select Job Specs ZIP
                        </span>
                      </Button>
                    </label>
                  </div>
                </CardContent>
              </Card>
            </div>

            {isUploading && (
              <Card className="bg-card border-border">
                <CardContent className="py-6">
                  <div className="flex items-center gap-4">
                    <Loader2 className="h-6 w-6 text-amber-600 dark:text-amber-400 animate-spin" />
                    <div className="flex-1">
                      <p className="text-foreground font-medium mb-2">Processing documents...</p>
                      <Progress value={uploadProgress} className="h-2" />
                    </div>
                    <span className="text-muted-foreground">{uploadProgress}%</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="cvs" className="space-y-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Users className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                      CV Library
                    </CardTitle>
                    <CardDescription>Extracted candidate profiles from uploaded CVs</CardDescription>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center bg-muted rounded-lg p-1">
                      <Button
                        variant={viewMode === "grid" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setViewMode("grid")}
                        className={viewMode === "grid" ? "bg-amber-500/20 text-amber-600 dark:text-amber-400" : "text-muted-foreground"}
                      >
                        <Grid3X3 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={viewMode === "list" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setViewMode("list")}
                        className={viewMode === "list" ? "bg-amber-500/20 text-amber-600 dark:text-amber-400" : "text-muted-foreground"}
                      >
                        <List className="h-4 w-4" />
                      </Button>
                    </div>
                    <Badge variant="outline">
                      {cvDocuments.length} CVs
                    </Badge>
                    <Link href="/hr-dashboard">
                      <Button variant="outline" size="sm" className="border-amber-500/50 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10">
                        <Users className="h-4 w-4 mr-2" />
                        View All Candidates
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {documentsLoading ? (
                  <div className="text-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-amber-600 dark:text-amber-400 mx-auto" />
                  </div>
                ) : cvDocuments.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">No CVs uploaded yet</h3>
                    <p className="text-muted-foreground mb-4">Upload CVs to see them here</p>
                    <Button 
                      variant="outline" 
                      className="border-amber-500/50 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                      onClick={() => setActiveTab("upload")}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload CVs
                    </Button>
                  </div>
                ) : viewMode === "grid" ? (
                  <ScrollArea className="h-[650px]">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {cvDocuments.map((doc) => {
                        const extracted = doc.extractedData as any;
                        const initials = extracted?.fullName?.split(' ')?.map((n: string) => n[0])?.join('')?.toUpperCase() || '?';
                        return (
                          <div 
                            key={doc.id}
                            className="p-4 rounded-xl bg-card hover:bg-muted transition-all border border-border hover:border-amber-500/30 group"
                            data-testid={`card-document-${doc.id}`}
                          >
                            {/* Header with Avatar */}
                            <div className="flex items-start gap-3 mb-3">
                              <div className="relative">
                                {extracted?.photoUrl ? (
                                  <img 
                                    src={extracted.photoUrl} 
                                    alt={extracted.fullName || "Candidate"} 
                                    className="w-14 h-14 rounded-full object-cover border-2 border-amber-500/30"
                                  />
                                ) : (
                                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-500 to-teal-700 flex items-center justify-center text-foreground font-bold text-lg">
                                    {initials}
                                  </div>
                                )}
                                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-green-500 border-2 border-background flex items-center justify-center">
                                  <CheckCircle2 className="h-3 w-3 text-foreground" />
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-foreground truncate">
                                  {extracted?.fullName || doc.originalFilename}
                                </h3>
                                {extracted?.role && (
                                  <p className="text-amber-600 dark:text-amber-400 text-sm truncate">{extracted.role}</p>
                                )}
                              </div>
                            </div>

                            {/* Contact Info */}
                            <div className="space-y-1.5 mb-3">
                              {extracted?.location && (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <MapPin className="h-3 w-3 flex-shrink-0" />
                                  <span className="truncate">{extracted.location}</span>
                                </div>
                              )}
                              {extracted?.email && (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <Mail className="h-3 w-3 flex-shrink-0" />
                                  <span className="truncate">{extracted.email}</span>
                                </div>
                              )}
                              {extracted?.phone && (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <Phone className="h-3 w-3 flex-shrink-0" />
                                  <span>{extracted.phone}</span>
                                </div>
                              )}
                              {extracted?.linkedinUrl && (
                                <a 
                                  href={extracted.linkedinUrl.startsWith('http') ? extracted.linkedinUrl : `https://${extracted.linkedinUrl}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-300"
                                >
                                  <Linkedin className="h-3 w-3 flex-shrink-0" />
                                  <span className="truncate">LinkedIn Profile</span>
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                            </div>

                            {/* Skills */}
                            {extracted?.skills && extracted.skills.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-3">
                                {extracted.skills.slice(0, 3).map((skill: string, i: number) => (
                                  <Badge key={i} variant="outline" className="text-xs border-border text-foreground px-1.5 py-0">
                                    {skill}
                                  </Badge>
                                ))}
                                {extracted.skills.length > 3 && (
                                  <Badge variant="outline" className="text-xs border-border text-muted-foreground px-1.5 py-0">
                                    +{extracted.skills.length - 3}
                                  </Badge>
                                )}
                              </div>
                            )}

                            {/* Experience Summary */}
                            {extracted?.experience && extracted.experience.length > 0 && (
                              <div className="text-xs text-muted-foreground mb-3 p-2 bg-muted rounded-lg">
                                <div className="flex items-center gap-1 mb-1">
                                  <Briefcase className="h-3 w-3" />
                                  <span className="font-medium text-muted-foreground">Latest Role</span>
                                </div>
                                <p className="text-foreground truncate">{extracted.experience[0]?.title}</p>
                                <p className="text-muted-foreground truncate">{extracted.experience[0]?.company}</p>
                              </div>
                            )}

                            {/* Footer with Date and Actions */}
                            <div className="flex items-center justify-between pt-2 border-t border-border/50">
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(doc.createdAt).toLocaleDateString()}
                              </span>
                              <div className="flex items-center gap-1">
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => setSelectedDocument(doc)}
                                  className="h-7 px-2 text-muted-foreground hover:text-foreground"
                                  title="View Details"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                                {doc.linkedCandidateId && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => downloadCvTemplate(doc.linkedCandidateId!, extracted?.fullName || "Candidate")}
                                    disabled={downloadingCvId === doc.linkedCandidateId}
                                    className="h-7 px-2 text-green-600 dark:text-green-400 hover:text-green-300"
                                    title="Download CV Template"
                                    data-testid={`button-download-cv-${doc.id}`}
                                  >
                                    {downloadingCvId === doc.linkedCandidateId ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <Download className="h-3.5 w-3.5" />
                                    )}
                                  </Button>
                                )}
                                <Link href="/hr-dashboard">
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="h-7 px-2 text-amber-600 dark:text-amber-400 hover:text-amber-300"
                                    title="View in HR Dashboard"
                                  >
                                    <ArrowRight className="h-3.5 w-3.5" />
                                  </Button>
                                </Link>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  className="h-7 px-2 text-red-600 dark:text-red-400 hover:text-red-300"
                                  onClick={() => deleteMutation.mutate(doc.id)}
                                  title="Delete"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                ) : (
                  <ScrollArea className="h-[650px]">
                    <div className="rounded-lg border border-border overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-muted">
                          <tr>
                            <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Candidate</th>
                            <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Role</th>
                            <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Location</th>
                            <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Contact</th>
                            <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Skills</th>
                            <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Date</th>
                            <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-700/50">
                          {cvDocuments.map((doc) => {
                            const extracted = doc.extractedData as any;
                            const initials = extracted?.fullName?.split(' ')?.map((n: string) => n[0])?.join('')?.toUpperCase() || '?';
                            return (
                              <tr key={doc.id} className="hover:bg-muted" data-testid={`row-document-${doc.id}`}>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-teal-700 flex items-center justify-center text-foreground font-bold text-xs">
                                      {initials}
                                    </div>
                                    <span className="text-foreground font-medium text-sm">
                                      {extracted?.fullName || doc.originalFilename}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="text-amber-600 dark:text-amber-400 text-sm">{extracted?.role || '-'}</span>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="text-muted-foreground text-sm">{extracted?.location || '-'}</span>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    {extracted?.email && (
                                      <span title={extracted.email}>
                                        <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                                      </span>
                                    )}
                                    {extracted?.phone && (
                                      <span title={extracted.phone}>
                                        <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                                      </span>
                                    )}
                                    {extracted?.linkedinUrl && (
                                      <a href={extracted.linkedinUrl.startsWith('http') ? extracted.linkedinUrl : `https://${extracted.linkedinUrl}`} target="_blank" rel="noopener noreferrer" title="LinkedIn Profile">
                                        <Linkedin className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 hover:text-blue-300" />
                                      </a>
                                    )}
                                    {!extracted?.email && !extracted?.phone && !extracted?.linkedinUrl && (
                                      <span className="text-muted-foreground text-xs">-</span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex gap-1">
                                    {extracted?.skills?.slice(0, 2).map((skill: string, i: number) => (
                                      <Badge key={i} variant="outline" className="text-xs border-border text-muted-foreground px-1.5 py-0">
                                        {skill}
                                      </Badge>
                                    ))}
                                    {extracted?.skills?.length > 2 && (
                                      <span className="text-xs text-muted-foreground">+{extracted.skills.length - 2}</span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="text-muted-foreground text-xs">{new Date(doc.createdAt).toLocaleDateString()}</span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <Button variant="ghost" size="sm" onClick={() => setSelectedDocument(doc)} className="h-7 px-2 text-muted-foreground" title="View Details">
                                      <Eye className="h-3.5 w-3.5" />
                                    </Button>
                                    {doc.linkedCandidateId && (
                                      <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        onClick={() => downloadCvTemplate(doc.linkedCandidateId!, extracted?.fullName || "Candidate")}
                                        disabled={downloadingCvId === doc.linkedCandidateId}
                                        className="h-7 px-2 text-green-600 dark:text-green-400 hover:text-green-300"
                                        title="Download CV Template"
                                        data-testid={`button-download-cv-list-${doc.id}`}
                                      >
                                        {downloadingCvId === doc.linkedCandidateId ? (
                                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                          <Download className="h-3.5 w-3.5" />
                                        )}
                                      </Button>
                                    )}
                                    <Link href="/hr-dashboard">
                                      <Button variant="ghost" size="sm" className="h-7 px-2 text-amber-600 dark:text-amber-400" title="View in HR Dashboard">
                                        <ArrowRight className="h-3.5 w-3.5" />
                                      </Button>
                                    </Link>
                                    <Button variant="ghost" size="sm" className="h-7 px-2 text-red-600 dark:text-red-400" onClick={() => deleteMutation.mutate(doc.id)} title="Delete">
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="job-specs" className="space-y-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg text-foreground flex items-center gap-2">
                      <Briefcase className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      Job Specifications Library
                    </CardTitle>
                    <CardDescription>Extracted job requirements from uploaded specifications</CardDescription>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center bg-muted rounded-lg p-1">
                      <Button
                        variant={jobSpecViewMode === "grid" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setJobSpecViewMode("grid")}
                        className={jobSpecViewMode === "grid" ? "bg-blue-500/20 text-blue-600 dark:text-blue-400" : "text-muted-foreground"}
                      >
                        <Grid3X3 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={jobSpecViewMode === "list" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setJobSpecViewMode("list")}
                        className={jobSpecViewMode === "list" ? "bg-blue-500/20 text-blue-600 dark:text-blue-400" : "text-muted-foreground"}
                      >
                        <List className="h-4 w-4" />
                      </Button>
                    </div>
                    <Badge variant="outline" className="border-border">
                      {jobSpecDocuments.length} Jobs
                    </Badge>
                    <Link href="/recruitment-dashboard">
                      <Button variant="outline" size="sm" className="border-blue-500/50 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10">
                        <Briefcase className="h-4 w-4 mr-2" />
                        View Recruitment
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {documentsLoading ? (
                  <div className="text-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400 mx-auto" />
                  </div>
                ) : jobSpecDocuments.length === 0 ? (
                  <div className="text-center py-12">
                    <Briefcase className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">No job specs uploaded yet</h3>
                    <p className="text-muted-foreground mb-4">Upload job specifications to see them here</p>
                    <Button 
                      variant="outline" 
                      className="border-blue-500/50 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10"
                      onClick={() => setActiveTab("upload")}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Job Specs
                    </Button>
                  </div>
                ) : jobSpecViewMode === "grid" ? (
                  <ScrollArea className="h-[650px]">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {jobSpecDocuments.map((doc) => {
                        const extracted = doc.extractedData as any;
                        return (
                          <div 
                            key={doc.id}
                            className="p-4 rounded-xl bg-gradient-to-br from-zinc-800/80 to-zinc-900/80 hover:from-zinc-800 hover:to-zinc-900 transition-all border border-border/50 hover:border-blue-500/30 group"
                            data-testid={`card-job-spec-${doc.id}`}
                          >
                            <div className="flex items-start gap-3 mb-3">
                              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                                <Briefcase className="h-6 w-6 text-foreground" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-foreground truncate">
                                  {extracted?.title || extracted?.jobTitle || doc.originalFilename}
                                </h3>
                                {extracted?.company && (
                                  <p className="text-blue-600 dark:text-blue-400 text-sm truncate flex items-center gap-1">
                                    <Building2 className="h-3 w-3" />
                                    {extracted.company}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="space-y-1.5 mb-3">
                              {extracted?.location && (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <MapPin className="h-3 w-3 flex-shrink-0" />
                                  <span className="truncate">{extracted.location}</span>
                                </div>
                              )}
                              {extracted?.department && (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <Building2 className="h-3 w-3 flex-shrink-0" />
                                  <span className="truncate">{extracted.department}</span>
                                </div>
                              )}
                              {extracted?.employmentType && (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <Clock className="h-3 w-3 flex-shrink-0" />
                                  <span>{extracted.employmentType}</span>
                                </div>
                              )}
                              {(extracted?.salaryRange || extracted?.salary) && (
                                <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
                                  <Award className="h-3 w-3 flex-shrink-0" />
                                  <span>{extracted.salaryRange || extracted.salary}</span>
                                </div>
                              )}
                            </div>

                            {extracted?.requiredSkills && extracted.requiredSkills.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-3">
                                {extracted.requiredSkills.slice(0, 3).map((skill: string, i: number) => (
                                  <Badge key={i} variant="outline" className="text-xs border-blue-500/30 text-blue-300 px-1.5 py-0">
                                    {skill}
                                  </Badge>
                                ))}
                                {extracted.requiredSkills.length > 3 && (
                                  <Badge variant="outline" className="text-xs border-border text-muted-foreground px-1.5 py-0">
                                    +{extracted.requiredSkills.length - 3}
                                  </Badge>
                                )}
                              </div>
                            )}

                            {extracted?.experienceRequired && (
                              <div className="text-xs text-muted-foreground mb-3 p-2 bg-muted rounded-lg">
                                <div className="flex items-center gap-1 mb-1">
                                  <GraduationCap className="h-3 w-3" />
                                  <span className="font-medium text-muted-foreground">Experience Required</span>
                                </div>
                                <p className="text-foreground truncate">{extracted.experienceRequired}</p>
                              </div>
                            )}

                            <div className="flex items-center justify-between pt-2 border-t border-border/50">
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(doc.createdAt).toLocaleDateString()}
                              </span>
                              <div className="flex items-center gap-1">
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => setSelectedDocument(doc)}
                                  className="h-7 px-2 text-muted-foreground hover:text-foreground"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                                <Link href="/recruitment-dashboard">
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="h-7 px-2 text-blue-600 dark:text-blue-400 hover:text-blue-300"
                                  >
                                    <ArrowRight className="h-3.5 w-3.5" />
                                  </Button>
                                </Link>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  className="h-7 px-2 text-red-600 dark:text-red-400 hover:text-red-300"
                                  onClick={() => deleteMutation.mutate(doc.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                ) : (
                  <ScrollArea className="h-[650px]">
                    <div className="rounded-lg border border-border overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-muted">
                          <tr>
                            <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Job Title</th>
                            <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Company</th>
                            <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Location</th>
                            <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Type</th>
                            <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Required Skills</th>
                            <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Date</th>
                            <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-700/50">
                          {jobSpecDocuments.map((doc) => {
                            const extracted = doc.extractedData as any;
                            return (
                              <tr key={doc.id} className="hover:bg-muted" data-testid={`row-job-spec-${doc.id}`}>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                                      <Briefcase className="h-4 w-4 text-foreground" />
                                    </div>
                                    <span className="text-foreground font-medium text-sm">
                                      {extracted?.title || extracted?.jobTitle || doc.originalFilename}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="text-blue-600 dark:text-blue-400 text-sm">{extracted?.company || '-'}</span>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="text-muted-foreground text-sm">{extracted?.location || '-'}</span>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="text-muted-foreground text-sm">{extracted?.employmentType || '-'}</span>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex gap-1">
                                    {extracted?.requiredSkills?.slice(0, 2).map((skill: string, i: number) => (
                                      <Badge key={i} variant="outline" className="text-xs border-blue-500/30 text-blue-300 px-1.5 py-0">
                                        {skill}
                                      </Badge>
                                    ))}
                                    {extracted?.requiredSkills?.length > 2 && (
                                      <span className="text-xs text-muted-foreground">+{extracted.requiredSkills.length - 2}</span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="text-muted-foreground text-xs">{new Date(doc.createdAt).toLocaleDateString()}</span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <Button variant="ghost" size="sm" onClick={() => setSelectedDocument(doc)} className="h-7 px-2 text-muted-foreground">
                                      <Eye className="h-3.5 w-3.5" />
                                    </Button>
                                    <Link href="/recruitment-dashboard">
                                      <Button variant="ghost" size="sm" className="h-7 px-2 text-blue-600 dark:text-blue-400">
                                        <ArrowRight className="h-3.5 w-3.5" />
                                      </Button>
                                    </Link>
                                    <Button variant="ghost" size="sm" className="h-7 px-2 text-red-600 dark:text-red-400" onClick={() => deleteMutation.mutate(doc.id)}>
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="batches" className="space-y-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg text-foreground">Upload History</CardTitle>
                    <CardDescription>View past batch uploads and their status</CardDescription>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => queryClient.invalidateQueries({ queryKey: batchesKey })}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {batches.length === 0 ? (
                  <div className="text-center py-12">
                    <FolderOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">No upload history</h3>
                    <p className="text-muted-foreground">Your upload batches will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {batches.map((batch) => (
                      <div 
                        key={batch.id}
                        className="p-4 rounded-lg bg-muted border border-border"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            {batch.type === "cvs" ? (
                              <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            ) : (
                              <Briefcase className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            )}
                            <div>
                              <p className="font-medium text-foreground">{batch.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(batch.createdAt).toLocaleString()}
                              </p>
                            </div>
                          </div>
                          <Badge className={getStatusBadge(batch.status)}>
                            {getStatusIcon(batch.status)}
                            <span className="ml-1 capitalize">{batch.status.replace("_", " ")}</span>
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <FileText className="h-4 w-4" />
                            <span>{batch.totalDocuments} files</span>
                          </div>
                          <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                            <CheckCircle2 className="h-4 w-4" />
                            <span>{batch.processedDocuments} processed</span>
                          </div>
                          {batch.failedDocuments > 0 && (
                            <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
                              <XCircle className="h-4 w-4" />
                              <span>{batch.failedDocuments} failed</span>
                            </div>
                          )}
                        </div>
                        {batch.totalDocuments > 0 && (
                          <Progress 
                            value={(batch.processedDocuments / batch.totalDocuments) * 100} 
                            className="h-1 mt-3"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="templates" className="space-y-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-lg text-foreground">Document Templates</CardTitle>
                <CardDescription>Download templates for HR documents and onboarding materials</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <div className="p-4 rounded-lg bg-muted border border-border hover:border-green-500/50 transition-colors">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 rounded-lg bg-green-500/20">
                        <FileText className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <h4 className="font-medium text-foreground">Offer Letter</h4>
                        <p className="text-xs text-muted-foreground">Standard employment offer</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="w-full" data-testid="button-download-offer-letter">
                      <Download className="h-4 w-4 mr-2" />
                      Download Template
                    </Button>
                  </div>

                  <div className="p-4 rounded-lg bg-muted border border-border hover:border-blue-500/50 transition-colors">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 rounded-lg bg-blue-500/20">
                        <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <h4 className="font-medium text-foreground">Welcome Letter</h4>
                        <p className="text-xs text-muted-foreground">New employee welcome</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="w-full" data-testid="button-download-welcome-letter">
                      <Download className="h-4 w-4 mr-2" />
                      Download Template
                    </Button>
                  </div>

                  <div className="p-4 rounded-lg bg-muted border border-border hover:border-blue-500/50 transition-colors">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 rounded-lg bg-blue-500/20">
                        <FolderOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <h4 className="font-medium text-foreground">Employee Handbook</h4>
                        <p className="text-xs text-muted-foreground">Company policies & guidelines</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="w-full" data-testid="button-download-handbook">
                      <Download className="h-4 w-4 mr-2" />
                      Download Template
                    </Button>
                  </div>

                  <div className="p-4 rounded-lg bg-muted border border-border hover:border-amber-500/50 transition-colors">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 rounded-lg bg-amber-500/20">
                        <FileText className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div>
                        <h4 className="font-medium text-foreground">CV Template</h4>
                        <p className="text-xs text-muted-foreground">Branded CV format</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="w-full" data-testid="button-download-cv-template">
                      <Download className="h-4 w-4 mr-2" />
                      Download Template
                    </Button>
                  </div>

                  <div className="p-4 rounded-lg bg-muted border border-border hover:border-red-500/50 transition-colors">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 rounded-lg bg-red-500/20">
                        <FileText className="h-5 w-5 text-red-600 dark:text-red-400" />
                      </div>
                      <div>
                        <h4 className="font-medium text-foreground">NDA Agreement</h4>
                        <p className="text-xs text-muted-foreground">Non-disclosure template</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="w-full" data-testid="button-download-nda">
                      <Download className="h-4 w-4 mr-2" />
                      Download Template
                    </Button>
                  </div>

                  <div className="p-4 rounded-lg bg-muted border border-border hover:border-cyan-500/50 transition-colors">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 rounded-lg bg-cyan-500/20">
                        <FileText className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                      </div>
                      <div>
                        <h4 className="font-medium text-foreground">Employment Contract</h4>
                        <p className="text-xs text-muted-foreground">Standard contract template</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="w-full" data-testid="button-download-contract">
                      <Download className="h-4 w-4 mr-2" />
                      Download Template
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={!!selectedDocument} onOpenChange={() => setSelectedDocument(null)}>
        <DialogContent className="max-w-3xl bg-background border-border max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              {selectedDocument?.type === "job_spec" ? (
                <Briefcase className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              ) : (
                <File className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              )}
              {selectedDocument?.originalFilename}
            </DialogTitle>
            <DialogDescription>
              Uploaded on {selectedDocument && new Date(selectedDocument.createdAt).toLocaleString()}
            </DialogDescription>
          </DialogHeader>
          
          {selectedDocument && (
            <div className="space-y-6">
              {(() => {
                const data = selectedDocument.extractedData as any;
                const isJobSpec = selectedDocument.type === "job_spec";
                
                return (
                  <>
                    {/* Header with Status */}
                    <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge className={getStatusBadge(selectedDocument.status)}>
                          {getStatusIcon(selectedDocument.status)}
                          <span className="ml-1 capitalize">{selectedDocument.status}</span>
                        </Badge>
                        <span className="text-muted-foreground text-sm">{formatFileSize(selectedDocument.fileSize)}</span>
                      </div>
                      {selectedDocument.linkedCandidateId && (
                        <Badge className="bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Candidate Created
                        </Badge>
                      )}
                      {(selectedDocument as any).linkedJobId && (
                        <Badge className="bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Job Created
                        </Badge>
                      )}
                    </div>

                    {data && isJobSpec ? (
                      <>
                        {/* Job Information */}
                        <div className="space-y-3">
                          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                            <Briefcase className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            Job Information
                          </h3>
                          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Job Title</p>
                              <p className="text-foreground font-medium">{data.title || data.jobTitle || "N/A"}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Company</p>
                              <p className="text-blue-600 dark:text-blue-400">{data.company || "N/A"}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Department</p>
                              <p className="text-foreground">{data.department || "N/A"}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Location</p>
                              <p className="text-foreground">{data.location || "N/A"}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Employment Type</p>
                              <p className="text-foreground">{data.employmentType || "N/A"}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Salary Range</p>
                              <p className="text-green-600 dark:text-green-400">{data.salaryRange || data.salary || "N/A"}</p>
                            </div>
                          </div>
                        </div>

                        {/* Experience Required */}
                        {data.experienceRequired && (
                          <div className="space-y-3">
                            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                              <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                              Experience Required
                            </h3>
                            <p className="text-foreground text-sm leading-relaxed p-4 bg-muted/50 rounded-lg">
                              {data.experienceRequired}
                            </p>
                          </div>
                        )}

                        {/* Job Description */}
                        {data.description && (
                          <div className="space-y-3">
                            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                              <FileText className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                              Job Description
                            </h3>
                            <p className="text-foreground text-sm leading-relaxed p-4 bg-muted/50 rounded-lg whitespace-pre-wrap">
                              {data.description}
                            </p>
                          </div>
                        )}

                        {/* Required Skills */}
                        {data.requiredSkills && data.requiredSkills.length > 0 && (
                          <div className="space-y-3">
                            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                              <Award className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                              Required Skills ({data.requiredSkills.length})
                            </h3>
                            <div className="flex flex-wrap gap-2 p-4 bg-muted/50 rounded-lg">
                              {data.requiredSkills.map((skill: string, i: number) => (
                                <Badge key={i} className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                                  {skill}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Responsibilities */}
                        {data.responsibilities && data.responsibilities.length > 0 && (
                          <div className="space-y-3">
                            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                              <Target className="h-5 w-5 text-green-600 dark:text-green-400" />
                              Responsibilities ({data.responsibilities.length})
                            </h3>
                            <div className="p-4 bg-muted/50 rounded-lg">
                              <ul className="space-y-2">
                                {data.responsibilities.map((resp: string, i: number) => (
                                  <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                                    <span className="text-green-600 dark:text-green-400 mt-1">•</span>
                                    {resp}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        )}

                        {/* Qualifications */}
                        {data.qualifications && data.qualifications.length > 0 && (
                          <div className="space-y-3">
                            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                              <GraduationCap className="h-5 w-5 text-teal-700 dark:text-teal-400" />
                              Qualifications ({data.qualifications.length})
                            </h3>
                            <div className="p-4 bg-muted/50 rounded-lg">
                              <ul className="space-y-2">
                                {data.qualifications.map((qual: string, i: number) => (
                                  <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                                    <span className="text-teal-700 dark:text-teal-400 mt-1">•</span>
                                    {qual}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        )}

                        {/* Benefits */}
                        {data.benefits && data.benefits.length > 0 && (
                          <div className="space-y-3">
                            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                              <Star className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                              Benefits ({data.benefits.length})
                            </h3>
                            <div className="flex flex-wrap gap-2 p-4 bg-muted/50 rounded-lg">
                              {data.benefits.map((benefit: string, i: number) => (
                                <Badge key={i} variant="outline" className="text-xs border-yellow-500/30 text-yellow-300">
                                  {benefit}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    ) : data && (
                      <>
                        {/* Personal Information - For CVs */}
                        <div className="space-y-3">
                          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                            <Users className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                            Personal Information
                          </h3>
                          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Full Name</p>
                              <p className="text-foreground font-medium">{data.fullName || "N/A"}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Role/Title</p>
                              <p className="text-amber-600 dark:text-amber-400">{data.role || "N/A"}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Email</p>
                              <p className="text-foreground">{data.email || "N/A"}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Phone</p>
                              <p className="text-foreground">{data.phone || "N/A"}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Location</p>
                              <p className="text-foreground">{data.location || "N/A"}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Experience</p>
                              <p className="text-foreground">{data.yearsOfExperience ? `${data.yearsOfExperience} years` : "N/A"}</p>
                            </div>
                          </div>
                        </div>

                        {/* Summary */}
                        {data.summary && (
                          <div className="space-y-3">
                            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                              <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                              Professional Summary
                            </h3>
                            <p className="text-foreground text-sm leading-relaxed p-4 bg-muted/50 rounded-lg">
                              {data.summary}
                            </p>
                          </div>
                        )}

                        {/* Skills */}
                        {data.skills && data.skills.length > 0 && (
                          <div className="space-y-3">
                            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                              <Award className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                              Skills ({data.skills.length})
                            </h3>
                            <div className="flex flex-wrap gap-2 p-4 bg-muted/50 rounded-lg">
                              {data.skills.map((skill: string, i: number) => (
                                <Badge key={i} className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                                  {skill}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Experience */}
                        {data.experience && data.experience.length > 0 && (
                          <div className="space-y-3">
                            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                              <Building2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                              Experience ({data.experience.length})
                            </h3>
                            <div className="space-y-3">
                              {data.experience.map((exp: any, i: number) => (
                                <div key={i} className="p-4 bg-muted/50 rounded-lg border-l-2 border-green-500/50">
                                  <div className="flex items-start justify-between mb-2">
                                    <div>
                                      <p className="font-medium text-foreground">{exp.title}</p>
                                      <p className="text-amber-600 dark:text-amber-400 text-sm">{exp.company}</p>
                                    </div>
                                    <div className="text-right text-sm text-muted-foreground">
                                      <p>{exp.duration}</p>
                                      {exp.location && <p>{exp.location}</p>}
                                    </div>
                                  </div>
                                  {exp.responsibilities && exp.responsibilities.length > 0 && (
                                    <ul className="text-sm text-foreground space-y-1 mt-2">
                                      {exp.responsibilities.slice(0, 3).map((resp: string, j: number) => (
                                        <li key={j} className="flex items-start gap-2">
                                          <span className="text-green-600 dark:text-green-400 mt-1">•</span>
                                          {resp}
                                        </li>
                                      ))}
                                      {exp.responsibilities.length > 3 && (
                                        <li className="text-muted-foreground text-xs">
                                          +{exp.responsibilities.length - 3} more responsibilities
                                        </li>
                                      )}
                                    </ul>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Education */}
                        {data.education && data.education.length > 0 && (
                          <div className="space-y-3">
                            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                              <GraduationCap className="h-5 w-5 text-teal-700 dark:text-teal-400" />
                              Education ({data.education.length})
                            </h3>
                            <div className="space-y-2">
                              {data.education.map((edu: any, i: number) => (
                                <div key={i} className="p-4 bg-muted/50 rounded-lg border-l-2 border-teal-600/50">
                                  <p className="font-medium text-foreground">{edu.degree}</p>
                                  <p className="text-amber-600 dark:text-amber-400 text-sm">{edu.institution}</p>
                                  <div className="flex gap-3 text-sm text-muted-foreground mt-1">
                                    {edu.year && <span>{edu.year}</span>}
                                    {edu.location && <span>• {edu.location}</span>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Languages & Certifications */}
                        <div className="grid grid-cols-2 gap-4">
                          {data.languages && data.languages.length > 0 && (
                            <div className="space-y-2">
                              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                                <Languages className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                                Languages
                              </h3>
                              <div className="flex flex-wrap gap-1">
                                {data.languages.map((lang: string, i: number) => (
                                  <Badge key={i} variant="outline" className="text-xs border-cyan-500/30 text-cyan-300">
                                    {lang}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          {data.certifications && data.certifications.length > 0 && (
                            <div className="space-y-2">
                              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                                <Award className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                                Certifications
                              </h3>
                              <div className="flex flex-wrap gap-1">
                                {data.certifications.map((cert: string, i: number) => (
                                  <Badge key={i} variant="outline" className="text-xs border-yellow-500/30 text-yellow-300">
                                    {cert}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </>
                    )}

                    {/* Error Message */}
                    {selectedDocument.errorMessage && (
                      <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                        <p className="text-sm text-red-600 dark:text-red-400">{selectedDocument.errorMessage}</p>
                      </div>
                    )}

                    {/* Raw Text Preview */}
                    {selectedDocument.rawText && (
                      <div className="space-y-2">
                        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          Raw Text Preview
                        </h3>
                        <ScrollArea className="h-40 p-3 bg-muted rounded-lg">
                          <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                            {selectedDocument.rawText.slice(0, 2000)}
                            {selectedDocument.rawText.length > 2000 && "..."}
                          </p>
                        </ScrollArea>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
