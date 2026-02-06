import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { candidateService } from "@/lib/api";
import { useTenantQueryKey } from "@/hooks/useTenant";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from "recharts";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  Briefcase, 
  AlertTriangle, 
  Activity, 
  Smartphone, 
  Download, 
  Share2,
  Calendar,
  ArrowUpRight,
  Database
} from "lucide-react";
import { motion } from "framer-motion";

// Mock Data
const financialData = [
  { month: "Jan", revenue: 120, expenses: 80 },
  { month: "Feb", revenue: 132, expenses: 85 },
  { month: "Mar", revenue: 145, expenses: 90 },
  { month: "Apr", revenue: 160, expenses: 95 },
  { month: "May", revenue: 155, expenses: 92 },
  { month: "Jun", revenue: 170, expenses: 100 },
];

const projectStatusData = [
  { name: "On Track", value: 12, color: "#10b981" },
  { name: "At Risk", value: 3, color: "#f59e0b" },
  { name: "Delayed", value: 2, color: "#ef4444" },
  { name: "Completed", value: 8, color: "#3b82f6" },
];


const riskAlerts = [
  { id: 1, severity: "high", message: "Contract #4922 expiring in 5 days", dept: "Legal" },
  { id: 2, severity: "medium", message: "Project Alpha budget variance > 10%", dept: "Finance" },
  { id: 3, severity: "low", message: "3 Compliance trainings overdue", dept: "HR" },
];

const whatsappFeed = [
  { id: 1, user: "System", message: "Daily Financial Report generated.", time: "08:00 AM" },
  { id: 2, user: "Sarah (CFO)", message: "Approved Q3 budget variance.", time: "09:15 AM" },
  { id: 3, user: "Alert Bot", message: "High priority: Server load at 90%.", time: "10:30 AM" },
];

