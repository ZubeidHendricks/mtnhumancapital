import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Plus, Edit, Trash2, Package, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Load {
  id: number;
  loadDate: string;
  route?: { loadingPoint: string; destination: string; distance: string };
  driver?: { name: string };
  vehicle?: { registrationNumber: string };
  ticketNumberB?: string;
  ticketNumberW?: string;
  tonnageB?: string;
  tonnageW?: string;
  distance?: string;
  rate?: string;
  isHoliday: boolean;
  status: string;
}

export function FleetlogixLoadsTab() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLoad, setEditingLoad] = useState<Load | null>(null);
  const [formData, setFormData] = useState({
    loadDate: new Date().toISOString().split('T')[0],
    routeId: "",
    vehicleId: "",
    driverId: "",
    ticketNumberB: "",
    ticketNumberW: "",
    tonnageB: "",
    tonnageW: "",
    distance: "",
    rate: "",
    isHoliday: false,
    status: "pending",
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: loads, isLoading } = useQuery<any[]>({
    queryKey: ["/api/fleetlogix/loads"],
  });

  const { data: drivers } = useQuery<any[]>({
    queryKey: ["/api/fleetlogix/drivers"],
  });

  const { data: vehicles } = useQuery<any[]>({
    queryKey: ["/api/fleetlogix/vehicles"],
  });

  const { data: routes } = useQuery<any[]>({
    queryKey: ["/api/fleetlogix/routes"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await fetch("/api/fleetlogix/loads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to create load");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fleetlogix/loads"] });
      toast({ title: "Load created successfully" });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast({ title: "Failed to create load", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: typeof formData }) => {
      const response = await fetch(`/api/fleetlogix/loads/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to update load");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fleetlogix/loads"] });
      toast({ title: "Load updated successfully" });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast({ title: "Failed to update load", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/fleetlogix/loads/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete load");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fleetlogix/loads"] });
      toast({ title: "Load deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete load", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      loadDate: new Date().toISOString().split('T')[0],
      routeId: "",
      vehicleId: "",
      driverId: "",
      ticketNumberB: "",
      ticketNumberW: "",
      tonnageB: "",
      tonnageW: "",
      distance: "",
      rate: "",
      isHoliday: false,
      status: "pending",
    });
    setEditingLoad(null);
  };

  const handleEdit = (load: any) => {
    setEditingLoad(load);
    setFormData({
      loadDate: load.load?.loadDate || new Date().toISOString().split('T')[0],
      routeId: load.load?.routeId?.toString() || "",
      vehicleId: load.load?.vehicleId?.toString() || "",
      driverId: load.load?.driverId?.toString() || "",
      ticketNumberB: load.load?.ticketNumberB || "",
      ticketNumberW: load.load?.ticketNumberW || "",
      tonnageB: load.load?.tonnageB || "",
      tonnageW: load.load?.tonnageW || "",
      distance: load.load?.distance || "",
      rate: load.load?.rate || "",
      isHoliday: load.load?.isHoliday || false,
      status: load.load?.status || "pending",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingLoad) {
      updateMutation.mutate({ id: editingLoad.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-8">Loading loads...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Loads</h3>
          <p className="text-sm text-muted-foreground">Track and manage all fleet loads</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              Create Load
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {editingLoad ? "Edit Load" : "Create Load"}
                </DialogTitle>
                <DialogDescription>
                  {editingLoad ? "Update load information" : "Create a new load assignment"}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="loadDate">Load Date *</Label>
                    <Input
                      id="loadDate"
                      type="date"
                      value={formData.loadDate}
                      onChange={(e) => setFormData({ ...formData, loadDate: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="status">Status</Label>
                    <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in-transit">In Transit</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="routeId">Route *</Label>
                  <Select 
                    value={formData.routeId} 
                    onValueChange={(value) => {
                      const route = routes?.find(r => r.id === parseInt(value));
                      setFormData({ 
                        ...formData, 
                        routeId: value,
                        distance: route?.distance || "",
                        rate: route?.normalRate || ""
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a route" />
                    </SelectTrigger>
                    <SelectContent>
                      {routes?.map((route) => (
                        <SelectItem key={route.id} value={route.id.toString()}>
                          {route.loadingPoint} → {route.destination} ({route.distance} km)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="driverId">Driver *</Label>
                    <Select value={formData.driverId} onValueChange={(value) => setFormData({ ...formData, driverId: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a driver" />
                      </SelectTrigger>
                      <SelectContent>
                        {drivers?.map((driver) => (
                          <SelectItem key={driver.id} value={driver.id.toString()}>
                            {driver.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="vehicleId">Vehicle *</Label>
                    <Select value={formData.vehicleId} onValueChange={(value) => setFormData({ ...formData, vehicleId: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a vehicle" />
                      </SelectTrigger>
                      <SelectContent>
                        {vehicles?.map((vehicle) => (
                          <SelectItem key={vehicle.id} value={vehicle.id.toString()}>
                            {vehicle.registrationNumber} {vehicle.fleetCode ? `(${vehicle.fleetCode})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="ticketNumberB">Ticket # (B)</Label>
                    <Input
                      id="ticketNumberB"
                      placeholder="e.g., B12345"
                      value={formData.ticketNumberB}
                      onChange={(e) => setFormData({ ...formData, ticketNumberB: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="tonnageB">Tonnage (B)</Label>
                    <Input
                      id="tonnageB"
                      type="number"
                      step="0.01"
                      placeholder="e.g., 30.5"
                      value={formData.tonnageB}
                      onChange={(e) => setFormData({ ...formData, tonnageB: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="ticketNumberW">Ticket # (W)</Label>
                    <Input
                      id="ticketNumberW"
                      placeholder="e.g., W12345"
                      value={formData.ticketNumberW}
                      onChange={(e) => setFormData({ ...formData, ticketNumberW: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="tonnageW">Tonnage (W)</Label>
                    <Input
                      id="tonnageW"
                      type="number"
                      step="0.01"
                      placeholder="e.g., 28.5"
                      value={formData.tonnageW}
                      onChange={(e) => setFormData({ ...formData, tonnageW: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="distance">Distance (km)</Label>
                    <Input
                      id="distance"
                      type="number"
                      step="0.01"
                      value={formData.distance}
                      onChange={(e) => setFormData({ ...formData, distance: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="rate">Rate (R/km)</Label>
                    <Input
                      id="rate"
                      type="number"
                      step="0.01"
                      value={formData.rate}
                      onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="isHoliday">Holiday Rate</Label>
                    <Select 
                      value={formData.isHoliday ? "yes" : "no"} 
                      onValueChange={(value) => setFormData({ ...formData, isHoliday: value === "yes" })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="no">No</SelectItem>
                        <SelectItem value="yes">Yes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {formData.distance && formData.rate && (
                  <div className="rounded-lg bg-muted p-3">
                    <div className="text-sm font-semibold mb-1">Estimated Cost</div>
                    <div className="text-2xl font-bold">
                      R {(parseFloat(formData.distance) * parseFloat(formData.rate)).toFixed(2)}
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button type="submit">
                  {editingLoad ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {!loads || loads.length === 0 ? (
        <div className="text-center py-12 border rounded-lg">
          <Package className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No loads yet</h3>
          <p className="text-sm text-muted-foreground">Create your first load to get started.</p>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Route</TableHead>
                <TableHead>Driver</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Tonnage</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loads?.map((item) => (
                <TableRow key={item.load?.id}>
                  <TableCell className="font-medium">
                    {item.load?.loadDate ? new Date(item.load.loadDate).toLocaleDateString() : "-"}
                  </TableCell>
                  <TableCell>
                    {item.route ? (
                      <div className="text-sm">
                        <div className="font-medium">{item.route.loadingPoint}</div>
                        <div className="text-muted-foreground">→ {item.route.destination}</div>
                      </div>
                    ) : "-"}
                  </TableCell>
                  <TableCell>{item.driver?.name || "-"}</TableCell>
                  <TableCell>{item.vehicle?.registrationNumber || "-"}</TableCell>
                  <TableCell>
                    {item.load?.tonnageB ? `${item.load.tonnageB}t` : "-"}
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-xs ${
                      item.load?.status === "delivered" 
                        ? "bg-green-100 text-green-800" 
                        : item.load?.status === "in-transit"
                        ? "bg-blue-100 text-blue-800"
                        : item.load?.status === "pending"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-gray-100 text-gray-800"
                    }`}>
                      {item.load?.status || "pending"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(item)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate(item.load?.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
