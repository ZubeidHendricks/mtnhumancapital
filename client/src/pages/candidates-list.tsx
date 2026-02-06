import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { candidateService, jobsService } from "@/lib/api";
import { useTenantQueryKey } from "@/hooks/useTenant";
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
  Briefcase,
  MessageSquare
} from "lucide-react";
import { motion } from "framer-motion";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// Helper to extract unique values from candidates
function extractUniqueSkills(candidates: any[]): string[] {
  const skillsSet = new Set<string>();
  candidates?.forEach(c => {
    if (c.skills && Array.isArray(c.skills)) {
      c.skills.forEach((skill: string) => skillsSet.add(skill));
    }
  });
  return Array.from(skillsSet).slice(0, 12);
}

function extractUniqueLocations(candidates: any[]): string[] {
  const locationsSet = new Set<string>();
  candidates?.forEach(c => {
    if (c.location) {
      locationsSet.add(c.location);
    }
    const metadata = c.metadata as any;
    if (metadata?.location) {
      locationsSet.add(metadata.location);
    }
  });
  return Array.from(locationsSet);
}

export default function CandidatesList() {
  const [location] = useLocation();
  const urlParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const jobIdFromUrl = urlParams.get('jobId');
  const candidateIdFromUrl = urlParams.get('candidateId');

  const [activeTab, setActiveTab] = useState("candidates");
  const [activeCriteria, setActiveCriteria] = useState<string[]>([]);
  const [locationFilter, setLocationFilter] = useState<string | null>(null);
  
  // Invite Dialog State
  const [inviteOpen, setInviteOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
  const [inviteLink, setInviteLink] = useState("");
  const [inviteChannel, setInviteChannel] = useState<"email" | "whatsapp">("email");
  const [sendingInvite, setSendingInvite] = useState(false);
  
  // Profile Dialog State
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileCandidate, setProfileCandidate] = useState<any>(null);
  
  // When viewing a specific candidate, we disable job filtering
  // effectiveJobId is null if candidateId is in URL (viewing specific candidate from any job)
  const [effectiveJobId, setEffectiveJobId] = useState<string | null>(candidateIdFromUrl ? null : jobIdFromUrl);

  // Sync effectiveJobId when URL changes (e.g., user navigates between jobs)
  useEffect(() => {
    // If navigating away from candidateId view back to a job view, restore job filtering
    if (!candidateIdFromUrl && jobIdFromUrl) {
      setEffectiveJobId(jobIdFromUrl);
    }
    // If navigating to a candidateId view, disable job filtering
    else if (candidateIdFromUrl) {
      setEffectiveJobId(null);
    }
    // If no job or candidate specified, show all
    else if (!candidateIdFromUrl && !jobIdFromUrl) {
      setEffectiveJobId(null);
    }
  }, [candidateIdFromUrl, jobIdFromUrl, location]);

  const queryClient = useQueryClient();
  const candidatesKey = useTenantQueryKey(['candidates']);
  const jobsKey = useTenantQueryKey(['jobs']);

  // Fetch candidates and jobs from API
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

  // Mutation to update candidate
  const updateCandidateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) => 
      candidateService.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: candidatesKey });
    },
  });

  // Mutation to delete candidate
  const deleteCandidateMutation = useMutation({
    mutationFn: (id: string) => candidateService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: candidatesKey });
    },
  });

  // Open profile dialog when candidateId is in URL - search in ALL candidates, not filtered ones
  useEffect(() => {
    if (candidateIdFromUrl && candidates && candidates.length > 0) {
      const targetCandidate = candidates.find((c: any) => c.id === candidateIdFromUrl);
      if (targetCandidate) {
        // Clear filters to ensure candidate is visible in the list
        setActiveCriteria([]);
        setLocationFilter(null);
        
        // Switch to the correct tab based on candidate's stage
        if (targetCandidate.stage === 'Shortlisted') {
          setActiveTab('shortlisted');
        } else {
          setActiveTab('candidates');
        }
        
        setProfileCandidate(targetCandidate);
        setProfileOpen(true);
      } else {
        // Candidate not found in current data
        toast.error('Candidate not found. They may have been removed.');
      }
    }
  }, [candidateIdFromUrl, candidates]);

  // Find the current job based on effective job ID (null when viewing specific candidate)
  const currentJob = useMemo(() => {
    if (!effectiveJobId || !jobs) return null;
    return jobs.find((job: any) => job.id === effectiveJobId);
  }, [effectiveJobId, jobs]);

  // Extract unique skills and locations from all candidates
  const allSkills = useMemo(() => extractUniqueSkills(candidates || []), [candidates]);
  const allLocations = useMemo(() => extractUniqueLocations(candidates || []), [candidates]);

  // Note: Skills filter starts empty - users add skills to filter by
  // This ensures all candidates are shown initially

  // Filter candidates by effectiveJobId, location, and skills
  const filteredCandidates = useMemo(() => {
    if (!candidates) return [];
    
    let filtered = candidates;
    
    // Filter by jobId if present (disabled when viewing specific candidate)
    if (effectiveJobId) {
      filtered = filtered.filter((c: any) => c.jobId === effectiveJobId);
    }
    
    // Filter by location if selected
    if (locationFilter) {
      filtered = filtered.filter((c: any) => {
        const candidateLocation = c.location || (c.metadata as any)?.location || '';
        return candidateLocation.toLowerCase().includes(locationFilter.toLowerCase());
      });
    }
    
    // Filter by active criteria/skills if any are selected
    if (activeCriteria.length > 0) {
      filtered = filtered.filter((c: any) => {
        // Candidates without skills don't match any skill filter
        if (!c.skills || !Array.isArray(c.skills) || c.skills.length === 0) return false;
        // Check if candidate has at least one of the selected skills
        return activeCriteria.some(criteria => 
          c.skills.some((skill: string) => 
            skill.toLowerCase().includes(criteria.toLowerCase()) ||
            criteria.toLowerCase().includes(skill.toLowerCase())
          )
        );
      });
    }
    
    return filtered;
  }, [candidates, effectiveJobId, locationFilter, activeCriteria]);

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
    // Default to WhatsApp if phone available, otherwise email
    if (candidate.phone || (candidate.metadata as any)?.phone) {
      setInviteChannel("whatsapp");
    } else if (candidate.email) {
      setInviteChannel("email");
    }
    setInviteOpen(true);
  };

  const handleSendInvite = async () => {
    if (inviteChannel === "email") {
      if (!selectedCandidate?.email) {
        toast.error(`Cannot send invitation: No email address on file for ${selectedCandidate?.fullName || 'this candidate'}`);
        return;
      }
      setInviteOpen(false);
      toast.success(`Interview invitation sent to ${selectedCandidate.email}`);
    } else {
      // WhatsApp
      const phone = selectedCandidate?.phone || (selectedCandidate?.metadata as any)?.phone;
      if (!phone) {
        toast.error(`Cannot send invitation: No phone number on file for ${selectedCandidate?.fullName || 'this candidate'}`);
        return;
      }
      
      setSendingInvite(true);
      try {
        // Create or get conversation for candidate
        const convResponse = await fetch(`/api/whatsapp/candidates/${selectedCandidate.id}/conversation`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            phone: phone.replace(/\D/g, ''),
            name: selectedCandidate.fullName 
          })
        });
        
        if (!convResponse.ok) throw new Error('Failed to create conversation');
        const conversation = await convResponse.json();
        
        // Send the message
        const message = `Dear ${selectedCandidate.fullName || 'Candidate'},

We are impressed with your profile and would like to invite you to an initial voice interview with our AI interview system.

Please click the link below to start the session:
${inviteLink}

Best regards,
AHC Recruiting Team`;

        const msgResponse = await fetch(`/api/whatsapp/conversations/${conversation.id}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ body: message })
        });
        
        if (!msgResponse.ok) throw new Error('Failed to send message');
        
        setInviteOpen(false);
        toast.success(`Interview invitation sent via WhatsApp to ${phone}`);
      } catch (error: any) {
        console.error('WhatsApp invite error:', error);
        toast.error('Failed to send WhatsApp invitation. Please try again.');
      } finally {
        setSendingInvite(false);
      }
    }
  };

  // Use real filtered candidates from API based on active tab
  const displayList = loadingCandidates ? [] : (activeTab === "candidates" ? regularCandidates : shortlistedCandidates);

  // Helper function to get source color based on source type
  const getSourceColor = (source: string) => {
    const sourceColors: Record<string, string> = {
      "Recruited": "text-blue-600 dark:text-blue-400 bg-blue-400/10",
      "Uploaded": "text-green-600 dark:text-green-400 bg-green-400/10",
      "Referral": "text-blue-600 dark:text-blue-400 bg-blue-400/10",
      "LinkedIn": "text-blue-500 bg-blue-500/10",
      "Direct": "text-yellow-600 dark:text-yellow-400 bg-yellow-400/10"
    };
    return sourceColors[source] || "text-gray-400 bg-gray-400/10";
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      
      <div className="flex-1 flex overflow-hidden pt-16">
        {/* LEFT PANEL: JOB CONFIGURATION */}
        <div className="w-[400px] border-r border-border bg-background flex flex-col h-full overflow-hidden">
          <div className="p-6 space-y-6 overflow-y-auto flex-1">
            
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/hr-dashboard">
                    <Button variant="ghost" size="icon" className="h-8 w-8 -ml-2 text-muted-foreground hover:text-foreground" data-testid="button-back-dashboard">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                {loadingJobs ? (
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                ) : currentJob ? (
                  <>
                    <div className="h-10 w-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
                        {currentJob.title.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h1 className="text-xl font-bold text-foreground">{currentJob.title}</h1>
                      <p className="text-xs text-muted-foreground">{currentJob.department}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="h-10 w-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
                        A
                    </div>
                    <h1 className="text-xl font-bold text-foreground">All Candidates</h1>
                  </>
                )}
            </div>

            {/* Job Details - Only show when filtering by job */}
            {currentJob && (
              <>
                {/* Feasibility Score */}
                <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-yellow-600 dark:text-yellow-400 font-medium">Feasible to hire</span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-yellow-400 w-3/4 rounded-full"></div>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>EXPECTED SALARY</span>
                        <span className="text-foreground">
                          {currentJob.salaryMin && currentJob.salaryMax 
                            ? `R ${currentJob.salaryMin.toLocaleString()} - R ${currentJob.salaryMax.toLocaleString()}`
                            : 'Not specified'}
                        </span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>TOTAL CANDIDATES</span>
                        <span className="text-foreground">{regularCandidates.length} active</span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>SHORTLISTED</span>
                        <span className="text-foreground">{shortlistedCandidates.length} candidates</span>
                    </div>
                </div>

                {/* Status Box */}
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 space-y-1">
                    <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-medium text-sm">
                        <Briefcase className="h-4 w-4" /> {currentJob.status}
                    </div>
                    <p className="text-xs text-blue-600/80 dark:text-blue-400/80">
                        Showing candidates matched to this role.
                    </p>
                </div>
              </>
            )}

            {/* Location */}
            <div className="space-y-4">
                <div className="text-xs font-bold text-muted-foreground tracking-wider">LOCATION FILTER</div>
                <div className="space-y-2">
                    {locationFilter && (
                      <div className="flex items-center justify-between text-sm text-foreground">
                          <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-primary" />
                              {locationFilter}
                          </div>
                          <X 
                            className="h-3 w-3 text-muted-foreground cursor-pointer hover:text-foreground" 
                            onClick={() => setLocationFilter(null)}
                            data-testid="button-clear-location"
                          />
                      </div>
                    )}
                    
                    {/* Location Selector */}
                    <div className="relative group">
                        <div className="flex items-center justify-between text-sm text-muted-foreground hover:text-foreground cursor-pointer border border-dashed border-border rounded px-2 py-1 hover:border-foreground/30">
                            <div className="flex items-center gap-2">
                                <Search className="h-3 w-3" />
                                {locationFilter ? 'Change location...' : 'Filter by location...'}
                            </div>
                            <ChevronDown className="h-3 w-3" />
                        </div>
                        
                        {/* Dropdown */}
                        <div className="hidden group-hover:block absolute top-full left-0 w-full mt-1 bg-card border border-border rounded shadow-xl z-10 max-h-40 overflow-y-auto">
                            {allLocations.length === 0 ? (
                              <div className="px-3 py-2 text-xs text-muted-foreground">No locations found</div>
                            ) : (
                              allLocations.filter(l => l !== locationFilter).map(loc => (
                                  <div 
                                      key={loc} 
                                      className="px-3 py-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
                                      onClick={() => setLocationFilter(loc)}
                                      data-testid={`location-option-${loc}`}
                                  >
                                      <MapPin className="h-3 w-3 inline mr-2" />
                                      {loc}
                                  </div>
                              ))
                            )}
                        </div>
                    </div>
                </div>
                {locationFilter && (
                  <div className="text-xs text-muted-foreground">
                      Showing {filteredCandidates.length} candidates in {locationFilter}
                  </div>
                )}
            </div>

            <Separator />

            {/* Criteria */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-muted-foreground tracking-wider">SKILLS FILTER</div>
                  {activeCriteria.length > 0 && (
                    <button 
                      className="text-[10px] text-primary hover:underline"
                      onClick={() => setActiveCriteria([])}
                      data-testid="button-clear-all-skills"
                    >
                      Clear all
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                    {activeCriteria.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No skills selected. Add skills below to filter candidates.</p>
                    ) : (
                      activeCriteria.map((criteria, i) => (
                          <div key={i} className="flex items-start gap-2 group" data-testid={`skill-filter-${i}`}>
                              <Check className="mt-0.5 w-3 h-3 text-primary" />
                              <span className="text-sm text-foreground flex-1 leading-tight">{criteria}</span>
                              <X 
                                  className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 cursor-pointer hover:text-foreground" 
                                  onClick={() => removeCriteria(i)}
                                  data-testid={`button-remove-skill-${i}`}
                              />
                          </div>
                      ))
                    )}
                </div>
                
                {/* Suggested skills from candidates */}
                {allSkills.filter(s => !activeCriteria.includes(s)).length > 0 && (
                  <div className="pt-2">
                     <div className="text-[10px] text-muted-foreground mb-2">AVAILABLE SKILLS</div>
                     <div className="flex flex-wrap gap-2">
                          {allSkills.filter(s => !activeCriteria.includes(s)).slice(0, 6).map((skill, i) => (
                            <Badge 
                              key={i}
                              variant="secondary" 
                              className="bg-muted hover:bg-muted/80 text-muted-foreground text-xs font-normal cursor-pointer border-border"
                              onClick={() => setActiveCriteria(prev => [...prev, skill])}
                              data-testid={`button-add-skill-${i}`}
                            >
                                {skill} <Plus className="h-3 w-3 ml-1 text-blue-600 dark:text-blue-400" />
                            </Badge>
                          ))}
                     </div>
                  </div>
                )}
            </div>

          </div>
        </div>

        {/* RIGHT PANEL: CANDIDATES LIST */}
        <div className="flex-1 bg-muted/30 flex flex-col h-full overflow-hidden">
            
            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
              <div className="border-b border-border px-6 bg-background">
                <TabsList className="h-14 bg-transparent border-0 p-0 gap-8">
                  <TabsTrigger 
                    value="candidates" 
                    className="h-14 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 text-sm font-medium text-muted-foreground data-[state=active]:text-foreground data-[state=active]:shadow-none"
                  >
                    Candidates
                    <span className="ml-2 text-xs bg-muted px-1.5 py-0.5 rounded-full">
                      {loadingCandidates ? '...' : regularCandidates.length}
                    </span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="shortlisted" 
                    className="h-14 rounded-none border-b-2 border-transparent data-[state=active]:border-yellow-400 data-[state=active]:bg-transparent px-2 text-sm font-medium text-muted-foreground data-[state=active]:text-foreground data-[state=active]:shadow-none"
                  >
                    Shortlisted
                    <span className="ml-2 text-xs bg-yellow-400/20 px-1.5 py-0.5 rounded-full text-yellow-600 dark:text-yellow-400">
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
                          <span className="text-foreground font-medium flex items-center gap-1 cursor-pointer">
                              All Stages <ChevronDown className="h-3 w-3" />
                          </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span className="text-muted-foreground">Match:</span>
                          <span className="text-green-600 dark:text-green-400 font-medium flex items-center gap-1 cursor-pointer">
                              All <ChevronDown className="h-3 w-3" />
                          </span>
                      </div>
                  </div>

                  {displayList.length > 0 && (
                      <Button 
                          size="sm" 
                          variant="outline"
                          className="gap-2 font-medium"
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
                            className="group flex items-center justify-between py-3 px-4 hover:bg-muted/50 rounded-lg transition-colors border border-transparent hover:border-border"
                        >
                            {/* Candidate Info */}
                            <Link href={`/candidates/${candidate.id}`} className="flex items-center gap-4 w-[30%] cursor-pointer">
                                <Avatar className="h-10 w-10 border border-border">
                                    <AvatarFallback className="bg-blue-600 text-white text-xs">
                                        {candidate.fullName?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) || 'NA'}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                    <h3 className="text-sm font-bold text-foreground truncate hover:underline">{candidate.fullName || 'Unknown'}</h3>
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
                                    <Mail className="h-3.5 w-3.5 text-muted-foreground cursor-pointer hover:text-primary" />
                                    <Phone className="h-3.5 w-3.5 text-muted-foreground cursor-pointer hover:text-primary" />
                                    <Linkedin className="h-3.5 w-3.5 text-muted-foreground cursor-pointer hover:text-primary" />
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2">
                                <Button 
                                    size="sm" 
                                    variant="outline"
                                    className="h-8 gap-1.5 font-medium text-xs px-3"
                                    onClick={() => handleAIContact(candidate)}
                                >
                                    <Bot className="h-3 w-3" />
                                    AI Interview
                                </Button>
                                <Button 
                                    size="sm" 
                                    className="h-8 bg-blue-600 hover:bg-blue-500 text-white border-0 gap-1.5 font-medium text-xs px-3"
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
                            <span className="text-foreground font-medium flex items-center gap-1 cursor-pointer">
                                All Stages <ChevronDown className="h-3 w-3" />
                            </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span className="text-muted-foreground">Match:</span>
                            <span className="text-green-600 dark:text-green-400 font-medium flex items-center gap-1 cursor-pointer">
                                All <ChevronDown className="h-3 w-3" />
                            </span>
                        </div>
                    </div>

                    {displayList.length > 0 && (
                        <Button 
                            size="sm" 
                            variant="outline"
                            className="gap-2 font-medium"
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
                              className="group flex items-center justify-between py-3 px-4 hover:bg-muted/50 rounded-lg transition-colors border border-transparent hover:border-border"
                          >
                              {/* Candidate Info */}
                              <Link href={`/candidates/${candidate.id}`} className="flex items-center gap-4 w-[30%] cursor-pointer">
                                  <Avatar className="h-10 w-10 border border-border">
                                      <AvatarFallback className="bg-blue-600 text-white text-xs">
                                          {candidate.fullName?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) || 'NA'}
                                      </AvatarFallback>
                                  </Avatar>
                                  <div className="min-w-0">
                                      <h3 className="text-sm font-bold text-foreground truncate hover:underline">{candidate.fullName || 'Unknown'}</h3>
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
                                      <Mail className="h-3.5 w-3.5 text-muted-foreground cursor-pointer hover:text-primary" />
                                      <Phone className="h-3.5 w-3.5 text-muted-foreground cursor-pointer hover:text-primary" />
                                      <Linkedin className="h-3.5 w-3.5 text-muted-foreground cursor-pointer hover:text-primary" />
                                  </div>
                              </div>

                              {/* Actions */}
                              <div className="flex items-center gap-2">
                                  <Button 
                                      size="sm" 
                                      variant="outline"
                                      className="h-8 gap-1.5 font-medium text-xs px-3"
                                      onClick={() => handleAIContact(candidate)}
                                  >
                                      <Bot className="h-3 w-3" />
                                      AI Interview
                                  </Button>
                                  <Button 
                                      size="sm" 
                                      variant="ghost"
                                      className="h-8 border-0 gap-1.5 font-medium text-xs px-3 text-muted-foreground hover:text-foreground"
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

      {/* Interview Invitation Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="bg-card border-border sm:max-w-[500px]">
            <DialogHeader>
                <DialogTitle>Invite to Voice Interview</DialogTitle>
                <DialogDescription>
                    Send an interview invitation to {selectedCandidate?.fullName || 'candidate'}.
                </DialogDescription>
            </DialogHeader>
            
            {/* Channel Selection */}
            <div className="flex gap-2 p-1 bg-muted rounded-lg" data-testid="container-invite-channel">
              <button
                onClick={() => setInviteChannel("email")}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  inviteChannel === "email" 
                    ? "bg-blue-600 text-white" 
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
                }`}
                data-testid="button-channel-email"
              >
                <Mail className="h-4 w-4" />
                Email
              </button>
              <button
                onClick={() => setInviteChannel("whatsapp")}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  inviteChannel === "whatsapp" 
                    ? "bg-green-600 text-white" 
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
                }`}
                data-testid="button-channel-whatsapp"
              >
                <MessageSquare className="h-4 w-4" />
                WhatsApp
              </button>
            </div>
            
            <div className="grid gap-4 py-4">
                {inviteChannel === "email" ? (
                  <>
                    <div className="grid gap-2">
                        <Label>Recipient Email</Label>
                        <Input 
                          value={selectedCandidate?.email || ""} 
                          disabled 
                          className="bg-muted border-border" 
                          placeholder={!selectedCandidate?.email ? "No email on file" : undefined}
                        />
                        {!selectedCandidate?.email && (
                          <p className="text-xs text-yellow-600 dark:text-yellow-400">This candidate has no email address on file.</p>
                        )}
                    </div>
                    
                    <div className="grid gap-2">
                        <Label>Subject</Label>
                        <Input defaultValue={`Interview Invitation: ${currentJob?.title || 'Position'}`} className="bg-muted border-border" />
                    </div>
                  </>
                ) : (
                  <div className="grid gap-2">
                      <Label>Phone Number</Label>
                      <Input 
                        value={selectedCandidate?.phone || (selectedCandidate?.metadata as any)?.phone || ""} 
                        disabled 
                        className="bg-muted border-border" 
                        placeholder={!(selectedCandidate?.phone || (selectedCandidate?.metadata as any)?.phone) ? "No phone on file" : undefined}
                      />
                      {!(selectedCandidate?.phone || (selectedCandidate?.metadata as any)?.phone) && (
                        <p className="text-xs text-yellow-600 dark:text-yellow-400">This candidate has no phone number on file.</p>
                      )}
                  </div>
                )}

                <div className="grid gap-2">
                    <Label>Message</Label>
                    <Textarea 
                        className="min-h-[150px] bg-muted border-border font-sans" 
                        defaultValue={`Dear ${selectedCandidate?.fullName || 'Candidate'},