export default function ExecutiveDashboard() {
  const candidatesKey = useTenantQueryKey(['candidates']);

  // Fetch real candidate data
  const { data: candidates, isLoading: loadingCandidates } = useQuery({
    queryKey: candidatesKey,
    queryFn: candidateService.getAll,
    retry: 1,
  });

  // Calculate recruitment funnel metrics from real data
  // Using stage field as canonical source to avoid double-counting
  // Note: Total count is displayed in the stats card above, not in the funnel chart
  const recruitmentData = useMemo(() => {
    if (!candidates || candidates.length === 0) {
      return [
        { name: "Screening", value: 0 },
        { name: "Shortlisted", value: 0 },
        { name: "Interview", value: 0 },
        { name: "Offer", value: 0 },
        { name: "Hired", value: 0 },
      ];
    }

    const screening = candidates.filter(c => c.stage === "Screening").length;
    const shortlisted = candidates.filter(c => c.stage === "Shortlisted").length;
    const interview = candidates.filter(c => c.stage === "Interview").length;
    const offer = candidates.filter(c => c.stage === "Offer").length;
    const hired = candidates.filter(c => c.stage === "Hired").length;

    return [
      { name: "Screening", value: screening },
      { name: "Shortlisted", value: shortlisted },
      { name: "Interview", value: interview },
      { name: "Offer", value: offer },
      { name: "Hired", value: hired },
    ];
  }, [candidates]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      
      <main className="pt-24 pb-12 px-6 container mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
               <h1 className="text-3xl font-bold tracking-tight">Executive Overview</h1>
               <Badge variant="outline" className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30 text-xs flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  Live: DigitalOcean
               </Badge>
               <Badge variant="outline" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 text-xs">
                  Groq LLaMA 3.1 70B
               </Badge>
            </div>
            <p className="text-muted-foreground">Real-time enterprise intelligence & strategic insights</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="border-border dark:border-white/10">
              <Calendar className="w-4 h-4 mr-2" /> Q3 2025
            </Button>
            <Button variant="outline" className="border-border dark:border-white/10">
              <Download className="w-4 h-4 mr-2" /> Export Report
            </Button>
            <Button className="bg-green-600 hover:bg-green-500 text-white">
              <Smartphone className="w-4 h-4 mr-2" /> Connect WhatsApp
            </Button>
          </div>
        </div>

        {/* Top Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard 
            title="Total Revenue" 
            value="$4.2M" 
            trend="+12.5%" 
            trendUp={true} 
            icon={DollarSign} 
            color="text-primary" 
            chartData={[40, 35, 50, 45, 60, 55, 70]}
          />
          <StatsCard 
            title="Active Projects" 
            value="25" 
            trend="+3" 
            trendUp={true} 
            icon={Briefcase} 
            color="text-blue-600 dark:text-blue-400" 
            chartData={[20, 22, 21, 24, 23, 25, 25]}
          />
          <StatsCard 
            title="Total Candidates" 
            value={loadingCandidates ? "..." : String(candidates?.length || 0)} 
            trend={`${recruitmentData.find(d => d.name === "Shortlisted")?.value || 0} shortlisted`} 
            trendUp={true} 
            icon={Users} 
            color="text-blue-600 dark:text-blue-400" 
            chartData={[0, 0, 0, 0, 0, 0, candidates?.length || 0]}
          />
          <StatsCard 
            title="Critical Risks" 
            value="3" 
            trend="-2" 
            trendUp={true} // technically down is good for risk, but green means good here
            icon={AlertTriangle} 
            color="text-amber-600 dark:text-amber-400" 
            chartData={[8, 6, 5, 7, 4, 5, 3]}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          
          {/* Financial Chart - Large */}
          <Card className="lg:col-span-2 bg-card/20 border-border dark:border-white/10 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Financial Performance</CardTitle>
              <CardDescription>Revenue vs Expenses (YTD)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={financialData}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="month" stroke="#666" />
                    <YAxis stroke="#666" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1a1a1a', borderColor: 'rgba(255,255,255,0.1)' }} 
                      itemStyle={{ color: '#fff' }}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorRevenue)" />
                    <Area type="monotone" dataKey="expenses" stroke="#ef4444" fillOpacity={1} fill="url(#colorExpenses)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Project Status - Donut */}
          <Card className="bg-card/20 border-border dark:border-white/10 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Project Health</CardTitle>
              <CardDescription>Current portfolio status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[200px] w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={projectStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {projectStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="rgba(0,0,0,0)" />
                      ))}
                    </Pie>
                    <Tooltip 
                       contentStyle={{ backgroundColor: '#1a1a1a', borderColor: 'rgba(255,255,255,0.1)' }} 
                       itemStyle={{ color: '#fff' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center Text */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center">
                    <span className="text-3xl font-bold">25</span>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                {projectStatusData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span>{item.name}</span>
                    </div>
                    <span className="font-mono font-bold">{item.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          
          {/* Recruitment Funnel */}
          <Card className="bg-card/20 border-border dark:border-white/10 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Talent Pipeline
                {loadingCandidates && <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />}
              </CardTitle>
              <CardDescription>Real-time candidate funnel</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart layout="vertical" data={recruitmentData} margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" stroke="#888" width={90} />
                    <Tooltip 
                      cursor={{fill: 'rgba(255,255,255,0.05)'}}
                      contentStyle={{ backgroundColor: '#1a1a1a', borderColor: 'rgba(255,255,255,0.1)' }} 
                    />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Operational Risks */}
          <Card className="bg-card/20 border-border dark:border-white/10 backdrop-blur-sm">
             <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                Operational Risks
              </CardTitle>
              <CardDescription>Prioritized alerts & warnings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {riskAlerts.map((alert) => (
                  <div key={alert.id} className="p-3 rounded-lg bg-white/5 border border-border dark:border-white/5 flex items-start gap-3">
                    <div className={`w-2 h-2 mt-2 rounded-full shrink-0 ${
                      alert.severity === "high" ? "bg-red-500" : 
                      alert.severity === "medium" ? "bg-amber-500" : 
                      "bg-blue-500"
                    }`} />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{alert.message}</p>
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-xs text-muted-foreground">{alert.dept}</span>
                        <Button variant="link" size="sm" className="h-auto p-0 text-xs text-primary">Resolve</Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* WhatsApp Integration */}
          <Card className="bg-green-900/10 border-green-500/20 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2 text-green-600 dark:text-green-400">
                  <Smartphone className="w-5 h-5" />
                  Live WhatsApp Feed
                </CardTitle>
                <Badge variant="outline" className="border-green-500/50 text-green-600 dark:text-green-400 bg-green-500/10 animate-pulse">
                  ONLINE
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 mt-2">
                {whatsappFeed.map((msg) => (
                  <div key={msg.id} className="flex gap-3 text-sm">
                    <div className="w-8 h-8 rounded-full bg-green-800/50 flex items-center justify-center shrink-0 border border-green-500/30">
                      <span className="text-xs font-bold text-green-600 dark:text-green-400">{msg.user[0]}</span>
                    </div>
                    <div className="bg-card/50 p-2 rounded-lg rounded-tl-none border border-border dark:border-white/5 flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-xs text-green-300">{msg.user}</span>
                        <span className="text-[10px] text-muted-foreground">{msg.time}</span>
                      </div>
                      <p className="text-foreground/90 text-xs">{msg.message}</p>
                    </div>
                  </div>
                ))}
                
                <div className="pt-2">
                   <div className="relative">
                      <input 
                        type="text" 
                        placeholder="Type a message to exec group..." 
                        className="w-full bg-black/30 border border-green-500/30 rounded-full px-4 py-2 text-xs focus:outline-none focus:border-green-500"
                      />
                      <Button size="icon" className="absolute right-1 top-1 h-6 w-6 rounded-full bg-green-600 hover:bg-green-500">
                        <ArrowUpRight className="w-3 h-3" />
                      </Button>
                   </div>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
      </main>
    </div>
  );
}

// Small Component for the Top Stats
function StatsCard({ title, value, trend, trendUp, icon: Icon, color, chartData }: any) {
  return (
    <Card className="bg-card/20 border-border dark:border-white/10 backdrop-blur-sm overflow-hidden relative">
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">{title}</p>
            <h3 className="text-3xl font-bold tracking-tight">{value}</h3>
          </div>
          <div className={`p-2 rounded-lg bg-white/5 ${color}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
        
        <div className="flex items-end justify-between">
          <div className={`flex items-center gap-1 text-sm font-medium ${trendUp ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {trendUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {trend}
          </div>
          
          {/* Mini Sparkline */}
          <div className="w-24 h-10">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData.map((v: number, i: number) => ({ i, v }))}>
                <Line 
                  type="monotone" 
                  dataKey="v" 
                  stroke={trendUp ? "#4ade80" : "#f87171"} 
                  strokeWidth={2} 
                  dot={false} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}