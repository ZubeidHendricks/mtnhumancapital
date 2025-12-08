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
  received: { label: "Received", color: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: <Clock className="h-3 w-3" /> },
  verified: { label: "Verified", color: "bg-green-500/20 text-green-400 border-green-500/30", icon: <CheckCircle className="h-3 w-3" /> },
  rejected: { label: "Rejected", color: "bg-red-500/20 text-red-400 border-red-500/30", icon: <XCircle className="h-3 w-3" /> },
  expired: { label: "Expired", color: "bg-orange-500/20 text-orange-400 border-orange-500/30", icon: <AlertCircle className="h-3 w-3" /> },
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
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800">
      <div className="p-6 max-w-[1600px] mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/hr-dashboard">
            <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3" data-testid="text-page-title">
              <FileCheck className="h-7 w-7 text-purple-400" />
              Document Library
            </h1>
            <p className="text-zinc-400 text-sm mt-1">
              Access and manage all uploaded candidate documents
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-zinc-800/50 border-zinc-700/50">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <FileText className="h-6 w-6 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white" data-testid="stat-total">{stats.total}</p>
                <p className="text-zinc-400 text-sm">Total Documents</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-zinc-800/50 border-zinc-700/50">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white" data-testid="stat-verified">{stats.verified}</p>
                <p className="text-zinc-400 text-sm">Verified</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-zinc-800/50 border-zinc-700/50">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Clock className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white" data-testid="stat-pending">{stats.pending}</p>
                <p className="text-zinc-400 text-sm">Pending Review</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-zinc-800/50 border-zinc-700/50">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
                <XCircle className="h-6 w-6 text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white" data-testid="stat-rejected">{stats.rejected}</p>
                <p className="text-zinc-400 text-sm">Rejected</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-zinc-800/50 border-zinc-700/50">
          <CardHeader className="border-b border-zinc-700/50">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <CardTitle className="text-white flex items-center gap-2">
                <Shield className="h-5 w-5 text-purple-400" />
                All Documents
              </CardTitle>
              
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <Input
                    placeholder="Search documents..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 bg-zinc-900/50 border-zinc-700 text-white"
                    data-testid="input-search"
                  />
                </div>
                
                <Select value={documentTypeFilter} onValueChange={setDocumentTypeFilter}>
                  <SelectTrigger className="w-[160px] bg-zinc-900/50 border-zinc-700 text-white" data-testid="select-document-type">
                    <SelectValue placeholder="Document Type" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    {documentTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value} className="text-white hover:bg-zinc-700">
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px] bg-zinc-900/50 border-zinc-700 text-white" data-testid="select-status">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    {statusOptions.map((status) => (
                      <SelectItem key={status.value} value={status.value} className="text-white hover:bg-zinc-700">
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => refetch()}
                  className="border-zinc-700 text-zinc-400 hover:text-white"
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
                <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
              </div>
            ) : documents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
                <FileWarning className="h-16 w-16 mb-4 opacity-50" />
                <p className="text-lg font-medium">No documents found</p>
                <p className="text-sm">Try adjusting your filters or search query</p>
              </div>
            ) : (
              <ScrollArea className="h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-zinc-700/50 hover:bg-transparent">
                      <TableHead className="text-zinc-400">Document</TableHead>
                      <TableHead className="text-zinc-400">Type</TableHead>
                      <TableHead className="text-zinc-400">Candidate</TableHead>
                      <TableHead className="text-zinc-400">Reference</TableHead>
                      <TableHead className="text-zinc-400">Status</TableHead>
                      <TableHead className="text-zinc-400">Source</TableHead>
                      <TableHead className="text-zinc-400">Uploaded</TableHead>
                      <TableHead className="text-zinc-400 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documents.map((doc) => {
                      const statusInfo = statusConfig[doc.status] || statusConfig.received;
                      return (
                        <TableRow 
                          key={doc.id} 
                          className="border-b border-zinc-800/50 hover:bg-zinc-800/30"
                          data-testid={`row-document-${doc.id}`}
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-indigo-500/20 flex items-center justify-center">
                                {getFileIcon(doc.mimeType)}
                              </div>
                              <div>
                                <p className="font-medium text-white truncate max-w-[200px]" title={doc.fileName}>
                                  {doc.fileName}
                                </p>
                                <p className="text-xs text-zinc-500">{formatFileSize(doc.fileSize)}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="border-purple-500/30 text-purple-300">
                              {documentTypeLabels[doc.documentType] || doc.documentType}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="h-3.5 w-3.5 text-zinc-500" />
                              <span className="text-zinc-300">{doc.candidateName || "Unknown"}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {doc.referenceCode ? (
                              <code className="text-xs bg-zinc-900 px-2 py-1 rounded text-cyan-400">
                                {doc.referenceCode}
                              </code>
                            ) : (
                              <span className="text-zinc-600">-</span>
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
                            <span className="text-zinc-400 text-sm">
                              {collectedViaLabels[doc.collectedVia] || doc.collectedVia}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5 text-zinc-400 text-sm">
                              <Calendar className="h-3.5 w-3.5" />
                              {new Date(doc.createdAt).toLocaleDateString()}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-zinc-400 hover:text-white"
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
                                className="h-8 w-8 text-zinc-400 hover:text-purple-400"
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
                                    className="h-8 w-8 text-zinc-400 hover:text-white"
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-zinc-800 border-zinc-700">
                                  <DropdownMenuItem
                                    className="text-green-400 hover:bg-zinc-700"
                                    onClick={() => verifyMutation.mutate({ id: doc.id, status: "verified" })}
                                  >
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Mark as Verified
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-red-400 hover:bg-zinc-700"
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
          <DialogContent className="bg-zinc-900 border-zinc-700 max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <FileText className="h-5 w-5 text-purple-400" />
                Document Details
              </DialogTitle>
            </DialogHeader>
            
            {selectedDocument && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-zinc-500">File Name</p>
                    <p className="text-white font-medium">{selectedDocument.fileName}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-zinc-500">Document Type</p>
                    <p className="text-white">
                      {documentTypeLabels[selectedDocument.documentType] || selectedDocument.documentType}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-zinc-500">Candidate</p>
                    <p className="text-white">{selectedDocument.candidateName || "Unknown"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-zinc-500">Status</p>
                    <Badge variant="outline" className={statusConfig[selectedDocument.status]?.color}>
                      {statusConfig[selectedDocument.status]?.label || selectedDocument.status}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-zinc-500">Reference Code</p>
                    <p className="text-cyan-400 font-mono">
                      {selectedDocument.referenceCode || "-"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-zinc-500">File Size</p>
                    <p className="text-white">{formatFileSize(selectedDocument.fileSize)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-zinc-500">Collected Via</p>
                    <p className="text-white">
                      {collectedViaLabels[selectedDocument.collectedVia] || selectedDocument.collectedVia}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-zinc-500">Uploaded On</p>
                    <p className="text-white">
                      {new Date(selectedDocument.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                
                {selectedDocument.candidateNote && (
                  <div className="space-y-1">
                    <p className="text-sm text-zinc-500">Candidate Note</p>
                    <p className="text-zinc-300 bg-zinc-800/50 p-3 rounded-lg">
                      {selectedDocument.candidateNote}
                    </p>
                  </div>
                )}
                
                {selectedDocument.aiVerification && (
                  <div className="space-y-2">
                    <p className="text-sm text-zinc-500">AI Verification</p>
                    <div className="bg-zinc-800/50 p-3 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        {selectedDocument.aiVerification.verified ? (
                          <Badge className="bg-green-500/20 text-green-400">AI Verified</Badge>
                        ) : (
                          <Badge className="bg-orange-500/20 text-orange-400">Needs Review</Badge>
                        )}
                        {selectedDocument.aiVerification.confidence && (
                          <span className="text-sm text-zinc-400">
                            Confidence: {Math.round(selectedDocument.aiVerification.confidence * 100)}%
                          </span>
                        )}
                      </div>
                      {selectedDocument.aiVerification.issues?.length > 0 && (
                        <ul className="text-sm text-zinc-400 list-disc list-inside">
                          {selectedDocument.aiVerification.issues.map((issue: string, i: number) => (
                            <li key={i}>{issue}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )}
                
                <div className="flex justify-end gap-3 pt-4 border-t border-zinc-700">
                  <Button
                    variant="outline"
                    className="border-zinc-600 text-zinc-300"
                    onClick={() => setShowPreview(false)}
                  >
                    Close
                  </Button>
                  <Button
                    className="bg-purple-600 hover:bg-purple-700 text-white"
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
