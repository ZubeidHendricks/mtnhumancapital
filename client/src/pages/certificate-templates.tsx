import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Upload, FileText, Edit, Eye } from "lucide-react";

export default function CertificateTemplates() {
  const [showUpload, setShowUpload] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    placeholderFields: ["{{name}}", "{{course}}", "{{date}}", "{{certificateNumber}}"],
    defaultFields: {},
  });

  const queryClient = useQueryClient();

  const { data: templates = [] } = useQuery({
    queryKey: ["/api/lms/certificate-templates"],
  });

  const uploadMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await fetch("/api/lms/certificate-templates", {
        method: "POST",
        body: data,
        credentials: "include",
      });
      if (!response.ok) throw new Error("Upload failed");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Template uploaded successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/lms/certificate-templates"] });
      setShowUpload(false);
      setSelectedFile(null);
      setFormData({
        name: "",
        description: "",
        placeholderFields: ["{{name}}", "{{course}}", "{{date}}", "{{certificateNumber}}"],
        defaultFields: {},
      });
    },
  });

  const handleUpload = () => {
    if (!selectedFile) {
      toast({ title: "Please select a file", variant: "destructive" });
      return;
    }

    const data = new FormData();
    data.append("template", selectedFile);
    data.append("name", formData.name);
    data.append("description", formData.description);
    data.append("placeholderFields", JSON.stringify(formData.placeholderFields));
    data.append("defaultFields", JSON.stringify(formData.defaultFields));

    uploadMutation.mutate(data);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Certificate Templates</h1>
          <p className="text-muted-foreground">Upload and manage certificate templates</p>
        </div>
        <Dialog open={showUpload} onOpenChange={setShowUpload}>
          <DialogTrigger asChild>
            <Button>
              <Upload className="h-4 w-4 mr-2" />
              Upload Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Upload Certificate Template</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Template Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Course Completion Certificate"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Certificate awarded upon course completion"
                />
              </div>
              <div>
                <Label htmlFor="file">Template File (PNG, JPG, or PDF)</Label>
                <Input
                  id="file"
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                />
              </div>
              <div>
                <Label>Placeholder Fields</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Available placeholders: {formData.placeholderFields.join(", ")}
                </p>
                <p className="text-xs text-muted-foreground">
                  These will be replaced with actual data when issuing certificates
                </p>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowUpload(false)}>
                  Cancel
                </Button>
                <Button onClick={handleUpload} disabled={uploadMutation.isPending}>
                  {uploadMutation.isPending ? "Uploading..." : "Upload"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template: any) => (
          <Card key={template.id}>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-4 w-4" />
                {template.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {template.description && (
                  <p className="text-sm text-muted-foreground">{template.description}</p>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">Type:</span>
                  <span className="capitalize">{template.templateType}</span>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(template.templateUrl, "_blank")}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Preview
                  </Button>
                  <Button size="sm" variant="outline">
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {templates.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No templates yet</h3>
            <p className="text-muted-foreground mb-4">Upload your first certificate template</p>
            <Button onClick={() => setShowUpload(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Upload Template
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
