import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  FileText,
  Download,
  Search,
  Filter,
  Eye,
  MoreVertical,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  FileCheck,
  User,
  Calendar,
  ArrowLeft,
  RefreshCw,
  Loader2,
  Shield,
  FileWarning,
  File,
  Image,
} from "lucide-react";

type CandidateDocument = {
  id: string;
  tenantId: string | null;
  candidateId: string | null;
  requirementId: string | null;
  documentType: string;
  fileName: string;
  fileUrl: string;
  fileSize: number | null;
  mimeType: string | null;
  referenceCode: string | null;
  collectedVia: string;
  sourceMessageId: string | null;
  candidateNote: string | null;
  status: string;
  aiVerification: any;
  verifiedAt: Date | null;
  verifiedBy: string | null;
  expiresAt: Date | null;
  metadata: any;
  createdAt: Date;
  updatedAt: Date;
  candidateName?: string;
  candidateEmail?: string;
};

const documentTypeLabels: Record<string, string> = {
  cv: "CV / Resume",
  resume: "CV / Resume",
  id_document: "ID Document",
  police_clearance: "Police Clearance",
  qualification: "Qualification Certificate",
  reference: "Reference Letter",
  bank_confirmation: "Bank Confirmation",
  proof_of_address: "Proof of Address",
  work_permit: "Work Permit",
  passport: "Passport",
  drivers_license: "Driver's License",
  other: "Other Document",
};

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  received: { label: "Received", color: "bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30", icon: <Clock className="h-3 w-3" /> },
  verified: { label: "Verified", color: "bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30", icon: <CheckCircle className="h-3 w-3" /> },
  rejected: { label: "Rejected", color: "bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30", icon: <XCircle className="h-3 w-3" /> },
  expired: { label: "Expired", color: "bg-teal-600/20 text-teal-700 dark:text-teal-400 border-teal-600/30", icon: <AlertCircle className="h-3 w-3" /> },
};

const collectedViaLabels: Record<string, string> = {
  whatsapp: "WhatsApp",
  portal: "Portal Upload",
  manual: "Manual Upload",
  email: "Email",
};

function getFileIcon(mimeType: string | null) {
  if (!mimeType) return <File className="h-4 w-4" />;
  if (mimeType.startsWith("image/")) return <Image className="h-4 w-4" />;
  if (mimeType === "application/pdf") return <FileText className="h-4 w-4" />;
  return <File className="h-4 w-4" />;
}

