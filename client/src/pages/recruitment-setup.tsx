import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Settings, 
  Globe, 
  Key, 
  CheckCircle2, 
  XCircle,
  ExternalLink,
  Save,
  RefreshCw
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface RecruitmentPlatform {
  id: string;
  name: string;
  logo: string;
  description: string;
  enabled: boolean;
  connected: boolean;
  apiKey?: string;
  username?: string;
  password?: string;
}

export default function RecruitmentSetup() {
  const [platforms, setPlatforms] = useState<RecruitmentPlatform[]>([
    {
      id: "pnet",
      name: "PNet",
      logo: "/logos/pnet.png",
      description: "South Africa's leading job portal with millions of candidates",
      enabled: true,
      connected: true,
      apiKey: "••••••••••••",
    },
    {
      id: "indeed",
      name: "Indeed",
      logo: "/logos/indeed.png",
      description: "Global job search engine with extensive candidate database",
      enabled: false,
      connected: false,
    },
    {
      id: "linkedin",
      name: "LinkedIn Recruiter",
      logo: "/logos/linkedin.png",
      description: "Professional networking platform for sourcing qualified candidates",
      enabled: false,
      connected: false,
    },
    {
      id: "careers24",
      name: "Careers24",
      logo: "/logos/careers24.png",
      description: "Popular South African job board powered by Media24",
      enabled: false,
      connected: false,
    },
    {
      id: "gumtree",
      name: "Gumtree Jobs",
      logo: "/logos/gumtree.png",
      description: "Classifieds platform with job listings section",
      enabled: false,
      connected: false,
    },
  ]);

  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [credentials, setCredentials] = useState({
    apiKey: "",
    username: "",
    password: "",
  });

  const handleTogglePlatform = (platformId: string) => {
    setPlatforms(prev => prev.map(p => 
      p.id === platformId ? { ...p, enabled: !p.enabled } : p
    ));
  };

  const handleConnect = (platformId: string) => {
    setSelectedPlatform(platformId);
  };

  const handleSaveCredentials = () => {
    if (!selectedPlatform) return;
    
    setPlatforms(prev => prev.map(p => 
      p.id === selectedPlatform 
        ? { ...p, connected: true, apiKey: credentials.apiKey || p.apiKey }
        : p
    ));
    
    setSelectedPlatform(null);
    setCredentials({ apiKey: "", username: "", password: "" });
    toast({
      title: "Platform Connected",
      description: "Your credentials have been saved securely.",
    });
  };

  const handleDisconnect = (platformId: string) => {
    setPlatforms(prev => prev.map(p => 
      p.id === platformId 
        ? { ...p, connected: false, apiKey: undefined, username: undefined, password: undefined }
        : p
    ));
    toast({
      title: "Platform Disconnected",
      description: "Your credentials have been removed.",
    });
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Settings className="h-8 w-8 text-purple-400" />
          Recruitment Setup
        </h1>
        <p className="text-muted-foreground mt-2">
          Configure and connect to external recruitment platforms for automated candidate sourcing
        </p>
      </div>

      <Tabs defaultValue="platforms" className="space-y-6">
        <TabsList className="bg-zinc-800/50">
          <TabsTrigger value="platforms">Platforms</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
        </TabsList>

        <TabsContent value="platforms" className="space-y-4">
          <div className="grid gap-4">
            {platforms.map((platform) => (
              <Card key={platform.id} className="bg-card border-border" data-testid={`card-platform-${platform.id}`}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-zinc-800 flex items-center justify-center">
                        <Globe className="h-6 w-6 text-blue-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-white flex items-center gap-2">
                          {platform.name}
                          {platform.connected && (
                            <Badge className="bg-green-500/20 text-green-400 border-0">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Connected
                            </Badge>
                          )}
                        </h3>
                        <p className="text-sm text-muted-foreground">{platform.description}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Label htmlFor={`enable-${platform.id}`} className="text-sm text-muted-foreground">
                          Enable
                        </Label>
                        <Switch
                          id={`enable-${platform.id}`}
                          checked={platform.enabled}
                          onCheckedChange={() => handleTogglePlatform(platform.id)}
                          data-testid={`switch-enable-${platform.id}`}
                        />
                      </div>
                      
                      {platform.connected ? (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDisconnect(platform.id)}
                          className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                          data-testid={`button-disconnect-${platform.id}`}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Disconnect
                        </Button>
                      ) : (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleConnect(platform.id)}
                          className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
                          data-testid={`button-connect-${platform.id}`}
                        >
                          <Key className="h-4 w-4 mr-1" />
                          Connect
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="preferences" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Search Preferences</CardTitle>
              <CardDescription>Configure how AI searches for candidates across platforms</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-white">Auto-refresh candidate pool</Label>
                  <p className="text-sm text-muted-foreground">Automatically search for new candidates daily</p>
                </div>
                <Switch defaultChecked data-testid="switch-auto-refresh" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-white">Include passive candidates</Label>
                  <p className="text-sm text-muted-foreground">Search profiles not actively looking for jobs</p>
                </div>
                <Switch data-testid="switch-passive-candidates" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-white">Deduplicate across platforms</Label>
                  <p className="text-sm text-muted-foreground">Remove duplicate candidates from different sources</p>
                </div>
                <Switch defaultChecked data-testid="switch-deduplicate" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {selectedPlatform && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" data-testid="modal-credentials">
          <Card className="w-full max-w-md bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5 text-purple-400" />
                Connect {platforms.find(p => p.id === selectedPlatform)?.name}
              </CardTitle>
              <CardDescription>Enter your API credentials to connect this platform</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>API Key</Label>
                <Input
                  type="password"
                  value={credentials.apiKey}
                  onChange={(e) => setCredentials(prev => ({ ...prev, apiKey: e.target.value }))}
                  placeholder="Enter your API key"
                  data-testid="input-api-key"
                />
              </div>
              <div className="space-y-2">
                <Label>Username (Optional)</Label>
                <Input
                  value={credentials.username}
                  onChange={(e) => setCredentials(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="Enter your username"
                  data-testid="input-username"
                />
              </div>
              <div className="space-y-2">
                <Label>Password (Optional)</Label>
                <Input
                  type="password"
                  value={credentials.password}
                  onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Enter your password"
                  data-testid="input-password"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setSelectedPlatform(null)}
                  data-testid="button-cancel-credentials"
                >
                  Cancel
                </Button>
                <Button 
                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                  onClick={handleSaveCredentials}
                  data-testid="button-save-credentials"
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
