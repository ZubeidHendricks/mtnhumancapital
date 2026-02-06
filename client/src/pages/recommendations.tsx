import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Sparkles,
  User,
  Briefcase,
  TrendingUp,
  Clock,
  RefreshCw,
  Loader2,
  ThumbsUp,
  ThumbsDown,
  ArrowRight,
  Target,
  Lightbulb,
  Users,
  ChevronRight,
  Brain,
} from "lucide-react";

interface CandidateRecommendation {
  id: string;
  candidateId: string;
  sessionId: string | null;
  jobId: string | null;
  recommendationType: string;
  score: number | null;
  reasoning: string | null;
  alternativeRoles: string[] | null;
  strengthAreas: string[] | null;
  developmentAreas: string[] | null;
  matchFactors: Record<string, number> | null;
  isActive: number;
  reviewedAt: string | null;
  reviewedBy: string | null;
  reviewOutcome: string | null;
  createdAt: string;
}

interface Candidate {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  status: string;
  currentTitle: string | null;
}

export default function Recommendations() {
  const [selectedType, setSelectedType] = useState<string>("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: recommendations = [], isLoading, refetch } = useQuery<CandidateRecommendation[]>({
    queryKey: ["/api/recommendations"],
  });

  const { data: candidates = [] } = useQuery<Candidate[]>({
    queryKey: ["/api/candidates"],
  });

  const getCandidateById = (id: string) => candidates.find(c => c.id === id);

  const filteredRecommendations = selectedType === "all" 
    ? recommendations 
    : recommendations.filter(r => r.recommendationType === selectedType);

  const getTypeColor = (type: string) => {
    switch (type) {
      case "better_fit": return "bg-blue-500/10 text-blue-500";
      case "pipeline": return "bg-blue-500/10 text-blue-500";
      case "reinterview": return "bg-amber-500/10 text-amber-500";
      case "high_potential": return "bg-green-500/10 text-green-500";
      default: return "bg-gray-500/10 text-gray-500";
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "better_fit": return "Better Fit";
      case "pipeline": return "Pipeline";
      case "reinterview": return "Re-Interview";
      case "high_potential": return "High Potential";
      default: return type;
    }
  };

  const getScoreColor = (score: number | null) => {
    if (score === null) return "text-gray-400";
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    return "text-red-500";
  };

  const typeStats = {
    all: recommendations.length,
    better_fit: recommendations.filter(r => r.recommendationType === "better_fit").length,
    pipeline: recommendations.filter(r => r.recommendationType === "pipeline").length,
    reinterview: recommendations.filter(r => r.recommendationType === "reinterview").length,
    high_potential: recommendations.filter(r => r.recommendationType === "high_potential").length,
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3" data-testid="text-page-title">
            <Sparkles className="h-8 w-8 text-amber-500" />
            AI Recommendations
          </h1>
          <p className="text-muted-foreground">Intelligent candidate suggestions based on interview analysis</p>
        </div>
        <Button onClick={() => refetch()} variant="outline" data-testid="button-refresh">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard 
          label="Total" 
          value={typeStats.all} 
          icon={<Target className="h-5 w-5" />}
          color="text-primary"
          onClick={() => setSelectedType("all")}
          active={selectedType === "all"}
        />
        <StatCard 
          label="Better Fit" 
          value={typeStats.better_fit} 
          icon={<TrendingUp className="h-5 w-5" />}
          color="text-blue-500"
          onClick={() => setSelectedType("better_fit")}
          active={selectedType === "better_fit"}
        />
        <StatCard 
          label="Pipeline" 
          value={typeStats.pipeline} 
          icon={<Clock className="h-5 w-5" />}
          color="text-blue-500"
          onClick={() => setSelectedType("pipeline")}
          active={selectedType === "pipeline"}
        />
        <StatCard 
          label="Re-Interview" 
          value={typeStats.reinterview} 
          icon={<RefreshCw className="h-5 w-5" />}
          color="text-amber-500"
          onClick={() => setSelectedType("reinterview")}
          active={selectedType === "reinterview"}
        />
        <StatCard 
          label="High Potential" 
          value={typeStats.high_potential} 
          icon={<Sparkles className="h-5 w-5" />}
          color="text-green-500"
          onClick={() => setSelectedType("high_potential")}
          active={selectedType === "high_potential"}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Candidate Recommendations
            <Badge variant="outline" className="ml-2">
              {filteredRecommendations.length} {selectedType !== "all" ? getTypeLabel(selectedType) : "total"}
            </Badge>
          </CardTitle>
          <CardDescription>
            AI-generated suggestions based on interview performance and competency analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredRecommendations.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Lightbulb className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg">No recommendations yet</p>
              <p className="text-sm mt-1">Complete interviews will generate AI-powered recommendations</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="space-y-4">
                {filteredRecommendations.map((rec) => {
                  const candidate = getCandidateById(rec.candidateId);
                  
                  return (
                    <div
                      key={rec.id}
                      data-testid={`card-recommendation-${rec.id}`}
                      className="p-4 rounded-lg border hover:shadow-md transition-all"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{candidate?.fullName || "Unknown Candidate"}</p>
                            <p className="text-sm text-muted-foreground">{candidate?.currentTitle || "No title"}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getTypeColor(rec.recommendationType)}>
                            {getTypeLabel(rec.recommendationType)}
                          </Badge>
                          {rec.score !== null && (
                            <span className={`text-lg font-bold ${getScoreColor(rec.score)}`}>
                              {rec.score}%
                            </span>
                          )}
                        </div>
                      </div>

                      {rec.reasoning && (
                        <p className="text-sm text-muted-foreground mb-3 bg-muted p-3 rounded-lg">
                          {rec.reasoning}
                        </p>
                      )}

                      <div className="grid md:grid-cols-2 gap-4">
                        {rec.strengthAreas && rec.strengthAreas.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-green-600 mb-1 flex items-center gap-1">
                              <ThumbsUp className="h-3 w-3" />
                              Strengths
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {rec.strengthAreas.map((s, i) => (
                                <Badge key={i} variant="outline" className="text-xs bg-green-50 dark:bg-green-900/30">
                                  {s}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {rec.developmentAreas && rec.developmentAreas.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-amber-600 mb-1 flex items-center gap-1">
                              <Target className="h-3 w-3" />
                              Development Areas
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {rec.developmentAreas.map((d, i) => (
                                <Badge key={i} variant="outline" className="text-xs bg-amber-50 dark:bg-amber-900/30">
                                  {d}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {rec.alternativeRoles && rec.alternativeRoles.length > 0 && (
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-xs font-semibold text-blue-600 mb-1 flex items-center gap-1">
                            <Briefcase className="h-3 w-3" />
                            Suggested Alternative Roles
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {rec.alternativeRoles.map((role, i) => (
                              <Badge key={i} variant="outline" className="text-xs bg-blue-50 dark:bg-blue-900/30">
                                {role}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {rec.matchFactors && Object.keys(rec.matchFactors).length > 0 && (
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-xs font-semibold text-blue-600 mb-2 flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" />
                            Match Factors
                          </p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {Object.entries(rec.matchFactors).map(([key, value]) => (
                              <div key={key} className="text-center">
                                <p className="text-xs text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</p>
                                <Progress value={value} className="h-1 mt-1" />
                                <span className="text-xs font-medium">{value}%</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                        <span>Created: {format(new Date(rec.createdAt), "MMM d, yyyy HH:mm")}</span>
                        {rec.reviewedAt && (
                          <span className="flex items-center gap-1">
                            Reviewed: {rec.reviewOutcome}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            How Recommendations Work
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-4">
            <div className="text-center p-4">
              <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-2">
                <span className="text-blue-600 dark:text-blue-400 font-bold">1</span>
              </div>
              <p className="font-medium">Interview Analysis</p>
              <p className="text-sm text-muted-foreground">AI analyzes interview transcripts and emotional patterns</p>
            </div>
            <div className="text-center p-4">
              <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-2">
                <span className="text-blue-600 dark:text-blue-400 font-bold">2</span>
              </div>
              <p className="font-medium">Competency Mapping</p>
              <p className="text-sm text-muted-foreground">Skills and competencies are scored across dimensions</p>
            </div>
            <div className="text-center p-4">
              <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-2">
                <span className="text-amber-600 dark:text-amber-400 font-bold">3</span>
              </div>
              <p className="font-medium">Pattern Recognition</p>
              <p className="text-sm text-muted-foreground">ML models identify patterns from past hiring outcomes</p>
            </div>
            <div className="text-center p-4">
              <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-2">
                <span className="text-green-600 dark:text-green-400 font-bold">4</span>
              </div>
              <p className="font-medium">Smart Suggestions</p>
              <p className="text-sm text-muted-foreground">Personalized recommendations for optimal role placement</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ 
  label, 
  value, 
  icon, 
  color, 
  onClick, 
  active 
}: { 
  label: string; 
  value: number; 
  icon: React.ReactNode; 
  color: string;
  onClick: () => void;
  active: boolean;
}) {
  return (
    <Card 
      className={`cursor-pointer transition-all hover:shadow-md ${active ? 'ring-2 ring-primary' : ''}`}
      onClick={onClick}
      data-testid={`stat-card-${label.toLowerCase().replace(' ', '-')}`}
    >
      <CardContent className="p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
        </div>
        <div className={color}>
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}
