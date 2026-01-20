import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Building2, CreditCard, ToggleLeft, Eye, DollarSign, Calendar, Users, Activity } from "lucide-react";
import { useLocation } from "wouter";

interface Tenant {
  id: string;
  companyName: string;
  subdomain: string;
  industry: string;
  modulesEnabled: {
    recruitment?: boolean;
    integrity?: boolean;
    onboarding?: boolean;
    hr_management?: boolean;
    lms?: boolean;
  };
  paymentStatus: string;
  subscriptionTier: string;
  nextBillingDate?: string;
  totalRevenue?: number;
  activeUsers?: number;
}

export default function AdminTenantManagement() {
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);

  const { data: tenants = [], isLoading } = useQuery<Tenant[]>({
    queryKey: ["admin-tenants"],
    queryFn: async () => {
      const response = await api.get("/admin/tenants");
      return response.data;
    },
  });

  const updateModuleMutation = useMutation({
    mutationFn: async ({ tenantId, module, enabled }: { tenantId: string; module: string; enabled: boolean }) => {
      const response = await api.patch(`/admin/tenants/${tenantId}/modules`, { module, enabled });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tenants"] });
      toast.success("Module updated successfully");
    },
    onError: () => {
      toast.error("Failed to update module");
    },
  });

  const updatePaymentMutation = useMutation({
    mutationFn: async ({ tenantId, status }: { tenantId: string; status: string }) => {
      const response = await api.patch(`/admin/tenants/${tenantId}/payment`, { status });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tenants"] });
      toast.success("Payment status updated");
    },
    onError: () => {
      toast.error("Failed to update payment status");
    },
  });

  const viewTenantDashboard = (tenant: Tenant) => {
    // Switch context to tenant and navigate to their dashboard
    localStorage.setItem("impersonateTenant", tenant.id);
    navigate("/dashboard");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-500";
      case "suspended": return "bg-red-500";
      case "trial": return "bg-yellow-500";
      default: return "bg-gray-500";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Tenant Management</h1>
            <p className="text-muted-foreground">Manage all tenants, modules, and payments</p>
          </div>
          <Button onClick={() => navigate("/admin-dashboard")}>Back to Admin</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Tenants</p>
                  <p className="text-2xl font-bold">{tenants.length}</p>
                </div>
                <Building2 className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active</p>
                  <p className="text-2xl font-bold">{tenants.filter(t => t.paymentStatus === "active").length}</p>
                </div>
                <Activity className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-bold">
                    R{tenants.reduce((sum, t) => sum + (t.totalRevenue || 0), 0).toLocaleString()}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                  <p className="text-2xl font-bold">
                    {tenants.reduce((sum, t) => sum + (t.activeUsers || 0), 0)}
                  </p>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Tenants</CardTitle>
            <CardDescription>View and manage tenant configurations</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead>Payment Status</TableHead>
                  <TableHead>Subscription</TableHead>
                  <TableHead>Modules</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenants.map((tenant) => (
                  <TableRow key={tenant.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{tenant.companyName}</div>
                        <div className="text-sm text-muted-foreground">{tenant.subdomain}</div>
                      </div>
                    </TableCell>
                    <TableCell>{tenant.industry}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(tenant.paymentStatus)}>
                        {tenant.paymentStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>{tenant.subscriptionTier}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {tenant.modulesEnabled.recruitment && <Badge variant="outline">Recruitment</Badge>}
                        {tenant.modulesEnabled.integrity && <Badge variant="outline">Integrity</Badge>}
                        {tenant.modulesEnabled.onboarding && <Badge variant="outline">Onboarding</Badge>}
                        {tenant.modulesEnabled.hr_management && <Badge variant="outline">HR</Badge>}
                        {tenant.modulesEnabled.lms && <Badge variant="outline">LMS</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => viewTenantDashboard(tenant)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline" onClick={() => setSelectedTenant(tenant)}>
                              <ToggleLeft className="h-4 w-4 mr-1" />
                              Modules
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Manage Modules - {tenant.companyName}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              {Object.entries(tenant.modulesEnabled).map(([module, enabled]) => (
                                <div key={module} className="flex items-center justify-between">
                                  <Label className="capitalize">{module.replace("_", " ")}</Label>
                                  <Switch
                                    checked={enabled}
                                    onCheckedChange={(checked) =>
                                      updateModuleMutation.mutate({
                                        tenantId: tenant.id,
                                        module,
                                        enabled: checked,
                                      })
                                    }
                                  />
                                </div>
                              ))}
                            </div>
                          </DialogContent>
                        </Dialog>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline" onClick={() => setSelectedTenant(tenant)}>
                              <CreditCard className="h-4 w-4 mr-1" />
                              Payment
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Payment Management - {tenant.companyName}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label>Payment Status</Label>
                                <div className="flex gap-2 mt-2">
                                  {["active", "suspended", "trial"].map((status) => (
                                    <Button
                                      key={status}
                                      size="sm"
                                      variant={tenant.paymentStatus === status ? "default" : "outline"}
                                      onClick={() =>
                                        updatePaymentMutation.mutate({
                                          tenantId: tenant.id,
                                          status,
                                        })
                                      }
                                    >
                                      {status}
                                    </Button>
                                  ))}
                                </div>
                              </div>
                              <Separator />
                              <div className="space-y-2">
                                <div className="flex justify-between">
                                  <span className="text-sm text-muted-foreground">Next Billing Date</span>
                                  <span className="text-sm font-medium">{tenant.nextBillingDate || "N/A"}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm text-muted-foreground">Total Revenue</span>
                                  <span className="text-sm font-medium">R{tenant.totalRevenue?.toLocaleString() || 0}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm text-muted-foreground">Active Users</span>
                                  <span className="text-sm font-medium">{tenant.activeUsers || 0}</span>
                                </div>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
