import { useState, useEffect } from "react";
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
  Save
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

export interface ChartConfig {
  id: string;
  title: string;
  chartType: "bar" | "line" | "pie" | "area";
  dataSource: string;
  xAxisField: string;
  yAxisField: string;
  aggregation: "count" | "sum" | "average";
}

export interface DataSourceConfig {
  key: string;
  label: string;
  fields: { value: string; label: string; type: "categorical" | "numeric" | "date" }[];
}

interface CustomizableDashboardProps {
  dataSources: DataSourceConfig[];
  getData: (sourceKey: string) => any[];
  initialCharts?: ChartConfig[];
  onChartsChange?: (charts: ChartConfig[]) => void;
  storageKey?: string;
  columns?: 1 | 2 | 3;
}

const CHART_COLORS = [
  "#8884d8", "#82ca9d", "#ffc658", "#ff7300", "#0088fe", 
  "#00c49f", "#ffbb28", "#ff8042", "#a4de6c", "#d0ed57"
];

const CHART_TYPES = [
  { value: "bar", label: "Bar Chart", icon: BarChart3 },
  { value: "line", label: "Line Chart", icon: LineChartIcon },
  { value: "pie", label: "Pie Chart", icon: PieChartIcon },
  { value: "area", label: "Area Chart", icon: AreaChart },
];

export function CustomizableDashboard({
  dataSources,
  getData,
  initialCharts = [],
  onChartsChange,
  storageKey,
  columns = 2
}: CustomizableDashboardProps) {
  const [charts, setCharts] = useState<ChartConfig[]>(() => {
    if (storageKey) {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          return initialCharts;
        }
      }
    }
    return initialCharts;
  });
  
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingChart, setEditingChart] = useState<ChartConfig | null>(null);
  const [newChart, setNewChart] = useState<Partial<ChartConfig>>({
    chartType: "bar",
    dataSource: dataSources[0]?.key || "",
    xAxisField: "",
    yAxisField: "count",
    aggregation: "count"
  });

  useEffect(() => {
    if (storageKey) {
      localStorage.setItem(storageKey, JSON.stringify(charts));
    }
    onChartsChange?.(charts);
  }, [charts, storageKey, onChartsChange]);

  const aggregateData = (dataSource: string, xField: string, yField: string, aggregation: string) => {
    const data = getData(dataSource);

    if (!data || !data.length) return [];

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
        <div className="h-[250px] flex items-center justify-center text-muted-foreground">
          No data available
        </div>
      );
    }

    switch (config.chartType) {
      case "bar":
        return (
          <ResponsiveContainer width="100%" height={250}>
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
          <ResponsiveContainer width="100%" height={250}>
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
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                outerRadius={80}
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
          <ResponsiveContainer width="100%" height={250}>
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
      dataSource: newChart.dataSource!,
      xAxisField: newChart.xAxisField!,
      yAxisField: newChart.yAxisField || "count",
      aggregation: newChart.aggregation as ChartConfig["aggregation"] || "count"
    };

    setCharts([...charts, chart]);
    setAddDialogOpen(false);
    setNewChart({
      chartType: "bar",
      dataSource: dataSources[0]?.key || "",
      xAxisField: "",
      yAxisField: "count",
      aggregation: "count"
    });
    
    toast({
      title: "Chart Added",
      description: "Your custom chart has been added.",
    });
  };

  const handleUpdateChart = () => {
    if (!editingChart) return;
    
    setCharts(charts.map(c => c.id === editingChart.id ? editingChart : c));
    setEditingChart(null);
    
    toast({
      title: "Chart Updated",
      description: "Your chart has been updated.",
    });
  };

  const handleDeleteChart = (chartId: string) => {
    setCharts(charts.filter(c => c.id !== chartId));
    toast({
      title: "Chart Removed",
      description: "The chart has been removed.",
    });
  };

  const getAvailableFields = (dataSourceKey: string) => {
    return dataSources.find(ds => ds.key === dataSourceKey)?.fields || [];
  };

  const getDataSourceLabel = (key: string) => {
    return dataSources.find(ds => ds.key === key)?.label || key;
  };

  const gridCols = columns === 1 ? "grid-cols-1" : columns === 3 ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1 md:grid-cols-2";

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-custom-chart">
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
                  placeholder="e.g., Items by Status"
                  value={newChart.title || ""}
                  onChange={(e) => setNewChart({ ...newChart, title: e.target.value })}
                  data-testid="input-custom-chart-title"
                />
              </div>
              <div className="space-y-2">
                <Label>Chart Type</Label>
                <Select 
                  value={newChart.chartType} 
                  onValueChange={(value) => setNewChart({ ...newChart, chartType: value as ChartConfig["chartType"] })}
                >
                  <SelectTrigger data-testid="select-custom-chart-type">
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
                  onValueChange={(value) => setNewChart({ ...newChart, dataSource: value, xAxisField: "" })}
                >
                  <SelectTrigger data-testid="select-custom-data-source">
                    <SelectValue placeholder="Select data source" />
                  </SelectTrigger>
                  <SelectContent>
                    {dataSources.map((ds) => (
                      <SelectItem key={ds.key} value={ds.key}>
                        {ds.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>X-Axis (Group By)</Label>
                <Select 
                  value={newChart.xAxisField} 
                  onValueChange={(value) => setNewChart({ ...newChart, xAxisField: value })}
                >
                  <SelectTrigger data-testid="select-custom-x-axis">
                    <SelectValue placeholder="Select field for X-axis" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableFields(newChart.dataSource || "").map((field) => (
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
                  <SelectTrigger data-testid="select-custom-y-axis">
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
                    <SelectTrigger data-testid="select-custom-value-field">
                      <SelectValue placeholder="Select value field" />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableFields(newChart.dataSource || "")
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
              <Button onClick={handleAddChart} data-testid="button-confirm-custom-add">
                <Plus className="w-4 h-4 mr-2" />
                Add Chart
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className={`grid ${gridCols} gap-6`}>
        {charts.map((chart) => (
          <Card key={chart.id} className="relative" data-testid={`custom-chart-${chart.id}`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-base">{chart.title}</CardTitle>
                <CardDescription className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {getDataSourceLabel(chart.dataSource)}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {chart.xAxisField}
                  </Badge>
                </CardDescription>
              </div>
              <div className="flex items-center gap-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={() => setEditingChart(chart)}
                  data-testid={`button-edit-custom-${chart.id}`}
                >
                  <Settings className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={() => handleDeleteChart(chart.id)}
                  data-testid={`button-delete-custom-${chart.id}`}
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
                  onValueChange={(value) => setEditingChart({ ...editingChart, dataSource: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {dataSources.map((ds) => (
                      <SelectItem key={ds.key} value={ds.key}>
                        {ds.label}
                      </SelectItem>
                    ))}
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
