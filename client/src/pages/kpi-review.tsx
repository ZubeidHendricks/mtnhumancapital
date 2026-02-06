import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Target, Star, Clock, CheckCircle, User, Calendar, Save, Send, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface KpiAssignment {
  id: number;
  kpiTemplateId: number;
  employeeId: number;
  reviewCycleId: number;
  customTarget: string | null;
  status: string;
  createdAt: string;
  template?: {
    name: string;
    description: string;
    category: string;
    measurementType: string;
    targetValue: string;
    weight: number;
  };
  cycle?: {
    name: string;
    startDate: string;
    endDate: string;
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

interface ReviewSubmission {
  id: number;
  employeeId: number;
  reviewCycleId: number;
  selfAssessmentStatus: string;
  managerReviewStatus: string;
  finalScore: string | null;
  employeeComments: string | null;
  managerComments: string | null;
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

function KpiScoreCard({
  assignment,
  onScoreChange,
  onCommentsChange,
  score,
  comments
}: {
  assignment: KpiAssignment;
  onScoreChange: (score: number) => void;
  onCommentsChange: (comments: string) => void;
  score: number;
  comments: string;
}) {
  const hasManagerScore = assignment.score?.managerScore !== null;
  
  return (
    <Card className="bg-card border-border" data-testid={`kpi-card-${assignment.id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg text-foreground flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              {assignment.template?.name || "Unnamed KPI"}
            </CardTitle>
            <CardDescription className="mt-1">
              {assignment.template?.description}
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-xs">
            {assignment.template?.category}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Target</p>
            <p className="text-foreground font-medium">
              {assignment.customTarget || assignment.template?.targetValue}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Measurement</p>
            <p className="text-foreground font-medium capitalize">
              {assignment.template?.measurementType}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Weight</p>
            <p className="text-foreground font-medium">
              {assignment.template?.weight}%
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Status</p>
            <Badge variant={assignment.status === "completed" ? "default" : "secondary"} className="capitalize">
              {assignment.status}
            </Badge>
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label className="text-sm text-muted-foreground mb-2 block">Your Self-Assessment (1-5)</Label>
              <div className="flex items-center gap-4">
                <StarRating
                  value={score}
                  onChange={onScoreChange}
                  disabled={assignment.score?.status === "approved"}
                  size="lg"
                />
                <span className="text-2xl font-bold text-foreground">{score || "-"}</span>
              </div>
            </div>
            
            {hasManagerScore && (
              <div>
                <Label className="text-sm text-muted-foreground mb-2 block">Manager Score</Label>
                <div className="flex items-center gap-4">
                  <StarRating
                    value={assignment.score?.managerScore || 0}
                    disabled
                    size="lg"
                  />
                  <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {assignment.score?.managerScore || "-"}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div>
          <Label className="text-sm text-muted-foreground mb-2 block">
            Your Comments (Optional)
          </Label>
          <Textarea
            value={comments}
            onChange={(e) => onCommentsChange(e.target.value)}
            placeholder="Describe your achievements and challenges..."
            className="bg-muted border-border min-h-[80px]"
            disabled={assignment.score?.status === "approved"}
            data-testid={`comments-${assignment.id}`}
          />
        </div>

        {assignment.score?.managerComments && (
          <div className="bg-muted p-3 rounded-lg">
            <Label className="text-sm text-muted-foreground mb-1 block">Manager Feedback</Label>
            <p className="text-foreground text-sm">{assignment.score.managerComments}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function KPIReviewPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedCycleId, setSelectedCycleId] = useState<number | null>(null);
  const [scores, setScores] = useState<Record<number, { score: number; comments: string }>>({});
  const [overallComments, setOverallComments] = useState("");
  
  const currentEmployeeId = 1;

  const { data: reviewCycles = [] } = useQuery<any[]>({
    queryKey: ["/api/review-cycles"],
    queryFn: async () => {
      const res = await fetch("/api/review-cycles");
      return res.json();
    }
  });

  const activeCycles = reviewCycles.filter(c => c.status === "active");

  useEffect(() => {
    if (activeCycles.length > 0 && !selectedCycleId) {
      setSelectedCycleId(activeCycles[0].id);
    }
  }, [activeCycles, selectedCycleId]);

  const { data: assignments = [], isLoading: loadingAssignments } = useQuery<KpiAssignment[]>({
    queryKey: ["/api/kpi-assignments", { employeeId: currentEmployeeId, reviewCycleId: selectedCycleId }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("employeeId", String(currentEmployeeId));
      if (selectedCycleId) params.set("reviewCycleId", String(selectedCycleId));
      const res = await fetch(`/api/kpi-assignments?${params}`);
      return res.json();
    },
    enabled: !!selectedCycleId
  });

  const { data: submissions = [] } = useQuery<ReviewSubmission[]>({
    queryKey: ["/api/review-submissions", { employeeId: currentEmployeeId, reviewCycleId: selectedCycleId }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("employeeId", String(currentEmployeeId));
      if (selectedCycleId) params.set("reviewCycleId", String(selectedCycleId));
      const res = await fetch(`/api/review-submissions?${params}`);
      return res.json();
    },
    enabled: !!selectedCycleId
  });

  const currentSubmission = submissions.find(s => s.reviewCycleId === selectedCycleId);
  const isSubmitted = currentSubmission?.selfAssessmentStatus === "completed";

  const saveScoreMutation = useMutation({
    mutationFn: async ({ assignmentId, selfScore, selfComments }: { 
      assignmentId: number; 
      selfScore: number; 
      selfComments?: string 
    }) => {
      const res = await fetch("/api/kpi-scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignmentId,
          selfScore,
          selfComments,
          status: "pending"
        })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to save score");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/kpi-assignments"] });
    }
  });

  const submitReviewMutation = useMutation({
    mutationFn: async () => {
      for (const assignment of assignments) {
        const scoreData = scores[assignment.id];
        if (scoreData?.score) {
          await saveScoreMutation.mutateAsync({
            assignmentId: assignment.id,
            selfScore: scoreData.score,
            selfComments: scoreData.comments
          });
        }
      }

      const res = await fetch("/api/review-submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: currentEmployeeId,
          reviewCycleId: selectedCycleId,
          selfAssessmentStatus: "completed",
          managerReviewStatus: "pending",
          employeeComments: overallComments
        })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to submit review");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Review Submitted",
        description: "Your self-assessment has been submitted for manager review."
      });
      queryClient.invalidateQueries({ queryKey: ["/api/review-submissions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/kpi-assignments"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Submission Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleScoreChange = (assignmentId: number, score: number) => {
    setScores(prev => ({
      ...prev,
      [assignmentId]: { ...prev[assignmentId], score, comments: prev[assignmentId]?.comments || "" }
    }));
  };

  const handleCommentsChange = (assignmentId: number, comments: string) => {
    setScores(prev => ({
      ...prev,
      [assignmentId]: { ...prev[assignmentId], comments, score: prev[assignmentId]?.score || 0 }
    }));
  };

  const selectedCycle = reviewCycles.find(c => c.id === selectedCycleId);

  const allScored = assignments.length > 0 && assignments.every(a => {
    const scoreData = scores[a.id];
    return (scoreData?.score && scoreData.score > 0) || (a.score?.selfScore && a.score.selfScore > 0);
  });

  return (
    <div className="min-h-screen bg-background">
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3" data-testid="page-title">
            <Target className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            My KPI Review
          </h1>
          <p className="text-muted-foreground mt-2">
            Complete your self-assessment for the current review cycle
          </p>
        </div>

        {activeCycles.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="py-12 text-center">
              <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No Active Review Cycles</h3>
              <p className="text-muted-foreground">
                There are no review cycles currently open for self-assessment.
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
                        <p className="text-sm text-muted-foreground">Status</p>
                        <Badge variant={isSubmitted ? "default" : "secondary"}>
                          {isSubmitted ? "Submitted" : "In Progress"}
                        </Badge>
                      </div>
                    </div>
                    
                    {isSubmitted && (
                      <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                        <CheckCircle className="w-5 h-5" />
                        <span>Self-Assessment Completed</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {loadingAssignments ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
              </div>
            ) : assignments.length === 0 ? (
              <Card className="bg-card border-border">
                <CardContent className="py-12 text-center">
                  <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-foreground mb-2">No KPIs Assigned</h3>
                  <p className="text-muted-foreground">
                    You don't have any KPIs assigned for this review cycle.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                <div className="grid gap-4">
                  {assignments.map(assignment => (
                    <KpiScoreCard
                      key={assignment.id}
                      assignment={assignment}
                      score={scores[assignment.id]?.score || assignment.score?.selfScore || 0}
                      comments={scores[assignment.id]?.comments || assignment.score?.selfComments || ""}
                      onScoreChange={(score) => handleScoreChange(assignment.id, score)}
                      onCommentsChange={(comments) => handleCommentsChange(assignment.id, comments)}
                    />
                  ))}
                </div>

                {!isSubmitted && (
                  <Card className="bg-card border-border">
                    <CardHeader>
                      <CardTitle className="text-lg text-foreground">Overall Comments</CardTitle>
                      <CardDescription>
                        Add any additional comments about your overall performance this period
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Textarea
                        value={overallComments}
                        onChange={(e) => setOverallComments(e.target.value)}
                        placeholder="Share your thoughts on your overall performance, challenges faced, and goals achieved..."
                        className="bg-muted border-border min-h-[120px]"
                        data-testid="overall-comments"
                      />
                      
                      <div className="flex justify-end gap-3">
                        <Button
                          variant="outline"
                          className="border-border"
                          onClick={() => {
                            for (const assignment of assignments) {
                              const scoreData = scores[assignment.id];
                              if (scoreData?.score) {
                                saveScoreMutation.mutate({
                                  assignmentId: assignment.id,
                                  selfScore: scoreData.score,
                                  selfComments: scoreData.comments
                                });
                              }
                            }
                            toast({
                              title: "Progress Saved",
                              description: "Your scores have been saved as drafts."
                            });
                          }}
                          data-testid="save-draft-button"
                        >
                          <Save className="w-4 h-4 mr-2" />
                          Save Draft
                        </Button>
                        <Button
                          onClick={() => submitReviewMutation.mutate()}
                          disabled={!allScored || submitReviewMutation.isPending}
                          className="bg-green-600 hover:bg-green-700"
                          data-testid="submit-review-button"
                        >
                          {submitReviewMutation.isPending ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Send className="w-4 h-4 mr-2" />
                          )}
                          Submit Review
                        </Button>
                      </div>
                      
                      {!allScored && (
                        <p className="text-sm text-amber-600 dark:text-amber-400 text-right">
                          Please score all KPIs before submitting
                        </p>
                      )}
                    </CardContent>
                  </Card>
                )}

                {isSubmitted && currentSubmission?.managerReviewStatus === "pending" && (
                  <Card className="bg-amber-500/10 dark:bg-amber-900/20 border-amber-500/30">
                    <CardContent className="py-6 text-center">
                      <Clock className="w-8 h-8 text-amber-600 dark:text-amber-400 mx-auto mb-3" />
                      <h3 className="text-lg font-semibold text-foreground mb-1">Awaiting Manager Review</h3>
                      <p className="text-muted-foreground">
                        Your self-assessment has been submitted and is waiting for manager approval.
                      </p>
                    </CardContent>
                  </Card>
                )}

                {isSubmitted && currentSubmission?.managerReviewStatus === "completed" && (
                  <Card className="bg-green-500/10 dark:bg-green-900/20 border-green-500/30">
                    <CardContent className="py-6">
                      <div className="flex items-center gap-3 mb-4">
                        <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                        <div>
                          <h3 className="text-lg font-semibold text-foreground">Review Completed</h3>
                          <p className="text-muted-foreground">Your manager has completed the review</p>
                        </div>
                      </div>
                      
                      {currentSubmission.finalScore && (
                        <div className="bg-muted p-4 rounded-lg">
                          <p className="text-sm text-muted-foreground mb-1">Final Score</p>
                          <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                            {currentSubmission.finalScore}
                          </p>
                        </div>
                      )}
                      
                      {currentSubmission.managerComments && (
                        <div className="mt-4">
                          <p className="text-sm text-muted-foreground mb-1">Manager Comments</p>
                          <p className="text-foreground">{currentSubmission.managerComments}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
