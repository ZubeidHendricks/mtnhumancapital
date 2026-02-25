import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { candidateService, jobsService, api } from "@/lib/api";
import { useTenantQueryKey } from "@/hooks/useTenant";
import { CustomizableDashboard, DataSourceConfig } from "@/components/customizable-dashboard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  Legend
} from "recharts";
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  Briefcase, 
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Filter,
  Eye,
  Target,
  UserCheck
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

const monthlyData = [
  { month: "Jan", placements: 5, revenue: 100000, avgRevenue: 20000 },
  { month: "Feb", placements: 6, revenue: 150000, avgRevenue: 25000 },
  { month: "Mar", placements: 3, revenue: 90000, avgRevenue: 30000 },
  { month: "Apr", placements: 2, revenue: 40000, avgRevenue: 20000 },
  { month: "May", placements: 5, revenue: 112500, avgRevenue: 22500 },
  { month: "Jun", placements: 7, revenue: 245000, avgRevenue: 35000 },
  { month: "Jul", placements: 8, revenue: 240000, avgRevenue: 30000 },
  { month: "Aug", placements: 4, revenue: 140000, avgRevenue: 35000 },
  { month: "Sep", placements: 5, revenue: 125000, avgRevenue: 25000 },
  { month: "Oct", placements: 6, revenue: 156000, avgRevenue: 26000 },
  { month: "Nov", placements: 7, revenue: 196000, avgRevenue: 28000 },
  { month: "Dec", placements: 1, revenue: 28000, avgRevenue: 28000 },
];

const jobHealthData = [
  { name: "On Track", value: 90, color: "#10b981" },
  { name: "At Risk", value: 5, color: "#f59e0b" },
  { name: "Lost", value: 24, color: "#ef4444" },
  { name: "Completed", value: 24, color: "#3b82f6" },
];

const talentPipelineData = [
  { stage: "Screening", count: 200, color: "#0d9488" },
  { stage: "Shortlisted", count: 65, color: "#0891b2" },
  { stage: "Interview", count: 10, color: "#2563eb" },
  { stage: "Lost", count: 24, color: "#ef4444" },
  { stage: "Offer", count: 5, color: "#f59e0b" },
  { stage: "Hired", count: 2, color: "#10b981" },
];

const employerTypeData = [
  { name: "Tool & Machinery Retail", value: 18, color: "#0d9488" },
  { name: "Hardware Retail", value: 28, color: "#2563eb" },
  { name: "Tool Retail", value: 8, color: "#0891b2" },
  { name: "Machinery Retail", value: 6, color: "#1d4ed8" },
  { name: "Engineering Supply", value: 15, color: "#0e7490" },
  { name: "Industrial Supply", value: 12, color: "#047857" },
  { name: "Engineering Supplier", value: 9, color: "#1e40af" },
  { name: "Industrial Tools Distributor", value: 5, color: "#115e59" },
  { name: "Industrial Supplier", value: 7, color: "#166534" },
  { name: "Auto Spares Retail", value: 11, color: "#0369a1" },
  { name: "Auto Spares", value: 14, color: "#1e3a5f" },
  { name: "Auto Electrical", value: 6, color: "#065f46" },
  { name: "DIY Retail", value: 10, color: "#155e75" },
  { name: "Workshop/Repairs", value: 8, color: "#334155" },
  { name: "Machinery Repairs", value: 5, color: "#374151" },
  { name: "Repairs Center", value: 4, color: "#1f2937" },
  { name: "Retail Service", value: 9, color: "#0f766e" },
];

const fitScoreData = [
  { candidateId: "C1", score: 5 },
  { candidateId: "C2", score: 5 },
  { candidateId: "C3", score: 5 },
  { candidateId: "C4", score: 5 },
  { candidateId: "C5", score: 5 },
  { candidateId: "C6", score: 4 },
  { candidateId: "C7", score: 5 },
  { candidateId: "C8", score: 5 },
  { candidateId: "C9", score: 4 },
  { candidateId: "C10", score: 5 },
  { candidateId: "C11", score: 5 },
  { candidateId: "C12", score: 4 },
  { candidateId: "C13", score: 5 },
  { candidateId: "C14", score: 4 },
  { candidateId: "C15", score: 5 },
  { candidateId: "C16", score: 5 },
  { candidateId: "C17", score: 4 },
  { candidateId: "C18", score: 5 },
  { candidateId: "C19", score: 5 },
  { candidateId: "C20", score: 5 },
];

