import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Menu, X, Cpu, LayoutDashboard, Building2, Mic, Video, ChevronDown, UserSearch, Shield, Settings, Users, Briefcase } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api } from "@/lib/api";

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  const { data: tenantConfig } = useQuery({
    queryKey: ["tenant-config"],
    queryFn: async () => {
      try {
        const response = await api.get("/tenant-config");
        return response.data;
      } catch {
        return null;
      }
    },
    retry: false,
  });

  const isModuleEnabled = (moduleKey: string) => {
    if (!tenantConfig?.modulesEnabled) return true;
    return tenantConfig.modulesEnabled[moduleKey] !== false;
  };

  const navLinks = [
    { name: "Solutions", href: "/#solutions" },
    { name: "Platform", href: "/#platform" },
    { name: "About", href: "#about" },
    { name: "Contact", href: "#contact" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-background/80 backdrop-blur-md">
      <div className="container mx-auto px-6 h-20 flex items-center justify-between">
        {/* Logo */}
        <Link href="/">
          <div className="flex items-center gap-2 group cursor-pointer">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 group-hover:border-primary/50 transition-colors">
              <Cpu className="w-6 h-6 text-primary" />
            </div>
            <div className="flex flex-col">
              <span className="font-display font-bold text-xl tracking-tight leading-none">AHC</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest leading-none">Avatar Human Capital</span>
            </div>
          </div>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <a 
              key={link.name} 
              href={link.href}
              className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
            >
              {link.name}
            </a>
          ))}
          
          <div className="h-6 w-px bg-white/10 mx-2" />

          {/* Features Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-white hover:bg-white/5 gap-1">
                Features <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-zinc-950 border-white/10 text-zinc-200">
              {isModuleEnabled("recruitment") && (
                <Link href="/recruitment-agent">
                  <DropdownMenuItem className="cursor-pointer hover:bg-white/10 focus:bg-white/10">
                    <UserSearch className="w-4 h-4 mr-2 text-purple-400" />
                    <span>AI Recruitment</span>
                  </DropdownMenuItem>
                </Link>
              )}
              {isModuleEnabled("integrity") && (
                <Link href="/integrity-agent">
                  <DropdownMenuItem className="cursor-pointer hover:bg-white/10 focus:bg-white/10">
                    <Shield className="w-4 h-4 mr-2 text-blue-400" />
                    <span>Integrity Checks</span>
                  </DropdownMenuItem>
                </Link>
              )}
              {isModuleEnabled("onboarding") && (
                <Link href="/onboarding">
                  <DropdownMenuItem className="cursor-pointer hover:bg-white/10 focus:bg-white/10">
                    <Building2 className="w-4 h-4 mr-2 text-green-400" />
                    <span>Employee Onboarding</span>
                  </DropdownMenuItem>
                </Link>
              )}
              {isModuleEnabled("hr_management") && (
                <Link href="/hr-dashboard">
                  <DropdownMenuItem className="cursor-pointer hover:bg-white/10 focus:bg-white/10">
                    <Users className="w-4 h-4 mr-2 text-amber-400" />
                    <span>HR Management</span>
                  </DropdownMenuItem>
                </Link>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Interviews Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-white hover:bg-white/5 gap-1">
                Interviews <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-zinc-950 border-white/10 text-zinc-200">
              <Link href="/interview/voice">
                <DropdownMenuItem className="cursor-pointer hover:bg-white/10 focus:bg-white/10">
                  <Mic className="w-4 h-4 mr-2 text-indigo-400" />
                  <span>Voice Interview</span>
                </DropdownMenuItem>
              </Link>
              <Link href="/interview/video">
                <DropdownMenuItem className="cursor-pointer hover:bg-white/10 focus:bg-white/10">
                  <Video className="w-4 h-4 mr-2 text-rose-400" />
                  <span>Video Interview</span>
                </DropdownMenuItem>
              </Link>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Dashboards Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-white hover:bg-white/5 gap-1">
                Dashboards <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-zinc-950 border-white/10 text-zinc-200">
              <Link href="/candidate-pipeline">
                <DropdownMenuItem className="cursor-pointer hover:bg-white/10 focus:bg-white/10">
                  <Briefcase className="w-4 h-4 mr-2 text-cyan-400" />
                  <span>Candidate Pipeline</span>
                </DropdownMenuItem>
              </Link>
              <Link href="/executive-dashboard">
                <DropdownMenuItem className="cursor-pointer hover:bg-white/10 focus:bg-white/10">
                  <LayoutDashboard className="w-4 h-4 mr-2 text-emerald-400" />
                  <span>Executive Dashboard</span>
                </DropdownMenuItem>
              </Link>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Admin Link */}
          <Link href="/admin-dashboard">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary hover:bg-primary/10">
              <Settings className="w-4 h-4 mr-1" />
              Admin
            </Button>
          </Link>

          <Link href="/login">
            <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_-5px_hsl(var(--primary)/0.5)]">
              Sign In
            </Button>
          </Link>
        </div>

        {/* Mobile Menu Toggle */}
        <button 
          className="md:hidden text-foreground"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Nav */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-background border-b border-white/10 overflow-hidden"
          >
            <div className="flex flex-col p-6 gap-4">
              {navLinks.map((link) => (
                <a 
                  key={link.name} 
                  href={link.href}
                  className="text-lg font-medium text-foreground/80 hover:text-primary"
                  onClick={() => setIsOpen(false)}
                >
                  {link.name}
                </a>
              ))}
              <div className="h-px bg-white/10 my-2" />
              
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-2">Features</p>
              {isModuleEnabled("recruitment") && (
                <Link href="/recruitment-agent">
                  <Button variant="ghost" className="w-full justify-start mb-2 gap-2">
                    <UserSearch className="w-4 h-4" /> AI Recruitment
                  </Button>
                </Link>
              )}
              {isModuleEnabled("integrity") && (
                <Link href="/integrity-agent">
                  <Button variant="ghost" className="w-full justify-start mb-2 gap-2">
                    <Shield className="w-4 h-4" /> AI Integrity Checks
                  </Button>
                </Link>
              )}
              {isModuleEnabled("onboarding") && (
                <Link href="/onboarding">
                  <Button variant="ghost" className="w-full justify-start mb-2 gap-2">
                    <Building2 className="w-4 h-4" /> Employee Onboarding
                  </Button>
                </Link>
              )}
              {isModuleEnabled("hr_management") && (
                <Link href="/hr-dashboard">
                  <Button variant="ghost" className="w-full justify-start mb-2 gap-2">
                    <Users className="w-4 h-4" /> HR Management
                  </Button>
                </Link>
              )}

              <div className="h-px bg-white/10 my-2" />
              
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-2">Interviews</p>
              <Link href="/interview/voice">
                <Button variant="ghost" className="w-full justify-start mb-2 gap-2">
                  <Mic className="w-4 h-4" /> Voice Interview
                </Button>
              </Link>
              <Link href="/interview/video">
                <Button variant="ghost" className="w-full justify-start mb-2 gap-2">
                  <Video className="w-4 h-4" /> Video Interview
                </Button>
              </Link>

              <div className="h-px bg-white/10 my-2" />
              
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-2">Dashboards</p>
              <Link href="/candidate-pipeline">
                <Button variant="ghost" className="w-full justify-start mb-2 gap-2">
                  <Briefcase className="w-4 h-4" /> Candidate Pipeline
                </Button>
              </Link>
              <Link href="/executive-dashboard">
                <Button variant="ghost" className="w-full justify-start mb-2 gap-2">
                  <LayoutDashboard className="w-4 h-4" /> Executive Dashboard
                </Button>
              </Link>

              <div className="h-px bg-white/10 my-2" />
              
              <Link href="/admin-dashboard">
                <Button variant="ghost" className="w-full justify-start mb-2 gap-2">
                  <Settings className="w-4 h-4" /> Admin Settings
                </Button>
              </Link>
              <Link href="/login">
                <Button className="w-full bg-primary text-primary-foreground">Sign In</Button>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}