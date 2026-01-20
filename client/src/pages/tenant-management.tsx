import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BackButton } from "@/components/ui/back-button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Building2,
  DollarSign,
  CreditCard,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Settings,
  Plus,
  Eye,
  Loader2,
} from "lucide-react";
import { api } from "@/lib/api";
import type { TenantConfig, TenantPayment } from "@shared/schema";
import { toast } from "sonner";
import { format } from "date-fns";

export default function TenantManagementPage() {
  const queryClient = useQueryClient();
  const [selectedTenant, setSelectedTenant] = useState<TenantConfig | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showSubscriptionDialog, setShowSubscriptionDialog] = useState(false);

  // Fetch all tenants
  const { data: tenants = [], isLoading: tenantsLoading } = useQuery<TenantConfig[]>({
    queryKey: ["admin-tenants"],
    queryFn: async () => {
      const response = await api.get("/admin/tenants");
      return response.data;
    },
  });

  // Fetch payments for selected tenant
  const { data: payments = [], isLoading: paymentsLoading } = useQuery<TenantPayment[]>({
    queryKey: ["tenant-payments", selectedTenant?.id],
    queryFn: async () => {
      if (!selectedTenant) return [];
      const response = await api.get(`/admin/tenants/${selectedTenant.id}/payments`);
      return response.data;
    },
    enabled: !!selectedTenant,
  });

  // Record payment mutation
  const recordPaymentMutation = useMutation({
    mutationFn: async (payment: any) => {
      const response = await api.post(`/admin/tenants/${selectedTenant!.id}/payments`, payment);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-payments"] });
      queryClient.invalidateQueries({ queryKey: ["admin-tenants"] });
      toast.success("Payment recorded successfully");
      setShowPaymentDialog(false);
    },
    onError: () => {
      toast.error("Failed to record payment");
    },
  });

  // Update subscription mutation
  const updateSubscriptionMutation = useMutation({
    mutationFn: async (updates: any) => {
      const response = await api.patch(`/admin/tenants/${selectedTenant!.id}/subscription`, updates);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tenants"] });
      toast.success("Subscription updated successfully");
      setShowSubscriptionDialog(false);
    },
    onError: () => {
      toast.error("Failed to update subscription");
    },
  });

  // Toggle module
  const toggleModuleMutation = useMutation({
    mutationFn: async ({ tenantId, moduleName, enabled }: { tenantId: string; moduleName: string; enabled: boolean }) => {
      const tenant = tenants.find(t => t.id === tenantId);
      if (!tenant) throw new Error("Tenant not found");

      const newModules = { ...(tenant.modulesEnabled as any || {}), [moduleName]: enabled };
      const response = await api.patch(`/admin/tenants/${tenantId}/subscription`, {
        modulesEnabled: newModules,
      });
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

  const getSubscriptionStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "destructive" | "outline" | "secondary"; icon: any }> = {
      trial: { variant: "secondary", icon: Clock },
      active: { variant: "default", icon: CheckCircle2 },
      suspended: { variant: "destructive", icon: XCircle },
      cancelled: { variant: "outline", icon: AlertTriangle },
    };

    const config = variants[status] || variants.trial;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="w-3 h-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getPaymentStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "destructive" | "outline" | "secondary"> = {
      completed: "default",
      pending: "secondary",
      failed: "destructive",
      refunded: "outline",
    };

    return (
      <Badge variant={variants[status] || "outline"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatCurrency = (cents: number) => {
    return `R${(cents / 100).toFixed(2)}`;
  };

  const calculateTotalRevenue = (tenant: TenantConfig) => {
    const tenantPayments = payments.filter(p => p.tenantId === tenant.id && p.status === "completed");
    return tenantPayments.reduce((sum, p) => sum + p.amount, 0);
  };

  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto p-4 md:p-6 space-y-6 pt-20 md:pt-24">
        <BackButton fallbackPath="/admin-dashboard" />

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-2">
              <Building2 className="w-8 h-8 text-primary" />
              Tenant Management
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage subscriptions, payments, and module access
            </p>
          </div>
        </div>

        {/* Tenants Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="bg-black/40 border-white/10">
            <CardHeader>
              <CardTitle className="text-white text-sm font-medium">Total Tenants</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-white">{tenants.length}</p>
            </CardContent>
          </Card>

          <Card className="bg-black/40 border-white/10">
            <CardHeader>
              <CardTitle className="text-white text-sm font-medium">Active Subscriptions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-500">
                {tenants.filter(t => t.subscriptionStatus === "active").length}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-black/40 border-white/10">
            <CardHeader>
              <CardTitle className="text-white text-sm font-medium">Trials</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-yellow-500">
                {tenants.filter(t => t.subscriptionStatus === "trial").length}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tenants Table */}
        <Card className="bg-black/40 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">All Tenants</CardTitle>
            <CardDescription>Manage tenant subscriptions and access</CardDescription>
          </CardHeader>
          <CardContent>
            {tenantsLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : tenants.length === 0 ? (
              <div className="text-center p-8 text-muted-foreground">
                No tenants found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10">
                      <TableHead className="text-white">Company</TableHead>
                      <TableHead className="text-white">Subdomain</TableHead>
                      <TableHead className="text-white">Status</TableHead>
                      <TableHead className="text-white">Tier</TableHead>
                      <TableHead className="text-white">Next Payment</TableHead>
                      <TableHead className="text-white">Modules</TableHead>
                      <TableHead className="text-white text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tenants.map((tenant) => (
                      <TableRow key={tenant.id} className="border-white/10">
                        <TableCell className="font-medium text-white">
                          {tenant.companyName}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {tenant.subdomain}
                        </TableCell>
                        <TableCell>
                          {getSubscriptionStatusBadge(tenant.subscriptionStatus || "trial")}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {(tenant.subscriptionTier || "free").toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {tenant.nextPaymentDate
                            ? format(new Date(tenant.nextPaymentDate), "MMM dd, yyyy")
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {Object.entries((tenant.modulesEnabled as any) || {})
                              .filter(([_, enabled]) => enabled)
                              .map(([module]) => (
                                <Badge key={module} variant="secondary" className="text-xs">
                                  {module.slice(0, 3)}
                                </Badge>
                              ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedTenant(tenant)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Selected Tenant Details */}
        {selectedTenant && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Subscription Management */}
            <Card className="bg-black/40 border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center justify-between">
                  <span>Subscription Details</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSubscriptionDialog(true)}
                  >
                    <Settings className="w-4 h-4 mr-1" />
                    Update
                  </Button>
                </CardTitle>
                <CardDescription>{selectedTenant.companyName}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground text-xs">Status</Label>
                    <div className="mt-1">
                      {getSubscriptionStatusBadge(selectedTenant.subscriptionStatus || "trial")}
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Tier</Label>
                    <p className="text-white mt-1">
                      {(selectedTenant.subscriptionTier || "free").toUpperCase()}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Started</Label>
                    <p className="text-white mt-1">
                      {selectedTenant.subscriptionStartedAt
                        ? format(new Date(selectedTenant.subscriptionStartedAt), "MMM dd, yyyy")
                        : "-"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Next Payment</Label>
                    <p className="text-white mt-1">
                      {selectedTenant.nextPaymentDate
                        ? format(new Date(selectedTenant.nextPaymentDate), "MMM dd, yyyy")
                        : "-"}
                    </p>
                  </div>
                </div>

                <Separator className="bg-white/10" />

                <div>
                  <Label className="text-white mb-3 block">Enabled Modules</Label>
                  <div className="space-y-2">
                    {[
                      { key: "recruitment", label: "Recruitment & Selection" },
                      { key: "integrity", label: "Integrity Evaluation" },
                      { key: "onboarding", label: "Company Onboarding" },
                      { key: "hr_management", label: "HR Management" },
                    ].map((module) => (
                      <div
                        key={module.key}
                        className="flex items-center justify-between p-3 rounded-lg bg-black/20 border border-white/5"
                      >
                        <span className="text-white text-sm">{module.label}</span>
                        <Switch
                          checked={(selectedTenant.modulesEnabled as any)?.[module.key] || false}
                          onCheckedChange={(checked) => {
                            toggleModuleMutation.mutate({
                              tenantId: selectedTenant.id,
                              moduleName: module.key,
                              enabled: checked,
                            });
                          }}
                          disabled={toggleModuleMutation.isPending}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment History */}
            <Card className="bg-black/40 border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center justify-between">
                  <span>Payment History</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPaymentDialog(true)}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Record Payment
                  </Button>
                </CardTitle>
                <CardDescription>Transaction history</CardDescription>
              </CardHeader>
              <CardContent>
                {paymentsLoading ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : payments.length === 0 ? (
                  <div className="text-center p-8 text-muted-foreground">
                    No payments recorded
                  </div>
                ) : (
                  <div className="space-y-3">
                    {payments.map((payment) => (
                      <div
                        key={payment.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-black/20 border border-white/5"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-green-500" />
                            <span className="text-white font-medium">
                              {formatCurrency(payment.amount)}
                            </span>
                            {getPaymentStatusBadge(payment.status)}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {payment.description || "Payment"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(payment.createdAt), "MMM dd, yyyy")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {payments.length > 0 && (
                  <>
                    <Separator className="my-4 bg-white/10" />
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground text-sm">Total Revenue</span>
                      <span className="text-white font-bold text-lg">
                        {formatCurrency(payments.filter(p => p.status === "completed").reduce((sum, p) => sum + p.amount, 0))}
                      </span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Record Payment Dialog */}
        <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
          <DialogContent className="bg-zinc-950 border-white/10">
            <DialogHeader>
              <DialogTitle className="text-white">Record Payment</DialogTitle>
              <DialogDescription>
                Record a payment for {selectedTenant?.companyName}
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                recordPaymentMutation.mutate({
                  amount: parseInt(formData.get("amount") as string) * 100, // Convert to cents
                  status: formData.get("status"),
                  paymentMethod: formData.get("paymentMethod"),
                  description: formData.get("description"),
                  transactionId: formData.get("transactionId") || undefined,
                  paidAt: formData.get("status") === "completed" ? new Date() : undefined,
                });
              }}
            >
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="amount" className="text-white">Amount (R)</Label>
                  <Input
                    id="amount"
                    name="amount"
                    type="number"
                    step="0.01"
                    required
                    placeholder="1000.00"
                    className="bg-black/40 border-white/10 text-white"
                  />
                </div>

                <div>
                  <Label htmlFor="status" className="text-white">Status</Label>
                  <Select name="status" defaultValue="completed">
                    <SelectTrigger className="bg-black/40 border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-950 border-white/10">
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="paymentMethod" className="text-white">Payment Method</Label>
                  <Select name="paymentMethod" defaultValue="bank_transfer">
                    <SelectTrigger className="bg-black/40 border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-950 border-white/10">
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="invoice">Invoice</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="transactionId" className="text-white">Transaction ID (Optional)</Label>
                  <Input
                    id="transactionId"
                    name="transactionId"
                    placeholder="TXN-12345"
                    className="bg-black/40 border-white/10 text-white"
                  />
                </div>

                <div>
                  <Label htmlFor="description" className="text-white">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="Monthly subscription payment"
                    className="bg-black/40 border-white/10 text-white"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowPaymentDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={recordPaymentMutation.isPending}
                >
                  {recordPaymentMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Recording...
                    </>
                  ) : (
                    "Record Payment"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Update Subscription Dialog */}
        <Dialog open={showSubscriptionDialog} onOpenChange={setShowSubscriptionDialog}>
          <DialogContent className="bg-zinc-950 border-white/10">
            <DialogHeader>
              <DialogTitle className="text-white">Update Subscription</DialogTitle>
              <DialogDescription>
                Update subscription details for {selectedTenant?.companyName}
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const nextPaymentDate = formData.get("nextPaymentDate") as string;
                
                updateSubscriptionMutation.mutate({
                  subscriptionStatus: formData.get("subscriptionStatus"),
                  subscriptionTier: formData.get("subscriptionTier"),
                  nextPaymentDate: nextPaymentDate ? new Date(nextPaymentDate) : undefined,
                  billingEmail: formData.get("billingEmail") || undefined,
                });
              }}
            >
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="subscriptionStatus" className="text-white">Status</Label>
                  <Select name="subscriptionStatus" defaultValue={selectedTenant?.subscriptionStatus || "trial"}>
                    <SelectTrigger className="bg-black/40 border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-950 border-white/10">
                      <SelectItem value="trial">Trial</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="subscriptionTier" className="text-white">Tier</Label>
                  <Select name="subscriptionTier" defaultValue={selectedTenant?.subscriptionTier || "free"}>
                    <SelectTrigger className="bg-black/40 border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-950 border-white/10">
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="basic">Basic</SelectItem>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="nextPaymentDate" className="text-white">Next Payment Date</Label>
                  <Input
                    id="nextPaymentDate"
                    name="nextPaymentDate"
                    type="date"
                    defaultValue={selectedTenant?.nextPaymentDate ? format(new Date(selectedTenant.nextPaymentDate), "yyyy-MM-dd") : ""}
                    className="bg-black/40 border-white/10 text-white"
                  />
                </div>

                <div>
                  <Label htmlFor="billingEmail" className="text-white">Billing Email</Label>
                  <Input
                    id="billingEmail"
                    name="billingEmail"
                    type="email"
                    placeholder="billing@company.com"
                    defaultValue={selectedTenant?.billingEmail || ""}
                    className="bg-black/40 border-white/10 text-white"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowSubscriptionDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateSubscriptionMutation.isPending}
                >
                  {updateSubscriptionMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Update Subscription"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
