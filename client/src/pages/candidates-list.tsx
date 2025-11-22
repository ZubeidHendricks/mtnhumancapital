import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { candidateService, jobsService } from "@/lib/api";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  MapPin, 
  Plus, 
  X, 
  Check, 
  MoreHorizontal, 
  Filter, 
  ChevronDown, 
  Mail, 
  Phone, 
  Linkedin, 
  ThumbsUp, 
  Search,
  ArrowLeft,
  Bot,
  Send,
  Copy,
  Loader2,
  Briefcase
} from "lucide-react";
import { motion } from "framer-motion";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// Mock Data based on the screenshot
const CRITERIA = [
  "Software architecture for complex enterprises and platforms",
  "React and Redux",
  "Strong communication skills",
  "5+ years of project management experience",
  "3+ years of experience in B2B SaaS",
  "Ability to work in team",
  "API development and integration expertise",
  "CSS Flexbox and Grid"
];

const CANDIDATES = [
  {
    id: 1,
    name: "Sarah Summers",
    role: "Head of Development at Salt",
    avatar: "/avatars/01.png",
    source: "Recruited",
    sourceColor: "text-blue-400 bg-blue-400/10",
    match: "High",
    status: "inbound"
  },
  {
    id: 2,
    name: "Alex Winters",
    role: "Senior Backend Engineer at TechCorp",
    avatar: "/avatars/02.png",
    source: "Recruited",
    sourceColor: "text-blue-400 bg-blue-400/10",
    match: "High",
    status: "inbound"
  },
  {
    id: 3,
    name: "Frank Springs",
    role: "Tech Lead at StartupIO",
    avatar: "/avatars/03.png",
    source: "Manually added",
    sourceColor: "text-yellow-400 bg-yellow-400/10",
    match: "Medium",
    status: "outbound"
  },
  {
    id: 4,
    name: "Sarah Summers",
    role: "Head of Development at Salt",
    avatar: "/avatars/04.png",
    source: "Headhunter",
    sourceColor: "text-red-400 bg-red-400/10",
    match: "High",
    status: "inbound"
  },
  {
    id: 5,
    name: "Jelmer Peerbolte",
    role: "Full Stack Dev at Agency",
    avatar: "/avatars/05.png",
    source: "Recruitee",
    sourceColor: "text-blue-400 bg-blue-400/10",
    match: "Good",
    status: "inbound"
  },
  {
    id: 6,
    name: "Avery Public",
    role: "Software Engineer at BigTech",
    avatar: "/avatars/06.png",
    source: "AHC Public",
    sourceColor: "text-purple-400 bg-purple-400/10",
    match: "High",
    status: "inbound"
  }
];

const MOCK_SHORTLISTED = [
    {
        id: 101,
        name: "Zubeid Hendricks",
        role: "Senior Backend Developer",
        avatar: "",
        source: "Uploaded",
        sourceColor: "text-green-400 bg-green-400/10",
        match: "Very High",
        status: "shortlisted"
    },
    {
        id: 102,
        name: "Thandiwe Nkosi",
        role: "Tech Lead",
        avatar: "",
        source: "Referral",
        sourceColor: "text-purple-400 bg-purple-400/10",
        match: "High",
        status: "shortlisted"
    }
];

const SA_LOCATIONS = [
  "Cape Town, Western Cape",
  "Johannesburg, Gauteng",
  "Durban, Gauteng",
  "Pretoria, KwaZulu-Natal",
  "Stellenbosch, Western Cape",
  "Sandton, Gauteng",
  "Centurion, Gauteng"
];

