import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/ui/back-button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Shield, Key, Settings, CheckCircle2, XCircle, Bell, Loader2, AlertCircle, Mail, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import type { SystemSetting } from "@shared/schema";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { TenantSelector } from "@/components/admin/TenantSelector";
import { TenantManagement } from "@/components/admin/TenantManagement";
import { useTenant } from "@/contexts/TenantContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface EnvSecret {
  key: string;
  description: string;
  configured: boolean;
}

export default function AdminDashboard() {
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const { tenant: currentTenant } = useTenant();

  const { data: settings = [], isLoading: settingsLoading } = useQuery<SystemSetting[]>({
    queryKey: ["system-settings"],
    queryFn: async () => {
      const response = await api.get("/system-settings");
      return response.data;
    },
  });

  const { data: envStatus, isLoading: envLoading } = useQuery<{ secrets: EnvSecret[] }>({
    queryKey: ["env-status"],
    queryFn: async () => {
      const response = await api.get("/env-status");
      return response.data;
    },
  });

  const { data: tenantConfig, isLoading: tenantLoading } = useQuery({
    queryKey: ["tenant-config"],
    queryFn: async () => {
      const response = await api.get("/tenant-config");
      return response.data;
    },
  });

  const createDefaultTenantMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post("/tenant-config", {
        companyName: "My Company",
        subdomain: "company",
        primaryColor: "#0ea5e9",
        industry: "Technology",
        modulesEnabled: {
          recruitment: true,
          integrity: true,
          onboarding: true,
          hr_management: true
        },
        apiKeysConfigured: {},
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-config"] });
      toast.success("Default configuration created");
    },
    onError: () => {
      toast.error("Failed to create default configuration");
    },
  });

  const updateTenantMutation = useMutation({
    mutationFn: async (updates: any) => {
      if (!tenantConfig?.id) {
        throw new Error("Tenant configuration not loaded");
      }
      const response = await api.patch(`/tenant-config/${tenantConfig.id}`, updates);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-config"] });
      toast.success("Tenant configuration updated");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update tenant configuration");
    },
  });

  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value, category, description }: { key: string; value: string; category?: string; description?: string }) => {
      const response = await api.put(`/system-settings/${key}`, { value, category, description });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system-settings"] });
      toast.success("Setting updated successfully");
    },
    onError: () => {
      toast.error("Failed to update setting");
    },
  });

  const getSetting = (key: string): string => {
    const setting = settings.find(s => s.key === key);
    return setting?.value || "";
  };

  const toggleFeature = async (key: string, currentValue: string, category: string, description: string) => {
    const newValue = currentValue === "enabled" ? "disabled" : "enabled";
    await updateSettingMutation.mutateAsync({ key, value: newValue, category, description });
  };

  const [reminderInterval, setReminderInterval] = useState("");

  const saveReminderInterval = async () => {
    if (!reminderInterval || isNaN(Number(reminderInterval))) {
      toast.error("Please enter a valid number");
      return;
    }
    await updateSettingMutation.mutateAsync({
      key: "reminder_default_interval_hours",
      value: reminderInterval,
      category: "reminders",
      description: "Default interval for document reminders (hours)",
    });
    setReminderInterval("");
  };

  const EmailConfigField = ({ 
    label, 
    description, 
    settingKey, 
    currentValue, 
    updateMutation, 
    testId 
  }: { 
    label: string; 
    description: string; 
    settingKey: string; 
    currentValue: string; 
    updateMutation: any; 
    testId: string;
  }) => {
    const [email, setEmail] = useState("");
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
      if (currentValue) {
        setEmail(currentValue);
        setIsEditing(false);
      } else {
        setIsEditing(true);
      }
    }, [currentValue]);

    const saveEmail = async () => {
      if (!email) {
        toast.error("Please enter an email address");
        return;
      }
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        toast.error("Please enter a valid email address");
        return;
      }

      await updateMutation.mutateAsync({
        key: settingKey,
        value: email,
        category: "notifications",
        description: description,
      });
      setIsEditing(false);
    };

    return (
      <div className="p-4 rounded-lg bg-black/20 border border-border dark:border-white/5">
        <Label className="text-sm font-semibold text-white mb-2 block">
          {label}
        </Label>
        <p className="text-xs text-muted-foreground mb-3">
          {description}
        </p>
        {!isEditing && currentValue ? (
          <div className="flex items-center justify-between">
            <p className="text-sm text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              {currentValue}
            </p>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setIsEditing(true)}
              data-testid={`button-edit-${testId}`}
            >
              Edit
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="email@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-black/40 border-border dark:border-white/10 text-white"
              data-testid={`input-${testId}`}
            />
            <Button 
              onClick={saveEmail}
              disabled={!email || updateMutation.isPending}
              data-testid={`button-save-${testId}`}
            >
              {updateMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Save"
              )}
            </Button>
            {currentValue && (
              <Button 
                variant="ghost"
                onClick={() => {
                  setEmail(currentValue);
                  setIsEditing(false);
                }}
                data-testid={`button-cancel-${testId}`}
              >
                Cancel
              </Button>
            )}
          </div>
        )}
      </div>
    );
  };

  const featureToggles = [
    {
      key: "reminders_enabled",
      label: "Automated Reminders",
      description: "Enable automatic reminders for missing documents",
      category: "reminders",
      icon: Bell,
    },
    {
      key: "ai_agents_enabled",
      label: "AI Agents",
      description: "Enable AI-powered integrity checks and recruitment",
      category: "ai",
      icon: Shield,
    },
  ];

  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto p-4 md:p-6 space-y-4 pt-20 md:pt-24">
        <BackButton fallbackPath="/hr-dashboard" className="mb-3" />
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2" data-testid="text-page-title">
                <Settings className="w-6 h-6 md:w-8 md:h-8 text-primary" />
                System Administration
              </h1>
              <p className="text-sm text-muted-foreground mt-1">Configure system features and manage API integrations</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <TenantSelector currentTenant={currentTenant} />
              <Button 
                onClick={() => navigate("/persona-management")}
                className="bg-purple-600 hover:bg-purple-700"
                data-testid="button-persona-management"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">AI Personas</span>
                <span className="sm:hidden">Personas</span>
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Feature Toggles */}
        <Card className="bg-black/40 border-border dark:border-white/10" data-testid="card-feature-toggles">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />
              Feature Toggles
            </CardTitle>
            <CardDescription>
              Enable or disable system features
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {settingsLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {featureToggles.map((feature) => {
                  const currentValue = getSetting(feature.key) || "disabled";
                  const isEnabled = currentValue === "enabled";
                  const Icon = feature.icon;

                  return (
                    <div 
                      key={feature.key} 
                      className="flex items-center justify-between p-4 rounded-lg bg-black/20 border border-border dark:border-white/5"
                      data-testid={`toggle-${feature.key}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Icon className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <Label htmlFor={feature.key} className="text-sm font-semibold text-white">
                              {feature.label}
                            </Label>
                            <Badge variant={isEnabled ? "default" : "secondary"} className="text-xs">
                              {isEnabled ? "Enabled" : "Disabled"}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {feature.description}
                          </p>
                        </div>
                      </div>
                      <Switch
                        id={feature.key}
                        checked={isEnabled}
                        onCheckedChange={() => toggleFeature(feature.key, currentValue, feature.category, feature.description)}
                        data-testid={`switch-${feature.key}`}
                      />
                    </div>
                  );
                })}

                <Separator className="bg-white/5" />

                {/* Reminder Interval Configuration */}
                <div className="p-4 rounded-lg bg-black/20 border border-border dark:border-white/5">
                  <Label className="text-sm font-semibold text-white mb-2 block">
                    Default Reminder Interval
                  </Label>
                  <p className="text-xs text-muted-foreground mb-3">
                    Set the default interval for document reminders (in hours)
                  </p>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="24"
                      value={reminderInterval}
                      onChange={(e) => setReminderInterval(e.target.value)}
                      className="bg-black/40 border-border dark:border-white/10 text-white max-w-xs"
                      data-testid="input-reminder-interval"
                    />
                    <Button 
                      onClick={saveReminderInterval}
                      disabled={!reminderInterval || updateSettingMutation.isPending}
                      data-testid="button-save-interval"
                    >
                      {updateSettingMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        "Save"
                      )}
                    </Button>
                  </div>
                  {getSetting("reminder_default_interval_hours") && (
                    <p className="text-xs text-green-500 mt-2">
                      Current: {getSetting("reminder_default_interval_hours")} hours
                    </p>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Email Configuration */}
        <Card className="bg-black/40 border-border dark:border-white/10" data-testid="card-email-config">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Mail className="w-5 h-5 text-primary" />
              Email Notifications
            </CardTitle>
            <CardDescription>
              Configure email addresses for automated notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {settingsLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              <>
                <EmailConfigField
                  label="IT Department Email"
                  description="Receives notifications for equipment provisioning and access requests"
                  settingKey="it_email"
                  currentValue={getSetting("it_email")}
                  updateMutation={updateSettingMutation}
                  testId="it-email"
                />
                
                <EmailConfigField
                  label="HR Admin Email"
                  description="Receives notifications for onboarding tasks and document submissions"
                  settingKey="hr_admin_email"
                  currentValue={getSetting("hr_admin_email")}
                  updateMutation={updateSettingMutation}
                  testId="hr-admin-email"
                />

                <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 mt-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5 shrink-0" />
                    <div className="text-sm">
                      <p className="text-blue-300 font-semibold">Email Service Integration</p>
                      <p className="text-blue-200/80 mt-1">
                        For production email delivery, connect SendGrid or Resend via the Secrets tab. 
                        Currently using console logging for notifications.
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Module Configuration */}
        <Card className="bg-black/40 border-border dark:border-white/10" data-testid="card-module-config">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />
              Feature Modules
            </CardTitle>
            <CardDescription>
              Enable or disable modules based on customer subscription
            </CardDescription>
          </CardHeader>
          <CardContent>
            {tenantLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : tenantConfig ? (
              <div className="space-y-4">
                {[
                  { key: "recruitment", label: "Recruitment & Selection", desc: "Job management, sourcing, screening, interviews" },
                  { key: "integrity", label: "Integrity Evaluation", desc: "Background verification, risk assessment" },
                  { key: "onboarding", label: "Company Onboarding", desc: "Welcome, docs, IT provisioning, orientation" },
                  { key: "hr_management", label: "HR Management", desc: "Performance, training, payroll, relations" },
                ].map((module) => (
                  <div key={module.key} className="flex items-center justify-between p-4 rounded-lg bg-black/20 border border-border dark:border-white/5">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-white">{module.label}</h3>
                        {tenantConfig.modulesEnabled?.[module.key] && (
                          <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/20">
                            Active
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{module.desc}</p>
                    </div>
                    <Switch
                      checked={tenantConfig.modulesEnabled?.[module.key] || false}
                      onCheckedChange={(checked) => {
                        if (!tenantConfig?.id) {
                          toast.error("Tenant configuration not loaded");
                          return;
                        }
                        const newModules = { ...(tenantConfig.modulesEnabled || {}), [module.key]: checked };
                        updateTenantMutation.mutate({ modulesEnabled: newModules });
                      }}
                      disabled={updateTenantMutation.isPending || !tenantConfig?.id}
                      data-testid={`toggle-module-${module.key}`}
                    />
                  </div>
                ))}
                
                <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20 mt-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5 shrink-0" />
                    <div className="text-sm">
                      <p className="text-yellow-300 font-semibold">Module Visibility</p>
                      <p className="text-yellow-200/80 mt-1">
                        Disabled modules will be hidden from navigation and customer views. Enable only modules included in the customer's subscription.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center space-y-4">
                <div className="text-muted-foreground">
                  <p className="mb-2">No tenant configuration found</p>
                  <p className="text-xs">Create a default configuration to get started</p>
                </div>
                <Button 
                  onClick={() => createDefaultTenantMutation.mutate()}
                  disabled={createDefaultTenantMutation.isPending}
                  className="mx-auto"
                  data-testid="button-create-default-config"
                >
                  {createDefaultTenantMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Default Configuration"
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* API Keys & Secrets Status */}
        <Card className="bg-black/40 border-border dark:border-white/10" data-testid="card-secrets-status">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Key className="w-5 h-5 text-primary" />
              API Keys & Secrets
            </CardTitle>
            <CardDescription>
              Manage API keys and environment secrets
            </CardDescription>
          </CardHeader>
          <CardContent>
            {envLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5 shrink-0" />
                    <div className="text-sm">
                      <p className="text-blue-300 font-semibold">Secure Secret Management</p>
                      <p className="text-blue-200/80 mt-1">
                        API keys and secrets are managed securely through Replit's environment variable system. 
                        Never store sensitive keys in the database. Click the "Secrets" tab in the left sidebar to add or update keys.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  {envStatus?.secrets.map((secret) => (
                    <div 
                      key={secret.key}
                      className="flex items-center justify-between p-3 rounded-lg bg-black/20 border border-border dark:border-white/5"
                      data-testid={`secret-${secret.key}`}
                    >
                      <div>
                        <p className="text-sm font-mono text-white">{secret.key}</p>
                        <p className="text-xs text-muted-foreground">{secret.description}</p>
                      </div>
                      {secret.configured ? (
                        <Badge variant="default" className="gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Configured
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="gap-1">
                          <XCircle className="w-3 h-3" />
                          Missing
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        </div>

        <Tabs defaultValue="features" className="w-full mt-6">
          <TabsList className="bg-black/40 border-border dark:border-white/10">
            <TabsTrigger value="features">System Features</TabsTrigger>
            <TabsTrigger value="tenants">Tenant Management</TabsTrigger>
          </TabsList>
          
          <TabsContent value="tenants" className="mt-4">
            <TenantManagement />
          </TabsContent>

          <TabsContent value="features" className="mt-4">
            <div className="text-white">Feature configuration is shown in the cards above</div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
