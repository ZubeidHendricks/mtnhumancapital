import { useState } from "react";
import { Sidebar } from "./sidebar";
import { TopHeader } from "./top-header";
import { cn } from "@/lib/utils";

interface AppLayoutProps {
  children: React.ReactNode;
  fullWidth?: boolean;
}

export function AppLayout({ children, fullWidth = false }: AppLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <div className={cn("transition-all duration-300", collapsed ? "ml-16" : "ml-60")}>
        <TopHeader />
        <main className={cn(
          "min-h-[calc(100vh-4rem)]",
          fullWidth ? "p-0" : "p-6"
        )}>
          {children}
        </main>
      </div>
    </div>
  );
}
