import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Building2,
  Mail,
  Phone,
  User,
  AlertCircle,
  Trash2,
  FileText
} from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { format } from "date-fns";
interface TenantRequest {
  id: string;
  companyName: string;
  requestedSubdomain: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  industry?: string;
  companySize?: string;
  message?: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  adminNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export default function TenantRequests() {
  const [selectedRequest, setSelectedRequest] = useState<TenantRequest | null>(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [activeTab, setActiveTab] = useState("pending");
  
  const queryClient = useQueryClient();
  // Note: tenant-requests are NOT tenant-scoped (global admin view), so no tenant prefix
  const requestsKey = ["tenant-requests"];

  const { data: requests = [], isLoading } = useQuery<TenantRequest[]>({
    queryKey: requestsKey,
    queryFn: async () => {
      const response = await api.get("/tenant-requests");
      return response.data;
    },
  });

  const updateRequestMutation = useMutation({
    mutationFn: async ({ id, status, adminNotes }: { id: string; status: string; adminNotes?: string }) => {
      const response = await api.patch(`/tenant-requests/${id}`, {
        status,
        adminNotes,
        reviewedAt: new Date().toISOString(),
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: requestsKey });
      setShowReviewDialog(false);
      setSelectedRequest(null);
      setAdminNotes("");
    },
  });

  const deleteRequestMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/tenant-requests/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: requestsKey });
      toast.success("Request deleted successfully");
    },
  });

  const handleApprove = (request: TenantRequest) => {
    setSelectedRequest(request);
    setAdminNotes("");
    setShowReviewDialog(true);
  };

  const handleReject = (request: TenantRequest) => {
    setSelectedRequest(request);
    setAdminNotes("");
    setShowReviewDialog(true);
  };

  const handleConfirmReview = async (approved: boolean) => {
    if (!selectedRequest) return;

    try {
      await updateRequestMutation.mutateAsync({
        id: selectedRequest.id,
        status: approved ? "approved" : "rejected",
        adminNotes,
      });

      toast.success(`Request ${approved ? "approved" : "rejected"} successfully`);
      
      if (approved) {
        toast.info(`Next step: Create tenant config for ${selectedRequest.companyName} with subdomain "${selectedRequest.requestedSubdomain}"`);
      }
    } catch (error) {
      toast.error("Failed to update request");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this request?")) {
      await deleteRequestMutation.mutateAsync(id);
    }
  };

  const filteredRequests = requests.filter((req) => {
    if (activeTab === "all") return true;
    return req.status === activeTab;
  });

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: { color: "bg-muted/10 text-foreground border-border/20", icon: Clock },
      approved: { color: "bg-muted/10 text-foreground border-border/20", icon: CheckCircle2 },
      rejected: { color: "bg-destructive/10 text-destructive border-destructive/20", icon: XCircle },
      cancelled: { color: "bg-secondary0/10 text-muted-foreground border-gray-500/20", icon: AlertCircle },
    };

    const variant = variants[status as keyof typeof variants] || variants.pending;
    const Icon = variant.icon;

    return (
      <Badge className={`${variant.color} flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      
      <main className="container mx-auto px-4 py-8 mt-20">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2" data-testid="text-page-title">Tenant Requests</h1>
          <p className="text-muted-foreground" data-testid="text-page-description">
            Review and manage new customer signup requests
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="pending" data-testid="button-filter-pending">
              Pending {requests.filter(r => r.status === "pending").length > 0 && `(${requests.filter(r => r.status === "pending").length})`}
            </TabsTrigger>
            <TabsTrigger value="approved" data-testid="button-filter-approved">
              Approved
            </TabsTrigger>
            <TabsTrigger value="rejected" data-testid="button-filter-rejected">
              Rejected
            </TabsTrigger>
            <TabsTrigger value="all" data-testid="button-filter-all">
              All
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab}>
            {isLoading ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">Loading requests...</p>
                </CardContent>
              </Card>
            ) : filteredRequests.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No {activeTab !== "all" ? activeTab : ""} requests found</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {filteredRequests.map((request) => (
                  <Card key={request.id} data-testid={`card-request-${request.id}`}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <Building2 className="w-5 h-5" />
                            {request.companyName}
                          </CardTitle>
                          <CardDescription className="mt-2">
                            Subdomain: <span className="font-mono text-primary">{request.requestedSubdomain}.capital</span>
                          </CardDescription>
                        </div>
                        {getStatusBadge(request.status)}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-2 gap-4 mb-4">
                        <div className="flex items-center gap-2 text-sm">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{request.contactName}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          <a href={`mailto:${request.contactEmail}`} className="text-primary hover:underline">
                            {request.contactEmail}
                          </a>
                        </div>
                        {request.contactPhone && (
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="w-4 h-4 text-muted-foreground" />
                            <span>{request.contactPhone}</span>
                          </div>
                        )}
                        {request.industry && (
                          <div className="text-sm">
                            <span className="text-muted-foreground">Industry: </span>
                            <span>{request.industry}</span>
                          </div>
                        )}
                        {request.companySize && (
                          <div className="text-sm">
                            <span className="text-muted-foreground">Size: </span>
                            <span className="capitalize">{request.companySize}</span>
                          </div>
                        )}
                        <div className="text-sm">
                          <span className="text-muted-foreground">Submitted: </span>
                          <span>{format(new Date(request.createdAt), "MMM d, yyyy")}</span>
                        </div>
                      </div>

                      {request.message && (
                        <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                          <p className="text-sm text-muted-foreground mb-1">Message:</p>
                          <p className="text-sm">{request.message}</p>
                        </div>
                      )}

                      {request.adminNotes && (
                        <div className="mb-4 p-3 bg-muted/10 border border-border/20 rounded-lg">
                          <p className="text-sm text-foreground dark:text-foreground mb-1">Admin Notes:</p>
                          <p className="text-sm">{request.adminNotes}</p>
                        </div>
                      )}

                      {request.status === "pending" && (
                        <div className="flex gap-2">
                          <Button 
                            onClick={() => handleApprove(request)} 
                            className="bg-muted hover:bg-muted"
                            data-testid={`button-approve-${request.id}`}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Approve
                          </Button>
                          <Button 
                            onClick={() => handleReject(request)} 
                            variant="destructive"
                            data-testid={`button-reject-${request.id}`}
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Reject
                          </Button>
                          <Button 
                            onClick={() => handleDelete(request.id)} 
                            variant="outline"
                            className="ml-auto"
                            data-testid={`button-delete-${request.id}`}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Review Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Tenant Request</DialogTitle>
            <DialogDescription>
              {selectedRequest && (
                <>Reviewing request from <strong>{selectedRequest.companyName}</strong></>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="admin-notes">Admin Notes (Optional)</Label>
              <Textarea
                id="admin-notes"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Add any internal notes about this decision..."
                rows={3}
                data-testid="input-admin-notes"
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              onClick={() => handleConfirmReview(false)}
              variant="destructive"
              disabled={updateRequestMutation.isPending}
              data-testid="button-confirm-reject"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Reject Request
            </Button>
            <Button
              onClick={() => handleConfirmReview(true)}
              className="bg-muted hover:bg-muted"
              disabled={updateRequestMutation.isPending}
              data-testid="button-confirm-approve"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Approve Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