export default function CandidatesList() {
  const [location] = useLocation();
  const urlParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const jobId = urlParams.get('jobId');

  const [activeTab, setActiveTab] = useState("candidates");
  const [activeCriteria, setActiveCriteria] = useState(CRITERIA);
  const [locationFilter, setLocationFilter] = useState("Johannesburg, Gauteng");
  
  // Invite Dialog State
  const [inviteOpen, setInviteOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
  const [inviteLink, setInviteLink] = useState("");

  const queryClient = useQueryClient();

  // Fetch candidates and jobs from API
  const { data: candidates, isLoading: loadingCandidates } = useQuery({
    queryKey: ['candidates'],
    queryFn: candidateService.getAll,
    retry: 1,
  });

  const { data: jobs, isLoading: loadingJobs } = useQuery({
    queryKey: ['jobs'],
    queryFn: jobsService.getAll,
    retry: 1,
  });

  // Mutation to update candidate
  const updateCandidateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) => 
      candidateService.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
    },
  });

  // Mutation to delete candidate
  const deleteCandidateMutation = useMutation({
    mutationFn: (id: string) => candidateService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
    },
  });

  // Find the current job if jobId is present
  const currentJob = useMemo(() => {
    if (!jobId || !jobs) return null;
    return jobs.find((job: any) => job.id === jobId);
  }, [jobId, jobs]);

  // Filter candidates by jobId if present
  const filteredCandidates = useMemo(() => {
    if (!candidates) return [];
    if (!jobId) return candidates;
    return candidates.filter((c: any) => c.jobId === jobId);
  }, [candidates, jobId]);

  // Separate candidates by tab
  const regularCandidates = useMemo(() => {
    return filteredCandidates.filter((c: any) => c.stage !== "Shortlisted");
  }, [filteredCandidates]);

  const shortlistedCandidates = useMemo(() => {
    return filteredCandidates.filter((c: any) => c.stage === "Shortlisted");
  }, [filteredCandidates]);

  const removeCriteria = (index: number) => {
    setActiveCriteria(prev => prev.filter((_, i) => i !== index));
  };

  const handleShortlist = async (id: string) => {
    const candidate = filteredCandidates.find(c => c.id === id);
    if (candidate) {
      try {
        await updateCandidateMutation.mutateAsync({
          id,
          updates: { stage: "Shortlisted" }
        });
        toast.success(`${candidate.fullName} moved to shortlisted`);
      } catch (error) {
        toast.error("Failed to shortlist candidate");
      }
    }
  };

  const handleRemoveCandidate = async (id: string) => {
    try {
      await deleteCandidateMutation.mutateAsync(id);
      toast.success("Candidate removed");
    } catch (error) {
      toast.error("Failed to remove candidate");
    }
  };

  const handleAIContact = (candidate: any) => {
    setSelectedCandidate(candidate);
    setInviteLink(`${window.location.origin}/interview/voice?candidate=${encodeURIComponent(candidate.fullName || 'candidate')}`);
    setInviteOpen(true);
  };

  const handleSendInvite = () => {
    if (!selectedCandidate?.email) {
      toast.error(`Cannot send invitation: No email address on file for ${selectedCandidate?.fullName || 'this candidate'}`);
      return;
    }
    setInviteOpen(false);
    toast.success(`Interview invitation sent to ${selectedCandidate.email}`);
  };

  // Use real filtered candidates from API based on active tab
  const displayList = loadingCandidates ? [] : (activeTab === "candidates" ? regularCandidates : shortlistedCandidates);

  // Helper function to get source color based on source type
  const getSourceColor = (source: string) => {
    const sourceColors: Record<string, string> = {
      "Recruited": "text-blue-400 bg-blue-400/10",
      "Uploaded": "text-green-400 bg-green-400/10",
      "Referral": "text-purple-400 bg-purple-400/10",
      "LinkedIn": "text-blue-500 bg-blue-500/10",
      "Direct": "text-yellow-400 bg-yellow-400/10"
    };
    return sourceColors[source] || "text-gray-400 bg-gray-400/10";
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-foreground flex flex-col">
      <Navbar />
      
      <div className="flex-1 flex overflow-hidden pt-16">
        {/* LEFT PANEL: JOB CONFIGURATION */}
        <div className="w-[400px] border-r border-white/10 bg-[#0a0a0a] flex flex-col h-full overflow-hidden">
          <div className="p-6 space-y-6 overflow-y-auto flex-1">
            
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/hr-dashboard">
                    <Button variant="ghost" size="icon" className="h-8 w-8 -ml-2 text-muted-foreground hover:text-white" data-testid="button-back-dashboard">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                {loadingJobs ? (
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                ) : currentJob ? (
                  <>
                    <div className="h-10 w-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
                        {currentJob.title.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h1 className="text-xl font-bold text-white">{currentJob.title}</h1>
                      <p className="text-xs text-muted-foreground">{currentJob.department}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="h-10 w-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
                        A
                    </div>
                    <h1 className="text-xl font-bold text-white">All Candidates</h1>
                  </>
                )}
            </div>

            {/* Job Details - Only show when filtering by job */}
            {currentJob && (
              <>
                {/* Feasibility Score */}
                <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-yellow-400 font-medium">Feasible to hire</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-yellow-400 w-3/4 rounded-full"></div>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>EXPECTED SALARY</span>
                        <span className="text-white">
                          {currentJob.salaryMin && currentJob.salaryMax 
                            ? `R ${currentJob.salaryMin.toLocaleString()} - R ${currentJob.salaryMax.toLocaleString()}`
                            : 'Not specified'}
                        </span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>TOTAL CANDIDATES</span>
                        <span className="text-white">{regularCandidates.length} active</span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>SHORTLISTED</span>
                        <span className="text-white">{shortlistedCandidates.length} candidates</span>
                    </div>
                </div>

                {/* Status Box */}
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 space-y-1">
                    <div className="flex items-center gap-2 text-blue-400 font-medium text-sm">
                        <Briefcase className="h-4 w-4" /> {currentJob.status}
                    </div>
                    <p className="text-xs text-blue-400/80">
                        Showing candidates matched to this role.
                    </p>
                </div>
              </>
            )}

            {/* Location */}
            <div className="space-y-4">
                <div className="text-xs font-bold text-muted-foreground tracking-wider">LOCATION</div>
                <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm text-gray-300">
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full border-2 border-gray-500"></div>
                            {locationFilter}
                        </div>
                        <X className="h-3 w-3 text-muted-foreground cursor-pointer" />
                    </div>
                    
                    {/* Mock Location Selector */}
                    <div className="relative group">
                        <div className="flex items-center justify-between text-sm text-muted-foreground hover:text-white cursor-pointer border border-dashed border-white/10 rounded px-2 py-1 hover:border-white/30">
                            <div className="flex items-center gap-2">
                                <Search className="h-3 w-3" />
                                Add another location...
                            </div>
                            <Plus className="h-3 w-3" />
                        </div>
                        
                        {/* Dropdown (simulated) */}
                        <div className="hidden group-hover:block absolute top-full left-0 w-full mt-1 bg-[#1a1a1a] border border-white/10 rounded shadow-xl z-10 max-h-40 overflow-y-auto">
                            {SA_LOCATIONS.filter(l => l !== locationFilter).map(loc => (
                                <div 
                                    key={loc} 
                                    className="px-3 py-2 text-xs text-gray-400 hover:bg-white/10 hover:text-white cursor-pointer"
                                    onClick={() => setLocationFilter(loc)}
                                >
                                    {loc}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground pl-6">
                    <span>50km</span>
                    <div className="flex flex-col gap-0.5">
                        <div className="h-0.5 w-2 bg-gray-600"></div>
                        <div className="h-0.5 w-2 bg-gray-600"></div>
                    </div>
                </div>
            </div>

            <Separator className="bg-white/10" />

            {/* Criteria */}
            <div className="space-y-4">
                <div className="text-xs font-bold text-muted-foreground tracking-wider">CRITERIA</div>
                <div className="space-y-2">
                    {activeCriteria.map((criteria, i) => (
                        <div key={i} className="flex items-start gap-2 group">
                            <div className={`mt-1 w-2 h-2 rounded-full ${i < 3 ? 'bg-white' : 'bg-yellow-400'}`}></div>
                            <span className="text-sm text-gray-300 flex-1 leading-tight">{criteria}</span>
                            <X 
                                className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 cursor-pointer hover:text-white" 
                                onClick={() => removeCriteria(i)}
                            />
                        </div>
                    ))}
                </div>
                
                <div className="pt-2">
                   <div className="text-[10px] text-muted-foreground mb-2">YOU MIGHT WANT TO ADD</div>
                   <div className="flex gap-2">
                        <Badge variant="secondary" className="bg-white/5 hover:bg-white/10 text-gray-400 text-xs font-normal cursor-pointer border-white/10">
                            CSS Flexbox and Grid <Plus className="h-3 w-3 ml-1 text-indigo-400" />
                        </Badge>
                        <Badge variant="secondary" className="bg-white/5 hover:bg-white/10 text-gray-400 text-xs font-normal cursor-pointer border-white/10">
                            JS <Plus className="h-3 w-3 ml-1 text-indigo-400" />
                        </Badge>
                   </div>
                </div>
            </div>

          </div>
        </div>

        {/* RIGHT PANEL: CANDIDATES LIST */}
        <div className="flex-1 bg-[#0F0F0F] flex flex-col h-full overflow-hidden">
            
            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
              <div className="border-b border-white/10 px-6 bg-[#0a0a0a]">
                <TabsList className="h-14 bg-transparent border-0 p-0 gap-8">
                  <TabsTrigger 
                    value="candidates" 
                    className="h-14 rounded-none border-b-2 border-transparent data-[state=active]:border-white data-[state=active]:bg-transparent px-2 text-sm font-medium text-muted-foreground data-[state=active]:text-white data-[state=active]:shadow-none"
                  >
                    Candidates
                    <span className="ml-2 text-xs bg-white/10 px-1.5 py-0.5 rounded-full">
                      {loadingCandidates ? '...' : regularCandidates.length}
                    </span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="shortlisted" 
                    className="h-14 rounded-none border-b-2 border-transparent data-[state=active]:border-yellow-400 data-[state=active]:bg-transparent px-2 text-sm font-medium text-muted-foreground data-[state=active]:text-white data-[state=active]:shadow-none"
                  >
                    Shortlisted
                    <span className="ml-2 text-xs bg-yellow-400/20 px-1.5 py-0.5 rounded-full text-yellow-400">
                      {loadingCandidates ? '...' : shortlistedCandidates.length}
                    </span>
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="candidates" className="flex-1 flex flex-col m-0">
                {/* Filters Bar */}
                <div className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span className="text-muted-foreground">Stage:</span>
                          <span className="text-white font-medium flex items-center gap-1 cursor-pointer">
                              All Stages <ChevronDown className="h-3 w-3" />
                          </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span className="text-muted-foreground">Match:</span>
                          <span className="text-green-400 font-medium flex items-center gap-1 cursor-pointer">
                              All <ChevronDown className="h-3 w-3" />
                          </span>
                      </div>
                  </div>

                  {displayList.length > 0 && (
                      <Button 
                          size="sm" 
                          className="bg-white text-black hover:bg-gray-200 gap-2 font-medium"
                          onClick={() => toast.success("AI Agent will interview all candidates")}
                      >
                          <Bot className="h-4 w-4" />
                          Interview All ({displayList.length})
                      </Button>
                  )}
              </div>

              {/* List */}
              <ScrollArea className="flex-1 px-6 pb-6">
                <div className="space-y-1">
                    {loadingCandidates ? (
                        <div className="flex flex-col items-center justify-center h-64 gap-2 text-muted-foreground">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            <p>Loading candidates...</p>
                        </div>
                    ) : displayList.map((candidate) => (
                        <motion.div 
                            key={candidate.id}
                            layout
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="group flex items-center justify-between py-3 px-4 hover:bg-white/5 rounded-lg transition-colors border border-transparent hover:border-white/5"
                        >
                            {/* Candidate Info */}
                            <Link href={`/candidates/${candidate.id}`} className="flex items-center gap-4 w-[30%] cursor-pointer">
                                <Avatar className="h-10 w-10 border border-white/10">
                                    <AvatarFallback className="bg-indigo-500 text-white text-xs">
                                        {candidate.fullName?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) || 'NA'}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                    <h3 className="text-sm font-bold text-white truncate hover:underline">{candidate.fullName || 'Unknown'}</h3>
                                    <p className="text-xs text-muted-foreground truncate">{candidate.role || 'No role specified'}</p>
                                </div>
                            </Link>

                            {/* Badges & Source */}
                            <div className="flex items-center gap-8 flex-1">
                                <div className="flex items-center gap-2 min-w-[120px]">
                                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded flex items-center gap-1.5 ${getSourceColor(candidate.source)}`}>
                                        <div className="w-1 h-1 rounded-full bg-current" />
                                        {candidate.source}
                                    </span>
                                    <Badge variant="outline" className="text-[10px] h-5 px-2">
                                        {candidate.match}% Match
                                    </Badge>
                                </div>

                                {/* Contact Icons */}
                                <div className="flex items-center gap-3 opacity-40 group-hover:opacity-100 transition-opacity">
                                    <Mail className="h-3.5 w-3.5 text-white cursor-pointer hover:text-primary" />
                                    <Phone className="h-3.5 w-3.5 text-white cursor-pointer hover:text-primary" />
                                    <Linkedin className="h-3.5 w-3.5 text-white cursor-pointer hover:text-primary" />
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2">
                                <Button 
                                    size="sm" 
                                    className="h-8 bg-white text-black hover:bg-gray-200 border-0 gap-1.5 font-medium text-xs px-3"
                                    onClick={() => handleAIContact(candidate)}
                                >
                                    <Bot className="h-3 w-3" />
                                    AI Interview
                                </Button>
                                <Button 
                                    size="sm" 
                                    className="h-8 bg-indigo-600 hover:bg-indigo-500 text-white border-0 gap-1.5 font-medium text-xs px-3"
                                    onClick={() => handleShortlist(candidate.id)}
                                >
                                    <ThumbsUp className="h-3 w-3" />
                                    Shortlist
                                </Button>
                            </div>
                        </motion.div>
                    ))}
                    
                    {!loadingCandidates && displayList.length === 0 && (
                        <div className="text-center py-20 text-muted-foreground">
                            <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p className="text-lg font-medium">No candidates found</p>
                            <p className="text-sm mt-2">
                                {currentJob 
                                    ? `No candidates have been matched to ${currentJob.title} yet.` 
                                    : 'No candidates in the system yet.'}
                            </p>
                            <Link href="/hr-dashboard">
                                <Button variant="link" className="text-primary mt-4">
                                    <ArrowLeft className="h-4 w-4 mr-2" />
                                    Back to Dashboard
                                </Button>
                            </Link>
                        </div>
                    )}
                </div>
              </ScrollArea>
              </TabsContent>

              <TabsContent value="shortlisted" className="flex-1 flex flex-col m-0">
                {/* Filters Bar */}
                <div className="px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span className="text-muted-foreground">Stage:</span>
                            <span className="text-white font-medium flex items-center gap-1 cursor-pointer">
                                All Stages <ChevronDown className="h-3 w-3" />
                            </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span className="text-muted-foreground">Match:</span>
                            <span className="text-green-400 font-medium flex items-center gap-1 cursor-pointer">
                                All <ChevronDown className="h-3 w-3" />
                            </span>
                        </div>
                    </div>

                    {displayList.length > 0 && (
                        <Button 
                            size="sm" 
                            className="bg-white text-black hover:bg-gray-200 gap-2 font-medium"
                            onClick={() => toast.success("AI Agent will interview all shortlisted candidates")}
                        >
                            <Bot className="h-4 w-4" />
                            Interview All ({displayList.length})
                        </Button>
                    )}
                </div>

                {/* List */}
                <ScrollArea className="flex-1 px-6 pb-6">
                  <div className="space-y-1">
                      {loadingCandidates ? (
                          <div className="flex flex-col items-center justify-center h-64 gap-2 text-muted-foreground">
                              <Loader2 className="w-8 h-8 animate-spin text-primary" />
                              <p>Loading candidates...</p>
                          </div>
                      ) : displayList.map((candidate) => (
                          <motion.div 
                              key={candidate.id}
                              layout
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, x: -20 }}
                              className="group flex items-center justify-between py-3 px-4 hover:bg-white/5 rounded-lg transition-colors border border-transparent hover:border-white/5"
                          >
                              {/* Candidate Info */}
                              <Link href={`/candidates/${candidate.id}`} className="flex items-center gap-4 w-[30%] cursor-pointer">
                                  <Avatar className="h-10 w-10 border border-white/10">
                                      <AvatarFallback className="bg-indigo-500 text-white text-xs">
                                          {candidate.fullName?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) || 'NA'}
                                      </AvatarFallback>
                                  </Avatar>
                                  <div className="min-w-0">
                                      <h3 className="text-sm font-bold text-white truncate hover:underline">{candidate.fullName || 'Unknown'}</h3>
                                      <p className="text-xs text-muted-foreground truncate">{candidate.role || 'No role specified'}</p>
                                  </div>
                              </Link>

                              {/* Badges & Source */}
                              <div className="flex items-center gap-8 flex-1">
                                  <div className="flex items-center gap-2 min-w-[120px]">
                                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded flex items-center gap-1.5 ${getSourceColor(candidate.source)}`}>
                                          <div className="w-1 h-1 rounded-full bg-current" />
                                          {candidate.source}
                                      </span>
                                      <Badge variant="outline" className="text-[10px] h-5 px-2">
                                          {candidate.match}% Match
                                      </Badge>
                                  </div>

                                  {/* Contact Icons */}
                                  <div className="flex items-center gap-3 opacity-40 group-hover:opacity-100 transition-opacity">
                                      <Mail className="h-3.5 w-3.5 text-white cursor-pointer hover:text-primary" />
                                      <Phone className="h-3.5 w-3.5 text-white cursor-pointer hover:text-primary" />
                                      <Linkedin className="h-3.5 w-3.5 text-white cursor-pointer hover:text-primary" />
                                  </div>
                              </div>

                              {/* Actions */}
                              <div className="flex items-center gap-2">
                                  <Button 
                                      size="sm" 
                                      className="h-8 bg-white text-black hover:bg-gray-200 border-0 gap-1.5 font-medium text-xs px-3"
                                      onClick={() => handleAIContact(candidate)}
                                  >
                                      <Bot className="h-3 w-3" />
                                      AI Interview
                                  </Button>
                                  <Button 
                                      size="sm" 
                                      variant="ghost"
                                      className="h-8 border-0 gap-1.5 font-medium text-xs px-3 text-muted-foreground hover:text-white"
                                      onClick={() => handleRemoveCandidate(candidate.id)}
                                  >
                                      <X className="h-3 w-3" />
                                      Remove
                                  </Button>
                              </div>
                          </motion.div>
                      ))}
                      
                      {!loadingCandidates && displayList.length === 0 && (
                          <div className="text-center py-20 text-muted-foreground">
                              <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
                              <p className="text-lg font-medium">No shortlisted candidates yet</p>
                              <p className="text-sm mt-2">
                                  Click "Shortlist" on candidates to move them here.
                              </p>
                          </div>
                      )}
                  </div>
                </ScrollArea>
              </TabsContent>

            </Tabs>

        </div>
      </div>

      {/* Email Invitation Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="bg-[#1a1a1a] border-white/10 text-white sm:max-w-[500px]">
            <DialogHeader>
                <DialogTitle>Invite to Voice Interview</DialogTitle>
                <DialogDescription className="text-gray-400">
                    Customize the email invitation for {selectedCandidate?.fullName || 'candidate'}.
                </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                    <Label>Recipient</Label>
                    <Input value={selectedCandidate?.email || selectedCandidate?.fullName || ""} disabled className="bg-black/50 border-white/10" />
                </div>
                
                <div className="grid gap-2">
                    <Label>Subject</Label>
                    <Input defaultValue={`Interview Invitation: ${currentJob?.title || 'Position'}`} className="bg-black/50 border-white/10" />
                </div>

                <div className="grid gap-2">
                    <Label>Message</Label>
                    <Textarea 
                        className="min-h-[150px] bg-black/50 border-white/10 font-sans" 
                        defaultValue={`Dear ${selectedCandidate?.fullName || 'Candidate'},

We are impressed with your profile and would like to invite you to an initial voice interview with our AI recruiter, Chit-Chet.

This allows us to get to know you better at your convenience. Please click the link below to start the session:

${inviteLink}

Best regards,
AHC Recruiting Team`}
                    />
                </div>
            </div>

            <DialogFooter>
                <Button variant="outline" onClick={() => setInviteOpen(false)} className="border-white/10 hover:bg-white/5">Cancel</Button>
                <Button onClick={handleSendInvite} className="bg-indigo-600 hover:bg-indigo-500 gap-2">
                    <Send className="h-4 w-4" /> Send Invitation
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
