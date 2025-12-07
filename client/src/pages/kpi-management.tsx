import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { useTenantQueryKey } from "@/hooks/useTenant";
import { Navbar } from "@/components/layout/navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import {
  Search, Plus, Target, FileText, Users, Calendar, Edit2, Trash2,
  Download, CheckCircle, Clock, AlertCircle, ChevronRight, BarChart3,
  MessageSquare, Star, User, Loader2, Send, Eye, Database, Link
} from "lucide-react";
import { api } from "@/lib/api";
import { format } from "date-fns";
import { DataSourceForm } from "@/components/data-source-form";
import type { KpiTemplate, ReviewCycle, KpiAssignment, ReviewSubmission, Employee } from "@shared/schema";

const CATEGORIES = [
  "Performance",
  "Leadership",
  "Communication",
  "Technical",
  "Teamwork",
  "Innovation",
  "Customer Focus",
  "Quality",
  "Productivity"
];

export default function KpiManagement() {
  const [location, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("templates");
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showCycleDialog, setShowCycleDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<KpiTemplate | null>(null);
  const [editingCycle, setEditingCycle] = useState<ReviewCycle | null>(null);
  const [selectedCycle, setSelectedCycle] = useState<string>("all");
  const [selectedSubmission, setSelectedSubmission] = useState<ReviewSubmission | null>(null);
  
  const queryClient = useQueryClient();

  // Parse URL query params on mount
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const tab = searchParams.get('tab');
    const action = searchParams.get('action');
    
    if (tab) {
      setActiveTab(tab);
    }
    if (action === 'new-cycle') {
      setShowCycleDialog(true);
      setEditingCycle(null);
    }
    if (action === 'new-template') {
      setShowTemplateDialog(true);
      setEditingTemplate(null);
    }
    if (action === 'assign') {
      setShowAssignDialog(true);
    }
    
    // Clear URL params after applying
    if (tab || action) {
      navigate('/kpi-management', { replace: true });
    }
  }, []);
  
  const templatesKey = useTenantQueryKey(["kpi-templates"]);
  const cyclesKey = useTenantQueryKey(["review-cycles"]);
  const assignmentsKey = useTenantQueryKey(["kpi-assignments"]);
  const submissionsKey = useTenantQueryKey(["review-submissions"]);
  const employeesKey = useTenantQueryKey(["workforce-employees"]);

  const { data: templates = [], isLoading: templatesLoading } = useQuery<KpiTemplate[]>({
    queryKey: templatesKey,
    queryFn: async () => {
      const response = await api.get("/kpi-templates");
      return response.data;
    },
  });

  const { data: cycles = [], isLoading: cyclesLoading } = useQuery<ReviewCycle[]>({
    queryKey: cyclesKey,
    queryFn: async () => {
      const response = await api.get("/review-cycles");
      return response.data;
    },
  });

  const { data: assignments = [] } = useQuery<KpiAssignment[]>({
    queryKey: [...assignmentsKey, selectedCycle],
    queryFn: async () => {
      const params = selectedCycle && selectedCycle !== "all" ? `?reviewCycleId=${selectedCycle}` : '';
      const response = await api.get(`/kpi-assignments${params}`);
      return response.data;
    },
    enabled: activeTab === "assignments"
  });

  const { data: submissions = [] } = useQuery<ReviewSubmission[]>({
    queryKey: [...submissionsKey, selectedCycle],
    queryFn: async () => {
      const params = selectedCycle && selectedCycle !== "all" ? `?reviewCycleId=${selectedCycle}` : '';
      const response = await api.get(`/review-submissions${params}`);
      return response.data;
    },
    enabled: activeTab === "reviews"
  });

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: employeesKey,
    queryFn: async () => {
      const response = await api.get("/workforce/employees");
      return response.data;
    },
  });

  const createTemplateMutation = useMutation({
    mutationFn: async ({ templateData, assignmentData }: { 
      templateData: Partial<KpiTemplate>; 
      assignmentData?: { reviewCycleId: string; employeeIds: string[] } 
    }) => {
      let template;
      if (editingTemplate) {
        const response = await api.patch(`/kpi-templates/${editingTemplate.id}`, templateData);
        template = response.data;
      } else {
        const response = await api.post("/kpi-templates", templateData);
        template = response.data;
      }
      
      // If assignment data is provided, create assignments for each employee
      if (assignmentData && assignmentData.reviewCycleId && assignmentData.employeeIds.length > 0) {
        const assignments = assignmentData.employeeIds.map(employeeId => ({
          reviewCycleId: assignmentData.reviewCycleId,
          kpiTemplateId: template.id,
          employeeId,
          customTarget: templateData.targetValue || null,
          status: 'pending'
        }));
        await api.post("/kpi-assignments/batch", { assignments });
      }
      
      return template;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templatesKey });
      queryClient.invalidateQueries({ queryKey: assignmentsKey });
      setShowTemplateDialog(false);
      setEditingTemplate(null);
    }
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/kpi-templates/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: templatesKey })
  });

  const createCycleMutation = useMutation({
    mutationFn: async (data: Partial<ReviewCycle>) => {
      if (editingCycle) {
        return api.patch(`/review-cycles/${editingCycle.id}`, data);
      }
      return api.post("/review-cycles", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cyclesKey });
      setShowCycleDialog(false);
      setEditingCycle(null);
    }
  });

  const deleteCycleMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/review-cycles/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: cyclesKey })
  });

  const sendWhatsAppNotification = useMutation({
    mutationFn: async ({ submissionId, type }: { submissionId: string; type: string }) => {
      return api.post(`/review-submissions/${submissionId}/send-whatsapp-notification`, { type });
    },
  });

  const filteredTemplates = templates.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: any }> = {
      draft: { variant: "secondary", icon: Clock },
      active: { variant: "default", icon: CheckCircle },
      self_assessment: { variant: "default", icon: User },
      manager_review: { variant: "default", icon: Users },
      completed: { variant: "outline", icon: CheckCircle },
      archived: { variant: "destructive", icon: AlertCircle },
    };
    const { variant, icon: Icon } = config[status] || { variant: "secondary", icon: Clock };
    return (
      <Badge variant={variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {status.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2" data-testid="page-title">
              <Target className="h-7 w-7 text-blue-500" />
              KPI Management
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Create KPIs, manage review cycles, and track employee performance
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search KPIs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-64 bg-gray-800/50 border-gray-700 text-white"
                data-testid="input-search"
              />
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-gray-800/50 border border-gray-700">
            <TabsTrigger value="templates" className="data-[state=active]:bg-blue-600" data-testid="tab-templates">
              <FileText className="h-4 w-4 mr-2" />
              KPI Templates
            </TabsTrigger>
            <TabsTrigger value="cycles" className="data-[state=active]:bg-blue-600" data-testid="tab-cycles">
              <Calendar className="h-4 w-4 mr-2" />
              Review Cycles
            </TabsTrigger>
            <TabsTrigger value="assignments" className="data-[state=active]:bg-blue-600" data-testid="tab-assignments">
              <Users className="h-4 w-4 mr-2" />
              Assignments
            </TabsTrigger>
            <TabsTrigger value="reviews" className="data-[state=active]:bg-blue-600" data-testid="tab-reviews">
              <BarChart3 className="h-4 w-4 mr-2" />
              Reviews
            </TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-white">KPI Templates</h2>
              <Button 
                onClick={() => { setEditingTemplate(null); setShowTemplateDialog(true); }}
                className="gap-2"
                data-testid="button-create-template"
              >
                <Plus className="h-4 w-4" />
                Create Template
              </Button>
            </div>

            {templatesLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              </div>
            ) : filteredTemplates.length === 0 ? (
              <Card className="bg-gray-800/50 border-gray-700">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Target className="h-12 w-12 text-gray-500 mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">No KPI Templates</h3>
                  <p className="text-gray-400 text-center mb-4">
                    Create KPI templates to define performance metrics for employees.
                  </p>
                  <Button onClick={() => setShowTemplateDialog(true)} data-testid="button-create-first-template">
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Template
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredTemplates.map((template) => {
                  const ownerDisplay = template.ownerType === "department" 
                    ? template.ownerDepartment || "Not assigned"
                      : template.ownerDivision || "Not assigned";
                  return (
                  <Card key={template.id} className="bg-gray-800/50 border-gray-700 hover:border-blue-500/50 transition-colors" data-testid={`card-template-${template.id}`}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-white text-base">{template.name}</CardTitle>
                          <CardDescription className="text-gray-400 mt-1 line-clamp-2">
                            {template.description || "No description"}
                          </CardDescription>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {template.category}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-2 text-sm text-gray-400 mb-3">
                        <div className="flex items-center gap-1">
                          <span className="text-gray-500">Weight:</span>
                          <span className="text-white">{template.weight}%</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-gray-500">Target:</span>
                          <span className="text-white">{template.targetValue}</span>
                          {template.targetTimePeriod && (
                            <span className="text-gray-500">/ {template.targetTimePeriod}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-gray-500">Frequency:</span>
                          <span className="text-white capitalize">{template.frequency || "Quarterly"}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-gray-500">Data:</span>
                          <span className="text-white truncate">{template.dataSource || "Not set"}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-gray-400 mb-3">
                        <User className="h-3 w-3 text-gray-500" />
                        <span className="text-gray-500">Owner:</span>
                        <span className="text-white">{ownerDisplay}</span>
                        {template.ownerType && (
                          <Badge variant="secondary" className="text-xs ml-1 capitalize">{template.ownerType}</Badge>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => { setEditingTemplate(template); setShowTemplateDialog(true); }}
                          data-testid={`button-edit-template-${template.id}`}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-400 hover:text-red-300"
                          onClick={() => deleteTemplateMutation.mutate(template.id)}
                          data-testid={`button-delete-template-${template.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="cycles" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-white">Review Cycles</h2>
              <Button 
                onClick={() => { setEditingCycle(null); setShowCycleDialog(true); }}
                className="gap-2"
                data-testid="button-create-cycle"
              >
                <Plus className="h-4 w-4" />
                Create Review Cycle
              </Button>
            </div>

            {cyclesLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              </div>
            ) : cycles.length === 0 ? (
              <Card className="bg-gray-800/50 border-gray-700">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Calendar className="h-12 w-12 text-gray-500 mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">No Review Cycles</h3>
                  <p className="text-gray-400 text-center mb-4">
                    Create review cycles to schedule KPI assessments for employees.
                  </p>
                  <Button onClick={() => setShowCycleDialog(true)} data-testid="button-create-first-cycle">
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Cycle
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {cycles.map((cycle) => (
                  <Card key={cycle.id} className="bg-gray-800/50 border-gray-700" data-testid={`card-cycle-${cycle.id}`}>
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-blue-600/20 rounded-lg">
                            <Calendar className="h-6 w-6 text-blue-400" />
                          </div>
                          <div>
                            <h3 className="font-medium text-white">{cycle.name}</h3>
                            <p className="text-sm text-gray-400">
                              {format(new Date(cycle.startDate), "MMM d, yyyy")} - {format(new Date(cycle.endDate), "MMM d, yyyy")}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          {getStatusBadge(cycle.status)}
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => { setEditingCycle(cycle); setShowCycleDialog(true); }}
                              data-testid={`button-edit-cycle-${cycle.id}`}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-400 hover:text-red-300"
                              onClick={() => deleteCycleMutation.mutate(cycle.id)}
                              data-testid={`button-delete-cycle-${cycle.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                      {cycle.description && (
                        <p className="text-sm text-gray-400 mt-3 ml-16">{cycle.description}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="assignments" className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <h2 className="text-lg font-semibold text-white">KPI Assignments</h2>
                <Select value={selectedCycle} onValueChange={setSelectedCycle}>
                  <SelectTrigger className="w-64 bg-gray-800 border-gray-700 text-white" data-testid="select-cycle-filter">
                    <SelectValue placeholder="Filter by cycle" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="all">All Cycles</SelectItem>
                    {cycles.map((cycle) => (
                      <SelectItem key={cycle.id} value={cycle.id}>{cycle.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button 
                onClick={() => setShowAssignDialog(true)}
                className="gap-2"
                disabled={cycles.length === 0 || templates.length === 0}
                data-testid="button-assign-kpis"
              >
                <Plus className="h-4 w-4" />
                Assign KPIs
              </Button>
            </div>

            {assignments.length === 0 ? (
              <Card className="bg-gray-800/50 border-gray-700">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Users className="h-12 w-12 text-gray-500 mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">No Assignments</h3>
                  <p className="text-gray-400 text-center mb-4">
                    Assign KPI templates to employees for the selected review cycle.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {assignments.map((assignment) => {
                  const employee = employees.find(e => e.id === assignment.employeeId);
                  const template = templates.find(t => t.id === assignment.kpiTemplateId);
                  return (
                    <Card key={assignment.id} className="bg-gray-800/50 border-gray-700" data-testid={`card-assignment-${assignment.id}`}>
                      <CardContent className="py-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-blue-600/20 rounded-full flex items-center justify-center">
                              <User className="h-5 w-5 text-blue-400" />
                            </div>
                            <div>
                              <p className="font-medium text-white">{employee?.fullName || "Unknown"}</p>
                              <p className="text-sm text-gray-400">{template?.name || "Unknown KPI"}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-sm text-gray-400">Target</p>
                              <p className="font-medium text-white">{assignment.customTarget || template?.targetValue}</p>
                            </div>
                            <Badge variant="outline">{template?.category}</Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="reviews" className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <h2 className="text-lg font-semibold text-white">Review Submissions</h2>
                <Select value={selectedCycle} onValueChange={setSelectedCycle}>
                  <SelectTrigger className="w-64 bg-gray-800 border-gray-700 text-white" data-testid="select-cycle-reviews">
                    <SelectValue placeholder="Filter by cycle" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="all">All Cycles</SelectItem>
                    {cycles.map((cycle) => (
                      <SelectItem key={cycle.id} value={cycle.id}>{cycle.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" className="gap-2" data-testid="button-download-reports">
                <Download className="h-4 w-4" />
                Export Reports
              </Button>
            </div>

            {submissions.length === 0 ? (
              <Card className="bg-gray-800/50 border-gray-700">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <BarChart3 className="h-12 w-12 text-gray-500 mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">No Reviews Yet</h3>
                  <p className="text-gray-400 text-center">
                    Reviews will appear here once employees submit their self-assessments.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {submissions.map((submission) => {
                  const employee = employees.find(e => e.id === submission.employeeId);
                  const manager = employees.find(e => e.id === submission.managerId);
                  return (
                    <Card key={submission.id} className="bg-gray-800/50 border-gray-700" data-testid={`card-submission-${submission.id}`}>
                      <CardContent className="py-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="h-12 w-12 bg-blue-600/20 rounded-full flex items-center justify-center">
                              <User className="h-6 w-6 text-blue-400" />
                            </div>
                            <div>
                              <h3 className="font-medium text-white">{employee?.fullName || "Unknown"}</h3>
                              <p className="text-sm text-gray-400">Manager: {manager?.fullName || "Not assigned"}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-6">
                            <div className="text-center">
                              <p className="text-xs text-gray-500 uppercase">Self Assessment</p>
                              {getStatusBadge(submission.selfAssessmentStatus)}
                            </div>
                            <div className="text-center">
                              <p className="text-xs text-gray-500 uppercase">Manager Review</p>
                              {getStatusBadge(submission.managerReviewStatus)}
                            </div>
                            {submission.finalScore && (
                              <div className="text-center">
                                <p className="text-xs text-gray-500 uppercase">Final Score</p>
                                <div className="flex items-center gap-1">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <Star
                                      key={star}
                                      className={`h-4 w-4 ${
                                        star <= submission.finalScore! ? "text-yellow-400 fill-yellow-400" : "text-gray-600"
                                      }`}
                                    />
                                  ))}
                                </div>
                              </div>
                            )}
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setSelectedSubmission(submission)}
                                data-testid={`button-view-submission-${submission.id}`}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => sendWhatsAppNotification.mutate({
                                  submissionId: submission.id,
                                  type: submission.selfAssessmentStatus === 'pending' ? 'self_assessment' : 'manager_review'
                                })}
                                data-testid={`button-notify-${submission.id}`}
                              >
                                <Send className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                        {submission.selfSubmittedAt && (
                          <p className="text-xs text-gray-500 mt-2 ml-16">
                            Self-assessment submitted: {format(new Date(submission.selfSubmittedAt), "MMM d, yyyy 'at' h:mm a")}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <TemplateDialog
        open={showTemplateDialog}
        onOpenChange={setShowTemplateDialog}
        template={editingTemplate}
        onSubmit={(data, assignmentData) => createTemplateMutation.mutate({ templateData: data, assignmentData })}
        isLoading={createTemplateMutation.isPending}
        employees={employees}
        cycles={cycles}
      />

      <CycleDialog
        open={showCycleDialog}
        onOpenChange={setShowCycleDialog}
        cycle={editingCycle}
        onSubmit={(data) => createCycleMutation.mutate(data)}
        isLoading={createCycleMutation.isPending}
      />

      <AssignDialog
        open={showAssignDialog}
        onOpenChange={setShowAssignDialog}
        cycles={cycles}
        templates={templates}
        employees={employees}
      />

      <SubmissionDetailDialog
        open={!!selectedSubmission}
        onOpenChange={() => setSelectedSubmission(null)}
        submission={selectedSubmission}
        employees={employees}
      />
    </div>
  );
}

const LEGACY_DATA_SOURCES = [
  "Manual Entry",
];

const FREQUENCIES = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "annually", label: "Annually" }
];

const OWNER_TYPES = [
  { value: "department", label: "Department" },
  { value: "division", label: "Division" }
];

const DEPARTMENTS = [
  "Sales",
  "Marketing",
  "Finance",
  "Operations",
  "Human Resources",
  "IT",
  "Customer Service",
  "Engineering",
  "Research & Development"
];

const DIVISIONS = [
  "North Region",
  "South Region",
  "East Region",
  "West Region",
  "Corporate",
  "Retail",
  "Wholesale"
];

function TemplateDialog({
  open,
  onOpenChange,
  template,
  onSubmit,
  isLoading,
  employees = [],
  cycles = []
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: KpiTemplate | null;
  onSubmit: (data: Partial<KpiTemplate>, assignmentData?: { reviewCycleId: string; employeeIds: string[] }) => void;
  isLoading: boolean;
  employees?: Employee[];
  cycles?: ReviewCycle[];
}) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState(template?.name || "");
  const [description, setDescription] = useState(template?.description || "");
  const [category, setCategory] = useState(template?.category || "Performance");
  const [weight, setWeight] = useState(template?.weight || 20);
  const [targetValue, setTargetValue] = useState(template?.targetValue?.toString() || "");
  const [targetTimePeriod, setTargetTimePeriod] = useState(template?.targetTimePeriod || "quarterly");
  const [measurementType, setMeasurementType] = useState(template?.measurementType || "scale");
  const [dataSourceId, setDataSourceId] = useState(template?.dataSource || "");
  const [frequency, setFrequency] = useState(template?.frequency || "quarterly");
  const [ownerType, setOwnerType] = useState(template?.ownerType || "department");
  const [ownerId, setOwnerId] = useState(template?.ownerId || "");
  const [ownerDepartment, setOwnerDepartment] = useState(template?.ownerDepartment || "");
  const [ownerDivision, setOwnerDivision] = useState(template?.ownerDivision || "");
  const [sourceFieldMapping, setSourceFieldMapping] = useState<string>(template?.sourceFieldMapping?.toString() || "");
  const [aggregationMethod, setAggregationMethod] = useState(template?.aggregationMethod || "sum");
  
  // Assignment step state (step 3)
  const [assignReviewCycleId, setAssignReviewCycleId] = useState("");
  const [assignEmployeeIds, setAssignEmployeeIds] = useState<string[]>([]);

  // Reset form state when template changes (for edit mode)
  useEffect(() => {
    if (open) {
      setStep(1);
      setName(template?.name || "");
      setDescription(template?.description || "");
      setCategory(template?.category || "Performance");
      setWeight(template?.weight || 20);
      setTargetValue(template?.targetValue?.toString() || "");
      setTargetTimePeriod(template?.targetTimePeriod || "quarterly");
      setMeasurementType(template?.measurementType || "scale");
      setDataSourceId(template?.dataSource || "");
      setFrequency(template?.frequency || "quarterly");
      setOwnerType(template?.ownerType || "department");
      setOwnerId(template?.ownerId || "");
      setOwnerDepartment(template?.ownerDepartment || "");
      setOwnerDivision(template?.ownerDivision || "");
      setSourceFieldMapping(template?.sourceFieldMapping?.toString() || "");
      setAggregationMethod(template?.aggregationMethod || "sum");
      setAssignReviewCycleId("");
      setAssignEmployeeIds([]);
    }
  }, [open, template]);

  const dataSourcesKey = useTenantQueryKey(["data-sources-active"]);
  const { data: activeSources = [] } = useQuery<{ id: string; name: string; type: string }[]>({
    queryKey: dataSourcesKey,
    queryFn: async () => {
      const response = await api.get("/data-sources/active");
      return response.data;
    },
    enabled: open
  });

  const selectedSource = activeSources.find(s => s.id === dataSourceId);

  const handleSubmit = () => {
    const templateData = {
      name,
      description,
      category,
      weight,
      targetValue: parseFloat(targetValue) || 0,
      targetTimePeriod,
      measurementType,
      dataSource: dataSourceId,
      frequency,
      ownerType,
      ownerId: null,
      ownerDepartment: ownerType === "department" ? ownerDepartment : null,
      ownerDivision: ownerType === "division" ? ownerDivision : null,
      isActive: 1,
      sourceFieldMapping: sourceFieldMapping || null,
      aggregationMethod: aggregationMethod || null
    };
    
    const assignmentData = assignReviewCycleId && assignEmployeeIds.length > 0
      ? { reviewCycleId: assignReviewCycleId, employeeIds: assignEmployeeIds }
      : undefined;
    
    onSubmit(templateData, assignmentData);
  };
  
  const activeCycles = cycles.filter(c => c.status !== 'completed');

  const canProceedStep1 = name.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) setStep(1);
      onOpenChange(isOpen);
    }}>
      <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{template ? "Edit" : "Create"} KPI Template</DialogTitle>
          <DialogDescription className="text-gray-400">
            {step === 1 && "Step 1 of 4: Define KPI details"}
            {step === 2 && "Step 2 of 4: Configure data source"}
            {step === 3 && "Step 3 of 4: Assign to review cycle"}
            {step === 4 && "Step 4 of 4: Review and create"}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex items-center gap-2 mb-4">
          <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${step >= 1 ? 'bg-blue-600' : 'bg-gray-700'}`}>1</div>
          <div className={`flex-1 h-1 ${step >= 2 ? 'bg-blue-600' : 'bg-gray-700'}`} />
          <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${step >= 2 ? 'bg-blue-600' : 'bg-gray-700'}`}>2</div>
          <div className={`flex-1 h-1 ${step >= 3 ? 'bg-blue-600' : 'bg-gray-700'}`} />
          <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${step >= 3 ? 'bg-blue-600' : 'bg-gray-700'}`}>3</div>
          <div className={`flex-1 h-1 ${step >= 4 ? 'bg-blue-600' : 'bg-gray-700'}`} />
          <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${step >= 4 ? 'bg-blue-600' : 'bg-gray-700'}`}>4</div>
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Customer Satisfaction Score"
                className="bg-gray-800 border-gray-700"
                data-testid="input-template-name"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this KPI measures..."
                className="bg-gray-800 border-gray-700"
                data-testid="input-template-description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="bg-gray-800 border-gray-700" data-testid="select-template-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Measurement Type</Label>
                <Select value={measurementType} onValueChange={setMeasurementType}>
                  <SelectTrigger className="bg-gray-800 border-gray-700" data-testid="select-template-measurement">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="scale">Scale (1-5)</SelectItem>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="number">Number</SelectItem>
                    <SelectItem value="boolean">Yes/No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Weight ({weight}%)</Label>
              <Slider
                value={[weight]}
                onValueChange={([v]) => setWeight(v)}
                min={5}
                max={100}
                step={5}
                className="mt-2"
                data-testid="slider-template-weight"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Target Value</Label>
                <Input
                  type="number"
                  value={targetValue}
                  onChange={(e) => setTargetValue(e.target.value)}
                  placeholder="e.g., 90"
                  className="bg-gray-800 border-gray-700"
                  data-testid="input-template-target"
                />
              </div>
              <div>
                <Label>Target Period</Label>
                <Select value={targetTimePeriod} onValueChange={setTargetTimePeriod}>
                  <SelectTrigger className="bg-gray-800 border-gray-700" data-testid="select-template-target-period">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    {FREQUENCIES.map((f) => (
                      <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Frequency</Label>
                <Select value={frequency} onValueChange={setFrequency}>
                  <SelectTrigger className="bg-gray-800 border-gray-700" data-testid="select-template-frequency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    {FREQUENCIES.map((f) => (
                      <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="border-t border-gray-700 pt-4">
              <Label className="text-base font-medium">Owner</Label>
              <p className="text-sm text-gray-400 mb-3">Who is responsible for this KPI?</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Owner Type</Label>
                  <Select value={ownerType} onValueChange={setOwnerType}>
                    <SelectTrigger className="bg-gray-800 border-gray-700" data-testid="select-template-owner-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      {OWNER_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  {ownerType === "department" && (
                    <>
                      <Label>Department</Label>
                      <Select value={ownerDepartment} onValueChange={setOwnerDepartment}>
                        <SelectTrigger className="bg-gray-800 border-gray-700" data-testid="select-template-owner-department">
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-700">
                          {DEPARTMENTS.map((dept) => (
                            <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </>
                  )}
                  {ownerType === "division" && (
                    <>
                      <Label>Division</Label>
                      <Select value={ownerDivision} onValueChange={setOwnerDivision}>
                        <SelectTrigger className="bg-gray-800 border-gray-700" data-testid="select-template-owner-division">
                          <SelectValue placeholder="Select division" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-700">
                          {DIVISIONS.map((div) => (
                            <SelectItem key={div} value={div}>{div}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <DataSourceForm
            existingSources={activeSources}
            selectedSourceId={dataSourceId}
            onSelectSource={setDataSourceId}
            onSourceCreated={(sourceId) => {
              setDataSourceId(sourceId);
              setStep(3);
            }}
            embedded={true}
          />
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <p className="text-sm text-gray-300">
                Assign this KPI to a review cycle and select employees. You can skip this step and assign later.
              </p>
            </div>
            
            <div>
              <Label>Review Cycle</Label>
              <Select value={assignReviewCycleId} onValueChange={setAssignReviewCycleId}>
                <SelectTrigger className="bg-gray-800 border-gray-700" data-testid="select-assign-cycle">
                  <SelectValue placeholder="Select a review cycle (optional)" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  {activeCycles.map((cycle) => (
                    <SelectItem key={cycle.id} value={cycle.id}>{cycle.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {assignReviewCycleId && (
              <div>
                <Label>Select Employees to Assign</Label>
                <div className="mt-2 max-h-48 overflow-y-auto space-y-2 border border-gray-700 rounded-lg p-3">
                  {employees.map((employee) => (
                    <label key={employee.id} className="flex items-center gap-3 cursor-pointer hover:bg-gray-800/50 p-2 rounded">
                      <input
                        type="checkbox"
                        checked={assignEmployeeIds.includes(employee.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setAssignEmployeeIds([...assignEmployeeIds, employee.id]);
                          } else {
                            setAssignEmployeeIds(assignEmployeeIds.filter(id => id !== employee.id));
                          }
                        }}
                        className="rounded border-gray-600"
                        data-testid={`checkbox-assign-employee-${employee.id}`}
                      />
                      <div className="h-8 w-8 bg-blue-600/20 rounded-full flex items-center justify-center">
                        <User className="h-4 w-4 text-blue-400" />
                      </div>
                      <span className="text-white">{employee.fullName}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">{assignEmployeeIds.length} employee(s) selected</p>
              </div>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <p className="text-sm text-gray-300">
                Review your KPI configuration before creating.
              </p>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-gray-800">
                <span className="text-gray-400">Name</span>
                <span className="text-white font-medium">{name}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-800">
                <span className="text-gray-400">Category</span>
                <span className="text-white">{category}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-800">
                <span className="text-gray-400">Measurement Type</span>
                <span className="text-white capitalize">{measurementType}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-800">
                <span className="text-gray-400">Weight</span>
                <span className="text-white">{weight}%</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-800">
                <span className="text-gray-400">Target Value</span>
                <span className="text-white">{targetValue || "Not set"}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-800">
                <span className="text-gray-400">Frequency</span>
                <span className="text-white capitalize">{frequency}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-800">
                <span className="text-gray-400">Data Source</span>
                <span className="text-white">
                  {selectedSource?.name || "Not configured"}
                </span>
              </div>
              {assignReviewCycleId && (
                <div className="flex justify-between py-2 border-b border-gray-800">
                  <span className="text-gray-400">Review Cycle</span>
                  <span className="text-white">
                    {activeCycles.find(c => c.id === assignReviewCycleId)?.name}
                  </span>
                </div>
              )}
              {assignEmployeeIds.length > 0 && (
                <div className="flex justify-between py-2 border-b border-gray-800">
                  <span className="text-gray-400">Assigned Employees</span>
                  <span className="text-white">{assignEmployeeIds.length} employee(s)</span>
                </div>
              )}
              {description && (
                <div className="py-2">
                  <span className="text-gray-400 block mb-1">Description</span>
                  <span className="text-gray-300 text-sm">{description}</span>
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="flex justify-between">
          <div>
            {step > 1 && (
              <Button variant="ghost" onClick={() => setStep(step - 1)} data-testid="button-back">
                Back
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            {step === 1 && (
              <Button 
                onClick={() => setStep(2)}
                disabled={!canProceedStep1}
                data-testid="button-next"
              >
                Next: Data Source
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
            {step === 2 && dataSourceId && (
              <Button 
                onClick={() => setStep(3)}
                data-testid="button-next"
              >
                Next: Assign
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
            {step === 3 && (
              <Button 
                onClick={() => setStep(4)}
                data-testid="button-next"
              >
                Next: Review
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
            {step === 4 && (
              <Button onClick={handleSubmit} disabled={isLoading} data-testid="button-create-kpi">
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {template ? "Update KPI" : "Create KPI"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CycleDialog({
  open,
  onOpenChange,
  cycle,
  onSubmit,
  isLoading
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cycle: ReviewCycle | null;
  onSubmit: (data: Partial<ReviewCycle>) => void;
  isLoading: boolean;
}) {
  const [name, setName] = useState(cycle?.name || "");
  const [description, setDescription] = useState(cycle?.description || "");
  const [cycleType, setCycleType] = useState(cycle?.cycleType || "quarterly");
  const [startDate, setStartDate] = useState(
    cycle?.startDate ? format(new Date(cycle.startDate), "yyyy-MM-dd") : ""
  );
  const [endDate, setEndDate] = useState(
    cycle?.endDate ? format(new Date(cycle.endDate), "yyyy-MM-dd") : ""
  );
  const [status, setStatus] = useState(cycle?.status || "draft");

  const handleSubmit = () => {
    onSubmit({
      name,
      description,
      cycleType: cycleType as "monthly" | "quarterly" | "semi_annual" | "annual",
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      status: status as any,
      is360Review: 1
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-md">
        <DialogHeader>
          <DialogTitle>{cycle ? "Edit" : "Create"} Review Cycle</DialogTitle>
          <DialogDescription className="text-gray-400">
            Schedule a performance review period
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Q4 2024 Performance Review"
              className="bg-gray-800 border-gray-700"
              data-testid="input-cycle-name"
            />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe this review cycle..."
              className="bg-gray-800 border-gray-700"
              data-testid="input-cycle-description"
            />
          </div>
          <div>
            <Label>Type</Label>
            <Select value={cycleType} onValueChange={setCycleType}>
              <SelectTrigger className="bg-gray-800 border-gray-700" data-testid="select-cycle-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="semi_annual">Semi-Annual</SelectItem>
                <SelectItem value="annual">Annual</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-gray-800 border-gray-700"
                data-testid="input-cycle-start"
              />
            </div>
            <div>
              <Label>End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-gray-800 border-gray-700"
                data-testid="input-cycle-end"
              />
            </div>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="bg-gray-800 border-gray-700" data-testid="select-cycle-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="self_assessment">Self Assessment</SelectItem>
                <SelectItem value="manager_review">Manager Review</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!name || !startDate || !endDate || isLoading} data-testid="button-save-cycle">
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {cycle ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AssignDialog({
  open,
  onOpenChange,
  cycles,
  templates,
  employees
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cycles: ReviewCycle[];
  templates: KpiTemplate[];
  employees: Employee[];
}) {
  const [selectedCycle, setSelectedCycle] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [targetValue, setTargetValue] = useState("");
  
  const queryClient = useQueryClient();
  const assignmentsKey = useTenantQueryKey(["kpi-assignments"]);

  const createAssignment = useMutation({
    mutationFn: async () => {
      const assignments = selectedEmployees.map(employeeId => ({
        reviewCycleId: selectedCycle,
        kpiTemplateId: selectedTemplate,
        employeeId,
        customTarget: parseFloat(targetValue) || null,
        status: 'pending'
      }));
      return api.post("/kpi-assignments/batch", { assignments });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assignmentsKey });
      onOpenChange(false);
      setSelectedEmployees([]);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle>Assign KPIs to Employees</DialogTitle>
          <DialogDescription className="text-gray-400">
            Select a review cycle, KPI template, and employees
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Review Cycle</Label>
            <Select value={selectedCycle} onValueChange={setSelectedCycle}>
              <SelectTrigger className="bg-gray-800 border-gray-700" data-testid="select-assign-cycle">
                <SelectValue placeholder="Select cycle" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                {cycles.filter(c => c.status !== 'completed').map((cycle) => (
                  <SelectItem key={cycle.id} value={cycle.id}>{cycle.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>KPI Template</Label>
            <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
              <SelectTrigger className="bg-gray-800 border-gray-700" data-testid="select-assign-template">
                <SelectValue placeholder="Select KPI" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Target Value (optional override)</Label>
            <Input
              type="number"
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
              placeholder="Leave empty to use template default"
              className="bg-gray-800 border-gray-700"
              data-testid="input-assign-target"
            />
          </div>
          <div>
            <Label>Select Employees</Label>
            <div className="mt-2 max-h-48 overflow-y-auto space-y-2 border border-gray-700 rounded-lg p-3">
              {employees.map((employee) => (
                <label key={employee.id} className="flex items-center gap-3 cursor-pointer hover:bg-gray-800/50 p-2 rounded">
                  <input
                    type="checkbox"
                    checked={selectedEmployees.includes(employee.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedEmployees([...selectedEmployees, employee.id]);
                      } else {
                        setSelectedEmployees(selectedEmployees.filter(id => id !== employee.id));
                      }
                    }}
                    className="rounded border-gray-600"
                    data-testid={`checkbox-employee-${employee.id}`}
                  />
                  <div className="h-8 w-8 bg-blue-600/20 rounded-full flex items-center justify-center">
                    <User className="h-4 w-4 text-blue-400" />
                  </div>
                  <span className="text-white">{employee.fullName}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">{selectedEmployees.length} employee(s) selected</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => createAssignment.mutate()}
            disabled={!selectedCycle || !selectedTemplate || selectedEmployees.length === 0 || createAssignment.isPending}
            data-testid="button-confirm-assign"
          >
            {createAssignment.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Assign KPIs
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SubmissionDetailDialog({
  open,
  onOpenChange,
  submission,
  employees
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submission: ReviewSubmission | null;
  employees: Employee[];
}) {
  if (!submission) return null;
  
  const employee = employees.find(e => e.id === submission.employeeId);
  const manager = employees.find(e => e.id === submission.managerId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle>Review Details</DialogTitle>
          <DialogDescription className="text-gray-400">
            {employee?.fullName}'s performance review
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-800/50 rounded-lg">
              <p className="text-sm text-gray-400 mb-1">Employee</p>
              <p className="font-medium text-white">{employee?.fullName}</p>
            </div>
            <div className="p-4 bg-gray-800/50 rounded-lg">
              <p className="text-sm text-gray-400 mb-1">Manager</p>
              <p className="font-medium text-white">{manager?.fullName || "Not assigned"}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-800/50 rounded-lg">
              <p className="text-sm text-gray-400 mb-2">Self Assessment Status</p>
              <Badge variant={submission.selfAssessmentStatus === 'completed' ? "default" : "secondary"}>
                {submission.selfAssessmentStatus}
              </Badge>
              {submission.selfSubmittedAt && (
                <p className="text-xs text-gray-500 mt-2">
                  Submitted: {format(new Date(submission.selfSubmittedAt), "MMM d, yyyy")}
                </p>
              )}
            </div>
            <div className="p-4 bg-gray-800/50 rounded-lg">
              <p className="text-sm text-gray-400 mb-2">Manager Review Status</p>
              <Badge variant={submission.managerReviewStatus === 'completed' ? "default" : "secondary"}>
                {submission.managerReviewStatus}
              </Badge>
              {submission.managerSubmittedAt && (
                <p className="text-xs text-gray-500 mt-2">
                  Submitted: {format(new Date(submission.managerSubmittedAt), "MMM d, yyyy")}
                </p>
              )}
            </div>
          </div>

          {submission.finalScore && (
            <div className="p-4 bg-blue-900/20 border border-blue-700/30 rounded-lg">
              <p className="text-sm text-gray-400 mb-2">Final Score</p>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-6 w-6 ${
                      star <= submission.finalScore! ? "text-yellow-400 fill-yellow-400" : "text-gray-600"
                    }`}
                  />
                ))}
                <span className="text-2xl font-bold text-white ml-2">{submission.finalScore}/5</span>
              </div>
            </div>
          )}

          {submission.employeeComments && (
            <div className="p-4 bg-gray-800/50 rounded-lg">
              <p className="text-sm text-gray-400 mb-2">Employee Comments</p>
              <p className="text-white">{submission.employeeComments}</p>
            </div>
          )}

          {submission.managerComments && (
            <div className="p-4 bg-gray-800/50 rounded-lg">
              <p className="text-sm text-gray-400 mb-2">Manager Comments</p>
              <p className="text-white">{submission.managerComments}</p>
            </div>
          )}

          {submission.developmentPlan && (
            <div className="p-4 bg-gray-800/50 rounded-lg">
              <p className="text-sm text-gray-400 mb-2">Development Plan</p>
              <p className="text-white">{submission.developmentPlan}</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
