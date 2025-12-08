import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import axios from 'axios';
import type { TenantConfig } from '@shared/schema';

interface TenantContextType {
  tenant: TenantConfig | null;
  loading: boolean;
  error: string | null;
}

const TenantContext = createContext<TenantContextType>({
  tenant: null,
  loading: true,
  error: null,
});

export function TenantProvider({ children }: { children: ReactNode }) {
  const [tenant, setTenant] = useState<TenantConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadTenant() {
      try {
        // Check if admin is impersonating a tenant
        const impersonatedTenantStr = localStorage.getItem('admin_impersonated_tenant');
        let tenantData: TenantConfig;
        
        if (impersonatedTenantStr) {
          // Use impersonated tenant from localStorage
          tenantData = JSON.parse(impersonatedTenantStr);
        } else {
          // Load tenant from API
          const response = await axios.get<TenantConfig>('/api/tenant/current');
          tenantData = response.data;
        }
        
        setTenant(tenantData);
        
        // Apply branding to document
        if (tenantData.primaryColor) {
          document.documentElement.style.setProperty('--primary', tenantData.primaryColor);
        }
        
        // Update document title
        if (tenantData.companyName) {
          document.title = `${tenantData.companyName} - AHC`;
        }
      } catch (err) {
        console.error('Failed to load tenant:', err);
        setError('Failed to load tenant configuration');
      } finally {
        setLoading(false);
      }
    }

    loadTenant();
  }, []);

  return (
    <TenantContext.Provider value={{ tenant, loading, error }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}
