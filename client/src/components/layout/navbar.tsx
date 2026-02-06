import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Menu, X, Cpu, LayoutDashboard, Building2, Mic, Video, ChevronDown, UserSearch, Shield, Settings, Users, Briefcase, TrendingUp, FileText, MessageCircle, ClipboardList, Sparkles, Target, Star, UserCheck, BarChart3, BookOpen, LayoutGrid, UserPlus } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTenant } from "@/hooks/useTenant";
import { TenantSelector } from "@/components/admin/TenantSelector";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { tenant, isModuleEnabled } = useTenant();
  const [location] = useLocation();
  
  // Show tenant selector on admin pages
  const isAdminPage = location.startsWith('/admin-') || location === '/persona-management' || location === '/tenant-management' || location === '/tenant-requests';

  const navLinks = [
    { name: "Solutions", href: "/#solutions" },
    { name: "Platform", href: "/#platform" },
    { name: "About", href: "#about" },
    { name: "Contact", href: "#contact" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/95 backdrop-blur-md">
      <div className="container mx-auto px-4 md:px-6 flex items-center justify-between h-16 md:h-20">
        {/* Logo - Brand guideline: 20mm minimum height with clearspace = height/2 */}
        <Link href="/">
          <div className="flex items-center group cursor-pointer">
            <img 
              src="/logos/light-logo.png" 
              alt="Avatar Human Capital" 
              className="h-10 md:h-16 w-auto object-contain"
            />
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
          
          <div className="h-6 w-px bg-border mx-2" />

          {/* Features Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground hover:bg-accent gap-1">
                Features <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-popover border-border text-popover-foreground">
              {isModuleEnabled("recruitment") && (
                <Link href="/recruitment-agent">
                  <DropdownMenuItem className="cursor-pointer hover:bg-accent focus:bg-accent">
                    <UserSearch className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" />
                    <span>AI Recruitment</span>
                  </DropdownMenuItem>
                </Link>
              )}
              <Link href="/external-candidates">
                <DropdownMenuItem className="cursor-pointer hover:bg-accent focus:bg-accent">
                  <UserPlus className="w-4 h-4 mr-2 text-teal-600 dark:text-teal-400" />
                  <span>Import Candidates</span>
                </DropdownMenuItem>
              </Link>
              {isModuleEnabled("integrity") && (
                <Link href="/integrity-agent">
                  <DropdownMenuItem className="cursor-pointer hover:bg-accent focus:bg-accent">
                    <Shield className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" />
                    <span>Integrity Checks</span>
                  </DropdownMenuItem>
                </Link>
              )}
              {isModuleEnabled("onboarding") && (
                <Link href="/onboarding">
                  <DropdownMenuItem className="cursor-pointer hover:bg-accent focus:bg-accent">
                    <Building2 className="w-4 h-4 mr-2 text-green-600 dark:text-green-400" />
                    <span>Company Onboarding</span>
                  </DropdownMenuItem>
                </Link>
              )}
              {isModuleEnabled("hr_management") && (
                <Link href="/hr-dashboard">
                  <DropdownMenuItem className="cursor-pointer hover:bg-accent focus:bg-accent">
                    <LayoutDashboard className="w-4 h-4 mr-2 text-amber-600 dark:text-amber-400" />
                    <span>HR Dashboard</span>
                  </DropdownMenuItem>
                </Link>
              )}
              <Link href="/dashboard-builder">
                <DropdownMenuItem className="cursor-pointer hover:bg-accent focus:bg-accent">
                  <LayoutGrid className="w-4 h-4 mr-2 text-pink-600 dark:text-pink-400" />
                  <span>Dashboard Builder</span>
                </DropdownMenuItem>
              </Link>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuLabel className="text-xs text-muted-foreground">HR Management</DropdownMenuLabel>
              <Link href="/kpi-hr-dashboard">
                <DropdownMenuItem className="cursor-pointer hover:bg-accent focus:bg-accent">
                  <Target className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" />
                  <span>Performance</span>
                </DropdownMenuItem>
              </Link>
              <Link href="/hr-dashboard?tab=time-attendance">
                <DropdownMenuItem className="cursor-pointer hover:bg-accent focus:bg-accent">
                  <Cpu className="w-4 h-4 mr-2 text-green-600 dark:text-green-400" />
                  <span>Time & Attendance</span>
                </DropdownMenuItem>
              </Link>
              <Link href="/workforce-intelligence">
                <DropdownMenuItem className="cursor-pointer hover:bg-accent focus:bg-accent">
                  <TrendingUp className="w-4 h-4 mr-2 text-amber-600 dark:text-amber-400" />
                  <span>Workforce Intelligence</span>
                </DropdownMenuItem>
              </Link>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuLabel className="text-xs text-muted-foreground">Documents</DropdownMenuLabel>
              <Link href="/document-automation">
                <DropdownMenuItem className="cursor-pointer hover:bg-accent focus:bg-accent">
                  <FileText className="w-4 h-4 mr-2 text-cyan-600 dark:text-cyan-400" />
                  <span>Document Automation</span>
                </DropdownMenuItem>
              </Link>
              <Link href="/document-library">
                <DropdownMenuItem className="cursor-pointer hover:bg-accent focus:bg-accent">
                  <ClipboardList className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" />
                  <span>Document Library</span>
                </DropdownMenuItem>
              </Link>
              <Link href="/cv-templates">
                <DropdownMenuItem className="cursor-pointer hover:bg-accent focus:bg-accent">
                  <FileText className="w-4 h-4 mr-2 text-teal-700 dark:text-teal-400" />
                  <span>CV Templates</span>
                </DropdownMenuItem>
              </Link>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuLabel className="text-xs text-muted-foreground">Communications</DropdownMenuLabel>
              <Link href="/whatsapp-monitor">
                <DropdownMenuItem className="cursor-pointer hover:bg-accent focus:bg-accent">
                  <MessageCircle className="w-4 h-4 mr-2 text-green-600 dark:text-green-400" />
                  <span>WhatsApp Monitor</span>
                </DropdownMenuItem>
              </Link>
              <Link href="/hr-conversations">
                <DropdownMenuItem className="cursor-pointer hover:bg-accent focus:bg-accent">
                  <MessageCircle className="w-4 h-4 mr-2 text-teal-600 dark:text-teal-400" />
                  <span>Conversations</span>
                </DropdownMenuItem>
              </Link>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuLabel className="text-xs text-muted-foreground">Support</DropdownMenuLabel>
              <Link href="/ai-support">
                <DropdownMenuItem className="cursor-pointer hover:bg-accent focus:bg-accent">
                  <Sparkles className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" />
                  <span>AI Support</span>
                </DropdownMenuItem>
              </Link>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Interviews Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground hover:bg-accent gap-1">
                Interviews <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-popover border-border text-popover-foreground">
              <Link href="/interview/voice">
                <DropdownMenuItem className="cursor-pointer hover:bg-accent focus:bg-accent">
                  <Mic className="w-4 h-4 mr-2 text-indigo-600 dark:text-indigo-400" />
                  <span>Voice Interview</span>
                </DropdownMenuItem>
              </Link>
              <Link href="/interview/video">
                <DropdownMenuItem className="cursor-pointer hover:bg-accent focus:bg-accent">
                  <Video className="w-4 h-4 mr-2 text-rose-600 dark:text-rose-400" />
                  <span>Video Interview</span>
                </DropdownMenuItem>
              </Link>
              <DropdownMenuSeparator className="bg-border" />
              <Link href="/interview-console">
                <DropdownMenuItem className="cursor-pointer hover:bg-accent focus:bg-accent">
                  <ClipboardList className="w-4 h-4 mr-2 text-amber-600 dark:text-amber-400" />
                  <span>Interview Console</span>
                </DropdownMenuItem>
              </Link>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Dashboards Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground hover:bg-accent gap-1">
                Dashboards <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-popover border-border text-popover-foreground">
              <Link href="/recruitment-dashboard">
                <DropdownMenuItem className="cursor-pointer hover:bg-accent focus:bg-accent">
                  <TrendingUp className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" />
                  <span>Recruitment Dashboard</span>
                </DropdownMenuItem>
              </Link>
              <Link href="/candidate-pipeline">
                <DropdownMenuItem className="cursor-pointer hover:bg-accent focus:bg-accent">
                  <Briefcase className="w-4 h-4 mr-2 text-cyan-600 dark:text-cyan-400" />
                  <span>Candidate Pipeline</span>
                </DropdownMenuItem>
              </Link>
              <Link href="/pipeline-board">
                <DropdownMenuItem className="cursor-pointer hover:bg-accent focus:bg-accent">
                  <LayoutGrid className="w-4 h-4 mr-2 text-indigo-600 dark:text-indigo-400" />
                  <span>Pipeline Board</span>
                </DropdownMenuItem>
              </Link>
              <Link href="/whatsapp-monitor">
                <DropdownMenuItem className="cursor-pointer hover:bg-accent focus:bg-accent">
                  <MessageCircle className="w-4 h-4 mr-2 text-green-600 dark:text-green-400" />
                  <span>WhatsApp Monitor</span>
                </DropdownMenuItem>
              </Link>
              <Link href="/kpi-management">
                <DropdownMenuItem className="cursor-pointer hover:bg-accent focus:bg-accent">
                  <Target className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" />
                  <span>KPI Management</span>
                </DropdownMenuItem>
              </Link>
              <Link href="/kpi-review">
                <DropdownMenuItem className="cursor-pointer hover:bg-accent focus:bg-accent">
                  <Star className="w-4 h-4 mr-2 text-yellow-600 dark:text-yellow-400" />
                  <span>My KPI Review</span>
                </DropdownMenuItem>
              </Link>
              <a href="http://165.227.113.197" target="_blank" rel="noopener noreferrer">
                <DropdownMenuItem className="cursor-pointer hover:bg-accent focus:bg-accent">
                  <BookOpen className="w-4 h-4 mr-2 text-teal-700 dark:text-teal-400" />
                  <span>Learning Management</span>
                </DropdownMenuItem>
              </a>
              <Link href="/kpi-manager-review">
                <DropdownMenuItem className="cursor-pointer hover:bg-accent focus:bg-accent">
                  <UserCheck className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" />
                  <span>Manager Review</span>
                </DropdownMenuItem>
              </Link>
              <Link href="/kpi-hr-dashboard">
                <DropdownMenuItem className="cursor-pointer hover:bg-accent focus:bg-accent">
                  <BarChart3 className="w-4 h-4 mr-2 text-green-600 dark:text-green-400" />
                  <span>HR Performance Dashboard</span>
                </DropdownMenuItem>
              </Link>
              <DropdownMenuSeparator className="bg-border" />
              <Link href="/recommendations">
                <DropdownMenuItem className="cursor-pointer hover:bg-accent focus:bg-accent">
                  <Sparkles className="w-4 h-4 mr-2 text-amber-600 dark:text-amber-400" />
                  <span>AI Recommendations</span>
                </DropdownMenuItem>
              </Link>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Admin Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground hover:bg-accent gap-1">
                <Settings className="w-4 h-4 mr-1" />
                Admin <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-popover border-border text-popover-foreground">
              <Link href="/admin-dashboard">
                <DropdownMenuItem className="cursor-pointer hover:bg-accent focus:bg-accent">
                  <Settings className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" />
                  <span>System Administration</span>
                </DropdownMenuItem>
              </Link>
              <Link href="/tenant-management">
                <DropdownMenuItem className="cursor-pointer hover:bg-accent focus:bg-accent">
                  <Building2 className="w-4 h-4 mr-2 text-teal-700 dark:text-teal-400" />
                  <span>Tenant Management</span>
                </DropdownMenuItem>
              </Link>
              <Link href="/tenant-requests">
                <DropdownMenuItem className="cursor-pointer hover:bg-accent focus:bg-accent">
                  <FileText className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" />
                  <span>Tenant Requests</span>
                </DropdownMenuItem>
              </Link>
              <Link href="/persona-management">
                <DropdownMenuItem className="cursor-pointer hover:bg-accent focus:bg-accent">
                  <Users className="w-4 h-4 mr-2 text-green-600 dark:text-green-400" />
                  <span>Persona Management</span>
                </DropdownMenuItem>
              </Link>
              <DropdownMenuSeparator className="bg-border" />
              <Link href="/platform-docs">
                <DropdownMenuItem className="cursor-pointer hover:bg-accent focus:bg-accent">
                  <BookOpen className="w-4 h-4 mr-2 text-cyan-600 dark:text-cyan-400" />
                  <span>Platform Documentation</span>
                </DropdownMenuItem>
              </Link>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Tenant Selector - Show on admin pages */}
          {isAdminPage && (
            <TenantSelector currentTenant={tenant} />
          )}

          {/* Theme Toggle */}
          <ThemeToggle />

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
            className="md:hidden bg-background border-b border-border overflow-hidden"
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
              <div className="h-px bg-border my-2" />
              
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
                    <Building2 className="w-4 h-4" /> Company Onboarding
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

              <div className="h-px bg-border my-2" />
              
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
              <Link href="/interview-console">
                <Button variant="ghost" className="w-full justify-start mb-2 gap-2">
                  <ClipboardList className="w-4 h-4" /> Interview Console
                </Button>
              </Link>

              <div className="h-px bg-border my-2" />
              
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-2">Dashboards</p>
              <Link href="/candidate-pipeline">
                <Button variant="ghost" className="w-full justify-start mb-2 gap-2">
                  <Briefcase className="w-4 h-4" /> Candidate Pipeline
                </Button>
              </Link>
              <Link href="/whatsapp-monitor">
                <Button variant="ghost" className="w-full justify-start mb-2 gap-2">
                  <MessageCircle className="w-4 h-4" /> WhatsApp Monitor
                </Button>
              </Link>
              <Link href="/recommendations">
                <Button variant="ghost" className="w-full justify-start mb-2 gap-2">
                  <Sparkles className="w-4 h-4" /> AI Recommendations
                </Button>
              </Link>

              <div className="h-px bg-border my-2" />
              
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-2">Admin</p>
              <Link href="/admin-dashboard">
                <Button variant="ghost" className="w-full justify-start mb-2 gap-2">
                  <Settings className="w-4 h-4" /> System Administration
                </Button>
              </Link>
              <Link href="/tenant-requests">
                <Button variant="ghost" className="w-full justify-start mb-2 gap-2">
                  <FileText className="w-4 h-4" /> Tenant Requests
                </Button>
              </Link>
              <Link href="/persona-management">
                <Button variant="ghost" className="w-full justify-start mb-2 gap-2">
                  <Users className="w-4 h-4" /> Persona Management
                </Button>
              </Link>
              
              <div className="h-px bg-border my-2" />
              
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