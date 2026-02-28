import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";
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
  Cpu,
} from "lucide-react";
import { useTenant } from "@/hooks/useTenant";
import { ThemeToggle } from "@/components/ui/theme-toggle";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  module?: string;
  external?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const [location] = useLocation();
  const { isModuleEnabled } = useTenant();
  const navRef = useRef<HTMLElement>(null);

  // Auto-scroll sidebar to show the active nav item when route changes
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    // Small delay to let DOM update with the active indicator
    const timer = setTimeout(() => {
      const activeEl = nav.querySelector('[data-active="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [location]);

  const sections: NavSection[] = [
    {
      title: "INTELLIGENCE",
      items: [
        { name: "MTN-GPT", href: "/ai-support", icon: Bot },
        { name: "Executive Dashboard", href: "/executive-dashboard-custom", icon: TrendingUp },
        { name: "Reports", href: "/recruitment-dashboard", icon: BarChart3 },
        { name: "WhatsApp Monitor", href: "/whatsapp-monitor", icon: MessageCircle },
      ]
    },
    {
      title: "RECRUITMENT",
      items: [
        { name: "Command Centre", href: "/hr-dashboard", icon: Users, module: "hr_management" },
        { name: "AI Recruitment", href: "/recruitment-agent", icon: UserSearch, module: "recruitment" },
        { name: "Voice Interview", href: "/interview/voice", icon: Mic },
        { name: "Video Interview", href: "/interview/video", icon: Video },
        { name: "Face-to-Face Interview", href: "/interview/face-to-face", icon: Users },
        { name: "Interview Console", href: "/interview-console", icon: ClipboardList },
        { name: "Pipeline Board", href: "/pipeline-board", icon: LayoutGrid },
      ]
    },
    {
      title: "SETUP",
      items: [
        { name: "Recruitment Setup", href: "/recruitment-setup", icon: Settings },
        { name: "Integrity Setup", href: "/integrity-setup", icon: Shield, module: "integrity" },
        { name: "Offer Setup", href: "/offer-setup", icon: FileText },
        { name: "Onboarding Setup", href: "/onboarding-setup", icon: Building2, module: "onboarding" },
        { name: "Document Automation", href: "/document-automation", icon: FileText },
        { name: "Document Library", href: "/document-library", icon: ClipboardList },
      ]
    },
    {
      title: "ADMIN",
      items: [
        { name: "System Admin", href: "/admin-dashboard", icon: Settings },
        { name: "Customer Onboarding", href: "/onboarding", icon: UserPlus },
        { name: "Persona Management", href: "/persona-management", icon: Users },
        { name: "Platform Docs", href: "/platform-docs", icon: BookOpen },
      ]
    },
  ];

  const isActive = (href: string) => {
    if (href === "/") return location === "/";
    return location === href || location.startsWith(href + "/");
  };

  return (
    <aside className={cn(
      "sidebar-nav fixed left-0 top-0 h-screen bg-card border-r border-border flex flex-col transition-all duration-300 z-50",
      collapsed ? "w-16" : "w-60"
    )}>
      {/* Logo */}
      <div className="flex flex-col border-b border-border">
        {!collapsed && (
          <Link href="/" className="px-4 pt-4 pb-2">
            <img
              src="/logos/mtn-new-logo.svg"
              alt="MTN"
              className="w-full object-contain"
            />
          </Link>
        )}
        <div className={`flex items-center ${collapsed ? 'justify-center py-3' : 'justify-end px-2 pb-2'}`}>
          <button
            onClick={onToggle}
            className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav ref={navRef} className="flex-1 overflow-y-auto py-4 px-2">
        {sections.map((section) => {
          const visibleItems = section.items.filter(item => 
            !item.module || isModuleEnabled(item.module)
          );
          
          if (visibleItems.length === 0) return null;

          return (
            <div key={section.title} className="mb-4">
              {!collapsed && (
                <h3 className="px-3 mb-2 text-[10px] font-bold text-foreground/60 tracking-wider uppercase">
                  {section.title}
                </h3>
              )}
              <ul className="space-y-0.5">
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  
                  return (
                    <li key={item.href}>
                      {item.external ? (
                        <a href={item.href} target="_blank" rel="noopener noreferrer">
                          <div className={cn(
                            "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer group relative",
                            "text-muted-foreground hover:bg-accent hover:text-foreground"
                          )}>
                            <Icon className="w-4 h-4 flex-shrink-0 text-muted-foreground group-hover:text-foreground" />
                            {!collapsed && <span>{item.name}</span>}
                          </div>
                        </a>
                      ) : (
                        <Link href={item.href}>
                          <div
                            data-active={active ? "true" : undefined}
                            className={cn(
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
                      )}
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
