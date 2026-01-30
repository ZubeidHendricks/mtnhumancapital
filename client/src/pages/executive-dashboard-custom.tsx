import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { 
  BarChart3, 
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  AreaChart,
  Plus,
  Settings,
  Trash2,
  Save,
  TrendingUp,
  Users,
  Briefcase,
  Building2,
  GripVertical
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  AreaChart as RechartsAreaChart,
  Area,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell, 
  Legend 
} from "recharts";
import { candidateService, jobsService, api } from "@/lib/api";

interface ChartConfig {
  id: string;
  title: string;
  chartType: "bar" | "line" | "pie" | "area";
  dataSource: "candidates" | "jobs" | "employees" | "placements" | "payments" | "financialMetrics";
  xAxisField: string;
  yAxisField: string;
  aggregation: "count" | "sum" | "average";
}

const CHART_COLORS = [
  "#8884d8", "#82ca9d", "#ffc658", "#ff7300", "#0088fe", 
  "#00c49f", "#ffbb28", "#ff8042", "#a4de6c", "#d0ed57"
];

const DATA_SOURCE_FIELDS: Record<string, { label: string; fields: { value: string; label: string; type: string }[] }> = {
  candidates: {
    label: "Candidates",
    fields: [
      { value: "status", label: "Status", type: "categorical" },
      { value: "stage", label: "Stage", type: "categorical" },
      { value: "source", label: "Source", type: "categorical" },
      { value: "role", label: "Role", type: "categorical" },
      { value: "location", label: "Location", type: "categorical" },
      { value: "match", label: "Match Score", type: "numeric" },
      { value: "yearsOfExperience", label: "Years of Experience", type: "numeric" },
      { value: "createdAt", label: "Created Date", type: "date" },
    ]
  },
  jobs: {
    label: "Jobs",
    fields: [
      { value: "status", label: "Status", type: "categorical" },
      { value: "department", label: "Department", type: "categorical" },
      { value: "location", label: "Location", type: "categorical" },
      { value: "employmentType", label: "Employment Type", type: "categorical" },
      { value: "salaryMin", label: "Minimum Salary (R)", type: "numeric" },
      { value: "salaryMax", label: "Maximum Salary (R)", type: "numeric" },
      { value: "minYearsExperience", label: "Min Years Experience", type: "numeric" },
      { value: "createdAt", label: "Created Date", type: "date" },
    ]
  },
  employees: {
    label: "Employees",
    fields: [
      { value: "department", label: "Department", type: "categorical" },
      { value: "team", label: "Team", type: "categorical" },
      { value: "jobTitle", label: "Job Title", type: "categorical" },
      { value: "location", label: "Location", type: "categorical" },
      { value: "employmentType", label: "Employment Type", type: "categorical" },
      { value: "basicSalary", label: "Basic Salary (R)", type: "numeric" },
      { value: "salaryPeriod", label: "Salary Period", type: "categorical" },
      { value: "startDate", label: "Start Date", type: "date" },
    ]
  },
  placements: {
    label: "Placements & Revenue",
    fields: [
      { value: "month", label: "Month", type: "categorical" },
      { value: "placements", label: "Number of Placements", type: "numeric" },
      { value: "revenue", label: "Revenue (R)", type: "numeric" },
      { value: "avgRevenue", label: "Average Revenue per Placement (R)", type: "numeric" },
    ]
  },
  payments: {
    label: "Payments & Billing",
    fields: [
      { value: "status", label: "Payment Status", type: "categorical" },
      { value: "paymentMethod", label: "Payment Method", type: "categorical" },
      { value: "amount", label: "Amount (R)", type: "numeric" },
      { value: "currency", label: "Currency", type: "categorical" },
    ]
  },
  financialMetrics: {
    label: "Financial Metrics",
    fields: [
      { value: "category", label: "Category", type: "categorical" },
      { value: "revenue", label: "Revenue (R)", type: "numeric" },
      { value: "expenses", label: "Expenses (R)", type: "numeric" },
      { value: "profit", label: "Profit (R)", type: "numeric" },
    ]
  }
};

