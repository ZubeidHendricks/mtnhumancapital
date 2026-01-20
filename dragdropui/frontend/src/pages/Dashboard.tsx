import { useState, useEffect } from 'react';
import GridLayout from 'react-grid-layout';
import { api } from '../services/api';
import { Plus, Database, BarChart3, PieChart, LineChart, Activity, Trash2, Settings, Moon, Sun, ArrowUp, TrendingUp, Users, Gauge, Table, Calendar } from 'lucide-react';
import 'react-grid-layout/css/styles.css';
import '/node_modules/react-resizable/css/styles.css';

interface Widget {
  id: string;
  type: 'stat' | 'bar' | 'pie' | 'line' | 'activity' | 'donut' | 'area' | 'table' | 'gauge' | 'heatmap' | 'funnel';
  title: string;
  dataSource?: string;
  config?: any;
}

interface DataSource {
  id: string;
  name: string;
  type: 'api' | 'database' | 'static';
  endpoint?: string;
  config?: any;
}

export default function Dashboard({ onLogout }: { onLogout?: () => void } = {}) {
  const [analytics, setAnalytics] = useState<any>(null);
  const [layout, setLayout] = useState([
    { i: 'a', x: 0, y: 0, w: 3, h: 2 },
    { i: 'b', x: 3, y: 0, w: 3, h: 2 },
    { i: 'c', x: 6, y: 0, w: 3, h: 2 },
    { i: 'd', x: 9, y: 0, w: 3, h: 2 },
  ]);
  const [widgets, setWidgets] = useState<Widget[]>([
    { id: 'a', type: 'stat', title: '📝 Total Posts' },
    { id: 'b', type: 'stat', title: '👥 Total Users' },
    { id: 'c', type: 'stat', title: '🖼️ Media Files' },
    { id: 'd', type: 'stat', title: '💬 Comments' },
  ]);
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'widgets' | 'datasources'>('widgets');
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    loadAnalytics();
    const savedLayout = localStorage.getItem('dashboard-layout');
    const savedWidgets = localStorage.getItem('dashboard-widgets');
    const savedDataSources = localStorage.getItem('dashboard-datasources');
    
    // Scroll handler for scroll-to-top button
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    
    if (savedLayout) {
      setLayout(JSON.parse(savedLayout));
    } else {
      // Seed layout data
      const seedLayout = [
        { i: 'a', x: 0, y: 0, w: 3, h: 2 },
        { i: 'b', x: 3, y: 0, w: 3, h: 2 },
        { i: 'c', x: 6, y: 0, w: 3, h: 2 },
        { i: 'd', x: 9, y: 0, w: 3, h: 2 },
        { i: 'e', x: 0, y: 2, w: 6, h: 4 },
        { i: 'f', x: 6, y: 2, w: 6, h: 4 },
        { i: 'g', x: 0, y: 6, w: 4, h: 3 },
        { i: 'h', x: 4, y: 6, w: 4, h: 3 },
        { i: 'i', x: 8, y: 6, w: 4, h: 3 },
        { i: 'j', x: 0, y: 9, w: 6, h: 4 },
        { i: 'k', x: 6, y: 9, w: 6, h: 4 },
        { i: 'l', x: 0, y: 13, w: 4, h: 3 },
        { i: 'm', x: 4, y: 13, w: 4, h: 3 },
        { i: 'n', x: 8, y: 13, w: 4, h: 3 },
      ];
      setLayout(seedLayout);
      localStorage.setItem('dashboard-layout', JSON.stringify(seedLayout));
    }
    
    if (savedWidgets) {
      setWidgets(JSON.parse(savedWidgets));
    } else {
      // Seed widgets data
      const seedWidgets: Widget[] = [
        { id: 'a', type: 'stat', title: '📝 Total Posts', dataSource: 'wp-api' },
        { id: 'b', type: 'stat', title: '👥 Active Users', dataSource: 'wp-api' },
        { id: 'c', type: 'stat', title: '🖼️ Media Files', dataSource: 'wp-api' },
        { id: 'd', type: 'stat', title: '💬 Comments', dataSource: 'wp-api' },
        { id: 'e', type: 'line', title: 'User Growth Trend', dataSource: 'analytics' },
        { id: 'f', type: 'bar', title: 'Top Performing Posts', dataSource: 'analytics' },
        { id: 'g', type: 'pie', title: 'Content Distribution', dataSource: 'wp-api' },
        { id: 'h', type: 'activity', title: 'Recent Activity Feed' },
        { id: 'i', type: 'donut', title: 'Traffic Sources', dataSource: 'analytics' },
        { id: 'j', type: 'area', title: 'Revenue Overview', dataSource: 'analytics' },
        { id: 'k', type: 'table', title: 'Recent Transactions', dataSource: 'local-db' },
        { id: 'l', type: 'gauge', title: 'Server Performance', dataSource: 'local-db' },
        { id: 'm', type: 'heatmap', title: 'Activity Heatmap', dataSource: 'analytics' },
        { id: 'n', type: 'funnel', title: 'Conversion Funnel', dataSource: 'analytics' },
      ];
      setWidgets(seedWidgets);
      localStorage.setItem('dashboard-widgets', JSON.stringify(seedWidgets));
    }
    
    if (savedDataSources) {
      setDataSources(JSON.parse(savedDataSources));
    } else {
      // Seed data sources
      const seedDataSources: DataSource[] = [
        {
          id: 'wp-api',
          name: 'REST API',
          type: 'api',
          endpoint: 'https://your-site.com/api/v1',
          config: { authenticated: true }
        },
        {
          id: 'analytics',
          name: 'Google Analytics',
          type: 'api',
          endpoint: 'https://analytics.google.com/api/v1',
          config: { apiKey: '****' }
        },
        {
          id: 'local-db',
          name: 'Local Database',
          type: 'database',
          config: { host: 'localhost', database: 'dashboard_db' }
        }
      ];
      setDataSources(seedDataSources);
      localStorage.setItem('dashboard-datasources', JSON.stringify(seedDataSources));
    }
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  async function loadAnalytics() {
    try {
      const data = await api.getAnalytics();
      setAnalytics(data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    }
  }

  function toggleDarkMode() {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('darkMode', JSON.stringify(newMode));
  }

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleLayoutChange(newLayout: any) {
    setLayout(newLayout);
    localStorage.setItem('dashboard-layout', JSON.stringify(newLayout));
  }

  function addWidget(type: Widget['type']) {
    const id = `widget-${Date.now()}`;
    const newWidget: Widget = {
      id,
      type,
      title: `New ${type} Widget`,
    };
    
    const newLayout = {
      i: id,
      x: (layout.length * 3) % 12,
      y: Infinity,
      w: type === 'stat' ? 3 : 6,
      h: type === 'stat' ? 2 : 4,
    };
    
    setWidgets([...widgets, newWidget]);
    setLayout([...layout, newLayout]);
    
    localStorage.setItem('dashboard-widgets', JSON.stringify([...widgets, newWidget]));
    localStorage.setItem('dashboard-layout', JSON.stringify([...layout, newLayout]));
  }

  function removeWidget(id: string) {
    setWidgets(widgets.filter(w => w.id !== id));
    setLayout(layout.filter(l => l.i !== id));
    
    const newWidgets = widgets.filter(w => w.id !== id);
    const newLayout = layout.filter(l => l.i !== id);
    
    localStorage.setItem('dashboard-widgets', JSON.stringify(newWidgets));
    localStorage.setItem('dashboard-layout', JSON.stringify(newLayout));
  }

  function addDataSource() {
    const id = `ds-${Date.now()}`;
    const newDataSource: DataSource = {
      id,
      name: 'New Data Source',
      type: 'api',
      endpoint: 'https://api.example.com/data',
    };
    
    setDataSources([...dataSources, newDataSource]);
    localStorage.setItem('dashboard-datasources', JSON.stringify([...dataSources, newDataSource]));
  }

  function removeDataSource(id: string) {
    const newDataSources = dataSources.filter(ds => ds.id !== id);
    setDataSources(newDataSources);
    localStorage.setItem('dashboard-datasources', JSON.stringify(newDataSources));
  }

  function renderWidget(widget: Widget) {
    const widgetStyle = {
      background: darkMode ? '#2d3748' : 'white',
      color: darkMode ? '#e2e8f0' : '#1a202c',
      borderRadius: '8px',
      padding: '20px',
      boxShadow: darkMode ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.1)',
      overflow: 'auto',
      position: 'relative' as const,
      transition: 'all 0.3s'
    };

    const handleStyle = {
      position: 'absolute' as const,
      top: '10px',
      right: '10px',
      cursor: 'move',
      fontSize: '20px',
      color: darkMode ? '#718096' : '#ccc',
      userSelect: 'none' as const
    };

    const deleteButtonStyle = {
      position: 'absolute' as const,
      top: '10px',
      right: '40px',
      background: darkMode ? '#742a2a' : '#fee',
      color: '#ef4444',
      border: 'none',
      borderRadius: '4px',
      padding: '6px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    };

    switch (widget.type) {
      case 'stat':
        const statValues: Record<string, number> = {
          'a': analytics?.total_posts || 247,
          'b': analytics?.total_users || 1834,
          'c': analytics?.total_media || 592,
          'd': analytics?.total_comments || 3421,
        };
        const statColors: Record<string, string> = {
          'a': '#667eea',
          'b': '#10b981',
          'c': '#f59e0b',
          'd': '#8b5cf6',
        };
        
        return (
          <div key={widget.id} style={widgetStyle}>
            <div className="drag-handle" style={handleStyle}>⋮⋮</div>
            <button onClick={() => removeWidget(widget.id)} style={deleteButtonStyle}>
              <Trash2 size={16} />
            </button>
            <h3 style={{ marginBottom: '10px' }}>{widget.title}</h3>
            {widget.dataSource && (
              <div style={{ fontSize: '11px', color: '#999', marginBottom: '10px' }}>
                <Database size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                {dataSources.find(ds => ds.id === widget.dataSource)?.name || 'Data Source'}
              </div>
            )}
            <p style={{ fontSize: '42px', fontWeight: 'bold', color: statColors[widget.id] || '#667eea', margin: '20px 0' }}>
              {statValues[widget.id] || 0}
            </p>
            <div style={{ fontSize: '13px', color: '#10b981', fontWeight: '500' }}>
              ↑ 12.5% from last month
            </div>
          </div>
        );
      
      case 'bar':
        return (
          <div key={widget.id} style={widgetStyle}>
            <div className="drag-handle" style={handleStyle}>⋮⋮</div>
            <button onClick={() => removeWidget(widget.id)} style={deleteButtonStyle}>
              <Trash2 size={16} />
            </button>
            <h3 style={{ marginBottom: '10px' }}>
              <BarChart3 size={20} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }} />
              {widget.title}
            </h3>
            {widget.dataSource && (
              <div style={{ fontSize: '11px', color: '#999', marginBottom: '15px' }}>
                <Database size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                {dataSources.find(ds => ds.id === widget.dataSource)?.name || 'Data Source'}
              </div>
            )}
            <div style={{ marginTop: '20px' }}>
              {['Item 1', 'Item 2', 'Item 3', 'Item 4', 'Item 5'].map((label, idx) => {
                const values = [85, 72, 58, 45, 32];
                const colors = ['#667eea', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
                return (
                  <div key={idx} style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '13px' }}>
                      <span>{label}</span>
                      <span style={{ fontWeight: '600' }}>{values[idx]}%</span>
                    </div>
                    <div style={{ background: '#f3f4f6', borderRadius: '4px', height: '8px', overflow: 'hidden' }}>
                      <div style={{ 
                        background: colors[idx], 
                        width: `${values[idx]}%`, 
                        height: '100%',
                        transition: 'width 0.3s ease'
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      
      case 'pie':
        return (
          <div key={widget.id} style={widgetStyle}>
            <div className="drag-handle" style={handleStyle}>⋮⋮</div>
            <button onClick={() => removeWidget(widget.id)} style={deleteButtonStyle}>
              <Trash2 size={16} />
            </button>
            <h3 style={{ marginBottom: '10px' }}>
              <PieChart size={20} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }} />
              {widget.title}
            </h3>
            {widget.dataSource && (
              <div style={{ fontSize: '11px', color: '#999', marginBottom: '15px' }}>
                <Database size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                {dataSources.find(ds => ds.id === widget.dataSource)?.name || 'Data Source'}
              </div>
            )}
            <div style={{ display: 'flex', marginTop: '20px', gap: '20px', alignItems: 'center' }}>
              <div style={{ position: 'relative', width: '140px', height: '140px' }}>
                <svg viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#f3f4f6" strokeWidth="20" />
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#667eea" strokeWidth="20" 
                    strokeDasharray="75.4 251.2" strokeDashoffset="0" />
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#10b981" strokeWidth="20" 
                    strokeDasharray="62.8 251.2" strokeDashoffset="-75.4" />
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#f59e0b" strokeWidth="20" 
                    strokeDasharray="50.2 251.2" strokeDashoffset="-138.2" />
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#8b5cf6" strokeWidth="20" 
                    strokeDasharray="62.8 251.2" strokeDashoffset="-188.4" />
                </svg>
              </div>
              <div style={{ flex: 1, fontSize: '13px' }}>
                {[
                  { label: 'Posts', value: '30%', color: '#667eea' },
                  { label: 'Pages', value: '25%', color: '#10b981' },
                  { label: 'Media', value: '20%', color: '#f59e0b' },
                  { label: 'Other', value: '25%', color: '#8b5cf6' }
                ].map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: item.color, marginRight: '8px' }} />
                    <span style={{ flex: 1 }}>{item.label}</span>
                    <span style={{ fontWeight: '600' }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      
      case 'line':
        return (
          <div key={widget.id} style={widgetStyle}>
            <div className="drag-handle" style={handleStyle}>⋮⋮</div>
            <button onClick={() => removeWidget(widget.id)} style={deleteButtonStyle}>
              <Trash2 size={16} />
            </button>
            <h3 style={{ marginBottom: '10px' }}>
              <LineChart size={20} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }} />
              {widget.title}
            </h3>
            {widget.dataSource && (
              <div style={{ fontSize: '11px', color: '#999', marginBottom: '15px' }}>
                <Database size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                {dataSources.find(ds => ds.id === widget.dataSource)?.name || 'Data Source'}
              </div>
            )}
            <div style={{ marginTop: '20px', position: 'relative', height: '180px' }}>
              <svg viewBox="0 0 300 150" style={{ width: '100%', height: '100%' }}>
                {/* Grid lines */}
                {[0, 1, 2, 3, 4].map(i => (
                  <line key={i} x1="0" y1={i * 37.5} x2="300" y2={i * 37.5} 
                    stroke="#f3f4f6" strokeWidth="1" />
                ))}
                {/* Line chart */}
                <polyline
                  points="0,120 50,100 100,85 150,95 200,65 250,75 300,45"
                  fill="none"
                  stroke="#667eea"
                  strokeWidth="3"
                />
                {/* Data points */}
                {[
                  [0, 120], [50, 100], [100, 85], [150, 95], [200, 65], [250, 75], [300, 45]
                ].map((point, idx) => (
                  <circle key={idx} cx={point[0]} cy={point[1]} r="4" fill="#667eea" />
                ))}
              </svg>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontSize: '11px', color: '#999' }}>
                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'].map((month, idx) => (
                  <span key={idx}>{month}</span>
                ))}
              </div>
            </div>
          </div>
        );
      
      case 'activity':
        return (
          <div key={widget.id} style={widgetStyle}>
            <div className="drag-handle" style={handleStyle}>⋮⋮</div>
            <button onClick={() => removeWidget(widget.id)} style={deleteButtonStyle}>
              <Trash2 size={16} />
            </button>
            <h3 style={{ marginBottom: '15px' }}>
              <Activity size={20} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }} />
              {widget.title}
            </h3>
            <div style={{ marginTop: '20px', fontSize: '13px' }}>
              {[
                { icon: '📝', action: 'New post published', detail: 'Getting Started with React', time: '2 min ago', color: '#667eea' },
                { icon: '👤', action: 'New user registered', detail: 'john.doe@example.com', time: '15 min ago', color: '#10b981' },
                { icon: '💬', action: 'Comment added', detail: 'On "Best Practices Guide"', time: '1 hour ago', color: '#f59e0b' },
                { icon: '🖼️', action: 'Media uploaded', detail: 'banner-image.jpg (2.4 MB)', time: '2 hours ago', color: '#8b5cf6' },
                { icon: '✏️', action: 'Post updated', detail: 'Dashboard Tutorial', time: '3 hours ago', color: '#667eea' },
                { icon: '🔌', action: 'Plugin activated', detail: 'Contact Form 7', time: '5 hours ago', color: '#ec4899' }
              ].map((activity, idx) => (
                <div key={idx} style={{ 
                  padding: '12px', 
                  background: '#f9fafb', 
                  borderRadius: '6px', 
                  marginBottom: '8px',
                  borderLeft: `3px solid ${activity.color}`,
                  display: 'flex',
                  gap: '10px',
                  alignItems: 'start'
                }}>
                  <span style={{ fontSize: '18px' }}>{activity.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', marginBottom: '2px' }}>{activity.action}</div>
                    <div style={{ color: '#666', fontSize: '12px' }}>{activity.detail}</div>
                    <div style={{ color: '#999', fontSize: '11px', marginTop: '4px' }}>{activity.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'donut':
        return (
          <div key={widget.id} style={widgetStyle}>
            <div className="drag-handle" style={handleStyle}>⋮⋮</div>
            <button onClick={() => removeWidget(widget.id)} style={deleteButtonStyle}>
              <Trash2 size={16} />
            </button>
            <h3 style={{ marginBottom: '10px' }}>
              <PieChart size={20} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }} />
              {widget.title}
            </h3>
            {widget.dataSource && (
              <div style={{ fontSize: '11px', color: '#999', marginBottom: '15px' }}>
                <Database size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                {dataSources.find(ds => ds.id === widget.dataSource)?.name || 'Data Source'}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '20px' }}>
              <div style={{ position: 'relative', width: '120px', height: '120px' }}>
                <svg viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#f3f4f6" strokeWidth="15" />
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#667eea" strokeWidth="15" 
                    strokeDasharray="125.6 251.2" strokeDashoffset="0" transform="rotate(-90 50 50)" />
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#10b981" strokeWidth="15" 
                    strokeDasharray="62.8 251.2" strokeDashoffset="-125.6" transform="rotate(-90 50 50)" />
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#f59e0b" strokeWidth="15" 
                    strokeDasharray="37.7 251.2" strokeDashoffset="-188.4" transform="rotate(-90 50 50)" />
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#8b5cf6" strokeWidth="15" 
                    strokeDasharray="25.1 251.2" strokeDashoffset="-226.1" transform="rotate(-90 50 50)" />
                </svg>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#667eea' }}>8.5K</div>
                  <div style={{ fontSize: '11px', color: '#999' }}>Total</div>
                </div>
              </div>
              <div style={{ marginTop: '20px', width: '100%', fontSize: '12px' }}>
                {[
                  { label: 'Direct', value: '50%', color: '#667eea' },
                  { label: 'Referral', value: '25%', color: '#10b981' },
                  { label: 'Social', value: '15%', color: '#f59e0b' },
                  { label: 'Other', value: '10%', color: '#8b5cf6' }
                ].map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: item.color, marginRight: '8px' }} />
                      <span>{item.label}</span>
                    </div>
                    <span style={{ fontWeight: '600' }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'area':
        return (
          <div key={widget.id} style={widgetStyle}>
            <div className="drag-handle" style={handleStyle}>⋮⋮</div>
            <button onClick={() => removeWidget(widget.id)} style={deleteButtonStyle}>
              <Trash2 size={16} />
            </button>
            <h3 style={{ marginBottom: '10px' }}>
              <TrendingUp size={20} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }} />
              {widget.title}
            </h3>
            {widget.dataSource && (
              <div style={{ fontSize: '11px', color: '#999', marginBottom: '15px' }}>
                <Database size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                {dataSources.find(ds => ds.id === widget.dataSource)?.name || 'Data Source'}
              </div>
            )}
            <div style={{ marginTop: '20px', height: '200px' }}>
              <svg viewBox="0 0 300 150" style={{ width: '100%', height: '100%' }}>
                <defs>
                  <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.3"/>
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.05"/>
                  </linearGradient>
                </defs>
                {[0, 1, 2, 3, 4].map(i => (
                  <line key={i} x1="0" y1={i * 37.5} x2="300" y2={i * 37.5} 
                    stroke="#f3f4f6" strokeWidth="1" />
                ))}
                <polygon
                  points="0,150 0,90 50,75 100,60 150,70 200,45 250,55 300,30 300,150"
                  fill="url(#areaGradient)"
                />
                <polyline
                  points="0,90 50,75 100,60 150,70 200,45 250,55 300,30"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2.5"
                />
              </svg>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontSize: '11px', color: '#999' }}>
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, idx) => (
                  <span key={idx}>{day}</span>
                ))}
              </div>
            </div>
          </div>
        );

      case 'table':
        return (
          <div key={widget.id} style={widgetStyle}>
            <div className="drag-handle" style={handleStyle}>⋮⋮</div>
            <button onClick={() => removeWidget(widget.id)} style={deleteButtonStyle}>
              <Trash2 size={16} />
            </button>
            <h3 style={{ marginBottom: '10px' }}>
              <Table size={20} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }} />
              {widget.title}
            </h3>
            {widget.dataSource && (
              <div style={{ fontSize: '11px', color: '#999', marginBottom: '15px' }}>
                <Database size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                {dataSources.find(ds => ds.id === widget.dataSource)?.name || 'Data Source'}
              </div>
            )}
            <div style={{ marginTop: '20px', overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                    <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600' }}>ID</th>
                    <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600' }}>Customer</th>
                    <th style={{ padding: '10px', textAlign: 'right', fontWeight: '600' }}>Amount</th>
                    <th style={{ padding: '10px', textAlign: 'center', fontWeight: '600' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { id: '#1234', customer: 'John Doe', amount: '$129.00', status: 'Paid', color: '#10b981' },
                    { id: '#1235', customer: 'Jane Smith', amount: '$85.50', status: 'Pending', color: '#f59e0b' },
                    { id: '#1236', customer: 'Bob Johnson', amount: '$210.00', status: 'Paid', color: '#10b981' },
                    { id: '#1237', customer: 'Alice Brown', amount: '$45.00', status: 'Failed', color: '#ef4444' },
                    { id: '#1238', customer: 'Charlie Wilson', amount: '$175.00', status: 'Paid', color: '#10b981' }
                  ].map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '10px', color: '#999' }}>{row.id}</td>
                      <td style={{ padding: '10px' }}>{row.customer}</td>
                      <td style={{ padding: '10px', textAlign: 'right', fontWeight: '600' }}>{row.amount}</td>
                      <td style={{ padding: '10px', textAlign: 'center' }}>
                        <span style={{ 
                          padding: '4px 8px', 
                          borderRadius: '4px', 
                          background: `${row.color}15`, 
                          color: row.color,
                          fontSize: '11px',
                          fontWeight: '500'
                        }}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'gauge':
        return (
          <div key={widget.id} style={widgetStyle}>
            <div className="drag-handle" style={handleStyle}>⋮⋮</div>
            <button onClick={() => removeWidget(widget.id)} style={deleteButtonStyle}>
              <Trash2 size={16} />
            </button>
            <h3 style={{ marginBottom: '10px' }}>
              <Gauge size={20} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }} />
              {widget.title}
            </h3>
            {widget.dataSource && (
              <div style={{ fontSize: '11px', color: '#999', marginBottom: '15px' }}>
                <Database size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                {dataSources.find(ds => ds.id === widget.dataSource)?.name || 'Data Source'}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '30px' }}>
              <div style={{ position: 'relative', width: '160px', height: '80px', overflow: 'hidden' }}>
                <svg viewBox="0 0 100 50" style={{ width: '100%', height: '100%' }}>
                  <path d="M 10 45 A 40 40 0 0 1 90 45" fill="none" stroke="#f3f4f6" strokeWidth="8" />
                  <path d="M 10 45 A 40 40 0 0 1 90 45" fill="none" stroke="#10b981" strokeWidth="8" 
                    strokeDasharray="125.6" strokeDashoffset="25.12" />
                </svg>
                <div style={{ position: 'absolute', bottom: '10px', left: '50%', transform: 'translateX(-50%)', textAlign: 'center' }}>
                  <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#10b981' }}>82%</div>
                </div>
              </div>
              <div style={{ marginTop: '20px', textAlign: 'center' }}>
                <div style={{ fontSize: '13px', color: '#666' }}>CPU Usage</div>
                <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>Optimal performance</div>
              </div>
            </div>
          </div>
        );

      case 'heatmap':
        return (
          <div key={widget.id} style={widgetStyle}>
            <div className="drag-handle" style={handleStyle}>⋮⋮</div>
            <button onClick={() => removeWidget(widget.id)} style={deleteButtonStyle}>
              <Trash2 size={16} />
            </button>
            <h3 style={{ marginBottom: '10px' }}>
              <Calendar size={20} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }} />
              {widget.title}
            </h3>
            {widget.dataSource && (
              <div style={{ fontSize: '11px', color: '#999', marginBottom: '15px' }}>
                <Database size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                {dataSources.find(ds => ds.id === widget.dataSource)?.name || 'Data Source'}
              </div>
            )}
            <div style={{ marginTop: '20px' }}>
              <div style={{ display: 'flex', gap: '4px', marginBottom: '8px', fontSize: '11px', color: '#999' }}>
                <div style={{ width: '30px' }}></div>
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, idx) => (
                  <div key={idx} style={{ flex: 1, textAlign: 'center' }}>{day[0]}</div>
                ))}
              </div>
              {['Week 1', 'Week 2', 'Week 3', 'Week 4'].map((week, weekIdx) => (
                <div key={weekIdx} style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                  <div style={{ width: '30px', fontSize: '11px', color: '#999' }}>{week}</div>
                  {[...Array(7)].map((_, dayIdx) => {
                    const intensity = Math.random();
                    const bgColor = intensity > 0.7 ? '#10b981' : 
                                   intensity > 0.4 ? '#10b98150' : 
                                   intensity > 0.2 ? '#10b98130' : '#f3f4f6';
                    return (
                      <div key={dayIdx} style={{ 
                        flex: 1, 
                        height: '30px', 
                        background: bgColor, 
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }} title={`${week} ${dayIdx + 1}`} />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        );

      case 'funnel':
        return (
          <div key={widget.id} style={widgetStyle}>
            <div className="drag-handle" style={handleStyle}>⋮⋮</div>
            <button onClick={() => removeWidget(widget.id)} style={deleteButtonStyle}>
              <Trash2 size={16} />
            </button>
            <h3 style={{ marginBottom: '10px' }}>
              <TrendingUp size={20} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }} />
              {widget.title}
            </h3>
            {widget.dataSource && (
              <div style={{ fontSize: '11px', color: '#999', marginBottom: '15px' }}>
                <Database size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                {dataSources.find(ds => ds.id === widget.dataSource)?.name || 'Data Source'}
              </div>
            )}
            <div style={{ marginTop: '30px', padding: '0 20px' }}>
              {[
                { label: 'Visitors', value: '10,000', width: '100%', color: '#667eea' },
                { label: 'Sign Ups', value: '5,000', width: '85%', color: '#10b981' },
                { label: 'Trials', value: '2,500', width: '65%', color: '#f59e0b' },
                { label: 'Conversions', value: '1,000', width: '45%', color: '#8b5cf6' }
              ].map((stage, idx) => (
                <div key={idx} style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                    <span style={{ fontWeight: '500' }}>{stage.label}</span>
                    <span style={{ color: '#666' }}>{stage.value}</span>
                  </div>
                  <div style={{ 
                    background: stage.color, 
                    height: '40px', 
                    width: stage.width,
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: '600',
                    fontSize: '14px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}>
                    {idx === 0 ? '100%' : `${parseInt(stage.width)}%`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      
      default:
        return null;
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: darkMode ? '#1a202c' : '#f5f7fa', transition: 'background 0.3s' }}>
      {/* Main Content */}
      <div style={{ flex: 1, padding: '20px', marginRight: sidePanelOpen ? '350px' : '0', transition: 'margin-right 0.3s' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '30px',
          background: darkMode ? '#2d3748' : 'white',
          color: darkMode ? '#e2e8f0' : '#1a202c',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: darkMode ? '0 1px 3px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.1)',
          transition: 'all 0.3s'
        }}>
          <h1 style={{ margin: 0 }}>🎨 Customizable Dashboard</h1>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              onClick={toggleDarkMode}
              style={{
                padding: '10px',
                background: darkMode ? '#4a5568' : '#f3f4f6',
                color: darkMode ? '#e2e8f0' : '#1a202c',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.3s'
              }}
              title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button 
              onClick={() => {
                localStorage.removeItem('dashboard-layout');
                localStorage.removeItem('dashboard-widgets');
                localStorage.removeItem('dashboard-datasources');
                window.location.reload();
              }}
              style={{
                padding: '10px 20px',
                background: '#f59e0b',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '500',
                fontSize: '14px'
              }}
              title="Reset dashboard to default seed data"
            >
              🔄 Reset
            </button>
            <button 
              onClick={() => setSidePanelOpen(!sidePanelOpen)}
              style={{
                padding: '10px 20px',
                background: '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Plus size={20} />
              {sidePanelOpen ? 'Close Panel' : 'Add Widget'}
            </button>
          </div>
        </div>

        <GridLayout
          className="layout"
          layout={layout}
          cols={12}
          rowHeight={100}
          width={1200}
          onLayoutChange={handleLayoutChange}
          draggableHandle=".drag-handle"
        >
          {widgets.map(widget => renderWidget(widget))}
        </GridLayout>

        <p style={{ marginTop: '20px', color: '#666', textAlign: 'center', fontSize: '14px' }}>
          💡 <strong>Tip:</strong> Drag the ⋮⋮ handle to move • Drag corners to resize • Your layout is auto-saved
        </p>
      </div>

      {/* Side Panel */}
      {sidePanelOpen && (
        <div style={{
          position: 'fixed',
          right: 0,
          top: 0,
          width: '350px',
          height: '100vh',
          background: darkMode ? '#2d3748' : 'white',
          color: darkMode ? '#e2e8f0' : '#1a202c',
          boxShadow: darkMode ? '-2px 0 10px rgba(0,0,0,0.3)' : '-2px 0 10px rgba(0,0,0,0.1)',
          padding: '20px',
          overflowY: 'auto',
          zIndex: 1000,
          transition: 'all 0.3s'
        }}>
          <h2 style={{ marginTop: 0 }}>Dashboard Manager</h2>
          
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: `1px solid ${darkMode ? '#4a5568' : '#e5e7eb'}` }}>
            <button
              onClick={() => setActiveTab('widgets')}
              style={{
                flex: 1,
                padding: '10px',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === 'widgets' ? '2px solid #667eea' : '2px solid transparent',
                color: activeTab === 'widgets' ? '#667eea' : darkMode ? '#a0aec0' : '#666',
                cursor: 'pointer',
                fontWeight: activeTab === 'widgets' ? '600' : '400'
              }}
            >
              Widgets
            </button>
            <button
              onClick={() => setActiveTab('datasources')}
              style={{
                flex: 1,
                padding: '10px',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === 'datasources' ? '2px solid #667eea' : '2px solid transparent',
                color: activeTab === 'datasources' ? '#667eea' : darkMode ? '#a0aec0' : '#666',
                cursor: 'pointer',
                fontWeight: activeTab === 'datasources' ? '600' : '400'
              }}
            >
              Data Sources
            </button>
          </div>

          {/* Widgets Tab */}
          {activeTab === 'widgets' && (
            <div>
              <h3 style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>ADD NEW WIDGET</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button
                  onClick={() => addWidget('stat')}
                  style={widgetButtonStyle(darkMode)}
                >
                  <Activity size={20} />
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <div style={{ fontWeight: '600' }}>Stat Widget</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>Display single metrics</div>
                  </div>
                </button>

                <button
                  onClick={() => addWidget('bar')}
                  style={widgetButtonStyle(darkMode)}
                >
                  <BarChart3 size={20} />
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <div style={{ fontWeight: '600' }}>Bar Chart</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>Compare data values</div>
                  </div>
                </button>

                <button
                  onClick={() => addWidget('pie')}
                  style={widgetButtonStyle(darkMode)}
                >
                  <PieChart size={20} />
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <div style={{ fontWeight: '600' }}>Pie Chart</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>Show proportions</div>
                  </div>
                </button>

                <button
                  onClick={() => addWidget('line')}
                  style={widgetButtonStyle(darkMode)}
                >
                  <LineChart size={20} />
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <div style={{ fontWeight: '600' }}>Line Chart</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>Track trends over time</div>
                  </div>
                </button>

                <button
                  onClick={() => addWidget('activity')}
                  style={widgetButtonStyle(darkMode)}
                >
                  <Activity size={20} />
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <div style={{ fontWeight: '600' }}>Activity Feed</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>Show recent events</div>
                  </div>
                </button>

                <button
                  onClick={() => addWidget('donut')}
                  style={widgetButtonStyle(darkMode)}
                >
                  <PieChart size={20} />
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <div style={{ fontWeight: '600' }}>Donut Chart</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>Proportional data with center</div>
                  </div>
                </button>

                <button
                  onClick={() => addWidget('area')}
                  style={widgetButtonStyle(darkMode)}
                >
                  <TrendingUp size={20} />
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <div style={{ fontWeight: '600' }}>Area Chart</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>Filled line chart</div>
                  </div>
                </button>

                <button
                  onClick={() => addWidget('table')}
                  style={widgetButtonStyle(darkMode)}
                >
                  <Table size={20} />
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <div style={{ fontWeight: '600' }}>Data Table</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>Tabular data display</div>
                  </div>
                </button>

                <button
                  onClick={() => addWidget('gauge')}
                  style={widgetButtonStyle(darkMode)}
                >
                  <Gauge size={20} />
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <div style={{ fontWeight: '600' }}>Gauge Chart</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>Performance meter</div>
                  </div>
                </button>

                <button
                  onClick={() => addWidget('heatmap')}
                  style={widgetButtonStyle(darkMode)}
                >
                  <Calendar size={20} />
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <div style={{ fontWeight: '600' }}>Heatmap</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>Calendar activity view</div>
                  </div>
                </button>

                <button
                  onClick={() => addWidget('funnel')}
                  style={widgetButtonStyle(darkMode)}
                >
                  <TrendingUp size={20} />
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <div style={{ fontWeight: '600' }}>Funnel Chart</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>Conversion stages</div>
                  </div>
                </button>
              </div>

              <div style={{ marginTop: '30px' }}>
                <h3 style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>CURRENT WIDGETS ({widgets.length})</h3>
                <div style={{ fontSize: '14px', color: '#999' }}>
                  {widgets.length === 0 ? 'No widgets added yet' : `${widgets.length} widget(s) on dashboard`}
                </div>
              </div>
            </div>
          )}

          {/* Data Sources Tab */}
          {activeTab === 'datasources' && (
            <div>
              <h3 style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>DATA SOURCES</h3>
              
              <button
                onClick={addDataSource}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: '#667eea',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  marginBottom: '20px'
                }}
              >
                <Database size={18} />
                Add Data Source
              </button>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {dataSources.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#999', background: '#f9fafb', borderRadius: '6px' }}>
                    No data sources configured
                  </div>
                ) : (
                  dataSources.map(ds => (
                    <div key={ds.id} style={{
                      padding: '15px',
                      background: '#f9fafb',
                      borderRadius: '6px',
                      border: '1px solid #e5e7eb'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                        <div>
                          <div style={{ fontWeight: '600', marginBottom: '4px' }}>{ds.name}</div>
                          <div style={{ fontSize: '12px', color: '#666' }}>Type: {ds.type}</div>
                          {ds.endpoint && (
                            <div style={{ fontSize: '12px', color: '#999', marginTop: '4px', wordBreak: 'break-all' }}>
                              {ds.endpoint}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => removeDataSource(ds.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            padding: '4px'
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <button
                        style={{
                          width: '100%',
                          padding: '6px',
                          background: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          marginTop: '8px'
                        }}
                      >
                        <Settings size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                        Configure
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div style={{ marginTop: '30px', padding: '15px', background: '#eff6ff', borderRadius: '6px', fontSize: '13px', color: '#1e40af' }}>
                <strong>💡 Tip:</strong> Data sources can be connected to widgets to display real-time data from APIs, databases, or static files.
              </div>
            </div>
          )}
        </div>
      )}

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          style={{
            position: 'fixed',
            bottom: '30px',
            right: sidePanelOpen ? '380px' : '30px',
            width: '50px',
            height: '50px',
            borderRadius: '50%',
            background: '#667eea',
            color: 'white',
            border: 'none',
            boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s',
            zIndex: 999
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-5px)';
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.6)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
          }}
          title="Scroll to top"
        >
          <ArrowUp size={24} />
        </button>
      )}
    </div>
  );
}

const widgetButtonStyle = (darkMode: boolean) => ({
  width: '100%',
  padding: '15px',
  background: darkMode ? '#4a5568' : 'white',
  color: darkMode ? '#e2e8f0' : '#1a202c',
  border: `1px solid ${darkMode ? '#4a5568' : '#e5e7eb'}`,
  borderRadius: '6px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  textAlign: 'left' as const,
  transition: 'all 0.2s'
});
