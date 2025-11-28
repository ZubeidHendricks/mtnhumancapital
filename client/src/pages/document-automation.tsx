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
  FolderOpen
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
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-2">
                      {cvDocuments.map((doc) => (
                        <div 
                          key={doc.id}
                          className="flex items-center justify-between p-4 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-colors"
                          data-testid={`card-document-${doc.id}`}
                        >
                          <div className="flex items-center gap-4">
                            <div className="p-2 rounded bg-zinc-700/50">
                              <File className="h-5 w-5 text-zinc-400" />
                            </div>
                            <div>
                              <p className="font-medium text-white">{doc.originalFilename}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-zinc-500">{formatFileSize(doc.fileSize)}</span>
                                <span className="text-zinc-600">•</span>
                                <span className="text-xs text-zinc-500">
                                  {new Date(doc.createdAt).toLocaleDateString()}
                                </span>
                                {doc.linkedCandidateId && (
                                  <>
                                    <span className="text-zinc-600">•</span>
                                    <span className="text-xs text-green-400">Candidate created</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={getStatusBadge(doc.status)}>
                              {getStatusIcon(doc.status)}
                              <span className="ml-1 capitalize">{doc.status}</span>
                            </Badge>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => setSelectedDocument(doc)}
                              data-testid={`button-view-document-${doc.id}`}
                            >
                              <Eye className="h-4 w-4" />
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
                      ))}
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
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-zinc-500 mb-1">Status</p>
                  <Badge className={getStatusBadge(selectedDocument.status)}>
                    {getStatusIcon(selectedDocument.status)}
                    <span className="ml-1 capitalize">{selectedDocument.status}</span>
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 mb-1">File Size</p>
                  <p className="text-white">{formatFileSize(selectedDocument.fileSize)}</p>
                </div>
              </div>

              {selectedDocument.linkedCandidateId && (
                <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <p className="text-sm text-green-400">
                    ✓ Candidate created from this document
                  </p>
                </div>
              )}

              {selectedDocument.extractedData && (
                <div>
                  <p className="text-sm font-medium text-white mb-2">Extracted Data</p>
                  <div className="p-4 bg-zinc-800 rounded-lg">
                    <pre className="text-xs text-zinc-300 whitespace-pre-wrap overflow-x-auto">
                      {JSON.stringify(selectedDocument.extractedData, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {selectedDocument.rawText && (
                <div>
                  <p className="text-sm font-medium text-white mb-2">Raw Text (Preview)</p>
                  <ScrollArea className="h-48 p-4 bg-zinc-800 rounded-lg">
                    <p className="text-xs text-zinc-400 whitespace-pre-wrap">
                      {selectedDocument.rawText.slice(0, 2000)}
                      {selectedDocument.rawText.length > 2000 && "..."}
                    </p>
                  </ScrollArea>
                </div>
              )}

              {selectedDocument.errorMessage && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-sm text-red-400">{selectedDocument.errorMessage}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
