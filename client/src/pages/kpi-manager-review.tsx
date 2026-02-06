import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Target, Star, Clock, CheckCircle, User, Calendar, Send, Loader2, Users, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface ReviewSubmission {
  id: number;
  employeeId: number;
  reviewCycleId: number;
  selfAssessmentStatus: string;
  managerReviewStatus: string;
  finalScore: string | null;
  employeeComments: string | null;
  managerComments: string | null;
  selfSubmittedAt: string | null;
  managerSubmittedAt: string | null;
  employee?: {
    id: number;
    name: string;
    email: string;
    department: string;
  };
  cycle?: {
    name: string;
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
    measurementType: string;
    targetValue: string;
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

function StarRating({
  value,
  onChange,
  disabled = false,
  size = "md"
}: {
  value: number;
  onChange?: (v: number) => void;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8"
  };

  return (
    <div className="flex gap-1" data-testid="star-rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={disabled}
          onClick={() => onChange?.(star)}
          onMouseEnter={() => !disabled && setHovered(star)}
          onMouseLeave={() => setHovered(null)}
          className={cn(
            "transition-all",
            disabled ? "cursor-default" : "cursor-pointer hover:scale-110"
          )}
          data-testid={`star-${star}`}
        >
          <Star
            className={cn(
              sizeClasses[size],
              "transition-colors",
              (hovered !== null ? star <= hovered : star <= value)
                ? "fill-yellow-400 text-yellow-600 dark:text-yellow-400"
                : "fill-muted text-muted-foreground"
            )}
          />
        </button>
      ))}
    </div>
  );
}

