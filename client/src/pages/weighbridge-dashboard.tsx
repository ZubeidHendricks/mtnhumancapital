import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Truck, Scale, CheckCircle, AlertCircle, FileText, Download, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import axios from "axios";
import { useTenant } from "@/hooks/useTenant";

interface WeighbridgeSlip {
  id: string;
  ticketNumber: string;
  vehicleRegistration: string | null;
  grossWeight: number | null;
  tareWeight: number | null;
  netWeight: number | null;
  weighDateTime: string;
  operator: string | null;
  product: string | null;
  customer: string | null;
  weighbridgeLocation: string | null;
  imageUrl: string;
  status: string;
  extractedData: any;
  createdAt: string;
}

export default function WeighbridgeDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { tenant } = useTenant();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);

  // Fetch all weighbridge slips
  const { data: slips = [], isLoading } = useQuery<WeighbridgeSlip[]>({
    queryKey: ["weighbridge-slips"],
    queryFn: async () => {
      const response = await axios.get("/api/weighbridge/slips");
      return response.data;
    },
  });

  // Single upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const response = await axios.post("/api/weighbridge/upload", formData);
      return response.data;
    },
    onSuccess: (data) => {
      toast({
        title: "Success!",
        description: `Weighbridge slip ${data.slip.ticketNumber} processed successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ["weighbridge-slips"] });
      setSelectedFile(null);
    },
    onError: (error: any) => {
      toast({
        title: "Upload Failed",
        description: error.response?.data?.message || "Failed to process weighbridge slip",
        variant: "destructive",
      });
    },
  });

  // Batch upload mutation
  const batchUploadMutation = useMutation({
    mutationFn: async (files: FileList) => {
      const formData = new FormData();
      Array.from(files).forEach((file) => {
        formData.append("files", file);
      });
      const response = await axios.post("/api/weighbridge/batch-upload", formData);
      return response.data;
    },
    onSuccess: (data) => {
      toast({
        title: "Batch Upload Complete",
        description: `Processed ${data.successful} slips successfully, ${data.failed} failed`,
      });
      queryClient.invalidateQueries({ queryKey: ["weighbridge-slips"] });
      setSelectedFiles(null);
    },
    onError: (error: any) => {
      toast({
        title: "Batch Upload Failed",
        description: error.response?.data?.message || "Failed to process weighbridge slips",
        variant: "destructive",
      });
    },
  });

  const handleSingleUpload = () => {
    if (selectedFile) {
      setUploading(true);
      uploadMutation.mutate(selectedFile, {
        onSettled: () => setUploading(false),
      });
    }
  };

  const handleBatchUpload = () => {
    if (selectedFiles && selectedFiles.length > 0) {
      setUploading(true);
      batchUploadMutation.mutate(selectedFiles, {
        onSettled: () => setUploading(false),
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "verified":
        return "bg-green-500";
      case "processed":
        return "bg-blue-500";
      case "pending":
        return "bg-yellow-500";
      default:
        return "bg-gray-500";
    }
  };

  const formatWeight = (weight: number | null) => {
    if (!weight) return "N/A";
    return `${weight.toLocaleString()} kg`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  // Calculate statistics
  const stats = {
    total: slips.length,
    processed: slips.filter((s) => s.status === "processed").length,
    verified: slips.filter((s) => s.status === "verified").length,
    totalWeight: slips.reduce((sum, s) => sum + (s.netWeight || 0), 0),
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Scale className="w-8 h-8 text-primary" />
              Weighbridge Management
            </h1>
            <p className="text-muted-foreground">AI-powered weight slip processing for {tenant?.companyName || "FLEET LOGIX"}</p>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Slips</CardDescription>
              <CardTitle className="text-3xl">{stats.total}</CardTitle>
            </CardHeader>
            <CardContent>
              <FileText className="w-4 h-4 text-muted-foreground" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Processed</CardDescription>
              <CardTitle className="text-3xl">{stats.processed}</CardTitle>
            </CardHeader>
            <CardContent>
              <CheckCircle className="w-4 h-4 text-blue-500" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Verified</CardDescription>
              <CardTitle className="text-3xl">{stats.verified}</CardTitle>
            </CardHeader>
            <CardContent>
              <CheckCircle className="w-4 h-4 text-green-500" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Net Weight</CardDescription>
              <CardTitle className="text-2xl">{formatWeight(stats.totalWeight)}</CardTitle>
            </CardHeader>
            <CardContent>
              <Scale className="w-4 h-4 text-muted-foreground" />
            </CardContent>
          </Card>
        </div>

        {/* Upload Section */}
        <Tabs defaultValue="single" className="w-full">
          <TabsList>
            <TabsTrigger value="single">Single Upload</TabsTrigger>
            <TabsTrigger value="batch">Batch Upload</TabsTrigger>
          </TabsList>

          <TabsContent value="single">
            <Card>
              <CardHeader>
                <CardTitle>Upload Weighbridge Slip</CardTitle>
                <CardDescription>
                  AI will automatically extract vehicle, weights, and operator information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="file">Select Image</Label>
                  <Input
                    id="file"
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,application/pdf"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  />
                </div>
                <Button
                  onClick={handleSingleUpload}
                  disabled={!selectedFile || uploading}
                  className="w-full"
                >
                  {uploading ? (
                    <>Processing...</>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload & Process
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="batch">
            <Card>
              <CardHeader>
                <CardTitle>Batch Upload</CardTitle>
                <CardDescription>
                  Upload multiple weighbridge slips at once (max 10 files)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="files">Select Multiple Images</Label>
                  <Input
                    id="files"
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,application/pdf"
                    multiple
                    onChange={(e) => setSelectedFiles(e.target.files)}
                  />
                  {selectedFiles && (
                    <p className="text-sm text-muted-foreground">
                      {selectedFiles.length} file(s) selected
                    </p>
                  )}
                </div>
                <Button
                  onClick={handleBatchUpload}
                  disabled={!selectedFiles || uploading}
                  className="w-full"
                >
                  {uploading ? (
                    <>Processing Batch...</>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload & Process All
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Slips List */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Weighbridge Slips</CardTitle>
            <CardDescription>All processed weight tickets</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Loading...</div>
            ) : slips.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No weighbridge slips yet. Upload your first slip to get started!
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-4">
                {slips.map((slip) => (
                  <Card key={slip.id} className="border-l-4 border-l-primary">
                    <CardContent className="pt-6">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Ticket #</p>
                          <p className="font-semibold">{slip.ticketNumber}</p>
                          <Badge className={`${getStatusColor(slip.status)} mt-2`}>
                            {slip.status}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Vehicle</p>
                          <p className="font-semibold flex items-center gap-2">
                            <Truck className="w-4 h-4" />
                            {slip.vehicleRegistration || "N/A"}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDate(slip.weighDateTime)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Weights</p>
                          <div className="space-y-1 text-sm">
                            <p>Gross: {formatWeight(slip.grossWeight)}</p>
                            <p>Tare: {formatWeight(slip.tareWeight)}</p>
                            <p className="font-semibold">Net: {formatWeight(slip.netWeight)}</p>
                          </div>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Details</p>
                          <div className="space-y-1 text-sm">
                            <p>Product: {slip.product || "N/A"}</p>
                            <p>Operator: {slip.operator || "N/A"}</p>
                            {slip.customer && <p>Customer: {slip.customer}</p>}
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 flex gap-2">
                        <Button size="sm" asChild>
                          <Link href={`/weighbridge/slip/${slip.id}`}>
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </Link>
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                          <a href={slip.imageUrl} target="_blank" rel="noopener noreferrer">
                            <Download className="w-4 h-4 mr-2" />
                            View Image
                          </a>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
