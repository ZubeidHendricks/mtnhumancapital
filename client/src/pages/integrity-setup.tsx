import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
  Save
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface IntegrityCheck {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  enabled: boolean;
  provider?: string;
  cost?: string;
}

interface IntegrityProvider {
  id: string;
  name: string;
  checks: string[];
  connected: boolean;
  apiKey?: string;
}

export default function IntegritySetup() {
  const [checks, setChecks] = useState<IntegrityCheck[]>([
    {
      id: "criminal",
      name: "Criminal Record Check",
      description: "Verify criminal history through official databases",
      icon: <FileSearch className="h-5 w-5" />,
      enabled: true,
      provider: "SAPS / MIE",
      cost: "R150",
    },
    {
      id: "credit",
      name: "Credit Check",
      description: "Review credit history and financial standing",
      icon: <CreditCard className="h-5 w-5" />,
      enabled: true,
      provider: "TransUnion",
      cost: "R75",
    },
    {
      id: "id-verification",
      name: "ID Verification",
      description: "Confirm identity using Home Affairs database",
      icon: <UserCheck className="h-5 w-5" />,
      enabled: true,
      provider: "DHA",
      cost: "R50",
    },
    {
      id: "qualification",
      name: "Qualification Verification",
      description: "Verify educational qualifications and certificates",
      icon: <GraduationCap className="h-5 w-5" />,
      enabled: false,
      provider: "SAQA",
      cost: "R200",
    },
    {
      id: "employment",
      name: "Employment History",
      description: "Verify previous employment and references",
      icon: <Building2 className="h-5 w-5" />,
      enabled: false,
      cost: "R100",
    },
  ]);

  const [providers, setProviders] = useState<IntegrityProvider[]>([
    {
      id: "mie",
      name: "MIE Background Screening",
      checks: ["criminal", "credit", "id-verification", "qualification", "employment"],
      connected: true,
      apiKey: "••••••••••••",
    },
    {
      id: "lexisnexis",
      name: "LexisNexis Risk Solutions",
      checks: ["criminal", "id-verification"],
      connected: false,
    },
    {
      id: "transunion",
      name: "TransUnion",
      checks: ["credit"],
      connected: false,
    },
  ]);

  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState("");

  const handleToggleCheck = (checkId: string) => {
    setChecks(prev => prev.map(c => 
      c.id === checkId ? { ...c, enabled: !c.enabled } : c
    ));
  };

  const handleConnectProvider = (providerId: string) => {
    setSelectedProvider(providerId);
  };

  const handleSaveProvider = () => {
    if (!selectedProvider || !apiKey) return;
    
    setProviders(prev => prev.map(p => 
      p.id === selectedProvider ? { ...p, connected: true, apiKey: "••••••••••••" } : p
    ));
    
    setSelectedProvider(null);
    setApiKey("");
    toast({
      title: "Provider Connected",
      description: "API credentials saved successfully.",
    });
  };

  const handleDisconnect = (providerId: string) => {
    setProviders(prev => prev.map(p => 
      p.id === providerId ? { ...p, connected: false, apiKey: undefined } : p
    ));
  };

  const handleSaveSettings = () => {
    toast({
      title: "Settings Saved",
      description: "Integrity check preferences have been updated.",
    });
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Shield className="h-8 w-8 text-amber-400" />
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
              <CheckCircle2 className="h-5 w-5 text-green-400" />
              Integrity Checks
            </CardTitle>
            <CardDescription>Select which checks to include in your verification process</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {checks.map((check) => (
              <div 
                key={check.id} 
                className="flex items-center justify-between p-4 rounded-lg bg-zinc-800/50 border border-zinc-700/50"
                data-testid={`check-item-${check.id}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${check.enabled ? 'bg-green-500/20 text-green-400' : 'bg-zinc-700 text-zinc-400'}`}>
                    {check.icon}
                  </div>
                  <div>
                    <h4 className="font-medium text-white">{check.name}</h4>
                    <p className="text-sm text-muted-foreground">{check.description}</p>
                    {check.cost && (
                      <Badge variant="outline" className="mt-1 text-xs border-zinc-600">
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
              className="w-full mt-4 bg-amber-600 hover:bg-amber-700"
              onClick={handleSaveSettings}
              data-testid="button-save-checks"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Check Preferences
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-purple-400" />
              Verification Providers
            </CardTitle>
            <CardDescription>Connect to background check service providers</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {providers.map((provider) => (
              <div 
                key={provider.id} 
                className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700/50"
                data-testid={`provider-item-${provider.id}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-white flex items-center gap-2">
                    {provider.name}
                    {provider.connected && (
                      <Badge className="bg-green-500/20 text-green-400 border-0 text-xs">
                        Connected
                      </Badge>
                    )}
                  </h4>
                  {provider.connected ? (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleDisconnect(provider.id)}
                      className="text-red-400 hover:text-red-300"
                      data-testid={`button-disconnect-${provider.id}`}
                    >
                      Disconnect
                    </Button>
                  ) : (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleConnectProvider(provider.id)}
                      className="border-purple-500/30 text-purple-400"
                      data-testid={`button-connect-${provider.id}`}
                    >
                      Connect
                    </Button>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Supports: {provider.checks.map(c => checks.find(ch => ch.id === c)?.name).filter(Boolean).join(", ")}
                </p>
              </div>
            ))}
            
            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 mt-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-400 mt-0.5" />
                <div>
                  <h4 className="font-medium text-amber-400">Compliance Note</h4>
                  <p className="text-sm text-muted-foreground">
                    All background checks require candidate consent as per POPIA regulations. 
                    Consent is automatically requested during the screening process.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {selectedProvider && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" data-testid="modal-provider">
          <Card className="w-full max-w-md bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5 text-purple-400" />
                Connect {providers.find(p => p.id === selectedProvider)?.name}
              </CardTitle>
              <CardDescription>Enter your API credentials to connect this provider</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>API Key</Label>
                <Input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter your API key"
                  data-testid="input-provider-api-key"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setSelectedProvider(null)}
                  data-testid="button-cancel-provider"
                >
                  Cancel
                </Button>
                <Button 
                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                  onClick={handleSaveProvider}
                  disabled={!apiKey}
                  data-testid="button-save-provider"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save & Connect
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
