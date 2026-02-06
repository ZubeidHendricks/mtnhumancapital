import { useState, useEffect, useCallback } from "react";
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
  GripVertical,
  Maximize2,
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

export interface ChartConfig {
  id: string;
  title: string;
  chartType: "bar" | "line" | "pie" | "area" | "radar" | "scatter" | "radialBar" | "funnel" | "composed";
  dataSource: string;
  xAxisField: string;
  yAxisField: string;
  aggregation: "count" | "sum" | "average";
  layout?: { x: number; y: number; w: number; h: number };
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
  { value: "radar", label: "Radar Chart", icon: Target },
  { value: "scatter", label: "Scatter Plot", icon: ScatterChartIcon },
  { value: "radialBar", label: "Radial Bar", icon: Disc },
  { value: "funnel", label: "Funnel Chart", icon: Filter },
  { value: "composed", label: "Composed (Bar + Line)", icon: Layers },
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
  
  const [containerWidth, setContainerWidth] = useState(2400);
  const [gridWidth, setGridWidth] = useState(2400);
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

  useEffect(() => {
    const updateWidth = () => {
      const container = document.getElementById('dashboard-grid-container');
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
      const maxX = Math.max(...charts.map(c => (c.layout?.x || 0) + (c.layout?.w || 4)));
      const minWidth = Math.max(containerWidth, maxX * 100 + 200);
      setGridWidth(minWidth);
    } else {
      setGridWidth(containerWidth);
    }
  }, [charts, containerWidth]);

  const generateLayout = useCallback(() => {
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
  }, [charts]);

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

  const renderChart = (config: ChartConfig, height: number) => {
    const data = aggregateData(config.dataSource, config.xAxisField, config.yAxisField, config.aggregation);
    const chartHeight = Math.max(height - 80, 150);
    
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
      dataSource: newChart.dataSource!,
      xAxisField: newChart.xAxisField!,
      yAxisField: newChart.yAxisField || "count",
      aggregation: newChart.aggregation as ChartConfig["aggregation"] || "count",
      layout: {
        x: (charts.length % 4) * 12,
        y: Infinity,
        w: 12,
        h: 3
      }
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
      description: "Your custom chart has been added. Drag to move, resize from corners.",
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

  const rowHeight = 100;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <GripVertical className="w-4 h-4" />
          <span>Drag charts to reorder</span>
          <Maximize2 className="w-4 h-4 ml-2" />
          <span>Resize from corners</span>
        </div>
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

      <div id="dashboard-grid-container" className="w-full overflow-x-auto pb-4">
        {charts.length > 0 ? (
          <div style={{ minWidth: gridWidth }}>
            <ReactGridLayout
              className="layout"
              layout={generateLayout() as any}
              cols={48}
              rowHeight={rowHeight}
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
              const height = layout.h * rowHeight;
              return (
                <div key={chart.id} data-testid={`custom-chart-${chart.id}`}>
                  <Card className="h-full overflow-hidden border-2 hover:border-primary/50 transition-colors">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 drag-handle cursor-move bg-muted/30">
                      <div className="flex items-center gap-2">
                        <GripVertical className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <CardTitle className="text-base">{chart.title}</CardTitle>
                          <CardDescription className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {getDataSourceLabel(chart.dataSource)}
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
                    <CardContent className="pt-2">
                      {renderChart(chart, height)}
                    </CardContent>
                  </Card>
                </div>
              );
            })}
            </ReactGridLayout>
          </div>
        ) : (
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
      </div>

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
