import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { FileCheck, AlertTriangle, CheckCircle, XCircle, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Reconciliation {
  id: number;
  month: string;
  loadingPoint: string;
  destination: string;
  distance: string;
  calculatedAmount: string;
  actualAmount: string;
  variance: string;
  reconciliationStatus: string;
  notes?: string;
}

export function FleetlogixReconciliationTab() {
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().substring(0, 7)
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Reconciliation | null>(null);
  const [formData, setFormData] = useState({
    month: selectedMonth,
    loadingPoint: "",
    destination: "",
    distance: "",
    normalRate: "3.3",
    holidayRate: "4.8",
    actualAmount: "",
    notes: "",
    reconciliationStatus: "pending",
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: reconciliations, isLoading } = useQuery<Reconciliation[]>({
    queryKey: ["/api/fleetlogix/reconciliation", selectedMonth],
    queryFn: async () => {
      const token = localStorage.getItem("ahc_auth_token");
      const headers: HeadersInit = {};
      if (token && token !== "demo_token") {
        headers.Authorization = `Bearer ${token}`;
      }
      
      const response = await fetch(
        `/api/fleetlogix/reconciliation?month=${selectedMonth}`,
        { 
          headers,
          credentials: "include" 
        }
      );
      if (!response.ok) throw new Error("Failed to fetch reconciliation data");
      return response.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const calculatedAmount = parseFloat(data.distance) * parseFloat(data.normalRate);
      const actualAmount = parseFloat(data.actualAmount);
      const variance = actualAmount - calculatedAmount;

      const payload = {
        ...data,
        calculatedAmount: calculatedAmount.toFixed(2),
        variance: variance.toFixed(2),
      };

      const token = localStorage.getItem("ahc_auth_token");
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (token && token !== "demo_token") {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch("/api/fleetlogix/reconciliation", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to create reconciliation");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/fleetlogix/reconciliation", selectedMonth] 
      });
      toast({ title: "Reconciliation entry created" });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast({ title: "Failed to create entry", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const token = localStorage.getItem("ahc_auth_token");
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (token && token !== "demo_token") {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(`/api/fleetlogix/reconciliation/${id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to update reconciliation");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/fleetlogix/reconciliation", selectedMonth] 
      });
      toast({ title: "Reconciliation updated" });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast({ title: "Failed to update entry", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      month: selectedMonth,
      loadingPoint: "",
      destination: "",
      distance: "",
      normalRate: "3.3",
      holidayRate: "4.8",
      actualAmount: "",
      notes: "",
      reconciliationStatus: "pending",
    });
    setEditingItem(null);
  };

  const handleEdit = (item: Reconciliation) => {
    setEditingItem(item);
    setFormData({
      month: item.month,
      loadingPoint: item.loadingPoint,
      destination: item.destination,
      distance: item.distance,
      normalRate: "3.3",
      holidayRate: "4.8",
      actualAmount: item.actualAmount,
      notes: item.notes || "",
      reconciliationStatus: item.reconciliationStatus,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const pendingCount = reconciliations?.filter(r => r.reconciliationStatus === "pending").length || 0;
  const approvedCount = reconciliations?.filter(r => r.reconciliationStatus === "approved").length || 0;
  const totalVariance = reconciliations?.reduce((sum, r) => sum + Number(r.variance || 0), 0) || 0;

  if (isLoading) {
    return <div className="flex items-center justify-center py-8">Loading reconciliation data...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Load Reconciliation</h3>
          <p className="text-sm text-muted-foreground">Reconcile loads and track variances</p>
        </div>
        <div className="flex gap-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="month">Month:</Label>
            <Input
              id="month"
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-40"
            />
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="mr-2 h-4 w-4" />
                Add Entry
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>
                    {editingItem ? "Edit Reconciliation" : "Add Reconciliation"}
                  </DialogTitle>
                  <DialogDescription>
                    {editingItem ? "Update reconciliation details" : "Add a new reconciliation entry"}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="loadingPoint">Loading Point *</Label>
                    <Input
                      id="loadingPoint"
                      value={formData.loadingPoint}
                      onChange={(e) => setFormData({ ...formData, loadingPoint: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="destination">Destination *</Label>
                    <Input
                      id="destination"
                      value={formData.destination}
                      onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="distance">Distance (km) *</Label>
                      <Input
                        id="distance"
                        type="number"
                        step="0.01"
                        value={formData.distance}
                        onChange={(e) => setFormData({ ...formData, distance: e.target.value })}
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="actualAmount">Actual Amount (R) *</Label>
                      <Input
                        id="actualAmount"
                        type="number"
                        step="0.01"
                        value={formData.actualAmount}
                        onChange={(e) => setFormData({ ...formData, actualAmount: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  {formData.distance && formData.actualAmount && (
                    <div className="rounded-lg bg-muted p-3 space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Calculated:</span>
                        <span className="font-semibold">
                          R {(parseFloat(formData.distance) * parseFloat(formData.normalRate)).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Actual:</span>
                        <span className="font-semibold">R {parseFloat(formData.actualAmount).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between border-t pt-1">
                        <span>Variance:</span>
                        <span className={`font-bold ${
                          (parseFloat(formData.actualAmount) - (parseFloat(formData.distance) * parseFloat(formData.normalRate))) > 0
                            ? "text-red-600"
                            : "text-green-600"
                        }`}>
                          R {(parseFloat(formData.actualAmount) - (parseFloat(formData.distance) * parseFloat(formData.normalRate))).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}
                  <div className="grid gap-2">
                    <Label htmlFor="status">Status</Label>
                    <Select 
                      value={formData.reconciliationStatus} 
                      onValueChange={(value) => setFormData({ ...formData, reconciliationStatus: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Add any notes or comments..."
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">
                    {editingItem ? "Update" : "Create"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
            <p className="text-xs text-muted-foreground">Entries awaiting review</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{approvedCount}</div>
            <p className="text-xs text-muted-foreground">Reconciled entries</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Variance</CardTitle>
            <FileCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalVariance > 0 ? "text-red-600" : "text-green-600"}`}>
              R {totalVariance.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">For {selectedMonth}</p>
          </CardContent>
        </Card>
      </div>

      {/* Reconciliation Table */}
      {!reconciliations || reconciliations.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <FileCheck className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No reconciliation data for {selectedMonth}</h3>
            <p className="text-sm text-muted-foreground">Add entries to track load reconciliation</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Reconciliation Entries</CardTitle>
            <CardDescription>
              Load reconciliation details for {selectedMonth}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Route</TableHead>
                  <TableHead className="text-right">Distance</TableHead>
                  <TableHead className="text-right">Calculated</TableHead>
                  <TableHead className="text-right">Actual</TableHead>
                  <TableHead className="text-right">Variance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reconciliations?.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">{item.loadingPoint}</div>
                        <div className="text-muted-foreground">→ {item.destination}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{item.distance} km</TableCell>
                    <TableCell className="text-right">R {Number(item.calculatedAmount).toFixed(2)}</TableCell>
                    <TableCell className="text-right">R {Number(item.actualAmount).toFixed(2)}</TableCell>
                    <TableCell className={`text-right font-semibold ${
                      Number(item.variance) > 0 ? "text-red-600" : "text-green-600"
                    }`}>
                      R {Number(item.variance).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {item.reconciliationStatus === "approved" ? (
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-green-100 text-green-800">
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Approved
                        </span>
                      ) : item.reconciliationStatus === "rejected" ? (
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-red-100 text-red-800">
                          <XCircle className="mr-1 h-3 w-3" />
                          Rejected
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-yellow-100 text-yellow-800">
                          <AlertTriangle className="mr-1 h-3 w-3" />
                          Pending
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(item)}
                      >
                        Review
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
