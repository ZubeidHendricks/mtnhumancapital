import { Sidebar } from "./sidebar";
import { TopHeader } from "./top-header";
import { cn } from "@/lib/utils";

interface AppLayoutProps {
  children: React.ReactNode;
  fullWidth?: boolean;
}

export function AppLayout({ children, fullWidth = false }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="ml-60 transition-all duration-300">
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
