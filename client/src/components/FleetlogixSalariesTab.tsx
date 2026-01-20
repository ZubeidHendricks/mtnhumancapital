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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DollarSign, Calculator, Download, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SalaryReport {
  driverId: number;
  driverName: string;
  totalAmount: number;
  totalLoads: number;
  totalDistance: number;
  totalTonnage: number;
}

export function FleetlogixSalariesTab() {
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().substring(0, 7)
  );
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: salaryReport, isLoading } = useQuery<SalaryReport[]>({
    queryKey: ["/api/fleetlogix/salaries/report", selectedMonth],
    queryFn: async () => {
      const token = localStorage.getItem("ahc_auth_token");
      const headers: HeadersInit = {};
      if (token && token !== "demo_token") {
        headers.Authorization = `Bearer ${token}`;
      }
      
      const response = await fetch(
        `/api/fleetlogix/salaries/report/${selectedMonth}`,
        { 
          headers,
          credentials: "include" 
        }
      );
      if (!response.ok) throw new Error("Failed to fetch salary report");
      return response.json();
    },
  });

  const calculateMutation = useMutation({
    mutationFn: async (month: string) => {
      const token = localStorage.getItem("ahc_auth_token");
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (token && token !== "demo_token") {
        headers.Authorization = `Bearer ${token}`;
      }
      
      const response = await fetch("/api/fleetlogix/salaries/calculate", {
        method: "POST",
        headers,
        body: JSON.stringify({ month }),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to calculate salaries");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/fleetlogix/salaries/report", selectedMonth] 
      });
      toast({ 
        title: "Salaries calculated successfully", 
        description: `Processed ${data.count} loads for ${selectedMonth}`
      });
    },
    onError: () => {
      toast({ 
        title: "Failed to calculate salaries", 
        variant: "destructive" 
      });
    },
  });

  const handleCalculate = () => {
    if (confirm(`Calculate salaries for ${selectedMonth}? This will process all loads for this month.`)) {
      calculateMutation.mutate(selectedMonth);
    }
  };

  const totalSalaries = salaryReport?.reduce((sum, item) => sum + Number(item.totalAmount || 0), 0) || 0;
  const totalLoads = salaryReport?.reduce((sum, item) => sum + Number(item.totalLoads || 0), 0) || 0;
  const totalDistance = salaryReport?.reduce((sum, item) => sum + Number(item.totalDistance || 0), 0) || 0;

  if (isLoading) {
    return <div className="flex items-center justify-center py-8">Loading salary data...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Driver Salaries</h3>
          <p className="text-sm text-muted-foreground">Calculate and track driver compensation</p>
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
          <Button onClick={handleCalculate} disabled={calculateMutation.isPending}>
            <Calculator className="mr-2 h-4 w-4" />
            {calculateMutation.isPending ? "Calculating..." : "Calculate Salaries"}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Salaries</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R {totalSalaries.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              For {selectedMonth}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Loads</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLoads}</div>
            <p className="text-xs text-muted-foreground">
              Completed loads
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Distance</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDistance.toFixed(0)} km</div>
            <p className="text-xs text-muted-foreground">
              Total kilometers
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Salary Report Table */}
      {!salaryReport || salaryReport.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Calculator className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No salary data for {selectedMonth}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Click "Calculate Salaries" to process loads for this month
            </p>
            <Button onClick={handleCalculate} disabled={calculateMutation.isPending}>
              <Calculator className="mr-2 h-4 w-4" />
              Calculate Salaries
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Driver Salary Breakdown</CardTitle>
            <CardDescription>
              Individual driver earnings for {selectedMonth}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Driver Name</TableHead>
                  <TableHead className="text-right">Loads</TableHead>
                  <TableHead className="text-right">Distance (km)</TableHead>
                  <TableHead className="text-right">Tonnage</TableHead>
                  <TableHead className="text-right">Total Salary</TableHead>
                  <TableHead className="text-right">Avg per Load</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salaryReport?.map((salary) => (
                  <TableRow key={salary.driverId}>
                    <TableCell className="font-medium">{salary.driverName}</TableCell>
                    <TableCell className="text-right">{salary.totalLoads}</TableCell>
                    <TableCell className="text-right">{Number(salary.totalDistance || 0).toFixed(0)}</TableCell>
                    <TableCell className="text-right">{Number(salary.totalTonnage || 0).toFixed(2)}t</TableCell>
                    <TableCell className="text-right font-semibold">
                      R {Number(salary.totalAmount || 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      R {(Number(salary.totalAmount || 0) / Number(salary.totalLoads || 1)).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Export Options */}
      {salaryReport && salaryReport.length > 0 && (
        <div className="flex justify-end gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export to Excel
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export to PDF
          </Button>
        </div>
      )}
    </div>
  );
}