We are impressed with your profile and would like to invite you to an initial voice interview with our AI interview system.

${inviteChannel === "email" ? "This allows us to get to know you better at your convenience. " : ""}Please click the link below to start the session:

${inviteLink}

Best regards,
AHC Recruiting Team`}
                    />
                </div>
            </div>

            <DialogFooter>
                <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
                <Button 
                  onClick={handleSendInvite} 
                  disabled={sendingInvite || (inviteChannel === "email" && !selectedCandidate?.email) || (inviteChannel === "whatsapp" && !(selectedCandidate?.phone || (selectedCandidate?.metadata as any)?.phone))}
                  className={`gap-2 ${inviteChannel === "whatsapp" ? "bg-green-600 hover:bg-green-500" : "bg-blue-600 hover:bg-blue-500"} text-white`}
                >
                    {sendingInvite ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : inviteChannel === "whatsapp" ? (
                      <MessageSquare className="h-4 w-4" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    {sendingInvite ? "Sending..." : `Send via ${inviteChannel === "whatsapp" ? "WhatsApp" : "Email"}`}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Candidate Profile Dialog */}
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden bg-card border-border" data-testid="dialog-candidate-profile">
          <DialogHeader className="border-b border-border pb-4">
            <DialogTitle className="text-xl flex items-center gap-3">
              <Avatar className="h-12 w-12 bg-gradient-to-br from-blue-500 to-blue-600">
                <AvatarFallback className="text-white text-lg font-bold bg-transparent">
                  {profileCandidate?.fullName?.split(' ').map((n: string) => n[0]).join('') || '?'}
                </AvatarFallback>
              </Avatar>
              <div>
                <span data-testid="text-profile-name">{profileCandidate?.fullName || 'Candidate'}</span>
                <p className="text-sm text-muted-foreground font-normal" data-testid="text-profile-role">{profileCandidate?.role || 'No role specified'}</p>
              </div>
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="max-h-[65vh] pr-4">
            <div className="space-y-6 py-4">
              {/* Match Score */}
              {profileCandidate?.match && (
                <div className="flex items-center gap-4 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400" data-testid="text-profile-match">
                    {profileCandidate.match}%
                  </div>
                  <div>
                    <p className="text-sm font-medium text-blue-600 dark:text-blue-400">AI Match Score</p>
                    <p className="text-xs text-muted-foreground">Based on job requirements and skill matching</p>
                  </div>
                </div>
              )}

              {/* Contact Information */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-muted border border-border">
                  <p className="text-xs text-muted-foreground mb-1">Email</p>
                  <p className="text-sm flex items-center gap-2 text-foreground" data-testid="text-profile-email">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    {profileCandidate?.email || 'Not provided'}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-muted border border-border">
                  <p className="text-xs text-muted-foreground mb-1">Phone</p>
                  <p className="text-sm flex items-center gap-2 text-foreground" data-testid="text-profile-phone">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    {profileCandidate?.phone || (profileCandidate?.metadata as any)?.phone || 'Not provided'}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-muted border border-border">
                  <p className="text-xs text-muted-foreground mb-1">Location</p>
                  <p className="text-sm flex items-center gap-2 text-foreground" data-testid="text-profile-location">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    {profileCandidate?.location || (profileCandidate?.metadata as any)?.location || 'Not specified'}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-muted border border-border">
                  <p className="text-xs text-muted-foreground mb-1">Stage</p>
                  <p className="text-sm" data-testid="text-profile-stage">
                    <Badge className={
                      profileCandidate?.stage === 'Shortlisted' ? 'bg-green-500/20 text-green-600 dark:text-green-400' :
                      profileCandidate?.stage === 'Interview' ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400' :
                      'bg-gray-500/20 text-gray-600 dark:text-gray-400'
                    }>
                      {profileCandidate?.stage || 'New'}
                    </Badge>
                  </p>
                </div>
              </div>

              {/* Skills */}
              {profileCandidate?.skills && (profileCandidate.skills as string[]).length > 0 && (
                <div className="p-4 rounded-lg bg-muted border border-border">
                  <p className="text-xs text-muted-foreground mb-3">Skills</p>
                  <div className="flex flex-wrap gap-2" data-testid="container-profile-skills">
                    {(profileCandidate.skills as string[]).map((skill: string, i: number) => (
                      <Badge key={i} variant="outline" className="bg-background border-border">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Experience */}
              {(profileCandidate?.metadata as any)?.experience && (
                <div className="p-4 rounded-lg bg-muted border border-border">
                  <p className="text-xs text-muted-foreground mb-2">Experience</p>
                  <p className="text-sm text-foreground" data-testid="text-profile-experience">
                    {(profileCandidate.metadata as any).experience}
                  </p>
                </div>
              )}

              {/* AI Reasoning */}
              {(profileCandidate?.metadata as any)?.aiReasoning && (
                <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <p className="text-xs text-blue-600 dark:text-blue-400 mb-2">AI Analysis</p>
                  <p className="text-sm text-foreground" data-testid="text-profile-ai-reasoning">
                    {(profileCandidate.metadata as any).aiReasoning}
                  </p>
                </div>
              )}

              {/* Source */}
              {profileCandidate?.source && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Source:</span>
                  <Badge className={getSourceColor(profileCandidate.source)} data-testid="badge-profile-source">
                    {profileCandidate.source}
                  </Badge>
                </div>
              )}
            </div>
          </ScrollArea>

          <DialogFooter className="border-t border-border pt-4">
            <Button variant="outline" onClick={() => setProfileOpen(false)}>
              Close
            </Button>
            <Button 
              onClick={() => {
                handleAIContact(profileCandidate);
                setProfileOpen(false);
              }} 
              className="bg-blue-600 hover:bg-blue-500 text-white gap-2"
            >
              <Bot className="h-4 w-4" /> Invite to Interview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