function useChartTheme() {
  const { actualTheme } = useTheme();
  const isDark = actualTheme === "dark";
  return {
    grid: isDark ? "#334155" : "#e2e8f0",
    axis: isDark ? "#94a3b8" : "#64748b",
    tooltipBg: isDark ? "#1e293b" : "#ffffff",
    tooltipBorder: isDark ? "#334155" : "#e2e8f0",
    tooltipText: isDark ? "#f1f5f9" : "#1e293b",
  };
}

export default function RecruitmentDashboard() {
  const [selectedModal, setSelectedModal] = useState<string | null>(null);
  const candidatesKey = useTenantQueryKey(['candidates']);
  const jobsKey = useTenantQueryKey(['jobs']);
  const chartTheme = useChartTheme();

  const { data: candidates, isLoading: loadingCandidates } = useQuery({
    queryKey: candidatesKey,
    queryFn: candidateService.getAll,
    retry: 1,
  });

  const { data: jobs, isLoading: loadingJobs } = useQuery({
    queryKey: jobsKey,
    queryFn: jobsService.getAll,
    retry: 1,
  });

  const livePipelineData = useMemo(() => {
    if (!candidates || candidates.length === 0) {
      return talentPipelineData;
    }

    const screening = candidates.filter(c => c.stage === "Screening").length;
    const shortlisted = candidates.filter(c => c.stage === "Shortlisted").length;
    const interview = candidates.filter(c => c.stage === "Interview").length;
    const lost = candidates.filter(c => c.stage === "Lost" || c.status === "Rejected").length;
    const offer = candidates.filter(c => c.stage === "Offer").length;
    const hired = candidates.filter(c => c.stage === "Hired").length;

    return [
      { stage: "Screening", count: screening, color: "#0d9488" },
      { stage: "Shortlisted", count: shortlisted, color: "#0891b2" },
      { stage: "Interview", count: interview, color: "#2563eb" },
      { stage: "Lost", count: lost, color: "#ef4444" },
      { stage: "Offer", count: offer, color: "#f59e0b" },
      { stage: "Hired", count: hired, color: "#10b981" },
    ];
  }, [candidates]);

  const totalPlacements = monthlyData.reduce((sum, m) => sum + m.placements, 0);
  const totalRevenue = monthlyData.reduce((sum, m) => sum + m.revenue, 0);
  const avgRevenuePerPlacement = totalRevenue / totalPlacements;

  const activeJobs = useMemo(() => 
    jobs?.filter(j => j.status === "Active") || [], 
    [jobs]
  );
  
  const totalCandidates = candidates?.length || 0;
  const totalShortlisted = candidates?.filter(c => c.stage === "Shortlisted").length || 0;
  const totalLost = candidates?.filter(c => c.stage === "Lost" || c.status === "Rejected").length || 0;
  const totalHired = candidates?.filter(c => c.stage === "Hired").length || 0;

  const dataSources: DataSourceConfig[] = [
    {
      key: "candidates",
      label: "Candidates",
      fields: [
        { value: "status", label: "Status", type: "categorical" },
        { value: "stage", label: "Stage", type: "categorical" },
        { value: "source", label: "Source", type: "categorical" },
        { value: "role", label: "Role", type: "categorical" },
        { value: "location", label: "Location", type: "categorical" },
        { value: "match", label: "Match Score", type: "numeric" },
      ]
    },
    {
      key: "jobs",
      label: "Jobs",
      fields: [
        { value: "status", label: "Status", type: "categorical" },
        { value: "department", label: "Department", type: "categorical" },
        { value: "location", label: "Location", type: "categorical" },
        { value: "employmentType", label: "Employment Type", type: "categorical" },
        { value: "salaryMin", label: "Minimum Salary (R)", type: "numeric" },
        { value: "salaryMax", label: "Maximum Salary (R)", type: "numeric" },
      ]
    },
    {
      key: "placements",
      label: "Placements & Revenue",
      fields: [
        { value: "month", label: "Month", type: "categorical" },
        { value: "placements", label: "Number of Placements", type: "numeric" },
        { value: "revenue", label: "Revenue (R)", type: "numeric" },
        { value: "avgRevenue", label: "Average Revenue per Placement (R)", type: "numeric" },
      ]
    }
  ];

  const placementsData = monthlyData;

  const getData = (sourceKey: string) => {
    switch (sourceKey) {
      case "candidates": return candidates || [];
      case "jobs": return jobs || [];
      case "placements": return placementsData;
      default: return [];
    }
  };

  const kpiCards = [
    { key: "revenue", label: "Total Revenue YTD", value: `R${(totalRevenue / 1000000).toFixed(2)}m`, icon: DollarSign, color: "text-foreground dark:text-foreground", bgGradient: "from-muted/10 to-background/5", borderColor: "border-border/20" },
    { key: "jobs", label: "Active Job Searches", value: loadingJobs ? "—" : String(activeJobs.length), icon: Briefcase, color: "text-foreground dark:text-foreground", bgGradient: "from-muted/10 to-background/5", borderColor: "border-border/20" },
    { key: "candidates", label: "Total Candidates", value: String(totalCandidates), icon: Users, color: "text-foreground dark:text-foreground", bgGradient: "from-muted/10 to-background/5", borderColor: "border-border/20" },
    { key: "shortlisted", label: "Total Shortlisted", value: String(totalShortlisted), icon: Target, color: "text-foreground dark:text-foreground", bgGradient: "from-muted/10 to-background/5", borderColor: "border-border/20" },
    { key: "placements", label: "Total Placements", value: String(totalHired), icon: UserCheck, color: "text-foreground", bgGradient: "from-muted/10 to-background/5", borderColor: "border-border/20" },
    { key: "lost", label: "Total Lost", value: String(totalLost), icon: XCircle, color: "text-destructive", bgGradient: "from-destructive/10 to-background/5", borderColor: "border-destructive/20" },
  ];

  return (
    <div className="min-h-screen bg-background text-gray-900">
      
      <main className="pt-24 pb-12 px-6 container mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
               <h1 className="text-3xl font-bold tracking-tight text-gray-900" data-testid="text-page-title">Recruitment Command Center</h1>
               <Badge variant="outline" className="bg-muted/10 text-foreground dark:text-foreground border-border/30 text-xs">
                  Live Data
               </Badge>
            </div>
            <p className="text-gray-500">Comprehensive recruitment performance metrics and pipeline analytics</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {kpiCards.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <Card 
                key={kpi.key}
                className={`bg-gradient-to-br ${kpi.bgGradient} ${kpi.borderColor} cursor-pointer hover:shadow-md transition-all duration-200`}
                onClick={() => setSelectedModal(kpi.key)}
                data-testid={`card-kpi-${kpi.key}`}
              >
                <CardHeader className="pb-2 pt-4 px-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs font-medium text-gray-500">{kpi.label}</CardTitle>
                    <Icon className={`h-4 w-4 ${kpi.color}`} />
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <TrendingUp className="h-5 w-5 text-foreground dark:text-foreground" />
                Monthly Placements & Revenue
              </CardTitle>
              <CardDescription>
                Year-over-year placement and revenue performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                  <XAxis dataKey="month" stroke={chartTheme.axis} fontSize={12} />
                  <YAxis yAxisId="left" stroke={chartTheme.axis} fontSize={12} />
                  <YAxis yAxisId="right" orientation="right" stroke={chartTheme.axis} fontSize={12} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: chartTheme.tooltipBg, border: `1px solid ${chartTheme.tooltipBorder}`, borderRadius: "8px", color: chartTheme.tooltipText }}
                    labelStyle={{ color: chartTheme.tooltipText }}
                  />
                  <Legend />
                  <Line 
                    yAxisId="left" 
                    type="monotone" 
                    dataKey="placements" 
                    stroke="#0d9488"
                    strokeWidth={2} 
                    name="Placements"
                    dot={{ fill: "#0d9488", r: 4 }}
                  />
                  <Line 
                    yAxisId="right" 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#2563eb"
                    strokeWidth={2} 
                    name="Revenue (R)"
                    dot={{ fill: "#2563eb", r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <Filter className="h-5 w-5 text-foreground dark:text-foreground" />
                Job Search Health
              </CardTitle>
              <CardDescription>
                Distribution of job search statuses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={jobHealthData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    labelLine={false}
                    label={({ name, value, percent }) => `${name}: ${value}`}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {jobHealthData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: chartTheme.tooltipBg, border: `1px solid ${chartTheme.tooltipBorder}`, borderRadius: "8px", color: chartTheme.tooltipText }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-muted/10 to-background/5 border-border/20">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">On Track</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{jobHealthData[0].value}</div>
              <p className="text-xs text-gray-500 mt-1">Jobs progressing well</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-muted/10 to-background/5 border-border/20">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">At Risk</CardTitle>
                <AlertTriangle className="h-4 w-4 text-foreground dark:text-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground dark:text-foreground">{jobHealthData[1].value}</div>
              <p className="text-xs text-gray-500 mt-1">Require attention</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-destructive/10 to-background/5 border-destructive/20">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">Lost</CardTitle>
                <XCircle className="h-4 w-4 text-destructive" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-destructive">{jobHealthData[2].value}</div>
              <p className="text-xs text-gray-500 mt-1">Opportunities missed</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-muted/10 to-background/5 border-border/20">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">Completed</CardTitle>
                <Briefcase className="h-4 w-4 text-foreground dark:text-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground dark:text-foreground">{jobHealthData[3].value}</div>
              <p className="text-xs text-gray-500 mt-1">Successfully filled</p>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-card border-border mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <Users className="h-5 w-5 text-foreground dark:text-foreground" />
              Talent Pipeline (Live Data)
            </CardTitle>
            <CardDescription>
              Real-time candidate distribution across recruitment stages
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={livePipelineData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                <XAxis type="number" stroke={chartTheme.axis} fontSize={12} />
                <YAxis type="category" dataKey="stage" stroke={chartTheme.axis} width={100} fontSize={12} />
                <Tooltip 
                  contentStyle={{ backgroundColor: chartTheme.tooltipBg, border: `1px solid ${chartTheme.tooltipBorder}`, borderRadius: "8px", color: chartTheme.tooltipText }}
                  labelStyle={{ color: chartTheme.tooltipText }}
                />
                <Bar dataKey="count" radius={[0, 8, 8, 0]}>
                  {livePipelineData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-gray-900">Employer Type Share</CardTitle>
              <CardDescription>Distribution of placements by industry sector</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={employerTypeData}
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {employerTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: chartTheme.tooltipBg, border: `1px solid ${chartTheme.tooltipBorder}`, borderRadius: "8px", color: chartTheme.tooltipText }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-gray-900">Fit Scores</CardTitle>
              <CardDescription>
                Candidate suitability ratings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={fitScoreData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                  <XAxis dataKey="candidateId" stroke={chartTheme.axis} fontSize={11} />
                  <YAxis domain={[0, 6]} stroke={chartTheme.axis} fontSize={12} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: chartTheme.tooltipBg, border: `1px solid ${chartTheme.tooltipBorder}`, borderRadius: "8px", color: chartTheme.tooltipText }}
                    labelStyle={{ color: chartTheme.tooltipText }}
                  />
                  <Bar dataKey="score" fill="#0d9488" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div className="mb-8">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-xl text-gray-900">Custom Analytics</CardTitle>
              <CardDescription>
                Build your own charts by selecting data sources and fields
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CustomizableDashboard
                dataSources={dataSources}
                getData={getData}
                storageKey="recruitment-dashboard-charts"
                columns={2}
              />
            </CardContent>
          </Card>
        </div>
      </main>

      <Dialog open={selectedModal === 'revenue'} onOpenChange={() => setSelectedModal(null)}>
        <DialogContent className="bg-card border-border max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Revenue Details</DialogTitle>
            <DialogDescription>
              Monthly revenue breakdown
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-sm font-semibold border-b border-border pb-2 text-gray-700">
              <div>Month</div>
              <div>Placements</div>
              <div>Revenue</div>
            </div>
            {monthlyData.map((month) => (
              <div key={month.month} className="grid grid-cols-3 gap-4 text-sm text-gray-600">
                <div>{month.month}</div>
                <div>{month.placements}</div>
                <div>R{(month.revenue / 1000).toFixed(0)}k</div>
              </div>
            ))}
            <div className="pt-4 border-t border-border font-bold text-gray-900">
              <div className="grid grid-cols-3 gap-4">
                <div>Total</div>
                <div>{totalPlacements}</div>
                <div>R{(totalRevenue / 1000000).toFixed(2)}m</div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={selectedModal === 'jobs'} onOpenChange={() => setSelectedModal(null)}>
        <DialogContent className="bg-card border-border max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Active Job Searches</DialogTitle>
            <DialogDescription>
              {activeJobs.length} active job openings
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {activeJobs.length > 0 ? (
              activeJobs.map((job) => (
                <div key={job.id} className="p-4 bg-muted/50 rounded-lg border border-border">
                  <h3 className="font-semibold text-lg text-gray-900">{job.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">{job.location || 'Location not specified'}</p>
                  <p className="text-sm text-gray-500">{job.department} &bull; {job.status}</p>
                  {job.description && (
                    <p className="text-sm mt-2 text-gray-600 line-clamp-2">{job.description}</p>
                  )}
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-8">No active jobs found</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={selectedModal === 'candidates'} onOpenChange={() => setSelectedModal(null)}>
        <DialogContent className="bg-card border-border max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-gray-900">All Candidates</DialogTitle>
            <DialogDescription>
              {totalCandidates} candidates in the system
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {candidates && candidates.length > 0 ? (
              candidates.map((candidate) => (
                <div key={candidate.id} className="p-4 bg-muted/50 rounded-lg border border-border">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{candidate.fullName}</h3>
                      <p className="text-sm text-gray-500">{candidate.email}</p>
                      {candidate.phone && <p className="text-sm text-gray-500">{candidate.phone}</p>}
                      {candidate.role && <p className="text-sm text-gray-500 mt-1">{candidate.role}</p>}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <Badge className="bg-muted/15 text-foreground dark:text-foreground border-border/20">{candidate.stage}</Badge>
                        <p className="text-xs text-gray-500 mt-1">{candidate.status}</p>
                      </div>
                      <Link href={`/candidates/${candidate.id}`}>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="gap-1"
                          data-testid={`button-view-profile-${candidate.id}`}
                        >
                          <Eye className="w-4 h-4" />
                          View
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-8">No candidates found</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={selectedModal === 'shortlisted'} onOpenChange={() => setSelectedModal(null)}>
        <DialogContent className="bg-card border-border max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Shortlisted Candidates</DialogTitle>
            <DialogDescription>
              {totalShortlisted} candidates in shortlist stage
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {candidates?.filter(c => c.stage === "Shortlisted").map((candidate) => (
              <div key={candidate.id} className="p-4 bg-muted/50 rounded-lg border border-border">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{candidate.fullName}</h3>
                    <p className="text-sm text-gray-500">{candidate.email}</p>
                    {candidate.phone && <p className="text-sm text-gray-500">{candidate.phone}</p>}
                    {candidate.role && <p className="text-sm text-gray-500 mt-1">{candidate.role}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className="bg-muted/15 text-foreground dark:text-foreground border-border/20">{candidate.status}</Badge>
                    <Link href={`/candidates/${candidate.id}`}>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="gap-1"
                        data-testid={`button-view-shortlisted-${candidate.id}`}
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
            {totalShortlisted === 0 && (
              <p className="text-gray-500 text-center py-8">No shortlisted candidates</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={selectedModal === 'placements'} onOpenChange={() => setSelectedModal(null)}>
        <DialogContent className="bg-card border-border max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Successful Placements</DialogTitle>
            <DialogDescription>
              {totalHired} candidates successfully hired
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {candidates?.filter(c => c.stage === "Hired").map((candidate) => (
              <div key={candidate.id} className="p-4 bg-muted/50 rounded-lg border border-border">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{candidate.fullName}</h3>
                    <p className="text-sm text-gray-500">{candidate.email}</p>
                    {candidate.role && <p className="text-sm text-gray-500 mt-1">{candidate.role}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className="bg-muted/15 text-foreground border-border/20">Hired</Badge>
                    <Link href={`/candidates/${candidate.id}`}>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="gap-1"
                        data-testid={`button-view-hired-${candidate.id}`}
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
            {totalHired === 0 && (
              <p className="text-gray-500 text-center py-8">No placements yet</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={selectedModal === 'lost'} onOpenChange={() => setSelectedModal(null)}>
        <DialogContent className="bg-card border-border max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Lost Candidates</DialogTitle>
            <DialogDescription>
              {totalLost} candidates marked as lost or rejected
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {candidates?.filter(c => c.stage === "Lost" || c.status === "Rejected").map((candidate) => (
              <div key={candidate.id} className="p-4 bg-muted/50 rounded-lg border border-border">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{candidate.fullName}</h3>
                    <p className="text-sm text-gray-500">{candidate.email}</p>
                    {candidate.role && <p className="text-sm text-gray-500 mt-1">{candidate.role}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <Badge className="bg-destructive/15 text-destructive border-destructive/20">{candidate.stage}</Badge>
                      <p className="text-xs text-gray-500 mt-1">{candidate.status}</p>
                    </div>
                    <Link href={`/candidates/${candidate.id}`}>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="gap-1"
                        data-testid={`button-view-lost-${candidate.id}`}
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
            {totalLost === 0 && (
              <p className="text-gray-500 text-center py-8">No lost candidates</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
