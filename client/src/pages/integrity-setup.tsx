import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { 
  Shield, 
  Key, 
  CheckCircle2, 
  AlertTriangle,
  FileSearch,
  CreditCard,
  UserCheck,
  GraduationCap,
  Building2,
  Save,
  Loader2,
  Link as LinkIcon,
  Unlink
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

interface IntegrityCheck {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  cost?: string;
}

interface IntegrityProvider {
  id: string;
  name: string;
  checks: string[];
  connected: boolean;
  hasCredentials?: boolean;
}

const CHECK_ICONS: Record<string, React.ReactNode> = {
  criminal: <FileSearch className="h-5 w-5" />,
  credit: <CreditCard className="h-5 w-5" />,
  "id-verification": <UserCheck className="h-5 w-5" />,
  qualification: <GraduationCap className="h-5 w-5" />,
  employment: <Building2 className="h-5 w-5" />
};

export default function IntegritySetup() {
  const queryClient = useQueryClient();
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [username, setUsername] = useState("");
  const [localChecks, setLocalChecks] = useState<IntegrityCheck[]>([]);

  const { data: checks = [], isLoading: checksLoading } = useQuery<IntegrityCheck[]>({
    queryKey: ['integrity-setup-checks'],
    queryFn: async () => {
      const response = await api.get("/integrity/checks");
      return response.data;
    }
  });

  useEffect(() => {
    if (checks.length > 0 && localChecks.length === 0) {
      setLocalChecks(checks);
    }
  }, [checks]);

  const { data: providers = [], isLoading: providersLoading } = useQuery<IntegrityProvider[]>({
    queryKey: ['integrity-providers'],
    queryFn: async () => {
      const response = await api.get("/integrity/providers");
      return response.data;
    }
  });

  const saveChecksMutation = useMutation({
    mutationFn: async (checksToSave: IntegrityCheck[]) => {
      const response = await api.patch("/integrity/checks", { 
        checks: checksToSave.map(c => ({ id: c.id, enabled: c.enabled }))
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrity-setup-checks'] });
      toast({
        title: "Settings Saved",
        description: "Integrity check preferences have been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save check preferences.",
        variant: "destructive"
      });
    }
  });

  const connectProviderMutation = useMutation({
    mutationFn: async ({ providerId, apiKey, username }: { providerId: string; apiKey: string; username?: string }) => {
      const response = await api.post(`/integrity/providers/${providerId}/connect`, { apiKey, username });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['integrity-providers'] });
      setSelectedProvider(null);
      setApiKey("");
      setUsername("");
      toast({
        title: "Provider Connected",
        description: data.message || "API credentials saved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Connection Failed",
        description: "Failed to connect provider. Please check your credentials.",
        variant: "destructive"
      });
    }
  });

  const disconnectProviderMutation = useMutation({
    mutationFn: async (providerId: string) => {
      const response = await api.post(`/integrity/providers/${providerId}/disconnect`);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['integrity-providers'] });
      toast({
        title: "Provider Disconnected",
        description: data.message || "Provider has been disconnected.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to disconnect provider.",
        variant: "destructive"
      });
    }
  });

  const handleToggleCheck = (checkId: string) => {
    setLocalChecks(prev => prev.map(c => 
      c.id === checkId ? { ...c, enabled: !c.enabled } : c
    ));
  };

  const handleConnectProvider = (providerId: string) => {
    setSelectedProvider(providerId);
    setApiKey("");
    setUsername("");
  };

  const handleSaveProvider = () => {
    if (!selectedProvider || !apiKey) return;
    connectProviderMutation.mutate({ providerId: selectedProvider, apiKey, username: username || undefined });
  };

  const handleDisconnect = (providerId: string) => {
    disconnectProviderMutation.mutate(providerId);
  };

  const handleSaveSettings = () => {
    saveChecksMutation.mutate(localChecks);
  };

  const getCheckName = (checkId: string): string => {
    const names: Record<string, string> = {
      criminal: "Criminal Record Check",
      credit: "Credit Check",
      "id-verification": "ID Verification",
      qualification: "Qualification Verification",
      employment: "Employment History"
    };
    return names[checkId] || checkId;
  };

  const displayChecks = localChecks.length > 0 ? localChecks : checks;

  if (checksLoading || providersLoading) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-6xl flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600 dark:text-teal-400" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <Shield className="h-8 w-8 text-teal-600 dark:text-teal-400" />
          Integrity Setup
        </h1>
        <p className="text-muted-foreground mt-2">
          Configure which integrity checks to perform and connect verification providers
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              Integrity Checks
            </CardTitle>
            <CardDescription>Select which checks to include in your verification process</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {displayChecks.map((check) => (
              <div 
                key={check.id} 
                className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700/50"
                data-testid={`check-item-${check.id}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${check.enabled ? 'bg-green-500/20 text-green-600 dark:text-green-400' : 'bg-gray-100 dark:bg-zinc-700 text-gray-400 dark:text-zinc-400'}`}>
                    {CHECK_ICONS[check.id]}
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">{check.name}</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{check.description}</p>
                    {check.cost && (
                      <Badge variant="outline" className="mt-1 text-xs text-gray-600 dark:text-gray-300 border-gray-300 dark:border-zinc-600">
                        Est. cost: {check.cost}
                      </Badge>
                    )}
                  </div>
                </div>
                <Switch
                  checked={check.enabled}
                  onCheckedChange={() => handleToggleCheck(check.id)}
                  data-testid={`switch-check-${check.id}`}
                />
              </div>
            ))}

            <Button 
              className="w-full mt-4 gap-2"
              onClick={handleSaveSettings}
              disabled={saveChecksMutation.isPending}
              data-testid="button-save-checks"
            >
              {saveChecksMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Check Preferences
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              Verification Providers
            </CardTitle>
            <CardDescription>Connect to background check service providers</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {providers.map((provider) => (
              <div 
                key={provider.id} 
                className={`p-4 rounded-lg border transition-all ${
                  provider.connected 
                    ? 'bg-green-500/10 border-green-500/30' 
                    : 'bg-gray-200 dark:bg-zinc-800/50 border-gray-300 dark:border-zinc-700/50'
                }`}
                data-testid={`provider-${provider.id}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">{provider.name}</h4>
                    {provider.connected && (
                      <Badge className="bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30">
                        Connected
                      </Badge>
                    )}
                  </div>
                  {provider.connected ? (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDisconnect(provider.id)}
                      disabled={disconnectProviderMutation.isPending}
                      className="gap-1 text-red-600 dark:text-red-400 border-red-500/30 hover:bg-red-500/10"
                      data-testid={`button-disconnect-${provider.id}`}
                    >
                      {disconnectProviderMutation.isPending ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Unlink className="h-3 w-3" />
                      )}
                      Disconnect
                    </Button>
                  ) : (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleConnectProvider(provider.id)}
                      className="gap-1"
                      data-testid={`button-connect-${provider.id}`}
                    >
                      <LinkIcon className="h-3 w-3" />
                      Connect
                    </Button>
                  )}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Supports: {provider.checks.map(c => getCheckName(c)).join(", ")}
                </p>

                {selectedProvider === provider.id && (
                  <div className="mt-4 space-y-3 p-3 rounded-lg bg-gray-100 dark:bg-zinc-900/50 border border-gray-300 dark:border-zinc-700">
                    <div className="space-y-2">
                      <Label htmlFor={`apiKey-${provider.id}`}>API Key</Label>
                      <Input
                        id={`apiKey-${provider.id}`}
                        type="password"
                        placeholder="Enter your API key"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        data-testid={`input-apikey-${provider.id}`}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`username-${provider.id}`}>Username (Optional)</Label>
                      <Input
                        id={`username-${provider.id}`}
                        placeholder="Enter username if required"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        data-testid={`input-username-${provider.id}`}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        onClick={handleSaveProvider}
                        disabled={!apiKey || connectProviderMutation.isPending}
                        className="gap-2"
                        data-testid={`button-save-provider-${provider.id}`}
                      >
                        {connectProviderMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                        Save Credentials
                      </Button>
                      <Button 
                        variant="ghost"
                        onClick={() => setSelectedProvider(null)}
                        data-testid={`button-cancel-${provider.id}`}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6 bg-amber-500/10 border-amber-500/30">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div>
              <h4 className="font-medium text-amber-600 dark:text-amber-400">Compliance Note</h4>
              <p className="text-sm text-muted-foreground mt-1">
                All background checks require candidate consent as per POPIA regulations. 
                Consent is automatically requested during the screening process.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
