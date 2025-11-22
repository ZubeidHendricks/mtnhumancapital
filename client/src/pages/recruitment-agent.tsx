import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Users, Target, TrendingUp, CheckCircle, AlertCircle, Search, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import type { Job, RecruitmentSession } from "@shared/schema";

export default function RecruitmentAgent() {
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [maxCandidates, setMaxCandidates] = useState(20);
  const [minMatchScore, setMinMatchScore] = useState(60);
  const [pollingSessions, setPollingSessions] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  const { data: jobs, isLoading: jobsLoading } = useQuery<Job[]>({
    queryKey: ["jobs"],
    queryFn: async () => {
      const response = await api.get("/jobs");
      return response.data;
    },
  });

  const { data: sessions, isLoading: sessionsLoading } = useQuery<RecruitmentSession[]>({
    queryKey: ["recruitment-sessions"],
    queryFn: async () => {
      const response = await api.get("/recruitment-sessions");
      return response.data;
    },
    refetchInterval: 3000,
  });

  const startRecruitmentMutation = useMutation({
    mutationFn: async (params: { jobId: string; maxCandidates: number; minMatchScore: number }) => {
      const response = await api.post("/recruitment-sessions", params);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["recruitment-sessions"] });
      setPollingSessions(prev => new Set(prev).add(data.session.id));
    },
  });

  const handleStartRecruitment = () => {
    if (!selectedJobId) return;
    startRecruitmentMutation.mutate({
      jobId: selectedJobId,
      maxCandidates,
      minMatchScore,
    });
  };

  useEffect(() => {
    if (sessions && Array.isArray(sessions)) {
      const runningSessions = sessions.filter(s => s.status === "Running");
      if (runningSessions.length === 0) {
        setPollingSessions(new Set());
      }
    }
  }, [sessions]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Running":
        return "bg-blue-500";
      case "Completed":
        return "bg-green-500";
      case "Failed":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Running":
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case "Completed":
        return <CheckCircle className="h-4 w-4" />;
      case "Failed":
        return <AlertCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-3">
              <Sparkles className="h-10 w-10 text-purple-600" />
              AI Recruitment Agent
            </h1>
            <p className="text-gray-600 mt-2">
              Intelligent candidate sourcing powered by LLaMA 3.1 70B via Groq
            </p>
          </div>
        </div>

        <Card className="border-2 border-purple-200 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-blue-50">
            <CardTitle className="flex items-center gap-2">
              <Target className="h-6 w-6 text-purple-600" />
              Start New Recruitment Session
            </CardTitle>
            <CardDescription>
              AI agents will analyze the job, search for candidates, and rank them automatically
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="job-select">Select Job Position</Label>
              <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                <SelectTrigger id="job-select" data-testid="select-job">
                  <SelectValue placeholder="Choose a job posting" />
                </SelectTrigger>
                <SelectContent>
                  {jobsLoading ? (
                    <SelectItem value="loading" disabled>Loading jobs...</SelectItem>
                  ) : jobs && Array.isArray(jobs) && jobs.length > 0 ? (
                    jobs.map((job) => (
                      <SelectItem key={job.id} value={job.id}>
                        {job.title} - {job.department}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>No jobs available</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="max-candidates">Max Candidates</Label>
                <Input
                  id="max-candidates"
                  data-testid="input-max-candidates"
                  type="number"
                  value={maxCandidates}
                  onChange={(e) => setMaxCandidates(Number(e.target.value))}
                  min={5}
                  max={50}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="min-match">Min Match Score (%)</Label>
                <Input
                  id="min-match"
                  data-testid="input-min-match"
                  type="number"
                  value={minMatchScore}
                  onChange={(e) => setMinMatchScore(Number(e.target.value))}
                  min={0}
                  max={100}
                />
              </div>
            </div>

            <Button
              onClick={handleStartRecruitment}
              disabled={!selectedJobId || startRecruitmentMutation.isPending}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              data-testid="button-start-recruitment"
            >
              {startRecruitmentMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Starting AI Agents...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Start AI Recruitment
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-blue-600" />
              Recruitment Sessions
            </CardTitle>
            <CardDescription>
              Track AI agent progress and results
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sessionsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
              </div>
            ) : sessions && Array.isArray(sessions) && sessions.length > 0 ? (
              <div className="space-y-4">
                {sessions.map((session) => {
                  const job = jobs && Array.isArray(jobs) ? jobs.find(j => j.id === session.jobId) : undefined;
                  const results = session.results as any;
                  
                  return (
                    <Card key={session.id} className="border-l-4" style={{ borderLeftColor: getStatusColor(session.status).replace('bg-', '#') }}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg flex items-center gap-2">
                              {job?.title || "Unknown Job"}
                              <Badge className={getStatusColor(session.status)}>
                                <div className="flex items-center gap-1">
                                  {getStatusIcon(session.status)}
                                  <span>{session.status}</span>
                                </div>
                              </Badge>
                            </CardTitle>
                            <CardDescription>
                              {session.searchQuery || "No search query"}
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-3 gap-4 mb-4">
                          <div className="text-center p-4 bg-blue-50 rounded-lg">
                            <div className="text-2xl font-bold text-blue-600">
                              {session.candidatesFound}
                            </div>
                            <div className="text-sm text-gray-600">Found</div>
                          </div>
                          <div className="text-center p-4 bg-green-50 rounded-lg">
                            <div className="text-2xl font-bold text-green-600">
                              {session.candidatesAdded}
                            </div>
                            <div className="text-sm text-gray-600">Added</div>
                          </div>
                          <div className="text-center p-4 bg-purple-50 rounded-lg">
                            <div className="text-2xl font-bold text-purple-600">
                              {session.candidatesAdded > 0 
                                ? Math.round((session.candidatesAdded / session.candidatesFound) * 100) 
                                : 0}%
                            </div>
                            <div className="text-sm text-gray-600">Match Rate</div>
                          </div>
                        </div>

                        {results?.step && (
                          <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                            <strong>Current Step:</strong> {results.step.replace(/_/g, ' ').toUpperCase()}
                          </div>
                        )}

                        {results?.requirements && (
                          <div className="mt-3 text-sm">
                            <strong>Skills Required:</strong>{" "}
                            {results.requirements.skills?.join(", ") || "None"}
                          </div>
                        )}

                        <div className="text-xs text-gray-500 mt-3">
                          Started: {new Date(session.createdAt).toLocaleString()}
                          {session.completedAt && (
                            <> | Completed: {new Date(session.completedAt).toLocaleString()}</>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No recruitment sessions yet. Start one above!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
