import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import GridLayout from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { Navbar } from '@/components/layout/navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { 
  Plus, 
  Save, 
  Grid3X3, 
  Settings, 
  Trash2,
  Users,
  Briefcase,
  FileCheck,
  TrendingUp,
  BarChart3,
  PieChart,
  Activity,
  Target
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RPieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import { toast } from 'sonner';

interface Widget {
  id: string;
  type: 'stat' | 'bar' | 'pie' | 'line' | 'activity';
  title: string;
  dataKey?: string;
  color?: string;
}

interface LayoutItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

export default function DashboardBuilder() {
  const [layout, setLayout] = useState<LayoutItem[]>([]);
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // Fetch actual data from Avatar Human Capital
  const { data: jobs } = useQuery({
    queryKey: ['jobs'],
    queryFn: async () => {
      const response = await api.get('/jobs');
      return response.data;
    }
  });

  const { data: candidates } = useQuery({
    queryKey: ['candidates'],
    queryFn: async () => {
      const response = await api.get('/candidates');
      return response.data;
    }
  });

  const { data: applications } = useQuery({
    queryKey: ['applications'],
    queryFn: async () => {
      const response = await api.get('/applications');
      return response.data;
    }
  });

  // Load saved layout
  useEffect(() => {
    const savedLayout = localStorage.getItem('custom-dashboard-layout');
    const savedWidgets = localStorage.getItem('custom-dashboard-widgets');
    
    if (savedLayout && savedWidgets) {
      setLayout(JSON.parse(savedLayout));
      setWidgets(JSON.parse(savedWidgets));
    } else {
      // Default layout with Avatar HC widgets
      const defaultLayout: LayoutItem[] = [
        { i: 'total-jobs', x: 0, y: 0, w: 3, h: 2 },
        { i: 'total-candidates', x: 3, y: 0, w: 3, h: 2 },
        { i: 'applications', x: 6, y: 0, w: 3, h: 2 },
        { i: 'active-jobs', x: 9, y: 0, w: 3, h: 2 },
        { i: 'job-status-chart', x: 0, y: 2, w: 6, h: 4 },
        { i: 'candidate-pipeline', x: 6, y: 2, w: 6, h: 4 },
        { i: 'applications-trend', x: 0, y: 6, w: 12, h: 4 },
      ];

      const defaultWidgets: Widget[] = [
        { id: 'total-jobs', type: 'stat', title: '💼 Total Jobs', dataKey: 'total', color: '#8b5cf6' },
        { id: 'total-candidates', type: 'stat', title: '👥 Total Candidates', dataKey: 'total', color: '#06b6d4' },
        { id: 'applications', type: 'stat', title: '📝 Applications', dataKey: 'total', color: '#10b981' },
        { id: 'active-jobs', type: 'stat', title: '✨ Active Jobs', dataKey: 'active', color: '#f59e0b' },
        { id: 'job-status-chart', type: 'bar', title: 'Jobs by Status', dataKey: 'status' },
        { id: 'candidate-pipeline', type: 'pie', title: 'Candidate Pipeline', dataKey: 'stage' },
        { id: 'applications-trend', type: 'line', title: 'Applications Trend', dataKey: 'date' },
      ];

      setLayout(defaultLayout);
      setWidgets(defaultWidgets);
    }
  }, []);

  // Save layout changes
  const saveLayout = () => {
    localStorage.setItem('custom-dashboard-layout', JSON.stringify(layout));
    localStorage.setItem('custom-dashboard-widgets', JSON.stringify(widgets));
    toast.success('Dashboard layout saved!');
  };

  const resetLayout = () => {
    localStorage.removeItem('custom-dashboard-layout');
    localStorage.removeItem('custom-dashboard-widgets');
    window.location.reload();
  };

  const handleLayoutChange = (newLayout: LayoutItem[]) => {
    setLayout(newLayout);
  };

  const removeWidget = (widgetId: string) => {
    setWidgets(widgets.filter(w => w.id !== widgetId));
    setLayout(layout.filter(l => l.i !== widgetId));
  };

  const addWidget = (type: 'stat' | 'bar' | 'pie' | 'line') => {
    const id = `widget-${Date.now()}`;
    const newWidget: Widget = {
      id,
      type,
      title: getWidgetTitle(type),
      dataKey: type === 'stat' ? 'total' : type === 'bar' ? 'status' : type === 'pie' ? 'stage' : 'date',
      color: type === 'stat' ? COLORS[widgets.length % COLORS.length] : undefined
    };

    const newLayoutItem: LayoutItem = {
      i: id,
      x: (widgets.length * 3) % 12,
      y: Math.floor(widgets.length / 4) * 3,
      w: type === 'stat' ? 3 : type === 'line' ? 12 : 6,
      h: type === 'stat' ? 2 : 4
    };

    setWidgets([...widgets, newWidget]);
    setLayout([...layout, newLayoutItem]);
    toast.success(`${getWidgetTitle(type)} added!`);
  };

  const getWidgetTitle = (type: string): string => {
    switch (type) {
      case 'stat': return '📊 Custom Stat';
      case 'bar': return 'Jobs by Status';
      case 'pie': return 'Candidate Pipeline';
      case 'line': return 'Applications Trend';
      default: return 'Widget';
    }
  };

  // Prepare data for charts
  const jobStatusData = jobs?.reduce((acc: any[], job: any) => {
    const existing = acc.find(item => item.status === job.status);
    if (existing) {
      existing.count++;
    } else {
      acc.push({ status: job.status || 'Unknown', count: 1 });
    }
    return acc;
  }, []) || [];

  const candidatePipelineData = candidates?.reduce((acc: any[], candidate: any) => {
    const stage = candidate.stage || 'New';
    const existing = acc.find(item => item.name === stage);
    if (existing) {
      existing.value++;
    } else {
      acc.push({ name: stage, value: 1 });
    }
    return acc;
  }, []) || [];

  const applicationsTrendData = applications?.reduce((acc: any[], app: any) => {
    const date = new Date(app.createdAt).toLocaleDateString();
    const existing = acc.find(item => item.date === date);
    if (existing) {
      existing.count++;
    } else {
      acc.push({ date, count: 1 });
    }
    return acc;
  }, []).slice(-30) || []; // Last 30 days

  // Render widget content
  const renderWidget = (widget: Widget) => {
    switch (widget.type) {
      case 'stat':
        let value = 0;
        let label = widget.title;
        
        if (widget.id === 'total-jobs') {
          value = jobs?.length || 0;
        } else if (widget.id === 'total-candidates') {
          value = candidates?.length || 0;
        } else if (widget.id === 'applications') {
          value = applications?.length || 0;
        } else if (widget.id === 'active-jobs') {
          value = jobs?.filter((j: any) => j.status === 'Active').length || 0;
        } else {
          // For dynamically added stat widgets, show total candidates as default
          value = candidates?.length || 0;
        }

        return (
          <div className="h-full flex flex-col items-center justify-center">
            <div className="text-5xl font-bold" style={{ color: widget.color }}>
              {value}
            </div>
            <div className="text-sm text-muted-foreground mt-2">
              {label}
            </div>
          </div>
        );

      case 'bar':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={jobStatusData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="status" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#8b5cf6" />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <RPieChart>
              <Pie
                data={candidatePipelineData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => entry.name}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {candidatePipelineData.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </RPieChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={applicationsTrendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        );

      default:
        return <div>Widget type not supported</div>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      
      <style>{`
        .react-grid-item > .react-resizable-handle {
          position: absolute;
          width: 20px;
          height: 20px;
          z-index: 10;
        }
        .react-grid-item > .react-resizable-handle::after {
          content: "";
          position: absolute;
          right: 3px;
          bottom: 3px;
          width: 5px;
          height: 5px;
          border-right: 2px solid rgba(139, 92, 246, 0.6);
          border-bottom: 2px solid rgba(139, 92, 246, 0.6);
        }
        .react-grid-item > .react-resizable-handle-se {
          bottom: 0;
          right: 0;
          cursor: se-resize;
        }
        .react-grid-item.resizing {
          opacity: 0.9;
          z-index: 100;
        }
        .react-grid-item {
          transition: all 200ms ease;
          transition-property: left, top, width, height;
        }
        .react-grid-item.static {
          background: transparent;
        }
        .react-grid-item .react-resizable-handle {
          background-image: none !important;
        }
      `}</style>
      
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Grid3X3 className="w-8 h-8" />
              Dashboard Builder
            </h1>
            <p className="text-muted-foreground">
              Customize your Avatar Human Capital dashboard with drag & drop
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={resetLayout}>
              <Trash2 className="w-4 h-4 mr-2" />
              Reset
            </Button>
            <Button onClick={saveLayout}>
              <Save className="w-4 h-4 mr-2" />
              Save Layout
            </Button>
          </div>
        </div>

        {/* Available Widgets */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-sm">Available Widgets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={() => addWidget('stat')}>
                <Plus className="w-4 h-4 mr-2" />
                Add Stat Widget
              </Button>
              <Button variant="outline" size="sm" onClick={() => addWidget('bar')}>
                <BarChart3 className="w-4 h-4 mr-2" />
                Add Bar Chart
              </Button>
              <Button variant="outline" size="sm" onClick={() => addWidget('pie')}>
                <PieChart className="w-4 h-4 mr-2" />
                Add Pie Chart
              </Button>
              <Button variant="outline" size="sm" onClick={() => addWidget('line')}>
                <Activity className="w-4 h-4 mr-2" />
                Add Line Chart
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Grid Layout */}
        <div className="w-full">
          <GridLayout
            className="layout"
            layout={layout}
            cols={12}
            rowHeight={60}
            width={1200}
            onLayoutChange={handleLayoutChange}
            draggableHandle=".drag-handle"
            isDraggable={true}
            isResizable={true}
            onDragStart={() => setIsDragging(true)}
            onDragStop={() => setIsDragging(false)}
            onResizeStart={() => setIsDragging(true)}
            onResizeStop={() => setIsDragging(false)}
            resizeHandles={['se']}
          >
            {widgets.map((widget) => (
              <div key={widget.id} className="bg-card rounded-lg border" style={{ overflow: 'visible' }}>
                <Card className="h-full overflow-hidden">
                  <CardHeader className="drag-handle cursor-move pb-2 bg-card/50 hover:bg-card/80 transition-colors">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-sm font-medium">
                        {widget.title}
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeWidget(widget.id);
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 h-[calc(100%-60px)]">
                    {renderWidget(widget)}
                  </CardContent>
                </Card>
              </div>
            ))}
          </GridLayout>
        </div>

        {widgets.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <Grid3X3 className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No widgets added yet</h3>
            <p className="text-muted-foreground mb-4">
              Add widgets above to start building your dashboard
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