function EmployeeReviewDialog({
  submission,
  open,
  onOpenChange,
  onComplete
}: {
  submission: ReviewSubmission;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [managerScores, setManagerScores] = useState<Record<number, number>>({});
  const [managerComments, setManagerComments] = useState<Record<number, string>>({});
  const [overallComments, setOverallComments] = useState("");

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

  useEffect(() => {
    if (assignments.length > 0) {
      const scores: Record<number, number> = {};
      const comments: Record<number, string> = {};
      assignments.forEach(a => {
        if (a.score?.managerScore) {
          scores[a.id] = a.score.managerScore;
        }
        if (a.score?.managerComments) {
          comments[a.id] = a.score.managerComments;
        }
      });
      setManagerScores(scores);
      setManagerComments(comments);
    }
  }, [assignments]);

  const updateScoreMutation = useMutation({
    mutationFn: async ({ scoreId, managerScore, managerComments, status }: {
      scoreId: number;
      managerScore: number;
      managerComments?: string;
      status: string;
    }) => {
      const res = await fetch(`/api/kpi-scores/${scoreId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ managerScore, managerComments, status })
      });
      if (!res.ok) throw new Error("Failed to update score");
      return res.json();
    }
  });

  const submitReviewMutation = useMutation({
    mutationFn: async () => {
      for (const assignment of assignments) {
        if (assignment.score?.id && managerScores[assignment.id]) {
          await updateScoreMutation.mutateAsync({
            scoreId: assignment.score.id,
            managerScore: managerScores[assignment.id],
            managerComments: managerComments[assignment.id],
            status: "approved"
          });
        }
      }

      const totalWeight = assignments.reduce((sum, a) => sum + (a.template?.weight || 0), 0);
      const weightedScore = assignments.reduce((sum, a) => {
        const score = managerScores[a.id] || a.score?.managerScore || a.score?.selfScore || 0;
        const weight = a.template?.weight || 0;
        return sum + (score * weight / 100);
      }, 0);
      const finalScore = totalWeight > 0 ? (weightedScore / totalWeight * 100).toFixed(1) : "0";

      const res = await fetch(`/api/review-submissions/${submission.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          managerReviewStatus: "completed",
          managerComments: overallComments,
          finalScore,
          managerSubmittedAt: new Date().toISOString()
        })
      });
      if (!res.ok) throw new Error("Failed to submit review");
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Review Completed",
        description: "Manager review has been submitted successfully."
      });
      queryClient.invalidateQueries({ queryKey: ["/api/review-submissions"] });
      onOpenChange(false);
      onComplete();
    },
    onError: (error: Error) => {
      toast({
        title: "Submission Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const allScored = assignments.length > 0 && assignments.every(a => 
    managerScores[a.id] > 0 || (a.score?.managerScore && a.score.managerScore > 0)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl text-foreground flex items-center gap-2">
            <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Review: {submission.employee?.name || `Employee #${submission.employeeId}`}
          </DialogTitle>
          <DialogDescription>
            Review and provide scores for each KPI
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
          </div>
        ) : (
          <div className="space-y-6">
            {submission.employeeComments && (
              <div className="bg-blue-500/10 dark:bg-blue-900/20 border border-blue-500/30 p-4 rounded-lg">
                <p className="text-sm text-blue-600 dark:text-blue-400 mb-1">Employee's Overall Comments</p>
                <p className="text-foreground">{submission.employeeComments}</p>
              </div>
            )}

            {assignments.map(assignment => (
              <Card key={assignment.id} className="bg-muted border-border">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg text-foreground">
                        {assignment.template?.name}
                      </CardTitle>
                      <CardDescription>{assignment.template?.description}</CardDescription>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      Weight: {assignment.template?.weight}%
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Target</p>
                      <p className="text-foreground font-medium">
                        {assignment.customTarget || assignment.template?.targetValue}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Employee Self-Score</p>
                      <div className="flex items-center gap-2">
                        <StarRating value={assignment.score?.selfScore || 0} disabled size="sm" />
                        <span className="text-xl font-bold text-foreground">
                          {assignment.score?.selfScore || "-"}
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-1">Your Score</p>
                      <div className="flex items-center gap-2">
                        <StarRating
                          value={managerScores[assignment.id] || 0}
                          onChange={(v) => setManagerScores(prev => ({ ...prev, [assignment.id]: v }))}
                          size="md"
                        />
                        <span className="text-xl font-bold text-green-600 dark:text-green-400">
                          {managerScores[assignment.id] || "-"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {assignment.score?.selfComments && (
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">Employee Comments</p>
                      <p className="text-foreground text-sm">{assignment.score.selfComments}</p>
                    </div>
                  )}

                  <div>
                    <Label className="text-sm text-muted-foreground mb-2 block">Your Feedback</Label>
                    <Textarea
                      value={managerComments[assignment.id] || ""}
                      onChange={(e) => setManagerComments(prev => ({ ...prev, [assignment.id]: e.target.value }))}
                      placeholder="Provide feedback on this KPI..."
                      className="bg-muted border-border min-h-[60px]"
                      data-testid={`manager-comments-${assignment.id}`}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}

            <div>
              <Label className="text-sm text-muted-foreground mb-2 block">Overall Manager Comments</Label>
              <Textarea
                value={overallComments}
                onChange={(e) => setOverallComments(e.target.value)}
                placeholder="Provide overall feedback and development recommendations..."
                className="bg-muted border-border min-h-[100px]"
                data-testid="overall-manager-comments"
              />
            </div>
          </div>
        )}

        <DialogFooter className="flex gap-3">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => submitReviewMutation.mutate()}
            disabled={!allScored || submitReviewMutation.isPending}
            className="bg-green-600 hover:bg-green-700"
            data-testid="submit-manager-review"
          >
            {submitReviewMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4 mr-2" />
            )}
            Complete Review
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function KPIManagerReviewPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedCycleId, setSelectedCycleId] = useState<number | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<ReviewSubmission | null>(null);

  const { data: reviewCycles = [] } = useQuery<any[]>({
    queryKey: ["/api/review-cycles"],
    queryFn: async () => {
      const res = await fetch("/api/review-cycles");
      return res.json();
    }
  });

  const activeCycles = reviewCycles.filter(c => c.status === "active" || c.status === "completed");

  useEffect(() => {
    if (activeCycles.length > 0 && !selectedCycleId) {
      setSelectedCycleId(activeCycles[0].id);
    }
  }, [activeCycles, selectedCycleId]);

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

  const pendingReviews = submissions.filter(s => 
    s.selfAssessmentStatus === "completed" && s.managerReviewStatus === "pending"
  );
  const completedReviews = submissions.filter(s => s.managerReviewStatus === "completed");

  const selectedCycle = reviewCycles.find(c => c.id === selectedCycleId);

  return (
    <div className="min-h-screen bg-background">
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3" data-testid="page-title">
            <Users className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            Manager Review Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">
            Review and approve employee KPI self-assessments
          </p>
        </div>

        {activeCycles.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="py-12 text-center">
              <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No Review Cycles</h3>
              <p className="text-muted-foreground">
                There are no review cycles available for manager review.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex flex-wrap gap-2 mb-6">
              {activeCycles.map(cycle => (
                <Button
                  key={cycle.id}
                  variant={selectedCycleId === cycle.id ? "default" : "outline"}
                  onClick={() => setSelectedCycleId(cycle.id)}
                  className={cn(
                    selectedCycleId === cycle.id 
                      ? "bg-blue-600 hover:bg-blue-700" 
                      : "border-border text-muted-foreground"
                  )}
                  data-testid={`cycle-button-${cycle.id}`}
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  {cycle.name}
                </Button>
              ))}
            </div>

            {selectedCycle && (
              <Card className="bg-gradient-to-r from-blue-500/10 to-blue-500/10 dark:from-blue-900/20 dark:to-blue-900/20 border-border mb-6">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-6">
                      <div>
                        <p className="text-sm text-muted-foreground">Review Period</p>
                        <p className="text-foreground font-medium">
                          {format(new Date(selectedCycle.startDate), "MMM d, yyyy")} - {format(new Date(selectedCycle.endDate), "MMM d, yyyy")}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Pending Reviews</p>
                        <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{pendingReviews.length}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Completed</p>
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">{completedReviews.length}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
              </div>
            ) : (
              <div className="space-y-6">
                {pendingReviews.length > 0 && (
                  <div>
                    <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                      <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                      Pending Reviews ({pendingReviews.length})
                    </h2>
                    <div className="grid gap-4">
                      {pendingReviews.map(submission => (
                        <Card 
                          key={submission.id} 
                          className="bg-amber-500/10 dark:bg-amber-900/10 border-amber-500/30 cursor-pointer hover:bg-amber-500/20 dark:hover:bg-amber-900/20 transition-colors"
                          onClick={() => setSelectedSubmission(submission)}
                          data-testid={`pending-review-${submission.id}`}
                        >
                          <CardContent className="py-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                                  <User className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                                </div>
                                <div>
                                  <p className="font-medium text-foreground">
                                    {submission.employee?.name || `Employee #${submission.employeeId}`}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {submission.employee?.department || "Department"} • Submitted {submission.selfSubmittedAt ? format(new Date(submission.selfSubmittedAt), "MMM d, yyyy") : "recently"}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <Badge variant="outline" className="border-amber-500 text-amber-600 dark:text-amber-400">
                                  Awaiting Review
                                </Badge>
                                <ChevronRight className="w-5 h-5 text-muted-foreground" />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {completedReviews.length > 0 && (
                  <div>
                    <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                      Completed Reviews ({completedReviews.length})
                    </h2>
                    <div className="grid gap-4">
                      {completedReviews.map(submission => (
                        <Card 
                          key={submission.id} 
                          className="bg-green-500/10 dark:bg-green-900/10 border-green-500/30"
                          data-testid={`completed-review-${submission.id}`}
                        >
                          <CardContent className="py-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                                  <User className="w-5 h-5 text-green-600 dark:text-green-400" />
                                </div>
                                <div>
                                  <p className="font-medium text-foreground">
                                    {submission.employee?.name || `Employee #${submission.employeeId}`}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {submission.employee?.department || "Department"} • Reviewed {submission.managerSubmittedAt ? format(new Date(submission.managerSubmittedAt), "MMM d, yyyy") : "recently"}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                {submission.finalScore && (
                                  <div className="text-right">
                                    <p className="text-sm text-muted-foreground">Final Score</p>
                                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">{submission.finalScore}%</p>
                                  </div>
                                )}
                                <Badge variant="default" className="bg-green-600">
                                  Completed
                                </Badge>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {pendingReviews.length === 0 && completedReviews.length === 0 && (
                  <Card className="bg-card border-border">
                    <CardContent className="py-12 text-center">
                      <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-foreground mb-2">No Reviews Yet</h3>
                      <p className="text-muted-foreground">
                        No employees have submitted their self-assessments for this cycle yet.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </>
        )}

        {selectedSubmission && (
          <EmployeeReviewDialog
            submission={selectedSubmission}
            open={!!selectedSubmission}
            onOpenChange={(open) => !open && setSelectedSubmission(null)}
            onComplete={() => setSelectedSubmission(null)}
          />
        )}
      </main>
    </div>
  );
}
