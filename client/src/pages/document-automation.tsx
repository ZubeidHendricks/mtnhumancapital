import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Navbar } from "@/components/layout/navbar";
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
  Sparkles
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
      toast.success("Document deleted");
    },
  });

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
        return <CheckCircle2 className="h-4 w-4 text-green-400" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-400" />;
      case "processing":
        return <Loader2 className="h-4 w-4 text-amber-400 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-zinc-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      processed: "bg-green-500/20 text-green-400 border-green-500/30",
      completed: "bg-green-500/20 text-green-400 border-green-500/30",
      failed: "bg-red-500/20 text-red-400 border-red-500/30",
      processing: "bg-amber-500/20 text-amber-400 border-amber-500/30",
      partially_completed: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
      uploaded: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    };
    return colors[status] || "bg-zinc-500/20 text-zinc-400 border-zinc-500/30";
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
      <Navbar />
      
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Document Automation</h1>
          <p className="text-zinc-400">Upload CVs and job specs for AI-powered extraction and processing</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-zinc-800/50 border border-zinc-700">
            <TabsTrigger value="upload" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400" data-testid="tab-upload">
              <Upload className="h-4 w-4 mr-2" />
              Upload
            </TabsTrigger>
            <TabsTrigger value="cvs" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400" data-testid="tab-cv-library">
              <Users className="h-4 w-4 mr-2" />
              CV Library
            </TabsTrigger>
            <TabsTrigger value="batches" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400" data-testid="tab-upload-history">
              <FolderOpen className="h-4 w-4 mr-2" />
              Upload History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card 
                className={`bg-zinc-900/50 border-2 border-dashed transition-colors cursor-pointer ${
                  dragOver && uploadType === "cvs" 
                    ? "border-amber-500 bg-amber-500/10" 
                    : "border-zinc-700 hover:border-amber-500/50"
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
                        <Users className="h-6 w-6 text-blue-400" />
                      </div>
                      <div>
                        <CardTitle className="text-lg text-white">Upload CVs</CardTitle>
                        <CardDescription>Bulk upload resumes for AI extraction</CardDescription>
                      </div>
                    </div>
                    {uploadType === "cvs" && (
                      <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Selected</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 border border-dashed border-zinc-700 rounded-lg">
                    <Upload className="h-12 w-12 text-zinc-500 mx-auto mb-4" />
                    <p className="text-zinc-400 mb-2">Drag & drop CV files here</p>
                    <p className="text-sm text-zinc-500 mb-4">PDF, DOC, DOCX, or TXT files</p>
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
                        className="border-zinc-600"
                        disabled={isUploading || uploadType !== "cvs"}
                        asChild
                        data-testid="button-browse-cv-files"
                      >
                        <span>Browse Files</span>
                      </Button>
                    </label>
                  </div>
                  <p className="text-xs text-zinc-500 mt-4 text-center">
                    AI will extract: Name, Contact, Skills, Experience, Education
                  </p>
                </CardContent>
              </Card>

              <Card 
                className={`bg-zinc-900/50 border-2 border-dashed transition-colors cursor-pointer ${
                  dragOver && uploadType === "job-specs" 
                    ? "border-amber-500 bg-amber-500/10" 
                    : "border-zinc-700 hover:border-amber-500/50"
                }`}
                onClick={() => setUploadType("job-specs")}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-full bg-purple-500/20">
                        <Briefcase className="h-6 w-6 text-purple-400" />
                      </div>
                      <div>
                        <CardTitle className="text-lg text-white">Upload Job Specs</CardTitle>
                        <CardDescription>Bulk upload job descriptions for role creation</CardDescription>
                      </div>
                    </div>
                    {uploadType === "job-specs" && (
                      <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Selected</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 border border-dashed border-zinc-700 rounded-lg">
                    <Upload className="h-12 w-12 text-zinc-500 mx-auto mb-4" />
                    <p className="text-zinc-400 mb-2">Drag & drop job spec files here</p>
                    <p className="text-sm text-zinc-500 mb-4">PDF, DOC, DOCX, or TXT files</p>
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
                        className="border-zinc-600"
                        disabled={isUploading || uploadType !== "job-specs"}
                        asChild
                        data-testid="button-browse-job-files"
                      >
                        <span>Browse Files</span>
                      </Button>
                    </label>
                  </div>
                  <p className="text-xs text-zinc-500 mt-4 text-center">
                    AI will extract: Title, Department, Requirements, Salary, Location
                  </p>
                </CardContent>
              </Card>
            </div>

            {isUploading && (
              <Card className="bg-zinc-900/50 border-zinc-700">
                <CardContent className="py-6">
                  <div className="flex items-center gap-4">
                    <Loader2 className="h-6 w-6 text-amber-400 animate-spin" />
                    <div className="flex-1">
                      <p className="text-white font-medium mb-2">Processing documents...</p>
                      <Progress value={uploadProgress} className="h-2" />
                    </div>
                    <span className="text-zinc-400">{uploadProgress}%</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="cvs" className="space-y-6">
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg text-white">CV Library</CardTitle>
                    <CardDescription>View and manage uploaded CVs</CardDescription>
                  </div>
                  <Badge variant="outline" className="border-zinc-600">
                    {cvDocuments.length} documents
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {documentsLoading ? (
                  <div className="text-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-amber-400 mx-auto" />
                  </div>
                ) : cvDocuments.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="h-16 w-16 text-zinc-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-zinc-300 mb-2">No CVs uploaded yet</h3>
                    <p className="text-zinc-500 mb-4">Upload CVs to see them here</p>
                    <Button 
                      variant="outline" 
                      className="border-amber-500/50 text-amber-400 hover:bg-amber-500/10"
                      onClick={() => setActiveTab("upload")}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload CVs
                    </Button>
                  </div>
                ) : (
                  <ScrollArea className="h-[600px]">
                    <div className="space-y-3">
                      {cvDocuments.map((doc) => {
                        const extracted = doc.extractedData as any;
                        return (
                          <div 
                            key={doc.id}
                            className="p-4 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-colors border border-zinc-700/50"
                            data-testid={`card-document-${doc.id}`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-4">
                                <div className="p-3 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30">
                                  <Users className="h-6 w-6 text-amber-400" />
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <p className="font-semibold text-white text-lg">
                                      {extracted?.fullName || doc.originalFilename}
                                    </p>
                                    <Badge className={getStatusBadge(doc.status)}>
                                      {getStatusIcon(doc.status)}
                                      <span className="ml-1 capitalize">{doc.status}</span>
                                    </Badge>
                                  </div>
                                  
                                  {extracted?.role && (
                                    <p className="text-amber-400 text-sm font-medium mb-2">{extracted.role}</p>
                                  )}
                                  
                                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-zinc-400 mb-3">
                                    {extracted?.email && (
                                      <span className="flex items-center gap-1">
                                        <Mail className="h-3 w-3" />
                                        {extracted.email}
                                      </span>
                                    )}
                                    {extracted?.phone && (
                                      <span className="flex items-center gap-1">
                                        <Phone className="h-3 w-3" />
                                        {extracted.phone}
                                      </span>
                                    )}
                                    {extracted?.location && (
                                      <span className="flex items-center gap-1">
                                        <MapPin className="h-3 w-3" />
                                        {extracted.location}
                                      </span>
                                    )}
                                    {extracted?.yearsOfExperience && (
                                      <span className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {extracted.yearsOfExperience} years exp
                                      </span>
                                    )}
                                  </div>
                                  
                                  {extracted?.skills && extracted.skills.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mb-2">
                                      {extracted.skills.slice(0, 6).map((skill: string, i: number) => (
                                        <Badge key={i} variant="outline" className="text-xs border-zinc-600 text-zinc-300">
                                          {skill}
                                        </Badge>
                                      ))}
                                      {extracted.skills.length > 6 && (
                                        <Badge variant="outline" className="text-xs border-zinc-600 text-zinc-400">
                                          +{extracted.skills.length - 6} more
                                        </Badge>
                                      )}
                                    </div>
                                  )}
                                  
                                  <div className="flex items-center gap-3 text-xs text-zinc-500">
                                    <span>{formatFileSize(doc.fileSize)}</span>
                                    <span>•</span>
                                    <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                                    {doc.linkedCandidateId && (
                                      <>
                                        <span>•</span>
                                        <span className="text-green-400 flex items-center gap-1">
                                          <CheckCircle2 className="h-3 w-3" />
                                          Candidate created
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => setSelectedDocument(doc)}
                                  className="border-zinc-600 text-zinc-300 hover:bg-zinc-700"
                                  data-testid={`button-view-document-${doc.id}`}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  View Details
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                  onClick={() => deleteMutation.mutate(doc.id)}
                                  data-testid={`button-delete-document-${doc.id}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="batches" className="space-y-6">
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg text-white">Upload History</CardTitle>
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
                    <FolderOpen className="h-16 w-16 text-zinc-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-zinc-300 mb-2">No upload history</h3>
                    <p className="text-zinc-500">Your upload batches will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {batches.map((batch) => (
                      <div 
                        key={batch.id}
                        className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            {batch.type === "cvs" ? (
                              <Users className="h-5 w-5 text-blue-400" />
                            ) : (
                              <Briefcase className="h-5 w-5 text-purple-400" />
                            )}
                            <div>
                              <p className="font-medium text-white">{batch.name}</p>
                              <p className="text-xs text-zinc-500">
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
                          <div className="flex items-center gap-1 text-zinc-400">
                            <FileText className="h-4 w-4" />
                            <span>{batch.totalDocuments} files</span>
                          </div>
                          <div className="flex items-center gap-1 text-green-400">
                            <CheckCircle2 className="h-4 w-4" />
                            <span>{batch.processedDocuments} processed</span>
                          </div>
                          {batch.failedDocuments > 0 && (
                            <div className="flex items-center gap-1 text-red-400">
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
        </Tabs>
      </div>

      <Dialog open={!!selectedDocument} onOpenChange={() => setSelectedDocument(null)}>
        <DialogContent className="max-w-3xl bg-zinc-900 border-zinc-700 max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <File className="h-5 w-5" />
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
                return (
                  <>
                    {/* Header with Status */}
                    <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge className={getStatusBadge(selectedDocument.status)}>
                          {getStatusIcon(selectedDocument.status)}
                          <span className="ml-1 capitalize">{selectedDocument.status}</span>
                        </Badge>
                        <span className="text-zinc-400 text-sm">{formatFileSize(selectedDocument.fileSize)}</span>
                      </div>
                      {selectedDocument.linkedCandidateId && (
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Candidate Created
                        </Badge>
                      )}
                    </div>

                    {data && (
                      <>
                        {/* Personal Information */}
                        <div className="space-y-3">
                          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                            <Users className="h-5 w-5 text-amber-400" />
                            Personal Information
                          </h3>
                          <div className="grid grid-cols-2 gap-4 p-4 bg-zinc-800/30 rounded-lg">
                            <div>
                              <p className="text-xs text-zinc-500 mb-1">Full Name</p>
                              <p className="text-white font-medium">{data.fullName || "N/A"}</p>
                            </div>
                            <div>
                              <p className="text-xs text-zinc-500 mb-1">Role/Title</p>
                              <p className="text-amber-400">{data.role || "N/A"}</p>
                            </div>
                            <div>
                              <p className="text-xs text-zinc-500 mb-1">Email</p>
                              <p className="text-white">{data.email || "N/A"}</p>
                            </div>
                            <div>
                              <p className="text-xs text-zinc-500 mb-1">Phone</p>
                              <p className="text-white">{data.phone || "N/A"}</p>
                            </div>
                            <div>
                              <p className="text-xs text-zinc-500 mb-1">Location</p>
                              <p className="text-white">{data.location || "N/A"}</p>
                            </div>
                            <div>
                              <p className="text-xs text-zinc-500 mb-1">Experience</p>
                              <p className="text-white">{data.yearsOfExperience ? `${data.yearsOfExperience} years` : "N/A"}</p>
                            </div>
                          </div>
                        </div>

                        {/* Summary */}
                        {data.summary && (
                          <div className="space-y-3">
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                              <Sparkles className="h-5 w-5 text-purple-400" />
                              Professional Summary
                            </h3>
                            <p className="text-zinc-300 text-sm leading-relaxed p-4 bg-zinc-800/30 rounded-lg">
                              {data.summary}
                            </p>
                          </div>
                        )}

                        {/* Skills */}
                        {data.skills && data.skills.length > 0 && (
                          <div className="space-y-3">
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                              <Award className="h-5 w-5 text-blue-400" />
                              Skills ({data.skills.length})
                            </h3>
                            <div className="flex flex-wrap gap-2 p-4 bg-zinc-800/30 rounded-lg">
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
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                              <Building2 className="h-5 w-5 text-green-400" />
                              Experience ({data.experience.length})
                            </h3>
                            <div className="space-y-3">
                              {data.experience.map((exp: any, i: number) => (
                                <div key={i} className="p-4 bg-zinc-800/30 rounded-lg border-l-2 border-green-500/50">
                                  <div className="flex items-start justify-between mb-2">
                                    <div>
                                      <p className="font-medium text-white">{exp.title}</p>
                                      <p className="text-amber-400 text-sm">{exp.company}</p>
                                    </div>
                                    <div className="text-right text-sm text-zinc-400">
                                      <p>{exp.duration}</p>
                                      {exp.location && <p>{exp.location}</p>}
                                    </div>
                                  </div>
                                  {exp.responsibilities && exp.responsibilities.length > 0 && (
                                    <ul className="text-sm text-zinc-300 space-y-1 mt-2">
                                      {exp.responsibilities.slice(0, 3).map((resp: string, j: number) => (
                                        <li key={j} className="flex items-start gap-2">
                                          <span className="text-green-400 mt-1">•</span>
                                          {resp}
                                        </li>
                                      ))}
                                      {exp.responsibilities.length > 3 && (
                                        <li className="text-zinc-500 text-xs">
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
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                              <GraduationCap className="h-5 w-5 text-orange-400" />
                              Education ({data.education.length})
                            </h3>
                            <div className="space-y-2">
                              {data.education.map((edu: any, i: number) => (
                                <div key={i} className="p-4 bg-zinc-800/30 rounded-lg border-l-2 border-orange-500/50">
                                  <p className="font-medium text-white">{edu.degree}</p>
                                  <p className="text-amber-400 text-sm">{edu.institution}</p>
                                  <div className="flex gap-3 text-sm text-zinc-400 mt-1">
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
                              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                                <Languages className="h-4 w-4 text-cyan-400" />
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
                              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                                <Award className="h-4 w-4 text-yellow-400" />
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
                        <p className="text-sm text-red-400">{selectedDocument.errorMessage}</p>
                      </div>
                    )}

                    {/* Raw Text Preview */}
                    {selectedDocument.rawText && (
                      <div className="space-y-2">
                        <h3 className="text-sm font-semibold text-white">Raw Text Preview</h3>
                        <ScrollArea className="h-32 p-3 bg-zinc-800/50 rounded-lg">
                          <p className="text-xs text-zinc-500 whitespace-pre-wrap">
                            {selectedDocument.rawText.slice(0, 1000)}
                            {selectedDocument.rawText.length > 1000 && "..."}
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
