import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Navbar } from "@/components/layout/navbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useTenantQueryKey } from "@/hooks/useTenant";
import {
  Users,
  Search,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Eye,
  Send,
  MessageCircle,
  FileCheck,
  ArrowLeft,
  Loader2,
  ThumbsUp,
  ThumbsDown,
  Flag,
  TrendingUp,
  TrendingDown,
  Brain,
  Calendar,
  Clock,
  ExternalLink,
  Facebook,
  Twitter,
  Undo2
} from "lucide-react";
import { motion } from "framer-motion";

export default function SocialScreening() {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedCandidate, setSelectedCandidate] = useState<string | null>(null);
  const [isRequestConsentOpen, setIsRequestConsentOpen] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const queryClient = useQueryClient();

  const statsKey = useTenantQueryKey(['socialScreeningStats']);
  const consentsKey = useTenantQueryKey(['socialConsents']);
  const findingsKey = useTenantQueryKey(['socialFindings']);
  const pendingKey = useTenantQueryKey(['socialPending']);
  const candidatesKey = useTenantQueryKey(['candidates']);

  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: statsKey,
    queryFn: async () => {
      const res = await fetch("/api/social-screening/stats");
      if (!res.ok) return null;
      return res.json();
    },
  });

  const { data: consents = [], isLoading: loadingConsents } = useQuery({
    queryKey: consentsKey,
    queryFn: async () => {
      const res = await fetch("/api/social-screening/consents");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: findings = [], isLoading: loadingFindings } = useQuery({
    queryKey: findingsKey,
    queryFn: async () => {
      const res = await fetch("/api/social-screening/findings");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: pendingReviews = [], isLoading: loadingPending } = useQuery({
    queryKey: pendingKey,
    queryFn: async () => {
      const res = await fetch("/api/social-screening/findings/pending-review");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: candidates = [] } = useQuery({
    queryKey: candidatesKey,
    queryFn: async () => {
      const res = await fetch("/api/candidates");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const requestConsentMutation = useMutation({
    mutationFn: async (candidateId: string) => {
      const res = await fetch("/api/social-screening/consents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId }),
      });
      if (!res.ok) throw new Error("Failed to create consent request");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: consentsKey });
      toast.success("Consent request created successfully");
      setIsRequestConsentOpen(false);
    },
    onError: () => {
      toast.error("Failed to create consent request");
    },
  });

  const sendConsentWhatsAppMutation = useMutation({
    mutationFn: async (consentId: string) => {
      const res = await fetch(`/api/social-screening/consents/${consentId}/send-request`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to send WhatsApp request");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Consent request sent via WhatsApp");
    },
    onError: () => {
      toast.error("Failed to send WhatsApp message");
    },
  });

  const initiateScreeningMutation = useMutation({
    mutationFn: async (candidateId: string) => {
      const res = await fetch(`/api/social-screening/initiate/${candidateId}`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to initiate screening");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: findingsKey });
      queryClient.invalidateQueries({ queryKey: statsKey });
      toast.success("Social screening initiated");
    },
    onError: () => {
      toast.error("Failed to initiate screening");
    },
  });

  const submitReviewMutation = useMutation({
    mutationFn: async ({ findingId, decision, notes, adjustedRiskLevel, adjustedScore }: any) => {
      const res = await fetch(`/api/social-screening/findings/${findingId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision,
          reviewerNotes: notes,
          adjustedRiskLevel,
          adjustedCultureFitScore: adjustedScore,
        }),
      });
      if (!res.ok) throw new Error("Failed to submit review");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: findingsKey });
      queryClient.invalidateQueries({ queryKey: pendingKey });
      queryClient.invalidateQueries({ queryKey: statsKey });
      toast.success("Review submitted successfully");
    },
    onError: () => {
      toast.error("Failed to submit review");
    },
  });

  const candidatesWithoutConsent = candidates.filter((c: any) => 
    !consents.some((consent: any) => consent.candidateId === c.id)
  );

  const getRiskBadge = (riskLevel: string) => {
    const styles: Record<string, string> = {
      low: "bg-green-500/20 text-green-400",
      medium: "bg-yellow-500/20 text-yellow-400",
      high: "bg-orange-500/20 text-orange-400",
      critical: "bg-red-500/20 text-red-400",
    };
    return styles[riskLevel] || "bg-gray-500/20 text-gray-400";
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Link href="/hr">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to HR Dashboard
                </Button>
              </Link>
            </div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Users className="w-8 h-8 text-purple-400" />
              Social Intelligence Screening
            </h1>
            <p className="text-muted-foreground mt-1">
              AI-powered culture fit assessment with POPIA/GDPR compliance
            </p>
          </div>
          
          <Dialog open={isRequestConsentOpen} onOpenChange={setIsRequestConsentOpen}>
            <DialogTrigger asChild>
              <Button className="bg-purple-500 hover:bg-purple-400 text-purple-950">
                <Send className="w-4 h-4 mr-2" />
                Request Consent
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Request Social Media Consent</DialogTitle>
                <DialogDescription>
                  Select a candidate to request their consent for social media screening.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Select Candidate</Label>
                  <Select onValueChange={setSelectedCandidate}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a candidate" />
                    </SelectTrigger>
                    <SelectContent>
                      {candidatesWithoutConsent.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.fullName} - {c.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Platforms to Screen</Label>
                  <div className="flex flex-wrap gap-4">
                    {["facebook", "twitter", "reddit", "linkedin"].map((platform) => (
                      <div key={platform} className="flex items-center gap-2">
                        <Checkbox
                          id={platform}
                          checked={selectedPlatforms.includes(platform)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedPlatforms([...selectedPlatforms, platform]);
                            } else {
                              setSelectedPlatforms(selectedPlatforms.filter(p => p !== platform));
                            }
                          }}
                        />
                        <Label htmlFor={platform} className="capitalize">{platform}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsRequestConsentOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => selectedCandidate && requestConsentMutation.mutate(selectedCandidate)}
                  disabled={!selectedCandidate || requestConsentMutation.isPending}
                >
                  {requestConsentMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Send Request
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="border-white/10 bg-card/20" data-testid="stat-total-consents">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold">{stats?.totalConsentsRequested || 0}</p>
                <p className="text-sm text-muted-foreground">Total Consents</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-white/10 bg-card/20" data-testid="stat-granted">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-green-400">{stats?.consentGranted || 0}</p>
                <p className="text-sm text-muted-foreground">Consent Granted</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-white/10 bg-card/20" data-testid="stat-screenings">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-purple-400">{stats?.totalScreenings || 0}</p>
                <p className="text-sm text-muted-foreground">Total Screenings</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-white/10 bg-card/20" data-testid="stat-pending">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-yellow-400">{stats?.pendingHumanReview || 0}</p>
                <p className="text-sm text-muted-foreground">Pending Review</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-card/50 border border-white/5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="consents">Consents</TabsTrigger>
            <TabsTrigger value="screenings">Screenings</TabsTrigger>
            <TabsTrigger value="reviews">Pending Reviews</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Risk Distribution */}
              <Card className="border-white/10 bg-card/20">
                <CardHeader>
                  <CardTitle>Risk Distribution</CardTitle>
                  <CardDescription>Culture fit risk levels across all screenings</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {["low", "medium", "high", "critical"].map((level) => {
                      const count = stats?.riskDistribution?.[level] || 0;
                      const total = stats?.totalScreenings || 1;
                      const percentage = Math.round((count / total) * 100);
                      
                      return (
                        <div key={level}>
                          <div className="flex justify-between mb-1">
                            <span className="capitalize">{level} Risk</span>
                            <span>{count} ({percentage}%)</span>
                          </div>
                          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${
                                level === "low" ? "bg-green-500" :
                                level === "medium" ? "bg-yellow-500" :
                                level === "high" ? "bg-orange-500" : "bg-red-500"
                              }`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Average Culture Fit Score */}
              <Card className="border-white/10 bg-card/20">
                <CardHeader>
                  <CardTitle>Average Culture Fit Score</CardTitle>
                  <CardDescription>AI-generated culture alignment assessment</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-[200px]">
                  <div className="text-center">
                    <div className="relative inline-block">
                      <svg className="w-32 h-32" viewBox="0 0 100 100">
                        <circle
                          cx="50"
                          cy="50"
                          r="45"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="8"
                          className="text-white/10"
                        />
                        <circle
                          cx="50"
                          cy="50"
                          r="45"
                          fill="none"
                          stroke="url(#gradient)"
                          strokeWidth="8"
                          strokeLinecap="round"
                          strokeDasharray={`${(stats?.averageCultureFitScore || 0) * 2.83}, 283`}
                          transform="rotate(-90 50 50)"
                        />
                        <defs>
                          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#8B5CF6" />
                            <stop offset="100%" stopColor="#EC4899" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-3xl font-bold">
                          {Math.round(stats?.averageCultureFitScore || 0)}%
                        </span>
                      </div>
                    </div>
                    <p className="text-muted-foreground mt-4">Culture Alignment</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card className="border-white/10 bg-card/20">
              <CardHeader>
                <CardTitle>Recent Screening Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-3">
                    {findings.slice(0, 10).map((finding: any) => (
                      <div key={finding.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${
                            finding.riskLevel === 'low' ? 'bg-green-500' :
                            finding.riskLevel === 'medium' ? 'bg-yellow-500' :
                            finding.riskLevel === 'high' ? 'bg-orange-500' : 'bg-red-500'
                          }`} />
                          <div>
                            <p className="font-medium">Candidate #{finding.candidateId?.slice(-6)}</p>
                            <p className="text-sm text-muted-foreground">
                              Score: {finding.cultureFitScore || 'N/A'}% | 
                              {finding.aiRecommendation ? ` AI: ${finding.aiRecommendation}` : ' Pending'}
                            </p>
                          </div>
                        </div>
                        <Badge className={getRiskBadge(finding.riskLevel)}>
                          {finding.riskLevel || 'Pending'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="consents" className="space-y-6">
            <Card className="border-white/10 bg-card/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-green-400" />
                  Consent Management
                </CardTitle>
                <CardDescription>Track and manage candidate consent requests</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingConsents ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : consents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <ShieldCheck className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p>No consent requests yet. Click "Request Consent" to get started.</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-3">
                      {consents.map((consent: any) => (
                        <div key={consent.id} className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/5">
                          <div>
                            <p className="font-medium">Candidate #{consent.candidateId?.slice(-6)}</p>
                            <p className="text-sm text-muted-foreground">
                              Requested: {new Date(consent.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge className={
                              consent.consentStatus === 'granted' ? 'bg-green-500/20 text-green-400' :
                              consent.consentStatus === 'denied' ? 'bg-red-500/20 text-red-400' :
                              'bg-yellow-500/20 text-yellow-400'
                            }>
                              {consent.consentStatus || 'pending'}
                            </Badge>
                            {consent.consentStatus === 'pending' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => sendConsentWhatsAppMutation.mutate(consent.id)}
                                disabled={sendConsentWhatsAppMutation.isPending}
                              >
                                <MessageCircle className="w-4 h-4 mr-1" />
                                Send WhatsApp
                              </Button>
                            )}
                            {consent.consentStatus === 'granted' && (
                              <Button
                                size="sm"
                                onClick={() => initiateScreeningMutation.mutate(consent.candidateId)}
                                disabled={initiateScreeningMutation.isPending}
                              >
                                <Brain className="w-4 h-4 mr-1" />
                                Start Screening
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="screenings" className="space-y-6">
            <Card className="border-white/10 bg-card/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="w-5 h-5 text-purple-400" />
                  All Screenings
                </CardTitle>
                <CardDescription>Complete list of social media screenings</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingFindings ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : findings.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Search className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p>No screenings completed yet.</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-4">
                      {findings.map((finding: any) => (
                        <motion.div
                          key={finding.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-5 rounded-lg bg-white/5 border border-white/5"
                        >
                          <div className="flex items-start justify-between">
                            <div className="space-y-2">
                              <div className="flex items-center gap-3">
                                <p className="font-medium text-lg">Candidate #{finding.candidateId?.slice(-6)}</p>
                                <Badge className={getRiskBadge(finding.riskLevel)}>
                                  {finding.riskLevel || 'Unknown'} Risk
                                </Badge>
                              </div>
                              
                              <div className="grid grid-cols-3 gap-4 text-sm">
                                <div>
                                  <span className="text-muted-foreground">Culture Fit:</span>
                                  <span className="ml-2 font-medium">{finding.cultureFitScore || 'N/A'}%</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Professionalism:</span>
                                  <span className="ml-2 font-medium">{finding.professionalismScore || 'N/A'}%</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Communication:</span>
                                  <span className="ml-2 font-medium">{finding.communicationScore || 'N/A'}%</span>
                                </div>
                              </div>
                              
                              {finding.aiSummary && (
                                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                                  {finding.aiSummary}
                                </p>
                              )}
                            </div>
                            
                            <div className="flex flex-col items-end gap-2">
                              <Badge className={
                                finding.aiRecommendation === 'proceed' ? 'bg-green-500/20 text-green-400' :
                                finding.aiRecommendation === 'review' ? 'bg-yellow-500/20 text-yellow-400' :
                                finding.aiRecommendation === 'caution' ? 'bg-orange-500/20 text-orange-400' :
                                'bg-red-500/20 text-red-400'
                              }>
                                AI: {finding.aiRecommendation || 'Pending'}
                              </Badge>
                              <Badge variant="outline" className={
                                finding.humanReviewStatus === 'approved' ? 'border-green-500 text-green-400' :
                                finding.humanReviewStatus === 'rejected' ? 'border-red-500 text-red-400' :
                                finding.humanReviewStatus === 'modified' ? 'border-blue-500 text-blue-400' :
                                'border-yellow-500 text-yellow-400'
                              }>
                                Review: {finding.humanReviewStatus}
                              </Badge>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reviews" className="space-y-6">
            <Card className="border-white/10 bg-card/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5 text-yellow-400" />
                  Pending Human Reviews
                </CardTitle>
                <CardDescription>Screenings requiring HR approval or modification</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingPending ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : pendingReviews.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p>No pending reviews. All screenings are up to date!</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {pendingReviews.map((finding: any) => (
                      <PendingReviewCard
                        key={finding.id}
                        finding={finding}
                        onSubmitReview={(decision, notes, adjustedRiskLevel, adjustedScore) => {
                          submitReviewMutation.mutate({
                            findingId: finding.id,
                            decision,
                            notes,
                            adjustedRiskLevel,
                            adjustedScore,
                          });
                        }}
                        isSubmitting={submitReviewMutation.isPending}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function PendingReviewCard({ 
  finding, 
  onSubmitReview,
  isSubmitting 
}: { 
  finding: any;
  onSubmitReview: (decision: string, notes: string, riskLevel?: string, score?: number) => void;
  isSubmitting: boolean;
}) {
  const [notes, setNotes] = useState("");
  const [adjustedRiskLevel, setAdjustedRiskLevel] = useState(finding.riskLevel);
  const [adjustedScore, setAdjustedScore] = useState(finding.cultureFitScore || 50);

  const getRiskBadge = (riskLevel: string) => {
    const styles: Record<string, string> = {
      low: "bg-green-500/20 text-green-400",
      medium: "bg-yellow-500/20 text-yellow-400",
      high: "bg-orange-500/20 text-orange-400",
      critical: "bg-red-500/20 text-red-400",
    };
    return styles[riskLevel] || "bg-gray-500/20 text-gray-400";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 rounded-lg bg-white/5 border border-white/10"
    >
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-lg font-medium">Candidate #{finding.candidateId?.slice(-6)}</h3>
          <p className="text-sm text-muted-foreground">
            Screened on {new Date(finding.createdAt).toLocaleDateString()}
          </p>
        </div>
        <Badge className={getRiskBadge(finding.riskLevel)}>
          AI Risk: {finding.riskLevel || 'Unknown'}
        </Badge>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="p-3 rounded-lg bg-white/5">
          <p className="text-sm text-muted-foreground">Overall Score</p>
          <p className="text-2xl font-bold">{finding.overallScore || 'N/A'}%</p>
        </div>
        <div className="p-3 rounded-lg bg-white/5">
          <p className="text-sm text-muted-foreground">Culture Fit</p>
          <p className="text-2xl font-bold">{finding.cultureFitScore || 'N/A'}%</p>
        </div>
        <div className="p-3 rounded-lg bg-white/5">
          <p className="text-sm text-muted-foreground">Professionalism</p>
          <p className="text-2xl font-bold">{finding.professionalismScore || 'N/A'}%</p>
        </div>
        <div className="p-3 rounded-lg bg-white/5">
          <p className="text-sm text-muted-foreground">Communication</p>
          <p className="text-2xl font-bold">{finding.communicationScore || 'N/A'}%</p>
        </div>
      </div>

      {finding.aiSummary && (
        <div className="mb-6 p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Brain className="w-4 h-4 text-purple-400" />
            <span className="font-medium text-purple-400">AI Summary</span>
          </div>
          <p className="text-sm">{finding.aiSummary}</p>
        </div>
      )}

      {finding.redFlags && finding.redFlags.length > 0 && (
        <div className="mb-6">
          <h4 className="font-medium text-red-400 mb-2">Red Flags ({finding.redFlags.length})</h4>
          <div className="space-y-2">
            {finding.redFlags.map((flag: any, i: number) => (
              <div key={i} className="p-3 rounded bg-red-500/10 border border-red-500/20 text-sm">
                <p className="font-medium">{flag.type}</p>
                <p className="text-muted-foreground">{flag.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {finding.positiveIndicators && finding.positiveIndicators.length > 0 && (
        <div className="mb-6">
          <h4 className="font-medium text-green-400 mb-2">Positive Indicators ({finding.positiveIndicators.length})</h4>
          <div className="space-y-2">
            {finding.positiveIndicators.map((indicator: any, i: number) => (
              <div key={i} className="p-3 rounded bg-green-500/10 border border-green-500/20 text-sm">
                <p className="font-medium">{indicator.type}</p>
                <p className="text-muted-foreground">{indicator.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="border-t border-white/10 pt-6 mt-6">
        <h4 className="font-medium mb-4">HR Review</h4>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="space-y-2">
            <Label>Adjusted Risk Level</Label>
            <Select value={adjustedRiskLevel} onValueChange={setAdjustedRiskLevel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>Adjusted Culture Fit Score ({adjustedScore}%)</Label>
            <Input
              type="range"
              min="0"
              max="100"
              value={adjustedScore}
              onChange={(e) => setAdjustedScore(Number(e.target.value))}
              className="w-full"
            />
          </div>
        </div>
        
        <div className="space-y-2 mb-4">
          <Label>Review Notes</Label>
          <Textarea
            placeholder="Add notes about your decision..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>
        
        <div className="flex gap-3">
          <Button
            className="bg-green-500 hover:bg-green-400 text-green-950"
            onClick={() => onSubmitReview('approved', notes, adjustedRiskLevel, adjustedScore)}
            disabled={isSubmitting}
          >
            <ThumbsUp className="w-4 h-4 mr-2" />
            Approve
          </Button>
          <Button
            variant="outline"
            onClick={() => onSubmitReview('modified', notes, adjustedRiskLevel, adjustedScore)}
            disabled={isSubmitting}
          >
            <Flag className="w-4 h-4 mr-2" />
            Approve with Changes
          </Button>
          <Button
            variant="destructive"
            onClick={() => onSubmitReview('rejected', notes, adjustedRiskLevel, adjustedScore)}
            disabled={isSubmitting}
          >
            <ThumbsDown className="w-4 h-4 mr-2" />
            Reject
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
