import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Upload, CheckCircle, AlertCircle, Clock, Loader2, FileText, ShieldCheck, XCircle } from "lucide-react";
import { format } from "date-fns";

interface DocumentRequest {
  id: string;
  documentType: string;
  documentName: string;
  description: string | null;
  status: string;
  priority: string | null;
  isRequired: number;
  dueDate: string | null;
  receivedAt: string | null;
}

interface UploadPortalData {
  candidate: { id: string; fullName: string; role: string | null };
  workflow: { id: string; status: string };
  documentRequests: DocumentRequest[];
  tenantConfig: { companyName: string; primaryColor: string; logoUrl: string | null } | null;
  expiresAt: string;
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "verified":
      return <Badge className="bg-blue-100 text-blue-800"><ShieldCheck className="w-3 h-3 mr-1" /> Verified</Badge>;
    case "received":
      return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" /> Received</Badge>;
    case "rejected":
      return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Rejected</Badge>;
    case "overdue":
      return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" /> Overdue</Badge>;
    default:
      return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
  }
}

function PriorityBadge({ priority }: { priority: string | null }) {
  if (!priority || priority === "normal") return null;
  if (priority === "urgent") return <Badge className="bg-red-100 text-red-800 text-xs">Urgent</Badge>;
  if (priority === "high") return <Badge className="bg-orange-100 text-orange-800 text-xs">High</Badge>;
  if (priority === "low") return <Badge className="bg-gray-100 text-gray-600 text-xs">Low</Badge>;
  return null;
}

function DocumentCard({
  doc,
  token,
  onUploadSuccess,
}: {
  doc: DocumentRequest;
  token: string;
  onUploadSuccess: () => void;
}) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const canUpload = doc.status === "pending" || doc.status === "requested" || doc.status === "overdue" || doc.status === "rejected";

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/public/onboarding-upload/${token}/${doc.id}`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Upload failed");
      }
      toast({ title: "Document uploaded", description: `${doc.documentName} has been received successfully.` });
      onUploadSuccess();
    } catch (error: any) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <Card className={doc.status === "verified" ? "border-blue-200 bg-blue-50/30" : doc.status === "received" ? "border-green-200 bg-green-50/30" : ""}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="font-medium text-sm">{doc.documentName}</span>
              <StatusBadge status={doc.status} />
              <PriorityBadge priority={doc.priority} />
              {doc.isRequired ? (
                <Badge variant="outline" className="text-xs">Required</Badge>
              ) : null}
            </div>
            {doc.description && (
              <p className="text-xs text-muted-foreground mt-1 ml-6">{doc.description}</p>
            )}
            <div className="flex gap-3 mt-1 ml-6 text-xs text-muted-foreground">
              {doc.dueDate && (
                <span>Due: {format(new Date(doc.dueDate), "dd MMM yyyy")}</span>
              )}
              {doc.receivedAt && (
                <span>Received: {format(new Date(doc.receivedAt), "dd MMM yyyy 'at' HH:mm")}</span>
              )}
            </div>
          </div>
          <div className="shrink-0">
            {canUpload && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                  onChange={handleFileSelect}
                />
                <Button
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="bg-[#0d9488] hover:bg-[#0d9488]/90 text-white border-[#0d9488]"
                >
                  {uploading ? (
                    <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Uploading...</>
                  ) : (
                    <><Upload className="w-4 h-4 mr-1" /> Upload</>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function OnboardingUpload() {
  const { token } = useParams<{ token: string }>();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery<UploadPortalData>({
    queryKey: ["/api/public/onboarding-upload", token],
    queryFn: async () => {
      const res = await fetch(`/api/public/onboarding-upload/${token}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to load upload portal");
      }
      return res.json();
    },
    enabled: !!token,
    retry: false,
  });

  const handleUploadSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/public/onboarding-upload", token] });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="mt-3 text-muted-foreground">Loading upload portal...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !data) {
    const message = error instanceof Error ? error.message : "Upload portal not found";
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-destructive mb-3" />
            <h2 className="text-lg font-semibold mb-2">Unable to Load Portal</h2>
            <p className="text-muted-foreground text-sm">{message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { candidate, documentRequests, tenantConfig, expiresAt } = data;
  const completedCount = documentRequests.filter(d => d.status === "received" || d.status === "verified").length;
  const requiredDocs = documentRequests.filter(d => d.isRequired);
  const requiredCompleted = requiredDocs.filter(d => d.status === "received" || d.status === "verified").length;
  const allRequiredDone = requiredDocs.length > 0 && requiredCompleted === requiredDocs.length;
  const progressPct = documentRequests.length > 0 ? Math.round((completedCount / documentRequests.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#FFCC00] to-[#FFD700] text-black">
        <div className="max-w-2xl mx-auto px-4 py-8 text-center">
          {tenantConfig?.companyName && (
            <p className="text-black/70 text-sm mb-1">{tenantConfig.companyName}</p>
          )}
          <h1 className="text-2xl font-bold">Document Upload Portal</h1>
          <p className="text-black/80 mt-2">
            Welcome, {candidate.fullName}{candidate.role ? ` - ${candidate.role}` : ""}
          </p>
          {expiresAt && (
            <p className="text-black/60 text-xs mt-2">
              This link expires on {format(new Date(expiresAt), "dd MMM yyyy 'at' HH:mm")}
            </p>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Progress */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Upload Progress</span>
              <span className="text-sm text-muted-foreground">{completedCount} of {documentRequests.length} documents</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-gradient-to-r from-[#FFCC00] to-[#FFD700] h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* All done message */}
        {allRequiredDone && (
          <Card className="border-green-300 bg-green-50">
            <CardContent className="p-4 text-center">
              <CheckCircle className="w-10 h-10 mx-auto text-green-600 mb-2" />
              <h3 className="font-semibold text-green-800">All Required Documents Submitted</h3>
              <p className="text-sm text-green-700 mt-1">
                Thank you! Our HR team will review your documents shortly.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Document list */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Required Documents
          </h2>
          <div className="space-y-2">
            {documentRequests.map(doc => (
              <DocumentCard
                key={doc.id}
                doc={doc}
                token={token!}
                onUploadSuccess={handleUploadSuccess}
              />
            ))}
          </div>
        </div>

        {/* Help text */}
        <p className="text-xs text-center text-muted-foreground pt-4">
          Accepted formats: PDF, JPG, PNG, Word documents (max 10MB).
          If you have questions, please contact HR.
        </p>
      </div>
    </div>
  );
}
