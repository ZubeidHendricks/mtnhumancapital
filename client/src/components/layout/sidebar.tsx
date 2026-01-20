import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { 
  LayoutDashboard, 
  UserSearch, 
  Users, 
  Briefcase,
  TrendingUp,
  Shield,
  Building2,
  FileText,
  MessageCircle,
  Target,
  BarChart3,
  Star,
  UserCheck,
  Settings,
  BookOpen,
  Mic,
  Video,
  ClipboardList,
  Sparkles,
  LayoutGrid,
  UserPlus,
  Truck,
  ChevronLeft,
  ChevronRight,
  Bot,
  Cpu
} from "lucide-react";
import { useTenant } from "@/hooks/useTenant";
import { ThemeToggle } from "@/components/ui/theme-toggle";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  module?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export function Sidebar() {
  const [location] = useLocation();
  const { isModuleEnabled } = useTenant();
  const [collapsed, setCollapsed] = useState(false);

  const sections: NavSection[] = [
    {
      title: "DASHBOARD",
      items: [
        { name: "Executive Pulse", href: "/", icon: LayoutDashboard },
      ]
    },
    {
      title: "RECRUITMENT",
      items: [
        { name: "AI Recruitment", href: "/recruitment-agent", icon: UserSearch, module: "recruitment" },
        { name: "Candidate Pipeline", href: "/candidate-pipeline", icon: Briefcase },
        { name: "Pipeline Board", href: "/pipeline-board", icon: LayoutGrid },
        { name: "Import Candidates", href: "/external-candidates", icon: UserPlus },
        { name: "Interview Console", href: "/interview-console", icon: ClipboardList },
      ]
    },
    {
      title: "INTERVIEWS",
      items: [
        { name: "Voice Interview", href: "/interview/voice", icon: Mic },
        { name: "Video Interview", href: "/interview/video", icon: Video },
      ]
    },
    {
      title: "HR MANAGEMENT",
      items: [
        { name: "HR Dashboard", href: "/hr-dashboard", icon: Users, module: "hr_management" },
        { name: "Integrity Checks", href: "/integrity-agent", icon: Shield, module: "integrity" },
        { name: "Onboarding", href: "/onboarding", icon: Building2, module: "onboarding" },
        { name: "Time & Attendance", href: "/hr-dashboard?tab=time-attendance", icon: Cpu },
      ]
    },
    {
      title: "PERFORMANCE & ANALYTICS",
      items: [
        { name: "KPI Management", href: "/kpi-management", icon: Target },
        { name: "My KPI Review", href: "/kpi-review", icon: Star },
        { name: "Manager Review", href: "/kpi-manager-review", icon: UserCheck },
        { name: "HR Performance", href: "/kpi-hr-dashboard", icon: BarChart3 },
        { name: "Workforce Intelligence", href: "/workforce-intelligence", icon: TrendingUp },
        { name: "Recruitment Dashboard", href: "/recruitment-dashboard", icon: TrendingUp },
      ]
    },
    {
      title: "DOCUMENTS",
      items: [
        { name: "Document Automation", href: "/document-automation", icon: FileText },
        { name: "Document Library", href: "/document-library", icon: ClipboardList },
        { name: "CV Templates", href: "/cv-templates", icon: FileText },
      ]
    },
    {
      title: "COMMUNICATIONS",
      items: [
        { name: "WhatsApp Monitor", href: "/whatsapp-monitor", icon: MessageCircle },
        { name: "Conversations", href: "/hr-conversations", icon: MessageCircle },
      ]
    },
    {
      title: "AI & AUTOMATION",
      items: [
        { name: "AI Recommendations", href: "/recommendations", icon: Sparkles },
        { name: "Dashboard Builder", href: "/dashboard-builder", icon: LayoutGrid },
      ]
    },
    {
      title: "FLEET LOGIX",
      items: [
        { name: "Fleet Dashboard", href: "/fleetlogix", icon: Truck },
      ]
    },
    {
      title: "ADMIN",
      items: [
        { name: "System Admin", href: "/admin-dashboard", icon: Settings },
        { name: "Tenant Management", href: "/tenant-management", icon: Building2 },
        { name: "Tenant Requests", href: "/tenant-requests", icon: FileText },
        { name: "Persona Management", href: "/persona-management", icon: Users },
        { name: "Platform Docs", href: "/platform-docs", icon: BookOpen },
      ]
    },
  ];

  const isActive = (href: string) => {
    if (href === "/") return location === "/";
    return location.startsWith(href);
  };

  return (
    <aside className={cn(
      "fixed left-0 top-0 h-screen bg-card border-r border-border flex flex-col transition-all duration-300 z-50",
      collapsed ? "w-16" : "w-60"
    )}>
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-border">
        {!collapsed && (
          <Link href="/">
            <img 
              src="/logos/light-logo.png" 
              alt="AHC" 
              className="h-10 w-auto object-contain"
            />
          </Link>
        )}
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        {sections.map((section) => {
          const visibleItems = section.items.filter(item => 
            !item.module || isModuleEnabled(item.module)
          );
          
          if (visibleItems.length === 0) return null;

          return (
            <div key={section.title} className="mb-4">
              {!collapsed && (
                <h3 className="px-3 mb-2 text-[10px] font-semibold text-muted-foreground tracking-wider uppercase">
                  {section.title}
                </h3>
              )}
              <ul className="space-y-0.5">
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  
                  return (
                    <li key={item.href}>
                      <Link href={item.href}>
                        <div className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer group relative",
                          active 
                            ? "bg-primary/10 text-primary" 
                            : "text-muted-foreground hover:bg-accent hover:text-foreground"
                        )}>
                          {active && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" />
                          )}
                          <Icon className={cn(
                            "w-4 h-4 flex-shrink-0",
                            active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                          )} />
                          {!collapsed && <span>{item.name}</span>}
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-border flex items-center justify-center">
        <ThemeToggle />
      </div>
    </aside>
  );
}
