import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FleetlogixDriversTab } from "./FleetlogixDriversTab";
import { FleetlogixVehiclesTab } from "./FleetlogixVehiclesTab";
import { FleetlogixRoutesTab } from "./FleetlogixRoutesTab";
import { FleetlogixLoadsTab } from "./FleetlogixLoadsTab";
import { FleetlogixSalariesTab } from "./FleetlogixSalariesTab";
import { FleetlogixReconciliationTab } from "./FleetlogixReconciliationTab";
import { FleetlogixWeighbridgeTab } from "./FleetlogixWeighbridgeTab";
import { Truck, Users, Route, Package, DollarSign, FileCheck, Scale, Moon, Sun } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";

export function FleetLogixDashboard() {
  const { theme, setTheme, actualTheme } = useTheme();
  
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header with Logo and Theme Toggle */}
        <div className="flex items-center justify-between bg-teal-600 dark:bg-teal-700 rounded-lg shadow-lg p-6">
          <div className="flex items-center gap-4">
            <img 
              src="/uploads/fleetlogix-logo.png" 
              alt="Fleet Logix" 
              className="h-16 w-16 object-contain bg-white rounded-lg p-2"
            />
            <div>
              <h1 className="text-3xl font-bold text-white">
                Fleet Logix
              </h1>
              <p className="text-white/90 font-semibold">
                Fleet and logistics management system
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setTheme(actualTheme === "dark" ? "light" : "dark")}
            className="bg-white border-white hover:bg-teal-100"
          >
            {actualTheme === "dark" ? (
              <Sun className="h-5 w-5 text-teal-600" />
            ) : (
              <Moon className="h-5 w-5 text-teal-700" />
            )}
          </Button>
        </div>

        <Tabs defaultValue="loads" className="space-y-6">
          <TabsList className="grid w-full grid-cols-7 bg-white dark:bg-gray-800 border-2 border-teal-200 dark:border-teal-700 p-1">
            <TabsTrigger 
              value="loads" 
              className="flex items-center gap-2 text-gray-900 dark:text-gray-100 font-semibold data-[state=active]:bg-teal-600 data-[state=active]:text-white"
            >
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Loads</span>
            </TabsTrigger>
            <TabsTrigger 
              value="drivers" 
              className="flex items-center gap-2 text-gray-900 dark:text-gray-100 font-semibold data-[state=active]:bg-teal-600 data-[state=active]:text-white"
            >
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Drivers</span>
            </TabsTrigger>
            <TabsTrigger 
              value="vehicles" 
              className="flex items-center gap-2 text-gray-900 dark:text-gray-100 font-semibold data-[state=active]:bg-teal-600 data-[state=active]:text-white"
            >
              <Truck className="h-4 w-4" />
              <span className="hidden sm:inline">Vehicles</span>
            </TabsTrigger>
            <TabsTrigger 
              value="routes" 
              className="flex items-center gap-2 text-gray-900 dark:text-gray-100 font-semibold data-[state=active]:bg-teal-600 data-[state=active]:text-white"
            >
              <Route className="h-4 w-4" />
              <span className="hidden sm:inline">Routes</span>
            </TabsTrigger>
            <TabsTrigger 
              value="salaries" 
              className="flex items-center gap-2 text-gray-900 dark:text-gray-100 font-semibold data-[state=active]:bg-teal-600 data-[state=active]:text-white"
            >
              <DollarSign className="h-4 w-4" />
              <span className="hidden sm:inline">Salaries</span>
            </TabsTrigger>
            <TabsTrigger 
              value="reconciliation" 
              className="flex items-center gap-2 text-gray-900 dark:text-gray-100 font-semibold data-[state=active]:bg-teal-600 data-[state=active]:text-white"
            >
              <FileCheck className="h-4 w-4" />
              <span className="hidden sm:inline">Reconciliation</span>
            </TabsTrigger>
            <TabsTrigger 
              value="weighbridge" 
              className="flex items-center gap-2 text-gray-900 dark:text-gray-100 font-semibold data-[state=active]:bg-teal-600 data-[state=active]:text-white"
            >
              <Scale className="h-4 w-4" />
              <span className="hidden sm:inline">Weighbridge</span>
            </TabsTrigger>
          </TabsList>

        <TabsContent value="loads" className="space-y-4">
          <Card className="border-2 border-teal-200 dark:border-teal-700 shadow-md bg-white dark:bg-gray-800">
            <CardHeader className="border-b-2 border-teal-200 dark:border-teal-700 bg-teal-50 dark:bg-gray-700">
              <CardTitle className="text-gray-900 dark:text-white font-bold text-xl">Load Management</CardTitle>
              <CardDescription className="text-gray-700 dark:text-gray-300 font-semibold">Track and manage all fleet loads</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <FleetlogixLoadsTab />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="drivers" className="space-y-4">
          <Card className="border-2 border-teal-200 dark:border-teal-700 shadow-md bg-white dark:bg-gray-800">
            <CardHeader className="border-b-2 border-teal-200 dark:border-teal-700 bg-teal-50 dark:bg-gray-700">
              <CardTitle className="text-gray-900 dark:text-white font-bold text-xl">Driver Management</CardTitle>
              <CardDescription className="text-gray-700 dark:text-gray-300 font-semibold">Manage driver information and performance</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <FleetlogixDriversTab />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vehicles" className="space-y-4">
          <Card className="border-2 border-teal-200 dark:border-teal-700 shadow-md bg-white dark:bg-gray-800">
            <CardHeader className="border-b-2 border-teal-200 dark:border-teal-700 bg-teal-50 dark:bg-gray-700">
              <CardTitle className="text-gray-900 dark:text-white font-bold text-xl">Vehicle Management</CardTitle>
              <CardDescription className="text-gray-700 dark:text-gray-300 font-semibold">Track and maintain fleet vehicles</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <FleetlogixVehiclesTab />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="routes" className="space-y-4">
          <Card className="border-2 border-teal-200 dark:border-teal-700 shadow-md bg-white dark:bg-gray-800">
            <CardHeader className="border-b-2 border-teal-200 dark:border-teal-700 bg-teal-50 dark:bg-gray-700">
              <CardTitle className="text-gray-900 dark:text-white font-bold text-xl">Route Management</CardTitle>
              <CardDescription className="text-gray-700 dark:text-gray-300 font-semibold">Define and manage delivery routes</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <FleetlogixRoutesTab />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="salaries" className="space-y-4">
          <Card className="border-2 border-teal-200 dark:border-teal-700 shadow-md bg-white dark:bg-gray-800">
            <CardHeader className="border-b-2 border-teal-200 dark:border-teal-700 bg-teal-50 dark:bg-gray-700">
              <CardTitle className="text-gray-900 dark:text-white font-bold text-xl">Driver Salaries</CardTitle>
              <CardDescription className="text-gray-700 dark:text-gray-300 font-semibold">Calculate and manage driver compensation</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <FleetlogixSalariesTab />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reconciliation" className="space-y-4">
          <Card className="border-2 border-teal-200 dark:border-teal-700 shadow-md bg-white dark:bg-gray-800">
            <CardHeader className="border-b-2 border-teal-200 dark:border-teal-700 bg-teal-50 dark:bg-gray-700">
              <CardTitle className="text-gray-900 dark:text-white font-bold text-xl">Load Reconciliation</CardTitle>
              <CardDescription className="text-gray-700 dark:text-gray-300 font-semibold">Review and reconcile load records</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <FleetlogixReconciliationTab />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="weighbridge" className="space-y-4">
          <Card className="border-2 border-teal-200 dark:border-teal-700 shadow-md bg-white dark:bg-gray-800">
            <CardHeader className="border-b-2 border-teal-200 dark:border-teal-700 bg-teal-50 dark:bg-gray-700">
              <CardTitle className="text-gray-900 dark:text-white font-bold text-xl">Weighbridge Management</CardTitle>
              <CardDescription className="text-gray-700 dark:text-gray-300 font-semibold">Upload and link weighbridge slips to loads</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <FleetlogixWeighbridgeTab />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
    </div>
  );
}
