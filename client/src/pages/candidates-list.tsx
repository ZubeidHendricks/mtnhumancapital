import { useState } from "react";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  ArrowLeft
} from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "wouter";

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
  const [activeTab, setActiveTab] = useState("Candidates");
  const [activeCriteria, setActiveCriteria] = useState(CRITERIA);
  const [activeCandidates, setActiveCandidates] = useState(CANDIDATES);
  const [shortlistedCount, setShortlistedCount] = useState(2);
  const [location, setLocation] = useState("Johannesburg, Gauteng");

  const removeCriteria = (index: number) => {
    setActiveCriteria(prev => prev.filter((_, i) => i !== index));
  };

  const handleShortlist = (id: number) => {
    setActiveCandidates(prev => prev.filter(c => c.id !== id));
    setShortlistedCount(prev => prev + 1);
  };

  const handleRemoveCandidate = (id: number) => {
    setActiveCandidates(prev => prev.filter(c => c.id !== id));
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
                    <Button variant="ghost" size="icon" className="h-8 w-8 -ml-2 text-muted-foreground hover:text-white">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div className="h-10 w-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
                    a
                </div>
                <h1 className="text-xl font-bold text-white">Senior Back-End Developer</h1>
            </div>

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
                    <span className="text-white">R 850,000 - R 1,200,000</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                    <span>EXPECTED CANDIDATES</span>
                    <span className="text-white">10-30 candidates</span>
                </div>
            </div>

            {/* Status Box */}
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 space-y-1">
                <div className="flex items-center gap-2 text-green-400 font-medium text-sm">
                    <Check className="h-4 w-4" /> Research complete
                </div>
                <p className="text-xs text-green-400/80">
                    We reassessed all the candidates and found 4 new ones.
                </p>
                <p className="text-[10px] text-muted-foreground">
                    AHC Deep Research ran for 28m 38s
                </p>
            </div>

            {/* Location */}
            <div className="space-y-4">
                <div className="text-xs font-bold text-muted-foreground tracking-wider">LOCATION</div>
                <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm text-gray-300">
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full border-2 border-gray-500"></div>
                            {location}
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
                            {SA_LOCATIONS.filter(l => l !== location).map(loc => (
                                <div 
                                    key={loc} 
                                    className="px-3 py-2 text-xs text-gray-400 hover:bg-white/10 hover:text-white cursor-pointer"
                                    onClick={() => setLocation(loc)}
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
            
            {/* Top Bar */}
            <div className="border-b border-white/10 px-6 h-14 flex items-center gap-8 bg-[#0a0a0a]">
                <button 
                    onClick={() => setActiveTab("Candidates")}
                    className={`h-full border-b-2 px-2 text-sm font-medium transition-colors ${activeTab === "Candidates" ? "border-white text-white" : "border-transparent text-muted-foreground"}`}
                >
                    Candidates <span className="ml-1 text-xs bg-white/10 px-1.5 py-0.5 rounded-full">{activeCandidates.length}</span>
                </button>
                <button 
                    onClick={() => setActiveTab("Shortlisted")}
                    className={`h-full border-b-2 px-2 text-sm font-medium transition-colors ${activeTab === "Shortlisted" ? "border-white text-white" : "border-transparent text-muted-foreground"}`}
                >
                    Shortlisted <span className="ml-1 text-xs bg-white/10 px-1.5 py-0.5 rounded-full">{shortlistedCount}</span>
                </button>
            </div>

            {/* Filters Bar */}
            <div className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        Talent pools
                        <span className="text-white font-medium flex items-center gap-1 cursor-pointer">
                            All <ChevronDown className="h-3 w-3" />
                        </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        Minimum match
                        <span className="text-green-400 font-medium flex items-center gap-1 cursor-pointer">
                            Good <ChevronDown className="h-3 w-3" />
                        </span>
                    </div>
                </div>
            </div>

            {/* List */}
            <ScrollArea className="flex-1 px-6 pb-6">
                <div className="space-y-1">
                    {activeCandidates.map((candidate) => (
                        <motion.div 
                            key={candidate.id}
                            layout
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="group flex items-center justify-between py-3 px-4 hover:bg-white/5 rounded-lg transition-colors border border-transparent hover:border-white/5"
                        >
                            {/* Candidate Info */}
                            <div className="flex items-center gap-4 w-[30%]">
                                <Avatar className="h-10 w-10 border border-white/10">
                                    <AvatarImage src={candidate.avatar} />
                                    <AvatarFallback className="bg-indigo-500 text-white text-xs">
                                        {candidate.name.split(' ').map(n => n[0]).join('')}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                    <h3 className="text-sm font-bold text-white truncate">{candidate.name}</h3>
                                    <p className="text-xs text-muted-foreground truncate">{candidate.role}</p>
                                </div>
                            </div>

                            {/* Badges & Source */}
                            <div className="flex items-center gap-8 flex-1">
                                <div className="flex items-center gap-2 min-w-[120px]">
                                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded flex items-center gap-1.5 ${candidate.sourceColor}`}>
                                        <div className="w-1 h-1 rounded-full bg-current" />
                                        {candidate.source}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                        <div className="w-3 h-3 rounded-full border border-current opacity-50" />
                                        {candidate.status}
                                    </span>
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
                                    className="h-8 bg-indigo-600 hover:bg-indigo-500 text-white border-0 gap-1.5 font-medium text-xs px-3"
                                    onClick={() => handleShortlist(candidate.id)}
                                >
                                    <ThumbsUp className="h-3 w-3" />
                                    Shortlist
                                </Button>
                                <Button 
                                    size="icon" 
                                    variant="ghost" 
                                    className="h-8 w-8 text-muted-foreground hover:text-white hover:bg-white/10"
                                    onClick={() => handleRemoveCandidate(candidate.id)}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        </motion.div>
                    ))}
                    
                    {activeCandidates.length === 0 && (
                        <div className="text-center py-20 text-muted-foreground">
                            <p>No candidates remaining in this view.</p>
                            <Button 
                                variant="link" 
                                className="text-indigo-400 text-xs"
                                onClick={() => setActiveCandidates(CANDIDATES)}
                            >
                                Reset List
                            </Button>
                        </div>
                    )}
                </div>
            </ScrollArea>

        </div>
      </div>
    </div>
  );
}
