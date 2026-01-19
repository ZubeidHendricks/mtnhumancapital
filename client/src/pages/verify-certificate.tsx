import { useState } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { format } from "date-fns";

export default function VerifyCertificate() {
  const params = useParams();
  const certificateNumber = params.number;

  const { data: verification, isLoading, error } = useQuery({
    queryKey: [`/api/lms/certificates/verify/${certificateNumber}`],
    enabled: !!certificateNumber,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Verifying certificate...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !verification?.certificate) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-pink-50">
        <Card className="w-full max-w-md border-red-200">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <XCircle className="h-16 w-16 text-red-500 mb-4" />
            <h2 className="text-2xl font-bold mb-2">Certificate Not Found</h2>
            <p className="text-muted-foreground text-center">
              The certificate number <span className="font-mono">{certificateNumber}</span> could not be verified.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { certificate, user, course, template } = verification;
  const data = certificate.certificateData as any;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50 p-4">
      <Card className="w-full max-w-2xl border-green-200 shadow-2xl">
        <CardContent className="p-8 space-y-6">
          <div className="flex items-center justify-center mb-6">
            <CheckCircle2 className="h-20 w-20 text-green-500" />
          </div>

          <div className="text-center space-y-2">
            <Badge className="bg-green-500 hover:bg-green-600 text-white px-4 py-1">
              VERIFIED CERTIFICATE
            </Badge>
            <h1 className="text-3xl font-bold mt-4">Certificate Verified</h1>
            <p className="text-muted-foreground">
              This certificate is authentic and issued by our system
            </p>
          </div>

          <div className="bg-white rounded-lg border p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Certificate Number</p>
                <p className="font-mono font-medium">{certificate.certificateNumber}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Issued Date</p>
                <p className="font-medium">
                  {format(new Date(certificate.issuedAt), "MMMM dd, yyyy")}
                </p>
              </div>
            </div>

            <div className="border-t pt-4">
              <p className="text-sm text-muted-foreground">Recipient</p>
              <p className="text-xl font-bold">{data.name || user?.displayName || user?.username}</p>
            </div>

            {course && (
              <div className="border-t pt-4">
                <p className="text-sm text-muted-foreground">Course</p>
                <p className="text-lg font-semibold">{course.title}</p>
                {course.description && (
                  <p className="text-sm text-muted-foreground mt-1">{course.description}</p>
                )}
              </div>
            )}

            {template && (
              <div className="border-t pt-4">
                <p className="text-sm text-muted-foreground">Certificate Type</p>
                <p className="font-medium">{template.name}</p>
              </div>
            )}

            {data.completionDate && (
              <div className="border-t pt-4">
                <p className="text-sm text-muted-foreground">Completion Date</p>
                <p className="font-medium">{data.completionDate}</p>
              </div>
            )}

            {data.score && (
              <div className="border-t pt-4">
                <p className="text-sm text-muted-foreground">Final Score</p>
                <p className="font-medium">{data.score}%</p>
              </div>
            )}
          </div>

          <div className="text-center text-sm text-muted-foreground">
            <p>This certificate can be verified at:</p>
            <p className="font-mono text-xs mt-1">{window.location.href}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
