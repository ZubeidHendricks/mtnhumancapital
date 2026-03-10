import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle,
  AlertCircle,
  Loader2,
  Upload,
  XCircle,
  FileText,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";

interface OfferData {
  candidateName: string;
  jobTitle: string;
  salary: string;
  startDate: string;
  companyName: string;
  status: string;
  documentUrl: string | null;
  expiresAt: string | null;
}

export default function OfferResponse() {
  const { token } = useParams<{ token: string }>();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<"choose" | "accept" | "decline" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<"accepted" | "declined" | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const { data, isLoading, error } = useQuery<OfferData>({
    queryKey: ["/api/public/offer-response", token],
    queryFn: async () => {
      const res = await fetch(`/api/public/offer-response/${token}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to load offer");
      }
      return res.json();
    },
    enabled: !!token,
    retry: false,
  });

  const handleSubmit = async (response: "accepted" | "declined") => {
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("response", response);
      if (response === "declined" && declineReason) {
        formData.append("declineReason", declineReason);
      }
      if (response === "accepted" && selectedFile) {
        formData.append("signedDocument", selectedFile);
      }

      const res = await fetch(`/api/public/offer-response/${token}`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to submit response");
      }

      setSubmitted(response);
      toast({
        title: response === "accepted" ? "Offer Accepted" : "Offer Declined",
        description: response === "accepted"
          ? "Thank you! The HR team has been notified."
          : "Your response has been recorded.",
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Loading
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="mt-3 text-muted-foreground">Loading offer details...</p>
        </div>
      </div>
    );
  }

  // Error / expired / not found
  if (error || !data) {
    const message = error instanceof Error ? error.message : "Offer not found";
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-destructive mb-3" />
            <h2 className="text-lg font-semibold mb-2">Unable to Load Offer</h2>
            <p className="text-muted-foreground text-sm">{message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Already responded (from initial load or after submission)
  const alreadyResponded = data.status === "accepted" || data.status === "declined" || submitted;
  const finalStatus = submitted || (data.status === "accepted" || data.status === "declined" ? data.status : null);

  if (alreadyResponded && finalStatus) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-gradient-to-r from-[#FFCC00] to-[#FFD700] text-black">
          <div className="max-w-2xl mx-auto px-4 py-8 text-center">
            <p className="text-black/70 text-sm font-bold mb-1">{data.companyName}</p>
            <h1 className="text-2xl font-bold">Offer Response</h1>
          </div>
        </div>
        <div className="max-w-lg mx-auto px-4 py-10">
          <Card className={finalStatus === "accepted" ? "border-green-300" : "border-orange-300"}>
            <CardContent className="pt-6 text-center">
              {finalStatus === "accepted" ? (
                <>
                  <CheckCircle className="w-16 h-16 mx-auto text-green-600 mb-4" />
                  <h2 className="text-xl font-semibold text-green-800 mb-2">Offer Accepted</h2>
                  <p className="text-muted-foreground">
                    Thank you for accepting the offer for <strong>{data.jobTitle}</strong>.
                    The HR team has been notified and will be in touch with next steps.
                  </p>
                </>
              ) : (
                <>
                  <XCircle className="w-16 h-16 mx-auto text-orange-500 mb-4" />
                  <h2 className="text-xl font-semibold text-orange-800 mb-2">Offer Declined</h2>
                  <p className="text-muted-foreground">
                    Your response has been recorded. We wish you all the best in your future endeavors.
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#FFCC00] to-[#FFD700] text-black">
        <div className="max-w-2xl mx-auto px-4 py-8 text-center">
          <p className="text-black/70 text-sm font-bold mb-1">{data.companyName}</p>
          <h1 className="text-2xl font-bold">Job Offer</h1>
          <p className="text-black/80 mt-2">Hello, {data.candidateName}</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Offer Details */}
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold text-lg mb-4">Offer Details</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Position</span>
                <span className="font-medium">{data.jobTitle}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Salary</span>
                <span className="font-medium">{data.salary}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Start Date</span>
                <span className="font-medium">{data.startDate}</span>
              </div>
            </div>
            {data.documentUrl && (
              <div className="mt-4 pt-4 border-t">
                <a
                  href={data.documentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline"
                >
                  <FileText className="w-4 h-4" />
                  View Offer Document
                </a>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action area */}
        {!mode && (
          <div className="flex gap-3">
            <Button
              className="flex-1 bg-green-600 hover:bg-green-700 h-12 text-base"
              onClick={() => setMode("accept")}
            >
              <ThumbsUp className="w-5 h-5 mr-2" />
              Accept Offer
            </Button>
            <Button
              variant="outline"
              className="flex-1 border-red-300 text-red-600 hover:bg-red-50 h-12 text-base"
              onClick={() => setMode("decline")}
            >
              <ThumbsDown className="w-5 h-5 mr-2" />
              Decline Offer
            </Button>
          </div>
        )}

        {/* Accept flow */}
        {mode === "accept" && (
          <Card className="border-green-200">
            <CardContent className="p-6 space-y-4">
              <h3 className="font-semibold text-green-800">Accept Offer</h3>
              <p className="text-sm text-muted-foreground">
                Please upload a signed copy of the offer document to accept.
              </p>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {selectedFile ? selectedFile.name : "Upload Signed Document *"}
                </Button>
              </div>
              <div className="flex gap-3">
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  disabled={submitting || !selectedFile}
                  onClick={() => handleSubmit("accepted")}
                >
                  {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                  Confirm Accept
                </Button>
                <Button variant="ghost" onClick={() => setMode(null)} disabled={submitting}>
                  Back
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Decline flow */}
        {mode === "decline" && (
          <Card className="border-orange-200">
            <CardContent className="p-6 space-y-4">
              <h3 className="font-semibold text-orange-800">Decline Offer</h3>
              <p className="text-sm text-muted-foreground">
                Please let us know your reason (optional). This helps us improve.
              </p>
              <Textarea
                placeholder="Reason for declining (optional)"
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                rows={3}
              />
              <div className="flex gap-3">
                <Button
                  variant="destructive"
                  className="flex-1"
                  disabled={submitting}
                  onClick={() => handleSubmit("declined")}
                >
                  {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />}
                  Confirm Decline
                </Button>
                <Button variant="ghost" onClick={() => setMode(null)} disabled={submitting}>
                  Back
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {data.expiresAt && (
          <p className="text-xs text-center text-muted-foreground pt-2">
            This offer expires on {new Date(data.expiresAt).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        )}
      </div>
    </div>
  );
}