function formatFileSize(bytes: number | null) {
  if (!bytes) return "Unknown";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentLibrary() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [documentTypeFilter, setDocumentTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedDocument, setSelectedDocument] = useState<CandidateDocument | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const { data: documents = [], isLoading, refetch } = useQuery<CandidateDocument[]>({
    queryKey: ["/api/candidate-documents", searchQuery, documentTypeFilter, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.set("search", searchQuery);
      if (documentTypeFilter !== "all") params.set("documentType", documentTypeFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      
      const response = await fetch(`/api/candidate-documents?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch documents");
      return response.json();
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await fetch(`/api/candidate-documents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          status,
          verifiedAt: status === 'verified' ? new Date().toISOString() : null,
          verifiedBy: status === 'verified' ? 'manual' : null,
        }),
      });
      if (!response.ok) throw new Error("Failed to update document");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/candidate-documents"] });
      toast.success("Document status updated");
      setSelectedDocument(null);
    },
    onError: () => {
      toast.error("Failed to update document status");
    },
  });

  const handleDownload = async (doc: CandidateDocument) => {
    try {
      const response = await fetch(`/api/candidate-documents/${doc.id}/download`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Download failed");
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success("Document downloaded successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to download document");
    }
  };

  const documentTypes = [
    { value: "all", label: "All Types" },
    { value: "cv", label: "CV / Resume" },
    { value: "id_document", label: "ID Document" },
    { value: "police_clearance", label: "Police Clearance" },
    { value: "qualification", label: "Qualification" },
    { value: "reference", label: "Reference" },
    { value: "bank_confirmation", label: "Bank Confirmation" },
    { value: "proof_of_address", label: "Proof of Address" },
    { value: "work_permit", label: "Work Permit" },
    { value: "passport", label: "Passport" },
    { value: "drivers_license", label: "Driver's License" },
    { value: "other", label: "Other" },
  ];

  const statusOptions = [
    { value: "all", label: "All Statuses" },
    { value: "received", label: "Received" },
    { value: "verified", label: "Verified" },
    { value: "rejected", label: "Rejected" },
    { value: "expired", label: "Expired" },
  ];

  const stats = {
    total: documents.length,
    verified: documents.filter(d => d.status === "verified").length,
    pending: documents.filter(d => d.status === "received").length,
    rejected: documents.filter(d => d.status === "rejected").length,
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="p-6 max-w-[1600px] mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/hr-dashboard">
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-3" data-testid="text-page-title">
              <FileCheck className="h-7 w-7 text-blue-600 dark:text-blue-400" />
              Document Library
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Access and manage all uploaded candidate documents
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-card border-border">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground" data-testid="stat-total">{stats.total}</p>
                <p className="text-muted-foreground text-sm">Total Documents</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-card border-border">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground" data-testid="stat-verified">{stats.verified}</p>
                <p className="text-muted-foreground text-sm">Verified</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-card border-border">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Clock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground" data-testid="stat-pending">{stats.pending}</p>
                <p className="text-muted-foreground text-sm">Pending Review</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-card border-border">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
                <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground" data-testid="stat-rejected">{stats.rejected}</p>
                <p className="text-muted-foreground text-sm">Rejected</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-card border-border">
          <CardHeader className="border-b border-border">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <CardTitle className="text-foreground flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                All Documents
              </CardTitle>
              
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search documents..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 bg-background border-border"
                    data-testid="input-search"
                  />
                </div>
                
                <Select value={documentTypeFilter} onValueChange={setDocumentTypeFilter}>
                  <SelectTrigger className="w-[160px] bg-background border-border" data-testid="select-document-type">
                    <SelectValue placeholder="Document Type" />
                  </SelectTrigger>
                  <SelectContent className="bg-muted border-border">
                    {documentTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value} className="hover:bg-muted">
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px] bg-background border-border" data-testid="select-status">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="bg-muted border-border">
                    {statusOptions.map((status) => (
                      <SelectItem key={status.value} value={status.value} className="hover:bg-muted">
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => refetch()}
                  className="border-border text-muted-foreground hover:text-foreground"
                  data-testid="button-refresh"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
              </div>
            ) : documents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <FileWarning className="h-16 w-16 mb-4 opacity-50" />
                <p className="text-lg font-medium">No documents found</p>
                <p className="text-sm">Try adjusting your filters or search query</p>
              </div>
            ) : (
              <ScrollArea className="h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-border/50 hover:bg-transparent">
                      <TableHead className="text-muted-foreground">Document</TableHead>
                      <TableHead className="text-muted-foreground">Type</TableHead>
                      <TableHead className="text-muted-foreground">Candidate</TableHead>
                      <TableHead className="text-muted-foreground">Reference</TableHead>
                      <TableHead className="text-muted-foreground">Status</TableHead>
                      <TableHead className="text-muted-foreground">Source</TableHead>
                      <TableHead className="text-muted-foreground">Uploaded</TableHead>
                      <TableHead className="text-muted-foreground text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documents.map((doc) => {
                      const statusInfo = statusConfig[doc.status] || statusConfig.received;
                      return (
                        <TableRow 
                          key={doc.id} 
                          className="border-b border-border/50 hover:bg-muted/30"
                          data-testid={`row-document-${doc.id}`}
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-indigo-500/20 flex items-center justify-center">
                                {getFileIcon(doc.mimeType)}
                              </div>
                              <div>
                                <p className="font-medium text-foreground truncate max-w-[200px]" title={doc.fileName}>
                                  {doc.fileName}
                                </p>
                                <p className="text-xs text-muted-foreground">{formatFileSize(doc.fileSize)}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="border-blue-500/30 text-blue-300">
                              {documentTypeLabels[doc.documentType] || doc.documentType}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-foreground">{doc.candidateName || "Unknown"}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {doc.referenceCode ? (
                              <code className="text-xs bg-background px-2 py-1 rounded text-cyan-600 dark:text-cyan-400">
                                {doc.referenceCode}
                              </code>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={statusInfo.color}>
                              <span className="flex items-center gap-1.5">
                                {statusInfo.icon}
                                {statusInfo.label}
                              </span>
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-muted-foreground text-sm">
                              {collectedViaLabels[doc.collectedVia] || doc.collectedVia}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
                              <Calendar className="h-3.5 w-3.5" />
                              {new Date(doc.createdAt).toLocaleDateString()}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                onClick={() => {
                                  setSelectedDocument(doc);
                                  setShowPreview(true);
                                }}
                                data-testid={`button-view-${doc.id}`}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-blue-600 dark:text-blue-400"
                                onClick={() => handleDownload(doc)}
                                data-testid={`button-download-${doc.id}`}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-muted border-border">
                                  <DropdownMenuItem
                                    className="text-green-600 dark:text-green-400 hover:bg-muted"
                                    onClick={() => verifyMutation.mutate({ id: doc.id, status: "verified" })}
                                  >
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Mark as Verified
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-red-600 dark:text-red-400 hover:bg-muted"
                                    onClick={() => verifyMutation.mutate({ id: doc.id, status: "rejected" })}
                                  >
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Mark as Rejected
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="bg-background border-border max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-foreground flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                Document Details
              </DialogTitle>
            </DialogHeader>
            
            {selectedDocument && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">File Name</p>
                    <p className="text-foreground font-medium">{selectedDocument.fileName}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Document Type</p>
                    <p className="text-foreground">
                      {documentTypeLabels[selectedDocument.documentType] || selectedDocument.documentType}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Candidate</p>
                    <p className="text-foreground">{selectedDocument.candidateName || "Unknown"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge variant="outline" className={statusConfig[selectedDocument.status]?.color}>
                      {statusConfig[selectedDocument.status]?.label || selectedDocument.status}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Reference Code</p>
                    <p className="text-cyan-600 dark:text-cyan-400 font-mono">
                      {selectedDocument.referenceCode || "-"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">File Size</p>
                    <p className="text-foreground">{formatFileSize(selectedDocument.fileSize)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Collected Via</p>
                    <p className="text-foreground">
                      {collectedViaLabels[selectedDocument.collectedVia] || selectedDocument.collectedVia}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Uploaded On</p>
                    <p className="text-foreground">
                      {new Date(selectedDocument.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                
                {selectedDocument.candidateNote && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Candidate Note</p>
                    <p className="text-foreground bg-muted/50 p-3 rounded-lg">
                      {selectedDocument.candidateNote}
                    </p>
                  </div>
                )}
                
                {selectedDocument.aiVerification && (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">AI Verification</p>
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        {selectedDocument.aiVerification.verified ? (
                          <Badge className="bg-green-500/20 text-green-600 dark:text-green-400">AI Verified</Badge>
                        ) : (
                          <Badge className="bg-teal-600/20 text-teal-700 dark:text-teal-400">Needs Review</Badge>
                        )}
                        {selectedDocument.aiVerification.confidence && (
                          <span className="text-sm text-muted-foreground">
                            Confidence: {Math.round(selectedDocument.aiVerification.confidence * 100)}%
                          </span>
                        )}
                      </div>
                      {selectedDocument.aiVerification.issues?.length > 0 && (
                        <ul className="text-sm text-muted-foreground list-disc list-inside">
                          {selectedDocument.aiVerification.issues.map((issue: string, i: number) => (
                            <li key={i}>{issue}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )}
                
                <div className="flex justify-end gap-3 pt-4 border-t border-border">
                  <Button
                    variant="outline"
                    className="border-border text-foreground"
                    onClick={() => setShowPreview(false)}
                  >
                    Close
                  </Button>
                  <Button
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={() => handleDownload(selectedDocument)}
                    data-testid="button-download-preview"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
