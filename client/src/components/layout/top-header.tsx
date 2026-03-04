import { useState } from "react";
import { useTenant } from "@/hooks/useTenant";
import { TenantSelector } from "@/components/admin/TenantSelector";
import { useLocation } from "wouter";
import { Search, Bell, Briefcase } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CareersDialog } from "@/components/careers-dialog";

export function TopHeader() {
  const { tenant } = useTenant();
  const [location] = useLocation();
  const [isCareersOpen, setIsCareersOpen] = useState(false);

  const isAdminPage = location.startsWith('/admin-') || 
    location === '/persona-management' || 
    location === '/tenant-management' || 
    location === '/tenant-requests';

  const getPageTitle = () => {
    const titles: Record<string, string> = {
      '/': 'Executive Dashboard',
      '/recruitment-agent': 'AI Recruitment Agent',
      '/candidate-pipeline': 'Candidate Pipeline',
      '/pipeline-board': 'Pipeline Board',
      '/interview-console': 'Interview Console',
      '/interview/voice': 'Voice Interview',
      '/interview/video': 'Video Interview',
      '/hr-dashboard': 'HR Dashboard',
      '/integrity-agent': 'Integrity Checks',
      '/onboarding': 'Company Onboarding',
      '/kpi-management': 'KPI Management',
      '/kpi-review': 'My KPI Review',
      '/kpi-manager-review': 'Manager Review',
      '/kpi-hr-dashboard': 'HR Performance Dashboard',
      '/workforce-intelligence': 'Workforce Intelligence',
      '/document-automation': 'Document Automation',
      '/document-library': 'Document Library',
      '/whatsapp-monitor': 'WhatsApp Monitor',
      '/recommendations': 'AI Recommendations',
      '/dashboard-builder': 'Dashboard Builder',
      '/admin-dashboard': 'System Administration',
      '/tenant-management': 'Tenant Management',
      '/platform-docs': 'Platform Documentation',
      '/demo': 'D8taVision Product Suite',
    };
    return titles[location] || 'Dashboard';
  };

  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold text-foreground">{getPageTitle()}</h1>
      </div>

      <div className="flex items-center gap-4">
        {/* Careers */}
        <Button
          variant="outline"
          size="sm"
          className="hidden md:flex border-[#FFCB00]/30 bg-[#FFCB00]/10 hover:bg-[#FFCB00]/20 text-[#FFCB00]"
          onClick={() => setIsCareersOpen(true)}
        >
          <Briefcase className="w-4 h-4 mr-2" />
          Careers
        </Button>

        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search..." 
            className="pl-9 w-64 bg-muted border-none"
          />
        </div>

        {/* Tenant Selector for Admin Pages */}
        {isAdminPage && (
          <TenantSelector currentTenant={tenant} />
        )}

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
          <Bell className="w-5 h-5" />
        </Button>

        {/* User Avatar */}
        <Avatar className="h-9 w-9 cursor-pointer">
          <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
            U
          </AvatarFallback>
        </Avatar>
      </div>

      <CareersDialog open={isCareersOpen} onOpenChange={setIsCareersOpen} />
    </header>
  );
}
