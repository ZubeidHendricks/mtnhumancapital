import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Target, 
  Users, 
  TrendingUp, 
  TrendingDown, 
  Star, 
  Clock, 
  CheckCircle, 
  Calendar, 
  Search, 
  Download,
  BarChart3,
  Loader2,
  User,
  Filter,
  ChevronDown,
  MessageSquare,
  Mail,
  Phone,
  Send,
  FileText,
  Link2
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

interface ReviewSubmission {
  id: string;
  employeeId: string;
  reviewCycleId: string;
  selfAssessmentStatus: string;
  managerReviewStatus: string;
  finalScore: string | null;
  employeeComments: string | null;
  managerComments: string | null;
  developmentPlan: string | null;
  selfSubmittedAt: string | null;
  managerSubmittedAt: string | null;
  createdAt: string;
  employee?: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    department: string;
  };
  cycle?: {
    name: string;
    startDate: string;
    endDate: string;
  };
}

interface KpiAssignment {
  id: number;
  kpiTemplateId: number;
  employeeId: number;
  reviewCycleId: number;
  customTarget: string | null;
  status: string;
  template?: {
    name: string;
    description: string;
    category: string;
    weight: number;
  };
  score?: {
    id: number;
    selfScore: number;
    managerScore: number | null;
    selfComments: string | null;
    managerComments: string | null;
    status: string;
  };
}

interface Feedback360Response {
  id: number;
  requestId: number;
  responderId: number;
  competencyScores: Record<string, number>;
  strengths: string | null;
  areasForImprovement: string | null;
  additionalComments: string | null;
  submittedAt: string | null;
}

