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
import { Plus, Edit, Trash2, Route as RouteIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Route {
  id: number;
  loadingPoint: string;
  destination: string;
  distance: string;
  normalRate?: string;
  holidayRate?: string;
  normalAmount?: string;
  holidayAmount?: string;
}

export function FleetlogixRoutesTab() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);
  const [formData, setFormData] = useState({
    loadingPoint: "",
    destination: "",
    distance: "",
    normalRate: "3.3",
    holidayRate: "4.8",
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: routes, isLoading } = useQuery<Route[]>({
    queryKey: ["/api/fleetlogix/routes"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const distance = parseFloat(data.distance);
      const normalRate = parseFloat(data.normalRate);
      const holidayRate = parseFloat(data.holidayRate);
      
      const payload = {
        ...data,
        normalAmount: (distance * normalRate).toFixed(2),
        holidayAmount: (distance * holidayRate).toFixed(2),
      };

      const response = await fetch("/api/fleetlogix/routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to create route");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fleetlogix/routes"] });
      toast({ title: "Route created successfully" });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast({ title: "Failed to create route", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: typeof formData }) => {
      const distance = parseFloat(data.distance);
      const normalRate = parseFloat(data.normalRate);
      const holidayRate = parseFloat(data.holidayRate);
      
      const payload = {
        ...data,
        normalAmount: (distance * normalRate).toFixed(2),
        holidayAmount: (distance * holidayRate).toFixed(2),
      };

      const response = await fetch(`/api/fleetlogix/routes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to update route");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fleetlogix/routes"] });
      toast({ title: "Route updated successfully" });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast({ title: "Failed to update route", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/fleetlogix/routes/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete route");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fleetlogix/routes"] });
      toast({ title: "Route deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete route", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      loadingPoint: "",
      destination: "",
      distance: "",
      normalRate: "3.3",
      holidayRate: "4.8",
    });
    setEditingRoute(null);
  };

  const handleEdit = (route: Route) => {
    setEditingRoute(route);
    setFormData({
      loadingPoint: route.loadingPoint,
      destination: route.destination,
      distance: route.distance,
      normalRate: route.normalRate || "3.3",
      holidayRate: route.holidayRate || "4.8",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingRoute) {
      updateMutation.mutate({ id: editingRoute.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-8">Loading routes...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Routes</h3>
          <p className="text-sm text-muted-foreground">Define routes with distances and rates</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              Add Route
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {editingRoute ? "Edit Route" : "Add Route"}
                </DialogTitle>
                <DialogDescription>
                  {editingRoute ? "Update route information" : "Add a new route with distances and rates"}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="loadingPoint">Loading Point *</Label>
                  <Input
                    id="loadingPoint"
                    placeholder="e.g., EXXARO LEEUWPAN"
                    value={formData.loadingPoint}
                    onChange={(e) => setFormData({ ...formData, loadingPoint: e.target.value })}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="destination">Destination *</Label>
                  <Input
                    id="destination"
                    placeholder="e.g., SASOL BOSJESSPRUIT"
                    value={formData.destination}
                    onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="distance">Distance (KM) *</Label>
                  <Input
                    id="distance"
                    type="number"
                    step="0.01"
                    placeholder="e.g., 102"
                    value={formData.distance}
                    onChange={(e) => setFormData({ ...formData, distance: e.target.value })}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="normalRate">Normal Rate (R/km)</Label>
                    <Input
                      id="normalRate"
                      type="number"
                      step="0.01"
                      value={formData.normalRate}
                      onChange={(e) => setFormData({ ...formData, normalRate: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="holidayRate">Holiday Rate (R/km)</Label>
                    <Input
                      id="holidayRate"
                      type="number"
                      step="0.01"
                      value={formData.holidayRate}
                      onChange={(e) => setFormData({ ...formData, holidayRate: e.target.value })}
                    />
                  </div>
                </div>
                {formData.distance && formData.normalRate && (
                  <div className="rounded-lg bg-muted p-3 text-sm">
                    <div className="flex justify-between mb-1">
                      <span>Normal Rate:</span>
                      <span className="font-semibold">R {(parseFloat(formData.distance) * parseFloat(formData.normalRate)).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Holiday Rate:</span>
                      <span className="font-semibold">R {(parseFloat(formData.distance) * parseFloat(formData.holidayRate)).toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button type="submit">
                  {editingRoute ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {!routes || routes.length === 0 ? (
        <div className="text-center py-12 border rounded-lg">
          <RouteIcon className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No routes yet</h3>
          <p className="text-sm text-muted-foreground">Get started by adding your first route.</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Loading Point</TableHead>
              <TableHead>Destination</TableHead>
              <TableHead>Distance</TableHead>
              <TableHead>Normal Rate</TableHead>
              <TableHead>Holiday Rate</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {routes?.map((route) => (
              <TableRow key={route.id}>
                <TableCell className="font-medium">{route.loadingPoint}</TableCell>
                <TableCell>{route.destination}</TableCell>
                <TableCell>{route.distance} km</TableCell>
                <TableCell>R {route.normalAmount || "-"}</TableCell>
                <TableCell>R {route.holidayAmount || "-"}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(route)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate(route.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
