import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
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
import { Plus, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Driver {
  id: string; // Changed from number to string (UUID)
  name: string;
  licenseNumber?: string;
  licenseType?: string;
  phone?: string;
  email?: string;
  idNumber?: string;
  address?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  status: string;
  hireDate?: string;
  basicSalary?: string;
  salaryPeriod?: string;
  bonusPerLoad?: string;
}

export function FleetlogixDriversTab() {
  const [, setLocation] = useLocation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    licenseNumber: "",
    licenseType: "",
    phone: "",
    email: "",
    idNumber: "",
    address: "",
    emergencyContact: "",
    emergencyPhone: "",
    status: "active",
    hireDate: "",
    basicSalary: "",
    salaryPeriod: "monthly",
    bonusPerLoad: "",
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: drivers, isLoading, error } = useQuery<Driver[]>({
    queryKey: ["/api/fleetlogix/drivers"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const token = localStorage.getItem("ahc_auth_token");
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (token && token !== "demo_token") {
        headers.Authorization = `Bearer ${token}`;
      }
      
      const response = await fetch("/api/fleetlogix/drivers", {
        method: "POST",
        headers,
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to create driver");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fleetlogix/drivers"] });
      toast({ title: "Driver created successfully" });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast({ title: "Failed to create driver", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const token = localStorage.getItem("ahc_auth_token");
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (token && token !== "demo_token") {
        headers.Authorization = `Bearer ${token}`;
      }
      
      const response = await fetch(`/api/fleetlogix/drivers/${id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to update driver");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fleetlogix/drivers"] });
      toast({ title: "Driver updated successfully" });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast({ title: "Failed to update driver", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/fleetlogix/drivers/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete driver");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fleetlogix/drivers"] });
      toast({ title: "Driver deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete driver", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      licenseNumber: "",
      licenseType: "",
      phone: "",
      email: "",
      idNumber: "",
      address: "",
      emergencyContact: "",
      emergencyPhone: "",
      status: "active",
      hireDate: "",
      basicSalary: "",
      salaryPeriod: "monthly",
      bonusPerLoad: "",
    });
    setEditingDriver(null);
  };

  const handleEdit = (driver: Driver) => {
    setEditingDriver(driver);
    setFormData({
      name: driver.name,
      licenseNumber: driver.licenseNumber || "",
      licenseType: driver.licenseType || "",
      phone: driver.phone || "",
      email: driver.email || "",
      idNumber: driver.idNumber || "",
      address: driver.address || "",
      emergencyContact: driver.emergencyContact || "",
      emergencyPhone: driver.emergencyPhone || "",
      status: driver.status,
      hireDate: driver.hireDate || "",
      basicSalary: driver.basicSalary || "",
      salaryPeriod: driver.salaryPeriod || "monthly",
      bonusPerLoad: driver.bonusPerLoad || "",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingDriver) {
      updateMutation.mutate({ id: editingDriver.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Loading drivers...</div>;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <div className="text-red-500 font-semibold">Unable to load drivers</div>
        <div className="text-sm text-muted-foreground">
          Please make sure you're logged in. If you are logged in, try refreshing the page.
        </div>
        <Button onClick={() => window.location.reload()}>Refresh Page</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-semibold">Fleet Drivers</h3>
          <p className="text-sm text-muted-foreground">Manage driver information and salaries</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setLocation("/add-driver")} size="lg">
            <Plus className="mr-2 h-4 w-4" />
            Add New Driver
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm} variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Quick Add
              </Button>
            </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {editingDriver ? "Edit Driver" : "Add Driver"}
                </DialogTitle>
                <DialogDescription>
                  {editingDriver ? "Update driver information" : "Add a new driver to the fleet"}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="licenseNumber">License Number</Label>
                  <Input
                    id="licenseNumber"
                    value={formData.licenseNumber}
                    onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="licenseType">License Type</Label>
                  <Select value={formData.licenseType} onValueChange={(value) => setFormData({ ...formData, licenseType: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select license type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Code 8">Code 8</SelectItem>
                      <SelectItem value="Code 10">Code 10</SelectItem>
                      <SelectItem value="Code 14">Code 14</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="idNumber">ID Number</Label>
                  <Input
                    id="idNumber"
                    value={formData.idNumber}
                    onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="hireDate">Hire Date</Label>
                  <Input
                    id="hireDate"
                    type="date"
                    value={formData.hireDate}
                    onChange={(e) => setFormData({ ...formData, hireDate: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="basicSalary">Basic Salary (R)</Label>
                  <Input
                    id="basicSalary"
                    type="number"
                    step="0.01"
                    value={formData.basicSalary}
                    onChange={(e) => setFormData({ ...formData, basicSalary: e.target.value })}
                    placeholder="15000.00"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="salaryPeriod">Salary Period</Label>
                  <Select value={formData.salaryPeriod} onValueChange={(value) => setFormData({ ...formData, salaryPeriod: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="bonusPerLoad">Bonus Per Load (R)</Label>
                  <Input
                    id="bonusPerLoad"
                    type="number"
                    step="0.01"
                    value={formData.bonusPerLoad}
                    onChange={(e) => setFormData({ ...formData, bonusPerLoad: e.target.value })}
                    placeholder="500.00"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">
                  {editingDriver ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>License</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Basic Salary</TableHead>
            <TableHead>Bonus/Load</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {drivers?.map((driver) => (
            <TableRow key={driver.id}>
              <TableCell className="font-medium">{driver.name}</TableCell>
              <TableCell>{driver.licenseNumber ? `${driver.licenseNumber} (${driver.licenseType || 'N/A'})` : "-"}</TableCell>
              <TableCell>{driver.phone || "-"}</TableCell>
              <TableCell>{driver.email || "-"}</TableCell>
              <TableCell>{driver.basicSalary ? `R${parseFloat(driver.basicSalary).toLocaleString()}` : "-"}</TableCell>
              <TableCell>{driver.bonusPerLoad ? `R${parseFloat(driver.bonusPerLoad).toLocaleString()}` : "-"}</TableCell>
              <TableCell>
                <span className={`px-2 py-1 rounded text-xs ${
                  driver.status === "active" 
                    ? "bg-green-100 text-green-800" 
                    : "bg-gray-100 text-gray-800"
                }`}>
                  {driver.status}
                </span>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(driver)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteMutation.mutate(driver.id)}
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
  );
}
