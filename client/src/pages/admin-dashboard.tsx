import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Shield, Key, Settings, CheckCircle2, XCircle, Bell, Loader2, AlertCircle, Mail } from "lucide-react";
import { api } from "@/lib/api";
import type { SystemSetting } from "@shared/schema";
import { toast } from "sonner";

interface EnvSecret {
  key: string;
  description: string;
  configured: boolean;
}

export default function AdminDashboard() {
  const queryClient = useQueryClient();

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
      <div className="p-4 rounded-lg bg-black/20 border border-white/5">
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
              className="bg-black/40 border-white/10 text-white"
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
      <Navbar />
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-2" data-testid="text-page-title">
              <Settings className="w-8 h-8 text-primary" />
              System Administration
            </h1>
            <p className="text-muted-foreground mt-1">Configure system features and manage API integrations</p>
          </div>
        </div>

        {/* Feature Toggles */}
        <Card className="bg-black/40 border-white/10" data-testid="card-feature-toggles">
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
                      className="flex items-center justify-between p-4 rounded-lg bg-black/20 border border-white/5"
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
                <div className="p-4 rounded-lg bg-black/20 border border-white/5">
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
                      className="bg-black/40 border-white/10 text-white max-w-xs"
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
        <Card className="bg-black/40 border-white/10" data-testid="card-email-config">
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

        {/* API Keys & Secrets Status */}
        <Card className="bg-black/40 border-white/10" data-testid="card-secrets-status">
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
                      className="flex items-center justify-between p-3 rounded-lg bg-black/20 border border-white/5"
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
    </div>
  );
}
