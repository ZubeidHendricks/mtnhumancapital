import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface TenantConfig {
  id: string;
  subdomain: string;
  companyName: string;
  primaryColor?: string;
  logoUrl?: string;
  modulesEnabled?: Record<string, boolean>;
}

export function useTenant() {
  const { data: tenantConfig, isLoading, error } = useQuery<TenantConfig>({
    queryKey: ["tenant-config"],
    queryFn: async () => {
      const response = await api.get("/tenant-config");
      return response.data;
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes - tenant config rarely changes
  });

  return {
    tenant: tenantConfig,
    tenantId: tenantConfig?.id,
    isLoading,
    error,
    isModuleEnabled: (moduleKey: string) => {
      if (!tenantConfig?.modulesEnabled) return true;
      return tenantConfig.modulesEnabled[moduleKey] !== false;
    }
  };
}

// Hook to get tenant-scoped query key
export function useTenantQueryKey(baseKey: string | string[]) {
  const { tenantId } = useTenant();
  const keyArray = Array.isArray(baseKey) ? baseKey : [baseKey];
  
  // If tenant is not loaded yet, return the base key (will refetch when tenant loads)
  if (!tenantId) return keyArray;
  
  // Prepend tenantId to the query key
  return [tenantId, ...keyArray];
}
