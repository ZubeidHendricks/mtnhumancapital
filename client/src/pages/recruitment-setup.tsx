import { useState, useEffect } from "react";
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
  Save,
  Loader2
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";

interface RecruitmentPlatform {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  connected: boolean;
  hasCredentials?: boolean;
}

export default function RecruitmentSetup() {
  const queryClient = useQueryClient();
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [credentials, setCredentials] = useState({
    apiKey: "",
    username: "",
    password: "",
  });

  const { data: platforms = [], isLoading } = useQuery<RecruitmentPlatform[]>({
    queryKey: ["/api/recruitment/platforms"],
    queryFn: async () => {
      const response = await axios.get("/api/recruitment/platforms");
      return response.data;
    },
  });

  const togglePlatformMutation = useMutation({
    mutationFn: async ({ platformId, enabled }: { platformId: string; enabled: boolean }) => {
      const response = await axios.patch(`/api/recruitment/platforms/${platformId}`, { enabled });
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/recruitment/platforms"] });
      toast({
        title: variables.enabled ? "Platform Enabled" : "Platform Disabled",
        description: `The platform has been ${variables.enabled ? "enabled" : "disabled"} for recruitment.`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update platform status.",
        variant: "destructive",
      });
    },
  });

  const connectPlatformMutation = useMutation({
    mutationFn: async ({ platformId, apiKey, username, password }: { 
      platformId: string; 
      apiKey: string; 
      username?: string; 
      password?: string 
    }) => {
      const response = await axios.post(`/api/recruitment/platforms/${platformId}/connect`, {
        apiKey,
        username,
        password,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recruitment/platforms"] });
      setSelectedPlatform(null);
      setCredentials({ apiKey: "", username: "", password: "" });
      toast({
        title: "Platform Connected",
        description: "Your credentials have been saved and the platform is now active.",
      });
    },
    onError: () => {
      toast({
        title: "Connection Failed",
        description: "Failed to connect to the platform. Please check your credentials.",
        variant: "destructive",
      });
    },
  });

  const disconnectPlatformMutation = useMutation({
    mutationFn: async (platformId: string) => {
      const response = await axios.patch(`/api/recruitment/platforms/${platformId}`, {
        disconnect: true,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recruitment/platforms"] });
      toast({
        title: "Platform Disconnected",
        description: "Your credentials have been removed.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to disconnect platform.",
        variant: "destructive",
      });
    },
  });

  const handleTogglePlatform = (platformId: string, currentEnabled: boolean) => {
    togglePlatformMutation.mutate({ platformId, enabled: !currentEnabled });
  };

  const handleConnect = (platformId: string) => {
    setSelectedPlatform(platformId);
  };

  const handleSaveCredentials = () => {
    if (!selectedPlatform || !credentials.apiKey) {
      toast({
        title: "API Key Required",
        description: "Please enter an API key to connect.",
        variant: "destructive",
      });
      return;
    }
    
    connectPlatformMutation.mutate({
      platformId: selectedPlatform,
      apiKey: credentials.apiKey,
      username: credentials.username || undefined,
      password: credentials.password || undefined,
    });
  };

  const handleDisconnect = (platformId: string) => {
    disconnectPlatformMutation.mutate(platformId);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-6xl flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <Settings className="h-8 w-8 text-foreground dark:text-foreground" />
          Recruitment Setup
        </h1>
        <p className="text-muted-foreground mt-2">
          Configure and connect to external recruitment platforms for automated candidate sourcing
        </p>
      </div>

      <Tabs defaultValue="platforms" className="space-y-6">
        <TabsList className="bg-gray-200/50">
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
                      <div className="w-12 h-12 rounded-lg bg-gray-200 flex items-center justify-center">
                        <Globe className="h-6 w-6 text-foreground dark:text-foreground" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground flex items-center gap-2">
                          {platform.name}
                          {platform.connected && (
                            <Badge className="bg-muted/20 text-foreground border-0">
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
                          onCheckedChange={() => handleTogglePlatform(platform.id, platform.enabled)}
                          disabled={togglePlatformMutation.isPending}
                          data-testid={`switch-enable-${platform.id}`}
                        />
                      </div>
                      
                      {platform.connected ? (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDisconnect(platform.id)}
                          disabled={disconnectPlatformMutation.isPending}
                          className="border-destructive/30 text-destructive hover:bg-destructive/10"
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
                          className="border-border/30 text-foreground dark:text-foreground hover:bg-muted/10"
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
                  <Label className="text-foreground">Auto-refresh candidate pool</Label>
                  <p className="text-sm text-muted-foreground">Automatically search for new candidates daily</p>
                </div>
                <Switch defaultChecked data-testid="switch-auto-refresh" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-foreground">Include passive candidates</Label>
                  <p className="text-sm text-muted-foreground">Search profiles not actively looking for jobs</p>
                </div>
                <Switch data-testid="switch-passive-candidates" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-foreground">Deduplicate across platforms</Label>
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
                <Key className="h-5 w-5 text-foreground dark:text-foreground" />
                Connect {platforms.find(p => p.id === selectedPlatform)?.name}
              </CardTitle>
              <CardDescription>Enter your API credentials to connect this platform</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>API Key *</Label>
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
                  disabled={connectPlatformMutation.isPending}
                  data-testid="button-cancel-credentials"
                >
                  Cancel
                </Button>
                <Button 
                  className="flex-1 bg-muted hover:bg-muted"
                  onClick={handleSaveCredentials}
                  disabled={connectPlatformMutation.isPending}
                  data-testid="button-save-credentials"
                >
                  {connectPlatformMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
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
