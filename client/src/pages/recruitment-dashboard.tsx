import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { candidateService, jobsService } from "@/lib/api";
import { useTenantQueryKey } from "@/hooks/useTenant";
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
  Eye
} from "lucide-react";

// Data from Vianna's Excel file
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
  { stage: "Screening", count: 200, color: "#0c5f7a" },
  { stage: "Shortlisted", count: 65, color: "#0c5f7a" },
  { stage: "Interview", count: 10, color: "#0c5f7a" },
  { stage: "Lost", count: 24, color: "#0c5f7a" },
  { stage: "Offer", count: 5, color: "#0c5f7a" },
  { stage: "Hired", count: 2, color: "#0c5f7a" },
];

const employerTypeData = [
  { name: "Tool & Machinery Retail", value: 18, color: "#1e3a5f" },
  { name: "Hardware Retail", value: 28, color: "#c75d2f" },
  { name: "Tool Retail", value: 8, color: "#2d5f3b" },
  { name: "Machinery Retail", value: 6, color: "#4a90a4" },
  { name: "Engineering Supply", value: 15, color: "#8b4789" },
  { name: "Industrial Supply", value: 12, color: "#3d6b3d" },
  { name: "Engineering Supplier", value: 9, color: "#d17a3f" },
  { name: "Industrial Tools Distributor", value: 5, color: "#2e6b6f" },
  { name: "Industrial Supplier", value: 7, color: "#5a8c5a" },
  { name: "Auto Spares Retail", value: 11, color: "#1f4f5f" },
  { name: "Auto Spares", value: 14, color: "#a64d79" },
  { name: "Auto Electrical", value: 6, color: "#4d7f4d" },
  { name: "DIY Retail", value: 10, color: "#c47f5f" },
  { name: "Workshop/Repairs", value: 8, color: "#e8b4b8" },
  { name: "Machinery Repairs", value: 5, color: "#a8c8d8" },
  { name: "Repairs Center", value: 4, color: "#d4a4d4" },
  { name: "Retail Service", value: 9, color: "#c4b4c8" },
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

export default function RecruitmentDashboard() {
  const [selectedModal, setSelectedModal] = useState<string | null>(null);
  const candidatesKey = useTenantQueryKey(['candidates']);
  const jobsKey = useTenantQueryKey(['jobs']);

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

  // Calculate real-time pipeline metrics from candidate data
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
      { stage: "Screening", count: screening, color: "#0c5f7a" },
      { stage: "Shortlisted", count: shortlisted, color: "#0c5f7a" },
      { stage: "Interview", count: interview, color: "#0c5f7a" },
      { stage: "Lost", count: lost, color: "#0c5f7a" },
      { stage: "Offer", count: offer, color: "#0c5f7a" },
      { stage: "Hired", count: hired, color: "#0c5f7a" },
    ];
  }, [candidates]);

  const totalPlacements = monthlyData.reduce((sum, m) => sum + m.placements, 0);
  const totalRevenue = monthlyData.reduce((sum, m) => sum + m.revenue, 0);
  const avgRevenuePerPlacement = totalRevenue / totalPlacements;

  // Filter active jobs only
  const activeJobs = useMemo(() => 
    jobs?.filter(j => j.status === "Active") || [], 
    [jobs]
  );
  
  // Calculate metrics from live data
  const totalCandidates = candidates?.length || 0;
  const totalShortlisted = candidates?.filter(c => c.stage === "Shortlisted").length || 0;
  const totalLost = candidates?.filter(c => c.stage === "Lost" || c.status === "Rejected").length || 0;
  const totalHired = candidates?.filter(c => c.stage === "Hired").length || 0;

  return (
    <div className="min-h-screen bg-black text-white">
      
      <main className="pt-24 pb-12 px-6 container mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
               <h1 className="text-3xl font-bold tracking-tight">Recruitment Dashboard</h1>
               <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/30 text-xs">
                  Live Data
               </Badge>
            </div>
            <p className="text-gray-400">Comprehensive recruitment performance metrics and pipeline analytics</p>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <Card 
            className="bg-[#0c5f7a] border-none cursor-pointer hover:bg-[#0d6f8f] transition-colors" 
            onClick={() => setSelectedModal('revenue')}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-normal text-white/80">Total Revenue YTD</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">R{(totalRevenue / 1000000).toFixed(2)}m</div>
            </CardContent>
          </Card>

          <Card 
            className="bg-[#0c5f7a] border-none cursor-pointer hover:bg-[#0d6f8f] transition-colors"
            onClick={() => setSelectedModal('jobs')}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-normal text-white/80">Active Job Searches</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {loadingJobs ? "—" : activeJobs.length}
              </div>
            </CardContent>
          </Card>

          <Card 
            className="bg-[#0c5f7a] border-none cursor-pointer hover:bg-[#0d6f8f] transition-colors"
            onClick={() => setSelectedModal('candidates')}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-normal text-white/80">Total Candidates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{totalCandidates}</div>
            </CardContent>
          </Card>

          <Card 
            className="bg-[#0c5f7a] border-none cursor-pointer hover:bg-[#0d6f8f] transition-colors"
            onClick={() => setSelectedModal('shortlisted')}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-normal text-white/80">Total Shortlisted</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{totalShortlisted}</div>
            </CardContent>
          </Card>

          <Card 
            className="bg-[#0c5f7a] border-none cursor-pointer hover:bg-[#0d6f8f] transition-colors"
            onClick={() => setSelectedModal('placements')}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-normal text-white/80">Total Placements</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{totalHired}</div>
            </CardContent>
          </Card>

          <Card 
            className="bg-[#0c5f7a] border-none cursor-pointer hover:bg-[#0d6f8f] transition-colors"
            onClick={() => setSelectedModal('lost')}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-normal text-white/80">Total Lost</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{totalLost}</div>
            </CardContent>
          </Card>
        </div>

        {/* Vianna's Graphs - Monthly Revenue & Placements Trend */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card className="bg-black/40 border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-purple-400" />
                Monthly Placements & Revenue
              </CardTitle>
              <CardDescription className="text-gray-400">
                Year-over-year placement and revenue performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="month" stroke="#888" />
                  <YAxis yAxisId="left" stroke="#888" />
                  <YAxis yAxisId="right" orientation="right" stroke="#888" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#111", border: "1px solid #333", borderRadius: "8px" }}
                    labelStyle={{ color: "#fff" }}
                  />
                  <Legend />
                  <Line 
                    yAxisId="left" 
                    type="monotone" 
                    dataKey="placements" 
                    stroke="#a855f7" 
                    strokeWidth={2} 
                    name="Placements"
                    dot={{ fill: "#a855f7", r: 4 }}
                  />
                  <Line 
                    yAxisId="right" 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#10b981" 
                    strokeWidth={2} 
                    name="Revenue (R)"
                    dot={{ fill: "#10b981", r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-black/40 border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-blue-400" />
                Job Search Health
              </CardTitle>
              <CardDescription className="text-gray-400">
                Distribution of job search statuses (illustrative data)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={jobHealthData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {jobHealthData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#111", border: "1px solid #333", borderRadius: "8px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Talent Pipeline Funnel */}
        <Card className="bg-black/40 border-white/10 mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-cyan-400" />
              Talent Pipeline (Live Data)
            </CardTitle>
            <CardDescription className="text-gray-400">
              Real-time candidate distribution across recruitment stages
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={livePipelineData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis type="number" stroke="#888" />
                <YAxis type="category" dataKey="stage" stroke="#888" width={100} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#111", border: "1px solid #333", borderRadius: "8px" }}
                  labelStyle={{ color: "#fff" }}
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

        {/* Job Health Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-300">On Track</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-400">{jobHealthData[0].value}</div>
              <p className="text-xs text-gray-500 mt-1">Jobs progressing well</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-300">At Risk</CardTitle>
                <AlertTriangle className="h-4 w-4 text-amber-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-400">{jobHealthData[1].value}</div>
              <p className="text-xs text-gray-500 mt-1">Require attention</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/20">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-300">Lost</CardTitle>
                <XCircle className="h-4 w-4 text-red-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-400">{jobHealthData[2].value}</div>
              <p className="text-xs text-gray-500 mt-1">Opportunities missed</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-300">Completed</CardTitle>
                <Briefcase className="h-4 w-4 text-blue-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-400">{jobHealthData[3].value}</div>
              <p className="text-xs text-gray-500 mt-1">Successfully filled</p>
            </CardContent>
          </Card>
        </div>

        {/* Additional Analytics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
          {/* Employer Type Share */}
          <Card className="bg-black/40 border-white/10">
            <CardHeader>
              <CardTitle>Employer Type Share</CardTitle>
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
                  >
                    {employerTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#111", border: "1px solid #333", borderRadius: "8px" }}
                  />
                  <Legend 
                    layout="vertical" 
                    align="right" 
                    verticalAlign="middle"
                    wrapperStyle={{ fontSize: "10px", maxHeight: "350px", overflowY: "auto" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Fit Scores */}
          <Card className="bg-black/40 border-white/10">
            <CardHeader>
              <CardTitle>Fit Scores</CardTitle>
              <CardDescription className="text-gray-400">
                Candidate suitability ratings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={fitScoreData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="candidateId" stroke="#888" />
                  <YAxis domain={[0, 6]} stroke="#888" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#111", border: "1px solid #333", borderRadius: "8px" }}
                    labelStyle={{ color: "#fff" }}
                  />
                  <Bar dataKey="score" fill="#0c5f7a" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Modals for detailed views */}
      <Dialog open={selectedModal === 'revenue'} onOpenChange={() => setSelectedModal(null)}>
        <DialogContent className="bg-black border-white/10 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>Revenue Details</DialogTitle>
            <DialogDescription className="text-gray-400">
              Monthly revenue breakdown
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-sm font-semibold border-b border-white/10 pb-2">
              <div>Month</div>
              <div>Placements</div>
              <div>Revenue</div>
            </div>
            {monthlyData.map((month) => (
              <div key={month.month} className="grid grid-cols-3 gap-4 text-sm">
                <div>{month.month}</div>
                <div>{month.placements}</div>
                <div>R{(month.revenue / 1000).toFixed(0)}k</div>
              </div>
            ))}
            <div className="pt-4 border-t border-white/10 font-bold">
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
        <DialogContent className="bg-black border-white/10 text-white max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Active Job Searches</DialogTitle>
            <DialogDescription className="text-gray-400">
              {activeJobs.length} active job openings
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {activeJobs.length > 0 ? (
              activeJobs.map((job) => (
                <div key={job.id} className="p-4 bg-white/5 rounded-lg border border-white/10">
                  <h3 className="font-semibold text-lg">{job.title}</h3>
                  <p className="text-sm text-gray-400 mt-1">{job.location || 'Location not specified'}</p>
                  <p className="text-sm text-gray-400">{job.department} • {job.status}</p>
                  {job.description && (
                    <p className="text-sm mt-2 line-clamp-2">{job.description}</p>
                  )}
                </div>
              ))
            ) : (
              <p className="text-gray-400 text-center py-8">No active jobs found</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={selectedModal === 'candidates'} onOpenChange={() => setSelectedModal(null)}>
        <DialogContent className="bg-black border-white/10 text-white max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>All Candidates</DialogTitle>
            <DialogDescription className="text-gray-400">
              {totalCandidates} candidates in the system
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {candidates && candidates.length > 0 ? (
              candidates.map((candidate) => (
                <div key={candidate.id} className="p-4 bg-white/5 rounded-lg border border-white/10">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold">{candidate.fullName}</h3>
                      <p className="text-sm text-gray-400">{candidate.email}</p>
                      {candidate.phone && <p className="text-sm text-gray-400">{candidate.phone}</p>}
                      {candidate.role && <p className="text-sm text-gray-500 mt-1">{candidate.role}</p>}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <Badge className="bg-purple-500/20 text-purple-300">{candidate.stage}</Badge>
                        <p className="text-xs text-gray-500 mt-1">{candidate.status}</p>
                      </div>
                      <Link href={`/candidates/${candidate.id}`}>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="gap-1 border-white/20 hover:bg-white/10"
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
              <p className="text-gray-400 text-center py-8">No candidates found</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={selectedModal === 'shortlisted'} onOpenChange={() => setSelectedModal(null)}>
        <DialogContent className="bg-black border-white/10 text-white max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Shortlisted Candidates</DialogTitle>
            <DialogDescription className="text-gray-400">
              {totalShortlisted} candidates in shortlist stage
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {candidates?.filter(c => c.stage === "Shortlisted").map((candidate) => (
              <div key={candidate.id} className="p-4 bg-white/5 rounded-lg border border-white/10">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-semibold">{candidate.fullName}</h3>
                    <p className="text-sm text-gray-400">{candidate.email}</p>
                    {candidate.phone && <p className="text-sm text-gray-400">{candidate.phone}</p>}
                    {candidate.role && <p className="text-sm text-gray-500 mt-1">{candidate.role}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className="bg-blue-500/20 text-blue-300">{candidate.status}</Badge>
                    <Link href={`/candidates/${candidate.id}`}>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="gap-1 border-white/20 hover:bg-white/10"
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
              <p className="text-gray-400 text-center py-8">No shortlisted candidates</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={selectedModal === 'placements'} onOpenChange={() => setSelectedModal(null)}>
        <DialogContent className="bg-black border-white/10 text-white max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Successful Placements</DialogTitle>
            <DialogDescription className="text-gray-400">
              {totalHired} candidates successfully hired
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {candidates?.filter(c => c.stage === "Hired").map((candidate) => (
              <div key={candidate.id} className="p-4 bg-white/5 rounded-lg border border-white/10">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-semibold">{candidate.fullName}</h3>
                    <p className="text-sm text-gray-400">{candidate.email}</p>
                    {candidate.role && <p className="text-sm text-gray-500 mt-1">{candidate.role}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className="bg-green-500/20 text-green-300">Hired</Badge>
                    <Link href={`/candidates/${candidate.id}`}>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="gap-1 border-white/20 hover:bg-white/10"
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
              <p className="text-gray-400 text-center py-8">No placements yet</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={selectedModal === 'lost'} onOpenChange={() => setSelectedModal(null)}>
        <DialogContent className="bg-black border-white/10 text-white max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Lost Candidates</DialogTitle>
            <DialogDescription className="text-gray-400">
              {totalLost} candidates marked as lost or rejected
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {candidates?.filter(c => c.stage === "Lost" || c.status === "Rejected").map((candidate) => (
              <div key={candidate.id} className="p-4 bg-white/5 rounded-lg border border-white/10">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-semibold">{candidate.fullName}</h3>
                    <p className="text-sm text-gray-400">{candidate.email}</p>
                    {candidate.role && <p className="text-sm text-gray-500 mt-1">{candidate.role}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <Badge className="bg-red-500/20 text-red-300">{candidate.stage}</Badge>
                      <p className="text-xs text-gray-500 mt-1">{candidate.status}</p>
                    </div>
                    <Link href={`/candidates/${candidate.id}`}>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="gap-1 border-white/20 hover:bg-white/10"
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
              <p className="text-gray-400 text-center py-8">No lost candidates</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
