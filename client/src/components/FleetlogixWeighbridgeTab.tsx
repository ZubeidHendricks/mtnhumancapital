import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, Scale, Eye, Link as LinkIcon, Trash2, FileImage } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import axios from "axios";

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
  linkedLoadId?: string | null;
  createdAt: string;
}

interface Load {
  id: string;
  loadNumber: string;
  driver?: { name: string };
  vehicle?: { registration: string };
}

export function FleetlogixWeighbridgeTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [selectedSlip, setSelectedSlip] = useState<WeighbridgeSlip | null>(null);
  const [selectedLoadId, setSelectedLoadId] = useState<string>("");
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<string>("");

  // Fetch weighbridge slips
  const { data: slips = [], isLoading: slipsLoading } = useQuery<WeighbridgeSlip[]>({
    queryKey: ["weighbridge-slips"],
    queryFn: async () => {
      const response = await axios.get("/api/weighbridge/slips");
      return response.data;
    },
  });

  // Fetch loads for linking
  const { data: loads = [] } = useQuery<Load[]>({
    queryKey: ["/api/fleetlogix/loads"],
    queryFn: async () => {
      const response = await fetch("/api/fleetlogix/loads", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch loads");
      const data = await response.json();
      return data.map((item: any) => ({
        id: item.load?.id,
        loadNumber: item.load?.loadNumber,
        driver: item.driver,
        vehicle: item.vehicle,
      }));
    },
  });

  // Upload weighbridge slip
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      setUploading(true);
      const response = await axios.post("/api/weighbridge/upload", formData);
      return response.data;
    },
    onSuccess: (data) => {
      toast({
        title: "Weighbridge slip uploaded!",
        description: `Ticket ${data.slip.ticketNumber} - ${data.slip.netWeight}kg processed`,
      });
      queryClient.invalidateQueries({ queryKey: ["weighbridge-slips"] });
      setSelectedFile(null);
      setUploading(false);
    },
    onError: (error: any) => {
      toast({
        title: "Upload failed",
        description: error.response?.data?.message || "Failed to process slip",
        variant: "destructive",
      });
      setUploading(false);
    },
  });

  // Link slip to load
  const linkMutation = useMutation({
    mutationFn: async ({ slipId, loadId }: { slipId: string; loadId: string }) => {
      const response = await axios.post(`/api/weighbridge/slips/${slipId}/link-load`, {
        loadId,
      });
      return response.data;
    },
    onSuccess: () => {
      toast({ title: "Linked successfully!" });
      queryClient.invalidateQueries({ queryKey: ["weighbridge-slips"] });
      setLinkDialogOpen(false);
      setSelectedSlip(null);
      setSelectedLoadId("");
    },
    onError: (error: any) => {
      toast({
        title: "Failed to link",
        description: error.response?.data?.message || "Error linking slip to load",
        variant: "destructive",
      });
    },
  });

  // Delete slip
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await axios.delete(`/api/weighbridge/slips/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Weighbridge slip deleted" });
      queryClient.invalidateQueries({ queryKey: ["weighbridge-slips"] });
    },
    onError: () => {
      toast({
        title: "Failed to delete slip",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = () => {
    if (selectedFile) {
      uploadMutation.mutate(selectedFile);
    }
  };

  const handleLinkToLoad = (slip: WeighbridgeSlip) => {
    setSelectedSlip(slip);
    setLinkDialogOpen(true);
  };

  const handleConfirmLink = () => {
    if (selectedSlip && selectedLoadId) {
      linkMutation.mutate({ slipId: selectedSlip.id, loadId: selectedLoadId });
    }
  };

  const showImagePreview = (imageUrl: string) => {
    setPreviewImage(imageUrl);
    setImagePreviewOpen(true);
  };

  if (slipsLoading) {
    return <div className="flex items-center justify-center p-8">Loading weighbridge data...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <div className="bg-muted/50 rounded-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Scale className="h-5 w-5" />
              Upload Weighbridge Slip
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Upload weight slip image for AI extraction and automatic load linking
            </p>
          </div>
        </div>

        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <Label htmlFor="weighbridge-file">Select Image (JPG, PNG, PDF)</Label>
            <Input
              id="weighbridge-file"
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileSelect}
              disabled={uploading}
              className="mt-2"
            />
          </div>
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            className="px-8"
          >
            <Upload className="mr-2 h-4 w-4" />
            {uploading ? "Processing..." : "Upload"}
          </Button>
        </div>

        {selectedFile && (
          <div className="mt-3 text-sm text-muted-foreground">
            Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
          </div>
        )}
      </div>

      {/* Weighbridge Slips Table */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-semibold">Weighbridge Slips</h3>
            <p className="text-sm text-muted-foreground">
              {slips.length} slip{slips.length !== 1 ? 's' : ''} recorded
            </p>
          </div>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ticket #</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Date/Time</TableHead>
                <TableHead className="text-right">Gross (kg)</TableHead>
                <TableHead className="text-right">Tare (kg)</TableHead>
                <TableHead className="text-right">Net (kg)</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Linked Load</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {slips.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                    No weighbridge slips yet. Upload a slip image to get started.
                  </TableCell>
                </TableRow>
              ) : (
                slips.map((slip) => (
                  <TableRow key={slip.id}>
                    <TableCell className="font-medium">{slip.ticketNumber}</TableCell>
                    <TableCell>{slip.vehicleRegistration || "-"}</TableCell>
                    <TableCell>
                      {new Date(slip.weighDateTime).toLocaleString("en-ZA", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      {slip.grossWeight?.toLocaleString() || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {slip.tareWeight?.toLocaleString() || "-"}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {slip.netWeight?.toLocaleString() || "-"}
                    </TableCell>
                    <TableCell>{slip.product || "-"}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          slip.status === "verified"
                            ? "default"
                            : slip.status === "pending"
                            ? "secondary"
                            : "destructive"
                        }
                      >
                        {slip.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {slip.linkedLoadId ? (
                        <Badge variant="outline" className="text-green-600">
                          <LinkIcon className="h-3 w-3 mr-1" />
                          Linked
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">Not linked</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => showImagePreview(slip.imageUrl)}
                          title="View image"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {!slip.linkedLoadId && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleLinkToLoad(slip)}
                            title="Link to load"
                          >
                            <LinkIcon className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm("Delete this weighbridge slip?")) {
                              deleteMutation.mutate(slip.id);
                            }
                          }}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Link to Load Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link Weighbridge Slip to Load</DialogTitle>
            <DialogDescription>
              Associate this weighbridge slip with a load for tracking and reconciliation
            </DialogDescription>
          </DialogHeader>

          {selectedSlip && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-md space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Ticket:</span>
                  <span className="font-medium">{selectedSlip.ticketNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Vehicle:</span>
                  <span className="font-medium">{selectedSlip.vehicleRegistration}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Net Weight:</span>
                  <span className="font-medium">{selectedSlip.netWeight} kg</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="load-select">Select Load</Label>
                <Select value={selectedLoadId} onValueChange={setSelectedLoadId}>
                  <SelectTrigger id="load-select">
                    <SelectValue placeholder="Choose a load..." />
                  </SelectTrigger>
                  <SelectContent>
                    {loads.map((load) => (
                      <SelectItem key={load.id} value={load.id}>
                        {load.loadNumber} - {load.vehicle?.registration || "No vehicle"} -{" "}
                        {load.driver?.name || "No driver"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmLink} disabled={!selectedLoadId || linkMutation.isPending}>
              {linkMutation.isPending ? "Linking..." : "Link to Load"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Preview Dialog */}
      <Dialog open={imagePreviewOpen} onOpenChange={setImagePreviewOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Weighbridge Slip Image</DialogTitle>
          </DialogHeader>
          <div className="w-full">
            <img
              src={previewImage}
              alt="Weighbridge slip"
              className="w-full h-auto rounded-lg border"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
