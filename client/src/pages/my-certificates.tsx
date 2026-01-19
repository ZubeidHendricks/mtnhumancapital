import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Award, Download, Share2, ExternalLink } from "lucide-react";
import { format } from "date-fns";

export default function MyCertificates() {
  const { data: certificates = [] } = useQuery({
    queryKey: ["/api/lms/my-certificates"],
  });

  const handleDownload = (cert: any) => {
    window.open(cert.certificate.certificateUrl, "_blank");
  };

  const handleShare = async (cert: any) => {
    const verifyUrl = `${window.location.origin}/verify-certificate/${cert.certificate.certificateNumber}`;
    if (navigator.share) {
      await navigator.share({
        title: "My Certificate",
        text: `Check out my certificate for ${cert.course?.title || "course completion"}!`,
        url: verifyUrl,
      });
    } else {
      navigator.clipboard.writeText(verifyUrl);
      alert("Certificate link copied to clipboard!");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Certificates</h1>
        <p className="text-muted-foreground">View and download your earned certificates</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {certificates.map((item: any) => (
          <Card key={item.certificate.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Award className="h-5 w-5 text-yellow-500" />
                    {item.course?.title || "Certificate"}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {item.template?.name}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Issued:</span>
                    <span className="font-medium">
                      {format(new Date(item.certificate.issuedAt), "MMM dd, yyyy")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Certificate #:</span>
                    <Badge variant="outline" className="font-mono text-xs">
                      {item.certificate.certificateNumber}
                    </Badge>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => handleDownload(item)}
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Download
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleShare(item)}
                  >
                    <Share2 className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(`/verify-certificate/${item.certificate.certificateNumber}`, "_blank")}
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {certificates.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Award className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No certificates yet</h3>
            <p className="text-muted-foreground">Complete courses to earn certificates</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
