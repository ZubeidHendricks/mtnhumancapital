import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AddDriver() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: "",
    idNumber: "",
    licenseNumber: "",
    licenseType: "",
    phone: "",
    email: "",
    address: "",
    emergencyContact: "",
    emergencyPhone: "",
    hireDate: "",
    basicSalary: "",
    salaryPeriod: "monthly",
    bonusPerLoad: "",
    status: "active",
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const token = localStorage.getItem("ahc_auth_token");
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (token && token !== "demo_token") {
        headers["Authorization"] = `Bearer ${token}`;
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
      toast({ title: "Driver created successfully!" });
      setLocation("/fleetlogix");
    },
    onError: (error) => {
      toast({ 
        title: "Failed to create driver", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => setLocation("/fleetlogix")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to FleetLogix
        </Button>
        <h1 className="text-3xl font-bold">Add New Driver</h1>
        <p className="text-muted-foreground mt-2">
          Fill in the driver information below
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Driver Information</CardTitle>
            <CardDescription>
              Enter the basic details of the driver
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Personal Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Personal Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="John Doe"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="idNumber">ID Number</Label>
                  <Input
                    id="idNumber"
                    value={formData.idNumber}
                    onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })}
                    placeholder="8001015800083"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+27 82 123 4567"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="john@example.com"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="123 Main Street, Johannesburg"
                  />
                </div>
              </div>
            </div>

            {/* License Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">License Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="licenseNumber">License Number</Label>
                  <Input
                    id="licenseNumber"
                    value={formData.licenseNumber}
                    onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                    placeholder="ABC123456"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="licenseType">License Type</Label>
                  <Select 
                    value={formData.licenseType} 
                    onValueChange={(value) => setFormData({ ...formData, licenseType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select license type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Code 8">Code 8 (Light Vehicle)</SelectItem>
                      <SelectItem value="Code 10">Code 10 (Heavy Vehicle)</SelectItem>
                      <SelectItem value="Code 14">Code 14 (Articulated Vehicle)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Emergency Contact</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="emergencyContact">Contact Name</Label>
                  <Input
                    id="emergencyContact"
                    value={formData.emergencyContact}
                    onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                    placeholder="Jane Doe"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergencyPhone">Contact Phone</Label>
                  <Input
                    id="emergencyPhone"
                    value={formData.emergencyPhone}
                    onChange={(e) => setFormData({ ...formData, emergencyPhone: e.target.value })}
                    placeholder="+27 82 987 6543"
                  />
                </div>
              </div>
            </div>

            {/* Employment Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Employment Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="hireDate">Hire Date</Label>
                  <Input
                    id="hireDate"
                    type="date"
                    value={formData.hireDate}
                    onChange={(e) => setFormData({ ...formData, hireDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select 
                    value={formData.status} 
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Salary Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Compensation</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
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
                <div className="space-y-2">
                  <Label htmlFor="salaryPeriod">Payment Period</Label>
                  <Select 
                    value={formData.salaryPeriod} 
                    onValueChange={(value) => setFormData({ ...formData, salaryPeriod: value })}
                  >
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
                <div className="space-y-2">
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
              <p className="text-sm text-muted-foreground">
                Total earnings = Basic Salary + (Number of Loads × Bonus Per Load)
              </p>
            </div>

            <div className="flex gap-4 pt-6">
              <Button
                type="submit"
                disabled={createMutation.isPending || !formData.name}
                className="flex-1"
              >
                <Save className="mr-2 h-4 w-4" />
                {createMutation.isPending ? "Creating..." : "Create Driver"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation("/fleetlogix")}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