function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend,
  color = "blue" 
}: { 
  title: string; 
  value: string | number; 
  subtitle?: string; 
  icon: React.ElementType;
  trend?: { value: number; positive: boolean };
  color?: "blue" | "green" | "amber" | "purple" | "rose";
}) {
  const colorClasses = {
    blue: "from-blue-900/20 to-blue-800/10 border-blue-500/30",
    green: "from-green-900/20 to-green-800/10 border-green-500/30",
    amber: "from-amber-900/20 to-amber-800/10 border-amber-500/30",
    purple: "from-purple-900/20 to-purple-800/10 border-purple-500/30",
    rose: "from-rose-900/20 to-rose-800/10 border-rose-500/30",
  };

  const iconColors = {
    blue: "text-blue-400",
    green: "text-green-400",
    amber: "text-amber-400",
    purple: "text-purple-400",
    rose: "text-rose-400",
  };

  return (
    <Card className={cn("bg-gradient-to-br border", colorClasses[color])}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-gray-400">{title}</p>
            <p className="text-3xl font-bold text-white mt-1">{value}</p>
            {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
            {trend && (
              <div className={cn(
                "flex items-center gap-1 mt-2 text-sm",
                trend.positive ? "text-green-400" : "text-rose-400"
              )}>
                {trend.positive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                <span>{trend.value}% vs last cycle</span>
              </div>
            )}
          </div>
          <div className={cn("p-3 rounded-lg bg-white/5", iconColors[color])}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CommunicationDialog({
  open,
  onOpenChange,
  selectedEmployees,
  cycleName
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedEmployees: ReviewSubmission[];
  cycleName: string;
}) {
  const { toast } = useToast();
  const [channel, setChannel] = useState<"whatsapp" | "email" | "teams">("email");
  const [message, setMessage] = useState(`Hi [Employee Name],

This is a friendly reminder to complete your KPI self-assessment for ${cycleName}.

Please log in to the HR portal and submit your review at your earliest convenience.

Thank you,
HR Team`);
  const [sending, setSending] = useState(false);

  const sendNotification = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/kpi-notifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeIds: selectedEmployees.map(e => e.employeeId),
          channel,
          message,
          cycleName
        })
      });
      if (!res.ok) throw new Error("Failed to send notifications");
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Notifications Sent",
        description: `Successfully sent ${data.sent} notification(s) via ${channel}`
      });
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send notifications. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleSend = async () => {
    setSending(true);
    try {
      await sendNotification.mutateAsync();
    } catch {
      // Error is handled by mutation's onError callback
    } finally {
      setSending(false);
    }
  };

  const employeesWithContact = selectedEmployees.filter(e => {
    if (channel === "whatsapp") return e.employee?.phone;
    if (channel === "email") return e.employee?.email;
    return true;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-gray-900 border-white/10">
        <DialogHeader>
          <DialogTitle className="text-xl text-white flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-400" />
            Send Review Reminders
          </DialogTitle>
          <DialogDescription>
            Send reminders to {selectedEmployees.length} selected employee(s)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div>
            <Label className="text-gray-400 mb-2 block">Communication Channel</Label>
            <div className="grid grid-cols-3 gap-3">
              <Button
                type="button"
                variant={channel === "email" ? "default" : "outline"}
                className={cn(
                  "flex items-center gap-2",
                  channel === "email" ? "" : "border-gray-700"
                )}
                onClick={() => setChannel("email")}
                data-testid="channel-email"
              >
                <Mail className="w-4 h-4" />
                Email
              </Button>
              <Button
                type="button"
                variant={channel === "whatsapp" ? "default" : "outline"}
                className={cn(
                  "flex items-center gap-2",
                  channel === "whatsapp" ? "bg-green-600 hover:bg-green-700" : "border-gray-700"
                )}
                onClick={() => setChannel("whatsapp")}
                data-testid="channel-whatsapp"
              >
                <Phone className="w-4 h-4" />
                WhatsApp
              </Button>
              <Button
                type="button"
                variant={channel === "teams" ? "default" : "outline"}
                className={cn(
                  "flex items-center gap-2",
                  channel === "teams" ? "bg-purple-600 hover:bg-purple-700" : "border-gray-700"
                )}
                onClick={() => setChannel("teams")}
                data-testid="channel-teams"
              >
                <MessageSquare className="w-4 h-4" />
                Teams
              </Button>
            </div>
          </div>

          <div>
            <Label className="text-gray-400 mb-2 block">Recipients ({employeesWithContact.length} reachable)</Label>
            <div className="bg-gray-800/50 rounded-lg p-3 max-h-32 overflow-y-auto">
              {selectedEmployees.map(emp => (
                <div key={emp.id} className="flex items-center justify-between py-1 text-sm">
                  <span className="text-white">{emp.employee?.name || `Employee #${emp.employeeId}`}</span>
                  <span className="text-gray-500">
                    {channel === "email" && (emp.employee?.email || "No email")}
                    {channel === "whatsapp" && (emp.employee?.phone || "No phone")}
                    {channel === "teams" && (emp.employee?.email || "No Teams ID")}
                  </span>
                </div>
              ))}
            </div>
            {employeesWithContact.length < selectedEmployees.length && (
              <p className="text-amber-400 text-xs mt-2">
                {selectedEmployees.length - employeesWithContact.length} employee(s) don't have {channel} contact info
              </p>
            )}
          </div>

          <div>
            <Label className="text-gray-400 mb-2 block">Message</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="bg-gray-800 border-gray-700 min-h-[150px]"
              placeholder="Enter your message..."
              data-testid="message-input"
            />
            <p className="text-gray-500 text-xs mt-1">
              Use [Employee Name] to personalize the message
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={sending || employeesWithContact.length === 0}
            data-testid="send-notification-button"
          >
            {sending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Send to {employeesWithContact.length} Employee(s)
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EmployeeDetailDialog({
  submission,
  open,
  onOpenChange
}: {
  submission: ReviewSubmission;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: assignments = [], isLoading } = useQuery<KpiAssignment[]>({
    queryKey: ["/api/kpi-assignments", { employeeId: submission.employeeId, reviewCycleId: submission.reviewCycleId }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("employeeId", String(submission.employeeId));
      params.set("reviewCycleId", String(submission.reviewCycleId));
      const res = await fetch(`/api/kpi-assignments?${params}`);
      return res.json();
    },
    enabled: open
  });

  const { data: feedback360 = [] } = useQuery<Feedback360Response[]>({
    queryKey: ["/api/feedback-360-responses", { employeeId: submission.employeeId }],
    queryFn: async () => {
      const res = await fetch(`/api/feedback-360-responses?employeeId=${submission.employeeId}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: open
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gray-900 border-white/10">
        <DialogHeader>
          <DialogTitle className="text-xl text-white flex items-center gap-2">
            <User className="w-5 h-5 text-blue-400" />
            {submission.employee?.name || `Employee #${submission.employeeId}`}
          </DialogTitle>
          <DialogDescription>
            {submission.cycle?.name} • {submission.employee?.department}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <Card className="bg-gray-800/50 border-white/10">
              <CardContent className="p-4 text-center">
                <p className="text-sm text-gray-400">Final Score</p>
                <p className={cn(
                  "text-3xl font-bold mt-1",
                  submission.finalScore && parseFloat(submission.finalScore) >= 80 
                    ? "text-green-400" 
                    : submission.finalScore && parseFloat(submission.finalScore) >= 60
                    ? "text-amber-400"
                    : "text-rose-400"
                )}>
                  {submission.finalScore ? `${submission.finalScore}%` : "-"}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-gray-800/50 border-white/10">
              <CardContent className="p-4 text-center">
                <p className="text-sm text-gray-400">Self-Assessment</p>
                <Badge variant={submission.selfAssessmentStatus === "completed" ? "default" : "secondary"} className="mt-2">
                  {submission.selfAssessmentStatus}
                </Badge>
              </CardContent>
            </Card>
            <Card className="bg-gray-800/50 border-white/10">
              <CardContent className="p-4 text-center">
                <p className="text-sm text-gray-400">Manager Review</p>
                <Badge variant={submission.managerReviewStatus === "completed" ? "default" : "secondary"} className="mt-2">
                  {submission.managerReviewStatus}
                </Badge>
              </CardContent>
            </Card>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-white mb-3">KPI Breakdown</h3>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
              </div>
            ) : assignments.length === 0 ? (
              <p className="text-gray-400 text-center py-4">No KPIs assigned</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10">
                    <TableHead className="text-gray-400">KPI</TableHead>
                    <TableHead className="text-gray-400">Category</TableHead>
                    <TableHead className="text-gray-400">Weight</TableHead>
                    <TableHead className="text-gray-400">Self Score</TableHead>
                    <TableHead className="text-gray-400">Manager Score</TableHead>
                    <TableHead className="text-gray-400">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignments.map(assignment => (
                    <TableRow key={assignment.id} className="border-white/10">
                      <TableCell className="text-white font-medium">
                        {assignment.template?.name}
                      </TableCell>
                      <TableCell className="text-gray-400">
                        {assignment.template?.category}
                      </TableCell>
                      <TableCell className="text-gray-400">
                        {assignment.template?.weight}%
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                          <span className="text-white">{assignment.score?.selfScore || "-"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-green-400 fill-green-400" />
                          <span className="text-white">{assignment.score?.managerScore || "-"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={assignment.score?.status === "approved" ? "default" : "secondary"}>
                          {assignment.score?.status || "pending"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          {submission.employeeComments && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Employee Comments</h3>
              <p className="text-gray-300 bg-gray-800/50 p-4 rounded-lg">{submission.employeeComments}</p>
            </div>
          )}

          {submission.managerComments && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Manager Comments</h3>
              <p className="text-gray-300 bg-gray-800/50 p-4 rounded-lg">{submission.managerComments}</p>
            </div>
          )}

          {submission.developmentPlan && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Development Plan</h3>
              <p className="text-gray-300 bg-gray-800/50 p-4 rounded-lg">{submission.developmentPlan}</p>
            </div>
          )}

          {feedback360.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">360° Feedback</h3>
              <div className="space-y-3">
                {feedback360.map(fb => (
                  <Card key={fb.id} className="bg-gray-800/50 border-white/10">
                    <CardContent className="p-4">
                      {fb.competencyScores && Object.keys(fb.competencyScores).length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                          {Object.entries(fb.competencyScores).map(([key, value]) => (
                            <div key={key} className="text-center">
                              <p className="text-xs text-gray-400 capitalize">{key.replace(/_/g, ' ')}</p>
                              <p className="text-lg font-bold text-white">{value}/5</p>
                            </div>
                          ))}
                        </div>
                      )}
                      {fb.strengths && (
                        <div className="mb-2">
                          <p className="text-sm text-gray-400">Strengths</p>
                          <p className="text-white text-sm">{fb.strengths}</p>
                        </div>
                      )}
                      {fb.areasForImprovement && (
                        <div>
                          <p className="text-sm text-gray-400">Areas for Improvement</p>
                          <p className="text-white text-sm">{fb.areasForImprovement}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
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

export default function KPIHRDashboard() {
  const { toast } = useToast();
  const [selectedCycleId, setSelectedCycleId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedSubmission, setSelectedSubmission] = useState<ReviewSubmission | null>(null);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<Set<string>>(new Set());
  const [showCommsDialog, setShowCommsDialog] = useState(false);
  const [sendingLinkFor, setSendingLinkFor] = useState<string | null>(null);

  const sendAssessmentLink = useMutation({
    mutationFn: async ({ employeeId, reviewCycleId }: { employeeId: string; reviewCycleId: string }) => {
      const res = await fetch("/api/self-assessment-tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, reviewCycleId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to send link");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setSendingLinkFor(null);
      if (data.whatsappSent) {
        toast({
          title: "Link Sent via WhatsApp",
          description: `Self-assessment link sent to ${data.employee.name}`,
        });
      } else {
        toast({
          title: "Link Generated",
          description: `Link created but WhatsApp not available. Employee has no phone number.`,
          variant: "default",
        });
      }
    },
    onError: (error: Error) => {
      setSendingLinkFor(null);
      toast({
        title: "Failed to Send Link",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const { data: reviewCycles = [] } = useQuery<any[]>({
    queryKey: ["/api/review-cycles"],
    queryFn: async () => {
      const res = await fetch("/api/review-cycles");
      return res.json();
    }
  });

  useEffect(() => {
    if (reviewCycles.length > 0 && !selectedCycleId) {
      const activeCycle = reviewCycles.find(c => c.status === "active");
      setSelectedCycleId(activeCycle?.id || reviewCycles[0].id);
    }
  }, [reviewCycles, selectedCycleId]);

  const { data: submissions = [], isLoading } = useQuery<ReviewSubmission[]>({
    queryKey: ["/api/review-submissions", { reviewCycleId: selectedCycleId }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCycleId) params.set("reviewCycleId", String(selectedCycleId));
      const res = await fetch(`/api/review-submissions?${params}`);
      return res.json();
    },
    enabled: !!selectedCycleId
  });

  const filteredSubmissions = submissions.filter(s => {
    const matchesSearch = !searchTerm || 
      s.employee?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.employee?.department?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "pending_self" && s.selfAssessmentStatus === "pending") ||
      (statusFilter === "pending_manager" && s.selfAssessmentStatus === "completed" && s.managerReviewStatus === "pending") ||
      (statusFilter === "completed" && s.managerReviewStatus === "completed");
    
    return matchesSearch && matchesStatus;
  });

  const selectedCycle = reviewCycles.find(c => c.id === selectedCycleId);

  const totalEmployees = submissions.length;
  const selfCompleted = submissions.filter(s => s.selfAssessmentStatus === "completed").length;
  const managerCompleted = submissions.filter(s => s.managerReviewStatus === "completed").length;
  const avgScore = submissions.filter(s => s.finalScore)
    .reduce((sum, s) => sum + parseFloat(s.finalScore!), 0) / (managerCompleted || 1);

  const selfCompletionRate = totalEmployees > 0 ? Math.round((selfCompleted / totalEmployees) * 100) : 0;
  const managerCompletionRate = totalEmployees > 0 ? Math.round((managerCompleted / totalEmployees) * 100) : 0;

  const toggleEmployeeSelection = (submissionId: string) => {
    const newSet = new Set(selectedEmployeeIds);
    if (newSet.has(submissionId)) {
      newSet.delete(submissionId);
    } else {
      newSet.add(submissionId);
    }
    setSelectedEmployeeIds(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedEmployeeIds.size === filteredSubmissions.length) {
      setSelectedEmployeeIds(new Set());
    } else {
      setSelectedEmployeeIds(new Set(filteredSubmissions.map(s => s.id)));
    }
  };

  const selectedSubmissions = filteredSubmissions.filter(s => selectedEmployeeIds.has(s.id));

  const exportToCSV = () => {
    const headers = ["Employee", "Department", "Email", "Phone", "Self Status", "Manager Status", "Final Score", "Employee Comments", "Manager Comments"];
    const rows = filteredSubmissions.map(s => [
      s.employee?.name || `Employee #${s.employeeId}`,
      s.employee?.department || "",
      s.employee?.email || "",
      s.employee?.phone || "",
      s.selfAssessmentStatus,
      s.managerReviewStatus,
      s.finalScore || "",
      s.employeeComments?.replace(/,/g, ";") || "",
      s.managerComments?.replace(/,/g, ";") || ""
    ]);

    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kpi-review-${selectedCycle?.name || "export"}-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast({
      title: "Export Complete",
      description: `Exported ${filteredSubmissions.length} review(s) to CSV`
    });
  };

  const exportToPDF = async () => {
    toast({
      title: "Generating PDF",
      description: "Creating PDF report..."
    });

    try {
      const res = await fetch("/api/kpi-reports/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewCycleId: selectedCycleId,
          submissions: filteredSubmissions
        })
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `kpi-report-${selectedCycle?.name || "export"}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
        
        toast({
          title: "PDF Generated",
          description: "Your report has been downloaded"
        });
      } else {
        toast({
          title: "PDF Generation",
          description: "PDF export feature will be available soon",
          variant: "default"
        });
      }
    } catch {
      toast({
        title: "Export Available",
        description: "Use CSV export for now. PDF will be available soon.",
        variant: "default"
      });
    }
  };

  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3" data-testid="page-title">
              <BarChart3 className="w-8 h-8 text-blue-400" />
              HR Performance Dashboard
            </h1>
            <p className="text-gray-400 mt-2">
              Organization-wide KPI performance overview
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={String(selectedCycleId)} onValueChange={(v) => setSelectedCycleId(Number(v))}>
              <SelectTrigger className="w-48 bg-gray-800 border-gray-700" data-testid="select-cycle">
                <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                <SelectValue placeholder="Select cycle" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                {reviewCycles.map(cycle => (
                  <SelectItem key={cycle.id} value={String(cycle.id)}>
                    {cycle.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="border-gray-700" data-testid="export-button">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                  <ChevronDown className="w-4 h-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-gray-800 border-gray-700">
                <DropdownMenuItem onClick={exportToCSV}>
                  <FileText className="w-4 h-4 mr-2" />
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportToPDF}>
                  <FileText className="w-4 h-4 mr-2" />
                  Export as PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button
              variant="default"
              onClick={() => setShowCommsDialog(true)}
              disabled={selectedEmployeeIds.size === 0}
              data-testid="send-reminders-button"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Send Reminders ({selectedEmployeeIds.size})
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Total Employees"
            value={totalEmployees}
            subtitle="In current cycle"
            icon={Users}
            color="blue"
          />
          <StatCard
            title="Self-Assessments"
            value={`${selfCompletionRate}%`}
            subtitle={`${selfCompleted}/${totalEmployees} completed`}
            icon={Star}
            color="amber"
          />
          <StatCard
            title="Manager Reviews"
            value={`${managerCompletionRate}%`}
            subtitle={`${managerCompleted}/${totalEmployees} completed`}
            icon={CheckCircle}
            color="green"
          />
          <StatCard
            title="Avg. Final Score"
            value={avgScore.toFixed(1) + "%"}
            subtitle="Across completed reviews"
            icon={TrendingUp}
            color="purple"
            trend={avgScore >= 75 ? { value: 5, positive: true } : undefined}
          />
        </div>

        {selectedCycle && (
          <Card className="bg-gray-900/50 border-white/10 mb-6">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Current Cycle</p>
                  <p className="text-xl font-semibold text-white">{selectedCycle.name}</p>
                  <p className="text-sm text-gray-500">
                    {format(new Date(selectedCycle.startDate), "MMM d, yyyy")} - {format(new Date(selectedCycle.endDate), "MMM d, yyyy")}
                  </p>
                </div>
                <div className="flex items-center gap-8">
                  <div>
                    <p className="text-sm text-gray-400 mb-2">Self-Assessment Progress</p>
                    <Progress value={selfCompletionRate} className="w-32 h-2" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-2">Manager Review Progress</p>
                    <Progress value={managerCompletionRate} className="w-32 h-2" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="bg-gray-900/50 border-white/10">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white">Employee Reviews</CardTitle>
                <CardDescription>View and manage individual employee performance reviews</CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search employees..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 bg-gray-800 border-gray-700 w-64"
                    data-testid="search-employees"
                  />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="border-gray-700">
                      <Filter className="w-4 h-4 mr-2" />
                      Status
                      <ChevronDown className="w-4 h-4 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-gray-800 border-gray-700">
                    <DropdownMenuItem onClick={() => setStatusFilter("all")}>All</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setStatusFilter("pending_self")}>Pending Self-Assessment</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setStatusFilter("pending_manager")}>Pending Manager Review</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setStatusFilter("completed")}>Completed</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
              </div>
            ) : filteredSubmissions.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No Reviews Found</h3>
                <p className="text-gray-400">
                  {searchTerm || statusFilter !== "all" 
                    ? "No employees match your search criteria" 
                    : "No employees have been assigned to this review cycle"}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10">
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedEmployeeIds.size === filteredSubmissions.length && filteredSubmissions.length > 0}
                        onCheckedChange={toggleSelectAll}
                        data-testid="select-all-checkbox"
                      />
                    </TableHead>
                    <TableHead className="text-gray-400">Employee</TableHead>
                    <TableHead className="text-gray-400">Department</TableHead>
                    <TableHead className="text-gray-400">Self-Assessment</TableHead>
                    <TableHead className="text-gray-400">Manager Review</TableHead>
                    <TableHead className="text-gray-400">Final Score</TableHead>
                    <TableHead className="text-gray-400">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubmissions.map(submission => (
                    <TableRow 
                      key={submission.id} 
                      className={cn(
                        "border-white/10 cursor-pointer hover:bg-white/5",
                        selectedEmployeeIds.has(submission.id) && "bg-blue-500/10"
                      )}
                      data-testid={`employee-row-${submission.id}`}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedEmployeeIds.has(submission.id)}
                          onCheckedChange={() => toggleEmployeeSelection(submission.id)}
                          data-testid={`select-employee-${submission.id}`}
                        />
                      </TableCell>
                      <TableCell onClick={() => setSelectedSubmission(submission)}>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                            <User className="w-4 h-4 text-blue-400" />
                          </div>
                          <div>
                            <p className="font-medium text-white">
                              {submission.employee?.name || `Employee #${submission.employeeId}`}
                            </p>
                            <p className="text-sm text-gray-500">{submission.employee?.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-400" onClick={() => setSelectedSubmission(submission)}>
                        {submission.employee?.department || "-"}
                      </TableCell>
                      <TableCell onClick={() => setSelectedSubmission(submission)}>
                        <Badge variant={submission.selfAssessmentStatus === "completed" ? "default" : "secondary"}>
                          {submission.selfAssessmentStatus === "completed" ? (
                            <><CheckCircle className="w-3 h-3 mr-1" /> Completed</>
                          ) : (
                            <><Clock className="w-3 h-3 mr-1" /> Pending</>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell onClick={() => setSelectedSubmission(submission)}>
                        <Badge variant={submission.managerReviewStatus === "completed" ? "default" : "secondary"}>
                          {submission.managerReviewStatus === "completed" ? (
                            <><CheckCircle className="w-3 h-3 mr-1" /> Completed</>
                          ) : (
                            <><Clock className="w-3 h-3 mr-1" /> Pending</>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell onClick={() => setSelectedSubmission(submission)}>
                        {submission.finalScore ? (
                          <span className={cn(
                            "text-lg font-bold",
                            parseFloat(submission.finalScore) >= 80 
                              ? "text-green-400" 
                              : parseFloat(submission.finalScore) >= 60
                              ? "text-amber-400"
                              : "text-rose-400"
                          )}>
                            {submission.finalScore}%
                          </span>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {submission.selfAssessmentStatus !== "completed" && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSendingLinkFor(submission.id);
                                sendAssessmentLink.mutate({
                                  employeeId: submission.employeeId,
                                  reviewCycleId: submission.reviewCycleId,
                                });
                              }}
                              disabled={sendingLinkFor === submission.id}
                              className="text-blue-400 hover:text-blue-300"
                              data-testid={`send-link-${submission.id}`}
                            >
                              {sendingLinkFor === submission.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Link2 className="w-4 h-4" />
                              )}
                              <span className="ml-1 hidden sm:inline">Send Link</span>
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedSubmission(submission);
                            }}
                            data-testid={`view-details-${submission.id}`}
                          >
                            View Details
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {selectedSubmission && (
          <EmployeeDetailDialog
            submission={selectedSubmission}
            open={!!selectedSubmission}
            onOpenChange={(open) => !open && setSelectedSubmission(null)}
          />
        )}

        {showCommsDialog && (
          <CommunicationDialog
            open={showCommsDialog}
            onOpenChange={setShowCommsDialog}
            selectedEmployees={selectedSubmissions}
            cycleName={selectedCycle?.name || "Review Cycle"}
          />
        )}
      </main>
    </div>
  );
}