const CHART_TYPES = [
  { value: "bar", label: "Bar Chart", icon: BarChart3 },
  { value: "line", label: "Line Chart", icon: LineChartIcon },
  { value: "pie", label: "Pie Chart", icon: PieChartIcon },
  { value: "area", label: "Area Chart", icon: AreaChart },
];

export default function ExecutiveDashboardCustom() {
  const STORAGE_KEY = "executive-dashboard-charts";
  
  const [charts, setCharts] = useState<ChartConfig[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    return [
      {
        id: "1",
        title: "Candidates by Status",
        chartType: "bar",
        dataSource: "candidates",
        xAxisField: "status",
        yAxisField: "count",
        aggregation: "count"
      },
      {
        id: "2",
        title: "Jobs by Department",
        chartType: "pie",
        dataSource: "jobs",
        xAxisField: "department",
        yAxisField: "count",
        aggregation: "count"
      }
    ];
  });
  
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(charts));
  }, [charts]);
  
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingChart, setEditingChart] = useState<ChartConfig | null>(null);
  const [newChart, setNewChart] = useState<Partial<ChartConfig>>({
    chartType: "bar",
    dataSource: "candidates",
    xAxisField: "status",
    yAxisField: "count",
    aggregation: "count"
  });

  const { data: candidatesData } = useQuery({
    queryKey: ["candidates"],
    queryFn: () => candidateService.getAll(),
  });

  const { data: jobsData } = useQuery({
    queryKey: ["jobs"],
    queryFn: () => jobsService.getAll(),
  });

  const { data: employeesData } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const response = await api.get("/api/employees");
      return response.data;
    },
  });

  const { data: placementsData } = useQuery({
    queryKey: ["placement-metrics"],
    queryFn: async () => {
      const response = await api.get("/api/placement-metrics");
      return response.data;
    },
  });

  const { data: paymentsData } = useQuery({
    queryKey: ["tenant-payments"],
    queryFn: async () => {
      try {
        const response = await api.get("/api/admin/payments");
        return response.data;
      } catch {
        return [];
      }
    },
  });

  // Generate sample financial metrics for visualization
  const financialMetricsData = [
    { category: "Q1", revenue: 450000, expenses: 280000, profit: 170000 },
    { category: "Q2", revenue: 520000, expenses: 310000, profit: 210000 },
    { category: "Q3", revenue: 480000, expenses: 295000, profit: 185000 },
    { category: "Q4", revenue: 610000, expenses: 340000, profit: 270000 },
  ];

  const aggregateData = (dataSource: string, xField: string, yField: string, aggregation: string) => {
    let data: any[] = [];
    
    switch (dataSource) {
      case "candidates":
        data = candidatesData || [];
        break;
      case "jobs":
        data = jobsData || [];
        break;
      case "employees":
        data = employeesData || [];
        break;
      case "placements":
        data = placementsData || [];
        break;
      case "payments":
        data = paymentsData || [];
        break;
      case "financialMetrics":
        data = financialMetricsData;
        break;
    }

    if (!data.length) return [];

    const grouped = data.reduce((acc: Record<string, any[]>, item: any) => {
      const key = item[xField] || "Unknown";
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});

    return Object.entries(grouped).map(([name, items]) => {
      let value = 0;
      switch (aggregation) {
        case "count":
          value = items.length;
          break;
        case "sum":
          value = items.reduce((sum, item) => sum + (Number(item[yField]) || 0), 0);
          break;
        case "average":
          value = items.reduce((sum, item) => sum + (Number(item[yField]) || 0), 0) / items.length;
          break;
      }
      return { name, value: Math.round(value * 100) / 100 };
    });
  };

  const renderChart = (config: ChartConfig) => {
    const data = aggregateData(config.dataSource, config.xAxisField, config.yAxisField, config.aggregation);
    
    if (!data.length) {
      return (
        <div className="h-[300px] flex items-center justify-center text-muted-foreground">
          No data available
        </div>
      );
    }

    switch (config.chartType) {
      case "bar":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#8884d8" name={config.aggregation === "count" ? "Count" : config.yAxisField} />
            </BarChart>
          </ResponsiveContainer>
        );
      case "line":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="value" stroke="#8884d8" name={config.aggregation === "count" ? "Count" : config.yAxisField} />
            </LineChart>
          </ResponsiveContainer>
        );
      case "pie":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );
      case "area":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <RechartsAreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="value" stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} name={config.aggregation === "count" ? "Count" : config.yAxisField} />
            </RechartsAreaChart>
          </ResponsiveContainer>
        );
    }
  };

  const handleAddChart = () => {
    if (!newChart.title || !newChart.chartType || !newChart.dataSource || !newChart.xAxisField) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    const chart: ChartConfig = {
      id: Date.now().toString(),
      title: newChart.title!,
      chartType: newChart.chartType as ChartConfig["chartType"],
      dataSource: newChart.dataSource as ChartConfig["dataSource"],
      xAxisField: newChart.xAxisField!,
      yAxisField: newChart.yAxisField || "count",
      aggregation: newChart.aggregation as ChartConfig["aggregation"] || "count"
    };

    setCharts([...charts, chart]);
    setAddDialogOpen(false);
    setNewChart({
      chartType: "bar",
      dataSource: "candidates",
      xAxisField: "status",
      yAxisField: "count",
      aggregation: "count"
    });
    
    toast({
      title: "Chart Added",
      description: "Your custom chart has been added to the dashboard.",
    });
  };

  const handleUpdateChart = () => {
    if (!editingChart) return;
    
    setCharts(charts.map(c => c.id === editingChart.id ? editingChart : c));
    setEditingChart(null);
    
    toast({
      title: "Chart Updated",
      description: "Your chart has been updated successfully.",
    });
  };

  const handleDeleteChart = (chartId: string) => {
    setCharts(charts.filter(c => c.id !== chartId));
    toast({
      title: "Chart Removed",
      description: "The chart has been removed from the dashboard.",
    });
  };

  const getAvailableFields = (dataSource: string) => {
    return DATA_SOURCE_FIELDS[dataSource]?.fields || [];
  };

  const totalCandidates = candidatesData?.length || 0;
  const totalJobs = jobsData?.length || 0;
  const totalEmployees = employeesData?.length || 0;

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-primary" />
            Executive Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">
            Customizable analytics and insights
          </p>
        </div>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90" data-testid="button-add-chart">
              <Plus className="w-4 h-4 mr-2" />
              Add Chart
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Chart</DialogTitle>
              <DialogDescription>
                Configure your chart by selecting the data source and fields
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Chart Title</Label>
                <Input 
                  placeholder="e.g., Candidates by Status"
                  value={newChart.title || ""}
                  onChange={(e) => setNewChart({ ...newChart, title: e.target.value })}
                  data-testid="input-chart-title"
                />
              </div>
              <div className="space-y-2">
                <Label>Chart Type</Label>
                <Select 
                  value={newChart.chartType} 
                  onValueChange={(value) => setNewChart({ ...newChart, chartType: value as ChartConfig["chartType"] })}
                >
                  <SelectTrigger data-testid="select-chart-type">
                    <SelectValue placeholder="Select chart type" />
                  </SelectTrigger>
                  <SelectContent>
                    {CHART_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <type.icon className="w-4 h-4" />
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Data Source</Label>
                <Select 
                  value={newChart.dataSource} 
                  onValueChange={(value) => setNewChart({ ...newChart, dataSource: value as ChartConfig["dataSource"], xAxisField: "" })}
                >
                  <SelectTrigger data-testid="select-data-source">
                    <SelectValue placeholder="Select data source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="candidates">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Candidates
                      </div>
                    </SelectItem>
                    <SelectItem value="jobs">
                      <div className="flex items-center gap-2">
                        <Briefcase className="w-4 h-4" />
                        Jobs
                      </div>
                    </SelectItem>
                    <SelectItem value="employees">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        Employees
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>X-Axis (Group By)</Label>
                <Select 
                  value={newChart.xAxisField} 
                  onValueChange={(value) => setNewChart({ ...newChart, xAxisField: value })}
                >
                  <SelectTrigger data-testid="select-x-axis">
                    <SelectValue placeholder="Select field for X-axis" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableFields(newChart.dataSource || "candidates").map((field) => (
                      <SelectItem key={field.value} value={field.value}>
                        {field.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Y-Axis (Measure)</Label>
                <Select 
                  value={newChart.aggregation} 
                  onValueChange={(value) => setNewChart({ ...newChart, aggregation: value as ChartConfig["aggregation"] })}
                >
                  <SelectTrigger data-testid="select-y-axis">
                    <SelectValue placeholder="Select aggregation" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="count">Count</SelectItem>
                    <SelectItem value="sum">Sum</SelectItem>
                    <SelectItem value="average">Average</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(newChart.aggregation === "sum" || newChart.aggregation === "average") && (
                <div className="space-y-2">
                  <Label>Value Field</Label>
                  <Select 
                    value={newChart.yAxisField} 
                    onValueChange={(value) => setNewChart({ ...newChart, yAxisField: value })}
                  >
                    <SelectTrigger data-testid="select-value-field">
                      <SelectValue placeholder="Select value field" />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableFields(newChart.dataSource || "candidates")
                        .filter(f => f.type === "numeric")
                        .map((field) => (
                          <SelectItem key={field.value} value={field.value}>
                            {field.label}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddChart} data-testid="button-confirm-add">
                <Plus className="w-4 h-4 mr-2" />
                Add Chart
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="border-blue-200 dark:border-blue-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="w-4 h-4" />
              Total Candidates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-500">{totalCandidates}</div>
          </CardContent>
        </Card>
        <Card className="border-green-200 dark:border-green-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Briefcase className="w-4 h-4" />
              Active Jobs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-500">{totalJobs}</div>
          </CardContent>
        </Card>
        <Card className="border-purple-200 dark:border-purple-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Total Employees
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-500">{totalEmployees}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {charts.map((chart) => (
          <Card key={chart.id} className="relative" data-testid={`chart-card-${chart.id}`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-lg">{chart.title}</CardTitle>
                <CardDescription className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {DATA_SOURCE_FIELDS[chart.dataSource]?.label}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {chart.xAxisField}
                  </Badge>
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setEditingChart(chart)}
                  data-testid={`button-edit-${chart.id}`}
                >
                  <Settings className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => handleDeleteChart(chart.id)}
                  data-testid={`button-delete-${chart.id}`}
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {renderChart(chart)}
            </CardContent>
          </Card>
        ))}
      </div>

      {charts.length === 0 && (
        <Card className="p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <BarChart3 className="w-16 h-16 text-muted-foreground" />
            <h3 className="text-xl font-semibold">No Charts Yet</h3>
            <p className="text-muted-foreground">
              Click "Add Chart" to create your first customizable chart
            </p>
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Chart
            </Button>
          </div>
        </Card>
      )}

      <Dialog open={!!editingChart} onOpenChange={(open) => !open && setEditingChart(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Chart</DialogTitle>
            <DialogDescription>
              Modify your chart configuration
            </DialogDescription>
          </DialogHeader>
          {editingChart && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Chart Title</Label>
                <Input 
                  value={editingChart.title}
                  onChange={(e) => setEditingChart({ ...editingChart, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Chart Type</Label>
                <Select 
                  value={editingChart.chartType} 
                  onValueChange={(value) => setEditingChart({ ...editingChart, chartType: value as ChartConfig["chartType"] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CHART_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <type.icon className="w-4 h-4" />
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Data Source</Label>
                <Select 
                  value={editingChart.dataSource} 
                  onValueChange={(value) => setEditingChart({ ...editingChart, dataSource: value as ChartConfig["dataSource"] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="candidates">Candidates</SelectItem>
                    <SelectItem value="jobs">Jobs</SelectItem>
                    <SelectItem value="employees">Employees</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>X-Axis (Group By)</Label>
                <Select 
                  value={editingChart.xAxisField} 
                  onValueChange={(value) => setEditingChart({ ...editingChart, xAxisField: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableFields(editingChart.dataSource).map((field) => (
                      <SelectItem key={field.value} value={field.value}>
                        {field.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Y-Axis (Measure)</Label>
                <Select 
                  value={editingChart.aggregation} 
                  onValueChange={(value) => setEditingChart({ ...editingChart, aggregation: value as ChartConfig["aggregation"] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="count">Count</SelectItem>
                    <SelectItem value="sum">Sum</SelectItem>
                    <SelectItem value="average">Average</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingChart(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateChart}>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
