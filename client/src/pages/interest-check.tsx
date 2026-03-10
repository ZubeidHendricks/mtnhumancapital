import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle,
  AlertCircle,
  Loader2,
  Upload,
  XCircle,
  ThumbsUp,
  ThumbsDown,
  MapPin,
  Building2,
  FileText,
  ShieldCheck,
} from "lucide-react";

interface InterestCheckData {
  candidateName: string;
  jobTitle: string;
  jobDescription: string;
  jobDepartment: string;
  jobLocation: string;
  companyName: string;
  status: string;
  expiresAt: string | null;
}

export default function InterestCheck() {
  const { token } = useParams<{ token: string }>();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<"choose" | "interested" | "not_interested" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<"interested" | "not_interested" | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [consentChecked, setConsentChecked] = useState(false);

  const { data, isLoading, error } = useQuery<InterestCheckData>({
    queryKey: ["/api/public/interest-check", token],
    queryFn: async () => {
      const res = await fetch(`/api/public/interest-check/${token}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to load interest check");
      }
      return res.json();
    },
    enabled: !!token,
    retry: false,
  });

  const handleSubmit = async (response: "interested" | "not_interested") => {
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("response", response);
      if (response === "interested" && selectedFile) {
        formData.append("cv", selectedFile);
      }

      const res = await fetch(`/api/public/interest-check/${token}`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to submit response");
      }

      setSubmitted(response);
      toast({
        title: response === "interested" ? "Interest Confirmed" : "Response Recorded",
        description: response === "interested"
          ? "Thank you! The recruitment team has been notified."
          : "Your response has been recorded. Thank you for your time.",
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
          <p className="mt-3 text-muted-foreground">Loading opportunity details...</p>
        </div>
      </div>
    );
  }

  // Error / expired / not found
  if (error || !data) {
    const message = error instanceof Error ? error.message : "Interest check not found";
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-destructive mb-3" />
            <h2 className="text-lg font-semibold mb-2">Unable to Load</h2>
            <p className="text-muted-foreground text-sm">{message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Already responded
  const alreadyResponded = data.status === "interested" || data.status === "not_interested" || submitted;
  const finalStatus = submitted || (data.status === "interested" || data.status === "not_interested" ? data.status : null);

  if (alreadyResponded && finalStatus) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-gradient-to-r from-[#FFCC00] to-[#FFD700] text-black">
          <div className="max-w-2xl mx-auto px-4 py-8 text-center">
            <p className="text-black/70 text-sm font-bold mb-1">{data.companyName}</p>
            <h1 className="text-2xl font-bold">Career Opportunity</h1>
          </div>
        </div>
        <div className="max-w-lg mx-auto px-4 py-10">
          <Card className={finalStatus === "interested" ? "border-green-300" : "border-orange-300"}>
            <CardContent className="pt-6 text-center">
              {finalStatus === "interested" ? (
                <>
                  <CheckCircle className="w-16 h-16 mx-auto text-green-600 mb-4" />
                  <h2 className="text-xl font-semibold text-green-800 mb-2">Interest Confirmed</h2>
                  <p className="text-muted-foreground">
                    Thank you for expressing interest in <strong>{data.jobTitle}</strong>.
                    The recruitment team has been notified and will be in touch with next steps.
                  </p>
                </>
              ) : (
                <>
                  <XCircle className="w-16 h-16 mx-auto text-orange-500 mb-4" />
                  <h2 className="text-xl font-semibold text-orange-800 mb-2">Response Recorded</h2>
                  <p className="text-muted-foreground">
                    Your response has been recorded. We wish you all the best in your career.
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
          <h1 className="text-2xl font-bold">Career Opportunity</h1>
          <p className="text-black/80 mt-2">Hello, {data.candidateName}</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Job Details */}
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              {data.jobTitle}
            </h3>
            <div className="space-y-2 mb-4">
              {data.jobDepartment && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Building2 className="w-4 h-4" />
                  <span>{data.jobDepartment}</span>
                </div>
              )}
              {data.jobLocation && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  <span>{data.jobLocation}</span>
                </div>
              )}
            </div>
            {data.jobDescription && (
              <div className="border-t pt-4">
                <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {data.jobDescription}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* POPIA Disclaimer */}
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-sm text-blue-900 mb-1">POPIA Notice</h4>
                <p className="text-xs text-blue-800/70 leading-relaxed">
                  By expressing interest and/or uploading your CV, you consent to the collection, use, and processing of your personal information for recruitment purposes in accordance with the Protection of Personal Information Act (POPIA). Your data will be handled confidentially and used solely for the purpose of evaluating your suitability for this position.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action area */}
        {!mode && (
          <div className="flex gap-3">
            <Button
              className="flex-1 bg-green-600 hover:bg-green-700 h-12 text-base"
              onClick={() => setMode("interested")}
            >
              <ThumbsUp className="w-5 h-5 mr-2" />
              I'm Interested
            </Button>
            <Button
              variant="outline"
              className="flex-1 border-red-300 text-red-600 hover:bg-red-50 h-12 text-base"
              onClick={() => setMode("not_interested")}
            >
              <ThumbsDown className="w-5 h-5 mr-2" />
              Not Interested
            </Button>
          </div>
        )}

        {/* Interested flow */}
        {mode === "interested" && (
          <Card className="border-green-200">
            <CardContent className="p-6 space-y-4">
              <h3 className="font-semibold text-green-800">Express Interest</h3>
              <p className="text-sm text-muted-foreground">
                Upload your CV to help us assess your suitability for this role (optional but recommended).
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
                  {selectedFile ? selectedFile.name : "Upload CV (Optional)"}
                </Button>
              </div>
              <div className="flex items-start gap-2">
                <Checkbox
                  id="consent"
                  checked={consentChecked}
                  onCheckedChange={(checked) => setConsentChecked(checked === true)}
                  className="mt-0.5"
                />
                <label htmlFor="consent" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                  I consent to the collection, use, and processing of my personal information for recruitment purposes in accordance with POPIA.
                </label>
              </div>
              <div className="flex gap-3">
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  disabled={submitting || !consentChecked}
                  onClick={() => handleSubmit("interested")}
                >
                  {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                  Confirm Interest
                </Button>
                <Button variant="ghost" onClick={() => setMode(null)} disabled={submitting}>
                  Back
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Not interested flow */}
        {mode === "not_interested" && (
          <Card className="border-orange-200">
            <CardContent className="p-6 space-y-4">
              <h3 className="font-semibold text-orange-800">Decline Opportunity</h3>
              <p className="text-sm text-muted-foreground">
                Are you sure you'd like to decline this opportunity? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="destructive"
                  className="flex-1"
                  disabled={submitting}
                  onClick={() => handleSubmit("not_interested")}
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
            This link expires on {new Date(data.expiresAt).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        )}
      </div>
    </div>
  );
}
