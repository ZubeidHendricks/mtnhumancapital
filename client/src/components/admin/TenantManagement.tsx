import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Building2, DollarSign, Package, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface Tenant {
  id: number;
  name: string;
  domain: string;
  lmsEnabled?: boolean;
  gamificationEnabled?: boolean;
  aiLecturersEnabled?: boolean;
  certificatesEnabled?: boolean;
  paymentStatus?: string;
  subscriptionTier?: string;
  subscriptionExpiresAt?: string;
  createdAt: string;
}

export function TenantManagement() {
  const queryClient = useQueryClient();
  const [selectedTenantId, setSelectedTenantId] = useState<number | null>(null);

  const { data: tenants = [], isLoading } = useQuery<Tenant[]>({
    queryKey: ["/api/admin/tenants"],
  });

  const { data: selectedTenant } = useQuery<Tenant>({
    queryKey: ["/api/admin/tenants", selectedTenantId],
    enabled: !!selectedTenantId,
  });

  const updateModulesMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.patch(`/api/admin/tenants/${selectedTenantId}/modules`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tenants"] });
      toast.success("Tenant modules updated successfully");
    },
    onError: () => {
      toast.error("Failed to update tenant modules");
    },
  });

  const handleModuleToggle = (module: string, enabled: boolean) => {
    updateModulesMutation.mutate({ [module]: enabled });
  };

  const handlePaymentStatusChange = (status: string) => {
    updateModulesMutation.mutate({ paymentStatus: status });
  };

  const handleSubscriptionTierChange = (tier: string) => {
    updateModulesMutation.mutate({ subscriptionTier: tier });
  };

  const getPaymentStatusBadge = (status?: string) => {
    const badges = {
      trial: <Badge variant="outline" className="bg-blue-50">Trial</Badge>,
      active: <Badge variant="outline" className="bg-green-50"><CheckCircle2 className="h-3 w-3 mr-1" />Active</Badge>,
      suspended: <Badge variant="outline" className="bg-yellow-50"><AlertCircle className="h-3 w-3 mr-1" />Suspended</Badge>,
      cancelled: <Badge variant="outline" className="bg-red-50"><XCircle className="h-3 w-3 mr-1" />Cancelled</Badge>,
    };
    return badges[status as keyof typeof badges] || <Badge variant="outline">Unknown</Badge>;
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading tenants...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Tenant Management</h2>
        <p className="text-muted-foreground">Manage tenant access and modules</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tenant List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Tenants</CardTitle>
            <CardDescription>Select a tenant to manage</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {tenants.map((tenant) => (
              <button
                key={tenant.id}
                onClick={() => setSelectedTenantId(tenant.id)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  selectedTenantId === tenant.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "hover:bg-muted border-border"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-medium">{tenant.name}</div>
                    <div className="text-sm opacity-80">{tenant.domain}</div>
                  </div>
                  <Building2 className="h-4 w-4 mt-1 opacity-60" />
                </div>
                <div className="mt-2">
                  {getPaymentStatusBadge(tenant.paymentStatus)}
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Tenant Details & Controls */}
        {selectedTenant && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{selectedTenant.name}</span>
                {getPaymentStatusBadge(selectedTenant.paymentStatus)}
              </CardTitle>
              <CardDescription>Manage modules and billing for this tenant</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Payment Status */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-base font-semibold">Payment & Subscription</Label>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="payment-status">Payment Status</Label>
                    <Select
                      value={selectedTenant.paymentStatus || "trial"}
                      onValueChange={handlePaymentStatusChange}
                    >
                      <SelectTrigger id="payment-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="trial">Trial</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subscription-tier">Subscription Tier</Label>
                    <Select
                      value={selectedTenant.subscriptionTier || "basic"}
                      onValueChange={handleSubscriptionTierChange}
                    >
                      <SelectTrigger id="subscription-tier">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="basic">Basic</SelectItem>
                        <SelectItem value="professional">Professional</SelectItem>
                        <SelectItem value="enterprise">Enterprise</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Module Controls */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-base font-semibold">Enabled Modules</Label>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="space-y-0.5">
                      <Label htmlFor="lms-enabled" className="text-base">Learning Management System</Label>
                      <div className="text-sm text-muted-foreground">
                        Courses, assessments, and learning paths
                      </div>
                    </div>
                    <Switch
                      id="lms-enabled"
                      checked={selectedTenant.lmsEnabled || false}
                      onCheckedChange={(checked) => handleModuleToggle("lmsEnabled", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="space-y-0.5">
                      <Label htmlFor="gamification-enabled" className="text-base">Gamification</Label>
                      <div className="text-sm text-muted-foreground">
                        Badges, leaderboards, and achievements
                      </div>
                    </div>
                    <Switch
                      id="gamification-enabled"
                      checked={selectedTenant.gamificationEnabled || false}
                      onCheckedChange={(checked) => handleModuleToggle("gamificationEnabled", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="space-y-0.5">
                      <Label htmlFor="ai-lecturers-enabled" className="text-base">AI Lecturers</Label>
                      <div className="text-sm text-muted-foreground">
                        AI-generated training videos
                      </div>
                    </div>
                    <Switch
                      id="ai-lecturers-enabled"
                      checked={selectedTenant.aiLecturersEnabled || false}
                      onCheckedChange={(checked) => handleModuleToggle("aiLecturersEnabled", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="space-y-0.5">
                      <Label htmlFor="certificates-enabled" className="text-base">Certificates</Label>
                      <div className="text-sm text-muted-foreground">
                        Digital certificate generation and verification
                      </div>
                    </div>
                    <Switch
                      id="certificates-enabled"
                      checked={selectedTenant.certificatesEnabled || false}
                      onCheckedChange={(checked) => handleModuleToggle("certificatesEnabled", checked)}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Actions */}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSelectedTenantId(null)}>
                  Close
                </Button>
                <Button onClick={() => window.location.href = `/admin/tenant/${selectedTenant.id}/dashboard`}>
                  View Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {!selectedTenant && (
          <Card className="lg:col-span-2">
            <CardContent className="flex items-center justify-center h-full min-h-[400px]">
              <div className="text-center text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a tenant to view and manage their modules</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
