import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Building2, Check, ChevronDown, Eye, RefreshCw } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import type { TenantConfig } from "@shared/schema";
import { toast } from "sonner";

interface TenantSelectorProps {
  currentTenant: TenantConfig | null;
  onTenantChange?: (tenant: TenantConfig) => void;
}

export function TenantSelector({ currentTenant, onTenantChange }: TenantSelectorProps) {
  const [impersonatedTenant, setImpersonatedTenant] = useState<TenantConfig | null>(
    localStorage.getItem('admin_impersonated_tenant') 
      ? JSON.parse(localStorage.getItem('admin_impersonated_tenant')!) 
      : null
  );

  const { data: tenantsData = [], isLoading, refetch } = useQuery<TenantConfig[]>({
    queryKey: ["admin-tenants"],
    queryFn: async () => {
      const response = await api.get("/admin/tenants");
      return Array.isArray(response.data) ? response.data : [];
    },
  });
  
  const tenants = Array.isArray(tenantsData) ? tenantsData : [];

  const impersonateMutation = useMutation({
    mutationFn: async (tenantId: string) => {
      const response = await api.post("/admin/impersonate-tenant", { tenantId });
      return response.data;
    },
    onSuccess: (data: TenantConfig) => {
      setImpersonatedTenant(data);
      localStorage.setItem('admin_impersonated_tenant', JSON.stringify(data));
      toast.success(`Now viewing ${data.companyName}'s workspace`);
      
      if (onTenantChange) {
        onTenantChange(data);
      }
      
      window.location.reload();
    },
    onError: () => {
      toast.error("Failed to switch tenant");
    },
  });

  const clearImpersonation = () => {
    setImpersonatedTenant(null);
    localStorage.removeItem('admin_impersonated_tenant');
    toast.success("Returned to your workspace");
    window.location.reload();
  };

  const activeTenant = impersonatedTenant || currentTenant;

  return (
    <div className="flex items-center gap-2">
      {impersonatedTenant && (
        <Badge variant="outline" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
          <Eye className="w-3 h-3 mr-1" />
          Viewing
        </Badge>
      )}
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            className="gap-2 bg-black/40 border-white/10 hover:bg-black/60"
          >
            <Building2 className="w-4 h-4" />
            <span className="max-w-[150px] truncate">
              {activeTenant?.companyName || "Select Tenant"}
            </span>
            <ChevronDown className="w-4 h-4 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent align="end" className="w-64 bg-black/95 border-white/10">
          <DropdownMenuLabel className="flex items-center justify-between">
            <span>Switch Tenant</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                refetch();
              }}
              className="h-6 w-6 p-0"
            >
              <RefreshCw className="w-3 h-3" />
            </Button>
          </DropdownMenuLabel>
          
          <DropdownMenuSeparator className="bg-white/10" />
          
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              Loading tenants...
            </div>
          ) : tenants.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              No tenants found
            </div>
          ) : (
            <>
              {tenants.map((tenant) => {
                const isActive = activeTenant?.id === tenant.id;
                
                return (
                  <DropdownMenuItem
                    key={tenant.id}
                    onClick={() => {
                      if (!isActive) {
                        impersonateMutation.mutate(tenant.id);
                      }
                    }}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">
                            {tenant.companyName}
                          </span>
                          {isActive && (
                            <Check className="w-4 h-4 text-green-500 shrink-0" />
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {tenant.subdomain}.domain.com
                        </div>
                      </div>
                    </div>
                  </DropdownMenuItem>
                );
              })}
            </>
          )}
          
          {impersonatedTenant && (
            <>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem
                onClick={clearImpersonation}
                className="cursor-pointer text-blue-600 dark:text-blue-400 hover:text-blue-300"
              >
                <Eye className="w-4 h-4 mr-2" />
                Exit Tenant View
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
