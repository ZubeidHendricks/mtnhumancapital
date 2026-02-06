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
  GripVertical,
  Target,
  ScatterChart as ScatterChartIcon,
  Filter,
  Disc,
  Layers
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
  Legend,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ScatterChart,
  Scatter,
  ZAxis,
  RadialBarChart,
  RadialBar,
  ComposedChart,
  Funnel,
  FunnelChart,
  LabelList
} from "recharts";
import { candidateService, jobsService, api } from "@/lib/api";
import "react-grid-layout/css/styles.css";
// @ts-expect-error - react-grid-layout types are incompatible but runtime works correctly
import ReactGridLayout from "react-grid-layout";

type LayoutItem = {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
};

interface ChartConfig {
  id: string;
  title: string;
  chartType: "bar" | "line" | "pie" | "area" | "radar" | "scatter" | "radialBar" | "funnel" | "composed";
  dataSource: "candidates" | "jobs" | "employees" | "placements" | "payments" | "financialMetrics";
  xAxisField: string;
  layout?: { x: number; y: number; w: number; h: number };
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
  { value: "radar", label: "Radar Chart", icon: Target },
  { value: "scatter", label: "Scatter Plot", icon: ScatterChartIcon },
  { value: "radialBar", label: "Radial Bar", icon: Disc },
  { value: "funnel", label: "Funnel Chart", icon: Filter },
  { value: "composed", label: "Composed (Bar + Line)", icon: Layers },
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
      },
      {
        id: "3",
        title: "Quarterly Revenue",
        chartType: "area",
        dataSource: "financialMetrics",
        xAxisField: "category",
        yAxisField: "revenue",
        aggregation: "sum"
      },
      {
        id: "4",
        title: "Quarterly Profit",
        chartType: "line",
        dataSource: "financialMetrics",
        xAxisField: "category",
        yAxisField: "profit",
        aggregation: "sum"
      },
      {
        id: "5",
        title: "Employees by Department",
        chartType: "bar",
        dataSource: "employees",
        xAxisField: "department",
        yAxisField: "count",
        aggregation: "count"
      },
      {
        id: "6",
        title: "Payments by Status",
        chartType: "pie",
        dataSource: "payments",
        xAxisField: "status",
        yAxisField: "count",
        aggregation: "count"
      },
      {
        id: "7",
        title: "Candidate Sources",
        chartType: "pie",
        dataSource: "candidates",
        xAxisField: "source",
        yAxisField: "count",
        aggregation: "count"
      },
      {
        id: "8",
        title: "Monthly Placements",
        chartType: "bar",
        dataSource: "placements",
        xAxisField: "month",
        yAxisField: "placements",
        aggregation: "sum"
      }
    ];
  });
  
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(charts));
  }, [charts]);

  const [containerWidth, setContainerWidth] = useState(2400);
  const [gridWidth, setGridWidth] = useState(2400);
  
  useEffect(() => {
    const updateWidth = () => {
      const container = document.getElementById('exec-dashboard-grid');
      if (container) {
        setContainerWidth(container.offsetWidth);
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  useEffect(() => {
    if (charts.length > 0) {
      const maxX = Math.max(...charts.map(c => (c.layout?.x || 0) + (c.layout?.w || 12)));
      const minWidth = Math.max(containerWidth, maxX * 50 + 200);
      setGridWidth(minWidth);
    } else {
      setGridWidth(containerWidth);
    }
  }, [charts, containerWidth]);

  const generateLayout = () => {
    return charts.map((chart, index) => {
      if (chart.layout) {
        return {
          i: chart.id,
          x: chart.layout.x,
          y: chart.layout.y,
          w: chart.layout.w,
          h: chart.layout.h,
          minW: 1,
          minH: 2
        };
      }
      return {
        i: chart.id,
        x: (index % 4) * 12,
        y: Math.floor(index / 4) * 3,
        w: 12,
        h: 3,
        minW: 1,
        minH: 2
      };
    });
  };

  const handleLayoutChange = (newLayout: LayoutItem[]) => {
    setCharts(prevCharts => 
      prevCharts.map(chart => {
        const layoutItem = newLayout.find(l => l.i === chart.id);
        if (layoutItem) {
          return {
            ...chart,
            layout: {
              x: layoutItem.x,
              y: layoutItem.y,
              w: layoutItem.w,
              h: layoutItem.h
            }
          };
        }
        return chart;
      })
    );
  };
  
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

    if (!Array.isArray(data) || !data.length) return [];

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

  const renderChart = (config: ChartConfig, height: number = 300) => {
    const data = aggregateData(config.dataSource, config.xAxisField, config.yAxisField, config.aggregation);
    const chartHeight = height;
    
    if (!data.length) {
      return (
        <div className="h-full flex items-center justify-center text-muted-foreground">
          No data available
        </div>
      );
    }

    switch (config.chartType) {
      case "bar":
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#8884d8" name={config.aggregation === "count" ? "Count" : config.yAxisField} />
            </BarChart>
          </ResponsiveContainer>
        );
      case "line":
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="value" stroke="#8884d8" name={config.aggregation === "count" ? "Count" : config.yAxisField} />
            </LineChart>
          </ResponsiveContainer>
        );
      case "pie":
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                outerRadius={Math.min(chartHeight / 3, 80)}
                fill="#8884d8"
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        );
      case "area":
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <RechartsAreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="value" stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} name={config.aggregation === "count" ? "Count" : config.yAxisField} />
            </RechartsAreaChart>
          </ResponsiveContainer>
        );
      case "radar":
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <RadarChart data={data}>
              <PolarGrid />
              <PolarAngleAxis dataKey="name" fontSize={10} />
              <PolarRadiusAxis fontSize={10} />
              <Tooltip />
              <Legend />
              <Radar name={config.aggregation === "count" ? "Count" : config.yAxisField} dataKey="value" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
            </RadarChart>
          </ResponsiveContainer>
        );
      case "scatter": {
        const scatterData = data.map((d, i) => ({ ...d, x: i, y: d.value, z: d.value }));
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="x" name="Index" fontSize={12} />
              <YAxis dataKey="y" name="Value" fontSize={12} />
              <ZAxis dataKey="z" range={[50, 400]} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              <Legend />
              <Scatter name={config.aggregation === "count" ? "Count" : config.yAxisField} data={scatterData} fill="#8884d8">
                {scatterData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        );
      }
      case "radialBar": {
        const radialData = data.map((d, i) => ({ ...d, fill: CHART_COLORS[i % CHART_COLORS.length] }));
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <RadialBarChart innerRadius="10%" outerRadius="80%" data={radialData} startAngle={180} endAngle={0}>
              <RadialBar background dataKey="value" label={{ position: 'insideStart', fill: '#fff', fontSize: 10 }} />
              <Tooltip />
              <Legend iconSize={10} layout="vertical" verticalAlign="middle" align="right" />
            </RadialBarChart>
          </ResponsiveContainer>
        );
      }
      case "funnel": {
        const funnelData = [...data].sort((a, b) => b.value - a.value);
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <FunnelChart>
              <Tooltip />
              <Funnel dataKey="value" data={funnelData} isAnimationActive>
                <LabelList position="right" fill="#000" stroke="none" dataKey="name" fontSize={10} />
                {funnelData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Funnel>
            </FunnelChart>
          </ResponsiveContainer>
        );
      }
      case "composed":
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <ComposedChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#8884d8" name="Bar" />
              <Line type="monotone" dataKey="value" stroke="#ff7300" name="Trend" strokeWidth={2} />
            </ComposedChart>
          </ResponsiveContainer>
        );
      default:
        return (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            Unsupported chart type
          </div>
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
        <Card className="border-blue-200 dark:border-blue-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Total Employees
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-500">{totalEmployees}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-4 mb-4 text-sm text-muted-foreground">
        <GripVertical className="w-4 h-4" />
        <span>Drag charts to reorder</span>
        <span className="ml-2">Resize from corners</span>
      </div>
      
      <div id="exec-dashboard-grid" className="w-full overflow-x-auto pb-4">
        {charts.length > 0 && (
          <div style={{ minWidth: gridWidth }}>
            <ReactGridLayout
              className="layout"
              layout={generateLayout() as any}
              cols={48}
              rowHeight={100}
              width={gridWidth}
              onLayoutChange={(layout: any) => handleLayoutChange(layout)}
              draggableHandle=".drag-handle"
              isResizable={true}
              isDraggable={true}
              compactType={null}
              preventCollision={false}
              margin={[16, 16] as [number, number]}
            >
            {charts.map((chart) => {
              const layout = chart.layout || { w: 6, h: 3 };
              const height = layout.h * 100;
              return (
                <div key={chart.id} data-testid={`chart-card-${chart.id}`}>
                  <Card className="h-full overflow-hidden border-2 hover:border-primary/50 transition-colors">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 drag-handle cursor-move bg-muted/30">
                      <div className="flex items-center gap-2">
                        <GripVertical className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <CardTitle className="text-base">{chart.title}</CardTitle>
                          <CardDescription className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {DATA_SOURCE_FIELDS[chart.dataSource]?.label}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {chart.xAxisField}
                            </Badge>
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => setEditingChart(chart)}
                          data-testid={`button-edit-${chart.id}`}
                        >
                          <Settings className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => handleDeleteChart(chart.id)}
                          data-testid={`button-delete-${chart.id}`}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-2">
                      {renderChart(chart, Math.max(height - 80, 150))}
                    </CardContent>
                  </Card>
                </div>
              );
            })}
            </ReactGridLayout>
          </div>
        )}
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
