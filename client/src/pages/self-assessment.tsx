import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Star, Target, CheckCircle, Clock, AlertCircle, Send, Loader2, User } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface AssessmentData {
  employee: {
    id: string;
    name: string;
    position: string;
    department: string;
  };
  cycle: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
  };
  assignments: {
    id: number;
    template: {
      name: string;
      description: string;
      category: string;
      measurementType: string;
      targetValue: string;
      weight: number;
    };
    customTarget: string | null;
    existingScore: {
      selfScore: number;
      selfComments: string | null;
    } | null;
  }[];
  tenantConfig: {
    companyName: string;
    primaryColor: string;
    logo: string;
  } | null;
  expiresAt: string;
}

function StarRating({
  value,
  onChange,
  disabled = false,
}: {
  value: number;
  onChange?: (v: number) => void;
  disabled?: boolean;
}) {
  const [hovered, setHovered] = useState<number | null>(null);

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
            "transition-all p-1",
            disabled ? "cursor-default" : "cursor-pointer hover:scale-110"
          )}
          data-testid={`star-${star}`}
        >
          <Star
            className={cn(
              "w-8 h-8 transition-colors",
              (hovered !== null ? star <= hovered : star <= value)
                ? "fill-yellow-400 text-yellow-400"
                : "fill-gray-200 text-gray-300"
            )}
          />
        </button>
      ))}
    </div>
  );
}

