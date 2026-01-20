import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BackButton } from "@/components/ui/back-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Award, Upload, Plus, Eye, Download, CheckCircle } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface CertificateTemplate {
  id: number;
  name: string;
  description: string;
  templateUrl: string;
  isDefault: boolean;
}

interface Certificate {
  id: number;
  certificateNumber: string;
  certificateUrl: string;
  issuedDate: string;
  courseName?: string;
}

export default function CertificateManager() {
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: templates = [] } = useQuery<CertificateTemplate[]>({
    queryKey: ["/api/certificates/templates"],
  });

  const { data: myCertificates = [] } = useQuery<Certificate[]>({
    queryKey: ["/api/certificates/me"],
  });

  const uploadTemplateMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await api.post("/api/certificates/templates", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/certificates/templates"] });
      toast.success("Certificate template uploaded successfully!");
      setIsDialogOpen(false);
      setSelectedFile(null);
      setTemplateName("");
      setTemplateDescription("");
    },
    onError: () => {
      toast.error("Failed to upload template");
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = () => {
    if (!selectedFile || !templateName) {
      toast.error("Please select a file and provide a name");
      return;
    }

    const formData = new FormData();
    formData.append("template", selectedFile);
    formData.append("name", templateName);
    formData.append("description", templateDescription);
    formData.append("placeholders", JSON.stringify([
      { key: "userName", label: "User Name", x: 400, y: 300, fontSize: 32 },
      { key: "courseName", label: "Course Name", x: 400, y: 400, fontSize: 24 },
      { key: "date", label: "Date", x: 400, y: 500, fontSize: 18 },
    ]));

    uploadTemplateMutation.mutate(formData);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <BackButton />

        <div className="mt-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Certificates</h1>
              <p className="text-muted-foreground mt-1">
                Manage certificate templates and view issued certificates
              </p>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Upload Template
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Upload Certificate Template</DialogTitle>
                  <DialogDescription>
                    Upload an image or PDF template for certificates. You can customize placeholders later.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="template-name">Template Name</Label>
                    <Input
                      id="template-name"
                      placeholder="e.g., Course Completion Certificate"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="template-description">Description</Label>
                    <Input
                      id="template-description"
                      placeholder="Brief description of this template"
                      value={templateDescription}
                      onChange={(e) => setTemplateDescription(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="template-file">Template File</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="template-file"
                        type="file"
                        accept="image/*,.pdf"
                        onChange={handleFileChange}
                      />
                      {selectedFile && (
                        <Badge variant="outline" className="whitespace-nowrap">
                          {selectedFile.name}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    onClick={handleUpload}
                    disabled={uploadTemplateMutation.isPending}
                    className="w-full"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {uploadTemplateMutation.isPending ? "Uploading..." : "Upload Template"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Templates Section */}
          <Card>
            <CardHeader>
              <CardTitle>Certificate Templates</CardTitle>
              <CardDescription>Available templates for certificate generation</CardDescription>
            </CardHeader>
            <CardContent>
              {templates.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Award className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No certificate templates yet</p>
                  <p className="text-sm">Upload a template to get started</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {templates.map((template) => (
                    <Card key={template.id} className="overflow-hidden">
                      <div className="h-48 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center relative">
                        <img
                          src={template.templateUrl}
                          alt={template.name}
                          className="w-full h-full object-contain"
                        />
                        {template.isDefault && (
                          <Badge className="absolute top-2 right-2">Default</Badge>
                        )}
                      </div>
                      <CardContent className="pt-4">
                        <h3 className="font-semibold">{template.name}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                          {template.description}
                        </p>
                        <div className="flex gap-2 mt-4">
                          <Button size="sm" variant="outline" className="flex-1">
                            <Eye className="h-4 w-4 mr-1" />
                            Preview
                          </Button>
                          <Button size="sm" variant="outline" className="flex-1">
                            Edit
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* My Certificates Section */}
          <Card>
            <CardHeader>
              <CardTitle>My Certificates</CardTitle>
              <CardDescription>Certificates you've earned</CardDescription>
            </CardHeader>
            <CardContent>
              {myCertificates.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Award className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No certificates earned yet</p>
                  <p className="text-sm">Complete courses to earn certificates</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {myCertificates.map((cert) => (
                    <div
                      key={cert.id}
                      className="flex items-center justify-between p-4 rounded-lg border bg-card"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-full bg-green-100">
                          <CheckCircle className="h-6 w-6 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium">{cert.courseName || "Course Certificate"}</p>
                          <p className="text-sm text-muted-foreground">
                            Certificate #{cert.certificateNumber}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Issued: {new Date(cert.issuedDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button size="sm" variant="outline">
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