export default function SelfAssessment() {
  const params = useParams();
  const token = params.token as string;
  const { toast } = useToast();
  
  const [scores, setScores] = useState<Record<number, { score: number; comments: string }>>({});
  const [overallComments, setOverallComments] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  const { data, isLoading, error } = useQuery<AssessmentData>({
    queryKey: ["/api/public/self-assessment", token],
    queryFn: async () => {
      const res = await fetch(`/api/public/self-assessment/${token}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to load assessment");
      }
      return res.json();
    },
    enabled: !!token,
    retry: false,
  });

  useEffect(() => {
    if (data?.assignments) {
      const initialScores: Record<number, { score: number; comments: string }> = {};
      data.assignments.forEach((a) => {
        initialScores[a.id] = {
          score: a.existingScore?.selfScore || 0,
          comments: a.existingScore?.selfComments || "",
        };
      });
      setScores(initialScores);
    }
  }, [data]);

  const submitMutation = useMutation({
    mutationFn: async () => {
      const scoreArray = Object.entries(scores).map(([assignmentId, { score, comments }]) => ({
        assignmentId: parseInt(assignmentId),
        score,
        selfComments: comments || null,
      }));

      const res = await fetch(`/api/public/self-assessment/${token}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scores: scoreArray,
          comments: overallComments || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to submit assessment");
      }

      return res.json();
    },
    onSuccess: () => {
      setIsSubmitted(true);
      toast({
        title: "Assessment Submitted",
        description: "Your self-assessment has been submitted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Submission Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateScore = (assignmentId: number, field: "score" | "comments", value: number | string) => {
    setScores((prev) => ({
      ...prev,
      [assignmentId]: {
        ...prev[assignmentId],
        [field]: value,
      },
    }));
  };

  const allScoresProvided = data?.assignments.every((a) => scores[a.id]?.score > 0) ?? false;
  const primaryColor = data?.tenantConfig?.primaryColor || "#3b82f6";

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading your assessment...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Unable to Load Assessment</h2>
            <p className="text-gray-600">{(error as Error).message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Thank You!</h2>
            <p className="text-gray-600">
              Your self-assessment has been submitted successfully. Your manager will review your responses.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <header 
        className="bg-white shadow-sm border-b"
        style={{ borderBottomColor: primaryColor }}
      >
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              {data.tenantConfig?.logo && (
                <img 
                  src={data.tenantConfig.logo} 
                  alt={data.tenantConfig.companyName} 
                  className="h-8 object-contain"
                />
              )}
              {!data.tenantConfig?.logo && data.tenantConfig?.companyName && (
                <span className="font-semibold text-lg" style={{ color: primaryColor }}>
                  {data.tenantConfig.companyName}
                </span>
              )}
            </div>
            <Badge variant="outline" className="gap-1">
              <Clock className="w-3 h-3" />
              Expires {format(new Date(data.expiresAt), "MMM d, yyyy")}
            </Badge>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl">Performance Self-Assessment</CardTitle>
                <CardDescription className="mt-2">{data.cycle.name}</CardDescription>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2 text-gray-600">
                  <User className="w-4 h-4" />
                  <span>{data.employee.name}</span>
                </div>
                <p className="text-sm text-gray-500">{data.employee.position}</p>
                {data.employee.department && (
                  <p className="text-sm text-gray-500">{data.employee.department}</p>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              Please rate your performance on each of the KPIs below. Use the 5-star scale where:
            </p>
            <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-500">
              <span>1 = Needs Improvement</span>
              <span>2 = Below Expectations</span>
              <span>3 = Meets Expectations</span>
              <span>4 = Exceeds Expectations</span>
              <span>5 = Outstanding</span>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {data.assignments.map((assignment, index) => (
            <Card key={assignment.id} data-testid={`kpi-card-${assignment.id}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Target className="w-5 h-5" style={{ color: primaryColor }} />
                      <CardTitle className="text-lg">{assignment.template.name}</CardTitle>
                    </div>
                    <CardDescription className="mt-1">
                      {assignment.template.description}
                    </CardDescription>
                  </div>
                  <Badge variant="secondary">{assignment.template.category}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 text-sm">
                  <div>
                    <span className="text-gray-500">Target:</span>{" "}
                    <span className="font-medium">
                      {assignment.customTarget || assignment.template.targetValue}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Weight:</span>{" "}
                    <span className="font-medium">{assignment.template.weight}%</span>
                  </div>
                </div>

                <Separator className="my-4" />

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Your Rating *
                    </label>
                    <StarRating
                      value={scores[assignment.id]?.score || 0}
                      onChange={(v) => updateScore(assignment.id, "score", v)}
                    />
                    {scores[assignment.id]?.score > 0 && (
                      <p className="text-sm text-gray-500 mt-1">
                        {scores[assignment.id]?.score === 1 && "Needs Improvement"}
                        {scores[assignment.id]?.score === 2 && "Below Expectations"}
                        {scores[assignment.id]?.score === 3 && "Meets Expectations"}
                        {scores[assignment.id]?.score === 4 && "Exceeds Expectations"}
                        {scores[assignment.id]?.score === 5 && "Outstanding"}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Comments (optional)
                    </label>
                    <Textarea
                      placeholder="Add any comments about your performance on this KPI..."
                      value={scores[assignment.id]?.comments || ""}
                      onChange={(e) => updateScore(assignment.id, "comments", e.target.value)}
                      rows={2}
                      data-testid={`comments-${assignment.id}`}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Overall Comments</CardTitle>
            <CardDescription>
              Any additional comments about your overall performance during this review period
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Share any overall thoughts, achievements, or areas for development..."
              value={overallComments}
              onChange={(e) => setOverallComments(e.target.value)}
              rows={4}
              data-testid="overall-comments"
            />
          </CardContent>
        </Card>

        <div className="mt-6 flex justify-end">
          <Button
            size="lg"
            onClick={() => submitMutation.mutate()}
            disabled={!allScoresProvided || submitMutation.isPending}
            className="gap-2"
            style={{ backgroundColor: allScoresProvided ? primaryColor : undefined }}
            data-testid="button-submit-assessment"
          >
            {submitMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Submit Self-Assessment
              </>
            )}
          </Button>
        </div>

        {!allScoresProvided && (
          <p className="text-sm text-gray-500 text-right mt-2">
            Please rate all {data.assignments.length} KPIs before submitting
          </p>
        )}
      </main>

      <footer className="border-t bg-white mt-12">
        <div className="max-w-4xl mx-auto px-4 py-4 text-center text-sm text-gray-500">
          {data.tenantConfig?.companyName || "Performance Management System"}
        </div>
      </footer>
    </div>
  );
}
